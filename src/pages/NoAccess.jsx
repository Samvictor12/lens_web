import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * Shown when the logged-in user has no Screen permissions.
 */
export default function NoAccess() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-1 min-h-0 items-center justify-center p-6">
      <div className="text-center space-y-5 max-w-md">
        <div className="flex justify-center">
          <div className="p-4 bg-destructive/10 text-destructive rounded-full">
            <ShieldAlert className="h-12 w-12" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">No module access</h1>
          <p className="text-sm text-muted-foreground">
            {user?.name ? `Hi ${user.name}. ` : ""}
            Your role does not have Screen access to any module. Please contact
            your administrator to enable permissions.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
