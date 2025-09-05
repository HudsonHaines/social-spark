// src/components/RightPreview.jsx
import React, { forwardRef, useCallback, useEffect, useMemo, useImperativeHandle, useRef } from "react";
import { ensurePostShape, emptyPost } from "../data/postShape";
import { useExportStability } from "../hooks/useExportStability";
import { useView } from "../contexts/ViewContext";
import InstagramPost from "./InstagramPost";
import InstagramReel from "./InstagramReel";
import FacebookReel from "./FacebookReel";
import SimpleInstagramReel from "./SimpleInstagramReel";
import SimpleFacebookReel from "./SimpleFacebookReel";
import MobileFrame from "./MobileFrame";
import ViewToggle from "./ViewToggle";

const cx = (...a) => a.filter(Boolean).join(" ");

// Simple stable video component - only re-renders when videoSrc actually changes
const StableVideo = React.memo(({ videoSrc, videoRef }) => {
  console.log('🎬 StableVideo re-render - videoSrc:', videoSrc?.substring(0, 30) + '...');
  
  return (
    <video
      ref={videoRef}
      src={videoSrc}
      className="absolute inset-0 w-full h-full object-cover"
      controls
      muted
      loop
      playsInline
      style={{ backgroundColor: 'black' }}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if videoSrc actually changed
  const srcChanged = prevProps.videoSrc !== nextProps.videoSrc;
  if (srcChanged) {
    console.log('🎬 StableVideo videoSrc changed, allowing re-render');
  } else {
    console.log('🎬 StableVideo props unchanged, preventing re-render');
  }
  return !srcChanged; // return true to prevent re-render
});

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
  // RightPreview will re-render on post changes, but StableVideo won't remount

  // Create a separate ref for the exportable content
  const exportRef = useRef(null);
  const { isMobile } = useView();
  const normalizedPost = useMemo(() => {
    const result = ensurePostShape(post || {});
    return result;
  }, [post]);
  
  // Memoize updatePost function to prevent infinite re-renders
  const updatePost = useCallback((updates) => {
    setPost(prev => typeof updates === 'function' ? updates(prev) : { ...prev, ...updates });
  }, [setPost]);
  const mediaCount = normalizedPost.media?.length || 0;
  const currentIndex = normalizedPost.activeIndex || 0;

  // Determine aspect ratio class based on platform and settings
  const aspectRatio = normalizedPost.isReel || normalizedPost.type === "reel" 
    ? "9:16"  // Reels are always vertical
    : normalizedPost.platform === "instagram" 
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
    // In present mode, make everything uniform for consistent presentation
    if (mode === "present") {
      return "aspect-square";
    }
    
    // In create mode, normalize videos to platform standards
    if (normalizedPost.type === "video" || normalizedPost.videoSrc) {
      // Both Instagram and Facebook feed videos are typically square (1:1)
      return "aspect-square";
    }
    
    return aspectClass;
  }, [mode, normalizedPost.type, normalizedPost.videoSrc, normalizedPost.platform, aspectClass]);

  // Enhanced dynamic sizing based on aspect ratio and viewport - maximized for better visibility
  const dynamicSizing = useMemo(() => {
    const isPortrait = aspectRatio === "9:16" || aspectRatio === "4:5";
    const isLandscape = aspectRatio === "16:9" || aspectRatio === "1.91:1";

    if (mode === "present") {
      // Present mode - ensure full visibility without scrolling
      if (isPortrait) {
        return { maxWidth: "min(450px, 90vw)", maxHeight: "90vh" };
      } else if (isLandscape) {
        return { maxWidth: "min(700px, 95vw)", maxHeight: "80vh" };
      } else {
        return { maxWidth: "min(550px, 90vw)", maxHeight: "85vh" };
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
    exportOriginalMedia,
    attachNode,
  } = useExportStability?.() || {
    isExporting: savingImg,
    imagesReady: true,
    exportAsPng: saveAsPng,
    exportOriginalMedia: null,
    attachNode: null,
  };

  // Removed excessive logging to prevent render loops

  // Keep currentIndex in range when media changes
  useEffect(() => {
    if (currentIndex > Math.max(0, mediaCount - 1)) {
      updatePost({ activeIndex: Math.max(0, mediaCount - 1) });
    }
  }, [currentIndex, mediaCount, updatePost]);

  // Consolidated carousel navigation
  const navigateCarousel = useCallback((direction) => {
    const count = normalizedPost.media?.length || 0;
    if (count < 2) return;
    const nextIndex = direction === 'prev' 
      ? ((normalizedPost.activeIndex || 0) - 1 + count) % count
      : ((normalizedPost.activeIndex || 0) + 1) % count;
    updatePost({ activeIndex: nextIndex });
  }, [normalizedPost.media?.length, normalizedPost.activeIndex, updatePost]);

  const handlePrevious = useCallback(() => navigateCarousel('prev'), [navigateCarousel]);
  const handleNext = useCallback(() => navigateCarousel('next'), [navigateCarousel]);

  // Removed keyboard navigation in present mode to avoid conflicts
  // Carousel navigation is now click-only with visible arrow buttons

  useEffect(() => {
    if (attachNode && exportRef?.current) {
      attachNode(exportRef.current);
    }
  }, [attachNode, normalizedPost.media, normalizedPost.videoSrc, normalizedPost.platform, currentIndex]);

  // Expose export functions to parent component
  useImperativeHandle(previewRef, () => ({
    exportAsPng: async (filename) => {
      // Use the new media export function instead of DOM capture
      if (exportOriginalMedia) {
        return await exportOriginalMedia(normalizedPost, filename);
      }
      // Fallback to legacy DOM export (currently disabled)
      if (stableExport && exportRef?.current) {
        return await stableExport(exportRef, filename);
      }
      throw new Error("Export function not available");
    },
    exportOriginalMedia: exportOriginalMedia ? async (filename) => {
      return await exportOriginalMedia(normalizedPost, filename);
    } : null,
    imagesReady,
    isExporting
  }), [stableExport, exportOriginalMedia, normalizedPost, imagesReady, isExporting]);

  // Memoize the entire PostContent to prevent video remounting
  const PostContent = useMemo(() => {
    
    return (
      <div 
        ref={exportRef}
        className="mx-auto flex-shrink-0" 
        style={isMobile ? { width: '100%', maxWidth: 'none', minHeight: '200px', position: 'relative' } : { ...wrapperStyle, minHeight: '200px', position: 'relative' }}
      >
            {normalizedPost.isReel || normalizedPost.type === "reel" ? (
              normalizedPost.platform === "instagram" ? (
                <SimpleInstagramReel
                  post={normalizedPost}
                  videoRef={videoRef}
                  mode={mode}
                />
              ) : (
                <SimpleFacebookReel
                  post={normalizedPost}
                  videoRef={videoRef}
                  mode={mode}
                />
              )
            ) : normalizedPost.platform === "instagram" ? (
              <InstagramPost 
                post={normalizedPost}
                previewRef={previewRef}
                videoRef={videoRef}
                aspectClass={normalizedAspectClass}
                mode={mode}
              />
            ) : (
            <div className={cx(
              "bg-white overflow-hidden w-full",
              normalizedPost.platform === "facebook" ? "fb-post-container" : "card p-0",
              isMobile ? "border-0 shadow-none rounded-none" : ""
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
                    <div className="brand-name font-semibold text-gray-900 truncate" style={{ fontSize: '15px', lineHeight: '20px' }}>
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
                      <span className="text-gray-500 font-normal" style={{ fontSize: '12px' }}>Sponsored</span>
                    </div>
                  </div>
                  <div className="meta text-gray-500 truncate" style={{ fontSize: '13px', lineHeight: '16px' }}>
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
                  <div className="whitespace-pre-wrap text-gray-900 leading-tight" style={{ fontSize: '15px', lineHeight: '20px' }}>
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
                      <StableVideo 
                        videoSrc={normalizedPost.videoSrc}
                        videoRef={videoRef}
                      />
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
                        <span style={{ fontSize: '15px', fontWeight: '500' }}>Like</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span style={{ fontSize: '15px', fontWeight: '500' }}>Comment</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        <span style={{ fontSize: '15px', fontWeight: '500' }}>Share</span>
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
    );
  }, [
    // Core properties that affect rendering
    normalizedPost.videoSrc,
    normalizedPost.platform,
    normalizedPost.isReel,
    normalizedPost.type,
    normalizedPost.media,
    normalizedPost.activeIndex,
    normalizedPost.brand?.profileSrc,
    normalizedPost.brand?.name,
    normalizedPost.caption, // Include caption for live updates
    normalizedPost.link, // Include link data for live updates
    normalizedPost.mediaMeta, // Include media meta for carousel cards
    normalizedAspectClass,
    mode,
    videoRef,
    isMobile,
    wrapperStyle,
    currentIndex,
    mediaCount
  ]);

  return (
    <div className={cx(
      normalizedPost.platform === "instagram" ? "ig-ui" : "fb-ui", 
      "h-full flex flex-col",
      isMobile ? "mobile-view" : ""
    )}>
      {/* View Toggle */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <ViewToggle size="small" />
      </div>
      
      <div className="flex-1 flex items-start justify-center overflow-y-auto p-4">
        <div className="w-full flex items-start justify-center">
          {isMobile ? (
            <MobileFrame>
              <div className={cx(
                "h-full",
                normalizedPost.isReel || normalizedPost.type === "reel"
                  ? "overflow-hidden" // Reels should fill the screen
                  : "overflow-y-auto"  // Regular posts can scroll
              )}>
                {PostContent}
              </div>
            </MobileFrame>
          ) : (
            PostContent
          )}
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
        
        /* Mobile-specific styles for authentic Facebook appearance */
        .mobile-view .fb-post-container {
          border: none;
          border-radius: 0;
          box-shadow: none;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        }
        
        .mobile-view .ig-ui .insta-card {
          border: none;
          border-radius: 0;
          box-shadow: none;
        }
        
        /* Facebook mobile text styling overrides */
        .mobile-view .fb-post-container .brand-name {
          font-size: 15px;
          line-height: 20px;
          font-weight: 600;
          color: #1c1e21;
        }
        
        .mobile-view .fb-post-container .meta {
          font-size: 13px;
          line-height: 16px;
          color: #65676b;
        }
        
        .fb-ui .brand-name {
          color: #1c1e21;
          font-weight: 600;
        }
        
        .fb-ui .meta {
          color: #65676b;
          font-size: 13px;
        }
        
        .fb-ui .card {
          width: 500px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
        }

        .ig-ui .insta-card {
          width: 470px;
          background: #fff;
          border: 1px solid #dbdbdb;
        }
        
        .brand-name {
          font-weight: 600;
          color: #1c1e21;
        }
        
        .metrics {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          padding-left: 0;
          flex-wrap: wrap;
        }
        
        .metric {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          color: #65676b;
        }
        
        .fb-ui .metric-count {
          font-weight: 600;
          color: #1c1e21;
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