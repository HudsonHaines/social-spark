// src/components/RightPreview.jsx
import React, { forwardRef, useCallback, useEffect, useMemo } from "react";
import { ensurePostShape } from "../data/postShape";
import { useExportStability } from "../hooks/useExportStability";

const cx = (...a) => a.filter(Boolean).join(" ");

const RightPreview = forwardRef(function RightPreview(
  {
    post,
    setPost,          // required
    mode = "create",  // "create" | "present"
    saveAsPng,        // kept for backward compat, not used when hook is present
    savingImg = false,
    videoRef,         // optional
    clamp,            // { maxVmin?: number, maxPx?: number } optional
    showExport = true // set false to hide the Export button
  },
  previewRef
) {
  const normalizedPost = useMemo(() => ensurePostShape(post || {}), [post]);
  const mediaCount = normalizedPost.media?.length || 0;
  const currentIndex = normalizedPost.activeIndex || 0;

  // Determine aspect ratio class based on platform and settings
  const aspectRatio = normalizedPost.platform === "instagram" 
    ? (normalizedPost.igAdFormat ? normalizedPost.igAdFormat.split('-')[1] : "1:1")
    : (normalizedPost.fbAspectRatio || "1:1");

  const getAspectClass = useMemo(() => (ratio) => {
    switch (ratio) {
      case "1:1": return "aspect-square";
      case "4:5": return "aspect-[4/5]";
      case "9:16": return "aspect-[9/16]";
      case "16:9": return "aspect-video";
      case "1.91:1": return "aspect-[1.91/1]";
      default: return "aspect-square";
    }
  }, []);

  const aspectClass = getAspectClass(aspectRatio);

  // Enhanced dynamic sizing based on aspect ratio and viewport
  const dynamicSizing = useMemo(() => {
    const isPortrait = aspectRatio === "9:16" || aspectRatio === "4:5";
    const isLandscape = aspectRatio === "16:9" || aspectRatio === "1.91:1";

    if (mode === "present") {
      if (isPortrait) {
        return { maxWidth: "min(400px, 85vw)", maxHeight: "85vh" };
      } else if (isLandscape) {
        return { maxWidth: "min(720px, 90vw)", maxHeight: "70vh" };
      } else {
        return { maxWidth: "min(500px, 85vw)", maxHeight: "85vh" };
      }
    } else {
      if (isPortrait) {
        return { maxWidth: "min(320px, 75vw)", maxHeight: "75vh" };
      } else if (isLandscape) {
        return { maxWidth: "min(560px, 85vw)", maxHeight: "60vh" };
      } else {
        return { maxWidth: "min(400px, 80vw)", maxHeight: "75vh" };
      }
    }
  }, [aspectRatio, mode]);

  const wrapperStyle = useMemo(() => clamp ? 
    { width: "100%", maxWidth: `min(${clamp.maxPx || 560}px, ${clamp.maxVmin || 80}vmin)` } : 
    { width: "100%", ...dynamicSizing }, [clamp, dynamicSizing]);

  // Export stability hook
  const {
    isExporting,
    imagesReady,
    exportAsPng: stableExport,
    attachNode,
  } = useExportStability?.() || {
    isExporting: savingImg,
    imagesReady: true,
    exportAsPng: saveAsPng,
    attachNode: null,
  };

  // Keep currentIndex in range when media changes
  useEffect(() => {
    if (currentIndex > Math.max(0, mediaCount - 1)) {
      setPost((prev) => ({
        ...ensurePostShape(prev),
        activeIndex: Math.max(0, mediaCount - 1),
      }));
    }
  }, [currentIndex, mediaCount, setPost]);

  // Consolidated carousel navigation
  const navigateCarousel = useCallback((direction) => {
    setPost((prev) => {
      const current = ensurePostShape(prev);
      const count = current.media?.length || 0;
      if (count < 2) return current;
      const nextIndex = direction === 'prev' 
        ? ((current.activeIndex || 0) - 1 + count) % count
        : ((current.activeIndex || 0) + 1) % count;
      return { ...current, activeIndex: nextIndex };
    });
  }, [setPost]);

  const handlePrevious = useCallback(() => navigateCarousel('prev'), [navigateCarousel]);
  const handleNext = useCallback(() => navigateCarousel('next'), [navigateCarousel]);

  useEffect(() => {
    if (mode !== "present") return;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, handlePrevious, handleNext]);

  useEffect(() => {
    if (attachNode && previewRef?.current) {
      attachNode(previewRef.current);
    }
  }, [attachNode, previewRef, normalizedPost.media, normalizedPost.videoSrc, normalizedPost.platform, currentIndex]);

  return (
    <div className={cx(normalizedPost.platform === "instagram" ? "ig-ui" : "fb-ui", "h-full flex flex-col")}>
      {showExport ? (
        <div className="flex justify-end mb-2 flex-shrink-0">
          <button
            className={cx(
              "btn-outline",
              (isExporting || !imagesReady) && "opacity-50 cursor-not-allowed"
            )}
            disabled={isExporting || !imagesReady}
            onClick={() => stableExport(previewRef)}
            title={!imagesReady ? "Waiting for images to load..." : "Export PNG"}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : !imagesReady ? (
              "Loading images..."
            ) : (
              "Export PNG"
            )}
          </button>
        </div>
      ) : null}

      <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
        <div className="w-full h-full flex items-center justify-center">
          <div 
            className="mx-auto flex-shrink-0" 
            style={wrapperStyle}
          >
            <div ref={previewRef} className="card p-0 overflow-hidden w-full">
              <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                  {normalizedPost.brand?.profileSrc ? (
                    <img
                      src={normalizedPost.brand.profileSrc}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="brand-name font-medium truncate">
                    {normalizedPost.brand?.name || normalizedPost.brand?.username || "Brand"}
                    {normalizedPost.brand?.verified ? (
                      <span className="ml-1 align-middle text-sky-500">✓</span>
                    ) : null}
                  </div>
                  <div className="meta text-xs text-slate-500 truncate">
                    {normalizedPost.platform === "instagram"
                      ? `@${normalizedPost.brand?.username || "username"}`
                      : "Facebook · Now"}
                  </div>
                </div>
              </div>

              {normalizedPost.caption ? (
                <div className="px-3 pb-3">
                  <div className="whitespace-pre-wrap text-sm">{normalizedPost.caption}</div>
                </div>
              ) : null}

              <div className="w-full">
                <div
                  className={cx(
                    "relative border-t border-b bg-black/5",
                    aspectClass
                  )}
                >
                  {normalizedPost.type === "video" && normalizedPost.videoSrc ? (
                    <video
                      ref={videoRef}
                      src={normalizedPost.videoSrc}
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay={normalizedPost.playing}
                      muted={normalizedPost.muted}
                      loop
                      playsInline
                    />
                  ) : mediaCount > 0 ? (
                    <img
                      src={normalizedPost.media[currentIndex]}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">
                      Add media
                    </div>
                  )}

                  {normalizedPost.type !== "video" &&
                  mediaCount > 0 &&
                  (normalizedPost.mediaMeta?.[currentIndex]?.headline || "").trim() ? (
                    <div className="absolute left-3 top-3 bg-white/90 px-2 py-1 rounded shadow text-sm">
                      {normalizedPost.mediaMeta[currentIndex].headline}
                    </div>
                  ) : null}

                  {normalizedPost.type !== "video" && mediaCount > 1 ? (
                    <div className="absolute inset-0 p-2 pointer-events-none">
                      <div className="h-full flex items-center justify-between">
                        <button
                          type="button"
                          className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 ring-1 ring-black/10 flex items-center justify-center"
                          onClick={handlePrevious}
                          aria-label="Previous"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 ring-1 ring-black/10 flex items-center justify-center"
                          onClick={handleNext}
                          aria-label="Next"
                        >
                          ›
                        </button>
                      </div>

                      <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                        {Array.from({ length: mediaCount }).map((_, dotIndex) => (
                          <span
                            key={dotIndex}
                            className={cx(
                              "inline-block w-1.5 h-1.5 rounded-full",
                              dotIndex === currentIndex ? "bg-white shadow" : "bg-white/60"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {normalizedPost.platform === "facebook" &&
              (normalizedPost.link?.headline || normalizedPost.link?.subhead || normalizedPost.link?.url) ? (
                <div className="px-3 py-3">
                  <a
                    href={normalizedPost.link?.url || "#"}
                    className="block border rounded-lg overflow-hidden hover:bg-slate-50 transition"
                    onClick={(e) => e.preventDefault()}
                  >
                    <div className="p-3">
                      <div className="link-headline font-medium truncate">
                        {normalizedPost.link?.headline || "Link headline"}
                      </div>
                      <div className="link-subhead text-sm text-slate-600 truncate">
                        {normalizedPost.link?.subhead || "Add a subhead"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 truncate">
                        {tryGetHostname(normalizedPost.link?.url)}
                      </div>
                      <div className="mt-3">
                        <span className="cta inline-block px-3 py-1 rounded bg-slate-900 text-white text-sm">
                          {normalizedPost.link?.cta || "Learn More"}
                        </span>
                      </div>
                    </div>
                  </a>
                </div>
              ) : null}

              <div className="px-3 py-2 border-t text-xs text-slate-500 flex items-center gap-4">
                {["likes", "comments", "shares", "saves", "views"].map((metricKey) =>
                  normalizedPost.metrics?.[metricKey] ? (
                    <span key={metricKey}>
                      {labelForMetric(metricKey)} {formatNumber(normalizedPost.metrics[metricKey])}
                    </span>
                  ) : null
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .aspect-square { aspect-ratio: 1 / 1; }
        .aspect-video { aspect-ratio: 16 / 9; }
        .aspect-\\[4\\/5\\] { aspect-ratio: 4 / 5; }
        .aspect-\\[9\\/16\\] { aspect-ratio: 9 / 16; }
        .aspect-\\[1\\.91\\/1\\] { aspect-ratio: 1.91 / 1; }
      `}</style>
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
    case "likes":
      return "Likes";
    case "comments":
      return "Comments";
    case "shares":
      return "Shares";
    case "saves":
      return "Saves";
    case "views":
      return "Views";
    default:
      return "";
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