import CategoryPage from "@/components/CategoryPage";

export default function Strategy() {
  return (
    <CategoryPage
      category="Strategy"
      tagline="The blueprint — before the bidding heats up."
      tools={[
        { label: "Draft Plan", description: "Your written attack plan, generated from setup + price sheet.", to: "/draft#plan" },
        { label: "Team Build", description: "Live roster, slots filled, gaps remaining.", to: "/draft#roster" },
        { label: "Position Needs", description: "Where you're thin and where you're flush.", to: "/draft#roster" },
        { label: "Tier Analysis", description: "Tier breaks and the cliff before each one.", to: "/draft#tiers" },
        { label: "Nomination Strategy", description: "Who to call out to drain enemies vs. land your guys.", to: "/draft#nominate" },
      ]}
    />
  );
}
