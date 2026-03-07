import { AnchorHTMLAttributes } from "react";

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export default function Link({
  href,
  children,
  className = "",
  ...props
}: LinkProps) {
  return (
    <a
      href={href}
      className={`text-[#3b82f6] hover:text-[#3b82f6]/80 no-underline hover:underline transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
