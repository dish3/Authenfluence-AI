import { Shield } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="relative">
        <div className="absolute inset-0 gradient-bg rounded-lg blur-md opacity-60 group-hover:opacity-80 transition" />
        <div className="relative w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className="leading-tight">
        <div className="font-semibold tracking-tight">Authenfluence <span className="gradient-text">AI</span></div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Trust Intelligence</div>
      </div>
    </Link>
  );
}
