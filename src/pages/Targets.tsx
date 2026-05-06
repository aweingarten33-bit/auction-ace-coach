import CategoryPage from "@/components/CategoryPage";

export default function Targets() {
  return (
    <CategoryPage
      category="Targets"
      tagline="The players you actually want to leave with."
      tools={[
        { label: "Watchlist", description: "Your starred guys — load instantly when nominated.", to: "/draft#watchlist" },
        { label: "Up Next", description: "The next 5 you should be ready to bid on.", to: "/draft#upnext" },
        { label: "Sleepers", description: "Late-round value picks priced under market.", to: "/draft#sleepers" },
        { label: "Tier Targets", description: "Best remaining player in each tier.", to: "/draft#tiers" },
        { label: "Player Queue", description: "Your full nomination queue.", to: "/draft#queue" },
      ]}
    />
  );
}
