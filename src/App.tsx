import React, { useCallback, useMemo, useState } from "react";
import FacebookPost, { type CTA, type MediaItem, type Mode } from "./components/FacebookPost";
import EditorPanel from "./components/EditorPanel";
import MobilePreview from "./components/MobilePreview";

// A single post's shape
type Post = {
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
};

type View = "editor" | "desktop" | "mobile";

const createEmptyPost = (): Post => ({
  author: "Your Page",
  timestamp: "Just now",
  copy: "",
  profileUrl: null,
  mode: "static",
  media: [],
  slideIndex: 0,
  linkUrl: "",
  linkHeadline: "",
  linkSubhead: "",
  cta: "Learn More",
  videoMuted: true,
});

const App: React.FC = () => {
  // Multiple posts
  const [posts, setPosts] = useState<Post[]>([createEmptyPost()]);
  const [current, setCurrent] = useState(0);

  // View toggle
  const [view, setView] = useState<View>("editor");

  // Convenience accessors for current post
  const p = posts[current];

  // Helpers to update current post fields immutably
  const update = useCallback(
    (key: keyof Post, value: Post[keyof Post]) => {
      setPosts((prev) => {
        const arr = [...prev];
        arr[current] = { ...arr[current], [key]: value } as Post;
        return arr;
      });
    },
    [current]
  );

  const setAuthor = (v: string) => update("author", v);
  const setTimestamp = (v: string) => update("timestamp", v);
  const setCopy = (v: string) => update("copy", v);
  const setProfileUrl = (v: string | null) => update("profileUrl", v);
  const setMode = (v: Mode) => update("mode", v);
  const setLinkUrl = (v: string) => update("linkUrl", v);
  const setLinkHeadline = (v: string) => update("linkHeadline", v);
  const setLinkSubhead = (v: string) => update("linkSubhead", v);
  const setCta = (v: CTA) => update("cta", v);
  const setSlideIndex = (i: number) => update("slideIndex", i);
  const setVideoMuted = (v: boolean) => update("videoMuted", v);

  // Media handlers (operate on current post)
  const onAddFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const items: MediaItem[] = [];
      for (const f of Array.from(files)) {
        const isVideo = f.type.startsWith("video");
        const isImage = f.type.startsWith("image") || /(png|jpe?g|webp|gif|bmp)$/i.test(f.name);
        if (!isImage && !isVideo) continue;
        const { fileToDataURL } = await import("./lib/utils");
        const url = isImage ? await fileToDataURL(f) : URL.createObjectURL(f);
        items.push({ url, type: isImage ? "image" : "video", name: f.name, linkHeadline: "" });
      }
      if (!items.length) return;
      setPosts((prev) => {
        const arr = [...prev];
        const post = arr[current];
        const nextMedia = (() => {
          if (post.mode === "static") {
            const firstImg = [...items, ...post.media].find((m) => m.type === "image");
            return firstImg ? [firstImg] : post.media;
          }
          return [...post.media, ...items];
        })();
        arr[current] = { ...post, media: nextMedia };
        return arr;
      });
    },
    [current]
  );

  const onRemoveAt = useCallback(
    (i: number) => {
      setPosts((prev) => {
        const arr = [...prev];
        const post = arr[current];
        const media = post.media.filter((_, idx) => idx !== i);
        arr[current] = { ...post, media, slideIndex: 0 };
        return arr;
      });
    },
    [current]
  );

  const onMove = useCallback(
    (i: number, dir: -1 | 1) => {
      setPosts((prev) => {
        const arr = [...prev];
        const post = arr[current];
        const a = [...post.media];
        const j = i + dir;
        if (j < 0 || j >= a.length) return prev;
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
        arr[current] = { ...post, media: a };
        return arr;
      });
    },
    [current]
  );

  const onEditCardHeadline = useCallback(
    (idx: number, text: string) => {
      setPosts((prev) => {
        const arr = [...prev];
        const post = arr[current];
        const a = [...post.media];
        if (!a[idx]) return prev;
        a[idx] = { ...a[idx], linkHeadline: text };
        arr[current] = { ...post, media: a };
        return arr;
      });
    },
    [current]
  );

  // Carousel controls for current post
  const nextSlide = useCallback(() => {
    const len = p?.media.length || 1;
    setSlideIndex(((p?.slideIndex || 0) + 1) % len);
  }, [p?.media.length, p?.slideIndex]);

  const prevSlide = useCallback(() => {
    const len = p?.media.length || 1;
    setSlideIndex(((p?.slideIndex || 0) - 1 + len) % len);
  }, [p?.media.length, p?.slideIndex]);

  // Shared props for current post
  const shared = useMemo(
    () => ({
      author: p.author,
      timestamp: p.timestamp,
      copy: p.copy,
      profileUrl: p.profileUrl,
      mode: p.mode,
      media: p.media,
      slideIndex: p.slideIndex,
      linkUrl: p.linkUrl,
      linkHeadline: p.linkHeadline,
      linkSubhead: p.linkSubhead,
      cta: p.cta,
      videoMuted: p.videoMuted,
    }),
    [p]
  );

  // Post management
  const addPost = () => {
    setPosts((prev) => [...prev, createEmptyPost()]);
    setCurrent((i) => i + 1);
  };
  const removePost = () => {
    setPosts((prev) => {
      if (prev.length === 1) return prev; // keep at least one
      const arr = prev.filter((_, idx) => idx !== current);
      return arr;
    });
    setCurrent((i) => Math.max(0, Math.min(i, posts.length - 2))); // shift index safely
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#F0F2F5] p-4">
      {/* View toggles */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setView("editor")}
          className={`rounded px-4 py-2 ${
            view === "editor" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setView("desktop")}
          className={`rounded px-4 py-2 ${
            view === "desktop" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Desktop
        </button>
        <button
          onClick={() => setView("mobile")}
          className={`rounded px-4 py-2 ${
            view === "mobile" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          iPhone
        </button>
      </div>

      {/* Post selector + add/remove (Editor only) */}
      {view === "editor" && (
        <div className="mb-4 flex w-full max-w-6xl items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {posts.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded px-3 py-1 text-sm ${
                  current === i ? "bg-gray-900 text-white" : "bg-gray-200"
                }`}
              >
                Post {i + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded bg-green-600 px-3 py-1 text-sm text-white" onClick={addPost}>
              + Add post
            </button>
            <button
              className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
              onClick={removePost}
              disabled={posts.length === 1}
            >
              − Remove
            </button>
          </div>
        </div>
      )}

      {/* Editor view */}
      {view === "editor" && (
        <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-[340px,1fr]">
          <EditorPanel
            {...shared}
            setAuthor={setAuthor}
            setTimestamp={setTimestamp}
            setCopy={setCopy}
            setProfileUrl={setProfileUrl}
            setMode={setMode}
            setLinkUrl={setLinkUrl}
            setLinkHeadline={setLinkHeadline}
            setLinkSubhead={setLinkSubhead}
            setCta={setCta}
            setVideoMuted={setVideoMuted}
            onAddFiles={onAddFiles}
            onRemoveAt={onRemoveAt}
            onMove={onMove}
            onEditCardHeadline={onEditCardHeadline}
            setSlideIndex={setSlideIndex}
          />
          <div className="flex justify-center">
            <div className="w-full max-w-[500px] rounded-xl border border-[#E4E6EB] bg-white shadow-sm">
              <FacebookPost
                {...shared}
                nextSlide={nextSlide}
                prevSlide={prevSlide}
                onToggleMute={() => setVideoMuted(!p.videoMuted)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop view: stack posts like feed */}
      {view === "desktop" && (
        <div className="flex w-full justify-center">
          <div className="flex w-full max-w-[600px] flex-col items-center gap-4">
            {posts.map((post, idx) => (
              <div
                key={idx}
                className="w-full max-w-[500px] rounded-xl border border-[#E4E6EB] bg-white shadow-sm"
              >
                <FacebookPost
                  author={post.author}
                  timestamp={post.timestamp}
                  copy={post.copy}
                  profileUrl={post.profileUrl}
                  mode={post.mode}
                  media={post.media}
                  slideIndex={post.slideIndex}
                  linkUrl={post.linkUrl}
                  linkHeadline={post.linkHeadline}
                  linkSubhead={post.linkSubhead}
                  cta={post.cta}
                  videoMuted={post.videoMuted}
                  onToggleMute={() =>
                    setPosts((prev) => {
                      const arr = [...prev];
                      arr[idx] = { ...post, videoMuted: !post.videoMuted };
                      return arr;
                    })
                  }
                  nextSlide={() =>
                    setPosts((prev) => {
                      const arr = [...prev];
                      const len = post.media.length || 1;
                      const s = (post.slideIndex + 1) % len;
                      arr[idx] = { ...post, slideIndex: s };
                      return arr;
                    })
                  }
                  prevSlide={() =>
                    setPosts((prev) => {
                      const arr = [...prev];
                      const len = post.media.length || 1;
                      const s = (post.slideIndex - 1 + len) % len;
                      arr[idx] = { ...post, slideIndex: s };
                      return arr;
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile view: scrollable stack inside phone viewport */}
      {view === "mobile" && (
        <div className="flex w-full justify-center">
          <MobilePreview>
            <div className="flex flex-col items-center gap-4">
              {posts.map((post, idx) => (
                <div
                  key={idx}
                  className="w-full max-w-[500px] rounded-xl border border-[#E4E6EB] bg-white shadow-sm"
                >
                  <FacebookPost
                    author={post.author}
                    timestamp={post.timestamp}
                    copy={post.copy}
                    profileUrl={post.profileUrl}
                    mode={post.mode}
                    media={post.media}
                    slideIndex={post.slideIndex}
                    linkUrl={post.linkUrl}
                    linkHeadline={post.linkHeadline}
                    linkSubhead={post.linkSubhead}
                    cta={post.cta}
                    videoMuted={post.videoMuted}
                    onToggleMute={() =>
                      setPosts((prev) => {
                        const arr = [...prev];
                        arr[idx] = { ...post, videoMuted: !post.videoMuted };
                        return arr;
                      })
                    }
                    nextSlide={() =>
                      setPosts((prev) => {
                        const arr = [...prev];
                        const len = post.media.length || 1;
                        const s = (post.slideIndex + 1) % len;
                        arr[idx] = { ...post, slideIndex: s };
                        return arr;
                      })
                    }
                    prevSlide={() =>
                      setPosts((prev) => {
                        const arr = [...prev];
                        const len = post.media.length || 1;
                        const s = (post.slideIndex - 1 + len) % len;
                        arr[idx] = { ...post, slideIndex: s };
                        return arr;
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </MobilePreview>
        </div>
      )}
    </div>
  );
};

export default App;
