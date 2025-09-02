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
} from "lucide-react";
import { useBrands } from "../data/brands";

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

function Radio({ label, checked, onChange, name, value, id }) {
  return (
    <label
      className={cx(
        "px-3 py-2 rounded-lg border cursor-pointer select-none text-sm transition-colors",
        checked 
          ? "bg-blue-600 text-white border-blue-600 font-medium" 
          : "bg-white hover:bg-slate-50 border-gray-300 text-gray-700"
      )}
      htmlFor={id}
    >
      <input
        id={id}
        name={name}
        value={value}
        type="radio"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
}

// Compact Platform & Brand Bar
function FoundationBar({ post, update, brands, onSelectBrand, openBrandManager }) {
  const selectedBrand = brands.find(b => b.id === (post?.brandId ?? post?.brand?.id)) || null;
  
  return (
    <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
      {/* Platform Toggle */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            className={cx(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              post.platform === "facebook" 
                ? "bg-white shadow-sm text-blue-600" 
                : "text-gray-600 hover:text-gray-900"
            )}
            onClick={() => update({ platform: "facebook" })}
          >
            f Facebook
          </button>
          <button
            className={cx(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              post.platform === "instagram" 
                ? "bg-white shadow-sm text-pink-600" 
                : "text-gray-600 hover:text-gray-900"
            )}
            onClick={() => update({ platform: "instagram" })}
          >
            📷 Instagram
          </button>
        </div>
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
    onDrop,
    handleImageFiles,
    handleVideoFile,
    clearVideo,
    removeImageAt,
    // deck operations
    saveToDeck = () => {},
    openDeckPicker = () => {},
    // brand manager
    openBrandManager,
    // export functionality
    onExportPNG,
    isExporting = false,
    imagesReady = true,
  } = props;

  if (!post) return null;

  const fileImgRef = useRef(null);
  const fileVidRef = useRef(null);

  // Supabase brands
  const { brands: brandRows } = useBrands(user?.id);

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
  }, [brandRows, syncPostBrandFromRow]);

  // Sticky Actions Bar
  const ActionsBar = () => (
    <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => openDeckPicker?.()}
          className="flex flex-col items-center gap-1 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Save size={16} className="text-gray-600" />
          <span className="text-xs text-gray-700">Save to Deck</span>
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

          {/* Media Upload - Streamlined */}
          <WorkflowStep title="📷 Add Media">
            {/* Media Type Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
              <Radio
                id="type_images"
                name="media_type"
                value="images"
                label="Images"
                checked={post.type !== "video"}
                onChange={() => {
                  const n = post.media?.length || 0;
                  const nextType = n > 1 ? "carousel" : "single";
                  update({ type: nextType, videoSrc: "" });
                }}
              />
              <Radio
                id="type_video"
                name="media_type"
                value="video"
                label="Video"
                checked={post.type === "video"}
                onChange={() => update({ type: "video" })}
              />
            </div>

            {/* Upload zone - Prominent */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={onDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer"
            >
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-700 mb-2">Drag files here or click to upload</p>
              <p className="text-xs text-gray-500 mb-4">Support images and videos up to 10MB</p>
              <div className="flex items-center justify-center gap-3">
                <button 
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  onClick={() => fileImgRef.current?.click()}
                >
                  Choose Images
                </button>
                <button 
                  className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => fileVidRef.current?.click()}
                >
                  Choose Video
                </button>
              </div>

              <input
                id="image_files"
                name="image_files"
                ref={fileImgRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={async (e) => {
                  if (e.target.files) await handleImageFiles(e.target.files);
                }}
              />
              <input
                id="video_file"
                name="video_file"
                ref={fileVidRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await handleVideoFile(f);
                }}
              />
            </div>

            {/* Media Preview - Compact */}
            {post.type === "video" && post.videoSrc ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Video uploaded</span>
                </div>
                <button 
                  className="text-xs text-red-600 hover:text-red-800 underline"
                  onClick={clearVideo}
                >
                  Remove
                </button>
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
                      className={cx(
                        "relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                        i === post.activeIndex 
                          ? "border-blue-500 ring-2 ring-blue-200" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => update({ activeIndex: i })}
                    >
                      <img src={m} className="w-full h-12 object-cover" alt="" />
                      <button
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImageAt(i);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </WorkflowStep>


          {/* Collapsible Advanced Sections */}
          {post.platform === "facebook" && (
            <CollapsibleSection title="🔗 Link Preview (Facebook)">
              <div className="space-y-3">
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Headline"
                  value={post.link?.headline || ""}
                  onChange={(e) => update({ link: { ...(post.link || {}), headline: e.target.value } })}
                />
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Subhead"
                  value={post.link?.subhead || ""}
                  onChange={(e) => update({ link: { ...(post.link || {}), subhead: e.target.value } })}
                />
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
    </div>
  );
});

export default LeftPanel;