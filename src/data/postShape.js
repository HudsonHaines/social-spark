// Single source of truth for the post shape used across the app.

export const CTA_OPTIONS = ["Learn More","Shop Now","Sign Up","Download","Book Now","Contact Us"];

export const emptyBrand = { name: "Your Brand", username: "yourbrand", profileSrc: "", verified: false };
export const emptyLink = { headline: "", subhead: "", url: "", cta: CTA_OPTIONS[0] };
export const emptyMetrics = { likes: 128, comments: 24, shares: 12, saves: 9, views: 10234 };

export const emptyPost = {
  id: null,
  platform: "facebook",      // "facebook" | "instagram"
  type: "single",            // "single" | "carousel" | "video"
  isReel: false,
  caption: "Write your post copy here...",
  media: [],
  videoSrc: "",
  muted: true,
  playing: false,
  activeIndex: 0,
  fbSquare: true,
  link: { ...emptyLink },
  brand: { ...emptyBrand },
  metrics: { ...emptyMetrics },
};

// Ensure any incoming object conforms to the expected shape
export function ensurePostShape(p) {
  const base = { ...emptyPost };
  const src = p && typeof p === "object" ? p : {};

  base.id = src.id ?? base.id;
  base.platform = src.platform === "instagram" ? "instagram" : "facebook";
  base.type = ["single","carousel","video"].includes(src.type) ? src.type : "single";
  base.isReel = !!src.isReel;
  base.caption = typeof src.caption === "string" ? src.caption : base.caption;
  base.media = Array.isArray(src.media) ? src.media.filter(Boolean).slice(0, 5) : [];
  base.videoSrc = typeof src.videoSrc === "string" ? src.videoSrc : "";
  base.muted = src.muted ?? true;
  base.playing = src.playing ?? false;
  base.activeIndex = Number.isFinite(src.activeIndex) ? Math.max(0, Math.min(src.activeIndex, (base.media.length || 1) - 1)) : 0;
  base.fbSquare = src.fbSquare ?? true;

  const link = src.link && typeof src.link === "object" ? src.link : {};
  base.link = {
    headline: typeof link.headline === "string" ? link.headline : "",
    subhead: typeof link.subhead === "string" ? link.subhead : "",
    url: typeof link.url === "string" ? link.url : "",
    cta: CTA_OPTIONS.includes(link.cta) ? link.cta : CTA_OPTIONS[0],
  };

  const brand = src.brand && typeof src.brand === "object" ? src.brand : {};
  base.brand = {
    name: typeof brand.name === "string" ? brand.name : emptyBrand.name,
    username: typeof brand.username === "string" ? brand.username : emptyBrand.username,
    profileSrc: typeof brand.profileSrc === "string" ? brand.profileSrc : "",
    verified: !!brand.verified,
  };

  const metrics = src.metrics && typeof src.metrics === "object" ? src.metrics : {};
  base.metrics = {
    likes: Number.isFinite(metrics.likes) ? metrics.likes : emptyMetrics.likes,
    comments: Number.isFinite(metrics.comments) ? metrics.comments : emptyMetrics.comments,
    shares: Number.isFinite(metrics.shares) ? metrics.shares : emptyMetrics.shares,
    saves: Number.isFinite(metrics.saves) ? metrics.saves : emptyMetrics.saves,
    views: Number.isFinite(metrics.views) ? metrics.views : emptyMetrics.views,
  };

  // if media length > 1, force carousel unless explicitly video
  if (base.type !== "video") base.type = base.media.length > 1 ? "carousel" : "single";
  return base;
}
