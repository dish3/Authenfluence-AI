import type { RawChannelSignals } from "./scoring";
import { computeScore, inferCreatorCategories } from "./scoring";
import { generatePlatformFallbackAnalysis, analyzeTwitterTweetsAI } from "./gemini.server";
import { detectFraudSignals } from "./fraud";

let cachedBearerToken: string | null = null;




async function getTwitterBearerToken(consumerKey: string, consumerSecret: string): Promise<string> {
  if (cachedBearerToken) return cachedBearerToken;
  
  const credentials = `${encodeURIComponent(consumerKey)}:${encodeURIComponent(consumerSecret)}`;
  const base64Credentials = btoa(credentials);
  
  console.log("[Twitter OAuth] Fetching Bearer token...");
  const res = await fetch("https://api.twitter.com/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${base64Credentials}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: "grant_type=client_credentials"
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitter Authentication failed: ${res.status} ${text}`);
  }
  
  const data = await res.json() as any;
  cachedBearerToken = data.access_token;
  console.log("[Twitter OAuth] Bearer token retrieved successfully.");
  return data.access_token;
}

async function twApi<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.TWITTER_CONSUMER_KEY;
  const secret = process.env.TWITTER_CONSUMER_SECRET;
  
  if (!key || !secret) {
    throw new Error("Twitter API keys are not defined in environment variables.");
  }
  
  const token = await getTwitterBearerToken(key, secret);
  
  const url = new URL(`https://api.twitter.com/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  console.log(`[Twitter API Request] Calling endpoint: ${path}`);
  const res = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitter API error on ${path} (${res.status}): ${text.slice(0, 200)}`);
  }
  
  return res.json() as Promise<T>;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description: string;
  profile_image_url?: string;
  profile_banner_url?: string;
  verified: boolean;
  created_at?: string;
  location?: string;
  url?: string;
  entities?: any;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export async function fetchTwitterUser(username: string): Promise<TwitterUser> {
  const cleanUsername = username.replace(/^@/, "").trim();
  const res = await twApi<any>(`2/users/by/username/${cleanUsername}`, {
    "user.fields": "public_metrics,profile_image_url,profile_banner_url,description,verified,created_at,url,entities,location"
  });
  
  if (!res?.data) {
    throw new Error(`Twitter user "${cleanUsername}" not found.`);
  }
  
  return res.data as TwitterUser;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
}

export async function fetchTwitterTweets(userId: string): Promise<TwitterTweet[]> {
  const res = await twApi<any>(`2/users/${userId}/tweets`, {
    "tweet.fields": "public_metrics,created_at,text",
    "max_results": "10"
  });
  
  return (res?.data || []) as TwitterTweet[];
}

export async function analyzeTwitterCreator(username: string): Promise<any> {
  const cleanUsername = username.replace(/^@/, "").trim();
  console.log(`[Twitter Fetch Started] Starting real-time audit for: ${cleanUsername}`);
  
  // 1. Fetch user info
  const user = await fetchTwitterUser(cleanUsername);
  console.log(`[Twitter User Found] Name: ${user.name}, Username: ${user.username}, ID: ${user.id}`);
  console.log(`[Twitter Followers] Count: ${user.public_metrics?.followers_count || 0}`);

  // 2. Fetch tweets
  let tweets: TwitterTweet[] = [];
  try {
    tweets = await fetchTwitterTweets(user.id);
    console.log(`[Twitter Tweets Retrieved] Count: ${tweets.length}`);
  } catch (err) {
    console.warn(`[Twitter Real-Time Analysis] Failed to fetch tweets:`, err);
  }

  const followers = user.public_metrics?.followers_count || 0;
  const totalTweets = user.public_metrics?.tweet_count || 0;
  
  // 3. Map to RawChannelSignals
  const mappedTweets = tweets.map(t => {
    const metrics = t.public_metrics || { like_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0 };
    return {
      videoId: t.id,
      publishedAt: t.created_at || new Date().toISOString(),
      views: metrics.impression_count || Math.max(10, metrics.like_count * 15),
      likes: metrics.like_count || 0,
      comments: (metrics.reply_count || 0) + (metrics.quote_count || 0),
      categoryId: "Lifestyle"
    };
  });

  const avgLikes = mappedTweets.length
    ? Math.round(mappedTweets.reduce((acc, t) => acc + t.likes, 0) / mappedTweets.length)
    : 0;

  const rawSignals: RawChannelSignals = {
    subscribers: followers,
    totalVideos: totalTweets,
    totalViews: mappedTweets.reduce((acc, t) => acc + t.views, 0),
    recentVideos: mappedTweets
  };

  // 4. Compute Trust Score
  const commentSignals = await analyzeTwitterTweetsAI(tweets, user.username);
  const score = computeScore(rawSignals, commentSignals);

  // 5. Detect Fraud Signals
  const fraudSignals = detectFraudSignals(score, commentSignals, {
    subscribers: followers,
    videoCount: totalTweets,
    fandomDetected: commentSignals.fandomDetected,
  });

  // Extract website url
  let websiteUrl = user.url || "";
  if (user.entities?.url?.urls?.length) {
    websiteUrl = user.entities.url.urls[0].expanded_url || user.entities.url.urls[0].url || websiteUrl;
  }

  // 6. Call Gemini to generate a rich analysis grounded in the real metrics
  const realData = {
    followers,
    avgLikes,
    totalPosts: totalTweets,
    score: score.finalScore,
    breakdown: score.breakdown,
    displayName: user.name,
    username: user.username,
    profile_image_url: user.profile_image_url,
    profile_banner_url: user.profile_banner_url,
    followingCount: user.public_metrics?.following_count || 0,
    verified: user.verified,
    createdAt: user.created_at || "",
    bio: user.description || "",
    location: user.location || "",
    websiteUrl
  };

  const analysis = await generatePlatformFallbackAnalysis(user.username, "twitter", realData);
  console.log(`[Twitter Analysis Complete] Successfully resolved Twitter creator: ${user.username} with score ${score.finalScore}/100`);

  // Set dataSource and other specific live parameters
  return {
    ...analysis,
    displayName: user.name,
    avatarUrl: user.profile_image_url,
    bannerUrl: user.profile_banner_url,
    followers,
    avgLikes,
    totalPosts: totalTweets,
    score: score.finalScore,
    breakdown: score.breakdown,
    dataSource: "live" as const,
    isVerified: user.verified,
    followingCount: user.public_metrics?.following_count || 0,
    bio: user.description || "",
    location: user.location || "",
    createdAt: user.created_at || "",
    websiteUrl,
    fraudSignals
  };

}
