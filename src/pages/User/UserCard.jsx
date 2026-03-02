import { Mail, Building2, Trash2, UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * UserCard component displays user information in card format
 * @param {Object} user - User data object
 * @param {Function} onView - Callback function when view button is clicked
 * @param {Function} onEdit - Callback function when edit button is clicked
 * @param {Function} onDelete - Callback function when delete button is clicked
 * @param {Function} onLoginSettings - Callback function when login settings button is clicked
 */
export default function UserCard({
  user,
  onView,
  onEdit,
  onDelete,
  onLoginSettings,
}) {
  console.log("Rendering UserCard for user:", user);
  return (
    <Card
      key={user.id}
      className="p-3 hover:shadow-md transition-shadow flex flex-col h-full"
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-h-[60px]">
            <h3 className="font-semibold text-sm">{user.name}</h3>
            <p className="text-xs text-muted-foreground">{user.usercode}</p>
            {user.departmentDetails ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" />
                {user.departmentDetails.department}
              </p>
            ) : (
              <p className="text-xs text-transparent mt-0.5 h-4">&nbsp;</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`text-xs px-1.5 py-0 h-5 ${
              user.active_status
                ? "bg-success/10 text-success border-success/20"
                : "bg-muted text-muted-foreground border-muted"
            }`}
          >
            {user.active_status ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="space-y-1.5 min-h-[44px]">
          <div className="flex items-center gap-1.5 text-xs h-4">
            <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{user.email || "-"}</span>
          </div>
          {user.role ? (
            <div className="flex items-center gap-1.5 text-xs h-4">
              <UserCog className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{user.role.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs h-4 text-transparent">
              <UserCog className="h-3 w-3 flex-shrink-0" />
              <span>&nbsp;</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Login Status:</span>
            <span
              className={`font-semibold text-xs ${
                user.is_login ? "text-success" : "text-muted-foreground"
              }`}
            >
              {user.is_login ? "Configured" : "Not Set"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Created:</span>
            <span className="text-xs text-muted-foreground">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 pt-2 mt-auto">
        <Button
          variant="outline"
          size="xs"
          className="flex-1 h-7 text-xs"
          onClick={() => onView(user.id)}
        >
          View
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="h-7 px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          onClick={() => onLoginSettings && onLoginSettings(user)}
          title="Login Settings"
        >
          <UserCog className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete && onDelete(user)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
