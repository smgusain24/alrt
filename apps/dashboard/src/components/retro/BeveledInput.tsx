import { InputHTMLAttributes, forwardRef } from "react";

interface BeveledInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const BeveledInput = forwardRef<HTMLInputElement, BeveledInputProps>(
  ({ label, className = "", id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs font-bold uppercase tracking-wide text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            bevel-inset bg-white text-foreground text-sm
            px-2 py-1 font-body
            placeholder:text-muted
            focus-retro
            disabled:bg-[#c0c0c0] disabled:opacity-50
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

BeveledInput.displayName = "BeveledInput";
export default BeveledInput;
