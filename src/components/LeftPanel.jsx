// src/components/LeftPanel.jsx
import React, { useRef, useMemo, memo, useCallback, useState } from "react";
import {
  Settings2,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  Film,
  ChevronDown,
  ChevronRight,
  Save,
  Download,
  RotateCcw,
  X,
  AlertTriangle,
  Edit2,
  RefreshCw,
} from "lucide-react";
import { useBrands } from "../data/brands";
import InvitationNotifications from "../organizations/InvitationNotifications";
import { useOrganization } from "../organizations/OrganizationProvider";

const cx = (...a) => a.filter(Boolean).join(" ");

function WorkflowStep({ title, children, className = "" }) {
  return (
    <div className={cx("space-y-3", className)}>
      <div className="text-sm font-semibold text-gray-700">{title}</div>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-t border-gray-200 pt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isOpen && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}


// Compact Platform & Brand Bar
function FoundationBar({ post, update, brands, onSelectBrand, openBrandManager }) {
  const selectedBrand = brands.find(b => b.id === (post?.brandId ?? post?.brand?.id)) || null;
  
  // Smart detection for Reels suggestion
  const isVerticalVideo = post?.type === "video" && (
    post?.fbAspectRatio === "9:16" || 
    post?.igAdFormat?.includes("9:16") ||
    post?.videoSrc
  );
  const suggestReels = isVerticalVideo && !post?.isReel;
  
  const handlePlatformChange = (platform, isReel = false) => {
    const updates = { platform };
    
    if (isReel) {
      // Auto-configure for Reels
      updates.isReel = true;
      updates.fbAspectRatio = "9:16";
      updates.igAdFormat = "reels-9:16";
      updates.fbAdType = "reels";
      updates.igAdType = "reels";
    } else {
      // Explicitly clear Reels mode for regular posts
      updates.isReel = false;
      // Reset to standard formats
      updates.fbAspectRatio = "1:1";
      updates.igAdFormat = "feed-1:1";
      updates.fbAdType = "feed";
      updates.igAdType = "feed";
    }
    
    update(updates);
  };
  
  return (
    <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
      {/* Platform Toggle */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex bg-gray-100 rounded-lg p-1 flex-wrap">
          {/* Regular Posts */}
          <button
            className={cx(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              post.platform === "facebook" && !post.isReel
                ? "bg-white shadow-sm text-blue-600" 
                : "text-gray-600 hover:text-gray-900"
            )}
            onClick={() => handlePlatformChange("facebook", false)}
          >
            f Facebook
          </button>
          <button
            className={cx(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              post.platform === "instagram" && !post.isReel
                ? "bg-white shadow-sm text-pink-600" 
                : "text-gray-600 hover:text-gray-900"
            )}
            onClick={() => handlePlatformChange("instagram", false)}
          >
            📷 Instagram
          </button>
          
          {/* Reels Options - Show when relevant */}
          {(isVerticalVideo || post.isReel) && (
            <>
              <button
                className={cx(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  post.platform === "facebook" && post.isReel
                    ? "bg-white shadow-sm text-blue-600" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                onClick={() => handlePlatformChange("facebook", true)}
              >
                <Film size={12} className="inline mr-1" />
                FB Reels
              </button>
              <button
                className={cx(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  post.platform === "instagram" && post.isReel
                    ? "bg-white shadow-sm text-pink-600" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                onClick={() => handlePlatformChange("instagram", true)}
              >
                <Film size={12} className="inline mr-1" />
                IG Reels
              </button>
            </>
          )}
        </div>
        
        {/* Smart Reels Suggestion */}
        {suggestReels && (
          <div className="ml-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
            <Film size={12} />
            <span>9:16 video detected</span>
            <button 
              onClick={() => handlePlatformChange(post.platform, true)}
              className="text-amber-700 hover:text-amber-800 font-medium"
            >
              Make Reel?
            </button>
          </div>
        )}
      </div>

      {/* Brand Selection */}
      <div className="flex items-center gap-2">
        <select
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
          value={post?.brandId || post?.brand?.id || ""}
          onChange={(e) => onSelectBrand(e.target.value || null)}
        >
          <option value="">Choose brand...</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.fb_name || "Brand"} {b.verified ? "✓" : ""}
            </option>
          ))}
        </select>
        <button 
          onClick={openBrandManager}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Manage
        </button>
      </div>
      
      {/* Selected Brand Preview */}
      {selectedBrand && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
          <div className="w-4 h-4 rounded-full bg-gray-200 overflow-hidden">
            {selectedBrand[post.platform === "facebook" ? "fb_avatar_url" : "ig_avatar_url"] && (
              <img 
                src={selectedBrand[post.platform === "facebook" ? "fb_avatar_url" : "ig_avatar_url"]} 
                className="w-full h-full object-cover" 
                alt="" 
              />
            )}
          </div>
          <span>{post.platform === "facebook" ? selectedBrand.fb_name : `@${selectedBrand.ig_username}`}</span>
        </div>
      )}
    </div>
  );
}

const LeftPanel = memo(function LeftPanel(props) {
  const {
    // editor
    user,
    post,
    update,
    videoRef, // Video element ref for direct control
    showDeckStrip, // Whether deck building is active
    onSetDeckBrand, // Function to set deck brand
    onDrop,
    handleImageFiles,
    handleVideoFile,
    clearVideo,
    removeImageAt,
    // deck operations
    addToDeck = () => {},
    saveToDeck = () => {},
    updateInDeck = () => {},
    editingFromDeck = null,
    hasUnsavedChanges = false,
    clearEditingFromDeck = () => {},
    openDeckPicker = () => {},
    // brand manager
    openBrandManager,
    // export functionality
    onExportPNG,
    isExporting = false,
    imagesReady = true,
  } = props;

  // State for image drag and drop
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState(null);
  
  // State for clear confirmation modal
  const [showClearModal, setShowClearModal] = useState(false);

  if (!post) return null;

  // Supabase brands
  const { currentOrganization } = useOrganization();
  const { brands: brandRows } = useBrands(user?.id, currentOrganization?.id);

  // Resolve a safe brand id whether state uses brandId or brand.id
  const safeBrandId = useMemo(
    () => (post?.brandId ?? post?.brand?.id ?? null),
    [post?.brandId, post?.brand?.id]
  );

  const selectedBrand = useMemo(
    () => brandRows.find((b) => b.id === safeBrandId) || null,
    [brandRows, safeBrandId]
  );

  const syncPostBrandFromRow = useCallback((row) => {
    if (!row) {
      update({
        brandId: null,
        brand: { id: null, name: "", username: "", profileSrc: "", verified: false },
      });
      return;
    }
    const profileSrc =
      post.platform === "facebook" ? row.fb_avatar_url || "" : row.ig_avatar_url || "";

    update({
      brandId: row.id,
      brand: {
        id: row.id,
        name: row.fb_name || "",
        username: row.ig_username || "",
        profileSrc,
        verified: !!row.verified,
      },
    });
  }, [post.platform, update]);

  const handlePickBrand = useCallback((idOrNull) => {
    const row = brandRows.find((r) => r.id === idOrNull) || null;
    syncPostBrandFromRow(row);
    
    // If we're building a deck, also set this as the deck brand
    if (showDeckStrip && onSetDeckBrand && row) {
      const deckBrandFormat = {
        id: row.id,
        name: row.fb_name || "",
        username: row.ig_username || "",
        profileSrc: post.platform === "facebook" ? row.fb_avatar_url || "" : row.ig_avatar_url || "",
        verified: !!row.verified,
      };
      onSetDeckBrand(deckBrandFormat, false); // Don't apply to existing posts, just set for new ones
    }
  }, [brandRows, syncPostBrandFromRow, showDeckStrip, onSetDeckBrand, post.platform]);

  // Image drag and drop handlers
  const handleImageDragStart = useCallback((e, index) => {
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleImageDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverImageIndex(index);
  }, []);

  const handleImageDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverImageIndex(null);
    }
  }, []);

  const handleImageDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    
    if (draggedImageIndex === null || draggedImageIndex === dropIndex) {
      setDraggedImageIndex(null);
      setDragOverImageIndex(null);
      return;
    }

    // Create new array with reordered images
    const newMedia = [...(post.media || [])];
    const newMediaMeta = [...(post.mediaMeta || [])];
    
    // Get the dragged items
    const draggedMedia = newMedia[draggedImageIndex];
    const draggedMeta = newMediaMeta[draggedImageIndex];
    
    // Remove the dragged items
    newMedia.splice(draggedImageIndex, 1);
    newMediaMeta.splice(draggedImageIndex, 1);
    
    // Insert at new position
    newMedia.splice(dropIndex, 0, draggedMedia);
    newMediaMeta.splice(dropIndex, 0, draggedMeta);
    
    // Update active index if needed
    let newActiveIndex = post.activeIndex || 0;
    if (draggedImageIndex === post.activeIndex) {
      // The active image was moved
      newActiveIndex = dropIndex;
    } else if (draggedImageIndex < post.activeIndex && dropIndex >= post.activeIndex) {
      // Image moved from before active to after active
      newActiveIndex = post.activeIndex - 1;
    } else if (draggedImageIndex > post.activeIndex && dropIndex <= post.activeIndex) {
      // Image moved from after active to before active
      newActiveIndex = post.activeIndex + 1;
    }
    
    // Update the post
    update({
      media: newMedia,
      mediaMeta: newMediaMeta,
      activeIndex: newActiveIndex
    });
    
    // Reset drag state
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  }, [post.media, post.mediaMeta, post.activeIndex, draggedImageIndex, update]);

  const handleImageDragEnd = useCallback(() => {
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  }, []);

  // Clear all post content while preserving brand
  const handleClearFields = useCallback(() => {
    if (!post) return;
    
    // Check if user has opted to skip confirmation
    const skipConfirmation = localStorage.getItem('skipClearFieldsConfirmation') === 'true';
    
    if (skipConfirmation) {
      performClear();
    } else {
      setShowClearModal(true);
    }
  }, [post]);

  const performClear = useCallback(() => {
    if (!post) return;

    // Preserve brand information
    const preservedBrand = {
      brandId: post.brandId,
      brand: post.brand,
      platform: post.platform
    };

    // Reset to empty post with preserved brand
    update({
      ...preservedBrand,
      caption: "",
      media: [],
      mediaMeta: [],
      videoSrc: "",
      type: "single",
      activeIndex: 0,
      link: null
    });

    setShowClearModal(false);
  }, [post, update]);

  const handleClearConfirm = useCallback((dontShowAgain) => {
    if (dontShowAgain) {
      localStorage.setItem('skipClearFieldsConfirmation', 'true');
    }
    performClear();
  }, [performClear]);

  const handleClearCancel = useCallback(() => {
    setShowClearModal(false);
  }, []);

  // Sticky Actions Bar
  const ActionsBar = () => (
    <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
      {/* Show editing indicator when editing from deck */}
      {editingFromDeck?.itemId && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit2 size={14} className="text-blue-600" />
            <span className="text-xs text-blue-700">
              Editing from deck (Version {editingFromDeck.version || 1})
            </span>
          </div>
          <button
            onClick={clearEditingFromDeck}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Clear
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => editingFromDeck?.itemId ? updateInDeck() : addToDeck?.(post)}
          className={cx(
            "relative flex flex-col items-center gap-1 p-3 rounded-lg transition-colors",
            editingFromDeck?.itemId 
              ? hasUnsavedChanges 
                ? "bg-orange-500 text-white hover:bg-orange-600" 
                : "bg-green-500 text-white hover:bg-green-600"
              : "border border-gray-300 hover:bg-gray-50"
          )}
        >
          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && editingFromDeck?.itemId && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
          )}
          
          {editingFromDeck?.itemId ? (
            <>
              <RefreshCw size={16} className={hasUnsavedChanges ? "animate-pulse" : ""} />
              <span className="text-xs">
                {hasUnsavedChanges ? "Save Changes" : `Update v${(editingFromDeck.version || 1) + 1}`}
              </span>
            </>
          ) : (
            <>
              <Save size={16} className="text-gray-600" />
              <span className="text-xs text-gray-700">Add to Deck</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleClearFields}
          className="flex flex-col items-center gap-1 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RotateCcw size={16} className="text-gray-600" />
          <span className="text-xs text-gray-700">Clear Fields</span>
        </button>
        
        <button
          onClick={onExportPNG}
          disabled={isExporting || !imagesReady}
          className={cx(
            "flex flex-col items-center gap-1 p-3 rounded-lg transition-colors",
            isExporting || !imagesReady 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
              : "bg-blue-500 text-white hover:bg-blue-600"
          )}
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Exporting...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span className="text-xs">Export</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Step 1: Foundation (Always visible, compact) */}
      <FoundationBar 
        post={post}
        update={update}
        brands={brandRows}
        onSelectBrand={handlePickBrand}
        openBrandManager={openBrandManager}
      />

      {/* Step 2: Content Creation (Main scrollable area) */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          {/* Post Copy - Primary focus */}
          <WorkflowStep title="✍️ Post Copy">
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              rows={4}
              value={post.caption || ""}
              onChange={(e) => update({ caption: e.target.value })}
              placeholder="Write your post copy here..."
            />
            <div className="text-xs text-gray-500 text-right">
              {(post.caption || "").length} characters
            </div>
          </WorkflowStep>

          {/* Media Upload - Simplified */}
          <WorkflowStep title="📷 Add Media">
            {/* Drag and Drop Zone with Upload Button */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={onDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer"
            >
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-700 mb-2">Drag and drop your media here</p>
              <p className="text-xs text-gray-500 mb-3">Supports images and videos up to 10MB</p>
              
              {/* Upload Button */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span>or</span>
                <button
                  onClick={() => document.getElementById('media-file-input').click()}
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  browse files
                </button>
              </div>
              
              {/* Hidden File Input */}
              <input
                id="media-file-input"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  if (files.length > 0) {
                    // Create a fake drop event object to match onDrop expectations
                    const fakeDropEvent = {
                      preventDefault: () => {},
                      stopPropagation: () => {},
                      dataTransfer: { files }
                    };
                    onDrop(fakeDropEvent);
                  }
                  e.target.value = ''; // Reset input
                }}
                className="hidden"
              />
            </div>

            {/* Media Preview - Compact */}
            {post.type === "video" && post.videoSrc ? (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <VideoIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Video uploaded</span>
                    {post.isReel && (
                      <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
                        Reel
                      </div>
                    )}
                  </div>
                  <button 
                    className="text-xs text-red-600 hover:text-red-800 underline"
                    onClick={clearVideo}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : post.media?.length ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {post.media.length} image{post.media.length === 1 ? '' : 's'} uploaded
                  </span>
                  {post.media.length > 1 && (
                    <span className="text-xs text-gray-500">
                      Showing image {(post.activeIndex || 0) + 1}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {post.media.map((m, i) => (
                    <div
                      key={i}
                      draggable
                      className={cx(
                        "relative rounded-lg overflow-hidden border-2 transition-all",
                        "cursor-move", // Indicate draggable
                        i === post.activeIndex 
                          ? "border-blue-500 ring-2 ring-blue-200" 
                          : "border-gray-200 hover:border-gray-300",
                        draggedImageIndex === i && "opacity-50 scale-95", // Visual feedback when dragged
                        dragOverImageIndex === i && "ring-2 ring-green-400 ring-offset-1" // Visual feedback for drop target
                      )}
                      onClick={() => update({ activeIndex: i })}
                      onDragStart={(e) => handleImageDragStart(e, i)}
                      onDragOver={(e) => handleImageDragOver(e, i)}
                      onDragLeave={handleImageDragLeave}
                      onDrop={(e) => handleImageDrop(e, i)}
                      onDragEnd={handleImageDragEnd}
                    >
                      <img src={m} className="w-full h-12 object-cover" alt="" />
                      <button
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImageAt(i);
                        }}
                      >
                        ×
                      </button>
                      
                      {/* Drag handle indicator (only show on hover) */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 transition-opacity">
                        <div className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
                          Drag to reorder
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Carousel Card Headlines/Subheadlines */}
            {post.media?.length > 1 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Card Headlines & Subheadlines</h4>
                <div className="space-y-3">
                  {post.media.map((_, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <img src={post.media[i]} className="w-12 h-12 object-cover rounded border" alt="" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded">
                            Card {i + 1}
                          </span>
                          {i === post.activeIndex && (
                            <span className="text-xs text-blue-600 font-medium">Active</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Headline"
                          value={post.mediaMeta?.[i]?.headline || ""}
                          onChange={(e) => {
                            const newMeta = [...(post.mediaMeta || [])];
                            newMeta[i] = { ...(newMeta[i] || {}), headline: e.target.value };
                            update({ mediaMeta: newMeta });
                          }}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Subheadline"
                          value={post.mediaMeta?.[i]?.subhead || ""}
                          onChange={(e) => {
                            const newMeta = [...(post.mediaMeta || [])];
                            newMeta[i] = { ...(newMeta[i] || {}), subhead: e.target.value };
                            update({ mediaMeta: newMeta });
                          }}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </WorkflowStep>


          {/* Collapsible Advanced Sections */}
          {post.platform === "facebook" && (
            <CollapsibleSection title="🔗 Link Preview (Facebook)">
              <div className="space-y-3">
                {/* Only show headline/subhead inputs for non-carousel posts */}
                {post.media?.length <= 1 && (
                  <>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Headline"
                      value={post.link?.headline || ""}
                      onChange={(e) => {
                        const newLink = { ...(post.link || {}), headline: e.target.value };
                        update({ link: newLink });
                      }}
                    />
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Subhead"
                      value={post.link?.subhead || ""}
                      onChange={(e) => update({ link: { ...(post.link || {}), subhead: e.target.value } })}
                    />
                  </>
                )}
                
                {/* For carousel posts, show note about per-card headlines */}
                {post.media?.length > 1 && (
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                    💡 Headlines & subheadlines are set per card above. This link preview applies to all cards.
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Link URL"
                    value={post.link?.url || ""}
                    onChange={(e) => update({ link: { ...(post.link || {}), url: e.target.value } })}
                  />
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={post.link?.cta || "Learn More"}
                    onChange={(e) => update({ link: { ...(post.link || {}), cta: e.target.value } })}
                  >
                    <option value="Learn More">Learn More</option>
                    <option value="Shop Now">Shop Now</option>
                    <option value="Sign Up">Sign Up</option>
                    <option value="Download">Download</option>
                  </select>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Collapsible Advanced Sections */}
        </div>
      </div>

      {/* Step 3: Actions (Sticky bottom bar) */}
      <ActionsBar />
      
      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <ClearFieldsModal
          onConfirm={handleClearConfirm}
          onCancel={handleClearCancel}
        />
      )}
    </div>
  );
});

// Clear Fields Confirmation Modal Component
const ClearFieldsModal = memo(function ClearFieldsModal({ onConfirm, onCancel }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Clear All Fields?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will clear all your content and start a new post. Your brand selection and platform will be preserved.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm">
                <div className="font-medium text-gray-700 mb-1">What will be cleared:</div>
                <ul className="text-gray-600 text-xs space-y-1">
                  <li>• Post text/caption</li>
                  <li>• All uploaded images</li>
                  <li>• Video content</li>
                  <li>• Link previews</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-6">
          <input
            id="dontShowAgain"
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="dontShowAgain" className="text-sm text-gray-600">
            Don't show this again
          </label>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(dontShowAgain)}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
          >
            Clear Fields
          </button>
        </div>
      </div>
    </div>
  );
});

export default LeftPanel;