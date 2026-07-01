import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

export default function PermissionRoute({ allowed, children }) {
  const navigate = useNavigate();

  if (!allowed) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4 w-full">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 text-destructive rounded-full">
                <ShieldAlert className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Access Denied
            </h1>
            <h2 className="text-xl font-semibold text-muted-foreground">Unauthorized Route</h2>
            <p className="text-muted-foreground">
              You do not have permission to view this module. Please contact your system administrator if you believe this is an error.
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button onClick={() => navigate("/dashboard")} className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
