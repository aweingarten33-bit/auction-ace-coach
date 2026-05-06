// EditorialShell is now a thin alias over WarRoomShell so the entire app
// inherits the cinematic war-room chrome without touching every page.
import WarRoomShell from "./WarRoomShell";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  masthead?: string;
  activeCategory?: string;
}

export default function EditorialShell({ children, masthead, activeCategory }: Props) {
  return (
    <WarRoomShell
      activeCategory={activeCategory}
      title={activeCategory || masthead}
      eyebrow={masthead && masthead !== activeCategory ? masthead : undefined}
    >
      {children}
    </WarRoomShell>
  );
}
