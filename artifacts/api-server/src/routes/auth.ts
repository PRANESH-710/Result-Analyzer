import { Router, type IRouter, type Request, type Response } from 'express';
import crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db/schema';

const router: IRouter = Router();

const APP_USERNAME = process.env.APP_USERNAME || 'admin';
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin123';
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const passwordResetMap = new Map<string, { code: string; expiresAt: number }>();
let authSchemaReady: Promise<void> | null = null;

async function ensureAuthSchema(): Promise<void> {
  if (!authSchemaReady) {
    authSchemaReady = (async () => {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_key" text`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_email_verified" boolean NOT NULL DEFAULT true`);
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key_unique_idx" ON "users" ("email_key")`);
      await db.execute(sql`UPDATE "users" SET "email" = "username_key" || '@local.invalid' WHERE "email" IS NULL`);
      await db.execute(sql`UPDATE "users" SET "email_key" = lower("email") WHERE "email_key" IS NULL AND "email" IS NOT NULL`);
      await db.execute(sql`UPDATE "users" SET "is_email_verified" = true WHERE "is_email_verified" IS NULL`);
    })();
  }

  await authSchemaReady;
}

function normalizeUsernameKey(username: string): string {
  return username.trim().toLowerCase();
}

function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [salt, expected] = parts;
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const candidateBuffer = Buffer.from(candidate, 'hex');

  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
}

async function findLocalUserByUsername(username: string) {
  await ensureAuthSchema();
  const usernameKey = normalizeUsernameKey(username);
  const rows = await db.select().from(usersTable).where(eq(usersTable.usernameKey, usernameKey)).limit(1);
  return rows[0] ?? null;
}

async function findLocalUserByEmail(email: string) {
  await ensureAuthSchema();
  const emailKey = normalizeEmailKey(email);
  const rows = await db.select().from(usersTable).where(eq(usersTable.emailKey, emailKey)).limit(1);
  return rows[0] ?? null;
}

async function findLocalUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();

  if (trimmed.includes('@')) {
    return findLocalUserByEmail(trimmed);
  }

  return findLocalUserByUsername(trimmed);
}

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/register', async (req: Request, res: Response) => {
  const rawUsername = req.body?.username;
  const rawPassword = req.body?.password;
  const rawEmail = req.body?.email;

  const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
  const password = typeof rawPassword === 'string' ? rawPassword.trim() : '';
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  if (!username || !password || !email) {
    res.status(400).json({ error: 'Username, email, and password are required.' });
    return;
  }

  if (username.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }

  const usernameKey = normalizeUsernameKey(username);
  const emailKey = normalizeEmailKey(email);

  if (usernameKey === normalizeUsernameKey(APP_USERNAME)) {
    res.status(409).json({ error: 'Username is reserved. Choose another username.' });
    return;
  }

  try {
    const existingUser = await findLocalUserByUsername(username);
    if (existingUser) {
      res.status(409).json({ error: 'Username already exists.' });
      return;
    }

    const existingEmail = await findLocalUserByEmail(email);
    if (existingEmail) {
      res.status(409).json({ error: 'Email already exists.' });
      return;
    }

    const inserted = await db
      .insert(usersTable)
      .values({
        username: username.trim(),
        usernameKey,
        email: email.trim(),
        emailKey,
        isEmailVerified: true,
        passwordHash: hashPassword(password),
      })
      .returning();

    const user = inserted[0];
    (req.session as any).username = user.username;

    res.status(201).json({
      success: true,
      username: user.username,
      email: user.email,
      authenticated: true,
      createdAt: user.createdAt,
      accountSource: 'local',
    });
  } catch (error: any) {
    res.status(409).json({ error: error?.message || 'Unable to create account.' });
  }
});

router.post('/forgot-password/request', async (req: Request, res: Response) => {
  const rawUsername = req.body?.username;
  const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';

  if (!username) {
    res.status(400).json({ error: 'Username is required.' });
    return;
  }

  const usernameKey = normalizeUsernameKey(username);

  if (usernameKey === normalizeUsernameKey(APP_USERNAME)) {
    res.status(400).json({ error: 'Default env account reset is not supported here. Update APP_PASSWORD in .env.' });
    return;
  }

  const user = await findLocalUserByIdentifier(username);
  if (!user) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  const code = generateResetCode();
  const expiresAt = Date.now() + PASSWORD_RESET_TTL_MS;
  passwordResetMap.set(user.usernameKey, { code, expiresAt });

  res.json({
    success: true,
    username: user.username,
    resetCode: code,
    expiresInSeconds: Math.floor(PASSWORD_RESET_TTL_MS / 1000),
  });
});

