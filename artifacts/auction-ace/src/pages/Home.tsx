import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Target, TrendingUp, Cpu, Shield, Zap } from "lucide-react";

const BASE = import.meta.env.BASE_URL;
const HERO_VIDEO = `${BASE}hero-video.mp4`;
const FOOTBALL_IMG = `${BASE}football.jpeg`;

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate first paint loader
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <motion.img 
          src={FOOTBALL_IMG} 
          alt="Loading..."
          className="w-24 h-24 object-cover rounded-full mix-blend-screen opacity-50 grayscale"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      <div className="grain-overlay" />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <div className="font-serif text-2xl tracking-widest uppercase">
          ACE<span className="text-accent">_</span>
        </div>
        <div className="hidden md:flex gap-8 text-xs font-mono tracking-widest text-muted-foreground uppercase">
          <a href="#vision" className="hover:text-foreground transition-colors">Vision</a>
          <a href="#intel" className="hover:text-foreground transition-colors">Intel</a>
          <a href="#terminal" className="hover:text-foreground transition-colors">Terminal</a>
        </div>
        <button className="text-xs font-mono tracking-widest border border-foreground/20 px-6 py-2 hover:bg-foreground hover:text-background transition-colors uppercase">
          Request Access
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-background">
        <style>{`
          @keyframes heroDriftAA  { 0%{transform:translate(-50%,-50%) scale(1.2);} 50%{transform:translate(-52%,-48%) scale(1.35);} 100%{transform:translate(-50%,-50%) scale(1.2);} }
          @keyframes heroKenBurnsAA { 0%{transform:translate(-50%,-50%) scale(1);} 50%{transform:translate(-51%,-49%) scale(1.08);} 100%{transform:translate(-50%,-50%) scale(1);} }
          .hero-drift-aa { animation: heroDriftAA 40s ease-in-out infinite; }
          .hero-kb-aa    { animation: heroKenBurnsAA 30s ease-in-out infinite; }
        `}</style>

        {/* Blurred backdrop layer */}
        <video
          autoPlay loop muted playsInline aria-hidden
          className="hero-drift-aa"
          style={{
            position: "absolute", top: "50%", left: "50%",
            width: "100%", height: "100%", objectFit: "cover",
            filter: "blur(40px) saturate(1.2)",
            opacity: 0.85, zIndex: 0,
          }}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>

        {/* Clear center layer */}
        <video
          autoPlay loop muted playsInline
          className="hero-kb-aa"
          style={{
            position: "absolute", top: "50%", left: "50%",
            width: "100%", height: "100%", objectFit: "contain",
            opacity: 0.85, zIndex: 1,
          }}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>

        {/* Vignette */}
        <div
          aria-hidden
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.75) 100%)",
          }}
        />
        {/* Edge fade to background */}
        <div
          aria-hidden
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 14%, transparent 78%, hsl(var(--background)) 100%)",
          }}
        />

        <div className="relative z-30 flex flex-col items-center text-center mt-32">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-serif text-6xl md:text-8xl lg:text-9xl uppercase tracking-tighter"
          >
            Draft <br />
            <span className="text-edge-outline">Differently</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-8 font-mono text-xs md:text-sm text-muted-foreground uppercase tracking-widest max-w-md"
          >
            The ultimate sidecar for serious ESPN auction leagues. Live sync. Dynamic pricing. Unfair advantage.
          </motion.p>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="vision" className="py-32 px-8 md:px-24 border-t border-white/5 relative">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-mono text-accent text-xs tracking-widest uppercase mb-8">The Vision</h2>
          <p className="font-serif text-3xl md:text-5xl leading-tight">
            We don't do mock drafts. We build Bloomberg Terminals for the draft room. Real-time intel recalculates on every bid, feeding you the precise mathematical value of the next player.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section id="intel" className="py-32 px-8 md:px-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5">
          <div className="bg-background p-12 hover:bg-zinc-900/50 transition-colors group">
            <Target className="w-8 h-8 text-accent mb-8 group-hover:scale-110 transition-transform" />
            <h3 className="font-serif text-2xl mb-4">Live Sync</h3>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed">
              Connects directly to your ESPN draft room. Every nomination, bid, and roster move reflects instantly.
            </p>
          </div>
          <div className="bg-background p-12 hover:bg-zinc-900/50 transition-colors group">
            <TrendingUp className="w-8 h-8 text-accent mb-8 group-hover:scale-110 transition-transform" />
            <h3 className="font-serif text-2xl mb-4">Dynamic Valuations</h3>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed">
              As cash leaves the room, the remaining player values recalculate. Never overpay when liquidity dries up.
            </p>
          </div>
          <div className="bg-background p-12 hover:bg-zinc-900/50 transition-colors group">
            <Cpu className="w-8 h-8 text-accent mb-8 group-hover:scale-110 transition-transform" />
            <h3 className="font-serif text-2xl mb-4">AI Coach</h3>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed">
              Real-time advice whispering in your ear. "Bid $42 on Jefferson. Your Hero RB build requires a WR1 now."
            </p>
          </div>
          <div className="bg-background p-12 hover:bg-zinc-900/50 transition-colors group">
            <Shield className="w-8 h-8 text-accent mb-8 group-hover:scale-110 transition-transform" />
            <h3 className="font-serif text-2xl mb-4">Budget Defense</h3>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed">
              Visualizes positional spend. Prevent leaving the draft with $30 because you were too conservative.
            </p>
          </div>
          <div className="bg-background p-12 hover:bg-zinc-900/50 transition-colors group">
            <Zap className="w-8 h-8 text-accent mb-8 group-hover:scale-110 transition-transform" />
            <h3 className="font-serif text-2xl mb-4">Strategy Presets</h3>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed">
              Load your intent: Zero RB, Elite QB, Stars & Studs. The algorithm adjusts valuations to fit the architecture.
            </p>
          </div>
          <div className="bg-background p-12 hover:bg-zinc-900/50 transition-colors flex items-center justify-center">
             <button className="group flex items-center gap-4 font-mono text-sm tracking-widest uppercase hover:text-accent transition-colors">
               Explore Core <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
             </button>
          </div>
        </div>
      </section>

      {/* Terminal Preview (Mockup) */}
      <section id="terminal" className="py-32 px-8 md:px-24 overflow-hidden relative">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-between items-end">
            <h2 className="font-serif text-4xl md:text-5xl">The Interface</h2>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest hidden md:block">Real-time data feed</p>
          </div>
          
          <div className="border border-white/10 bg-black p-4 md:p-8 font-mono text-xs shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Column: Player on Block */}
              <div className="col-span-1 lg:col-span-2 border border-white/5 p-6 bg-zinc-950/50">
                <div className="text-muted-foreground mb-4 uppercase tracking-widest flex justify-between">
                  <span>Current Nomination</span>
                  <span className="text-accent animate-pulse">● Live</span>
                </div>
                <h3 className="text-4xl font-serif mb-2">J. Jefferson</h3>
                <div className="flex gap-4 text-muted-foreground mb-8">
                  <span>WR</span>
                  <span>MIN</span>
                  <span>Bye: 6</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                  <div>
                    <div className="text-muted-foreground mb-1 uppercase">True Value</div>
                    <div className="text-3xl text-white">$68</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 uppercase">Current Bid</div>
                    <div className="text-3xl text-accent">$54</div>
                  </div>
                </div>

                <div className="mt-8 p-4 border border-accent/20 bg-accent/5 text-accent flex gap-4 items-start">
                  <Cpu className="w-5 h-5 shrink-0" />
                  <p className="leading-relaxed">Coach: You have $142 remaining. Your strategy allows up to $72 for an elite WR1. Continue bidding. Do not let him pass under $65.</p>
                </div>
              </div>

              {/* Right Column: Board */}
              <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
                <div className="text-muted-foreground uppercase tracking-widest text-[10px] mb-2">Top Available (Adj. Value)</div>
                {[
                  { name: "C. McCaffrey", pos: "RB", val: "$64", adj: "$69", trend: "up" },
                  { name: "T. Hill", pos: "WR", val: "$62", adj: "$65", trend: "up" },
                  { name: "B. Robinson", pos: "RB", val: "$58", adj: "$58", trend: "flat" },
                  { name: "C. Lamb", pos: "WR", val: "$55", adj: "$52", trend: "down" },
                  { name: "A. St. Brown", pos: "WR", val: "$54", adj: "$54", trend: "flat" }
                ].map((p, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2 hover:bg-white/5 p-2 transition-colors cursor-crosshair">
                    <div className="flex gap-4 w-1/2">
                      <span className="text-muted-foreground w-6">{p.pos}</span>
                      <span className="text-white">{p.name}</span>
                    </div>
                    <div className="flex gap-8 text-right">
                      <span className="text-muted-foreground line-through">{p.val}</span>
                      <span className={p.trend === 'up' ? 'text-accent' : p.trend === 'down' ? 'text-destructive' : 'text-white'}>
                        {p.adj}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Texture Detail */}
      <section className="h-64 relative overflow-hidden border-t border-white/5 border-b">
         <img src={FOOTBALL_IMG} alt="Texture" className="w-full h-full object-cover opacity-10 grayscale hover:grayscale-0 hover:opacity-30 transition-all duration-1000" />
         <div className="absolute inset-0 flex items-center justify-center mix-blend-difference">
           <span className="font-serif text-8xl md:text-9xl uppercase tracking-tighter text-white opacity-20">Obsession</span>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-8 flex flex-col items-center justify-center text-center">
        <h2 className="font-serif text-4xl md:text-6xl mb-8">Enter the Room.</h2>
        <p className="font-mono text-sm text-muted-foreground mb-12 max-w-md uppercase tracking-widest leading-relaxed">
          Membership is strictly limited to preserve the integrity of the data engine.
        </p>
        <button className="font-mono text-sm tracking-widest bg-white text-black px-12 py-4 hover:bg-accent hover:text-black transition-colors uppercase font-bold group flex items-center gap-4">
          Apply for 2025 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 border-t border-white/5 flex justify-between items-center font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
        <div>© 2025 Auction Ace Coach</div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-accent transition-colors">Twitter</a>
          <a href="#" className="hover:text-accent transition-colors">Manifesto</a>
        </div>
      </footer>
    </div>
  );
}
