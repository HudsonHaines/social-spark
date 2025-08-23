// src/components/LeftPanel.jsx
import React, { useRef } from "react";
import {
  Settings2, Image as ImageIcon, Video as VideoIcon, Trash2, Plus,
  Save, Film, Eye, Copy, Loader2
} from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Radio({ label, checked, onChange }) {
  return (
    <label
      className={cx(
        "px-2 py-1 rounded-md border cursor-pointer select-none text-sm",
        checked ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
      )}
    >
      <input type="radio" className="hidden" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

export default function LeftPanel({
  // editor
  post,
  update,
  onDrop,
  handleImageFiles,
  handleVideoFile,
  clearVideo,
  removeImageAt,
  // deck
  addToDeck,
  duplicateToDeck,
  deck,
  loadFromDeck,
  deleteFromDeck,
  startPresentingDeck,
  loadingDeck,
  // brands
  brands,
  selectedBrandId,
  onSelectBrand,
  openBrandManager,
}) {
  const fileImgRef = useRef(null);
  const fileVidRef = useRef(null);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        <span className="font-medium">Controls</span>
      </div>

      <div className="p-4 space-y-6">
        {/* Brand */}
        <Section title="Brand">
          <div className="flex items-center gap-2">
            <select
              className="select flex-1"
              value={selectedBrandId || ""}
              onChange={(e) => onSelectBrand(e.target.value || null)}
            >
              <option value="">No brand selected</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {(b.fb_name || "FB name")} · @{b.ig_username || "ig"}
                </option>
              ))}
            </select>
            <button className="btn-outline" onClick={openBrandManager}>
              Manage brands
            </button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
                {post.platform === "facebook" ? (
                  selectedBrand?.fb_avatar_url ? (
                    <img src={selectedBrand.fb_avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )
                ) : selectedBrand?.ig_avatar_url ? (
                  <img src={selectedBrand.ig_avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 gap-2">
              <label className="text-xs text-slate-500">Facebook page name</label>
              <input
                className="input"
                value={post.brand?.name || ""}
                onChange={(e) => update({ brand: { ...post.brand, name: e.target.value } })}
                placeholder="e.g. Patagonia"
              />

              <div className="grid grid-cols-2 gap-2 items-center">
                <div className="col-span-1">
                  <label className="text-xs text-slate-500">Instagram username</label>
                  <input
                    className="input"
                    value={post.brand?.username || ""}
                    onChange={(e) =>
                      update({ brand: { ...post.brand, username: e.target.value.replace(/^@/, "") } })
                    }
                    placeholder="e.g. patagonia"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm col-span-1 mt-5">
                  <input
                    type="checkbox"
                    checked={!!post.brand?.verified}
                    onChange={(e) => update({ brand: { ...post.brand, verified: e.target.checked } })}
                  />
                  Verified badge
                </label>
              </div>
            </div>
          </div>
        </Section>

        {/* Post copy */}
        <Section title="Post copy">
          <textarea
            className="textarea"
            rows={5}
            value={post.caption || ""}
            onChange={(e) => update({ caption: e.target.value })}
            placeholder="Write your post copy here..."
          />
          <div className="text-xs text-slate-500 text-right">{(post.caption || "").length} chars</div>
        </Section>

        {/* Media */}
        <Section title="Media">
          <div className="flex items-center gap-2 pb-2 flex-wrap">
            <Radio
              label="Single"
              checked={post.type === "single"}
              onChange={() => update({ type: "single", videoSrc: "" })}
            />
            <Radio
              label="Carousel"
              checked={post.type === "carousel"}
              onChange={() => update({ type: "carousel", videoSrc: "" })}
            />
            <Radio
              label="Video"
              checked={post.type === "video"}
              onChange={() => update({ type: "video" })}
            />
            {post.platform === "instagram" ? (
              <label className="flex items-center gap-2 ml-auto text-sm">
                <input
                  type="checkbox"
                  checked={!!post.isReel}
                  onChange={(e) => update({ isReel: e.target.checked })}
                />
                Reel
              </label>
            ) : (
              <div className="flex items-center gap-3 ml-auto">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!post.fbSquare}
                    onChange={(e) => update({ fbSquare: e.target.checked })}
                  />
                  Square 1:1 (Facebook)
                </label>
                <span className="text-xs text-slate-500">Landscape uses 16:9</span>
              </div>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={onDrop}
            className="border-2 border-dashed rounded-xl p-4 text-center bg-slate-50"
          >
            <p className="text-sm mb-2">Drag files here, or</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button className="btn" onClick={() => fileImgRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-1" />
                Add images
              </button>
              <button className="btn-outline" onClick={() => fileVidRef.current?.click()}>
                <VideoIcon className="w-4 h-4 mr-1" />
                Add video
              </button>
            </div>

            <input
              ref={fileImgRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                if (e.target.files) await handleImageFiles(e.target.files);
              }}
            />
            <input
              ref={fileVidRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await handleVideoFile(f);
              }}
            />
          </div>

          {post.type !== "video" && post.media?.length ? (
            <div className="grid grid-cols-5 gap-2 pt-3">
              {post.media.map((m, i) => (
                <div
                  key={i}
                  className={cx(
                    "relative rounded-lg overflow-hidden border cursor-pointer",
                    i === post.activeIndex ? "ring-2 ring-blue-500" : ""
                  )}
                  onClick={() => update({ activeIndex: i })}
                >
                  <img src={m} className="w-full h-20 object-cover block" />
                  <button
                    className="absolute top-1 right-1 bg-white/90 rounded-full p-1 shadow"
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

          {post.type === "video" && post.videoSrc ? (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-600 truncate">Video loaded</div>
              <button className="chip" onClick={clearVideo}>
                <Trash2 className="w-3 h-3 mr-1" />
                Remove video
              </button>
            </div>
          ) : null}
        </Section>

        {/* Link preview (Facebook style) */}
        <Section title="Link preview (Facebook style)">
          <input
            className="input"
            placeholder="Headline"
            value={post.link?.headline || ""}
            onChange={(e) => update({ link: { ...post.link, headline: e.target.value } })}
          />
          <input
            className="input"
            placeholder="Subhead"
            value={post.link?.subhead || ""}
            onChange={(e) => update({ link: { ...post.link, subhead: e.target.value } })}
          />
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              placeholder="Link URL"
              value={post.link?.url || ""}
              onChange={(e) => update({ link: { ...post.link, url: e.target.value } })}
            />
            <select
              className="select"
              value={post.link?.cta || "Learn More"}
              onChange={(e) => update({ link: { ...post.link, cta: e.target.value } })}
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
        </Section>

        {/* Deck actions */}
        <Section title="Deck (multiple posts)">
          <div className="flex items-center gap-2">
            <button className="btn" onClick={addToDeck} disabled={loadingDeck}>
              {loadingDeck ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Add this post to deck
            </button>
            {deck.length ? (
              <button
                className="btn-outline"
                onClick={() => startPresentingDeck(deck[0]?.id)}
                disabled={!deck.length}
              >
                <Film className="w-4 h-4 mr-1" />
                Present deck
              </button>
            ) : null}
          </div>

          {deck.length ? (
            <div className="space-y-2 max-h-56 overflow-auto pr-1 pt-2">
              {deck.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between border rounded-lg p-2 hover:bg-slate-50"
                >
                  <div className="text-sm">
                    <div className="font-medium">
                      {new Date(d.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {(d.post?.brand?.name || "Brand")} · {d.post?.platform || "facebook"} ·{" "}
                      {d.post?.type || "single"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="chip" onClick={() => loadFromDeck(d.id)}>
                      <Eye className="w-3 h-3 mr-1" />
                      Load
                    </button>
                    <button className="chip" onClick={() => duplicateToDeck(d.id)}>
                      <Copy className="w-3 h-3 mr-1" />
                      Duplicate
                    </button>
                    <button className="chip" onClick={() => startPresentingDeck(d.id)}>
                      <Film className="w-3 h-3 mr-1" />
                      Start here
                    </button>
                    <button className="chip" onClick={() => deleteFromDeck(d.id)}>
                      <Trash2 className="w-3 h-3 mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Section>
      </div>
    </div>
  );
}
