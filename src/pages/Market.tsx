import CategoryPage from "@/components/CategoryPage";

export default function Market() {
  return (
    <CategoryPage
      category="Market"
      tagline="What the room is doing right now."
      tools={[
        { label: "Recent Picks", description: "Live draft log — last 10 picks with prices.", to: "/draft#log" },
        { label: "Position Runs", description: "Detect a run before it ends.", to: "/draft#heat" },
        { label: "Market Heat", description: "Which positions are over- and under-paying vs. par.", to: "/draft#heat" },
        { label: "Opponent Budgets", description: "Who has the firepower to bid you up.", to: "/draft#opponents" },
        { label: "Spend Trends", description: "Pace of the room vs. expected curve.", to: "/draft#heat" },
      ]}
    />
  );
}
