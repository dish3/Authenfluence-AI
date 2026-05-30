import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 backdrop-blur-xl bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <Link to="/analyze" className="hover:text-foreground transition">Analyze</Link>
          <Link to="/compare" className="hover:text-foreground transition">Compare</Link>
          <Link to="/history" className="hover:text-foreground transition">History</Link>
          <Link to="/test" className="hover:text-foreground transition">Test Suite</Link>
        </nav>
        <Link to="/analyze">
          <Button size="sm" className="gradient-bg border-0 text-white shadow-[0_0_24px_-4px_oklch(0.62_0.21_265/0.6)] hover:opacity-95">
            Analyze Influencer
          </Button>
        </Link>
      </div>
    </header>
  );
}
