import { RotateCw } from "lucide-react";

export function Refresh({ onClick, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-md border border-input bg-background px-2 h-8 text-xs font-medium shadow-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none ${className}`}
      title="Refresh"
      aria-label="Refresh"
      onClick={onClick}
      {...props}
    >
      <RotateCw className="h-4 w-4 mr-1 text-muted-foreground" />
      <span className="hidden sm:inline">Refresh</span>
    </button>
  );
}
