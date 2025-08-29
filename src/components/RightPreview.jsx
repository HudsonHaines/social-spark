// src/components/RightPreview.jsx
import React, { forwardRef, useCallback, useEffect, useMemo } from "react";
import { ensurePostShape } from "../data/postShape";

const cx = (...a) => a.filter(Boolean).join(" ");

const RightPreview = forwardRef(function RightPreview(
  {
    post,
    setPost,          // required
    mode = "create",  // "create" | "present"
    saveAsPng,
    savingImg = false,
    videoRef,         // optional
  },
  previewRef
) {
  const p = useMemo(() => ensurePostShape(post || {}), [post]);
  const total = p.media?.length || 0;
  const idx = p.activeIndex || 0;

  // IG always square; FB square if fbSquare true, else 16:9
  const isSquare = p.platform === "instagram" || (p.platform === "facebook" && p.fbSquare);

  // Fit to viewport: use smaller vmin cap in editor, larger in presenter
  const maxVmin = mode === "present" ? 96 : 80;       // percent of vmin
  const maxPx = mode === "present" ? 720 : 560;       // hard pixel cap
  const wrapperStyle = { width: "100%", maxWidth: `min(${maxPx}px, ${maxVmin}vmin)` };

  // Clamp active index when media count changes
  useEffect(() => {
    const count = p.media?.length || 0;
    if (idx > Math.max(0, count - 1)) {
      setPost(prev => ({ ...ensurePostShape(prev), activeIndex: Math.max(0, count - 1) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.media?.length]);

  // Carousel controls
  const goPrev = useCallback(() => {
    setPost(prev => {
      const cur = ensurePostShape(prev);
      const t = cur.media?.length || 0;
      if (t < 2) return cur;
      const next = ((cur.activeIndex || 0) - 1 + t) % t;
      return { ...cur, activeIndex: next };
    });
  }, [setPost]);

  const goNext = useCallback(() => {
    setPost(prev => {
      const cur = ensurePostShape(prev);
      const t = cur.media?.length || 0;
      if (t < 2) return cur;
      const next = ((cur.activeIndex || 0) + 1) % t;
      return { ...cur, activeIndex: next };
    });
  }, [setPost]);

  // Arrow keys in present mode
  useEffect(() => {
    if (mode !== "present") return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, goPrev, goNext]);

  return (
    <div className={cx(p.platform === "instagram" ? "ig-ui" : "fb-ui")}>
      {/* actions */}
      <div className="flex justify-end mb-2">
        <button className="btn-outline" disabled={savingImg} onClick={saveAsPng}>
          {savingImg ? "Rendering..." : "Export PNG"}
        </button>
      </div>

      {/* main card */}
      <div className="mx-auto" style={wrapperStyle}>
        <div ref={previewRef} className="card p-0 overflow-hidden w-full">
          {/* header */}
          <div className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
              {p.brand?.profileSrc ? (
                <img src={p.brand.profileSrc} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="brand-name font-medium truncate">
                {p.brand?.name || p.brand?.username || "Brand"}
                {p.brand?.verified ? <span className="ml-1 align-middle text-sky-500">✓</span> : null}
              </div>
              <div className="meta text-xs text-slate-500 truncate">
                {p.platform === "instagram" ? `@${p.brand?.username || "username"}` : "Facebook · Now"}
              </div>
            </div>
          </div>

          {/* caption */}
          {p.caption ? (
            <div className="px-3 pb-3">
              <div className="whitespace-pre-wrap text-sm">{p.caption}</div>
            </div>
          ) : null}

          {/* media area */}
          <div className="w-full">
            <div className={cx("relative border-t border-b bg-black/5", isSquare ? "aspect-square" : "aspect-video")}>
              {/* content */}
              {p.type === "video" && p.videoSrc ? (
                <video
                  ref={videoRef}
                  src={p.videoSrc}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay={p.playing}
                  muted={p.muted}
                  loop
                  playsInline
                />
              ) : total > 0 ? (
                <img
                  src={p.media[idx]}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">
                  Add media
                </div>
              )}

              {/* per-image headline */}
              {p.type !== "video" && total > 0 && (p.mediaMeta?.[idx]?.headline || "").trim() ? (
                <div className="absolute left-3 top-3 bg-white/90 px-2 py-1 rounded shadow text-sm">
                  {p.mediaMeta[idx].headline}
                </div>
              ) : null}

              {/* controls overlay with padding so circles don't get clipped */}
              {p.type !== "video" && total > 1 ? (
                <div className="absolute inset-0 p-2 pointer-events-none">
                  <div className="h-full flex items-center justify-between">
                    <button
                      type="button"
                      className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 ring-1 ring-black/10 flex items-center justify-center"
                      onClick={goPrev}
                      aria-label="Previous"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 ring-1 ring-black/10 flex items-center justify-center"
                      onClick={goNext}
                      aria-label="Next"
                    >
                      ›
                    </button>
                  </div>

                  {/* dots */}
                  <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                    {Array.from({ length: total }).map((_, i) => (
                      <span
                        key={i}
                        className={cx(
                          "inline-block w-1.5 h-1.5 rounded-full",
                          i === idx ? "bg-white shadow" : "bg-white/60"
                        )}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* FB link card */}
          {p.platform === "facebook" && (p.link?.headline || p.link?.subhead || p.link?.url) ? (
            <div className="px-3 py-3">
              <a
                href={p.link?.url || "#"}
                className="block border rounded-lg overflow-hidden hover:bg-slate-50 transition"
                onClick={(e) => e.preventDefault()}
              >
                <div className="p-3">
                  <div className="link-headline font-medium truncate">{p.link?.headline || "Link headline"}</div>
                  <div className="link-subhead text-sm text-slate-600 truncate">
                    {p.link?.subhead || "Add a subhead"}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 truncate">{tryGetHostname(p.link?.url)}</div>
                  <div className="mt-3">
                    <span className="cta inline-block px-3 py-1 rounded bg-slate-900 text-white text-sm">
                      {p.link?.cta || "Learn More"}
                    </span>
                  </div>
                </div>
              </a>
            </div>
          ) : null}

          {/* footer metrics */}
          <div className="px-3 py-2 border-t text-xs text-slate-500 flex items-center gap-4">
            {["likes", "comments", "shares", "saves", "views"].map((k) =>
              p.metrics?.[k] ? <span key={k}>{labelForMetric(k)} {formatNumber(p.metrics[k])}</span> : null
            )}
          </div>
        </div>
      </div>

      {/* aspect utilities fallback in case Tailwind aspect isn't enabled */}
      <style>{`.aspect-square{aspect-ratio:1/1}.aspect-video{aspect-ratio:16/9}`}</style>
    </div>
  );
});

export default RightPreview;

// helpers
function tryGetHostname(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function labelForMetric(k) {
  switch (k) {
    case "likes": return "Likes";
    case "comments": return "Comments";
    case "shares": return "Shares";
    case "saves": return "Saves";
    case "views": return "Views";
    default: return "";
  }
}
function formatNumber(n) {
  try {
    const x = Number(n || 0);
    if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
    if (x >= 1_000) return `${(x / 1_000).toFixed(1)}k`;
    return `${x}`;
  } catch {
    return `${n}`;
  }
}
