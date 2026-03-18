interface DividerProps {
  className?: string;
}

export default function Divider({ className = "" }: DividerProps) {
  return <hr className={className || undefined} />;
}
