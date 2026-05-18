import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Auction Ace</h1>
        <p className="text-base text-white/60 mb-10 leading-relaxed">
          Your auction draft war room. Budget-path planning grounded in your league's 3-year price history.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/team"
            className="block w-full rounded-xl bg-white text-black font-semibold py-3.5 text-center hover:bg-white/90 transition"
          >
            Get started
          </Link>
          <Link
            to="/auth"
            className="block w-full rounded-xl border border-white/20 text-white font-semibold py-3.5 text-center hover:bg-white/5 transition"
          >
            Connect ESPN
          </Link>
        </div>
      </div>
    </div>
  );
}
