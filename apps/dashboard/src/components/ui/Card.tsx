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
    <div
      className={`bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-md ${className}`}
    >
      {title && (
        <h3 className="text-sm font-medium text-[#fafafa] px-4 pt-4">
          {title}
        </h3>
      )}
      <div className={`px-4 pb-4 ${title ? "pt-3" : "pt-4"} ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
