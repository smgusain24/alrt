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
      className={className || undefined}
      {...props}
    >
      {children}
    </a>
  );
}
