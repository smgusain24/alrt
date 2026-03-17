import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function Card({
  title,
  children,
  className = "",
  contentClassName = "",
}: CardProps) {
  return (
    <article className={`card ${className}`.trim()}>
      {title && (
        <header>
          <h3>{title}</h3>
        </header>
      )}
      <div className={contentClassName || undefined}>
        {children}
      </div>
    </article>
  );
}
