import { AnchorHTMLAttributes } from "react";

interface RetroLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export default function RetroLink({
  href,
  children,
  className = "",
  ...props
}: RetroLinkProps) {
  return (
    <a
      href={href}
      className={`text-accent underline hover:text-danger visited:text-link-visited transition-none ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
