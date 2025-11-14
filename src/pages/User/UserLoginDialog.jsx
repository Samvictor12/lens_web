import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getLoginCredentials,
  enableUserLogin,
  updateUserLogin,
} from "@/services/user";

export default function UserLoginDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoginEnabled, setIsLoginEnabled] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
    is_login: false,
  });

  // Fetch login credentials when user changes or dialog opens
  useEffect(() => {
    const fetchLoginCredentials = async () => {
      if (user && open) {
        try {
          setIsLoading(true);
          const response = await getLoginCredentials(user.id);

          if (response.success) {
            const credentials = response.data;
            // Check if login credentials exist (username is set and not a temp one)
            const hasLoginCredentials =
              credentials.username &&
              credentials.username.trim() !== "" &&
              !credentials.username.startsWith("user_");
            setIsLoginEnabled(hasLoginCredentials);
            setShowPasswordChange(false);
            setLoginData({
              username: credentials.username || "",
              password: "",
              is_login: credentials.is_login || false,
            });
          }
        } catch (error) {
          console.error("Error fetching login credentials:", error);
          // If error, assume login not enabled
          setIsLoginEnabled(false);
          setShowPasswordChange(false);
          setLoginData({
            username: "",
            password: "",
            is_login: false,
          });
        } finally {
          setIsLoading(false);
        }
        setErrors({});
      }
    };

    fetchLoginCredentials();
  }, [user, open]);

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!loginData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (loginData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    // Password validation
    if (!isLoginEnabled) {
      // For enable login, password is required
      if (!loginData.password) {
        newErrors.password = "Password is required";
      } else if (loginData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    } else if (showPasswordChange) {
      // For update login with password change, password is required
      if (!loginData.password) {
        newErrors.password = "New password is required";
      } else if (loginData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSwitchChange = (checked) => {
    setLoginData((prev) => ({ ...prev, is_login: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      let response;

      if (!isLoginEnabled) {
        // Enable login for the first time
        response = await enableUserLogin(user.id, loginData);
      } else {
        // Update existing login credentials
        response = await updateUserLogin(user.id, loginData);
      }

      if (response.success) {
        toast({
          title: "Success",
          description:
            response.message || "Login settings updated successfully!",
          className: "bg-green-50 border-green-200 text-green-900",
        });

        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Error updating login settings:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to update login settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isLoginEnabled ? `Update Login Settings - ${user?.name}` : `Enable Login - ${user?.name}`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isLoginEnabled
              ? `Update login credentials for this user`
              : `Set up login credentials for this user`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Username Field */}
              <FormInput
                label="Username"
                name="username"
                value={loginData.username}
                onChange={handleChange}
                required
                error={errors.username}
                placeholder="Enter username"
              />

              {/* Password Field */}
              {!isLoginEnabled ? (
                <FormInput
                  label="Password"
                  name="password"
                  type="password"
                  value={loginData.password}
                  onChange={handleChange}
                  required
                  error={errors.password}
                  placeholder="Enter password"
                />
              ) : showPasswordChange ? (
                <div className="space-y-2">
                  <FormInput
                    label="New Password"
                    name="password"
                    type="password"
                    value={loginData.password}
                    onChange={handleChange}
                    required
                    error={errors.password}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setLoginData((prev) => ({ ...prev, password: "" }));
                      setErrors((prev) => ({ ...prev, password: "" }));
                    }}
                  >
                    Cancel Password Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowPasswordChange(true)}
                  >
                    Change Password
                  </Button>
                </div>
              )}

              {/* Login Enable/Disable Switch */}
              <div className="flex items-center justify-between space-x-2 py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="is_login" className="text-sm font-medium">
                    Enable Login
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow this user to login to the system
                  </p>
                </div>
                <Switch
                  id="is_login"
                  checked={loginData.is_login}
                  onCheckedChange={handleSwitchChange}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-2" />
                    {isLoginEnabled ? "Update Login" : "Save Login"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
