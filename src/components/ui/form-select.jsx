import * as React from "react";
import Select from "react-select";
import { Label } from "./label";
import { cn } from "@/lib/utils";

const FormSelect = React.forwardRef(
  (
    {
      label,
      required,
      error,
      helperText,
      options = [],
      value,
      onChange,
      placeholder = "Select option",
      isSearchable = true,
      isClearable = false,
      disabled,
      containerClassName,
      className,
      ...props
    },
    ref
  ) => {
    const inputId = props.id || props.name;

    // Convert options to react-select format if needed
    const selectOptions = options.map((option) => ({
      value: option.value !== undefined ? option.value : option.id,
      label: option.label !== undefined ? option.label : option.name,
      ...option, // Preserve other properties like code
    }));

    // Find selected option
    const selectedOption = selectOptions.find(
      (option) => String(option.value) === String(value)
    );

    // Custom styles to match FormInput design
    const customStyles = {
      control: (base, state) => ({
        ...base,
        minHeight: "32px",
        height: "32px",
        fontSize: "0.875rem", // text-sm
        borderColor: error
          ? "hsl(var(--destructive))"
          : state.isFocused
            ? "hsl(var(--ring))"
            : "hsl(var(--input))",
        backgroundColor: disabled ? "hsl(var(--muted) / 0.3)" : "hsl(var(--background))",
        boxShadow: state.isFocused ? "0 0 0 1px hsl(var(--ring))" : "none",
        "&:hover": {
          borderColor: state.isFocused
            ? "hsl(var(--ring))"
            : "hsl(var(--input))",
        },
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }),
      valueContainer: (base) => ({
        ...base,
        height: "32px",
        padding: "0 8px",
      }),
      input: (base) => ({
        ...base,
        margin: "0px",
        padding: "0px",
        color: "hsl(var(--foreground))",
      }),
      indicatorSeparator: () => ({
        display: "none",
      }),
      indicatorsContainer: (base) => ({
        ...base,
        height: "32px",
      }),
      dropdownIndicator: (base) => ({
        ...base,
        padding: "4px",
        color: "hsl(var(--muted-foreground))",
        "&:hover": {
          color: "hsl(var(--foreground))",
        },
      }),
      clearIndicator: (base) => ({
        ...base,
        padding: "4px",
        color: "hsl(var(--muted-foreground))",
        "&:hover": {
          color: "hsl(var(--foreground))",
        },
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        boxShadow:
          "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        borderRadius: "0.5rem",
        zIndex: 50,
      }),
      menuList: (base) => ({
        ...base,
        padding: "4px",
        maxHeight: "300px",
      }),
      option: (base, state) => ({
        ...base,
        fontSize: "0.875rem",
        padding: "6px 8px",
        borderRadius: "0.375rem",
        backgroundColor: state.isSelected
          ? "hsl(var(--accent))"
          : state.isFocused
            ? "hsl(var(--accent) / 0.5)"
            : "transparent",
        color: state.isSelected
          ? "hsl(var(--accent-foreground))"
          : "hsl(var(--foreground))",
        cursor: "pointer",
        "&:active": {
          backgroundColor: "hsl(var(--accent))",
        },
      }),
      placeholder: (base) => ({
        ...base,
        color: "hsl(var(--muted-foreground) / 0.4)",
        fontSize: "0.875rem",
      }),
      singleValue: (base, state) => ({
        ...base,
        color: "hsl(var(--foreground))",
        fontSize: "0.875rem",
        opacity: state.isDisabled ? 1 : 1,
      }),
      noOptionsMessage: (base) => ({
        ...base,
        fontSize: "0.875rem",
        color: "hsl(var(--muted-foreground))",
        padding: "8px",
      }),
    };

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        <div className="flex justify-between items-center gap-2">

          {/* Label */}
          {label && (
            <Label htmlFor={inputId} className="text-xs min-w-[60px] w-[180px]">
              {label} {required && <span className="text-destructive">*</span>}
            </Label>
          )}

          {/* React Select */}
          <Select
            ref={ref}
            inputId={inputId}
            options={selectOptions}
            value={selectedOption || null}
            onChange={(option) => {
              onChange(option ? option.value : null);
            }}
            placeholder={placeholder}
            isSearchable={isSearchable}
            isClearable={isClearable}
            isDisabled={disabled}
            styles={customStyles}
            className={cn("react-select-container w-full", className)}
            classNamePrefix="react-select"
            noOptionsMessage={() => "No options found"}
            {...props}
          />
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

FormSelect.displayName = "FormSelect";

export { FormSelect };
