import * as React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

const FormInput = React.forwardRef(
  (
    {
      label,
      required,
      error,
      helperText,
      prefix,
      suffix,
      className,
      containerClassName,
      showCharCount,
      maxLength,
      ...props
    },
    ref
  ) => {
    const inputId = props.id || props.name;
    const hasPrefix = !!prefix;
    const hasSuffix = !!suffix;
    const currentLength = props.value?.toString().length || 0;

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        {/* Label */}
        {label && (
          <Label htmlFor={inputId} className="text-xs">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
        )}

        {/* Input with optional prefix/suffix */}
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {prefix}
            </span>
          )}
          <Input
            ref={ref}
            id={inputId}
            autoComplete="off"
            maxLength={maxLength}
            className={cn(
              "h-8 text-sm",
              hasPrefix && "pl-12",
              hasSuffix && "pr-12",
              error && "border-destructive",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>

        {/* Error Message */}
        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Helper Text or Character Count */}
        {!error && (helperText || (showCharCount && maxLength)) && (
          <p className="text-xs text-muted-foreground">
            {showCharCount && maxLength
              ? `${currentLength}/${maxLength} ${
                  props.type === "tel" ? "digits" : "characters"
                }`
              : helperText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export { FormInput };
