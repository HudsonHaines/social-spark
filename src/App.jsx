import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Play, Volume2, VolumeX, ChevronLeft, ChevronRight, CheckCircle2, Settings2, Image as ImageIcon, Video as VideoIcon, Layers, Eye, Edit3, Trash2, Plus, Save, Loader2, Film, SkipBack, SkipForward, Square, Copy } from "lucide-react";
import * as htmlToImage from "html-to-image";

// Helpers
const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const classNames = (...arr) => arr.filter(Boolean).join(" ");

// Hashtag and mention formatter
function formatCaption(text) {
  if (!text) return [];
  const parts = [];
  const regex = /([#@][A-Za-z0-9_.]+)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    if (start > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, start) });
    const token = match[0];
    parts.push({ type: token.startsWith("#") ? "hashtag" : "mention", value: token });
    lastIndex = end;
  }
  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });
  return parts;
}

// Defaults
const CTA_OPTIONS = ["Learn More","Shop Now","Sign Up","Download","Book Now","Contact Us"];

const emptyBrand = { name: "Your Brand", username: "yourbrand", profileSrc: "", verified: false };
const emptyLink = { headline: "", subhead: "", url: "", cta: CTA_OPTIONS[0] };
const emptyMetrics = { likes: 128, comments: 24, shares: 12, saves: 9, views: 10234 };

const emptyPost = {
  id: null,
  platform: "facebook", // facebook or instagram
  type: "single", // single, carousel, video
  isReel: false,
  caption: "Write your post copy here...",
  media: [], // images
  videoSrc: "", // object URL for real video
  muted: true,
  playing: false,
  activeIndex: 0,
  fbSquare: true, // lock FB images to 1:1 by default
  link: { ...emptyLink },
  brand: { ...emptyBrand },
  metrics: { ...emptyMetrics },
};

const SESSION_KEY = "smb-session";
const DECK_KEY = "smb-deck";

