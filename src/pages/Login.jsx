import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { resolveHomePathForCurrentUser } from "@/utils/resolveHomePath";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!username.trim() || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter both username and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await login(username, password);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      const homePath = await resolveHomePathForCurrentUser();
      navigate(homePath, { replace: true });
    } catch (error) {
      console.log("Login error:", error);

      e.preventDefault();

      if (error.errors && Array.isArray(error.errors)) {
        toast({
          title: "Login failed",
          description: error.errors.join(", "),
          variant: "destructive",
        });
        return;
      }

      const errorMessage = error.message || "Invalid credentials. Please try again.";

      let displayMessage = errorMessage;
      if (error.errorCode === "NO_LOGIN_ACCESS") {
        displayMessage = "You do not have login access. Please contact administrator.";
      } else if (error.errorCode === "ACCOUNT_INACTIVE") {
        displayMessage = "Your account is inactive. Please contact administrator for login access.";
      } else if (error.errorCode === "LOGIN_NOT_ENABLED") {
        displayMessage = "Login is not enabled for this account. Please contact administrator.";
      } else if (error.errorCode === "INVALID_CREDENTIALS") {
        displayMessage = "Invalid username or password.";
      }

      toast({
        title: "Login failed",
        description: displayMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-svh w-full grid md:grid-cols-[3fr_2fr]">
      {/* Branding panel — 60% */}
      <aside className="relative hidden md:flex flex-col items-center justify-center overflow-hidden bg-white border-r border-border/60">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 20%, hsl(217 91% 60% / 0.12), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 75%, hsl(186 94% 45% / 0.14), transparent 50%), linear-gradient(160deg, hsl(210 40% 98%) 0%, hsl(0 0% 100%) 45%, hsl(186 40% 97%) 100%)",
          }}
        />
        <div className="relative z-10 w-full max-w-xl px-10 lg:px-14">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/70 shadow-[0_20px_60px_-20px_hsl(217_91%_40%/0.25)] p-8 lg:p-10">
            <img
              src="/VisionConnect-full.jpeg"
              alt="Vision Connect — Customer Management & Billing"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </aside>

      {/* Login panel — 40% */}
      <main className="relative flex flex-col justify-center bg-background px-6 py-10 sm:px-10 lg:px-14 xl:px-16">
        <div
          className="pointer-events-none absolute inset-0 md:hidden"
          style={{
            background:
              "radial-gradient(ellipse 90% 40% at 50% 0%, hsl(217 91% 60% / 0.08), transparent 60%)",
          }}
        />

        <div className="relative z-10 w-full max-w-sm mx-auto">
          {/* Mobile logo */}
          <div className="mb-10 flex justify-center md:hidden">
            <img
              src="/VisionConnect.jpeg"
              alt="Vision Connect"
              className="h-[4.5rem] w-auto object-contain"
            />
          </div>

          <div className="mb-8 space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
              Welcome Back
            </h1>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
                className="h-12 rounded-xl bg-card border-border/80 px-4 text-[15px] shadow-sm transition-shadow focus-visible:shadow-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-12 rounded-xl bg-card border-border/80 px-4 pr-11 text-[15px] shadow-sm transition-shadow focus-visible:shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-[15px] font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
