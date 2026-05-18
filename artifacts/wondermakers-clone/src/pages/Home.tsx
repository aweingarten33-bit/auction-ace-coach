import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lenis from "lenis";
import { useTheme } from "@/hooks/use-theme";
import HeroCanvas from "@/components/canvas/HeroCanvas";
import { ExternalLink, Menu, X, ArrowDown } from "lucide-react";

import build1 from "@/assets/images/build-1.png";
import build2 from "@/assets/images/build-2.png";
import build3 from "@/assets/images/build-3.png";
import build4 from "@/assets/images/build-4.png";
import edge1 from "@/assets/images/edge-1.png";
import edge2 from "@/assets/images/edge-2.png";
import edge3 from "@/assets/images/edge-3.png";
import edge4 from "@/assets/images/edge-4.png";

const SparkleStar = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="24" height="24">
    <path d="M12 0C12 0 12 10 24 12C24 12 14 12 12 24C12 24 12 14 0 12C0 12 10 12 12 0Z" />
  </svg>
);

const Football = ({ className }: { className?: string }) => (
  <img src="/football.jpeg" alt="" className={className} />
);

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative w-full min-h-screen">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <Football className="w-20 h-auto" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {(
        <>
          <motion.nav
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 h-14 z-40 px-6 flex items-center justify-between mix-blend-difference text-white dark:text-white"
          >
            <div className="flex items-center gap-2">
              <SparkleStar className="w-5 h-5" />
              <span className="font-bold text-sm tracking-wide hidden md:block uppercase">WONDER MAKERS</span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#" className="hover:opacity-70 transition-opacity">Home</a>
              <a href="#work" className="hover:opacity-70 transition-opacity">Work</a>
              <a href="#services" className="hover:opacity-70 transition-opacity">Services</a>
              <a href="#about" className="hover:opacity-70 transition-opacity">About</a>
              <a href="#contact" className="hover:opacity-70 transition-opacity">Contact</a>
              <a href="#" className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                Wonder Games <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="w-12 h-6 rounded-full bg-white/20 relative flex items-center px-1 border border-white/20"
                aria-label="Toggle theme"
              >
                <motion.div
                  className="w-4 h-4 rounded-full bg-white"
                  animate={{ x: theme === "light" ? 0 : 22 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              
              <button 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </motion.nav>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed inset-0 z-50 bg-background flex flex-col p-6"
              >
                <div className="flex justify-end">
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="w-8 h-8" />
                  </button>
                </div>
                <div className="flex flex-col gap-6 mt-12 text-3xl font-bold">
                  <a href="#" onClick={() => setMobileMenuOpen(false)}>Home</a>
                  <a href="#work" onClick={() => setMobileMenuOpen(false)}>Work</a>
                  <a href="#services" onClick={() => setMobileMenuOpen(false)}>Services</a>
                  <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
                  <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <HeroCanvas />

          <main className="relative z-10">
            {/* HERO */}
            <section className="h-screen w-full flex flex-col justify-end items-center px-6 pb-12 pt-32">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
                onClick={scrollToAbout}
                className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-accent-foreground hover:scale-110 transition-transform"
              >
                <ArrowDown className="w-6 h-6" />
              </motion.button>
            </section>

            <div className="bg-background relative">
              {/* ABOUT */}
              <section id="about" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { num: "6+", label: "Years in the industry" },
                    { num: "120+", label: "Projects delivered" },
                    { num: "50+", label: "Happy clients" }
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className="bg-card border border-border rounded-2xl p-8 flex flex-col justify-end h-[200px]"
                    >
                      <div>
                        <div className="text-5xl font-bold mb-2">{stat.num}</div>
                        <div className="text-muted-foreground font-medium">{stat.label}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* WHAT WE BUILD */}
              <section id="work" className="py-24 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-16">
                <div className="lg:w-1/3">
                  <div className="sticky top-24">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">What we build</h2>
                    <p className="text-muted-foreground text-lg">
                      We partner with ambitious companies to deliver digital products that look incredible and perform flawlessly.
                    </p>
                  </div>
                </div>
                
                <div className="lg:w-2/3 flex flex-col relative pb-32">
                  {[
                    { title: "Websites & Digital Experiences", num: "01", img: build1, tags: ["Marketing Sites", "Landing Pages", "WebGL"] },
                    { title: "Apps, Platforms & Real-Time Systems", num: "02", img: build2, tags: ["SaaS", "Dashboards", "Internal Tools"] },
                    { title: "E-commerce & Product Storytelling", num: "03", img: build3, tags: ["Shopify", "Custom Commerce", "3D Product"] },
                    { title: "Web3 & On-Chain Platforms", num: "04", img: build4, tags: ["DApps", "Marketplaces", "Smart Contracts"] }
                  ].map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                      className="sticky flex flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-black text-white"
                      style={{ 
                        top: `${100 + i * 20}px`,
                        height: 'max(60vh, 500px)',
                        marginBottom: '40px'
                      }}
                    >
                      <div className="absolute inset-0 z-0">
                        <img src={card.img} alt={card.title} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
                      </div>
                      
                      <div className="relative z-10 flex justify-between p-8">
                        <h3 className="text-2xl md:text-3xl font-bold max-w-[70%]">{card.title}</h3>
                        <span className="text-4xl font-bold opacity-50">{card.num}</span>
                      </div>
                      
                      <div className="relative z-10 p-8 flex gap-3 flex-wrap">
                        {card.tags.map(tag => (
                          <span key={tag} className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* SERVICES */}
              <section id="services" className="py-24 px-6 max-w-7xl mx-auto border-t border-border">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  <div className="sticky top-24 self-start">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Our Services</h2>
                    <p className="text-muted-foreground text-lg mb-8 max-w-md">
                      End-to-end capabilities under one roof. We combine strategic thinking with world-class execution.
                    </p>
                    <button className="flex items-center gap-4 bg-primary text-primary-foreground px-6 py-4 rounded-full font-bold hover:opacity-90 transition-opacity">
                      Explore Services
                      <span className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                        <ArrowDown className="-rotate-90 w-4 h-4" />
                      </span>
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {[
                      "Product Strategy", 
                      "UX/UI Design", 
                      "Frontend Engineering", 
                      "Backend & Infrastructure", 
                      "E-commerce Development", 
                      "Web3 & On-Chain Engineering"
                    ].map((service, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="bg-card border border-border rounded-2xl p-6 flex items-center gap-6"
                      >
                        <span className="text-muted-foreground font-mono">0{i + 1}</span>
                        <h3 className="text-xl font-bold">{service}</h3>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ENGAGEMENT MODELS */}
              <section className="py-24 px-6 max-w-7xl mx-auto border-t border-border">
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-bold">Engagement models</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-card border border-border rounded-3xl p-10 flex flex-col gap-8"
                  >
                    <h3 className="text-3xl font-bold">End-to-end product delivery</h3>
                    <ul className="flex flex-col gap-4 text-muted-foreground text-lg">
                      <li className="flex gap-3">
                        <SparkleStar className="w-6 h-6 shrink-0 text-accent" /> Senior cross-functional team
                      </li>
                      <li className="flex gap-3">
                        <SparkleStar className="w-6 h-6 shrink-0 text-accent" /> Discovery to delivery ownership
                      </li>
                      <li className="flex gap-3">
                        <SparkleStar className="w-6 h-6 shrink-0 text-accent" /> Autonomous process management
                      </li>
                      <li className="flex gap-3">
                        <SparkleStar className="w-6 h-6 shrink-0 text-accent" /> Flexible and adaptive delivery
                      </li>
                    </ul>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="bg-accent text-accent-foreground rounded-3xl p-10 flex flex-col gap-8"
                  >
                    <h3 className="text-3xl font-bold">Embedded Expertise</h3>
                    <ul className="flex flex-col gap-4 text-lg font-medium opacity-90">
                      <li className="flex gap-3">
                        <SparkleStar className="w-6 h-6 shrink-0" /> Direct integration of senior experts
                      </li>
                      <li className="flex gap-3">
                        <SparkleStar className="w-6 h-6 shrink-0" /> Matches your internal workflow
                      </li>
                      <li className="flex gap-3">
                        <SparkleStar className="w-6 h-6 shrink-0" /> Fills specific expertise gaps
                      </li>
                      <li className="flex gap-3">
                        <SparkleStar className="w-6 h-6 shrink-0" /> Flexible and scalable team growth
                      </li>
                    </ul>
                  </motion.div>
                </div>
                
                <div className="flex justify-center">
                  <button className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform">
                    Contact us
                  </button>
                </div>
              </section>

              {/* OUR EDGE */}
              <section className="py-24 overflow-hidden border-t border-border">
                <div className="max-w-7xl mx-auto px-6 mb-12">
                  <h2 className="text-[12vw] leading-none font-bold tracking-tighter text-muted/50 uppercase">
                    OUR EDGE
                  </h2>
                </div>
                
                <div className="flex gap-6 px-6 overflow-x-auto pb-12 snap-x snap-mandatory">
                  {[
                    { title: "Design as strategic value", desc: "Design is more than aesthetics. It sharpens positioning, increases perceived value, and drives measurable results.", img: edge1 },
                    { title: "Fluid Scaling UI", desc: "Beyond responsive design. Our Fluid Scaling Systems keep interfaces consistent across every screen size while maintaining performance and clean code.", img: edge2 },
                    { title: "Business-driven engineering", desc: "We start with your business goals. From rapid MVP launches to long-term scalability, we choose technologies that balance speed, cost, and future growth.", img: edge3 },
                    { title: "Purposeful Immersion", desc: "We use 3D, motion, and interaction design to create meaningful engagement and tell your story – without compromising usability or performance.", img: edge4 },
                  ].map((edge, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="min-w-[85vw] md:min-w-[400px] h-[600px] relative rounded-3xl overflow-hidden snap-center shrink-0 border border-border/50 group"
                    >
                      <img src={edge.img} alt={edge.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-8 text-white">
                        <h3 className="text-2xl font-bold mb-4">{edge.title}</h3>
                        <p className="opacity-80 leading-relaxed">{edge.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* MARQUEE */}
              <section className="py-24 border-y border-border bg-muted/30 overflow-hidden flex flex-col justify-center">
                <div className="flex whitespace-nowrap">
                  <motion.div 
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ ease: "linear", duration: 30, repeat: Infinity }}
                    className="flex gap-4 px-2"
                  >
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                        {["Fintech", "Healthcare", "E-commerce", "SaaS", "Real Estate", "Blockchain", "Creative Agency", "Hospitality", "EdTech", "Legal"].map((sector) => (
                          <div key={sector} className="px-8 py-4 rounded-full bg-card border border-border text-xl font-bold shadow-sm whitespace-nowrap">
                            {sector}
                          </div>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                </div>
              </section>

              {/* FOOTER */}
              <footer id="contact" className="bg-[#0a0a0a] text-white pt-32 pb-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-12">
                  <h2 className="text-5xl md:text-7xl font-bold max-w-4xl leading-tight">
                    Let's build something <span className="text-accent italic font-serif">extraordinary.</span>
                  </h2>
                  
                  <button className="bg-white text-black px-10 py-5 rounded-full font-bold text-xl hover:scale-105 transition-transform">
                    Let's talk
                  </button>

                  <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 pt-12 border-t border-white/10 text-white/60">
                    <div className="text-left">
                      <p className="font-bold text-white mb-4">Wonder Makers</p>
                      <p>Award-winning digital product studio.</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-center gap-8">
                      <a href="#" className="hover:text-accent transition-colors">LinkedIn</a>
                      <a href="#" className="hover:text-accent transition-colors">Twitter / X</a>
                      <a href="#" className="hover:text-accent transition-colors">Dribbble</a>
                      <a href="#" className="hover:text-accent transition-colors">Behance</a>
                    </div>

                    <div className="md:text-right">
                      <p>hello@wondermakers.digital</p>
                      <p className="mt-4 text-sm">© 2026 Wonder Makers. All rights reserved.</p>
                    </div>
                  </div>
                </div>
              </footer>

            </div>
          </main>
        </>
      )}
    </div>
  );
}
