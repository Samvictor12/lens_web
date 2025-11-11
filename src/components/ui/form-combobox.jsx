import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Label } from "./label";

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
      containerClassName,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const inputId = props.id || props.name;

    // Find the selected option label
    const selectedOption = options.find((option) => String(option.id) === String(value));
    const displayValue = selectedOption ? selectedOption.name : placeholder;

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        {/* Label */}
        {label && (
          <Label htmlFor={inputId} className="text-xs">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
        )}

        {/* Combobox */}
        <Popover open={open} onOpenChange={setOpen}>
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
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder={searchPlaceholder} className="h-8" />
              <CommandList>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.name}
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
                      {option.name}
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
