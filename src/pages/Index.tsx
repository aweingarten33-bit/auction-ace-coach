import MastheadNav from "@/components/landing/MastheadNav";
import Hero from "@/components/landing/Hero";
import PressBar from "@/components/landing/PressBar";
import ProblemSpread from "@/components/landing/ProblemSpread";
import FeatureGrid from "@/components/landing/FeatureGrid";
import Showcase from "@/components/landing/Showcase";
import Process from "@/components/landing/Process";
import DossierWall from "@/components/landing/DossierWall";
import Manifesto from "@/components/landing/Manifesto";
import Pricing from "@/components/landing/Pricing";
import FaqFooter from "@/components/landing/FaqFooter";
import ThumbRail from "@/components/landing/ThumbRail";

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MastheadNav />
      <main>
        <Hero />
        <PressBar />
        <ProblemSpread />
        <FeatureGrid />
        <Showcase />
        <Process />
        <DossierWall />
        <Manifesto />
        <Pricing />
        <FaqFooter />
      </main>
      <ThumbRail />
    </div>
  );
}
