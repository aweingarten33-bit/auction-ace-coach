export default function KeyHints() {
  return (
    <div className="funk-key-hints">
      {[
        ["←", "prev"],
        ["→", "next"],
        ["space", "pause"],
      ].map(([key, label]) => (
        <span key={key} className="funk-key-hint">
          <kbd className="funk-kbd">{key}</kbd>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
