import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = "", id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-[#a1a1aa]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            bg-[#111113] text-[#fafafa] text-sm
            border border-[rgba(255,255,255,0.12)]
            rounded-[6px] px-3 py-2
            placeholder:text-[#71717a]
            focus:outline-none focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6]
            disabled:opacity-50
            transition-colors duration-150
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
