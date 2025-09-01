// Single source of truth for the post shape used across the app.

export const CTA_OPTIONS = ["Learn More","Shop Now","Sign Up","Download","Book Now","Contact Us"];

// note: now includes id
export const emptyBrand = { id: null, name: "Your Brand", username: "yourbrand", profileSrc: "", verified: false };
export const emptyLink = { headline: "", subhead: "", url: "", cta: CTA_OPTIONS[0] };
export const emptyMetrics = { likes: 128, comments: 24, shares: 12, saves: 9, views: 10234 };

// one entry per image
const emptyMediaMetaEntry = { headline: "" };

export const emptyPost = {
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
};

// Ensure any incoming object conforms to the expected shape
export function ensurePostShape(p) {
  const base = { ...emptyPost };
  const src = p && typeof p === "object" ? p : {};
  
  base.id = src.id ?? base.id;
  base.platform = src.platform === "instagram" ? "instagram" : "facebook";

  // Respect explicit type if valid. Do not override later.
  const validTypes = ["single","carousel","video"];
  base.type = validTypes.includes(src.type) ? src.type : null;

  base.isReel = !!src.isReel;
  base.caption = typeof src.caption === "string" ? src.caption : base.caption;

  // media
  const incomingMedia = Array.isArray(src.media) ? src.media.filter(Boolean).slice(0, 5) : [];
  base.media = incomingMedia;

  // mediaMeta — normalize to same length as media
  const srcMeta = Array.isArray(src.mediaMeta) ? src.mediaMeta : [];
  const normalizedMeta = [];
  for (let i = 0; i < base.media.length; i++) {
    const m = srcMeta[i] && typeof srcMeta[i] === "object" ? srcMeta[i] : {};
    normalizedMeta[i] = {
      headline: typeof m.headline === "string" ? m.headline : "",
    };
  }
  base.mediaMeta = normalizedMeta;

  base.videoSrc = typeof src.videoSrc === "string" ? src.videoSrc : "";
  base.muted = src.muted ?? true;
  base.playing = src.playing ?? false;
  base.activeIndex = Number.isFinite(src.activeIndex)
    ? Math.max(0, Math.min(src.activeIndex, (base.media.length || 1) - 1))
    : 0;

  // Handle both old fbSquare and new fbAspectRatio for backward compatibility
  const validAspectRatios = ["1:1", "4:5", "9:16", "16:9", "1.91:1"];
  if (validAspectRatios.includes(src.fbAspectRatio)) {
    base.fbAspectRatio = src.fbAspectRatio;
  } else if (src.fbSquare !== undefined) {
    // Migrate old fbSquare to new fbAspectRatio
    base.fbAspectRatio = src.fbSquare ? "1:1" : "16:9";
  } else {
    base.fbAspectRatio = "1:1"; // default
  }

  // Handle new Facebook ad format fields
  base.fbAdFormat = typeof src.fbAdFormat === "string" ? src.fbAdFormat : "feed-1:1";
  base.fbAdType = typeof src.fbAdType === "string" ? src.fbAdType : "feed";

  // Handle Instagram ad format fields
  base.igAdFormat = typeof src.igAdFormat === "string" ? src.igAdFormat : "feed-1:1";
  base.igAdType = typeof src.igAdType === "string" ? src.igAdType : "feed";

  const link = src.link && typeof src.link === "object" ? src.link : {};
  base.link = {
    headline: typeof link.headline === "string" ? link.headline : "",
    subhead: typeof link.subhead === "string" ? link.subhead : "",
    url: typeof link.url === "string" ? link.url.trim() : "",
    cta: CTA_OPTIONS.includes(link.cta) ? link.cta : CTA_OPTIONS[0],
  };

  // brand and brandId: keep both fields present and in sync
  const brandSrc = src.brand && typeof src.brand === "object" ? src.brand : {};
  const normalizedBrandId =
    (typeof src.brandId === "string" && src.brandId.length ? src.brandId : null) ??
    (typeof brandSrc.id === "string" && brandSrc.id.length ? brandSrc.id : null);

  base.brand = {
    id: (typeof brandSrc.id === "string" && brandSrc.id.length ? brandSrc.id : null) ?? normalizedBrandId,
    name: typeof brandSrc.name === "string" ? brandSrc.name : emptyBrand.name,
    username: typeof brandSrc.username === "string" ? brandSrc.username : emptyBrand.username,
    profileSrc: typeof brandSrc.profileSrc === "string" ? brandSrc.profileSrc : "",
    verified: !!brandSrc.verified,
  };

  // Sync brandId after brand
  base.brandId = normalizedBrandId ?? base.brand.id ?? null;

  const metrics = src.metrics && typeof src.metrics === "object" ? src.metrics : {};
  base.metrics = {
    likes: Number.isFinite(metrics.likes) ? metrics.likes : emptyMetrics.likes,
    comments: Number.isFinite(metrics.comments) ? metrics.comments : emptyMetrics.comments,
    shares: Number.isFinite(metrics.shares) ? metrics.shares : emptyMetrics.shares,
    saves: Number.isFinite(metrics.saves) ? metrics.saves : emptyMetrics.saves,
    views: Number.isFinite(metrics.views) ? metrics.views : emptyMetrics.views,
  };

  // Infer type only if not explicitly set
  if (!base.type || !validTypes.includes(base.type)) {
    base.type = base.videoSrc
      ? "video"
      : base.media.length > 1
      ? "carousel"
      : "single";
  }

  return base;
}