// src/components/LeftPanel.jsx
import React, { useRef, useMemo } from "react";
import {
  Settings2,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  Film,
  Eye,
  Copy,
} from "lucide-react";
import { useBrands } from "../data/brands";

const cx = (...a) => a.filter(Boolean).join(" ");

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <div className="label-strong">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Radio({ label, checked, onChange, name, value, id }) {
  return (
    <label
      className={cx(
        "px-3 py-2 rounded-lg border cursor-pointer select-none text-sm transition-colors",
        checked 
          ? "bg-app-strong text-white border-app-strong" 
          : "bg-white hover:bg-slate-50 border-app-border"
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

// NEW: Platform Selector Component
function PlatformSelector({ platform, setPlatform }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          className={cx(
            "btn-outline flex-1 flex items-center justify-center",
            platform === "facebook" ? "bg-blue-50 border-blue-300 text-blue-700" : ""
          )}
          onClick={() => setPlatform("facebook")}
          aria-pressed={platform === "facebook"}
        >
          <span className="text-blue-600 mr-2 font-bold text-lg">f</span>
          Facebook
        </button>
        <button
          className={cx(
            "btn-outline flex-1 flex items-center justify-center",
            platform === "instagram" ? "bg-pink-50 border-pink-300 text-pink-700" : ""
          )}
          onClick={() => setPlatform("instagram")}
          aria-pressed={platform === "instagram"}
        >
          <span className="mr-2">📷</span>
          Instagram
        </button>
      </div>
      {/* Platform-specific hints */}
      <div className="text-xs text-app-muted">
        {platform === "instagram" 
          ? "Instagram posts are always square (1:1 aspect ratio)"
          : "Facebook supports multiple aspect ratios - select one below in Media section"
        }
      </div>
    </div>
  );
}

export default function LeftPanel(props) {
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
    // deck (local)
    addToDeck,
    duplicateToDeck,
    deck,
    loadFromDeck,
    deleteFromDeck,
    startPresentingDeck,
    loadingDeck,
    // brand manager
    openBrandManager,
    // save helpers
    saveToDeck,
    openDeckPicker,
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

  function syncPostBrandFromRow(row) {
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
  }

  function handlePickBrand(idOrNull) {
    const row = brandRows.find((r) => r.id === idOrNull) || null;
    syncPostBrandFromRow(row);
  }

  return (
    <div className="panel overflow-hidden flex flex-col h-full">
      {/* Fixed header */}
      <div className="panel-header flex items-center gap-2 flex-shrink-0">
        <Settings2 className="w-4 h-4 text-app-body" />
        <span className="font-medium text-app-strong">Controls</span>
      </div>

      {/* Single scrollable region */}
      <div 
        className="flex-1 overflow-auto bg-app-surface"
        style={{ height: 'calc(100vh - 12rem)' }}
      >
        <div className="p-4 space-y-6">
          {/* NEW: Platform Section - Added at the top */}
          <Section title="Platform">
            <PlatformSelector 
              platform={post.platform || "facebook"} 
              setPlatform={(p) => update({ platform: p })}
              currentPost={post}
            />
          </Section>

          {/* Divider */}
          <div className="border-t border-app-border"></div>

          {/* Brand Section - Simplified */}
          <Section title="Brand">
            <div className="flex items-center gap-2">
              <select
                id="brand_select"
                name="brand_select"
                className="select flex-1"
                value={safeBrandId || ""}
                onChange={(e) => handlePickBrand(e.target.value || null)}
              >
                <option value="">Select a brand</option>
                {brandRows.map((b) => (
                  <option key={b.id} value={b.id}>
                    {(b.fb_name || "FB name")} · @{b.ig_username || "ig"}
                    {b.verified ? " ✓" : ""}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-outline flex-shrink-0" onClick={openBrandManager}>
                Manage
              </button>
            </div>

            {/* Simple brand preview */}
            {selectedBrand && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-app-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                  {post.platform === "facebook" ? (
                    selectedBrand?.fb_avatar_url ? (
                      <img
                        src={selectedBrand.fb_avatar_url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-app-muted" />
                    )
                  ) : selectedBrand?.ig_avatar_url ? (
                    <img
                      src={selectedBrand.ig_avatar_url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-app-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {post.platform === "facebook" 
                      ? (selectedBrand.fb_name || "Facebook Page")
                      : `@${selectedBrand.ig_username || "instagram"}`
                    }
                    {selectedBrand.verified ? " ✓" : ""}
                  </div>
                  <div className="text-xs text-app-muted">
                    {post.platform === "facebook" ? "Facebook" : "Instagram"} · {post.platform === "facebook" ? "Page" : "Account"}
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Divider */}
          <div className="border-t border-app-border"></div>

          {/* Post copy Section */}
          <Section title="Post copy">
            <div>
              <label htmlFor="post_caption" className="sr-only">
                Post caption
              </label>
              <textarea
                id="post_caption"
                name="post_caption"
                className="textarea"
                rows={5}
                value={post.caption || ""}
                onChange={(e) => update({ caption: e.target.value })}
                placeholder="Write your post copy here..."
              />
              <div className="text-xs text-app-muted text-right mt-1">
                {(post.caption || "").length} chars
              </div>
            </div>
          </Section>

          {/* Divider */}
          <div className="border-t border-app-border"></div>

          {/* Media Section */}
          <Section title="Media">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-3 text-sm">
                {post.platform === "instagram" ? (
                  <div className="w-full">
                    <label className="block text-xs text-app-muted mb-2">Instagram ad format</label>
                    <select
                      className="select w-full text-sm"
                      value={post.igAdFormat || "feed-1:1"}
                      onChange={(e) => {
                        const [type, ratio] = e.target.value.split('-');
                        update({ 
                          igAdFormat: e.target.value,
                          fbAspectRatio: ratio, // Still use fbAspectRatio for rendering consistency
                          igAdType: type,
                          isReel: type === "reels" // Auto-set reel flag for Reels ads
                        });
                      }}
                    >
                      <optgroup label="📸 Feed Ads">
                        <option value="feed-1:1">Feed - Square (1:1) - 1080×1080</option>
                        <option value="feed-4:5">Feed - Vertical (4:5) - 1080×1350</option>
                        <option value="feed-16:9">Feed Video - Landscape (16:9) - up to 60s</option>
                      </optgroup>
                      <optgroup label="📱 Stories & Reels">
                        <option value="story-9:16">Story Ads - Vertical (9:16) - 1080×1920</option>
                        <option value="reels-9:16">Reels Ads - Vertical (9:16) - 1080×1920</option>
                      </optgroup>
                      <optgroup label="🔍 Discovery">
                        <option value="explore-1:1">Explore - Square (1:1) - 1080×1080</option>
                        <option value="explore-4:5">Explore - Vertical (4:5) - 1080×1350</option>
                      </optgroup>
                      <optgroup label="🛍️ Shopping">
                        <option value="shop-1:1">Shop Ads - Square (1:1) - 1080×1080</option>
                        <option value="carousel-1:1">Carousel - Square (1:1) - 1080×1080</option>
                      </optgroup>
                    </select>
                    
                    {/* Format-specific notes */}
                    <div className="text-xs text-app-muted mt-2">
                      {post.igAdFormat === "feed-1:1" && "Most flexible format, shows in main feed"}
                      {post.igAdFormat === "feed-4:5" && "Vertical format, takes up more feed space"}
                      {post.igAdFormat === "feed-16:9" && "Landscape video format, up to 60 seconds"}
                      {post.igAdFormat === "story-9:16" && "Full-screen vertical, up to 15s per card, best for swipe-up CTAs"}
                      {post.igAdFormat === "reels-9:16" && "Plays in Reels feed, feels native, up to 90 seconds"}
                      {post.igAdFormat === "explore-1:1" && "Shows in Explore grid when users browse"}
                      {post.igAdFormat === "explore-4:5" && "Vertical Explore format for more visual impact"}
                      {post.igAdFormat === "shop-1:1" && "Product-focused, connects directly to Instagram Shop"}
                      {post.igAdFormat === "carousel-1:1" && "Up to 10 cards, great for multiple products or features"}
                      {!post.igAdFormat && "Select an Instagram ad format to see specific notes"}
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    <label className="block text-xs text-app-muted mb-2">Facebook ad format</label>
                    <select
                      className="select w-full text-sm"
                      value={post.fbAdFormat || "feed-1:1"}
                      onChange={(e) => {
                        const [type, ratio] = e.target.value.split('-');
                        update({ 
                          fbAdFormat: e.target.value,
                          fbAspectRatio: ratio,
                          fbAdType: type
                        });
                      }}
                    >
                      <optgroup label="📰 Feed Ads">
                        <option value="feed-1:1">Feed - Square (1:1) - 1080×1080</option>
                        <option value="feed-4:5">Feed - Vertical (4:5) - 1080×1350</option>
                      </optgroup>
                      <optgroup label="🎥 Video Ads">
                        <option value="video-4:5">Video Feed - Vertical (4:5) - 1080×1350</option>
                        <option value="video-16:9">Video Feed - Landscape (16:9) - 1280×720</option>
                        <option value="instream-16:9">In-stream Video - Landscape (16:9) - 1280×720</option>
                      </optgroup>
                      <optgroup label="📱 Stories & Reels">
                        <option value="story-9:16">Story Ads - Vertical (9:16) - 1080×1920</option>
                        <option value="reels-9:16">Reels Ads - Vertical (9:16) - 1080×1920</option>
                      </optgroup>
                      <optgroup label="🛍️ Shopping">
                        <option value="marketplace-1:1">Marketplace - Square (1:1) - 1080×1080</option>
                        <option value="carousel-1:1">Carousel - Square (1:1) - 1080×1080</option>
                        <option value="collection-1.91:1">Collection Cover - Landscape (1.91:1) - 1200×628</option>
                      </optgroup>
                      <optgroup label="💻 Desktop">
                        <option value="rightcolumn-1:1">Right Column - Square (1:1) - 1200×1200</option>
                      </optgroup>
                    </select>
                    
                    {/* Format-specific notes */}
                    <div className="text-xs text-app-muted mt-2">
                      {post.fbAdFormat === "feed-1:1" && "High visibility feed placement with CTA buttons"}
                      {post.fbAdFormat === "feed-4:5" && "Vertical feed format, great for product ads"}
                      {post.fbAdFormat === "video-4:5" && "Auto-plays muted, short videos perform better"}
                      {post.fbAdFormat === "video-16:9" && "Landscape video format for feed placement"}
                      {post.fbAdFormat === "instream-16:9" && "Plays inside longer videos, skippable after 5s"}
                      {post.fbAdFormat === "story-9:16" && "Full-screen vertical, same as Instagram Stories"}
                      {post.fbAdFormat === "reels-9:16" && "Auto-plays in Reels feed, up to 90 seconds"}
                      {post.fbAdFormat === "marketplace-1:1" && "Targets users actively shopping"}
                      {post.fbAdFormat === "carousel-1:1" && "Up to 10 cards, great for product showcases"}
                      {post.fbAdFormat === "collection-1.91:1" && "Opens Instant Experience, optimized for shopping"}
                      {post.fbAdFormat === "rightcolumn-1:1" && "Desktop only, lower CTR but cheap impressions"}
                      {!post.fbAdFormat && "Select a Facebook ad format to see specific notes"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={onDrop}
              className="border-2 border-dashed border-app-border rounded-lg p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <p className="text-sm text-app-body mb-3">Drag files here, or</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button className="btn" onClick={() => fileImgRef.current?.click()}>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Add images
                </button>
                <button className="btn-outline" onClick={() => fileVidRef.current?.click()}>
                  <VideoIcon className="w-4 h-4 mr-2" />
                  Add video
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

            {/* Image thumbnails */}
            {post.type !== "video" && post.media?.length ? (
              <div className="grid grid-cols-5 gap-2">
                {post.media.map((m, i) => (
                  <div
                    key={i}
                    className={cx(
                      "relative rounded-lg overflow-hidden border cursor-pointer transition-all",
                      i === post.activeIndex 
                        ? "ring-2 ring-brand-500 border-brand-500" 
                        : "border-app-border hover:border-brand-300"
                    )}
                    onClick={() => update({ activeIndex: i })}
                  >
                    <img src={m} className="w-full h-16 object-cover block" alt="" />
                    <button
                      className="absolute top-1 right-1 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImageAt(i);
                      }}
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Video indicator */}
            {post.type === "video" && post.videoSrc ? (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-app-border">
                <div className="text-sm text-app-body">Video loaded</div>
                <button className="chip hover:bg-red-50 hover:text-red-600 transition-colors" onClick={clearVideo}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Remove video
                </button>
              </div>
            ) : null}

            {/* Per-image headline editor */}
            {post.type !== "video" && (post.media?.length || 0) > 0 ? (
              <div>
                <label htmlFor="image_headline" className="block text-xs text-app-muted mb-2">
                  Headline for image {post.activeIndex + 1}
                </label>
                <input
                  id="image_headline"
                  name="image_headline"
                  className="input"
                  placeholder="Enter headline for this image"
                  value={post.mediaMeta?.[post.activeIndex]?.headline || ""}
                  onChange={(e) => {
                    const next = (post.mediaMeta || []).slice();
                    const idx = post.activeIndex || 0;
                    next[idx] = { ...(next[idx] || {}), headline: e.target.value };
                    update({ mediaMeta: next });
                  }}
                />
              </div>
            ) : null}
          </Section>

          {/* Divider */}
          <div className="border-t border-app-border"></div>

          {/* Link preview Section - UPDATED: Only show for Facebook */}
          {post.platform === "facebook" && (
            <Section title="Link preview (Facebook style)">
              <div className="space-y-3">
                <input
                  id="link_headline"
                  name="link_headline"
                  className="input"
                  placeholder="Headline"
                  value={post.link?.headline || ""}
                  onChange={(e) => update({ link: { ...(post.link || {}), headline: e.target.value } })}
                />
                <input
                  id="link_subhead"
                  name="link_subhead"
                  className="input"
                  placeholder="Subhead"
                  value={post.link?.subhead || ""}
                  onChange={(e) => update({ link: { ...(post.link || {}), subhead: e.target.value } })}
                />
                <div className="flex items-center gap-2">
                  <input
                    id="link_url"
                    name="link_url"
                    className="input flex-1"
                    placeholder="Link URL"
                    value={post.link?.url || ""}
                    onChange={(e) => update({ link: { ...(post.link || {}), url: e.target.value } })}
                    autoComplete="url"
                  />
                  <select
                    id="link_cta"
                    name="link_cta"
                    className="select w-auto"
                    value={post.link?.cta || "Learn More"}
                    onChange={(e) => update({ link: { ...(post.link || {}), cta: e.target.value } })}
                  >
                    {["Learn More", "Shop Now", "Sign Up", "Download", "Book Now", "Contact Us"].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </Section>
          )}

          {/* Divider - only show if link section was shown */}
          {post.platform === "facebook" && <div className="border-t border-app-border"></div>}

          {/* Deck Section */}
          <Section title="Deck (multiple posts)">
            <div className="flex items-center gap-2 flex-wrap">
              <button className="btn" onClick={() => openDeckPicker?.()}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Add this post to deck
              </button>
              <button
                className="btn-outline"
                title="Quick save with title prompt"
                onClick={() => saveToDeck?.()}
              >
                Quick save
              </button>
              {deck.length > 0 && (
                <button
                  className="btn-outline"
                  onClick={() => startPresentingDeck(deck[0]?.id)}
                  disabled={!deck.length}
                >
                  <Film className="w-4 h-4 mr-2" />
                  Present deck
                </button>
              )}
            </div>

            {deck.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                {deck.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between border border-app-border rounded-lg p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="text-sm min-w-0">
                      <div className="font-medium text-app-strong truncate">
                        {new Date(d.createdAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-app-muted truncate">
                        {(d.post?.brand?.name || "Brand")} · {d.post?.platform || "facebook"} ·{" "}
                        {d.post?.type || "single"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button className="chip text-xs" onClick={() => loadFromDeck(d.id)}>
                        <Eye className="w-3 h-3 mr-1" />
                        Load
                      </button>
                      <button className="chip text-xs" onClick={() => duplicateToDeck(d.id)}>
                        <Copy className="w-3 h-3 mr-1" />
                        Duplicate
                      </button>
                      <button className="chip text-xs" onClick={() => startPresentingDeck(d.id)}>
                        <Film className="w-3 h-3 mr-1" />
                        Start here
                      </button>
                      <button className="chip text-xs hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => deleteFromDeck(d.id)}>
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}