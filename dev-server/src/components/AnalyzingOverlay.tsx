import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Shield, Activity, Users, Bot, Sparkles, Database, Brain, TrendingUp } from "lucide-react";

const STAGES = [
  { icon: Database, text: "Fetching Live Creator Data..." },
  { icon: Users, text: "Analyzing Audience Interaction..." },
  { icon: Activity, text: "Evaluating Trust Signals..." },
  { icon: TrendingUp, text: "Computing Growth Predictions..." },
  { icon: Sparkles, text: "Running Brand Matching Engine..." },
  { icon: Brain, text: "Generating AI Campaign Intelligence..." },
  { icon: Shield, text: "Finalizing Digital Trust Assessment..." },
];

export function AnalyzingOverlay({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => {
        if (s >= STAGES.length - 1) {
          clearInterval(interval);
          setTimeout(onDone, 700);
          return s;
        }
        return s + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl"
    >
      <div className="glass-strong rounded-3xl p-10 max-w-md w-[90%] text-center ring-glow">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full gradient-bg blur-xl opacity-60 animate-pulse-ring" />
          <div className="relative w-20 h-20 rounded-full gradient-bg flex items-center justify-center glow">
            <Shield className="w-9 h-9 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-1">Authenfluence AI</h3>
        <p className="text-sm text-muted-foreground mb-6">Running trust intelligence scan</p>

        <div className="space-y-3 text-left">
          {STAGES.map((S, i) => {
            const Icon = S.icon;
            const active = i === stage;
            const done = i < stage;
            return (
              <motion.div
                key={i}
                animate={{ opacity: done || active ? 1 : 0.35 }}
                className="flex items-center gap-3 text-sm"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    done
                      ? "bg-success/15 border-success/40 text-success"
                      : active
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={active ? "text-foreground" : done ? "text-muted-foreground line-through" : ""}>
                  {S.text}
                </span>
                {active && (
                  <span className="ml-auto flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    ))}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export { AnimatePresence };
