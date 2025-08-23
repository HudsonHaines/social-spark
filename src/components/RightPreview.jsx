// src/components/RightPreview.jsx
import React, { useMemo } from "react";
import {
  Download, Loader2, CheckCircle2, ChevronLeft, ChevronRight,
  Play, Square, VolumeX, Volume2, Image as ImageIcon
} from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

function formatCaption(text) {
  if (!text) return [];
  const out = [];
  const re = /([#@][A-Za-z0-9_.]+)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    if (start > last) out.push({ type: "text", value: text.slice(last, start) });
    const token = m[0];
    out.push({ type: token.startsWith("#") ? "hashtag" : "mention", value: token });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

const Box = ({ children }) => (
  <div className="bg-white rounded-2xl shadow-sm border mx-auto max-w-[720px]">
    {children}
  </div>
);

const Header = ({ title, onPng, saving }) => (
  <div className="px-4 py-3 border-b flex items-center justify-between">
    <div className="font-medium">{title}</div>
    <div className="flex items-center gap-2">
      <button className="btn-outline" onClick={onPng} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
        PNG
      </button>
    </div>
  </div>
);

const Frame = React.forwardRef(function Frame({ children }, ref) {
  return (
    <div className="p-3 md:p-6 bg-slate-50">
      <div ref={ref} className="mx-auto bg-white rounded-xl border shadow-sm overflow-hidden max-w-[560px]">
        {children}
      </div>
    </div>
  );
});

export default React.forwardRef(function RightPreview(
  { post, setPost, mode, saveAsPng, savingImg, videoRef },
  ref
) {
  return (
    <div className={cx("relative", mode === "present" ? "p-6" : "")}>
      <Box>
        <Header title="Live preview" onPng={saveAsPng} saving={savingImg} />
        <Frame ref={ref}>
          {post.platform === "facebook" ? (
            <FacebookPost post={post} setPost={setPost} videoRef={videoRef} />
          ) : (
            <InstagramPost post={post} setPost={setPost} videoRef={videoRef} />
          )}
        </Frame>
      </Box>
    </div>
  );
});

/* ---------- Facebook ---------- */

function FacebookPost({ post, setPost, videoRef }) {
  const parts = useMemo(() => formatCaption(post.caption || ""), [post.caption]);
  const hasCarousel = post.type === "carousel" && (post.media?.length || 0) > 1;

  return (
    <div className="text-[15px]" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200">
          {post.brand?.profileSrc ? (
            <img src={post.brand.profileSrc} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1 font-semibold">
            <span>{post.brand?.name || "Brand"}</span>
            {post.brand?.verified ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : null}
          </div>
          <div className="text-xs text-slate-500">
            Just now · <span className="inline-block w-3 h-3 align-[-2px] bg-slate-300 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Copy */}
      {(post.caption || "").length ? (
        <div className="px-4 pb-3 whitespace-pre-wrap">
          {parts.map((p, i) => {
            if (p.type === "text") return <span key={i}>{p.value}</span>;
            if (p.type === "hashtag" || p.type === "mention")
              return <span key={i} className="text-blue-600">{p.value}</span>;
            return null;
          })}
        </div>
      ) : null}

      {/* Media frame */}
      <div className="relative overflow-hidden">
        <MediaFrame post={post} videoRef={videoRef} setPost={setPost} />
        {hasCarousel ? <CarouselArrows post={post} setPost={setPost} /> : null}
      </div>

      {/* Link preview (text-only full width, no gray box) */}
      {(post.link?.url || post.link?.headline || post.link?.subhead) ? (
        <div className="w-full border-t">
          <div className="px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              {(post.link?.url || "example.com").replace(/https?:\/\//, "").replace(/\/$/, "")}
            </div>
            <div className="mt-1 font-semibold leading-snug">
              {post.link?.headline || "Link headline"}
            </div>
            <div className="mt-1 text-[13px] text-slate-600 leading-snug">
              {post.link?.subhead || "Short description"}
            </div>
            <div className="pt-2">
              <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium">
                {post.link?.cta || "Learn More"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="px-4 py-2 text-sm text-slate-600 flex items-center justify-between border-t">
        <div>{Number(post.metrics?.likes || 0).toLocaleString()} Likes</div>
        <div className="flex items-center gap-4">
          <div>{Number(post.metrics?.comments || 0).toLocaleString()} Comments</div>
          <div>{Number(post.metrics?.shares || 0).toLocaleString()} Shares</div>
        </div>
      </div>
      <div className="grid grid-cols-3 text-sm text-slate-700">
        {["Like", "Comment", "Share"].map((t) => (
          <div key={t} className="py-2 text-center hover:bg-slate-50 cursor-default select-none">
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Instagram ---------- */

function InstagramPost({ post, setPost, videoRef }) {
  const parts = useMemo(() => formatCaption(post.caption || ""), [post.caption]);
  const hasCarousel = (post.type === "carousel" && (post.media?.length || 0) > 1) || ((post.media?.length || 0) > 1);

  return (
    <div className="text-[14px]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200">
          {post.brand?.profileSrc ? (
            <img src={post.brand.profileSrc} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="flex items-center gap-1 font-semibold">
          <span>{post.brand?.username || "brand"}</span>
          {post.brand?.verified ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : null}
        </div>
      </div>

      {/* Media */}
      <div className="relative bg-black">
        <MediaFrame post={{ ...post, platform: "instagram" }} videoRef={videoRef} setPost={setPost} />
        {hasCarousel ? (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {(post.media || []).map((_, i) => (
              <span
                key={i}
                className={cx("w-1.5 h-1.5 rounded-full", i === (post.activeIndex || 0) ? "bg-white" : "bg-white/40")}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Metrics */}
      <div className="px-3 py-2 text-sm font-semibold">
        {Number(post.metrics?.likes || 0).toLocaleString()} likes
      </div>

      {/* Caption */}
      {(post.caption || "").length ? (
        <div className="px-3 pb-3 text-sm">
          <span className="font-semibold mr-1">{post.brand?.username || "brand"}</span>
          {parts.map((p, i) => {
            if (p.type === "text") return <span key={i}>{p.value}</span>;
            if (p.type === "hashtag" || p.type === "mention")
              return <span key={i} className="text-blue-600">{p.value}</span>;
            return null;
          })}
        </div>
      ) : null}

      {post.isReel && post.type === "video" ? (
        <div className="px-3 pb-3 text-xs text-slate-500">
          {Number(post.metrics?.views || 0).toLocaleString()} views
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Media Frame + Controls ---------- */

function MediaFrame({ post, videoRef, setPost }) {
  // aspect
  let paddingTop;
  if (post.platform === "facebook") {
    if (post.type === "video") paddingTop = `${100 / (9 / 16)}%`; // 16:9
    else paddingTop = post.fbSquare ? "100%" : `${100 / (9 / 16)}%`; // 1:1 or 16:9
  } else {
    // Instagram
    paddingTop = post.isReel ? `${100 / (9 / 16)}%` : "100%";
  }

  const active = (post.media || [])[post.activeIndex || 0];

  return (
    <div className="relative w-full bg-black/5 overflow-hidden">
      <div className="w-full" style={{ paddingTop }} />
      <div className="absolute inset-0 bg-black/5">
        {post.type === "video" && post.videoSrc ? (
          <VideoPlayer post={post} videoRef={videoRef} setPost={setPost} />
        ) : active ? (
          <img src={active} className="w-full h-full object-cover block" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200">
            <ImageIcon className="w-8 h-8 text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}

function VideoPlayer({ post, videoRef, setPost }) {
  const togglePlay = () => {
    const v = videoRef?.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPost((p) => ({ ...p, playing: true }));
    } else {
      v.pause();
      setPost((p) => ({ ...p, playing: false }));
    }
  };

  const toggleMute = () => {
    const v = videoRef?.current;
    if (!v) return;
    v.muted = !v.muted;
    setPost((p) => ({ ...p, muted: v.muted }));
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        src={post.videoSrc}
        className="w-full h-full object-cover"
        muted={!!post.muted}
        playsInline
        controls={false}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center border border-white/30"
        >
          {post.playing ? <Square className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white" />}
        </button>
      </div>
      <button
        onClick={toggleMute}
        className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full border border-white/20"
        title={post.muted ? "Unmute" : "Mute"}
      >
        {post.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

function CarouselArrows({ post, setPost }) {
  const total = (post.media || []).length;
  const go = (dir) =>
    setPost((p) => {
      const next = ((p.activeIndex || 0) + dir + total) % total;
      return { ...p, activeIndex: next };
    });

  if (total <= 1) return null;

  return (
    <>
      <button
        onClick={() => go(-1)}
        className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/40 text-white p-2 rounded-full"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => go(1)}
        className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/40 text-white p-2 rounded-full"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </>
  );
}
