import { ReactNode } from "react";

interface WindowCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function WindowCard({
  title,
  children,
  className = "",
  contentClassName = "",
}: WindowCardProps) {
  return (
    <div className={`bevel-outset bg-[#c0c0c0] ${className}`}>
      <div className="bg-title-bar px-3 py-1.5 flex items-center">
        <span className="font-heading text-sm text-white font-bold truncate">
          {title}
        </span>
      </div>
      <div className={`bevel-inset bg-white m-1 p-4 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
