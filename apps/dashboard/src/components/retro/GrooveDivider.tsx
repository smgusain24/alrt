interface GrooveDividerProps {
  className?: string;
}

export default function GrooveDivider({ className = "" }: GrooveDividerProps) {
  return <hr className={`hr-groove my-4 ${className}`} />;
}