router.post('/forgot-password/confirm', async (req: Request, res: Response) => {
  const rawUsername = req.body?.username;
  const rawResetCode = req.body?.resetCode;
  const rawNewPassword = req.body?.newPassword;

  const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
  const resetCode = typeof rawResetCode === 'string' ? rawResetCode.trim() : '';
  const newPassword = typeof rawNewPassword === 'string' ? rawNewPassword.trim() : '';

  if (!username || !resetCode || !newPassword) {
    res.status(400).json({ error: 'Username, reset code, and new password are required.' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const user = await findLocalUserByIdentifier(username);
  if (!user) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  const record = passwordResetMap.get(user.usernameKey);
  if (!record) {
    res.status(400).json({ error: 'No active reset code. Request a new code.' });
    return;
  }

  if (Date.now() > record.expiresAt) {
    passwordResetMap.delete(user.usernameKey);
    res.status(400).json({ error: 'Reset code expired. Request a new code.' });
    return;
  }

  if (record.code !== resetCode) {
    res.status(401).json({ error: 'Invalid reset code.' });
    return;
  }

  await db
    .update(usersTable)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(usersTable.id, user.id));

  passwordResetMap.delete(user.usernameKey);
  res.json({ success: true, message: 'Password reset successful.' });
});

router.post('/login', async (req: Request, res: Response) => {
  const rawUsername = req.body?.username;
  const rawPassword = req.body?.password;

  const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
  const password = typeof rawPassword === 'string' ? rawPassword.trim() : '';

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const localUser = await findLocalUserByIdentifier(username);

  if (localUser && verifyPassword(password, localUser.passwordHash)) {
    (req.session as any).username = localUser.username;
    res.json({ success: true, username: localUser.username, accountSource: 'local' });
    return;
  }

  const isEnvAccountMatch = username === APP_USERNAME && password === APP_PASSWORD;
  if (!isEnvAccountMatch) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  (req.session as any).username = username;
  res.json({ success: true, username, accountSource: 'env' });
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/me', async (req: Request, res: Response) => {
  const username = (req.session as any).username;
  if (!username) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const localUser = await findLocalUserByUsername(username);
  const isEnvUser = username === APP_USERNAME;

  res.json({
    username,
    email: localUser?.email ?? null,
    emailVerified: localUser?.isEmailVerified ?? true,
    authenticated: true,
    createdAt: localUser?.createdAt,
    accountSource: localUser ? 'local' : isEnvUser ? 'env' : 'unknown',
  });
});

router.get('/accounts', async (req: Request, res: Response) => {
  const sessionUsername = (req.session as any).username;
  if (!sessionUsername) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const localUser = await findLocalUserByUsername(sessionUsername);
  const users = localUser
    ? [{ username: localUser.username, email: localUser.email, createdAt: localUser.createdAt }]
    : [{ username: sessionUsername, email: null, createdAt: null as any }];

  res.json({
    count: users.length,
    users,
  });
});

router.post('/change-password', async (req: Request, res: Response) => {
  const sessionUsername = (req.session as any).username;
  if (!sessionUsername) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const rawCurrentPassword = req.body?.currentPassword;
  const rawNewPassword = req.body?.newPassword;

  const currentPassword = typeof rawCurrentPassword === 'string' ? rawCurrentPassword.trim() : '';
  const newPassword = typeof rawNewPassword === 'string' ? rawNewPassword.trim() : '';

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required.' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const localUser = await findLocalUserByUsername(sessionUsername);
  const isValidLocalPassword = localUser ? verifyPassword(currentPassword, localUser.passwordHash) : false;

  if (!isValidLocalPassword) {
    if (sessionUsername === APP_USERNAME && currentPassword === APP_PASSWORD) {
      res.status(400).json({
        error: 'Default env account password cannot be changed here. Update APP_PASSWORD in .env.',
      });
      return;
    }

    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  if (!localUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  await db
    .update(usersTable)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(usersTable.id, localUser.id));

  res.json({ success: true });
});

router.delete('/accounts/:username', async (req: Request, res: Response) => {
  const sessionUsername = (req.session as any).username;
  if (!sessionUsername) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const targetUsername = typeof req.params.username === 'string' ? req.params.username.trim() : '';
  if (!targetUsername) {
    res.status(400).json({ error: 'Username is required.' });
    return;
  }

  if (normalizeUsernameKey(targetUsername) !== normalizeUsernameKey(sessionUsername)) {
    res.status(403).json({ error: 'You can only delete your own account.' });
    return;
  }

  if (normalizeUsernameKey(sessionUsername) === normalizeUsernameKey(APP_USERNAME)) {
    res.status(400).json({ error: 'Default env account cannot be deleted.' });
    return;
  }

  const targetUser = await findLocalUserByUsername(targetUsername);
  if (!targetUser) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, targetUser.id));

  req.session.destroy(() => {
    res.json({ success: true, deleted: true });
  });
});

export default router;
