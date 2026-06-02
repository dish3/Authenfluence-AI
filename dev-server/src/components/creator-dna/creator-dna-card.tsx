import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  DownloadCloud,
  FileText,
  Globe,
  MessageSquare,
  PlayCircle,
  Share2,
  Smile,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDNAMetrics } from "./dna-card-generator";
import { toast } from "sonner";
import "./dna-export.css";

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function BarcodeSVG({ seed, lime = false, size = "normal" }: { seed?: string; lime?: boolean; size?: "normal" | "large" }) {
  const bits = hashString(seed || "0").toString(2).padStart(72, "0");
  const height = size === "large" ? 80 : 50;

  return (
    <svg
      aria-hidden="true"
      className={size === "large" ? "h-20 w-full" : "h-12 w-full"}
      viewBox={`0 0 112 ${size === "large" ? 86 : 56}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from(bits).map((b, i) => (
        <rect
          key={i}
          x={i * 1.55}
          y={3}
          width={b === "1" ? 1.28 : 0.48}
          height={height}
          rx={0.16}
          fill={b === "1" ? (lime ? "#B8F13B" : "#B66BFF") : lime ? "#D7FF64" : "#7C3AED"}
          opacity={b === "1" ? 0.95 : 0.62}
        />
      ))}
    </svg>
  );
}

function TicketTitle({ compact = false, size = "normal" }: { compact?: boolean; size?: "normal" | "large" }) {
  if (size === "large") {
    return (
      <div className={compact ? "text-[52px] font-black leading-[0.78]" : "text-[72px] font-black leading-[0.78]"}>
        <div className="bg-gradient-to-b from-[#B66BFF] to-[#7B2FFF] bg-clip-text text-transparent">
          DIGITAL
        </div>
        <div className="bg-gradient-to-b from-[#D7FF47] to-[#97D929] bg-clip-text text-transparent">
          DNA
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "text-4xl font-black leading-[0.78] tracking-normal sm:text-5xl"
          : "text-5xl font-black leading-[0.78] tracking-normal sm:text-6xl xl:text-7xl"
      }
    >
      <div className="bg-gradient-to-b from-[#B66BFF] to-[#7B2FFF] bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(182,107,255,0.35)]">
        DIGITAL
      </div>
      <div className="bg-gradient-to-b from-[#D7FF47] to-[#97D929] bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(215,255,71,0.32)]">
        DNA
      </div>
    </div>
  );
}

function NeonMascot({ size = "large" }: { size?: "large" | "small" | "static" }) {
  const isStatic = size === "static";
  const glowStyle = isStatic ? "h-[220px] w-[380px] max-w-full" : (size === "large" ? "h-40 w-72 max-w-full drop-shadow-[0_0_18px_rgba(182,107,255,0.48)] animate-pulse" : "h-28 w-56 max-w-full drop-shadow-[0_0_18px_rgba(182,107,255,0.48)] animate-pulse");

  return (
    <svg
      aria-hidden="true"
      className={glowStyle}
      viewBox="0 0 360 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="#B66BFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M107 72c28-40 99-43 145-14 46 30 54 92 14 121-40 28-111 19-154-10-42-29-48-62-5-97Z" />
        <path d="M247 57c13-31 39-47 62-38 8 26-8 49-37 64" />
        <path d="M269 96h54c19 0 27 18 15 32-15 17-49 13-70 5" />
        <path d="M99 88 60 58l-9 42-39-1 27 31-20 34 43-4 11 36 29-32" />
        <path d="M123 166c-5 16-13 29-25 37M213 181c-3 13-11 22-24 29M279 155l31 22M75 72l-27-39" />
        <circle cx="190" cy="104" r="25" />
        <path d="M171 112c14 14 35 12 46-4" />
      </g>
      <path d="M42 22l9 18 18 9-18 8-9 18-8-18-18-8 18-9 8-18Z" fill="#D7FF47" />
      <path d="M318 152l8 16 16 8-16 8-8 16-8-16-16-8 16-8 8-16Z" fill="#B66BFF" />
    </svg>
  );
}

function WireGlobe({ size = "normal" }: { size?: "normal" | "static" }) {
  const isStatic = size === "static";
  const style = isStatic ? "h-[180px] w-[360px] max-w-full" : "h-28 w-56 max-w-full drop-shadow-[0_0_20px_rgba(182,107,255,0.35)] animate-pulse";

  return (
    <svg
      aria-hidden="true"
      className={style}
      viewBox="0 0 280 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="140" cy="75" rx="112" ry="52" stroke="#9B6BFF" strokeWidth="1.6" />
      <ellipse cx="140" cy="75" rx="85" ry="52" stroke="#D7FF47" strokeOpacity="0.45" strokeWidth="1" />
      <ellipse cx="140" cy="75" rx="44" ry="52" stroke="#B66BFF" strokeOpacity="0.55" strokeWidth="1" />
      <path d="M28 75h224M43 52h194M43 98h194M140 24v102" stroke="#B66BFF" strokeOpacity="0.45" />
      <path d="m140 48 11 20 21 7-21 8-11 20-10-20-21-8 21-7 10-20Z" fill="#D86BFF" />
    </svg>
  );
}

function PerfLine() {
  return (
    <div className="pointer-events-none absolute bottom-0 top-0 hidden w-10 -translate-x-1/2 flex-col items-center justify-center gap-2 lg:flex">
      <div className="h-11 w-11 rounded-full bg-[#05060a]" />
      {Array.from({ length: 26 }).map((_, i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-white/30" />
      ))}
      <div className="h-11 w-11 rounded-full bg-[#05060a]" />
    </div>
  );
}

function EdgeTeeth({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-8 flex flex-col gap-3 ${
        side === "left" ? "-left-3" : "-right-3"
      }`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="h-4 w-6 rounded-full bg-[#05060a]" />
      ))}
    </div>
  );
}

function TicketShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-xl bg-[#090c10] text-white shadow-[0_28px_80px_rgba(0,0,0,0.55)] border border-white/5 transition-all duration-500 hover:border-white/10 hover:shadow-[0_28px_90px_rgba(182,107,255,0.15)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_10%,rgba(151,47,255,0.22),transparent_40%),radial-gradient(circle_at_5%_95%,rgba(215,255,71,0.15),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute -left-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-[#05060a] border-r border-white/5" />
      <div className="absolute -right-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-[#05060a] border-l border-white/5" />
      <EdgeTeeth side="left" />
      <EdgeTeeth side="right" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function MetricBlock({
  label,
  value,
  caption,
}: {
  label: string;
  value?: string | number | null;
  caption?: string;
}) {
  return (
    <div className="min-w-0 border-r border-dashed border-[#D7FF47]/20 px-4 last:border-r-0 first:pl-0">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D7FF47]">{label}</div>
      <div className="mt-2 truncate text-2xl font-black leading-none text-[#B66BFF] drop-shadow-[0_0_10px_rgba(182,107,255,0.3)]">
        {value || "Estimated"}
      </div>
      <div className="mt-2 truncate text-[10px] text-white/50">{caption || "Estimated"}</div>
    </div>
  );
}

function ContentLine({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#B66BFF]/40 text-[#D7FF47] bg-[#B66BFF]/5">
        {icon}
      </div>
      <div>
        <div className="text-base font-black text-white">{title}</div>
        <div className="text-xs text-white/60">{detail}</div>
      </div>
    </div>
  );
}

