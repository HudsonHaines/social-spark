// src/components/EditorPresentMode.jsx
import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
import RightPreview from "./RightPreview";
import { useNormalizedPost } from "../data/postShape";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

const EditorPresentMode = memo(function EditorPresentMode({
  posts = [], // array of posts to present
  initialIndex = 0,
  onClose,
  showPlatformTags = true, // NEW: show platform tags above posts
  isInternalMode = false, // NEW: enable internal deck checker features
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Memoize current post with our optimized hook
  const currentPost = useMemo(
    () => posts[Math.min(currentIndex, posts.length - 1)] || {},
    [posts, currentIndex]
  );
  
  // Create local state for the current post so carousel can update
  const [localPost, setLocalPost] = useState(currentPost);
  
  // Update local post when current index changes
  useEffect(() => {
    setLocalPost(currentPost);
  }, [currentPost]);
  
  const normalizedPost = useNormalizedPost(localPost);

  // Memoize platform display logic
  const platformInfo = useMemo(() => {
    const platform = normalizedPost.platform || 'facebook';
    return {
      platform,
      display: platform === 'instagram' ? 'Instagram' : 'Facebook',
      colorClass: platform === 'instagram' 
        ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400' 
        : 'bg-blue-600'
    };
  }, [normalizedPost.platform]);


  const goPrev = useCallback(() => {
    setCurrentIndex((i) => posts.length > 0 ? (i - 1 + posts.length) % posts.length : 0);
  }, [posts.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => posts.length > 0 ? (i + 1) % posts.length : 0);
  }, [posts.length]);

  // Only handle Escape key for closing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!posts.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-app-muted mb-4">No posts to present</div>
          {onClose && (
            <button className="btn-outline" onClick={onClose}>
              Back to Editor
            </button>
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-4 flex flex-col bg-white shadow-xl rounded-lg z-50 overflow-hidden">
      {/* Header section with progress, platform tags, and status */}
      <div className="flex-shrink-0 px-6 py-2 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Progress indicator */}
            {posts.length > 1 && (
              <div className="text-sm text-gray-600">
                {currentIndex + 1} / {posts.length}
              </div>
            )}

            {/* Platform tag and Status (for internal mode) */}
            <div className="flex items-center gap-3">
              {showPlatformTags && (
                <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium ${platformInfo.colorClass}`}>
                  {platformInfo.display}
                </span>
              )}
              
            </div>
          </div>
          
          {/* Exit button in header */}
          {onClose && (
            <button className="btn-outline text-xs" onClick={onClose} title="Exit present mode (Esc)">
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Main preview with scrollable container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full flex items-start justify-center p-6">
          <div className="w-full max-w-2xl">
            <RightPreview
              post={normalizedPost}
              setPost={setLocalPost} // Allow carousel to update active index
              mode="present"
              clamp={null} // Let content size naturally
              showExport={false} // Hide export button in present mode
            />
          </div>
        </div>
      </div>

      {/* Footer with navigation controls */}
      {posts.length > 1 && (
        <div className="flex-shrink-0 px-6 py-2 border-t bg-gray-50">
          <div className="flex items-center justify-center gap-2">
            <button
              className="btn-outline flex items-center"
              onClick={goPrev}
              title="Previous post in deck"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Post {currentIndex + 1} of {posts.length}
            </span>
            <button
              className="btn flex items-center"
              onClick={goNext}
              title="Next post in deck"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default EditorPresentMode;