export default function App(){
  // editor state for current post
  const [post, setPost] = useState(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : { ...emptyPost, id: crypto.randomUUID() };
  });

  // deck holds many posts, like a month of content
  const [deck, setDeck] = useState(() => {
    const raw = localStorage.getItem(DECK_KEY);
    return raw ? JSON.parse(raw) : [];
  });

  const [mode, setMode] = useState("create");
  const [savingImg, setSavingImg] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);

  const previewRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => { sessionStorage.setItem(SESSION_KEY, JSON.stringify(post)); }, [post]);

  const update = (patch) => setPost((p) => ({ ...p, ...patch }));

  // Media handlers
  const handleImageFiles = async (files) => {
    const list = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 5);
    const urls = await Promise.all(list.map(readFileAsDataURL));
    setPost((p) => ({
      ...p,
      media: urls.slice(0,5),
      videoSrc: "",
      playing: false,
      muted: true,
      type: urls.length > 1 ? "carousel" : "single",
      activeIndex: 0,
    }));
  };

  const handleVideoFile = async (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    const url = URL.createObjectURL(file);
    setPost((p) => ({ ...p, videoSrc: url, media: [], type: "video", activeIndex: 0, playing: false }));
  };

  const clearVideo = () => {
    if (post.videoSrc) URL.revokeObjectURL(post.videoSrc);
    setPost((p) => ({ ...p, videoSrc: "", playing: false, muted: true, type: p.media.length > 1 ? "carousel" : "single" }));
  };

  const removeImageAt = (idx) => {
    setPost((p) => {
      const copy = [...p.media];
      copy.splice(idx, 1);
      const nextType = copy.length > 1 ? "carousel" : "single";
      return { ...p, media: copy, type: nextType, activeIndex: 0 };
    });
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    const vid = files.find(f => f.type.startsWith("video/"));
    if (vid) return handleVideoFile(vid);
    return handleImageFiles(files);
  };

  // Export
  const saveAsPng = async () => {
    if (!previewRef.current) return;
    try {
      setSavingImg(true);
      if (videoRef.current) videoRef.current.pause();
      const dataUrl = await htmlToImage.toPng(previewRef.current, { pixelRatio: 2 });
      const a = document.createElement("a");
      a.download = `${post.platform}-mockup.png`;
      a.href = dataUrl;
      a.click();
    } finally {
      setSavingImg(false);
    }
  };

  // Deck actions
  const addToDeck = () => {
    const item = { id: crypto.randomUUID(), createdAt: Date.now(), post };
    const next = [item, ...deck];
    setDeck(next);
    localStorage.setItem(DECK_KEY, JSON.stringify(next));
  };

  const duplicateToDeck = (id) => {
    const item = deck.find(d => d.id === id);
    if (!item) return;
    const copy = { id: crypto.randomUUID(), createdAt: Date.now(), post: { ...item.post, id: crypto.randomUUID() } };
    const next = [copy, ...deck];
    setDeck(next);
    localStorage.setItem(DECK_KEY, JSON.stringify(next));
  };

  const loadFromDeck = (id) => {
    const item = deck.find(d => d.id === id);
    if (item) setPost(item.post);
  };

  const deleteFromDeck = (id) => {
    const next = deck.filter(d => d.id !== id);
    setDeck(next);
    localStorage.setItem(DECK_KEY, JSON.stringify(next));
  };

  const startPresentingDeck = (startId) => {
    const idx = startId ? Math.max(0, deck.findIndex(d => d.id === startId)) : 0;
    setPresentIndex(idx);
    setMode("present");
  };

  const goPrev = () => setPresentIndex(i => (i - 1 + deck.length) % deck.length);
  const goNext = () => setPresentIndex(i => (i + 1) % deck.length);

  // Which post to render in preview
  const previewPost = mode === "present" && deck.length ? deck[presentIndex].post : post;

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900">
      <TopBar platform={post.platform} setPlatform={(platform) => update({ platform })} mode={mode} setMode={setMode} />

      <div className={classNames("mx-auto max-w-[1400px] p-4 gap-4", mode === "create" ? "grid grid-cols-1 lg:grid-cols-[460px_minmax(0,1fr)]" : "") }>
        {mode === "create" ? (
          <LeftPanel
            post={post}
            update={update}
            onDrop={onDrop}
            handleImageFiles={handleImageFiles}
            handleVideoFile={handleVideoFile}
            clearVideo={clearVideo}
            removeImageAt={removeImageAt}
            addToDeck={addToDeck}
            duplicateToDeck={duplicateToDeck}
            deck={deck}
            loadFromDeck={loadFromDeck}
            deleteFromDeck={deleteFromDeck}
            startPresentingDeck={startPresentingDeck}
          />
        ) : null}

        <RightPreview ref={previewRef} videoRef={videoRef} post={previewPost} setPost={setPost} mode={mode} saveAsPng={saveAsPng} savingImg={savingImg} />
      </div>

      {mode === "present" ? (
        <PresenterControls
          platform={previewPost.platform}
          setPlatform={(platform) => setPost(p => ({ ...p, platform }))}
          exit={() => setMode("create")}
          saveAsPng={saveAsPng}
          savingImg={savingImg}
          hasDeck={deck.length > 1}
          onPrev={goPrev}
          onNext={goNext}
          index={presentIndex}
          total={deck.length}
        />
      ) : null}
    </div>
  );
}

function TopBar({ platform, setPlatform, mode, setMode }){
  return (
    <div className="w-full border-b bg-white/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          <span className="font-semibold">Social Mockup Builder</span>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={platform} onChange={setPlatform} items={[{ id: "facebook", label: "Facebook" },{ id: "instagram", label: "Instagram" }]} />
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <Tabs value={mode} onChange={setMode} items={[{ id: "create", label: "Create" },{ id: "present", label: "Present" }]} />
        </div>
      </div>
    </div>
  );
}

function Tabs({ items, value, onChange }){
  return (
    <div className="flex items-center bg-slate-100 rounded-xl p-1">
      {items.map(it => (
        <button key={it.id} onClick={() => onChange(it.id)} className={classNames("px-3 py-1.5 rounded-lg text-sm", value === it.id ? "bg-white shadow" : "text-slate-600")}>{it.label}</button>
      ))}
    </div>
  );
}

