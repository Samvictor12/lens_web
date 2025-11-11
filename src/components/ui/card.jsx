import * as React from "react";

const Card = React.forwardRef(({ className, ...props }, ref) => {
  const cardClasses = "rounded-lg border bg-card text-card-foreground shadow-sm p-6";
  const finalClasses = className ? `${cardClasses} ${className}` : cardClasses;
  
  return (
    <div
      ref={ref}
      className={finalClasses}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef(
  ({ className, ...props }, ref) => {
    const headerClasses = "flex flex-col space-y-1.5 p-6";
    const finalClasses = className ? `${headerClasses} ${className}` : headerClasses;
    
    return (
      <div
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(
  ({ className, ...props }, ref) => {
    const titleClasses = "text-2xl font-semibold leading-none tracking-tight";
    const finalClasses = className ? `${titleClasses} ${className}` : titleClasses;
    
    return (
      <h3
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(
  ({ className, ...props }, ref) => {
    const descClasses = "text-sm text-muted-foreground";
    const finalClasses = className ? `${descClasses} ${className}` : descClasses;
    
    return (
      <p
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(
  ({ className, ...props }, ref) => {
    const contentClasses = "";
    const finalClasses = className ? `${contentClasses} ${className}` : contentClasses;
    
    return (
      <div ref={ref} className={finalClasses} {...props} />
    );
  },
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(
  ({ className, ...props }, ref) => {
    const footerClasses = "flex items-center p-6 pt-0";
    const finalClasses = className ? `${footerClasses} ${className}` : footerClasses;
    
    return (
      <div
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };


