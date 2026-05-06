import CategoryPage from "@/components/CategoryPage";

export default function Coach() {
  return (
    <CategoryPage
      category="Coach"
      tagline="Ask anything. Get a call in seconds."
      tools={[
        { label: "AI Chat", description: "Free-form conversation with your draft coach.", to: "/draft?coach=open" },
        { label: "Should I bid?", description: "Yes/no call with reasoning, in real time.", to: "/draft?coach=bid" },
        { label: "Who should I nominate?", description: "Best name to throw out right now.", to: "/draft?coach=nominate" },
        { label: "What's my next move?", description: "Strategic next step based on your build + the room.", to: "/draft?coach=next" },
      ]}
    />
  );
}
