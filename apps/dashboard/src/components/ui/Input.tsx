import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = "", id, ...props }, ref) => {
    if (label) {
      return (
        <label data-field className={className || undefined}>
          {label}
          <input ref={ref} id={id} {...props} />
        </label>
      );
    }

    return (
      <input
        ref={ref}
        id={id}
        className={className || undefined}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
export default Input;
