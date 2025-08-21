import React, { useRef, useState } from "react";
import { domainFromUrl } from "../lib/utils";

export const CTA_OPTIONS = [
  "Shop Now",
  "Learn More",
  "Sign Up",
  "Book Now",
  "Contact Us",
  "Download",
] as const;
export type CTA = typeof CTA_OPTIONS[number];

export type Mode = "static" | "carousel";

export type MediaItem = {
  url: string;
  type: "image" | "video";
  name: string;
  linkHeadline?: string; // optional per-card headline
};

export type FacebookPostProps = {
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
  nextSlide: () => void;
  prevSlide: () => void;

  // video controls
  videoMuted: boolean;
  onToggleMute: () => void;
};

const FacebookPost: React.FC<FacebookPostProps> = ({
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
  nextSlide,
  prevSlide,
  videoMuted,
  onToggleMute,
}) => {
  const current = media[slideIndex];
  const h = mode === "carousel" ? current?.linkHeadline || linkHeadline : linkHeadline;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const renderMedia = (m?: MediaItem, altKey?: string) => {
    if (!m) return null;
    if (m.type === "image") {
      return (
        <img
          src={m.url}
          alt={altKey || "media"}
          className="mx-auto w-full object-contain"
          loading="lazy"
        />
      );
    }
    // video
    return (
      <div className="relative">
        <video
          ref={videoRef}
          src={m.url}
          muted={videoMuted}
          className="mx-auto w-full"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        {/* Center play/pause control */}
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white shadow"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          <span className="text-2xl">{isPlaying ? "❚❚" : "▶"}</span>
        </button>
        {/* Mute toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
          aria-label={videoMuted ? "Unmute video" : "Mute video"}
        >
          {videoMuted ? "🔇" : "🔊"}
        </button>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <img
            src={
              profileUrl ||
              "https://ui-avatars.com/api/?name=FB&background=0D8ABC&color=fff"
            }
            alt="profile"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-[#050505]">
              {author || "Your Page"}
            </div>
            <div className="text-[12px] text-[#65676B]">
              {timestamp || "Just now"} · <span title="Public">🌎</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className="whitespace-pre-wrap px-4 pb-3 pt-3 text-[14px] leading-[1.34] text-[#050505]">
        {copy || "Write your post copy in the panel to the left."}
      </div>

      {/* Media */}
      {media.length > 0 && (
        <div className="relative">
          {mode === "static" ? (
            <div className="relative overflow-hidden bg-black">
              {renderMedia(media[0], "media-0")}
            </div>
          ) : (
            <div className="relative overflow-hidden bg-black">
              {renderMedia(current, `slide-${slideIndex}`)}

              {/* Carousel arrows */}
              {media.length > 1 && (
                <>
                  {slideIndex > 0 && (
                    <button
                      onClick={prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-white focus:outline-none"
                      aria-label="Previous"
                    >
                      <span className="text-2xl">‹</span>
                    </button>
                  )}
                  {slideIndex < media.length - 1 && (
                    <button
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-white focus:outline-none"
                      aria-label="Next"
                    >
                      <span className="text-2xl">›</span>
                    </button>
                  )}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                    {slideIndex + 1} / {media.length}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Link preview */}
      {(linkUrl || h || linkSubhead) && (
        <div className="w-full bg-[#F0F2F5]">
          <a href={linkUrl || "#"} className="block w-full no-underline">
            <div className="flex w-full items-start gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="min-w-0">
                  <div
                    className="truncate text-[11px] uppercase text-[#65676B]"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    {domainFromUrl(linkUrl)}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-[#050505]">
                    {h || "Your headline"}
                  </div>
                  <div className="mt-1 text-[12px] text-[#65676B]">
                    {linkSubhead || "Your subhead goes here."}
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button className="rounded-md bg-[#1877F2] px-4 py-[6px] text-[12px] font-semibold uppercase text-white hover:bg-[#166FE5] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#166FE5]/40 transition-colors">
                    {cta}
                  </button>
                </div>
              </div>
            </div>
          </a>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between text-[13px] text-[#65676B]">
          <span>0 likes</span>
          <span>0 comments</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t pt-1 text-[14px] text-[#65676B]">
          <button className="rounded-md px-2 py-1 hover:bg-gray-100">👍 Like</button>
          <button className="rounded-md px-2 py-1 hover:bg-gray-100">💬 Comment</button>
          <button className="rounded-md px-2 py-1 hover:bg-gray-100">↗ Share</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FacebookPost);
