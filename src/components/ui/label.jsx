import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

const Label = React.forwardRef(({ className, ...props }, ref) => {
  const labelClasses = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";
  const finalClasses = className ? `${labelClasses} ${className}` : labelClasses;
  
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={finalClasses}
      {...props}
    />
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
