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
import { updateUserLoginSettings } from "@/services/user";

export default function UserLoginDialog({ open, onOpenChange, user, onSuccess }) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginData, setLoginData] = useState({
    user_name: "",
    password: "",
    is_login: false,
  });

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (user && open) {
      setLoginData({
        user_name: user.user_name || "",
        password: "",
        is_login: user.is_login || false,
      });
      setErrors({});
    }
  }, [user, open]);

  const validateForm = () => {
    const newErrors = {};

    // User name validation
    if (!loginData.user_name.trim()) {
      newErrors.user_name = "Username is required";
    } else if (loginData.user_name.length < 3) {
      newErrors.user_name = "Username must be at least 3 characters";
    }

    // Password validation (only required if enabling login or changing password)
    if (loginData.password) {
      if (loginData.password.length < 6) {
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

      const response = await updateUserLoginSettings(user.id, loginData);

      if (response.success) {
        toast({
          title: "Success",
          description: "Login settings updated successfully!",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Login Settings</DialogTitle>
          <DialogDescription className="text-xs">
            Configure login credentials for {user?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Username Field */}
            <FormInput
              label="Username"
              name="user_name"
              value={loginData.user_name}
              onChange={handleChange}
              required
              error={errors.user_name}
              placeholder="Enter username"
            />

            {/* Password Field */}
            <FormInput
              label="Password"
              name="password"
              type="password"
              value={loginData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="Enter new password (leave blank to keep current)"
            />

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
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
