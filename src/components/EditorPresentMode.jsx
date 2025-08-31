// src/components/EditorPresentMode.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import RightPreview from "./RightPreview";
import { ensurePostShape } from "../data/postShape";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function EditorPresentMode({
  posts = [], // array of posts to present
  initialIndex = 0,
  onClose,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentPost = useMemo(
    () => (posts[currentIndex] ? ensurePostShape(posts[currentIndex]) : ensurePostShape({})),
    [posts, currentIndex]
  );

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (posts.length ? (i - 1 + posts.length) % posts.length : 0));
  }, [posts.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (posts.length ? (i + 1) % posts.length : 0));
  }, [posts.length]);

  // Arrow key navigation
  useEffect(() => {
    const onKey = (e) => {
      if (!posts.length) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    <div className="h-full flex flex-col items-center justify-center bg-app-surface p-4">
      {/* Progress indicator */}
      {posts.length > 1 && (
        <div className="mb-4 text-sm text-app-muted">
          {currentIndex + 1} / {posts.length}
        </div>
      )}

      {/* Main preview */}
      <div className="flex-1 flex items-center justify-center w-full max-w-none">
        <RightPreview
          post={currentPost}
          setPost={() => {}} // Read-only in present mode
          mode="present"
          clamp={{ maxVmin: 68, maxPx: 560 }} // Match ShareViewer sizing
          showExport={false} // Hide export button in present mode
        />
      </div>

      {/* Navigation controls */}
      {posts.length > 1 && (
        <div className="flex items-center gap-2 mt-4">
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
      )}

      {/* Exit button */}
      {onClose && (
        <div className="mt-2">
          <button className="btn-outline text-xs" onClick={onClose} title="Exit present mode (Esc)">
            Back to Editor
          </button>
        </div>
      )}
    </div>
  );
}