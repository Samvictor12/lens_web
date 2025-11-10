import * as React from "react";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { cn } from "@/lib/utils";

const FormTextarea = React.forwardRef(
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
    const textareaId = props.id || props.name;

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        {/* Label */}
        {label && (
          <Label htmlFor={textareaId} className="text-xs">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
        )}

        {/* Textarea */}
      <Textarea
        ref={ref}
        id={textareaId}
        autoComplete="off"
        className={cn(
          "text-sm",
          error && "border-destructive",
          className
        )}
        {...props}
      />        {/* Error Message */}
        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Helper Text */}
        {!error && helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = "FormTextarea";

export { FormTextarea };
