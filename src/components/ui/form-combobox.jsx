import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Label } from "./label";

function optionSearchValue(option) {
  const label = option.label ?? option.name ?? "";
  const code = option.code ?? "";
  return [label, code].filter(Boolean).join(" ");
}

function optionLabel(option) {
  return option.label ?? option.name ?? "";
}

const FormCombobox = React.forwardRef(
  (
    {
      label,
      required,
      error,
      helperText,
      options = [],
      value,
      onValueChange,
      placeholder = "Select option",
      searchPlaceholder = "Search...",
      emptyText = "No option found.",
      disabled,
      isClearable = false,
      containerClassName,
      className,
      popoverClassName,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const inputId = props.id || props.name;

    const selectedOption = options.find((option) => String(option.id) === String(value));
    const displayValue = selectedOption ? optionLabel(selectedOption) : placeholder;

    const handleClear = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onValueChange?.(null);
      setOpen(false);
    };

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        {/* Label */}
        {label && (
          <Label htmlFor={inputId} className="text-xs">
            {label}{required && <span className="text-red-500"> *</span>}
          </Label>
        )}

        {/* Combobox */}
        <Popover open={open} onOpenChange={setOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={inputId}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "h-8 w-full justify-between text-sm font-normal",
                !value && "text-muted-foreground",
                error && "border-destructive",
                className
              )}
            >
              <span className="truncate">{displayValue}</span>
              <span className="ml-2 flex shrink-0 items-center gap-1">
                {isClearable && value && !disabled && (
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label="Clear selection"
                    className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={handleClear}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn("z-[100] w-[--radix-popover-trigger-width] p-0", popoverClassName)}
            align="start"
          >
            <Command>
              <CommandInput placeholder={searchPlaceholder} className="h-8" />
              <CommandList>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={optionSearchValue(option)}
                      onSelect={() => {
                        onValueChange(String(option.id) === String(value) ? null : option.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          String(value) === String(option.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {optionLabel(option)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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

FormCombobox.displayName = "FormCombobox";

export { FormCombobox };
