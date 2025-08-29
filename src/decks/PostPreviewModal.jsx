// src/decks/PostPreviewModal.jsx
import React, { useEffect, useRef, useState } from "react";
import RightPreview from "../components/RightPreview";
import { ensurePostShape } from "../data/postShape";

export default function PostPreviewModal({ open, onClose, post, onLoadToEditor }) {
  if (!open) return null;

  const [localPost, setLocalPost] = useState(() => ensurePostShape(post || {}));
  const previewRef = useRef(null);

  useEffect(() => {
    setLocalPost(ensurePostShape(post || {}));
  }, [post]);

  return (
    <div className="fixed inset-0 z-[300]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 p-4 flex items-center justify-center">
        <div
          className="w-[96vw] max-w-[1000px] max-h-[92vh] bg-white rounded-2xl shadow-xl border overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <div className="font-medium">Post preview</div>
            <div className="flex items-center gap-2">
              {typeof onLoadToEditor === "function" ? (
                <button className="btn-outline" onClick={() => onLoadToEditor(localPost)}>
                  Load in editor
                </button>
              ) : null}
              <button className="btn-outline" onClick={onClose}>Close</button>
            </div>
          </div>

          {/* Scroll the content area if needed */}
          <div className="p-4 overflow-auto">
            <RightPreview
              ref={previewRef}
              post={localPost}
              setPost={setLocalPost}
              mode="present"
              clamp={{ maxVmin: 72, maxPx: 560 }}  // tighter than normal to fit viewport
              showExport={false}                   // hide export button inside modal
              saveAsPng={() => {}}
              savingImg={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
