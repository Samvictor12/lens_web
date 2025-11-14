import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Glasses } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      navigate("/dashboard");
    } catch (error) {
      console.log('Login error:', error);
      
      // Prevent any default error behavior
      e.preventDefault();
      
      // apiClient throws err.response?.data directly, so error IS the data object
      // Handle validation errors (array of errors)
      if (error.errors && Array.isArray(error.errors)) {
        const errorMessage = error.errors.join(', ');
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      const errorMessage = error.message || "Invalid credentials. Please try again.";
      
      // Map error codes to user-friendly messages
      let displayMessage = errorMessage;
      if (error.errorCode === 'NO_LOGIN_ACCESS') {
        displayMessage = "You do not have login access. Please contact administrator.";
      } else if (error.errorCode === 'ACCOUNT_INACTIVE') {
        displayMessage = "Your account is inactive. Please contact administrator for login access.";
      } else if (error.errorCode === 'LOGIN_NOT_ENABLED') {
        displayMessage = "Login is not enabled for this account. Please contact administrator.";
      } else if (error.errorCode === 'INVALID_CREDENTIALS') {
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

  const demoCredentials = [
    { role: "Admin", username: "admin" },
    { role: "Sales", username: "rahul" },
    { role: "Inventory", username: "priya" },
    { role: "Accounts", username: "amit" },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden md:block space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Glasses className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Lens Billing
              </h1>
              <p className="text-sm text-muted-foreground">Inventory Management System</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              Streamline Your Optical Business
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Complete solution for managing sales, inventory, billing, and customer relationships
              in the optical industry.
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-lg bg-card border">
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Orders Managed</div>
              </div>
              <div className="p-4 rounded-lg bg-card border">
                <div className="text-2xl font-bold text-accent">50+</div>
                <div className="text-sm text-muted-foreground">Active Customers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Demo Credentials:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demoCredentials.map((cred) => (
                  <button
                    key={cred.role}
                    onClick={() => {
                      setUsername(cred.username);
                      setPassword("demo");
                    }}
                    className="text-xs p-2 rounded-md bg-muted hover:bg-muted/80 text-left transition-colors"
                  >
                    <div className="font-semibold">{cred.role}</div>
                    <div className="text-muted-foreground truncate">{cred.username}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Password: <code className="bg-muted px-1 py-0.5 rounded">demo</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




