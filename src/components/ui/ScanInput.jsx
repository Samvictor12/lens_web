import * as React from "react";
import { ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * ScanInput
 *
 * Thin wrapper around the existing `Input` component intended for
 * keystroke-wedge barcode/QR scanners (handheld/USB scanners that type
 * the scanned value followed by Enter into the focused input).
 *
 * Uncontrolled/stateless: on Enter it calls `onScan(value)` with the
 * trimmed input value and clears itself. Sits alongside the existing
 * manual search box rather than replacing it.
 */
const ScanInput = React.forwardRef(
  ({ className, onScan, placeholder = "Scan order…", ...props }, ref) => {
    const innerRef = React.useRef(null);

    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const input = innerRef.current;
        const value = input?.value?.trim();
        if (value) {
          onScan?.(value);
        }
        if (input) {
          input.value = "";
        }
      }
      props.onKeyDown?.(e);
    };

    return (
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          {...props}
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          className={className ? `pl-9 ${className}` : "pl-9"}
        />
      </div>
    );
  },
);
ScanInput.displayName = "ScanInput";

export { ScanInput };
