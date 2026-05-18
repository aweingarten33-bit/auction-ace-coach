interface Props {
  children: string;
  className?: string;
}

export default function NorrisText({ children, className = "" }: Props) {
  return (
    <span className={`norris-link ${className}`}>
      {children.split("").map((char, i) => (
        <span
          key={i}
          data-char={char === " " ? " " : char}
          style={{ "--index": i } as React.CSSProperties}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}
