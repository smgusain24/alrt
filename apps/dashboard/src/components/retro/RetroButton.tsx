import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "default" | "accent" | "danger" | "success";

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantStyles: Record<Variant, string> = {
  default:
    "bg-[#c0c0c0] text-black bevel-outset hover:bg-[#d0d0d0] active:bevel-pressed",
  accent:
    "bg-accent text-white bevel-accent hover:bg-[#2222ff] active:bevel-pressed",
  danger:
    "bg-danger text-white bevel-danger hover:bg-[#ff2222] active:bevel-pressed",
  success:
    "bg-success text-white bevel-success hover:bg-[#00cc00] active:bevel-pressed",
};

const RetroButton = forwardRef<HTMLButtonElement, RetroButtonProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          px-4 py-2 font-heading text-sm uppercase tracking-wide font-bold
          transition-none cursor-pointer
          focus-retro
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

RetroButton.displayName = "RetroButton";
export default RetroButton;