function getSafeAvatarSrc(src?: string | null) {
  if (!src) return null;
  try {
    let safe = src.trim();
    if (safe.startsWith("//")) safe = `https:${safe}`;
    if (!/^https?:\/\//i.test(safe) && !/^data:/i.test(safe)) return null;
    if (/^data:/i.test(safe)) return safe;
    
    // Prefix with window origin client-side to ensure the relative url resolves inside the SVG context during export
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/avatar-proxy?u=${encodeURIComponent(safe)}`;
  } catch {
    return null;
  }
}

async function waitForAssets(containerId: string) {
  // Wait for fonts to load
  if (document && document.fonts) {
    await document.fonts.ready;
  }
  
  const container = document.getElementById(containerId);
  if (!container) return;

  // Wait for images to load
  const imgs = Array.from(container.getElementsByTagName("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  // Buffer wait for rendering engine paint to complete
  await new Promise((resolve) => setTimeout(resolve, 400));
}

function FallbackAvatar({ username, size = "normal", rounded = "rounded-[18px]" }: { username?: string; size?: "normal" | "large" | "story"; rounded?: string }) {
  const char = (username || "?").slice(0, 1).toUpperCase();
  const textClass = size === "large" ? "text-5xl font-black" : size === "story" ? "text-6xl font-black" : "text-3xl font-black";
  
  return (
    <div className={`flex h-full w-full items-center justify-center ${rounded} bg-gradient-to-br from-[#0c0f16] to-[#1a102f] border border-[#B66BFF]/30 text-white relative overflow-hidden`}>
      {/* Glowing neon bg accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#B66BFF]/20 to-[#D7FF47]/20 opacity-70" />
      {/* Scanline pattern for the avatar */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40" />
      <span className={`${textClass} bg-gradient-to-r from-[#B66BFF] to-[#D7FF47] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(182,107,255,0.7)] relative z-10`}>
        {char}
      </span>
    </div>
  );
}

export default function CreatorDNACard({ analysis }: any) {
  const dna = generateDNAMetrics(analysis);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const profileUrl =
    analysis?.profileUrl ||
    `https://authenfluence.ai/creator/${analysis?.username || "unknown"}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(
    profileUrl,
  )}`;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    import("qrcode")
      .then((QR: any) =>
        QR.toDataURL(profileUrl, {
          margin: 1,
          color: { dark: "#0c0f16", light: "#ffffff" },
        }),
      )
      .then((dataUrl: string) => {
        if (mounted) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        // Keep external fallback.
      });
    return () => {
      mounted = false;
    };
  }, [profileUrl]);

  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const avatarLoadingRef = React.useRef(false);
  const avatarLoadedRef = React.useRef(false);

  useEffect(() => {
    setAvatarFailed(false);
    setAvatarBase64(null);
    setAvatarLoading(false);
    setAvatarLoaded(false);
    avatarLoadingRef.current = false;
    avatarLoadedRef.current = false;

    if (!analysis?.avatarUrl) {
      setAvatarLoaded(true);
      avatarLoadedRef.current = true;
      return;
    }

    let active = true;
    const src = getSafeAvatarSrc(analysis.avatarUrl);
    if (!src) {
      setAvatarFailed(true);
      setAvatarLoaded(true);
      avatarLoadedRef.current = true;
      return;
    }

    setAvatarLoading(true);
    avatarLoadingRef.current = true;

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("Avatar proxy fetch failed");
        return res.blob();
      })
      .then((blob) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })
      .then(async (base64) => {
        if (!active) return;

        // Fully preload and wait for image decode completion in memory
        const decodeSuccess = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.src = base64;
          img.onload = () => {
            if (typeof img.decode === "function") {
              img.decode()
                .then(() => resolve(true))
                .catch((e) => {
                  console.warn("img.decode failed:", e);
                  resolve(true);
                });
            } else {
              resolve(true);
            }
          };
          img.onerror = () => {
            resolve(false);
          };
        });

        if (active) {
          if (decodeSuccess) {
            setAvatarBase64(base64);
            setAvatarLoaded(true);
            avatarLoadedRef.current = true;
          } else {
            console.error("Failed to decode avatar image");
            setAvatarFailed(true);
            setAvatarLoaded(true);
            avatarLoadedRef.current = true;
          }
          setAvatarLoading(false);
          avatarLoadingRef.current = false;
        }
      })
      .catch((err) => {
        console.error("Failed to load avatar as base64:", err);
        if (active) {
          setAvatarFailed(true);
          setAvatarLoaded(true);
          avatarLoadedRef.current = true;
          setAvatarLoading(false);
          avatarLoadingRef.current = false;
        }
      });

    return () => {
      active = false;
    };
  }, [analysis?.avatarUrl]);

  const passId = useMemo(
    () => `DNA-${hashString(analysis?.username || "unknown").toString(36).toUpperCase()}`,
    [analysis?.username],
  );
  
  const avatarSrc = avatarFailed
    ? null
    : (avatarBase64 || getSafeAvatarSrc(analysis?.avatarUrl));

  const exportAvatarSrc = avatarFailed
    ? null
    : getSafeAvatarSrc(analysis?.avatarUrl);

  const waitAvatarLoaded = async () => {
    if (!analysis?.avatarUrl) return;
    const start = Date.now();
    // Wait until decoded or 5 seconds timeout
    while (!avatarLoadedRef.current && (Date.now() - start < 5000)) {
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  const handleExportPNG = async () => {
    setExporting("png");
    const toastId = toast.loading("Generating High-Resolution PNG...");
    try {
      await waitAvatarLoaded();
      await waitForAssets("dna-export-card");
      const { downloadPNG } = await import("./dna-card-export");
      const name = analysis?.displayName || analysis?.username || "creator";
      const fileName = `authenfluence-dna-${name.toLowerCase().replace(/\s+/g, "-")}.png`;
      await downloadPNG("dna-export-card", fileName);
      toast.success("PNG downloaded successfully!", { id: toastId });
    } catch (err) {
      toast.error("Unable to generate export. Please try again.", { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    const toastId = toast.loading("Preparing PDF report...");
    try {
      await waitAvatarLoaded();
      await waitForAssets("dna-export-card");
      const { downloadPDF } = await import("./dna-card-export");
      const name = analysis?.displayName || analysis?.username || "creator";
      const fileName = `authenfluence-report-${name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      await downloadPDF("dna-export-card", fileName, analysis);
      toast.success("PDF report downloaded successfully!", { id: toastId });
    } catch (err) {
      toast.error("Unable to generate PDF report. Please try again.", { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  const handleExportStory = async () => {
    setExporting("story");
    const toastId = toast.loading("Creating Instagram Story export...");
    try {
      await waitAvatarLoaded();
      await waitForAssets("dna-export-card-story");
      const { downloadStory } = await import("./dna-card-export");
      const name = analysis?.displayName || analysis?.username || "creator";
      const fileName = `authenfluence-story-${name.toLowerCase().replace(/\s+/g, "-")}.png`;
      await downloadStory("dna-export-card-story", fileName);
      toast.success("Instagram Story downloaded successfully!", { id: toastId });
    } catch (err) {
      toast.error("Unable to generate Story export. Please try again.", { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="w-full">
      {/* ========================================== */}
      {/* 1. LIVE ON-SCREEN TICKET RENDER            */}
      {/* ========================================== */}
      <div 
        id="creator-dna-card-wrapper" 
        className="mx-auto max-w-7xl rounded-3xl p-6 bg-[#05060a] border border-white/5 shadow-2xl relative scanlines holo-shimmer overflow-hidden"
      >
        <div className="relative z-10 flex flex-col gap-6">
          
          {/* TOP TICKET — CREATOR PASSPORT */}
          <TicketShell>
            <div className="relative grid min-h-[360px] grid-cols-1 lg:grid-cols-[2.65fr_1fr]">
              <PerfLine />
              
              {/* Left & Center Section */}
              <div className="relative grid gap-6 p-8 lg:grid-cols-[0.92fr_1.25fr] lg:pr-12">
                <div className="flex flex-col gap-4">
                  <TicketTitle />
                  
                  <div className="flex items-center gap-4 mt-2">
                    {/* Avatar with Glow Frame */}
                    <div className="h-24 w-24 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#B66BFF] to-[#D7FF47] p-0.5 shadow-[0_0_20px_rgba(182,107,255,0.4)] shrink-0">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt=""
                          className="h-full w-full rounded-[18px] object-cover bg-[#090c10]"
                          onError={() => setAvatarFailed(true)}
                        />
                      ) : (
                        <FallbackAvatar username={analysis?.username} rounded="rounded-[18px]" />
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-2xl font-black leading-none text-white">
                        <span className="truncate">
                          {analysis?.displayName || analysis?.username || "Unavailable"}
                        </span>
                        <BadgeCheck className="h-6 w-6 shrink-0 fill-[#8A4CFF] text-[#8A4CFF]" />
                      </div>
                      
                      <div className="mt-1 text-sm text-white/80 font-medium">
                        @{analysis?.username || "unknown"} <span className="text-[#B66BFF]">/</span>{" "}
                        <span className="text-[#D7FF47] font-semibold">{analysis?.platform || "platform"}</span>
                      </div>
                      
                      {/* Niche tags */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-[#8A4CFF]/10 border border-[#8A4CFF]/45 px-3 py-1 text-xs font-bold text-[#B66BFF] neon-glow-purple">
                          {dna.archetype}
                        </span>
                        <span className="rounded-full bg-[#A7D936]/10 border border-[#A7D936]/45 px-3 py-1 text-xs font-bold text-[#A7D936] neon-glow-lime">
                          {dna.topNiche || "Entertainment"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative flex min-w-0 flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl font-black uppercase tracking-[0.16em] text-white">
                        CREATOR
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-2xl font-black uppercase tracking-[0.16em] text-white">
                        PASSPORT <Globe className="h-5 w-5 text-[#D7FF47]" />
                      </div>
                    </div>
                    
                    {/* Glowing Mascot */}
                    <div className="opacity-80">
                      <NeonMascot size="small" />
                    </div>
                  </div>

                  {/* Metrics Strip */}
                  <div className="mt-6 border-y border-[#D7FF47]/20 py-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <MetricBlock label="Trust Score" value={dna.trustScoreLabel} caption="Engagement Score" />
                      <MetricBlock label="Audience Authenticity" value={dna.audienceAuth} caption="Viral Authenticity" />
                      <MetricBlock label="Engagement Quality" value={dna.engagementClass} caption="AI Quality Rating" />
                    </div>
                  </div>

                  {/* AI Verdict summary */}
                  <p className="mt-4 text-xs leading-relaxed text-white/70 italic border-l-2 border-[#B66BFF]/40 pl-3">
                    {dna.aiInsight ||
                      "Strong organic authority with consistent engagement velocity. Content resonates deeply with audiences across demographics."}
                  </p>
                </div>
              </div>

              {/* Right Access Panel */}
              <aside className="relative flex flex-col items-center justify-between border-t border-white/5 p-8 text-center lg:border-l lg:border-t-0 bg-[#090c10]/40">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">CREATOR CLASS</div>
                  <div className="text-xl font-black text-[#D7FF47] tracking-wider uppercase drop-shadow-[0_0_10px_rgba(215,255,71,0.3)]">
                    {dna.displayTier || "Global Creator"}
                  </div>
                  <div className="text-[10px] text-white/60">AI Confidence: {dna.brandReadiness}</div>
                </div>
                
                {/* QR Code Container */}
                <div className="my-4 rounded-2xl border border-white/10 bg-white p-2.5 shadow-[0_0_32px_rgba(215,255,71,0.12)]">
                  <img
                    src={qrDataUrl || qrSrc}
                    alt="Creator verification QR code"
                    className="h-28 w-28 object-cover"
                  />
                </div>
                
                {/* Barcode with sliding scanner glow line */}
                <div className="relative w-full max-w-[160px] overflow-hidden">
                  <BarcodeSVG seed={analysis?.username} lime />
                  <div className="barcode-scanner-line" />
                </div>
                
                <div className="text-[10px] text-white/40 mt-2">
                  Generated by <span className="font-bold text-[#B66BFF]">Authenfluence AI</span>
                </div>
              </aside>
            </div>
          </TicketShell>

          {/* Connected Ticket Divider / Perforation Junction */}
          <div className="relative flex items-center justify-between pointer-events-none -my-2 select-none">
            <div className="h-8 w-8 -translate-x-10 rounded-full bg-[#05060a] border-r border-white/5" />
            <div className="flex-1 border-t-2 border-dashed border-white/10 mx-1" />
            <div className="h-8 w-8 translate-x-10 rounded-full bg-[#05060a] border-l border-white/5" />
          </div>

          {/* BOTTOM TICKET — DIGITAL DNA */}
          <TicketShell>
            <div className="relative grid min-h-[360px] grid-cols-1 lg:grid-cols-[1fr_1.65fr_1fr]">
              <PerfLine />
              
              {/* Mascot Left Panel */}
              <div className="relative flex flex-col justify-center items-center border-b border-white/5 p-8 lg:border-b-0 lg:border-r bg-[#090c10]/20">
                <TicketTitle compact />
                <div className="mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/70">
                  CREATOR PASSPORT <Globe className="h-4 w-4 text-[#D7FF47]" />
                </div>
                <div className="mt-6 flex items-center justify-center w-full">
                  <NeonMascot />
                </div>
              </div>

              {/* Content DNA Center Panel */}
              <div className="relative border-b border-white/5 p-8 lg:border-b-0 lg:border-r lg:pr-12 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-[#D7FF47] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#D7FF47] animate-pulse" /> Content DNA Profile
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <ContentLine
                      icon={<PlayCircle className="h-5 w-5" />}
                      title={dna.topNiche || "Entertainment"}
                      detail="Top Niche Vertical"
                    />
                    <ContentLine
                      icon={<Smile className="h-5 w-5" />}
                      title={dna.audienceQuality || "Estimated"}
                      detail="Audience Quality"
                    />
                    <ContentLine
                      icon={<MessageSquare className="h-5 w-5" />}
                      title={dna.engagementClass || "Excellent"}
                      detail="Engagement Class"
                    />
                  </div>
                </div>
                
                <div className="my-4 border-t border-dashed border-[#B66BFF]/20" />
                
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-[#D7FF47]">
                    AI Trust Verdict
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    {dna.aiInsight ||
                      "Strong organic authority with consistent engagement velocity. Content resonates deeply with audiences across demographics. Excellent brand collaboration potential and long-term growth outlook."}
                  </p>
                </div>
                
                <div className="absolute bottom-5 right-8 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#B66BFF]/40 text-xs font-black text-[#B66BFF] bg-[#B66BFF]/5">
                  18+
                </div>
              </div>

              {/* Access Right Panel */}
              <aside className="relative flex flex-col items-center justify-between p-8 text-center bg-[#090c10]/40">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">ACCESS LEVEL</div>
                  <div className="text-2xl font-black text-[#D7FF47] tracking-wider">ALL ACCESS</div>
                  <div className="text-[10px] text-white/60">Creator Intelligence Pass</div>
                </div>
                
                <div className="my-2">
                  <WireGlobe />
                </div>
                
                <div className="text-[10px] font-bold text-[#D7FF47] uppercase tracking-wider animate-pulse">
                  Scan to Verify Authenticity
                </div>
                
                <div className="w-full text-center">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-white/40">Pass ID</div>
                  <div className="mt-1 text-sm font-black tracking-widest text-[#D7FF47]">{passId}</div>
                </div>
                
                {/* Vertical Text Ribbon */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 rotate-180 text-[8px] font-black uppercase tracking-[0.3em] text-[#B66BFF]/40 [writing-mode:vertical-rl] hidden xl:block">
                  AUTHENTIC • VERIFIED • TRUSTED
                </div>
              </aside>
            </div>
          </TicketShell>

        </div>
      </div>

      {/* ========================================== */}
      {/* HIDDEN EXPORT VIEWPORT WRAPPER             */}
      {/* ========================================== */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          overflow: "hidden",
          zIndex: -9999,
          pointerEvents: "none",
        }}
      >
        {/* ========================================== */}
        {/* 2. ISOLATED FIXED-SIZE PNG EXPORT CARD     */}
        {/* ========================================== */}
        <div id="dna-export-card" className="dna-export-png-canvas">
          <div className="dna-export-grid-bg" />
          <div className="dna-export-scanlines" />
          
          <div className="relative z-10 flex flex-col gap-[30px] w-full h-full">
            
            {/* Top Card (PNG Export: 2240px wide, 560px high) */}
            <div className="dna-export-ticket-shell w-full h-[560px] flex relative">
              <div className="dna-export-large-notch-left" />
              <div className="dna-export-large-notch-right" />
              
              {/* Left & Center section (1600px wide) */}
              <div className="w-[1560px] h-full p-[48px] flex flex-col justify-between box-sizing-border-box">
                {/* Creator Passport Identity */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-[32px] items-center">
                    {/* Glowing frame around avatar */}
                    <div className="h-[180px] w-[180px] rounded-[36px] bg-gradient-to-br from-[#B66BFF] to-[#D7FF47] p-[3px] shadow-[0_0_24px_rgba(182,107,255,0.4)] flex-shrink-0">
                      {exportAvatarSrc ? (
                        <img
                          src={exportAvatarSrc}
                          alt=""
                          className="h-full w-full rounded-[33px] object-cover bg-[#090c10]"
                        />
                      ) : (
                        <FallbackAvatar username={analysis?.username} size="large" rounded="rounded-[33px]" />
                      )}
                    </div>
                    
                    <div className="space-y-[6px]">
                      <div className="flex items-center gap-[12px] text-[48px] font-black text-white leading-none">
                        {analysis?.displayName || analysis?.username || "Unavailable"}
                        <BadgeCheck className="h-[44px] w-[44px] fill-[#8A4CFF] text-[#8A4CFF]" />
                      </div>
                      <div className="text-[26px] text-white/80 font-medium">
                        @{analysis?.username || "unknown"} <span className="text-[#B66BFF]">/</span> <span className="text-[#D7FF47] font-semibold">{analysis?.platform ? String(analysis.platform).toUpperCase() : "YOUTUBE"}</span>
                      </div>
                      <div className="flex gap-[12px] pt-[8px]">
                        <span className="rounded-full bg-[#8A4CFF]/15 border border-[#8A4CFF]/50 px-[24px] py-[6px] text-[20px] font-bold text-[#B66BFF] dna-export-glow-purple">
                          {dna.archetype}
                        </span>
                        <span className="rounded-full bg-[#A7D936]/15 border border-[#A7D936]/50 px-[24px] py-[6px] text-[20px] font-bold text-[#A7D936] dna-export-glow-lime">
                          {dna.topNiche || "Entertainment"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual stacked title */}
                  <div className="text-right">
                    <TicketTitle size="large" />
                  </div>
                </div>

                {/* Bottom Half of Left Ticket (Metrics & AI Paragraph) */}
                <div className="flex justify-between items-end gap-[40px]">
                  {/* Horizontal metric columns */}
                  <div className="flex gap-[48px] border-t border-b border-white/10 py-[16px] flex-grow">
                    <div className="min-w-[280px] border-r border-dashed border-[#D7FF47]/20 pr-[24px]">
                      <div className="text-[14px] font-black uppercase tracking-wider text-[#D7FF47]">TRUST SCORE</div>
                      <div className="text-[44px] font-black text-[#B66BFF] drop-shadow-[0_0_8px_rgba(182,107,255,0.4)] mt-[6px]">{dna.trustScoreLabel}</div>
                      <div className="text-[13px] text-white/50 mt-[4px]">Engagement Score</div>
                    </div>
                    <div className="min-w-[280px] border-r border-dashed border-[#D7FF47]/20 pr-[24px]">
                      <div className="text-[14px] font-black uppercase tracking-wider text-[#D7FF47]">AUDIENCE AUTHENTICITY</div>
                      <div className="text-[44px] font-black text-[#B66BFF] drop-shadow-[0_0_8px_rgba(182,107,255,0.4)] mt-[6px]">{dna.audienceAuth}</div>
                      <div className="text-[13px] text-white/50 mt-[4px]">Viral Authenticity</div>
                    </div>
                    <div className="min-w-[280px]">
                      <div className="text-[14px] font-black uppercase tracking-wider text-[#D7FF47]">ENGAGEMENT QUALITY</div>
                      <div className="text-[44px] font-black text-[#B66BFF] drop-shadow-[0_0_8px_rgba(182,107,255,0.4)] mt-[6px]">{dna.engagementClass}</div>
                      <div className="text-[13px] text-white/50 mt-[4px]">AI Quality Rating</div>
                    </div>
                  </div>
                  
                  {/* Globe/Mascot representation in ticket */}
                  <div className="flex-shrink-0 opacity-80 mb-[-12px]">
                    <NeonMascot size="static" />
                  </div>
                </div>
              </div>
              
              {/* Vertical Perforation */}
              <div className="w-[2px] h-full border-l-2 border-dashed border-white/10 relative">
                <div className="absolute w-[24px] h-[24px] bg-[#05060a] rounded-full left-[-13px] top-[-12px]" />
                <div className="absolute w-[24px] h-[24px] bg-[#05060a] rounded-full left-[-13px] bottom-[-12px]" />
              </div>

              {/* Right section (Access panel - 640px wide) */}
              <div className="w-[640px] h-full p-[48px] flex flex-col justify-between items-center bg-[#090c10]/40 text-center box-sizing-border-box">
                <div className="space-y-[4px]">
                  <div className="text-[14px] uppercase tracking-widest text-white/50">CREATOR CLASS</div>
                  <div className="text-[32px] font-black text-[#D7FF47] tracking-wider uppercase drop-shadow-[0_0_6px_rgba(215,255,71,0.3)]">{dna.displayTier || "Global Creator"}</div>
                  <div className="text-[12px] text-white/60">AI Confidence: {dna.brandReadiness}</div>
                </div>
                
                {/* High resolution QR */}
                {qrDataUrl && (
                  <div className="rounded-[24px] border border-white/10 bg-white p-[14px] shadow-[0_0_24px_rgba(215,255,71,0.12)]">
                    <img
                      src={qrDataUrl}
                      alt="Verification QR"
                      className="h-[180px] w-[180px] object-cover"
                    />
                  </div>
                )}
                
                {/* Barcode strip */}
                <div className="relative w-[340px] overflow-hidden">
                  <BarcodeSVG seed={analysis?.username} lime size="large" />
                  <div className="dna-export-barcode-line" />
                </div>
                
                <div className="text-[12px] text-white/40 font-semibold tracking-wider">
                  Generated by Authenfluence AI
                </div>
              </div>
            </div>

            {/* Ticket Junction Divider */}
            <div className="dna-export-horizontal-divider">
              <div className="dna-export-mid-notch-left" />
              <div className="dna-export-dashed-line" />
              <div className="dna-export-mid-notch-right" />
            </div>

            {/* Bottom Card (PNG Export: 2240px wide, 560px high) */}
            <div className="dna-export-ticket-shell w-full h-[560px] flex relative">
              <div className="dna-export-large-notch-left" />
              <div className="dna-export-large-notch-right" />
              
              {/* Left section (640px wide) */}
              <div className="w-[640px] h-full p-[48px] flex flex-col justify-center items-center border-r-2 border-dashed border-white/10 bg-[#090c10]/20 text-center box-sizing-border-box relative">
                <div className="absolute w-[24px] h-[24px] bg-[#05060a] rounded-full right-[-13px] top-[-12px]" />
                <div className="absolute w-[24px] h-[24px] bg-[#05060a] rounded-full right-[-13px] bottom-[-12px]" />
                
                <TicketTitle compact size="large" />
                <div className="mt-[16px] text-[20px] font-black uppercase tracking-[0.2em] text-white/70 flex items-center gap-[8px]">
                  CREATOR PASSPORT <Globe className="h-[20px] w-[20px] text-[#D7FF47]" />
                </div>
                <div className="mt-[24px]">
                  <NeonMascot />
                </div>
              </div>

              {/* Center section (960px wide) */}
              <div className="w-[960px] h-full p-[48px] flex flex-col justify-between box-sizing-border-box">
                <div>
                  <div className="text-[18px] font-black uppercase tracking-wider text-[#D7FF47] flex items-center gap-[8px]">
                    <Sparkles className="h-[20px] w-[20px] text-[#D7FF47]" /> Content DNA Profile
                  </div>
                  
                  <div className="mt-[32px] flex gap-[32px] justify-between">
                    <div className="flex gap-[16px] items-center">
                      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-[#B66BFF]/40 text-[#D7FF47] bg-[#B66BFF]/5">
                        <PlayCircle className="h-[36px] w-[36px]" />
                      </div>
                      <div>
                        <div className="text-[28px] font-black text-white">{dna.topNiche || "Entertainment"}</div>
                        <div className="text-[16px] text-white/60">Top Niche Vertical</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-[16px] items-center">
                      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-[#B66BFF]/40 text-[#D7FF47] bg-[#B66BFF]/5">
                        <Smile className="h-[36px] w-[36px]" />
                      </div>
                      <div>
                        <div className="text-[28px] font-black text-white">{dna.audienceQuality || "Estimated"}</div>
                        <div className="text-[16px] text-white/60">Audience Quality</div>
                      </div>
                    </div>

                    <div className="flex gap-[16px] items-center">
                      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-[#B66BFF]/40 text-[#D7FF47] bg-[#B66BFF]/5">
                        <MessageSquare className="h-[36px] w-[36px]" />
                      </div>
                      <div>
                        <div className="text-[28px] font-black text-white">{dna.engagementClass || "Excellent"}</div>
                        <div className="text-[16px] text-white/60">Engagement Class</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-dashed border-[#B66BFF]/20 my-[20px]" />
                
                <div>
                  <div className="text-[18px] font-black uppercase tracking-wider text-[#D7FF47]">AI Trust Verdict</div>
                  <p className="mt-[12px] text-[20px] leading-[32px] text-white/80 italic font-medium">
                    "{dna.aiInsight || "Strong organic authority with consistent engagement velocity. Content resonates deeply with audiences across demographics."}"
                  </p>
                </div>
              </div>

              {/* Vertical Perforation */}
              <div className="w-[2px] h-full border-l-2 border-dashed border-white/10 relative">
                <div className="absolute w-[24px] h-[24px] bg-[#05060a] rounded-full left-[-13px] top-[-12px]" />
                <div className="absolute w-[24px] h-[24px] bg-[#05060a] rounded-full left-[-13px] bottom-[-12px]" />
              </div>

              {/* Right section (Access panel - 640px wide) */}
              <div className="w-[640px] h-full p-[48px] flex flex-col justify-between items-center bg-[#090c10]/40 text-center box-sizing-border-box">
                <div className="space-y-[4px]">
                  <div className="text-[14px] uppercase tracking-widest text-white/50">ACCESS LEVEL</div>
                  <div className="text-[36px] font-black text-[#D7FF47] tracking-wider">ALL ACCESS</div>
                  <div className="text-[12px] text-white/60">Creator Intelligence Pass</div>
                </div>
                
                <div className="my-[12px]">
                  <WireGlobe size="static" />
                </div>
                
                <div className="text-[14px] font-bold text-[#D7FF47] uppercase tracking-wider">
                  Scan to Verify Authenticity
                </div>
                
                <div className="w-full text-center">
                  <div className="text-[12px] uppercase tracking-widest text-white/40">Pass ID</div>
                  <div className="mt-[4px] text-[20px] font-black tracking-widest text-[#D7FF47]">{passId}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================== */}
        {/* 3. ISOLATED FIXED-SIZE STORY EXPORT CARD   */}
        {/* ========================================== */}
        <div id="dna-export-card-story" className="dna-export-story-canvas animate-none">
          <div className="dna-export-grid-bg" />
          <div className="dna-export-scanlines" />
          
          {/* Header (Branding) */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-[24px]">
            <div>
              <div className="text-[32px] font-black tracking-wider text-[#B66BFF]">AUTHENFLUENCE AI</div>
              <div className="text-[14px] tracking-widest text-[#D7FF47] font-semibold mt-[4px]">CREATOR TRUST INTEL</div>
            </div>
            <div className="rounded-full bg-[#B66BFF]/10 border border-[#B66BFF]/30 px-[24px] py-[8px] text-[14px] font-bold text-[#B66BFF]">
              VERIFIED PASS
            </div>
          </div>

          {/* Creator Info Centered */}
          <div className="relative z-10 flex flex-col items-center text-center my-[32px]">
            {/* Large Avatar frame */}
            <div className="h-[220px] w-[220px] rounded-[48px] bg-gradient-to-br from-[#B66BFF] to-[#D7FF47] p-[3px] shadow-[0_0_40px_rgba(182,107,255,0.5)] mb-[24px] flex-shrink-0">
              {exportAvatarSrc ? (
                <img
                  src={exportAvatarSrc}
                  alt=""
                  className="h-full w-full rounded-[45px] object-cover bg-[#090c10]"
                />
              ) : (
                <FallbackAvatar username={analysis?.username} size="story" rounded="rounded-[45px]" />
              )}
            </div>
            
            <div className="flex items-center gap-[10px]">
              <h1 className="text-[48px] font-black tracking-tight text-white leading-none">
                {analysis?.displayName || analysis?.username || "Unavailable"}
              </h1>
              <BadgeCheck className="h-[44px] w-[44px] fill-[#8A4CFF] text-[#8A4CFF]" />
            </div>
            
            <p className="text-[22px] text-white/80 mt-[8px] font-medium">
              @{analysis?.username || "unknown"} <span className="text-[#B66BFF]">/</span> <span className="text-[#D7FF47] font-semibold">{analysis?.platform ? String(analysis.platform).toUpperCase() : "YOUTUBE"}</span>
            </p>

            <div className="mt-[20px] flex gap-[12px]">
              <span className="rounded-full bg-[#8A4CFF]/15 border border-[#8A4CFF]/50 px-[28px] py-[8px] text-[18px] font-bold text-[#B66BFF] dna-export-glow-purple">
                {dna.archetype}
              </span>
              <span className="rounded-full bg-[#A7D936]/15 border border-[#A7D936]/50 px-[28px] py-[8px] text-[18px] font-bold text-[#A7D936] dna-export-glow-lime">
                {dna.topNiche || "Entertainment"}
              </span>
            </div>
          </div>

          {/* Central Trust Score Box */}
          <div className="relative z-10 bg-black/60 rounded-[32px] p-[32px] border border-white/10 shadow-2xl flex flex-col items-center">
            <div className="text-[16px] font-black uppercase tracking-widest text-[#D7FF47] mb-[8px]">TRUST SCORE</div>
            <div className="text-[100px] font-black text-[#B66BFF] drop-shadow-[0_0_20px_rgba(182,107,255,0.4)] font-mono leading-none">
              {dna.trustScoreLabel}
            </div>
            
            <div className="w-full border-t border-dashed border-white/10 my-[24px]" />

            {/* Grid properties */}
            <div className="grid grid-cols-2 gap-[24px] w-full">
              <div className="text-center">
                <div className="text-[13px] uppercase tracking-wider text-white/50">AUDIENCE AUTH</div>
                <div className="text-[24px] font-black text-white mt-[4px]">{dna.audienceAuth}</div>
              </div>
              <div className="text-center">
                <div className="text-[13px] uppercase tracking-wider text-white/50">ENGAGEMENT</div>
                <div className="text-[24px] font-black text-white mt-[4px]">{dna.engagementClass}</div>
              </div>
              <div className="text-center">
                <div className="text-[13px] uppercase tracking-wider text-white/50">CREATOR CLASS</div>
                <div className="text-[24px] font-black text-[#D7FF47] mt-[4px]">{dna.displayTier}</div>
              </div>
              <div className="text-center">
                <div className="text-[13px] uppercase tracking-wider text-white/50">BRAND READY</div>
                <div className="text-[20px] font-bold text-white/90 mt-[6px] truncate max-w-[180px]">{dna.brandReadiness}</div>
              </div>
            </div>
          </div>

          {/* AI Insight Verdict Box */}
          <div className="relative z-10 bg-gradient-to-r from-[#B66BFF]/10 to-[#D7FF47]/5 border-l-[6px] border-[#B66BFF] p-[24px] rounded-[20px]">
            <div className="text-[14px] font-bold uppercase tracking-wider text-[#B66BFF] mb-[8px] flex items-center gap-[8px]">
              <Sparkles className="h-[18px] w-[18px]" /> AI ANALYSIS VERDICT
            </div>
            <p className="text-[18px] leading-[30px] text-white/90 italic font-medium">
              "{dna.aiInsight || "Strong organic authority with consistent engagement velocity. Content resonates deeply with audiences across demographics. Excellent brand collaboration potential."}"
            </p>
          </div>

          {/* Bottom Verification Panel */}
          <div className="relative z-10 border-t border-white/10 pt-[24px] flex items-center justify-between">
            <div className="space-y-[6px]">
              <div className="text-[12px] uppercase tracking-wider text-white/40">DNA PASS ID</div>
              <div className="text-[24px] font-black tracking-wider text-[#D7FF47]">{passId}</div>
              <div className="text-[12px] text-white/50 font-bold tracking-[0.15em]">AUTHENTIC • VERIFIED • TRUSTED</div>
            </div>

            <div className="flex gap-[20px] items-center">
              {/* Barcode */}
              <div className="w-[180px]">
                <BarcodeSVG seed={analysis?.username} lime />
              </div>
              {/* QR Code */}
              {qrDataUrl && (
                <div className="rounded-[16px] border border-white/20 bg-white p-[8px] flex-shrink-0">
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="h-[80px] w-[80px] object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive download buttons */}
      <div className="mx-auto mt-6 flex max-w-7xl flex-wrap justify-end gap-3 px-2 relative z-20">
        <Button
          onClick={handleExportPNG}
          disabled={exporting !== null}
          className="bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#B66BFF]/60 text-white font-bold backdrop-blur-md transition-all duration-300 transform hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(182,107,255,0.25)] disabled:opacity-50 py-5 px-6 rounded-xl flex items-center"
        >
          {exporting === "png" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#B66BFF]" />
              Generating PNG...
            </>
          ) : (
            <>
              <DownloadCloud className="mr-2 h-4 w-4 text-[#B66BFF]" />
              Download PNG
            </>
          )}
        </Button>
        
        <Button
          onClick={handleExportPDF}
          disabled={exporting !== null}
          className="bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#D7FF47]/60 text-[#D7FF47] font-bold backdrop-blur-md transition-all duration-300 transform hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(215,255,71,0.2)] disabled:opacity-50 py-5 px-6 rounded-xl flex items-center"
        >
          {exporting === "pdf" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#D7FF47]" />
              Preparing PDF...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4 text-[#D7FF47]" />
              Download PDF
            </>
          )}
        </Button>

        <Button
          onClick={handleExportStory}
          disabled={exporting !== null}
          className="bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white font-bold backdrop-blur-md transition-all duration-300 transform hover:scale-[1.03] disabled:opacity-50 py-5 px-6 rounded-xl flex items-center"
        >
          {exporting === "story" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Story...
            </>
          ) : (
            <>
              <Share2 className="mr-2 h-4 w-4" />
              Download Story
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
