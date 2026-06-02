import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Bot, Activity, Sparkles, BadgeCheck, Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/Nav";
import { ScoreRing } from "@/components/ScoreRing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Authenfluence AI — We measure trust, not popularity" },
      { name: "description", content: "AI-powered digital trust intelligence for the creator economy. Evaluate whether creator influence is trustworthy, sustainable, and authentic." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-24 lg:pt-28 lg:pb-32 relative">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-muted-foreground">Live: Trust intelligence engine v2.0</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]"
              >
                AI-powered <span className="gradient-text">digital trust intelligence</span> for the creator economy
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-5 text-lg text-muted-foreground max-w-xl"
              >
                Follower count is vanity. Trust is currency. Authenfluence AI evaluates whether creator influence is trustworthy, sustainable, and authentic — scoring digital trust from 0 to 100.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Link to="/analyze">
                  <Button size="lg" className="gradient-bg border-0 text-white h-12 px-6 glow hover:opacity-95">
                    Analyze Influencer <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/compare">
                  <Button size="lg" variant="outline" className="h-12 px-6">Compare two creators</Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground"
              >
                {[
                  { Icon: BadgeCheck, t: "Gemini 1.5 Flash" },
                  { Icon: Lock, t: "Privacy-first" },
                  { Icon: Zap, t: "Real-time scoring" },
                  { Icon: ShieldCheck, t: "Fraud signal detection" },
                ].map((b) => (
                  <span key={b.t} className="inline-flex items-center gap-1.5">
                    <b.Icon className="w-3.5 h-3.5 text-primary" /> {b.t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="relative"
            >
              <div className="absolute -inset-10 gradient-bg opacity-20 blur-3xl rounded-full" />
              <div className="relative glass-strong rounded-3xl p-6 ring-glow">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live Analysis</div>
                    <div className="font-semibold mt-0.5">Tech With Priya</div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-success/15 text-success border border-success/30">Highly Trusted</span>
                </div>

                <div className="flex items-center justify-center py-2">
                  <ScoreRing score={88} size={180} />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[
                    { Icon: Activity, label: "Engagement", v: 91 },
                    { Icon: Bot, label: "Bot Activity", v: 6, inverse: true },
                    { Icon: Sparkles, label: "Comment Trust", v: 89 },
                    { Icon: ShieldCheck, label: "Audience Quality", v: 86 },
                  ].map((m) => (
                    <div key={m.label} className="glass rounded-xl p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <m.Icon className="w-3.5 h-3.5 text-primary" /> {m.label}
                      </div>
                      <div className="text-lg font-semibold mt-1 tabular-nums">{m.v}{m.inverse ? "%" : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built for brands who refuse to be fooled</h2>
          <p className="mt-3 text-muted-foreground">A complete trust intelligence layer — not just another analytics dashboard.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { Icon: ShieldCheck, t: "Digital Trust Heuristics", d: "Weighted 0–100 trust score combining audience trust quality, creator stability, and influence reliability." },
            { Icon: Bot, t: "Trust Risk Assessment", d: "Surfaces abnormal audience engagement disparities, repetitive behaviors, and publishing anomalies." },
            { Icon: Sparkles, t: "Digital Trust Assessment", d: "Investor-grade reasoning in clear language justifying the trust score based on measured metrics — not popularity." },
          ].map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-3xl p-6 hover:border-primary/30 transition"
            >
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center mb-4">
                <f.Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold">{f.t}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.d}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="text-sm text-muted-foreground italic">"We measure trust, not popularity."</div>
        </div>
      </section>
    </div>
  );
}
