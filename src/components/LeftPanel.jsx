import React, { useRef, useState, useMemo } from "react";
import {
  Settings2, Image as ImageIcon, Video as VideoIcon, Trash2,
  Save, Film, Eye, Copy, Loader2
} from "lucide-react";
import { useBrands } from "../data/brands";

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

function Radio({ label, checked, onChange, name, value, id }) {
  return (
    <label
      className={cx(
        "px-2 py-1 rounded-md border cursor-pointer select-none text-sm",
        checked ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
      )}
      htmlFor={id}
    >
      <input
        id={id}
        name={name}
        value={value}
        type="radio"
        className="hidden"
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
}

export default function LeftPanel({
  // editor
  user,
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
}) {
  const fileImgRef = useRef(null);
  const fileVidRef = useRef(null);

  // Supabase brands
  const { brands: brandRows, saveBrand, removeBrand, saving } = useBrands(user?.id);

  const selectedBrand = useMemo(
    () => brandRows.find((b) => b.id === post.brandId) || null,
    [brandRows, post.brandId]
  );

  // Inline Add Brand form
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    fb_name: "",
    fb_avatar_url: "",
    ig_username: "",
    ig_avatar_url: "",
    verified: false,
  });

  function syncPostBrandFromRow(row) {
    if (!row) {
      update({
        brandId: null,
        brand: { name: "", username: "", profileSrc: "", verified: false },
      });
      return;
    }
    const profileSrc =
      post.platform === "facebook"
        ? (row.fb_avatar_url || "")
        : (row.ig_avatar_url || "");

    update({
      brandId: row.id,
      brand: {
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

  async function handleAddBrand(e) {
    e.preventDefault();
    if (!user?.id) return;
    const saved = await saveBrand(form);
    setForm({
      fb_name: "",
      fb_avatar_url: "",
      ig_username: "",
      ig_avatar_url: "",
      verified: false,
    });
    setShowAdd(false);
    syncPostBrandFromRow(saved);
  }

  async function handleDeleteSelected() {
    if (!post.brandId) return;
    await removeBrand(post.brandId);
    syncPostBrandFromRow(null);
  }

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
              id="brand_select"
              name="brand_select"
              className="select flex-1"
              value={post.brandId || ""}
              onChange={(e) => handlePickBrand(e.target.value || null)}
            >
              <option value="">No brand selected</option>
              {brandRows.map((b) => (
                <option key={b.id} value={b.id}>
                  {(b.fb_name || "FB name")} · @{b.ig_username || "ig"}{b.verified ? " ✓" : ""}
                </option>
              ))}
            </select>

            <button className="btn-outline" onClick={() => setShowAdd((s) => !s)}>
              Add
            </button>

            <button
              className="btn-outline text-red-600 border-red-200"
              onClick={handleDeleteSelected}
              disabled={!post.brandId || saving}
              title="Delete selected brand"
            >
              Delete
            </button>
          </div>

          {showAdd && (
            <form
              onSubmit={handleAddBrand}
              className="mt-3 border rounded-xl p-3 space-y-3 bg-white"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="fb_name" className="text-xs text-slate-500">Facebook name</label>
                  <input
                    id="fb_name"
                    name="fb_name"
                    className="input"
                    placeholder="e.g. Patagonia"
                    value={form.fb_name}
                    onChange={(e) => setForm((f) => ({ ...f, fb_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="fb_avatar_url" className="text-xs text-slate-500">Facebook avatar URL</label>
                  <input
                    id="fb_avatar_url"
                    name="fb_avatar_url"
                    className="input"
                    placeholder="https://..."
                    value={form.fb_avatar_url}
                    onChange={(e) => setForm((f) => ({ ...f, fb_avatar_url: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="ig_username" className="text-xs text-slate-500">Instagram username</label>
                  <input
                    id="ig_username"
                    name="ig_username"
                    className="input"
                    placeholder="e.g. patagonia"
                    value={form.ig_username}
                    onChange={(e) => setForm((f) => ({ ...f, ig_username: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="ig_avatar_url" className="text-xs text-slate-500">Instagram avatar URL</label>
                  <input
                    id="ig_avatar_url"
                    name="ig_avatar_url"
                    className="input"
                    placeholder="https://..."
                    value={form.ig_avatar_url}
                    onChange={(e) => setForm((f) => ({ ...f, ig_avatar_url: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="brand_verified"
                  name="brand_verified"
                  type="checkbox"
                  checked={form.verified}
                  onChange={(e) => setForm((f) => ({ ...f, verified: e.target.checked }))}
                />
                <label htmlFor="brand_verified" className="text-sm">Verified</label>
              </div>

              <div className="flex items-center gap-2">
                <button className={cx("btn", saving && "opacity-70")} disabled={saving}>
                  Save brand
                </button>
                <button type="button" className="btn" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

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

            {/* Per-post overrides still supported */}
            <div className="flex-1 grid grid-cols-1 gap-2">
              <label className="text-xs text-slate-500" htmlFor="brand_name">Facebook page name</label>
              <input
                id="brand_name"
                name="brand_name"
                className="input"
                value={post.brand?.name || ""}
                onChange={(e) => update({ brand: { ...post.brand, name: e.target.value } })}
                placeholder="e.g. Patagonia"
              />

              <div className="grid grid-cols-2 gap-2 items-center">
                <div className="col-span-1">
                  <label className="text-xs text-slate-500" htmlFor="brand_username">Instagram username</label>
                  <input
                    id="brand_username"
                    name="brand_username"
                    className="input"
                    value={post.brand?.username || ""}
                    onChange={(e) =>
                      update({ brand: { ...post.brand, username: e.target.value.replace(/^@/, "") } })
                    }
                    placeholder="e.g. patagonia"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm col-span-1 mt-5">
                  <input
                    id="brand_verified_override"
                    name="brand_verified_override"
                    type="checkbox"
                    checked={!!post.brand?.verified}
                    onChange={(e) => update({ brand: { ...post.brand, verified: e.target.checked } })}
                  />
                  <label htmlFor="brand_verified_override">Verified badge</label>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Post copy */}
        <Section title="Post copy">
          <label htmlFor="post_caption" className="sr-only">Post caption</label>
          <textarea
            id="post_caption"
            name="post_caption"
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
            {/* Images: auto chooses single vs carousel based on count */}
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
            {/* Video */}
            <Radio
              id="type_video"
              name="media_type"
              value="video"
              label="Video"
              checked={post.type === "video"}
              onChange={() => update({ type: "video" })}
            />

            {post.platform === "instagram" ? (
              <div className="flex items-center gap-2 ml-auto text-sm">
                <input
                  id="is_reel"
                  name="is_reel"
                  type="checkbox"
                  checked={!!post.isReel}
                  onChange={(e) => update({ isReel: e.target.checked })}
                />
                <label htmlFor="is_reel">Reel</label>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-2 text-sm">
                  <input
                    id="fb_square"
                    name="fb_square"
                    type="checkbox"
                    checked={!!post.fbSquare}
                    onChange={(e) => update({ fbSquare: e.target.checked })}
                  />
                  <label htmlFor="fb_square">Square 1:1 (Facebook)</label>
                </div>
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
              id="image_files"
              name="image_files"
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
              id="video_file"
              name="video_file"
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

          {/* Per-image headline editor */}
          {post.type !== "video" && (post.media?.length || 0) > 0 ? (
            <div className="pt-3">
              <label htmlFor="image_headline" className="text-xs text-slate-500">
                Headline for image {post.activeIndex + 1}
              </label>
              <input
                id="image_headline"
                name="image_headline"
                className="input mt-1"
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

        {/* Link preview (Facebook style) */}
        <Section title="Link preview (Facebook style)">
          <label htmlFor="link_headline" className="sr-only">Headline</label>
          <input
            id="link_headline"
            name="link_headline"
            className="input"
            placeholder="Headline"
            value={post.link?.headline || ""}
            onChange={(e) => update({ link: { ...post.link, headline: e.target.value } })}
          />
          <label htmlFor="link_subhead" className="sr-only">Subhead</label>
          <input
            id="link_subhead"
            name="link_subhead"
            className="input"
            placeholder="Subhead"
            value={post.link?.subhead || ""}
            onChange={(e) => update({ link: { ...post.link, subhead: e.target.value } })}
          />
          <div className="flex items-center gap-2">
            <label htmlFor="link_url" className="sr-only">Link URL</label>
            <input
              id="link_url"
              name="link_url"
              className="input flex-1"
              placeholder="Link URL"
              value={post.link?.url || ""}
              onChange={(e) => update({ link: { ...post.link, url: e.target.value } })}
              autoComplete="url"
            />
            <label htmlFor="link_cta" className="sr-only">CTA</label>
            <select
              id="link_cta"
              name="link_cta"
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
                      {(d.post?.brand?.name || "Brand")} · {d.post?.platform || "facebook"} · {d.post?.type || "single"}
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
