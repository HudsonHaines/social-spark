// src/decks/PostPreviewModal.jsx
import React, { useEffect, useRef, useState } from "react";
import RightPreview from "../components/RightPreview";
import { ensurePostShape } from "../data/postShape";

export default function PostPreviewModal({ open, onClose, post, previewContext, onLoadToEditor }) {
  if (!open) return null;

  const [localPost, setLocalPost] = useState(() => ensurePostShape(post || {}));
  const previewRef = useRef(null);
  const videoRef = useRef(null); // Add videoRef for proper video controls

  useEffect(() => {
    setLocalPost(ensurePostShape(post || {}));
  }, [post]);

  return (
    <div className="fixed inset-0 z-[300]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 p-4 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
        <div
          className="w-[96vw] max-w-[1000px] max-h-[92vh] bg-white rounded-2xl shadow-xl border overflow-hidden flex flex-col"
          style={{ pointerEvents: 'auto' }} // Re-enable pointer events for modal content
          onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking inside modal
        >
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <div className="font-medium">Post preview</div>
            <div className="flex items-center gap-2">
              {typeof onLoadToEditor === "function" ? (
                <button 
                  className="btn-outline" 
                  onClick={() => {
                    if (previewContext) {
                      // Load with deck context (full deck editing flow)
                      onLoadToEditor(localPost, previewContext.deckId, previewContext.itemId, previewContext.deckTitle);
                    } else {
                      // Fallback to single post loading
                      onLoadToEditor(localPost);
                    }
                  }}
                  title={previewContext ? "Edit this post with full deck context" : "Load this post in editor"}
                >
                  {previewContext ? "Edit in Deck" : "Load in editor"}
                </button>
              ) : null}
              <button className="btn-outline" onClick={onClose}>Close</button>
            </div>
          </div>

          {/* Content area - no scroll to keep post fully visible */}
          <div className="p-4 flex-1 flex items-center justify-center">
            <RightPreview
              ref={previewRef}
              post={localPost}
              setPost={setLocalPost}
              mode="present"
              videoRef={videoRef}                  // Add videoRef for working video controls
              clamp={{ maxVmin: 85, maxPx: 550 }}  // consistent viewport sizing for full visibility
              showExport={false}                   // hide export button inside modal
              deckId={previewContext?.deckId}      // pass deckId for comment system
              saveAsPng={() => {}}
              savingImg={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
