import { Navigate } from "react-router-dom";
import { useRolePermissionsContext } from "@/contexts/RolePermissionsContext";
import { resolveHomePath } from "@/constants/homeRoutes";

/**
 * Redirects "/" (and similar) to the first Screen the user is allowed to open.
 */
export default function HomeRedirect() {
  const { has, loading } = useRolePermissionsContext();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  const path = resolveHomePath((key) => has(key, "Screen"));
  return <Navigate to={path} replace />;
}
