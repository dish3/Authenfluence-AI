import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Youtube, Instagram, Twitter, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar({ onAnalyze, defaultValue = "" }: { onAnalyze: (u: string) => void; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [platform, setPlatform] = useState<"youtube" | "instagram" | "twitter">("youtube");

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-5 sm:p-6 ring-glow">
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { id: "youtube", Icon: Youtube, label: "YouTube", active: true },
          { id: "instagram", Icon: Instagram, label: "Instagram", active: false },
          { id: "twitter", Icon: Twitter, label: "Twitter / X", active: false },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => p.active && setPlatform(p.id as "youtube")}
            disabled={!p.active}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ${
              platform === p.id
                ? "border-primary bg-primary/15 text-primary"
                : p.active
                  ? "border-border hover:border-primary/40"
                  : "border-border opacity-50 cursor-not-allowed"
            }`}
          >
            <p.Icon className="w-3.5 h-3.5" />
            {p.label}
            {!p.active && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Soon</span>}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (value.trim()) onAnalyze(value.trim()); }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter YouTube channel username (try: techwithpriya, foodierohan, cryptokingz)"
            className="pl-10 h-12 bg-background/60 border-border focus-visible:ring-primary"
          />
        </div>
        <Button type="submit" size="lg" className="gradient-bg border-0 text-white h-12 px-6">
          <Sparkles className="w-4 h-4 mr-2" /> Analyze
        </Button>
      </form>
    </motion.div>
  );
}
