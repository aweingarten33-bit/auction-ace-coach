import CategoryPage from "@/components/CategoryPage";

export default function Settings() {
  return (
    <CategoryPage
      category="Settings"
      tagline="Configure once, draft for years."
      tools={[
        { label: "League Setup", description: "Budget, teams, scoring, roster slots.", to: "/setup?step=0" },
        { label: "Keepers", description: "Players already on rosters and their cost.", to: "/setup?step=1" },
        { label: "Price Estimates", description: "Your cheat sheet — players × dollars.", to: "/setup?step=1" },
        { label: "Sync Settings", description: "ESPN connection and live auto-logging.", to: "/espn" },
        { label: "Admin", description: "Site lock, user roles, dev tools.", to: "/admin" },
      ]}
    />
  );
}
