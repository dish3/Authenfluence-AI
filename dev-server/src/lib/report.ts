import jsPDF from "jspdf";
import type { InfluencerAnalysis } from "./mock-data";
import { scoreLabel } from "./mock-data";

export function downloadReport(a: InfluencerAnalysis) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  // Header band
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 36, "F");
  doc.setTextColor(255);
  doc.setFontSize(11);
  doc.text("Authenfluence AI — Context-Aware Trust Intelligence Report", 40, 23);

  doc.setTextColor(20);
  doc.setFontSize(22);
  doc.text(a.displayName, 40, y);
  y += 18;
  doc.setFontSize(11);
  doc.setTextColor(110);
  doc.text(`@${a.username} · ${a.platform.toUpperCase()}`, 40, y);
  y += 28;

  // Score + confidence
  const label = scoreLabel(a.score).label;
  doc.setFontSize(48);
  doc.setTextColor(20);
  doc.text(String(a.score), 40, y + 30);
  doc.setFontSize(13);
  doc.setTextColor(80);
  doc.text(label, 110, y + 20);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Trust Score (0–100)", 110, y + 36);
  if (a.confidenceLevel) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Confidence: ${a.confidenceLevel}`, 110, y + 50);
  }
  y += 70;

  // Creator categories
  if (a.creatorCategories && a.creatorCategories.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(80);
    const catStr = "Creator type: " + a.creatorCategories.map((c) => `${c.type} (${Math.round(c.weight * 100)}%)`).join(", ");
    doc.text(catStr, 40, y);
    y += 18;
  }

  // Stats
  doc.setFontSize(11);
  doc.setTextColor(40);
  const stats = [
    ["Followers", a.followers.toLocaleString()],
    ["Avg Likes", a.avgLikes.toLocaleString()],
    ["Published Videos", String(a.totalPosts)],
  ];
  stats.forEach(([k, v], i) => {
    const x = 40 + i * 170;
    doc.setTextColor(110); doc.text(k, x, y);
    doc.setTextColor(20); doc.setFontSize(14); doc.text(v, x, y + 18);
    doc.setFontSize(11);
  });
  y += 50;

  // Benchmark context
  if (a.benchmarkContext) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    const bcLines = doc.splitTextToSize(a.benchmarkContext, W - 80);
    doc.text(bcLines, 40, y);
    y += bcLines.length * 12 + 10;
  }

  // Predictive Intelligence Metrics (Phase 1 & 2)
  if (a.growthPotentialScore !== undefined && a.campaignSuccessProbability !== undefined) {
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text("Predictive Intelligence & Velocity Analytics", 40, y); y += 18;
    
    doc.setFontSize(10); doc.setTextColor(80);
    doc.text("Influence Velocity:", 40, y);
    doc.setTextColor(20); doc.text(`${a.influenceVelocity ?? 80}/100`, 170, y);
    
    doc.setTextColor(80); doc.text("Creator Lifecycle Stage:", 320, y);
    doc.setTextColor(20); doc.text(a.lifecycleStage ?? "Growing", 460, y);
    y += 14;

    doc.setTextColor(80); doc.text("Virality Potential:", 40, y);
    doc.setTextColor(20); doc.text(`${a.viralityPotential ?? 75}/100`, 170, y);
    
    doc.setTextColor(80); doc.text("Projected Growth (90d):", 320, y);
    doc.setTextColor(22, 101, 52); doc.text(`+${a.projectedGrowth90Days ?? 15}% expansion`, 460, y);
    y += 14;

    doc.setTextColor(80); doc.text("Estimated Partner ROI:", 40, y);
    doc.setTextColor(20); doc.text(`${a.estimatedRoiTier ?? "High"} Tier`, 170, y);
    
    doc.setTextColor(80); doc.text("Campaign Success Prob:", 320, y);
    doc.setTextColor(20); doc.text(`${a.campaignSuccessProbability}%`, 460, y);
    y += 16;

    if (a.influenceVelocityExplanation) {
      const iveLines = doc.splitTextToSize(`Velocity Analysis: ${a.influenceVelocityExplanation}`, W - 80);
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text(iveLines, 40, y);
      y += iveLines.length * 11 + 6;
    }

    if (a.isUndervalued) {
      doc.setFontSize(9); doc.setTextColor(180, 83, 9); // Alert tone
      doc.setFont("helvetica", "bold");
      const undervalLines = doc.splitTextToSize(`★ ${a.undervaluedExplanation || "Undervalued Influence Opportunity Detected."}`, W - 80);
      doc.text(undervalLines, 40, y);
      doc.setFont("helvetica", "normal");
      y += undervalLines.length * 11 + 6;
    }
    
    y += 10;
  }

  // Breakdown
  doc.setFontSize(13); doc.setTextColor(20);
  doc.text("Score Breakdown", 40, y); y += 16;
  doc.setFontSize(11);
  const rows: [string, number, number][] = [
    ["Influence Reliability", a.breakdown.engagement, 30],
    ["Audience Trust Quality", a.breakdown.followerQuality, 25],
    ["Comment Authenticity", a.breakdown.commentAuthenticity, 20],
    ["Creator Stability", a.breakdown.postingConsistency, 15],
    ["Contextual Trust Signals", a.breakdown.contextualSignals ?? 80, 10],
  ];
  rows.forEach(([k, v, w]) => {
    doc.setTextColor(60); doc.text(`${k}  (weight ${w}%)`, 40, y);
    doc.setTextColor(20); doc.text(`${v}/100`, W - 80, y);
    doc.setDrawColor(220); doc.setFillColor(230, 230, 235);
    doc.roundedRect(40, y + 4, W - 80, 5, 2, 2, "F");
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(40, y + 4, (W - 80) * (v / 100), 5, 2, 2, "F");
    y += 22;
  });
  y += 10;

  // Temporal signals
  if (a.temporalSignals && a.temporalSignals.uploadTrend !== "insufficient_data") {
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text("Trend Analysis", 40, y); y += 14;
    doc.setFontSize(10); doc.setTextColor(60);
    doc.text(`Upload trend: ${a.temporalSignals.uploadTrend}`, 40, y); y += 14;
    doc.text(`Engagement trend: ${a.temporalSignals.engagementTrend}`, 40, y); y += 14;
    if (a.temporalSignals.suspiciousSpikesDetected) {
      doc.setTextColor(180, 100, 0);
      doc.text("⚠ Unusual engagement spikes detected in recent period", 40, y); y += 14;
      doc.setTextColor(60);
    }
    y += 6;
  }

  // Verdict
  doc.setFontSize(13); doc.setTextColor(20);
  doc.text("AI Verdict", 40, y); y += 14;
  doc.setFontSize(10); doc.setTextColor(60);
  const lines = doc.splitTextToSize(a.verdict, W - 80);
  doc.text(lines, 40, y + 8); y += lines.length * 13 + 14;
  // AI Trust Insights (Strengths and Risks)
  if ((a.strengths && a.strengths.length > 0) || (a.risks && a.risks.length > 0)) {
    if (y > 650) { doc.addPage(); y = 60; }
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text("AI Trust Insights", 40, y); y += 16;
    
    if (a.strengths && a.strengths.length > 0) {
      doc.setFontSize(10); doc.setTextColor(22, 101, 52); // Dark green
      doc.text("Positive Signals:", 40, y); y += 12;
      doc.setTextColor(60);
      a.strengths.forEach((str) => {
        if (y > 755) { doc.addPage(); y = 60; }
        const sl = doc.splitTextToSize(`  [✓]  ${str}`, W - 80);
        doc.text(sl, 40, y); y += sl.length * 12 + 2;
      });
      y += 6;
    }
    
    if (a.risks && a.risks.length > 0) {
      if (y > 740) { doc.addPage(); y = 60; }
      doc.setFontSize(10); doc.setTextColor(180, 83, 9); // Dark orange/yellow
      doc.text("Monitoring Signals:", 40, y); y += 12;
      doc.setTextColor(60);
      a.risks.forEach((risk) => {
        if (y > 755) { doc.addPage(); y = 60; }
        const rl = doc.splitTextToSize(`  [!]  ${risk}`, W - 80);
        doc.text(rl, 40, y); y += rl.length * 12 + 2;
      });
      y += 6;
    }
  }
  // Brand Trust Recommendation
  if (a.brandRecommendation) {
    if (y > 620) { doc.addPage(); y = 60; }
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text("Brand Trust Recommendation", 40, y); y += 18;
    
    doc.setFontSize(10); doc.setTextColor(80);
    doc.text(`Collaboration Risk Profile: `, 40, y);
    doc.setTextColor(a.brandRecommendation.riskLevel === "Low" ? 22 : 180, a.brandRecommendation.riskLevel === "Low" ? 101 : 83, a.brandRecommendation.riskLevel === "Low" ? 52 : 9);
    doc.setFont("helvetica", "bold");
    doc.text(`${a.brandRecommendation.riskLevel} Risk`, 170, y);
    doc.setFont("helvetica", "normal");
    y += 14;
    
    doc.setTextColor(80);
    doc.text(`Sponsorship Suitability: `, 40, y);
    doc.setTextColor(20);
    doc.text(a.brandRecommendation.sponsorshipSuitability, 170, y);
    y += 14;
    
    doc.setTextColor(80);
    doc.text(`Long-Term Brand Safety: `, 40, y);
    doc.setTextColor(20);
    const safetyLines = doc.splitTextToSize(a.brandRecommendation.safetyEvaluation, W - 210);
    doc.text(safetyLines, 170, y);
    y += safetyLines.length * 12 + 4;
    
    doc.setTextColor(100);
    doc.setFont("helvetica", "oblique");
    const recReasonLines = doc.splitTextToSize(`Reasoning: "${a.brandRecommendation.reason}"`, W - 80);
    doc.text(recReasonLines, 40, y);
    doc.setFont("helvetica", "normal");
    y += recReasonLines.length * 12 + 16;
  }

  // Brand Matches & Business Impact (Phase 3 & 6)
  if (a.brandMatches && a.brandMatches.length > 0) {
    if (y > 650) { doc.addPage(); y = 60; }
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text("Semantic Brand Matching Recommendations", 40, y); y += 16;
    a.brandMatches.forEach((match) => {
      if (y > 750) { doc.addPage(); y = 60; }
      doc.setFontSize(10); doc.setTextColor(80);
      doc.text(`• ${match.brandName} (Match Score: ${match.score}%)`, 40, y);
      doc.setFontSize(9); doc.setTextColor(110);
      const mReasonLines = doc.splitTextToSize(`Rationale: ${match.reason}`, W - 60);
      doc.text(mReasonLines, 50, y + 12);
      y += 12 + mReasonLines.length * 11 + 6;
    });
    y += 10;
  }

  if (a.businessImpact) {
    if (y > 650) { doc.addPage(); y = 60; }
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text("Business Impact & Partnership Value", 40, y); y += 18;
    doc.setFontSize(10); doc.setTextColor(80);
    
    doc.text("Conversion Potential:", 40, y);
    doc.setTextColor(20); doc.text(a.businessImpact.conversionPotential, 170, y); y += 14;
    
    doc.setTextColor(80); doc.text("Campaign Suitability:", 40, y);
    doc.setTextColor(20); const suitLines = doc.splitTextToSize(a.businessImpact.suitability, W - 210);
    doc.text(suitLines, 170, y); y += suitLines.length * 12 + 4;
    
    doc.setTextColor(80); doc.text("Reach Stability:", 40, y);
    doc.setTextColor(20); const stabLines = doc.splitTextToSize(a.businessImpact.stability, W - 210);
    doc.text(stabLines, 170, y); y += stabLines.length * 12 + 4;
    
    doc.setTextColor(80); doc.text("Audience Loyalty:", 40, y);
    doc.setTextColor(20); const loyLines = doc.splitTextToSize(a.businessImpact.loyalty, W - 210);
    doc.text(loyLines, 170, y); y += loyLines.length * 12 + 16;
  }

  // AI Trust Explanation Timeline
  if (a.timelineEvents && a.timelineEvents.length > 0) {
    if (y > 650) { doc.addPage(); y = 60; }
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text("AI Trust Explanation Timeline", 40, y); y += 18;
    doc.setFontSize(9);
    a.timelineEvents.forEach((evt) => {
      if (y > 750) { doc.addPage(); y = 60; }
      doc.setTextColor(evt.status === "success" ? 22 : 180, evt.status === "success" ? 101 : 83, evt.status === "success" ? 52 : 9);
      doc.text(`[${evt.category.toUpperCase()}]`, 40, y);
      doc.setTextColor(60);
      const evtMsgLines = doc.splitTextToSize(evt.message, W - 150);
      doc.text(evtMsgLines, 130, y);
      y += evtMsgLines.length * 12 + 4;
    });
    y += 12;
  }

  // Real-Time Comment Authenticity Details
  if (a.commentAuthenticityDetailed) {
    if (y > 650) { doc.addPage(); y = 60; }
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text("Real-Time Comment Authenticity Analysis", 40, y); y += 18;
    
    doc.setFontSize(10); doc.setTextColor(80);
    doc.text(`Low-Authenticity comments: ${a.commentAuthenticityDetailed.lowAuthenticityPct}%`, 40, y);
    y += 14;
    
    const commReasonLines = doc.splitTextToSize(`Scanner findings: ${a.commentAuthenticityDetailed.reason}`, W - 80);
    doc.text(commReasonLines, 40, y);
    y += commReasonLines.length * 12 + 8;
    
    doc.setFontSize(9);
    const bdr = a.commentAuthenticityDetailed;
    const statsStr = `Breakdown: Organic ${bdr.organicPct}% | Repetitive ${bdr.repetitivePct}% | Emoji Spam ${bdr.emojiSpamPct}% | Bot Language ${bdr.botLanguagePct}% | Promo Spam ${bdr.spamPct}%`;
    doc.text(statsStr, 40, y);
    y += 24;
  }

  // Creator Source Verification (Media Footprint)
  if (a.mediaPresence && a.mediaPresence.length > 0) {
    if (y > 650) { doc.addPage(); y = 60; }
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text("Creator Source Verification", 40, y); y += 18;
    doc.setFontSize(10);
    a.mediaPresence.forEach((social) => {
      if (y > 760) { doc.addPage(); y = 60; }
      doc.setTextColor(80);
      doc.text(`${social.platform}:`, 40, y);
      doc.setTextColor(37, 99, 235); // Blue link color
      doc.text(`${social.handle} (${social.url})`, 130, y);
      if (social.isVerified) {
        doc.setTextColor(22, 101, 52);
        doc.text(" [Verified]", W - 100, y);
      }
      y += 16;
    });
    y += 12;
  }

  // Trust signals
  doc.setFontSize(13); doc.setTextColor(20);
  doc.text("Trust Signals", 40, y); y += 14;
  doc.setFontSize(10);
  a.fraudSignals.forEach((s) => {
    if (y > 740) { doc.addPage(); y = 60; }
    doc.setTextColor(20); doc.text(`• ${s.title} [${s.severity.toUpperCase()}]`, 40, y);
    doc.setTextColor(90);
    const sl = doc.splitTextToSize(s.description, W - 80);
    doc.text(sl, 52, y + 12); y += 12 + sl.length * 12 + 4;
  });

  // Data limitations
  if (a.dataLimitations && a.dataLimitations.length > 0) {
    if (y > 700) { doc.addPage(); y = 60; }
    y += 8;
    doc.setFontSize(11); doc.setTextColor(20);
    doc.text("Data Transparency", 40, y); y += 14;
    doc.setFontSize(9); doc.setTextColor(110);
    a.dataLimitations.forEach((lim) => {
      if (y > 760) { doc.addPage(); y = 60; }
      const ll = doc.splitTextToSize(`· ${lim}`, W - 80);
      doc.text(ll, 40, y); y += ll.length * 11 + 3;
    });
  }

  // Uncertainty factors
  if (a.uncertaintyFactors && a.uncertaintyFactors.length > 0) {
    if (y > 700) { doc.addPage(); y = 60; }
    y += 6;
    doc.setFontSize(9); doc.setTextColor(130);
    doc.text(`Confidence: ${a.confidenceLevel ?? "Unknown"} — ${a.uncertaintyFactors.join("; ")}`, 40, y);
    y += 14;
  }

  doc.setFontSize(9); doc.setTextColor(130);
  doc.text("Generated by Authenfluence AI · We measure contextual trust, not popularity.", 40, 815);

  doc.save(`authenfluence-${a.username}.pdf`);
}

export function downloadComparisonReport(
  a: InfluencerAnalysis,
  b: InfluencerAnalysis,
  recommendation: string
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  // Header band
  doc.setFillColor(124, 58, 237); // Purple theme for comparisons
  doc.rect(0, 0, W, 36, "F");
  doc.setTextColor(255);
  doc.setFontSize(11);
  doc.text("Authenfluence AI — Digital Trust Head-to-Head Comparison Report", 40, 23);

  // Title
  doc.setTextColor(20);
  doc.setFontSize(20);
  doc.text("Creator Comparison Analysis", 40, y);
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Symmetric comparison of @${a.username} and @${b.username}`, 40, y);
  y += 32;

  // Symmetrical Side-by-Side Profiles
  doc.setFontSize(12); doc.setTextColor(20);
  doc.text("Profiles Overview", 40, y);
  y += 16;

  // Table Columns
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Metric", 40, y);
  doc.text(a.displayName, 220, y);
  doc.text(b.displayName, 380, y);
  y += 12;
  doc.setDrawColor(220);
  doc.line(40, y, W - 80, y);
  y += 16;

  const metricsRow = [
    ["Trust Score", `${a.score}/100`, `${b.score}/100`],
    ["Subscribers", a.followers.toLocaleString(), b.followers.toLocaleString()],
    ["Avg Likes", a.avgLikes.toLocaleString(), b.avgLikes.toLocaleString()],
    ["Total Uploads", String(a.totalPosts), String(b.totalPosts)],
    ["Influence Velocity", `${a.influenceVelocity ?? 80}/100`, `${b.influenceVelocity ?? 80}/100`],
    ["Virality Index", `${a.viralityPotential ?? 75}/100`, `${b.viralityPotential ?? 75}/100`],
    ["Projected Growth", `+${a.projectedGrowth90Days ?? 15}%`, `+${b.projectedGrowth90Days ?? 15}%`],
    ["Partner ROI Tier", `${a.estimatedRoiTier ?? "High"} Tier`, `${b.estimatedRoiTier ?? "High"} Tier`],
    ["Comment Authenticity", `${a.commentAuthenticityDetailed?.organicPct ?? 75}% Organic`, `${b.commentAuthenticityDetailed?.organicPct ?? 75}% Organic`],
    ["Posting Consistency", `${a.breakdown?.postingConsistency ?? 80}/100`, `${b.breakdown?.postingConsistency ?? 80}/100`]
  ];

  doc.setFontSize(10);
  metricsRow.forEach(([m, valA, valB]) => {
    doc.setTextColor(80);
    doc.text(m, 40, y);
    doc.setTextColor(20);
    doc.text(valA, 220, y);
    doc.text(valB, 380, y);
    y += 16;
  });
  y += 12;

  // AI Recommendation
  if (recommendation) {
    if (y > 550) { doc.addPage(); y = 60; }
    doc.setFontSize(12); doc.setTextColor(20);
    doc.text("AI Strategic Match Recommendation", 40, y);
    y += 16;
    doc.setFontSize(9); doc.setTextColor(80);
    const recLines = doc.splitTextToSize(recommendation, W - 80);
    doc.text(recLines, 40, y);
    y += recLines.length * 11 + 24;
  }

  // Individual verdicts
  if (y > 600) { doc.addPage(); y = 60; }
  doc.setFontSize(12); doc.setTextColor(20);
  doc.text("Individual Verdicts Summary", 40, y);
  y += 18;

  doc.setFontSize(10); doc.setTextColor(80);
  doc.text(`@${a.username} Verdict:`, 40, y);
  y += 12;
  doc.setFontSize(9); doc.setTextColor(110);
  const vALines = doc.splitTextToSize(a.verdict, W - 80);
  doc.text(vALines, 40, y);
  y += vALines.length * 11 + 16;

  if (y > 680) { doc.addPage(); y = 60; }
  doc.setFontSize(10); doc.setTextColor(80);
  doc.text(`@${b.username} Verdict:`, 40, y);
  y += 12;
  doc.setFontSize(9); doc.setTextColor(110);
  const vBLines = doc.splitTextToSize(b.verdict, W - 80);
  doc.text(vBLines, 40, y);
  y += vBLines.length * 11 + 16;

  doc.setFontSize(9); doc.setTextColor(130);
  doc.text("Generated by Authenfluence AI Creator Comparison Engine.", 40, 815);

  doc.save(`authenfluence-compare-${a.username}-vs-${b.username}.pdf`);
}
