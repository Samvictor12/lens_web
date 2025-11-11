import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Reusable Delete Confirmation Dialog Component
 * 
 * Usage:
 * <DeleteConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleDelete}
 *   title="Delete Customer?"
 *   description="Are you sure you want to delete this customer? This action cannot be undone."
 *   isDeleting={isDeleting}
 * />
 */

const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone. This will permanently delete the item.",
  confirmText = "Delete",
  cancelText = "Cancel",
  isDeleting = false,
  children,
}) => {
  const handleConfirm = async (e) => {
    e.preventDefault();
    await onConfirm();
  };

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children && (
        <AlertDialogPrimitive.Trigger asChild>
          {children}
        </AlertDialogPrimitive.Trigger>
      )}
      
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-full max-w-lg gap-4 rounded-lg border bg-background p-6 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogPrimitive.Title className="text-lg font-semibold">
                {title}
              </AlertDialogPrimitive.Title>
            </div>
            <AlertDialogPrimitive.Description className="text-sm text-muted-foreground pl-[52px]">
              {description}
            </AlertDialogPrimitive.Description>
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
            <AlertDialogPrimitive.Cancel asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
              >
                {cancelText}
              </Button>
            </AlertDialogPrimitive.Cancel>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  {confirmText}
                </>
              )}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
};

export { DeleteConfirmDialog };
