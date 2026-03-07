interface DividerProps {
  className?: string;
}

export default function Divider({ className = "" }: DividerProps) {
  return <hr className={`border-0 border-t border-[rgba(255,255,255,0.06)] my-4 ${className}`} />;
}
