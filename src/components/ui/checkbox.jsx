import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { Label } from "./label";
import { cn } from "@/lib/utils";

const getCheckboxClasses = (className) => {
  const baseClasses = "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";
  return className ? `${baseClasses} ${className}` : baseClasses;
};

const Checkbox = React.forwardRef(
  (
    {
      label,
      required,
      error,
      helperText,
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const inputId = props.id || props.name;

    // If no label provided, render simple checkbox (backward compatibility)
    if (!label) {
      return (
        <CheckboxPrimitive.Root
          ref={ref}
          className={getCheckboxClasses(className)}
          {...props}
        >
          <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
            <Check className="h-4 w-4" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
      );
    }

    // Render FormInput-style checkbox with label and error handling
    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        <div className="flex justify-between items-center gap-2">
          {/* Label */}
          <Label htmlFor={inputId} className="text-xs min-w-[60px] w-[180px]">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>

          {/* Checkbox */}
          <div className="flex items-center w-full">
            <CheckboxPrimitive.Root
              ref={ref}
              id={inputId}
              className={cn(
                getCheckboxClasses(className),
                error && "border-destructive"
              )}
              {...props}
            >
              <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
                <Check className="h-4 w-4" />
              </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Helper Text */}
        {!error && helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };



