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
  const [postStatuses, setPostStatuses] = useState(() => 
    posts.reduce((acc, _, index) => ({ ...acc, [index]: 'needs-revisions' }), {})
  );

  // Memoize current post with our optimized hook
  const currentPost = useMemo(
    () => posts[Math.min(currentIndex, posts.length - 1)] || {},
    [posts, currentIndex]
  );
  
  const normalizedPost = useNormalizedPost(currentPost);

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

  const statusInfo = useMemo(() => {
    const currentStatus = postStatuses[currentIndex] || 'needs-revisions';
    return {
      value: currentStatus,
      display: currentStatus === 'client-approved' ? 'Client Approved' : 'Needs Revisions',
      colorClass: currentStatus === 'client-approved' 
        ? 'bg-green-600 text-white' 
        : 'bg-orange-600 text-white'
    };
  }, [postStatuses, currentIndex]);

  const handleStatusChange = useCallback((newStatus) => {
    setPostStatuses(prev => ({
      ...prev,
      [currentIndex]: newStatus
    }));
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => posts.length > 0 ? (i - 1 + posts.length) % posts.length : 0);
  }, [posts.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => posts.length > 0 ? (i + 1) % posts.length : 0);
  }, [posts.length]);

  // Optimized keyboard navigation
  useEffect(() => {
    if (!posts.length) return;
    
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape" && onClose) onClose();
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [posts.length, goPrev, goNext, onClose]);

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
    <div className="h-screen flex flex-col bg-white shadow-lg mx-2 my-1 rounded-lg">
      {/* Header section with progress, platform tags, and status */}
      <div className="flex-shrink-0 px-6 py-2 border-b bg-gray-50 rounded-t-lg">
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
              
              {/* Internal Mode Status Dropdown */}
              {isInternalMode && (
                <div className="relative">
                  <details className="relative">
                    <summary className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer list-none ${statusInfo.colorClass}`}>
                      {statusInfo.display}
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </summary>
                    <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[140px] z-10">
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-700"
                        onClick={() => handleStatusChange('needs-revisions')}
                      >
                        Needs Revisions
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-700"
                        onClick={() => handleStatusChange('client-approved')}
                      >
                        Client Approved
                      </button>
                    </div>
                  </details>
                </div>
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

      {/* Main preview with dynamic sizing */}
      <div className="flex-1 min-h-0 overflow-auto" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px' }}>
        <RightPreview
          post={normalizedPost}
          setPost={() => {}} // Read-only in present mode
          mode="present"
          clamp={{ maxPx: 500, maxVmin: 65 }} // Constrain to fit with all content visible
          showExport={false} // Hide export button in present mode
        />
      </div>

      {/* Footer with navigation controls */}
      {posts.length > 1 && (
        <div className="flex-shrink-0 px-6 py-2 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-center gap-2">
            <button
              className="btn-outline flex items-center"
              onClick={goPrev}
              title="Previous post (←)"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </button>
            <button
              className="btn flex items-center"
              onClick={goNext}
              title="Next post (→)"
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