import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Activity, ShieldCheck, FileSpreadsheet } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        setLocation("/");
      },
      onError: (err: any) => {
        setError(
          err?.data?.error ||
            err?.response?.data?.error ||
            err?.message ||
            "Invalid credentials",
        );
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      setError("Please enter both username and password");
      return;
    }
    loginMutation.mutate({
      data: { username: normalizedUsername, password: normalizedPassword },
    });
  };

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
                Sign in to analyze student results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80 pl-1">Username</label>
                  <Input 
                    placeholder="Enter your username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loginMutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80 pl-1">Password</label>
                  <Input 
                    type="password" 
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loginMutation.isPending}
                  />
                </div>
                
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
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating...</>
                  ) : "Sign In"}
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
