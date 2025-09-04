import { useMemo } from 'react';

// Constants
export const CTA_OPTIONS = ["Learn More","Shop Now","Sign Up","Download","Book Now","Contact Us"];
export const VALID_PLATFORMS = ["facebook", "instagram"];
export const VALID_TYPES = ["single", "carousel", "video", "reel"];
export const VALID_ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9", "1.91:1"];

// Default objects (frozen for performance)
export const emptyBrand = Object.freeze({ 
  id: null, name: "Your Brand", username: "yourbrand", profileSrc: "", verified: false 
});
export const emptyLink = Object.freeze({ 
  headline: "", subhead: "", url: "", cta: CTA_OPTIONS[0] 
});
export const emptyMetrics = Object.freeze({ 
  likes: 128, comments: 24, shares: 12, saves: 9, views: 10234 
});

const emptyMediaMetaEntry = Object.freeze({ headline: "", subhead: "" });

export const emptyPost = Object.freeze({
  id: null,
  platform: "facebook",      // "facebook" | "instagram"
  type: "single",            // "single" | "carousel" | "video"
  isReel: false,
  caption: "Write your post copy here...",
  media: [],
  mediaMeta: [],             // per-image meta, same length as media
  videoSrc: "",
  muted: true,
  playing: false,
  activeIndex: 0,
  fbAspectRatio: "1:1",      // "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1" for Facebook
  fbAdFormat: "feed-1:1",    // Combined format like "feed-1:1", "story-9:16", etc.
  fbAdType: "feed",          // "feed" | "video" | "story" | "reels" | etc.
  igAdFormat: "feed-1:1",    // Instagram ad format like "feed-1:1", "story-9:16", etc.
  igAdType: "feed",          // "feed" | "story" | "reels" | "explore" | "shop" | "carousel"
  link: { ...emptyLink },
  brand: { ...emptyBrand },
  metrics: { ...emptyMetrics },
  brandId: null,             // selected Supabase brand row id
});

// Validation helpers
const isValidString = (val) => typeof val === 'string';
const isValidArray = (val) => Array.isArray(val);
const isValidObject = (val) => val && typeof val === 'object';
const isValidNumber = (val) => Number.isFinite(val);

// Fast validation check
function isValidPost(post) {
  return post && 
    typeof post === 'object' && 
    VALID_PLATFORMS.includes(post.platform) &&
    VALID_TYPES.includes(post.type) &&
    isValidArray(post.media) &&
    isValidString(post.caption);
}

// Helper functions for normalization
function normalizeMedia(media) {
  return isValidArray(media) ? media.filter(Boolean).slice(0, 5) : [];
}

function normalizeMediaMeta(mediaMeta, mediaLength) {
  const srcMeta = isValidArray(mediaMeta) ? mediaMeta : [];
  return Array.from({ length: mediaLength }, (_, i) => ({
    headline: isValidString(srcMeta[i]?.headline) ? srcMeta[i].headline : "",
    subhead: isValidString(srcMeta[i]?.subhead) ? srcMeta[i].subhead : ""
  }));
}

function normalizeActiveIndex(activeIndex, mediaLength) {
  return isValidNumber(activeIndex) 
    ? Math.max(0, Math.min(activeIndex, Math.max(0, mediaLength - 1)))
    : 0;
}

function normalizeAspectRatio(src) {
  if (VALID_ASPECT_RATIOS.includes(src.fbAspectRatio)) {
    return src.fbAspectRatio;
  } else if (src.fbSquare !== undefined) {
    // Migrate old fbSquare to new fbAspectRatio
    return src.fbSquare ? "1:1" : "16:9";
  }
  return "1:1"; // default
}

function normalizeLink(link) {
  const linkSrc = isValidObject(link) ? link : {};
  return {
    headline: isValidString(linkSrc.headline) ? linkSrc.headline : "",
    subhead: isValidString(linkSrc.subhead) ? linkSrc.subhead : "",
    url: isValidString(linkSrc.url) ? linkSrc.url.trim() : "",
    cta: CTA_OPTIONS.includes(linkSrc.cta) ? linkSrc.cta : CTA_OPTIONS[0],
  };
}

