import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const DialogSizeContext = React.createContext("default");

const getDialogOverlayClasses = (className) => {
  const baseClasses = "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
  return className ? `${baseClasses} ${className}` : baseClasses;
};

const getDialogContentClasses = (className, size = "default") => {
  const baseClasses = "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg";
  const sizeClasses = {
    default: "",
    wide: "!w-[96vw] !max-w-7xl",
  };
  const classes = `${baseClasses} ${sizeClasses[size] || ""}`;
  return className ? `${classes} ${className}` : classes;
};

const getDialogHeaderClasses = (className) => {
  const baseClasses = "flex flex-col space-y-1.5 text-center sm:text-left";
  return className ? `${baseClasses} ${className}` : baseClasses;
};

const getDialogFooterClasses = (className) => {
  const baseClasses = "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2";
  return className ? `${baseClasses} ${className}` : baseClasses;
};

const getDialogTitleClasses = (className) => {
  const baseClasses = "text-lg font-semibold leading-none tracking-tight";
  return className ? `${baseClasses} ${className}` : baseClasses;
};

const getDialogDescriptionClasses = (className) => {
  const baseClasses = "text-sm text-muted-foreground";
  return className ? `${baseClasses} ${className}` : baseClasses;
};

const Dialog = ({ size = "default", ...props }) => (
  <DialogSizeContext.Provider value={size}>
    <DialogPrimitive.Root {...props} />
  </DialogSizeContext.Provider>
);

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={getDialogOverlayClasses(className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const PORTAL_PICKER_SELECTOR = [
  ".react-select__menu",
  ".react-select__menu-portal",
  ".react-select__option",
  "[data-radix-select-content]",
  "[data-radix-popover-content]",
  "[data-radix-dropdown-menu-content]",
].join(", ");

const isPortaledPickerTarget = (target) =>
  target instanceof Element && Boolean(target.closest(PORTAL_PICKER_SELECTOR));

const DialogContent = React.forwardRef(({ className, children, onPointerDownOutside, onInteractOutside, onFocusOutside, ...props }, ref) => {
  const size = React.useContext(DialogSizeContext);

  const handlePointerDownOutside = (event) => {
    if (isPortaledPickerTarget(event.target)) {
      event.preventDefault();
      return;
    }
    onPointerDownOutside?.(event);
  };

  const handleInteractOutside = (event) => {
    if (isPortaledPickerTarget(event.target)) {
      event.preventDefault();
      return;
    }
    onInteractOutside?.(event);
  };

  const handleFocusOutside = (event) => {
    if (isPortaledPickerTarget(event.target)) {
      event.preventDefault();
      return;
    }
    onFocusOutside?.(event);
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={getDialogContentClasses(className, size)}
        {...props}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
        onFocusOutside={handleFocusOutside}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }) => (
  <div className={getDialogHeaderClasses(className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }) => (
  <div className={getDialogFooterClasses(className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={getDialogTitleClasses(className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={getDialogDescriptionClasses(className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};



