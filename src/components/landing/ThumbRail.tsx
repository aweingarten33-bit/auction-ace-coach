export default function ThumbRail() {
  return (
    <div className="thumb-rail md:hidden flex items-center gap-3">
      <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-bone">
        <span className="led" aria-hidden /> 14 · BIDS / NIGHT
      </span>
      <button className="ml-auto h-12 px-5 font-mono text-[11px] tracking-[0.18em] bg-bone text-void border-2 border-bone hover:bg-void hover:text-bone active:translate-x-[2px] active:translate-y-[2px]">
        ENTER · THE · ROOM
      </button>
    </div>
  );
}
