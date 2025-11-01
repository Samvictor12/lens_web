import * as React from "react";

const getAlertClasses = (variant = "default") => {
  const baseClasses = "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground";
  
  const variantClasses = {
    default: "bg-background text-foreground",
    destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
  };
  
  return `${baseClasses} ${variantClasses[variant] || variantClasses.default}`;
};

const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const alertClasses = getAlertClasses(variant);
  const finalClasses = className ? `${alertClasses} ${className}` : alertClasses;
  
  return (
    <div
      ref={ref}
      role="alert"
      className={finalClasses}
      {...props}
    />
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => {
  const titleClasses = "mb-1 font-medium leading-none tracking-tight";
  const finalClasses = className ? `${titleClasses} ${className}` : titleClasses;
  
  return (
    <h5
      ref={ref}
      className={finalClasses}
      {...props}
    />
  );
});
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => {
  const descClasses = "text-sm [&_p]:leading-relaxed";
  const finalClasses = className ? `${descClasses} ${className}` : descClasses;
  
  return (
    <div
      ref={ref}
      className={finalClasses}
      {...props}
    />
  );
});
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };



