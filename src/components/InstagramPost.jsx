// src/components/InstagramPost.jsx
import React, { useState, useCallback } from "react";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Smile
} from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function InstagramPost({ 
  post, 
  previewRef,
  videoRef,
  aspectClass = "aspect-square"
}) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(post.activeIndex || 0);
  
  const mediaCount = post.media?.length || 0;
  const hasMultipleMedia = mediaCount > 1 && post.type !== "video";

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + mediaCount) % mediaCount);
  }, [mediaCount]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % mediaCount);
  }, [mediaCount]);

  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div ref={previewRef} className="bg-white w-full instagram-post">
      {/* Instagram Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3">
          {/* Profile Picture with Story Ring */}
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-white p-[2px]">
                <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden">
                  {post.brand?.profileSrc ? (
                    <img
                      src={post.brand.profileSrc}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Username and Location */}
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-gray-900">
                {post.brand?.username || "username"}
              </span>
              {post.brand?.verified && (
                <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-xs text-gray-500">• Sponsored</span>
            </div>
            <div className="text-xs text-gray-900">
              {post.brand?.location || "Location"}
            </div>
          </div>
        </div>
        
        {/* More Options */}
        <button className="p-2 -mr-2 hover:opacity-60 transition-opacity">
          <MoreHorizontal className="w-5 h-5 text-gray-900" />
        </button>
      </div>

      {/* Media Section */}
      <div className={cx("relative bg-black", aspectClass)}>
        {post.type === "video" && post.videoSrc ? (
          <video
            ref={videoRef}
            src={post.videoSrc}
            className="absolute inset-0 w-full h-full object-cover"
            controls={false}
            muted
            loop
            playsInline
            autoPlay
          />
        ) : mediaCount > 0 ? (
          <>
            <img
              src={post.media[currentIndex]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              onDoubleClick={() => setLiked(true)}
            />
            
            {/* Carousel Navigation */}
            {hasMultipleMedia && (
              <>
                {currentIndex > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-800" />
                  </button>
                )}
                {currentIndex < mediaCount - 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-800" />
                  </button>
                )}
                
                {/* Carousel Indicators */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
                  {Array.from({ length: mediaCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className={cx(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        idx === currentIndex 
                          ? "bg-white w-2" 
                          : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-sm text-gray-500">
            Add media
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLiked(!liked)}
              className="hover:opacity-60 transition-opacity"
            >
              <Heart 
                className={cx(
                  "w-6 h-6 transition-all",
                  liked ? "fill-red-500 text-red-500 scale-110" : "text-gray-900"
                )} 
              />
            </button>
            <button className="hover:opacity-60 transition-opacity">
              <MessageCircle className="w-6 h-6 text-gray-900" strokeWidth={1.5} />
            </button>
            <button className="hover:opacity-60 transition-opacity">
              <Send className="w-6 h-6 text-gray-900" strokeWidth={1.5} />
            </button>
          </div>
          <button 
            onClick={() => setBookmarked(!bookmarked)}
            className="hover:opacity-60 transition-opacity"
          >
            <Bookmark 
              className={cx(
                "w-6 h-6",
                bookmarked ? "fill-gray-900 text-gray-900" : "text-gray-900"
              )} 
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {/* Likes Count */}
      {post.metrics?.likes && (
        <div className="px-3 pb-1">
          <span className="text-sm font-semibold text-gray-900">
            {formatNumber(post.metrics.likes)} likes
          </span>
        </div>
      )}

      {/* Caption */}
      {post.caption && (
        <div className="px-3 pb-2">
          <div className="text-sm">
            <span className="font-semibold text-gray-900 mr-2">
              {post.brand?.username || "username"}
            </span>
            <span className="text-gray-900">
              {post.caption}
            </span>
          </div>
        </div>
      )}

      {/* Comments Preview */}
      {post.metrics?.comments && post.metrics.comments > 0 && (
        <div className="px-3 pb-2">
          <button className="text-sm text-gray-500">
            View all {formatNumber(post.metrics.comments)} comments
          </button>
        </div>
      )}

      {/* Timestamp */}
      <div className="px-3 pb-2">
        <div className="text-[10px] text-gray-500 uppercase">
          2 hours ago
        </div>
      </div>

      {/* Add Comment Section */}
      <div className="border-t border-gray-100">
        <div className="flex items-center px-3 py-2">
          <button className="mr-3">
            <Smile className="w-6 h-6 text-gray-900" strokeWidth={1.5} />
          </button>
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 text-sm outline-none placeholder-gray-500"
          />
          <button className="text-sm font-semibold text-blue-500 opacity-50">
            Post
          </button>
        </div>
      </div>

      <style>{`
        .instagram-post {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          max-width: 470px;
          border: 1px solid #dbdbdb;
          border-radius: 3px;
        }
        
        .instagram-post * {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}