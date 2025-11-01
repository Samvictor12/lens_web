import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Dot } from "lucide-react";

import { cn } from "@/lib/utils";

const InputOTP = React.forwardRef>(
  ({ className, containerClassName, ...props }, ref) => (
    
  ),
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef>(
  ({ className, ...props }, ref) => ,
);
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef(
  React.ComponentPropsWithoutRef & { index }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

  return (
    
      {char}
      {hasFakeCaret && (
        
          
        
      )}
    
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef>(
  ({ ...props }, ref) => (
    
      
    
  ),
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };





