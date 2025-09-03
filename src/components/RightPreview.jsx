// src/components/RightPreview.jsx
import React, { forwardRef, useCallback, useEffect, useMemo } from "react";
import { ensurePostShape, emptyPost } from "../data/postShape";
import { useExportStability } from "../hooks/useExportStability";
import { canPlayVideo, getVideoThumbnail } from "../data/videoUtils";
import InstagramPost from "./InstagramPost";

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

  // Normalize aspect ratio for consistent presentation sizing
  const normalizedAspectClass = useMemo(() => {
    console.log('🔧 RightPreview normalizedAspectClass debug:', {
      mode,
      hasVideoSrc: !!normalizedPost.videoSrc,
      type: normalizedPost.type,
      platform: normalizedPost.platform,
      platformIsInstagram: normalizedPost.platform === "instagram",
      originalAspectClass: aspectClass,
      videoSrcPrefix: normalizedPost.videoSrc?.substring(0, 30) + '...'
    });
    
    // In present mode, make everything uniform for consistent presentation
    if (mode === "present") {
      console.log('📺 Present mode: using square aspect for all posts to ensure uniform sizing');
      return "aspect-square";
    }
    
    // In create mode, normalize videos to platform standards
    if (normalizedPost.type === "video" || normalizedPost.videoSrc) {
      // Both Instagram and Facebook feed videos are typically square (1:1)
      const result = "aspect-square";
      console.log(`✅ Video detected, platform: "${normalizedPost.platform}", using square aspect for platform consistency`);
      return result;
    }
    
    console.log('📝 Create mode non-video, using original aspect:', aspectClass);
    return aspectClass;
  }, [mode, normalizedPost.type, normalizedPost.videoSrc, normalizedPost.platform, aspectClass]);

  // Enhanced dynamic sizing based on aspect ratio and viewport - maximized for better visibility
  const dynamicSizing = useMemo(() => {
    const isPortrait = aspectRatio === "9:16" || aspectRatio === "4:5";
    const isLandscape = aspectRatio === "16:9" || aspectRatio === "1.91:1";

    if (mode === "present") {
      // Let content flow naturally without height constraints
      if (isPortrait) {
        return { maxWidth: "100%", width: "100%" };
      } else if (isLandscape) {
        return { maxWidth: "100%", width: "100%" };
      } else {
        return { maxWidth: "100%", width: "100%" };
      }
    } else {
      // Create mode - maximized for better editing experience
      if (isPortrait) {
        return { maxWidth: "min(450px, 85vw)", maxHeight: "85vh" };
      } else if (isLandscape) {
        return { maxWidth: "min(700px, 90vw)", maxHeight: "75vh" };
      } else {
        return { maxWidth: "min(550px, 85vw)", maxHeight: "85vh" };
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

  // Removed keyboard navigation in present mode to avoid conflicts
  // Carousel navigation is now click-only with visible arrow buttons

  useEffect(() => {
    if (attachNode && previewRef?.current) {
      attachNode(previewRef.current);
    }
  }, [attachNode, previewRef, normalizedPost.media, normalizedPost.videoSrc, normalizedPost.platform, currentIndex]);

  return (
    <div className={cx(normalizedPost.platform === "instagram" ? "ig-ui" : "fb-ui", "h-full flex flex-col")}>
      <div className="flex-1 flex items-start justify-center overflow-hidden p-4">
        <div className="w-full h-full flex items-start justify-center">
          <div 
            className="mx-auto flex-shrink-0" 
            style={wrapperStyle}
          >
            {normalizedPost.platform === "instagram" ? (
              <InstagramPost 
                post={normalizedPost}
                previewRef={previewRef}
                videoRef={videoRef}
                aspectClass={normalizedAspectClass}
                mode={mode}
              />
            ) : (
            <div ref={previewRef} className={cx(
              "bg-white overflow-hidden w-full",
              normalizedPost.platform === "facebook" ? "fb-post-container" : "card p-0"
            )}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                  {normalizedPost.brand?.profileSrc ? (
                    <img
                      src={normalizedPost.brand.profileSrc}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center">
                    <div className="brand-name font-semibold text-gray-900 truncate text-sm">
                      {normalizedPost.brand?.name || normalizedPost.brand?.username || "Brand"}
                    </div>
                    {normalizedPost.brand?.verified && (
                      <div className="ml-1 flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="ml-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 font-normal">Sponsored</span>
                    </div>
                  </div>
                  <div className="meta text-xs text-gray-500 truncate">
                    2h · 🌐
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button className="p-1 hover:bg-gray-100 rounded-full">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
              </div>

              {normalizedPost.caption ? (
                <div className="px-4 pb-3">
                  <div className="whitespace-pre-wrap text-sm text-gray-900 leading-relaxed">
                    {normalizedPost.caption}
                  </div>
                </div>
              ) : null}

              <div className="w-full">
                <div
                  className={cx(
                    "relative bg-black overflow-hidden",
                    normalizedAspectClass
                  )}
                >
                  {normalizedPost.type === "video" && normalizedPost.videoSrc ? (
                    canPlayVideo(normalizedPost.videoSrc) ? (
                      <video
                        ref={videoRef}
                        src={normalizedPost.videoSrc}
                        className="absolute inset-0 w-full h-full object-cover"
                        controls
                        muted
                        loop
                        playsInline
                        onClick={(e) => {
                          if (e.target.paused) {
                            e.target.play();
                          } else {
                            e.target.pause();
                          }
                        }}
                        onError={(e) => {
                          console.error('RightPreview: Video failed to load:', normalizedPost.videoSrc);
                        }}
                      />
                    ) : (
                      (() => {
                        const thumbnail = getVideoThumbnail(normalizedPost);
                        return (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            {thumbnail && thumbnail !== normalizedPost.videoSrc ? (
                              <>
                                <img
                                  src={thumbnail}
                                  alt="Video thumbnail"
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="relative z-10 bg-black/60 rounded-full p-4">
                                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </div>
                                <div className="relative z-10 text-white text-sm mt-2">Video unavailable</div>
                              </>
                            ) : (
                              <>
                                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <div className="text-sm">Video unavailable</div>
                              </>
                            )}
                          </div>
                        );
                      })()
                    )
                  ) : mediaCount > 0 && normalizedPost.media[currentIndex] ? (
                    <img
                      src={normalizedPost.media[currentIndex]}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                      onError={(e) => {
                        console.error('RightPreview: Image failed to load:', normalizedPost.media[currentIndex]);
                        console.error('Post data:', normalizedPost);
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">
                      Add media
                    </div>
                  )}


                  {normalizedPost.type !== "video" && mediaCount > 1 ? (
                    <div className="absolute inset-0 p-2 pointer-events-none z-10">
                      <div className="h-full flex items-center justify-between">
                        <button
                          type="button"
                          className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 hover:bg-white ring-1 ring-black/10 flex items-center justify-center transition-colors"
                          onClick={handlePrevious}
                          aria-label="Previous"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 hover:bg-white ring-1 ring-black/10 flex items-center justify-center transition-colors"
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
              (normalizedPost.link?.headline || normalizedPost.link?.subhead || normalizedPost.link?.url || 
               (mediaCount > 1 && (normalizedPost.mediaMeta?.[currentIndex]?.headline || normalizedPost.mediaMeta?.[currentIndex]?.subhead))) ? (
                <div className="border-t border-gray-200">
                  <a
                    href={normalizedPost.link?.url || "#"}
                    className="block hover:bg-gray-50 transition-colors duration-150"
                    onClick={(e) => e.preventDefault()}
                  >
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                        {tryGetHostname(normalizedPost.link?.url) || normalizedPost.link?.url?.toUpperCase() || "WEBSITE"}
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="link-headline text-gray-900 font-medium text-base leading-snug mb-1">
                        {mediaCount > 1 
                          ? (normalizedPost.mediaMeta?.[currentIndex]?.headline || "Card headline")
                          : (normalizedPost.link?.headline || "Link headline")}
                      </div>
                      <div className="link-subhead text-sm text-gray-600 leading-normal">
                        {mediaCount > 1 
                          ? (normalizedPost.mediaMeta?.[currentIndex]?.subhead || "Add card subhead")
                          : (normalizedPost.link?.subhead || "Add a subhead")}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="cta inline-flex items-center px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors duration-150">
                            {normalizedPost.link?.cta || "Learn More"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                </div>
              ) : null}

              {normalizedPost.platform === "facebook" ? (
                <div className="border-t border-gray-200">
                  {/* Facebook engagement actions */}
                  <div className="px-4 py-3 flex items-center justify-between text-gray-500">
                    <div className="flex items-center space-x-6">
                      <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-sm">Like</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm">Comment</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        <span className="text-sm">Share</span>
                      </button>
                    </div>
                  </div>
                  {/* Metrics display */}
                  {Object.keys(normalizedPost.metrics || {}).some(key => normalizedPost.metrics[key]) && (
                    <div className="px-4 pb-2 text-xs text-gray-500 border-t border-gray-100">
                      <div className="flex items-center gap-4 py-2">
                        {["likes", "comments", "shares", "views"].map((metricKey) =>
                          normalizedPost.metrics?.[metricKey] ? (
                            <span key={metricKey}>
                              {formatNumber(normalizedPost.metrics[metricKey])} {labelForMetric(metricKey).toLowerCase()}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .aspect-square { aspect-ratio: 1 / 1; }
        .aspect-video { aspect-ratio: 16 / 9; }
        .aspect-\\[4\\/5\\] { aspect-ratio: 4 / 5; }
        .aspect-\\[9\\/16\\] { aspect-ratio: 9 / 16; }
        .aspect-\\[1\\.91\\/1\\] { aspect-ratio: 1.91 / 1; }
        
        .fb-post-container {
          border: 1px solid #e4e6ea;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        
        .fb-ui .brand-name {
          color: #1c1e21;
          font-weight: 600;
        }
        
        .fb-ui .meta {
          color: #65676b;
          font-size: 13px;
        }
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