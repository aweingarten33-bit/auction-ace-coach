import wuFootball from "@/assets/logo-wu-football.jpeg";
import wuGlow from "@/assets/logo-wu-glow.png";
import superFootball from "@/assets/logo-super-football.png";

const logos = [
  { src: wuFootball, name: "Wu-Tang Football", id: "wu-football" },
  { src: wuGlow, name: "Wu Glow Ball", id: "wu-glow" },
  { src: superFootball, name: "Super Football", id: "super-football" },
];

export default function LogoPicker() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Pick Your Logo</h1>
        <p className="text-muted-foreground mb-8">
          Tap one to set as the hamburger menu icon.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {logos.map((logo) => (
            <button
              key={logo.id}
              className="group relative rounded-2xl overflow-hidden bg-black border border-border hover:border-primary transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
            >
              <div className="aspect-square flex items-center justify-center p-4">
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,200,0,0.4)] group-hover:drop-shadow-[0_0_50px_rgba(255,200,0,0.7)] transition-all"
                />
              </div>
              <div className="p-4 bg-gradient-to-t from-black to-transparent">
                <p className="text-center font-semibold text-foreground">{logo.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
