import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Activity, ShieldCheck, FileSpreadsheet, Eye, EyeOff } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function readApiError(response: Response, fallback: string): Promise<string> {
  let payload: any = null;
  try {
    payload = await response.clone().json();
  } catch {
    payload = null;
  }

  if (payload?.error && typeof payload.error === "string") {
    return payload.error;
  }

  if (response.status === 404) {
    return "Auth route not found. Restart API server and try again.";
  }

  try {
    const text = await response.text();
    if (text && text.trim()) {
      return text.slice(0, 180);
    }
  } catch {
    // ignore and return fallback
  }

  return fallback;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        setLocation("/");
      },
      onError: (err: any) => {
        // Keep sign-in failures concise and avoid showing unrelated helper text.
        const rawError =
          err?.data?.error ||
          err?.response?.data?.error ||
          err?.message ||
          "Invalid credentials";

        if (mode === "login") {
          setError("Invalid user");
          return;
        }

        setError(rawError);
      }
    }
  });

  const submitRegister = async (
    normalizedUsername: string,
    normalizedEmail: string,
    normalizedPassword: string,
  ) => {
    setIsRegistering(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: normalizedUsername,
          email: normalizedEmail,
          password: normalizedPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to create account"));
      }

      setMessage("Account created successfully. Redirecting to dashboard...");
      setLocation("/");
    } catch (err: any) {
      setError(err?.message || "Unable to create account");
    } finally {
      setIsRegistering(false);
    }
  };

  const requestResetCode = async () => {
    const normalizedResetUsername = resetUsername.trim();
    if (!normalizedResetUsername) {
      setError("Enter username to request reset code");
      return;
    }

    setError(null);
    setResetInfo(null);
    setIsRequestingCode(true);

    try {
      const response = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: normalizedResetUsername }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to request reset code"));
      }

      setResetCode(result?.resetCode ?? "");
      setResetInfo(
        `Reset code: ${result?.resetCode ?? ""} (valid for ${Math.floor((result?.expiresInSeconds ?? 0) / 60)} minutes)`,
      );
      setMessage("Reset code generated. Use it below to set a new password.");
    } catch (err: any) {
      setError(err?.message || "Unable to request reset code");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const confirmPasswordReset = async () => {
    const normalizedResetUsername = resetUsername.trim();
    const normalizedCode = resetCode.trim();
    const normalizedNewPassword = resetNewPassword.trim();

    if (!normalizedResetUsername || !normalizedCode || !normalizedNewPassword) {
      setError("Enter username, reset code, and new password");
      return;
    }

    setError(null);
    setIsResettingPassword(true);

    try {
      const response = await fetch("/api/auth/forgot-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: normalizedResetUsername,
          resetCode: normalizedCode,
          newPassword: normalizedNewPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to reset password"));
      }

      setResetCode("");
      setResetNewPassword("");
      setResetInfo(null);
      setShowForgotPassword(false);
      setMode("login");
      setMessage("Password reset successful. Sign in with your new password.");
    } catch (err: any) {
      setError(err?.message || "Unable to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setResetInfo(null);

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      setError("Please enter both username/email and password");
      return;
    }

    if (mode === "register") {
      if (!normalizedEmail) {
        setError("Please enter your email");
        return;
      }

      submitRegister(normalizedUsername, normalizedEmail, normalizedPassword);
      return;
    }

    loginMutation.mutate({
      data: { username: normalizedUsername, password: normalizedPassword },
    });
  };

  const isBusy = loginMutation.isPending || isRegistering;

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left side branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 relative overflow-hidden bg-card/30 border-r border-border">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
            alt="Abstract Background" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex items-center gap-3 text-primary"
          >
            <div className="p-3 rounded-2xl bg-primary/20 ring-1 ring-primary/30">
              <Activity className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Result Analyzer</h1>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight"
          >
            Result Analysis <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Visualized & Simplified.
            </span>
          </motion.h2>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6 mt-12"
          >
            <FeatureItem icon={<FileSpreadsheet />} title="Excel Integration" desc="Seamlessly process raw marks from standard spreadsheets." />
            <FeatureItem icon={<Activity />} title="Advanced Analytics" desc="Generate instant dashboards, pass rates, and detailed stats." />
            <FeatureItem icon={<ShieldCheck />} title="Secure Reporting" desc="Export secure PDF and Excel reports with a single click." />
          </motion.div>
        </div>
      </div>

      {/* Right side login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="lg:hidden flex items-center gap-2 sm:gap-3 justify-center mb-6 sm:mb-8">
            <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Result Analyzer</h1>
          </div>

          <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
            <CardHeader className="space-y-2 pb-6 sm:pb-8">
              <CardTitle className="text-xl sm:text-2xl text-center">Welcome Back</CardTitle>
              <CardDescription className="text-center text-sm sm:text-base">
                {mode === "login"
                  ? "Sign in to analyze student results"
                  : "Create an account to access your dashboard"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-5 rounded-xl bg-secondary p-1 grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  variant={mode === "login" ? "default" : "ghost"}
                  onClick={() => {
                    setMode("login");
                    setUsername("");
                    setPassword("");
                    setError(null);
                    setMessage(null);
                    setShowForgotPassword(false);
                  }}
                >
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant={mode === "register" ? "default" : "ghost"}
                  onClick={() => {
                    setMode("register");
                    setUsername("");
                    setPassword("");
                    setEmail("");
                    setError(null);
                    setMessage(null);
                    setShowForgotPassword(false);
                  }}
                >
                  Create Account
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground/80 pl-1">
                      {mode === "login" ? "Username or Email" : "Username"}
                    </label>
                    <Input
                      placeholder={mode === "login" ? "Enter username or email" : "Enter your username"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isBusy}
                    />
                  </div>
                  {mode === "register" ? (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground/80 pl-1">Email</label>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isBusy}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground/80 pl-1">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isBusy}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={isBusy}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {mode === "register" ? (
                      <p className="text-xs text-muted-foreground pl-1">Use at least 6 characters for password.</p>
                    ) : null}
                  </div>
                </>

                {mode === "login" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        setShowForgotPassword((prev) => !prev);
                        setError(null);
                        setMessage(null);
                        setResetInfo(null);
                      }}
                    >
                      {showForgotPassword ? "Close Forgot Password" : "Forgot Password?"}
                    </button>
                  </div>
                )}

                {showForgotPassword && mode === "login" && (
                  <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/30 p-3">
                    <p className="text-sm font-medium">Forgot Password</p>
                    <Input
                      placeholder="Username or Email"
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                      disabled={isRequestingCode || isResettingPassword}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={requestResetCode}
                        disabled={isRequestingCode || isResettingPassword}
                      >
                        {isRequestingCode ? "Requesting..." : "Get Reset Code"}
                      </Button>
                    </div>

                    <Input
                      placeholder="Reset code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      disabled={isRequestingCode || isResettingPassword}
                    />
                    <div className="relative">
                      <Input
                        type={showResetNewPassword ? "text" : "password"}
                        placeholder="New password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        disabled={isRequestingCode || isResettingPassword}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowResetNewPassword((prev) => !prev)}
                        aria-label={showResetNewPassword ? "Hide new password" : "Show new password"}
                        disabled={isRequestingCode || isResettingPassword}
                      >
                        {showResetNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {resetInfo ? <p className="text-xs text-emerald-700">{resetInfo}</p> : null}

                    <Button
                      type="button"
                      onClick={confirmPasswordReset}
                      disabled={isRequestingCode || isResettingPassword}
                      className="w-full"
                    >
                      {isResettingPassword ? "Resetting..." : "Confirm Password Reset"}
                    </Button>
                  </div>
                )}

                {message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl"
                  >
                    {message}
                  </motion.div>
                )}
                
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl"
                  >
                    {error}
                  </motion.div>
                )}

                <Button 
                  type="submit" 
                  className="w-full mt-2" 
                  size="lg"
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {mode === "login"
                        ? "Authenticating..."
                        : "Creating account..."}
                    </>
                  ) : mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2.5 rounded-xl bg-secondary text-primary shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-foreground mb-1 text-lg">{title}</h4>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">{desc}</p>
      </div>
    </div>
  );
}
