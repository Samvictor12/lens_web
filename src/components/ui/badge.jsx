import * as React from "react";

const getBadgeClasses = (variant = "default") => {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variantClasses = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
  };
  
  return `${baseClasses} ${variantClasses[variant] || variantClasses.default}`;
};

function Badge({ className, variant = "default", ...props }) {
  const badgeClasses = getBadgeClasses(variant);
  const finalClasses = className ? `${badgeClasses} ${className}` : badgeClasses;
  
  return (
    <div className={finalClasses} {...props} />
  );
}

export { Badge, getBadgeClasses };


