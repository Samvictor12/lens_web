import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef(
  ({ className, inset, children, ...props }, ref) => {
    const baseClasses = "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent";
    const insetClasses = inset ? "pl-8" : "";
    const finalClasses = className ? `${baseClasses} ${insetClasses} ${className}` : `${baseClasses} ${insetClasses}`;
    
    return (
      <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={finalClasses}
        {...props}
      >
        {children}
        <ChevronRight className="ml-auto h-4 w-4" />
      </DropdownMenuPrimitive.SubTrigger>
    );
  }
);
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef(
  ({ className, ...props }, ref) => {
    const contentClasses = "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";
    const finalClasses = className ? `${contentClasses} ${className}` : contentClasses;
    
    return (
      <DropdownMenuPrimitive.SubContent
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  }
);
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef(
  ({ className, sideOffset = 4, ...props }, ref) => {
    const contentClasses = "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";
    const finalClasses = className ? `${contentClasses} ${className}` : contentClasses;
    
    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={finalClasses}
          {...props}
        />
      </DropdownMenuPrimitive.Portal>
    );
  }
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef(
  ({ className, inset, ...props }, ref) => {
    const baseClasses = "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";
    const insetClasses = inset ? "pl-8" : "";
    const finalClasses = className ? `${baseClasses} ${insetClasses} ${className}` : `${baseClasses} ${insetClasses}`;
    
    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef(
  ({ className, children, checked, ...props }, ref) => {
    const checkboxClasses = "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";
    const finalClasses = className ? `${checkboxClasses} ${className}` : checkboxClasses;
    
    return (
      <DropdownMenuPrimitive.CheckboxItem
        ref={ref}
        className={finalClasses}
        checked={checked}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Check className="h-4 w-4" />
          </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
      </DropdownMenuPrimitive.CheckboxItem>
    );
  }
);
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const radioClasses = "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";
    const finalClasses = className ? `${radioClasses} ${className}` : radioClasses;
    
    return (
      <DropdownMenuPrimitive.RadioItem
        ref={ref}
        className={finalClasses}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Circle className="h-2 w-2 fill-current" />
          </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
      </DropdownMenuPrimitive.RadioItem>
    );
  }
);
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef(
  ({ className, inset, ...props }, ref) => {
    const baseClasses = "px-2 py-1.5 text-sm font-semibold";
    const insetClasses = inset ? "pl-8" : "";
    const finalClasses = className ? `${baseClasses} ${insetClasses} ${className}` : `${baseClasses} ${insetClasses}`;
    
    return (
      <DropdownMenuPrimitive.Label
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  }
);
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef(
  ({ className, ...props }, ref) => {
    const separatorClasses = "-mx-1 my-1 h-px bg-muted";
    const finalClasses = className ? `${separatorClasses} ${className}` : separatorClasses;
    
    return (
      <DropdownMenuPrimitive.Separator
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  }
);
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }) => {
  const shortcutClasses = "ml-auto text-xs tracking-widest opacity-60";
  const finalClasses = className ? `${shortcutClasses} ${className}` : shortcutClasses;
  
  return (
    <span
      className={finalClasses}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};





