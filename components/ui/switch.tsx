"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    { className, checked, defaultChecked, disabled, onCheckedChange, onClick, type = "button", ...props },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState<boolean>(defaultChecked ?? false);
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? Boolean(checked) : uncontrolledChecked;
    const state = isChecked ? "checked" : "unchecked";

    return (
      <button
        {...props}
        type={type}
        role="switch"
        aria-checked={isChecked}
        data-state={state}
        disabled={disabled}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || disabled) return;

          const next = !isChecked;
          if (!isControlled) setUncontrolledChecked(next);
          onCheckedChange?.(next);
        }}
        ref={ref}
      >
        <span
          data-state={state}
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
