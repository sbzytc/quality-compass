import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Switch — RTL-safe by design.
 * Track: h-6 w-11 with border-2 → inner box 20px × 40px.
 * Thumb: h-5 w-5 (20×20). 20px slack distributed via flex justify.
 * No translate math, no overflow. Works identically in LTR and RTL.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center overflow-hidden rounded-full border-2 border-transparent transition-colors",
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      "data-[state=checked]:justify-end data-[state=unchecked]:justify-start",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-[margin] duration-200",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
