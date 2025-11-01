import * as React from "react";

const getTextareaClasses = (className) => {
  const baseClasses = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  return className ? `${baseClasses} ${className}` : baseClasses;
};

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={getTextareaClasses(className)}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };





