import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { scoreColor } from "@/lib/mock-data";

interface ScoreRingProps {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
}

export function ScoreRing({ score, size = 220, stroke = 14, label }: ScoreRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const count = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const offset = useTransform(count, (v) => c - (c * v) / 100);

  useEffect(() => {
    const controls = animate(count, score, { duration: 1.6, ease: "easeOut" });
    const unsub = count.on("change", (v) => setDisplay(Math.round(v)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [score, count]);

  const color = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse-ring"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset, filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold tracking-tight tabular-nums" style={{ color }}>
          {display}
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">
          {label ?? "Trust Score"}
        </div>
      </div>
    </div>
  );
}
