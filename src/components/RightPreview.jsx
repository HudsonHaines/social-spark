import React, { forwardRef, useMemo, useState, useCallback, useEffect } from "react";
import { useBrands } from "../data/brands";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

const RightPreview = forwardRef(function RightPreview(
  { user, post, setPost, videoRef },
  ref
) {
  const { brandMap } = useBrands(user?.id);

  const isFB = post?.platform === "facebook";
  const isIG = post?.platform === "instagram";

  // Merge selected brand row with per-post overrides
  const merged = useMemo(() => {
    const row = post?.brandId ? brandMap.get(post.brandId) : null;

    const nameFromRow = row?.fb_name || "";
    const igFromRow = row?.ig_username || "";
    const verifiedFromRow = !!row?.verified;

    const avatarFromRow = isFB ? (row?.fb_avatar_url || "") : (row?.ig_avatar_url || "");
    const avatar = post?.brand?.profileSrc || avatarFromRow || "";

    const displayName = isFB
      ? (post?.brand?.name || nameFromRow || "Facebook Page")
      : ("@" + (post?.brand?.username || igFromRow || "instagram_user").replace(/^@/, ""));

    const verified = typeof post?.brand?.verified === "boolean"
      ? post.brand.verified
      : verifiedFromRow;

    return { displayName, avatar, verified };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    brandMap,
    post?.brandId,
    post?.brand?.name,
    post?.brand?.username,
    post?.brand?.profileSrc,
    post?.brand?.verified,
    isFB,
  ]);

  // Active index control for images: use parent state if available, else local
  const hasSetter = typeof setPost === "function";
  const [localIndex, setLocalIndex] = useState(post?.activeIndex || 0);
  const activeIndex = Math.min(
    Math.max(0, hasSetter ? (post?.activeIndex || 0) : localIndex),
    Math.max(0, (post?.media?.length || 1) - 1)
  );

  useEffect(() => {
    if (!hasSetter) setLocalIndex(post?.activeIndex || 0);
  }, [post?.activeIndex, hasSetter]);

  const setActiveIndex = useCallback((next) => {
    if (hasSetter) {
      setPost((p) => ({ ...(p || {}), activeIndex: next }));
    } else {
      setLocalIndex(next);
    }
  }, [hasSetter, setPost]);

  const goPrev = useCallback(() => {
    const total = post?.media?.length || 1;
    setActiveIndex((activeIndex - 1 + total) % total);
  }, [activeIndex, post?.media?.length, setActiveIndex]);

  const goNext = useCallback(() => {
    const total = post?.media?.length || 1;
    setActiveIndex((activeIndex + 1) % total);
  }, [activeIndex, post?.media?.length, setActiveIndex]);

  // Keyboard arrows for image carousels
  useEffect(() => {
    if (!(post?.media?.length > 1) || post?.type === "video") return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [post?.media?.length, post?.type, goPrev, goNext]);

  const hasLink =
    !!(post?.link?.headline || post?.link?.subhead || post?.link?.url);

  // Per-image headline
  const perImageHeadline =
    post?.mediaMeta?.[post?.activeIndex || 0]?.headline?.trim();

  return (
    <div className="p-4" ref={ref}>
      <div className="mx-auto w-full max-w-[420px] rounded-2xl shadow border bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
            {merged.avatar ? (
              <img src={merged.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold truncate">{merged.displayName}</span>
              {merged.verified ? <CheckCircle2 className="w-4 h-4" /> : null}
            </div>
            <span className="text-xs text-gray-500">
              {isFB ? "Sponsored" : "• Following"}
            </span>
          </div>
        </div>

        {/* Post copy ABOVE image, like FB */}
        {post?.caption ? (
          <div className="px-3 pb-3">
            <p className="text-sm whitespace-pre-wrap leading-snug">
              {post.caption}
            </p>
          </div>
        ) : null}

        {/* Media */}
        <div className="relative w-full select-none">
          {/* Aspect container sets the box, media fits inside */}
          <div className={`${aspectClassFor(post)} w-full bg-black`}>
            {post?.type === "video" && post?.videoSrc ? (
              <video
                ref={videoRef}
                src={post.videoSrc}
                className="w-full h-full object-contain"
                muted={!!post.muted}
                autoPlay={!!post.playing}
                loop
                controls
                playsInline
              />
            ) : post?.media?.length ? (
              <img
                src={post.media[activeIndex]}
                className="w-full h-full object-cover"
                alt=""
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-slate-100" />
            )}
          </div>

          {/* Arrows and dots for image carousels only */}
          {post?.type !== "video" && (post?.media?.length || 0) > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow p-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow p-2"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {post.media.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    className={
                      "h-1.5 rounded-full transition-all " +
                      (i === activeIndex ? "w-6 bg-white" : "w-3 bg-white/60")
                    }
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* FB link card: full width, flush under media, uses per-image headline if set */}
        {isFB && hasLink ? (
          <FBLinkCard
            url={post?.link?.url}
            headline={perImageHeadline || post?.link?.headline}
            subhead={post?.link?.subhead}
            cta={post?.link?.cta}
          />
        ) : null}
      </div>
    </div>
  );
});

export default RightPreview;

// Aspect helper
function aspectClassFor(post) {
  const isFB = post?.platform === "facebook";
  if (isFB) {
    return post?.fbSquare ? "aspect-square" : "aspect-video"; // 1:1 or 16:9
  }
  // Instagram
  return post?.isReel ? "aspect-[9/16]" : "aspect-square";
}

// Domain helper that accepts bare domains
function domainFromUrl(url) {
  try {
    if (!url) return "";
    const normalized = /^[a-zA-Z]+:\/\//.test(url) ? url : `https://${url}`;
    const u = new URL(normalized);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Facebook-style link preview card (all content inside grey box, full width, flush) */
function FBLinkCard({ url, headline, subhead, cta }) {
  const domain = domainFromUrl(url) || "example.com";

  return (
    <div className="w-full border-t">
      {/* Grey box that holds everything */}
      <div className="w-full bg-slate-100 px-3 py-3">
        {/* Domain */}
        <div className="text-[11px] text-slate-600 uppercase tracking-wide">
          {domain}
        </div>

        {/* Headline */}
        <div className="mt-1 text-sm font-semibold leading-snug">
          {headline || "Link headline"}
        </div>

        {/* Subhead */}
        <div className="mt-1 text-sm text-slate-700 leading-snug">
          {subhead || "Link description goes here with one or two short lines."}
        </div>

        {/* CTA aligned right, like FB */}
        {cta ? (
          <div className="mt-2 flex justify-end">
            <button type="button" className="btn">{cta}</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