function LeftPanel({ post, update, onDrop, handleImageFiles, handleVideoFile, clearVideo, removeImageAt, addToDeck, duplicateToDeck, deck, loadFromDeck, deleteFromDeck, startPresentingDeck }){
  const fileImgRef = useRef(null);
  const fileVidRef = useRef(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        <span className="font-medium">Controls</span>
      </div>

      <div className="p-4 space-y-6">
        {/* Brand */}
        <Section title="Brand">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
                {post.brand.profileSrc ? (<img src={post.brand.profileSrc} alt="profile" className="w-full h-full object-cover" />) : (<ImageIcon className="w-6 h-6 text-slate-400" />)}
              </div>
              <button className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow border" onClick={() => fileImgRef.current?.click()} title="Upload profile">
                <Plus className="w-3 h-3" />
              </button>
              <input ref={fileImgRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await readFileAsDataURL(f); update({ brand: { ...post.brand, profileSrc: url } }); } }} />
            </div>
            <div className="flex-1 grid grid-cols-1 gap-2">
              <label className="text-xs text-slate-500">Facebook page name</label>
              <input className="input" placeholder="e.g. Patagonia" value={post.brand.name} onChange={(e) => update({ brand: { ...post.brand, name: e.target.value } })} />
              <div className="grid grid-cols-2 gap-2 items-center">
                <div className="col-span-1">
                  <label className="text-xs text-slate-500">Instagram username</label>
                  <input className="input" placeholder="e.g. patagonia" value={post.brand.username} onChange={(e) => update({ brand: { ...post.brand, username: e.target.value.replace(/^@/, "") } })} />
                </div>
                <label className="flex items-center gap-2 text-sm col-span-1 mt-5">
                  <input type="checkbox" checked={post.brand.verified} onChange={(e) => update({ brand: { ...post.brand, verified: e.target.checked } })} />
                  Verified badge
                </label>
              </div>
            </div>
          </div>
        </Section>

        {/* Post copy */}
        <Section title="Post copy">
          <textarea className="textarea" rows={5} value={post.caption} onChange={(e) => update({ caption: e.target.value })} />
          <div className="text-xs text-slate-500 text-right">{post.caption.length} chars</div>
        </Section>

        {/* Media */}
        <Section title="Media">
          <div className="flex items-center gap-2 pb-2 flex-wrap">
            <Radio label="Single" checked={post.type === "single"} onChange={() => update({ type: "single", videoSrc: "" })} />
            <Radio label="Carousel" checked={post.type === "carousel"} onChange={() => update({ type: "carousel", videoSrc: "" })} />
            <Radio label="Video" checked={post.type === "video"} onChange={() => update({ type: "video" })} />
            <label className="flex items-center gap-2 ml-auto text-sm">
              <input type="checkbox" checked={post.isReel} onChange={(e) => update({ isReel: e.target.checked })} />
              Reel
            </label>
          </div>

          {post.platform === 'facebook' && post.type !== 'video' ? (
            <div className="flex items-center gap-3 pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={post.fbSquare} onChange={(e) => update({ fbSquare: e.target.checked })} />
                Square 1:1 (Facebook)
              </label>
              <span className="text-xs text-slate-500">Landscape uses 16:9</span>
            </div>
          ) : null}

          <div onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={onDrop} className="border-2 border-dashed rounded-xl p-4 text-center bg-slate-50">
            <p className="text-sm mb-2">Drag files here, or</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button className="btn" onClick={() => document.getElementById("media-input")?.click()}><ImageIcon className="w-4 h-4 mr-1"/>Add images</button>
              <button className="btn-outline" onClick={() => fileVidRef.current?.click()}><VideoIcon className="w-4 h-4 mr-1"/>Add video</button>
            </div>
            <input id="media-input" type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { if (e.target.files) await handleImageFiles(e.target.files); }} />
            <input ref={fileVidRef} id="video-input" type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await handleVideoFile(f); } }} />
          </div>

          {post.type !== "video" && post.media.length ? (
            <div className="grid grid-cols-5 gap-2 pt-3">
              {post.media.map((m, i) => (
                <div key={i} className={classNames("relative rounded-lg overflow-hidden border", i === post.activeIndex ? "ring-2 ring-blue-500" : "")} onClick={() => update({ activeIndex: i })}>
                  <img src={m} className="w-full h-20 object-cover block" />
                  <button className="absolute top-1 right-1 bg-white/90 rounded-full p-1 shadow" onClick={(e) => { e.stopPropagation(); removeImageAt(i); }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {post.type === "video" && post.videoSrc ? (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-600 truncate">Video loaded</div>
              <button className="chip" onClick={clearVideo}><Trash2 className="w-3 h-3 mr-1"/>Remove video</button>
            </div>
          ) : null}
        </Section>

        {/* Link preview - Facebook style (full width, no gray box) */}
        <Section title="Link preview (Facebook style)">
          <input className="input" placeholder="Headline" value={post.link.headline} onChange={(e) => update({ link: { ...post.link, headline: e.target.value } })} />
          <input className="input" placeholder="Subhead" value={post.link.subhead} onChange={(e) => update({ link: { ...post.link, subhead: e.target.value } })} />
          <div className="flex items-center gap-2">
            <input className="input flex-1" placeholder="Link URL" value={post.link.url} onChange={(e) => update({ link: { ...post.link, url: e.target.value } })} />
            <select className="select" value={post.link.cta} onChange={(e) => update({ link: { ...post.link, cta: e.target.value } })}>
              {CTA_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </Section>

        {/* Deck actions */}
        <Section title="Deck (multiple posts)">
          <div className="flex items-center gap-2">
            <button className="btn" onClick={addToDeck}><Save className="w-4 h-4 mr-1"/>Add this post to deck</button>
            {deck.length ? <button className="btn-outline" onClick={() => startPresentingDeck(deck[0]?.id)}><Film className="w-4 h-4 mr-1"/>Present deck</button> : null}
          </div>
          {deck.length ? (
            <div className="space-y-2 max-h-48 overflow-auto pr-1 pt-2">
              {deck.map((d) => (
                <div key={d.id} className="flex items-center justify-between border rounded-lg p-2 hover:bg-slate-50">
                  <div className="text-sm">
                    <div className="font-medium">{new Date(d.createdAt).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{d.post.brand?.name} · {d.post.platform} · {d.post.type}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="chip" onClick={() => loadFromDeck(d.id)}><Eye className="w-3 h-3 mr-1"/>Load</button>
                    <button className="chip" onClick={() => duplicateToDeck(d.id)}><Copy className="w-3 h-3 mr-1"/>Duplicate</button>
                    <button className="chip" onClick={() => startPresentingDeck(d.id)}><Film className="w-3 h-3 mr-1"/>Start here</button>
                    <button className="chip" onClick={() => deleteFromDeck(d.id)}><Trash2 className="w-3 h-3 mr-1"/>Remove</button>
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

const Section = ({ title, children }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>
);

const Radio = ({ label, checked, onChange }) => (
  <label className={classNames("px-2 py-1 rounded-md border cursor-pointer select-none text-sm", checked ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50")}>
    <input type="radio" className="hidden" checked={checked} onChange={onChange} />
    {label}
  </label>
);

const PresenterControls = ({ platform, setPlatform, exit, saveAsPng, savingImg, hasDeck, onPrev, onNext, index, total }) => (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-full px-3 py-2 flex items-center gap-2 z-40">
    <Tabs value={platform} onChange={setPlatform} items={[{ id: "facebook", label: "Facebook" }, { id: "instagram", label: "Instagram" }]} />
    {hasDeck ? (
      <div className="flex items-center gap-1 ml-2">
        <button className="btn-outline" onClick={onPrev}><SkipBack className="w-4 h-4 mr-1"/>Prev</button>
        <div className="text-xs text-slate-600 px-2">{index + 1} / {total}</div>
        <button className="btn-outline" onClick={onNext}>Next<SkipForward className="w-4 h-4 ml-1"/></button>
      </div>
    ) : null}
    <div className="w-px h-6 bg-slate-200 mx-2" />
    <button className="btn-outline" onClick={saveAsPng} disabled={savingImg}>
      {savingImg ? <Loader2 className="w-4 h-4 mr-1 animate-spin"/> : <Download className="w-4 h-4 mr-1"/>}
      Export PNG
    </button>
    <button className="btn" onClick={exit}><Edit3 className="w-4 h-4 mr-1"/>Edit</button>
  </div>
);

const RightPreview = React.forwardRef(function RightPreview({ post, setPost, mode, saveAsPng, savingImg, videoRef }, ref) {
  return (
    <div className={classNames("relative", mode === "present" ? "p-6" : "") }>
      <div className={classNames("bg-white rounded-2xl shadow-sm border mx-auto", mode === "present" ? "max-w-[560px]" : "max-w-[720px]") }>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Live preview</div>
          <div className="flex items-center gap-2">
            <button className="btn-outline" onClick={saveAsPng} disabled={savingImg}>
              {savingImg ? <Loader2 className="w-4 h-4 mr-1 animate-spin"/> : <Download className="w-4 h-4 mr-1"/>}
              PNG
            </button>
          </div>
        </div>
        <div className="p-3 md:p-6 bg-slate-50">
          <div ref={ref} className="mx-auto bg-white rounded-xl border shadow-sm overflow-hidden max-w-[560px]">
            {post.platform === "facebook" ? (
              <FacebookPost post={post} setPost={setPost} videoRef={videoRef} />
            ) : (
              <InstagramPost post={post} setPost={setPost} videoRef={videoRef} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function FacebookPost({ post, setPost, videoRef }) {
  const parts = useMemo(() => formatCaption(post.caption), [post.caption]);
  const hasCarousel = post.type === "carousel" && post.media.length > 1;

  return (
    <div className="text-[15px]" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200">
          {post.brand.profileSrc ? (<img src={post.brand.profileSrc} className="w-full h-full object-cover" />) : null}
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1 font-semibold">
            <span>{post.brand.name || "Brand"}</span>
            {post.brand.verified ? <CheckCircle2 className="w-4 h-4 text-blue-500"/> : null}
          </div>
          <div className="text-xs text-slate-500">Just now · <span className="inline-block w-3 h-3 align-[-2px] bg-slate-300 rounded-sm"/></div>
        </div>
      </div>

      {/* Copy */}
      <div className="px-4 pb-3 whitespace-pre-wrap">
        {parts.map((p, i) => {
          if (p.type === "text") return <span key={i}>{p.value}</span>;
          if (p.type === "hashtag") return <span key={i} className="text-blue-600">{p.value}</span>;
          if (p.type === "mention") return <span key={i} className="text-blue-600">{p.value}</span>;
          return null;
        })}
      </div>

      {/* Media frame: FB square enforcement */}
      <div className="relative overflow-hidden">
        <MediaFrame post={post} videoRef={videoRef} setPost={setPost} />
        {hasCarousel ? <CarouselArrows post={post} setPost={setPost} /> : null}
      </div>

      {/* Facebook style link card - full width text (no gray box) */}
      {(post.link.url || post.link.headline || post.link.subhead) ? (
        <div className="w-full border-t">
          <div className="px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              {(post.link.url || "example.com").replace(/https?:\/\//, "").replace(/\/$/, "")}
            </div>
            <div className="mt-1 font-semibold leading-snug">
              {post.link.headline || "Link headline"}
            </div>
            <div className="mt-1 text-[13px] text-slate-600 leading-snug">
              {post.link.subhead || "Short description"}
            </div>
            <div className="pt-2">
              <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium">
                {post.link.cta}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="px-4 py-2 text-sm text-slate-600 flex items-center justify-between border-t">
        <div>{post.metrics.likes.toLocaleString()} Likes</div>
        <div className="flex items-center gap-4">
          <div>{post.metrics.comments.toLocaleString()} Comments</div>
          <div>{post.metrics.shares.toLocaleString()} Shares</div>
        </div>
      </div>
      <div className="grid grid-cols-3 text-sm text-slate-700">
        {['Like','Comment','Share'].map((t) => (
          <div key={t} className="py-2 text-center hover:bg-slate-50 cursor-default select-none">{t}</div>
        ))}
      </div>
    </div>
  );
}

function InstagramPost({ post, setPost, videoRef }) {
  const parts = useMemo(() => formatCaption(post.caption), [post.caption]);
  const hasCarousel = (post.type === "carousel" && post.media.length > 1) || (post.media.length > 1);

  return (
    <div className="text-[14px]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200">
          {post.brand.profileSrc ? (<img src={post.brand.profileSrc} className="w-full h-full object-cover" />) : null}
        </div>
        <div className="flex items-center gap-1 font-semibold">
          <span>{post.brand.username || "brand"}</span>
          {post.brand.verified ? <CheckCircle2 className="w-4 h-4 text-blue-500"/> : null}
        </div>
      </div>

      {/* Media */}
      <div className="relative bg-black">
        <MediaFrame post={{ ...post, platform: "instagram" }} videoRef={videoRef} setPost={setPost} />
        {hasCarousel ? (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {post.media.map((_, i) => (
              <span key={i} className={classNames("w-1.5 h-1.5 rounded-full", i === post.activeIndex ? "bg-white" : "bg-white/40")}></span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Metrics */}
      <div className="px-3 py-2 text-sm font-semibold">{post.metrics.likes.toLocaleString()} likes</div>

      {/* Caption */}
      <div className="px-3 pb-3 text-sm"><span className="font-semibold mr-1">{post.brand.username}</span>
        {parts.map((p, i) => {
          if (p.type === "text") return <span key={i}>{p.value}</span>;
          if (p.type === "hashtag") return <span key={i} className="text-blue-600">{p.value}</span>;
          if (p.type === "mention") return <span key={i} className="text-blue-600">{p.value}</span>;
          return null;
        })}
      </div>

      {post.isReel && post.type === "video" ? (
        <div className="px-3 pb-3 text-xs text-slate-500">{post.metrics.views.toLocaleString()} views</div>
      ) : null}
    </div>
  );
}

function MediaFrame({ post, videoRef, setPost }) {
  // Aspect logic
  let paddingTop;
  if (post.platform === 'facebook') {
    if (post.type === 'video') paddingTop = `${100 / (9/16)}%`; // 16:9
    else paddingTop = post.fbSquare ? '100%' : `${100 / (9/16)}%`; // 1:1 or 16:9
  } else {
    // Instagram
    paddingTop = post.isReel ? `${100 / (9/16)}%` : '100%';
  }

  const active = post.media[post.activeIndex];

  return (
    <div className="relative w-full bg-black/5 overflow-hidden">
      <div className="w-full" style={{ paddingTop }}></div>
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
    const v = videoRef.current;
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
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setPost((p) => ({ ...p, muted: v.muted }));
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} src={post.videoSrc} className="w-full h-full object-cover" muted={post.muted} playsInline />
      <div className="absolute inset-0 flex items-center justify-center">
        <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center border border-white/30">
          {post.playing ? <Square className="w-8 h-8 text-white"/> : <Play className="w-8 h-8 text-white"/>}
        </button>
      </div>
      <button onClick={toggleMute} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full border border-white/20">
        {post.muted ? <VolumeX className="w-4 h-4"/> : <Volume2 className="w-4 h-4"/>}
      </button>
    </div>
  );
}

function CarouselArrows({ post, setPost }){
  const total = post.media.length;
  const go = (dir) => setPost(p => {
    const next = (p.activeIndex + dir + total) % total;
    return { ...p, activeIndex: next };
  });
  if (total <= 1) return null;
  return (
    <>
      <button onClick={() => go(-1)} className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/40 text-white p-2 rounded-full">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => go(1)} className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/40 text-white p-2 rounded-full">
        <ChevronRight className="w-5 h-5" />
      </button>
    </>
  );
}

// tiny base rule so layout is not blank even if CSS fails
const styles = `
html, body, #root { height: 100%; margin: 0; }
`;

(function ensureHelpers(){
  if (typeof document === "undefined") return;
  const id = "helpers-style";
  if (!document.getElementById(id)){
    const tag = document.createElement("style");
    tag.id = id;
    tag.innerHTML = styles;
    document.head.appendChild(tag);
  }
})();
