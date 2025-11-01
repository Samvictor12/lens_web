import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef(
  ({ className, ...props }, ref) => {
    const viewportClasses = "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]";
    const finalClasses = className ? `${viewportClasses} ${className}` : viewportClasses;
    
    return (
      <ToastPrimitives.Viewport
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  }
);
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const getToastClasses = (variant = "default") => {
  const baseClasses = "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full";
  
  const variantClasses = {
    default: "border bg-background text-foreground",
    destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
  };
  
  return `${baseClasses} ${variantClasses[variant] || variantClasses.default}`;
};

const Toast = React.forwardRef(
  ({ className, variant = "default", ...props }, ref) => {
    const toastClasses = getToastClasses(variant);
    const finalClasses = className ? `${toastClasses} ${className}` : toastClasses;
    
    return (
      <ToastPrimitives.Root
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  }
);
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef(
  ({ className, ...props }, ref) => {
    const actionClasses = "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive";
    const finalClasses = className ? `${actionClasses} ${className}` : actionClasses;
    
    return (
      <ToastPrimitives.Action
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  }
);
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef(
  ({ className, ...props }, ref) => {
    const closeClasses = "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600";
    const finalClasses = className ? `${closeClasses} ${className}` : closeClasses;
    
    return (
      <ToastPrimitives.Close
        ref={ref}
        className={finalClasses}
        toast-close=""
        {...props}
      >
        <X className="h-4 w-4" />
      </ToastPrimitives.Close>
    );
  }
);
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(
  ({ className, ...props }, ref) => {
    const titleClasses = "text-sm font-semibold";
    const finalClasses = className ? `${titleClasses} ${className}` : titleClasses;
    
    return (
      <ToastPrimitives.Title
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  }
);
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(
  ({ className, ...props }, ref) => {
    const descClasses = "text-sm opacity-90";
    const finalClasses = className ? `${descClasses} ${className}` : descClasses;
    
    return (
      <ToastPrimitives.Description
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  }
);
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};





