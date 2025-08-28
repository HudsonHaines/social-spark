import React, { forwardRef, useMemo } from "react";
import { ensurePostShape } from "../data/postShape";

const cx = (...a) => a.filter(Boolean).join(" ");

function safeParseUrl(input) {
  const raw = (input || "").trim();
  if (!raw) {
    return {
      href: "",
      host: "",
      origin: "",
      pathname: "",
      params: new URLSearchParams(""),
    };
  }
  try {
    const str = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(str);
    return {
      href: u.href,
      host: u.host,
      origin: u.origin,
      pathname: u.pathname,
      params: u.searchParams,
    };
  } catch {
    return {
      href: "",
      host: "",
      origin: "",
      pathname: "",
      params: new URLSearchParams(""),
    };
  }
}

const RightPreview = forwardRef(function RightPreview(
  { post: rawPost, setPost, mode, saveAsPng, savingImg, videoRef },
  ref
) {
  const post = useMemo(() => ensurePostShape(rawPost || {}), [rawPost]);

  const isFB = post.platform === "facebook";
  const isIG = post.platform === "instagram";

  const mediaCount = (post.media || []).length;
  const isCarousel = post.type !== "video" && mediaCount > 1;
  const isSingle = post.type !== "video" && mediaCount <= 1;
  const hasVideo = post.type === "video" && !!post.videoSrc;

  const urlParts = useMemo(() => safeParseUrl(post.link?.url || ""), [post.link?.url]);
  const displayHost = urlParts.host || (post.link?.url || "").replace(/^https?:\/\//, "");

  function goto(delta) {
    if (!isCarousel) return;
    const total = mediaCount;
    const next = ((post.activeIndex || 0) + delta + total) % total;
    setPost?.((p) => ({ ...p, activeIndex: next }));
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="font-medium text-app-strong">Preview</div>
        {mode === "present" ? null : (
          <button className="btn-outline" onClick={saveAsPng} disabled={savingImg}>
            Export PNG
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Outer phone/card */}
        <div
          ref={ref}
          className={cx(
            "preview-frame mx-auto bg-white",
            isFB ? "w-[680px] max-w-full" : "w-[420px] max-w-full"
          )}
        >
          {/* Header (brand) */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-app">
            <div className="w-10 h-10 rounded-full bg-[#e2e8f0] overflow-hidden">
              {post.brand?.profileSrc ? (
                <img src={post.brand.profileSrc} className="w-full h-full object-cover" alt="" />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <div className="font-medium truncate">
                  {post.brand?.name || (isIG ? `@${post.brand?.username || "instagram"}` : "Facebook Page")}
                </div>
                {post.brand?.verified ? <span title="Verified">✓</span> : null}
              </div>
              <div className="text-xs text-app-muted">
                {isFB ? "Sponsored" : `@${post.brand?.username || "instagram"}`}
              </div>
            </div>
          </div>

          {/* Caption above media (Facebook style) */}
          {post.caption ? (
            <div className="px-4 pb-3 text-sm whitespace-pre-wrap">{post.caption}</div>
          ) : null}

          {/* Media area */}
          <div className={cx(isFB ? "" : "px-0")}>
            {/* Single image */}
            {isSingle &&
              (post.media?.[0] ? (
                <div
                  className={cx(
                    "w-full",
                    isFB && post.fbSquare ? "aspect-square" : isFB ? "aspect-[16/9]" : "aspect-square"
                  )}
                >
                  <img src={post.media[0]} className="w-full h-full object-cover" alt="" />
                </div>
              ) : (
                <div
                  className={cx(
                    "w-full bg-[#f1f5f9] flex items-center justify-center text-[#94a3b8]",
                    isFB && post.fbSquare ? "aspect-square" : isFB ? "aspect-[16/9]" : "aspect-square"
                  )}
                >
                  No media
                </div>
              ))}

            {/* Carousel */}
            {isCarousel && (
              <div className={cx("relative w-full", isFB ? "aspect-[16/9]" : "aspect-square")}>
                <img
                  src={post.media[post.activeIndex || 0]}
                  className="w-full h-full object-cover"
                  alt=""
                />
                <button
                  type="button"
                  className="carousel-arrow carousel-arrow--left"
                  onClick={() => goto(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="carousel-arrow carousel-arrow--right"
                  onClick={() => goto(1)}
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full">
                  {(post.activeIndex || 0) + 1} / {mediaCount}
                </div>
              </div>
            )}

            {/* Video */}
            {hasVideo && (
              <div className={cx("relative w-full", isFB ? "aspect-[16/9]" : "aspect-square")}>
                <video
                  ref={videoRef}
                  src={post.videoSrc}
                  className="w-full h-full object-cover"
                  muted={post.muted}
                  autoPlay={false}
                  controls
                />
              </div>
            )}
          </div>

          {/* Facebook link preview box */}
          {isFB && (post.link?.headline || post.link?.subhead || post.link?.url) ? (
            <div className="px-4 pb-4">
              <div className="rounded-[12px] border border-app bg-[#f1f5f9] overflow-hidden">
                <div className="px-3 pt-3 pb-2">
                  {post.link?.headline ? (
                    <div className="text-sm font-medium leading-snug">{post.link.headline}</div>
                  ) : null}
                  {post.link?.subhead ? (
                    <div className="text-[13px] text-[#64748b] mt-0.5 leading-snug">
                      {post.link.subhead}
                    </div>
                  ) : null}
                </div>
                <div className="px-3 py-2 border-t border-app flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wide text-[#94a3b8] truncate">
                    {displayHost || "example.com"}
                  </div>
                  <div className="text-[12px] font-medium">{post.link?.cta || "Learn More"}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default RightPreview;
