// src/share/ShareViewer.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import RightPreview from "../components/RightPreview";
import { ensurePostShape } from "../data/postShape";
import { supabase } from "../lib/supabaseClient";

export default function ShareViewer({ token }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deck, setDeck] = useState(null);
  const [posts, setPosts] = useState([]);
  const [idx, setIdx] = useState(0);

  const post = useMemo(
    () => (posts[idx] ? ensurePostShape(posts[idx]) : ensurePostShape({})),
    [posts, idx]
  );

  const goPrev = useCallback(() => setIdx((i) => (posts.length ? (i - 1 + posts.length) % posts.length : 0)), [posts.length]);
  const goNext = useCallback(() => setIdx((i) => (posts.length ? (i + 1) % posts.length : 0)), [posts.length]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_deck_share", { p_token: token });
        if (error) throw error;
        if (data?.error) throw new Error(String(data.error));
        setDeck(data.deck);
        setPosts((data.items || []).map((r) => r.post_json));
        setIdx(0);
      } catch (e) {
        console.error(e);
        const msg = e.message || "Error";
        setErr(
          msg === "not_found" ? "Link not found"
          : msg === "revoked" ? "Link was revoked"
          : msg === "expired" ? "Link expired"
          : "Could not load this deck"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    const onKey = (e) => {
      if (!posts.length) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [posts.length, goPrev, goNext]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-screen-lg flex items-center justify-between mb-3">
        <div className="font-medium">{deck ? deck.title : "Deck"}</div>
        <div className="text-app-muted text-sm">
          {posts.length ? `${idx + 1} / ${posts.length}` : loading ? "Loading..." : ""}
        </div>
      </div>

      <div className="w-full max-w-screen-lg flex-1 min-h-0 flex items-start justify-center">
        {loading ? (
          <div className="card p-8 text-center w-full">Loading...</div>
        ) : err ? (
          <div className="card p-8 text-center text-red-600 w-full">{err}</div>
        ) : posts.length === 0 ? (
          <div className="card p-8 text-center text-app-muted w-full">No posts in this deck</div>
        ) : (
          <RightPreview
            post={post}
            setPost={() => {}}
            mode="present"
            // Smaller than editor and presenter defaults so it fits comfortably
            clamp={{ maxVmin: 68, maxPx: 560 }}
            showExport={false}
          />
        )}
      </div>

      {posts.length > 1 ? (
        <div className="mt-3 flex items-center gap-2">
          <button className="btn-outline" onClick={goPrev}>Prev</button>
          <button className="btn" onClick={goNext}>Next</button>
        </div>
      ) : null}
    </div>
  );
}
