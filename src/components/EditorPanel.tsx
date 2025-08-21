import React, { ChangeEvent, useRef } from "react";
import { fileToDataURL } from "../lib/utils";
import type { CTA, MediaItem, Mode } from "./FacebookPost";

export type EditorPanelProps = {
  author: string;
  timestamp: string;
  copy: string;
  profileUrl: string | null;
  mode: Mode;
  media: MediaItem[];
  slideIndex: number;
  linkUrl: string;
  linkHeadline: string;
  linkSubhead: string;
  cta: CTA;
  videoMuted: boolean;
  setAuthor: (v: string) => void;
  setTimestamp: (v: string) => void;
  setCopy: (v: string) => void;
  setProfileUrl: (v: string | null) => void;
  setMode: (v: Mode) => void;
  setLinkUrl: (v: string) => void;
  setLinkHeadline: (v: string) => void;
  setLinkSubhead: (v: string) => void;
  setCta: (v: CTA) => void;
  setVideoMuted: (v: boolean) => void;
  onAddFiles: (files: FileList | null) => Promise<void> | void;
  onRemoveAt: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onEditCardHeadline: (idx: number, text: string) => void;
  setSlideIndex: (i: number) => void;
};

const EditorPanel: React.FC<EditorPanelProps> = (props) => {
  const {
    author,
    timestamp,
    copy,
    profileUrl,
    mode,
    media,
    slideIndex,
    linkUrl,
    linkHeadline,
    linkSubhead,
    cta,
    videoMuted,
    setAuthor,
    setTimestamp,
    setCopy,
    setProfileUrl,
    setMode,
    setLinkUrl,
    setLinkHeadline,
    setLinkSubhead,
    setCta,
    setVideoMuted,
    onAddFiles,
    onRemoveAt,
    onMove,
    onEditCardHeadline,
    setSlideIndex,
  } = props;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const profileInputRef = useRef<HTMLInputElement | null>(null);

  const onProfileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileUrl(await fileToDataURL(file));
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow">
      <h2 className="mb-3 text-xl font-semibold">Controls</h2>

      <label className="mb-2 block text-sm font-medium">Author</label>
      <input
        className="mb-3 w-full rounded-xl border border-gray-300 p-2"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Your Page"
      />

      <label className="mb-2 block text-sm font-medium">Timestamp</label>
      <input
        className="mb-3 w-full rounded-xl border border-gray-300 p-2"
        value={timestamp}
        onChange={(e) => setTimestamp(e.target.value)}
        placeholder="Just now"
      />

      <label className="mb-2 block text-sm font-medium">Profile image</label>
      <div className="mb-3 flex items-center gap-3">
        <button
          className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white hover:opacity-90"
          onClick={() => profileInputRef.current?.click()}
        >
          Upload
        </button>
        <input
          ref={profileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onProfileChange}
        />
        {profileUrl && (
          <img src={profileUrl} alt="profile" className="h-8 w-8 rounded-full object-cover" />
        )}
      </div>

      <label className="mb-2 block text-sm font-medium">Post copy</label>
      <textarea
        className="mb-3 h-40 w-full resize-none rounded-xl border border-gray-300 p-3"
        value={copy}
        onChange={(e) => setCopy(e.target.value)}
        placeholder="Write your post copy here..."
      />

      <div className="mb-2 mt-2 flex items-center justify-between">
        <span className="text-sm font-medium">Mode</span>
        <div className="flex items-center gap-2">
          <button
            className={`rounded-xl px-3 py-1 text-sm ${
              mode === "static" ? "bg-gray-900 text-white" : "bg-gray-200"
            }`}
            onClick={() => setMode("static")}
          >
            Static
          </button>
          <button
            className={`rounded-xl px-3 py-1 text-sm ${
              mode === "carousel" ? "bg-gray-900 text-white" : "bg-gray-200"
            }`}
            onClick={() => setMode("carousel")}
          >
            Carousel/Video
          </button>
        </div>
      </div>

      {/* Video defaults */}
      <div className="mb-3 flex items-center gap-2">
        <input
          id="muteDefault"
          type="checkbox"
          checked={videoMuted}
          onChange={(e) => setVideoMuted(e.target.checked)}
        />
        <label htmlFor="muteDefault" className="text-sm">
          Mute video by default
        </label>
      </div>

      {mode === "static" && (
        <div className="mt-3 rounded-xl border p-3">
          <div className="mb-2 text-sm font-semibold">Link preview (Static)</div>

          <label className="mb-1 block text-xs font-medium">Destination URL</label>
          <input
            className="mb-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com/product"
          />

          <label className="mb-1 block text-xs font-medium">Headline</label>
          <input
            className="mb-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
            value={linkHeadline}
            onChange={(e) => setLinkHeadline(e.target.value)}
            placeholder="Post headline"
          />

          <label className="mb-1 block text-xs font-medium">Subhead</label>
          <input
            className="mb-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
            value={linkSubhead}
            onChange={(e) => setLinkSubhead(e.target.value)}
            placeholder="Short description"
          />

          <label className="mb-1 block text-xs font-medium">CTA</label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2 text-sm"
            value={cta}
            onChange={(e) => setCta(e.target.value as CTA)}
          >
            {(["Shop Now", "Learn More", "Sign Up", "Book Now", "Contact Us", "Download"] as CTA[]).map(
              (opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              )
            )}
          </select>
        </div>
      )}

      {mode === "carousel" && (
        <div className="mt-3 rounded-xl border p-3">
          <div className="mb-2 text-sm font-semibold">
            Link preview (Card {slideIndex + 1} of {media.length || 0})
          </div>

          <label className="mb-1 block text-xs font-medium">Headline (this card)</label>
          <input
            className="mb-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
            value={media[slideIndex]?.linkHeadline || ""}
            onChange={(e) => onEditCardHeadline(slideIndex, e.target.value)}
            placeholder="Card headline"
          />

          <div className="rounded-lg border p-3">
            <div className="mb-2 text-xs font-semibold text-gray-600">
              Global link settings (apply to all cards)
            </div>

            <label className="mb-1 block text-xs font-medium">Default Headline</label>
            <input
              className="mb-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={linkHeadline}
              onChange={(e) => setLinkHeadline(e.target.value)}
              placeholder="Default headline (optional)"
            />

            <label className="mb-1 block text-xs font-medium">Destination URL</label>
            <input
              className="mb-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/product"
            />

            <label className="mb-1 block text-xs font-medium">Subhead</label>
            <input
              className="mb-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={linkSubhead}
              onChange={(e) => setLinkSubhead(e.target.value)}
              placeholder="Short description"
            />

            <label className="mb-1 block text-xs font-medium">CTA</label>
            <select
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={cta}
              onChange={(e) => setCta(e.target.value as CTA)}
            >
              {(["Shop Now", "Learn More", "Sign Up", "Book Now", "Contact Us", "Download"] as CTA[]).map(
                (opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      )}

      {/* Files */}
      <div className="mb-3 mt-3 flex items-center gap-3">
        <button
          className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white hover:opacity-90"
          onClick={() => fileInputRef.current?.click()}
        >
          Add files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={mode === "static" ? "image/*" : "image/*,video/*"}
          multiple={mode === "carousel"}
          className="hidden"
          onChange={(e) => onAddFiles(e.target.files)}
        />
      </div>

      {media.length > 0 && (
        <ul className="max-h-56 space-y-2 overflow-auto pr-1">
          {media.map((m, i) => (
            <li
              key={`${m.name}-${i}`}
              className="flex items-center justify-between rounded-lg border bg-gray-50 p-2 text-sm"
            >
              <div className="flex items-center gap-2">
                {m.type === "image" ? (
                  <img src={m.url} alt="thumb" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-black/70 text-[10px] text-white">
                    VID
                  </div>
                )}
                <span className="max-w-[160px] truncate" title={m.name}>
                  {m.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {mode === "carousel" && (
                  <>
                    <button
                      className="rounded-md bg-gray-200 px-2 py-1"
                      onClick={() => onMove(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      className="rounded-md bg-gray-200 px-2 py-1"
                      onClick={() => onMove(i, 1)}
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  className="rounded-md bg-red-100 px-2 py-1 text-red-600"
                  onClick={() => onRemoveAt(i)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default React.memo(EditorPanel);
