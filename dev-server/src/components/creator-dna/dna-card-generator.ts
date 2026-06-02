// Lightweight generator that maps analysis to display values.
export function generateDNAMetrics(analysis: any) {
  const trust = typeof analysis?.score === 'number' ? Math.round(analysis.score) : null;
  const trustScoreLabel = trust === null ? 'Unavailable' : `${trust}/100`;

  const virality = analysis?.viralityIndex != null ? `${analysis.viralityIndex}` : (analysis?.viralScore ? `${analysis.viralScore}` : 'Estimated');

  const velocity = analysis?.influenceVelocity != null ? `${analysis.influenceVelocity}` : (analysis?.momentumSignals?.thirtyDayGrowth ? `${analysis.momentumSignals.thirtyDayGrowth}%` : 'Estimated');

  const audienceAuth = analysis?.audienceAuthenticityLabel || analysis?.commentAuthenticityDetailed?.organicPct ? `${analysis.commentAuthenticityDetailed?.organicPct || 'Estimated'}% organic` : 'Estimated';

  const archetype = analysis?.archetype || deriveArchetype(analysis);

  const brandReadiness = deriveBrandReadiness(analysis);

  return {
    trust,
    trustScoreLabel,
    virality,
    velocity,
    audienceAuth,
    archetype,
    archetypeExplanation: analysis?.archetypeExplanation || 'AI derived creator archetype',
    brandReadiness: brandReadiness.label,
    brandReason: brandReadiness.reason,
    topNiche: (analysis?.creatorCategories && analysis.creatorCategories[0]?.type) || 'Unavailable',
    audienceQuality: analysis?.audienceQuality || 'Estimated',
    engagementClass: analysis?.engagementClass || 'Estimated',
    aiInsight: analysis?.verdict || analysis?.aiInsight || null,
    tier: deriveTier(analysis),
    displayTier: mapTierLabel(deriveTier(analysis)),
    // Extra display-friendly fields used by the premium card
    authScore: trust ?? undefined,
    creatorType: archetype,
    engagementRate: analysis?.engagementRate ?? (analysis?.engagementPct ? `${analysis.engagementPct}%` : undefined),
    growthScore: analysis?.growthScore ?? (analysis?.momentumSignals?.thirtyDayGrowth ?? undefined),
    audienceTrust: analysis?.audienceTrustLabel ?? (trust != null ? (trust >= 80 ? 'High' : trust >= 60 ? 'Medium' : 'Low') : 'Estimated'),
    riskLevel: analysis?.riskLevel ?? 'Low',
    postingFrequency: analysis?.postingFrequency ?? (analysis?.avgPostsPerWeek ? `${analysis.avgPostsPerWeek}/week` : undefined),
    followers: formatCount(analysis?.followers) ?? undefined,
    avgLikes: formatCount(analysis?.avgLikes) ?? undefined,
    avgComments: formatCount(analysis?.avgComments) ?? undefined,
  };
}

function formatCount(n: any) {
  if (n == null) return undefined;
  if (typeof n !== 'number') return n;
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 1000) return `${Math.round(n / 100) / 10}K`;
  return `${n}`;
}

function mapTierLabel(tier: string) {
  // Map internal tier to refined collectible labels for UI
  const map: Record<string, string> = {
    Celebrity: 'Global Creator',
    Enterprise: 'Enterprise',
    'Mid-Tier': 'Established Creator',
    Emerging: 'Emerging Creator',
    Nano: 'Creator Starter',
    Unknown: 'Unranked',
  };
  return map[tier] || tier || 'Unranked';
}

function deriveTier(analysis: any) {
  const f = analysis?.followers || 0;
  if (f >= 1_000_000) return 'Celebrity';
  if (f >= 100_000) return 'Enterprise';
  if (f >= 25_000) return 'Mid-Tier';
  if (f >= 5_000) return 'Emerging';
  if (f > 0) return 'Nano';
  return 'Unknown';
}

function deriveArchetype(analysis: any) {
  // simple heuristic mapping; non-fabricating: fallbacks to Estimated
  if (!analysis) return 'Estimated';
  const cats = (analysis.creatorCategories || []).map((c: any) => c.type?.toLowerCase());
  if (cats.includes('music') || cats.includes('musician')) return 'Emerging Music Influencer';
  if (cats.includes('gaming')) return 'Viral Entertainer';
  if (cats.includes('education')) return 'High Trust Educator';
  if (cats.includes('fashion') || cats.includes('beauty')) return 'Audience Magnet';
  if (analysis.score && analysis.score > 85) return 'Niche Authority';
  return 'Audience Builder';
}

function deriveBrandReadiness(analysis: any) {
  const tier = deriveTier(analysis);
  if (tier === 'Celebrity' || tier === 'Enterprise') return { label: 'Enterprise Brand Ready', reason: 'Large audience scale and established signals' };
  if (tier === 'Mid-Tier') return { label: 'Mid-Tier Sponsorship Ready', reason: 'Good audience scale and engagement' };
  if (tier === 'Emerging') return { label: 'Emerging Partner', reason: 'Growing signals; suitable for targeted campaigns' };
  if (tier === 'Nano') return { label: 'Not Commercially Eligible', reason: 'Limited scale; commercial readiness is low' };
  return { label: 'Not Commercially Eligible', reason: 'Insufficient data' };
}

export default generateDNAMetrics;
