import { Router, type IRouter, type Request, type Response } from 'express';

const router: IRouter = Router();

const APP_USERNAME = process.env.APP_USERNAME || 'admin';
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin123';

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  if (username !== APP_USERNAME || password !== APP_PASSWORD) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  (req.session as any).username = username;
  res.json({ success: true, username });
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/me', (req: Request, res: Response) => {
  const username = (req.session as any).username;
  if (!username) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  res.json({ username, authenticated: true });
});

export default router;
