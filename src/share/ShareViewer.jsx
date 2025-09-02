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
  const [brandInfo, setBrandInfo] = useState(null);

  const [currentPost, setCurrentPost] = useState(() => ensurePostShape({}));

  // Update current post when index changes
  useEffect(() => {
    if (posts[idx]) {
      setCurrentPost(ensurePostShape(posts[idx]));
    }
  }, [posts, idx]);

  const post = currentPost;

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
        
        // Extract brand info from first post that has it
        const postsData = (data.items || []).map((r) => r.post_json);
        const firstPostWithBrand = postsData.find(post => post?.brand && (post.brand.name || post.brand.profileSrc));
        if (firstPostWithBrand?.brand) {
          setBrandInfo({
            name: firstPostWithBrand.brand.name || 'Client',
            profileSrc: firstPostWithBrand.brand.profileSrc,
            username: firstPostWithBrand.brand.username,
            verified: firstPostWithBrand.brand.verified
          });
        }
        
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

  // Generate brand-based gradient
  const getBrandGradient = () => {
    if (!brandInfo?.name) return "from-blue-600 to-blue-800";
    
    // Generate consistent colors based on brand name
    const colors = [
      "from-blue-600 to-blue-800",
      "from-purple-600 to-purple-800", 
      "from-green-600 to-green-800",
      "from-red-600 to-red-800",
      "from-indigo-600 to-indigo-800",
      "from-pink-600 to-pink-800",
      "from-teal-600 to-teal-800",
      "from-orange-600 to-orange-800"
    ];
    
    const hash = brandInfo.name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Branded Header */}
      {brandInfo && (
        <div className={`bg-gradient-to-r ${getBrandGradient()} text-white py-6 px-4`}>
          <div className="max-w-screen-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {brandInfo.profileSrc ? (
                <div className="w-12 h-12 rounded-full bg-white/20 overflow-hidden ring-2 ring-white/30">
                  <img 
                    src={brandInfo.profileSrc} 
                    alt={brandInfo.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                  <span className="text-white font-bold text-lg">
                    {brandInfo.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{brandInfo.name}</h1>
                  {brandInfo.verified && (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {brandInfo.username && (
                  <p className="text-white/80 text-sm">@{brandInfo.username}</p>
                )}
              </div>
            </div>
            <div className="text-white/90 text-sm">
              {posts.length ? `${idx + 1} / ${posts.length}` : loading ? "Loading..." : ""}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex flex-col items-center p-4">
        {/* Deck Title */}
        <div className="w-full max-w-screen-lg mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {deck ? deck.title : "Presentation Deck"}
            </h2>
            <p className="text-gray-600 text-sm">
              Shared by {brandInfo?.name || 'Client'} • {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Post Preview */}
        <div className="w-full max-w-screen-lg flex-1 min-h-0 flex items-start justify-center mb-6">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center w-full border">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading presentation...</p>
            </div>
          ) : err ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-red-600 w-full border">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-lg font-semibold mb-2">Unable to Load</h3>
              <p>{err}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500 w-full border">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">Empty Deck</h3>
              <p>No posts in this deck</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg border">
              <RightPreview
                post={post}
                setPost={setCurrentPost}
                mode="present"
                clamp={{ maxVmin: 68, maxPx: 560 }}
                showExport={false}
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        {posts.length > 1 && (
          <div className="mb-6 flex items-center gap-3">
            <button 
              className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              onClick={goPrev}
            >
              ← Previous
            </button>
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
              {idx + 1} of {posts.length}
            </div>
            <button 
              className={`px-6 py-2 bg-gradient-to-r ${getBrandGradient()} text-white rounded-lg hover:opacity-90 transition-opacity font-medium`}
              onClick={goNext}
            >
              Next →
            </button>
          </div>
        )}

        {/* Branded Footer */}
        <div className="w-full max-w-screen-lg">
          <div className="bg-white rounded-lg shadow-sm p-6 border text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              {brandInfo?.profileSrc ? (
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <img 
                    src={brandInfo.profileSrc} 
                    alt={brandInfo.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : brandInfo ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-sm">
                    {brandInfo.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : null}
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Presentation created for <span className="font-semibold text-gray-900">{brandInfo?.name || 'Client'}</span>
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Powered by Social Spark
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