function normalizeBrand(brand, brandId) {
  const brandSrc = isValidObject(brand) ? brand : {};
  const normalizedBrandId =
    (typeof brandId === "string" && brandId.length ? brandId : null) ??
    (typeof brandSrc.id === "string" && brandSrc.id.length ? brandSrc.id : null);

  return {
    id: (typeof brandSrc.id === "string" && brandSrc.id.length ? brandSrc.id : null) ?? normalizedBrandId,
    name: isValidString(brandSrc.name) ? brandSrc.name : emptyBrand.name,
    username: isValidString(brandSrc.username) ? brandSrc.username : emptyBrand.username,
    profileSrc: isValidString(brandSrc.profileSrc) ? brandSrc.profileSrc : "",
    verified: Boolean(brandSrc.verified),
  };
}

function normalizeMetrics(metrics) {
  const metricsSrc = isValidObject(metrics) ? metrics : {};
  return {
    likes: isValidNumber(metricsSrc.likes) ? metricsSrc.likes : emptyMetrics.likes,
    comments: isValidNumber(metricsSrc.comments) ? metricsSrc.comments : emptyMetrics.comments,
    shares: isValidNumber(metricsSrc.shares) ? metricsSrc.shares : emptyMetrics.shares,
    saves: isValidNumber(metricsSrc.saves) ? metricsSrc.saves : emptyMetrics.saves,
    views: isValidNumber(metricsSrc.views) ? metricsSrc.views : emptyMetrics.views,
  };
}

// Optimized shape normalization with early returns
export function ensurePostShape(p) {
  // Early return for already valid posts
  if (isValidPost(p)) return p;
  
  const src = p && typeof p === "object" ? p : {};
  const result = { ...emptyPost };

  // Basic properties
  result.id = src.id ?? result.id;
  result.platform = VALID_PLATFORMS.includes(src.platform) ? src.platform : "facebook";
  result.type = VALID_TYPES.includes(src.type) ? src.type : null;
  result.isReel = Boolean(src.isReel);
  result.caption = isValidString(src.caption) ? src.caption : result.caption;

  // Media processing
  result.media = normalizeMedia(src.media);
  result.mediaMeta = normalizeMediaMeta(src.mediaMeta, result.media.length);

  // Video properties
  result.videoSrc = isValidString(src.videoSrc) ? src.videoSrc : "";
  result.muted = src.muted ?? true;
  result.playing = src.playing ?? false;
  result.activeIndex = normalizeActiveIndex(src.activeIndex, result.media.length);

  // Aspect ratios and formats
  result.fbAspectRatio = normalizeAspectRatio(src);
  result.fbAdFormat = isValidString(src.fbAdFormat) ? src.fbAdFormat : "feed-1:1";
  result.fbAdType = isValidString(src.fbAdType) ? src.fbAdType : "feed";
  result.igAdFormat = isValidString(src.igAdFormat) ? src.igAdFormat : "feed-1:1";
  result.igAdType = isValidString(src.igAdType) ? src.igAdType : "feed";

  // Complex objects
  result.link = normalizeLink(src.link);
  result.brand = normalizeBrand(src.brand, src.brandId);
  result.brandId = result.brand.id;
  result.metrics = normalizeMetrics(src.metrics);

  // Infer type if not set
  if (!result.type) {
    if (result.isReel && result.videoSrc) {
      result.type = "reel";
    } else if (result.videoSrc) {
      result.type = "video";
    } else if (result.media.length > 1) {
      result.type = "carousel";
    } else {
      result.type = "single";
    }
  }
  
  // Auto-configure Reels properties
  if (result.isReel || result.type === "reel") {
    result.isReel = true;
    result.type = "reel";
    // Force 9:16 aspect ratio for Reels
    result.fbAspectRatio = "9:16";
    if (result.platform === "instagram") {
      result.igAdFormat = "reels-9:16";
      result.igAdType = "reels";
    } else {
      result.fbAdFormat = "reels-9:16";
      result.fbAdType = "reels";
    }
  }

  return result;
}

// Hook for memoized post normalization
export function useNormalizedPost(post) {
  return useMemo(() => ensurePostShape(post), [post]);
}