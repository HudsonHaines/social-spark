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
        
        // Increment view count after successful load
        try {
          // First get the current count
          const { data: currentShare } = await supabase
            .from('deck_shares')
            .select('share_count')
            .eq('token', token)
            .single();

          const newCount = (currentShare?.share_count || 0) + 1;
          
          const { error: updateError } = await supabase
            .from('deck_shares')
            .update({ 
              share_count: newCount,
              last_accessed_at: new Date().toISOString()
            })
            .eq('token', token);

          if (updateError) throw updateError;
          console.log('View count incremented to:', newCount);
        } catch (viewError) {
          console.error('Failed to increment view count:', viewError);
          // Don't fail the whole load if view counting fails
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
    <div className="min-h-screen bg-white">
      {/* Clean minimal header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandInfo?.profileSrc ? (
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img 
                  src={brandInfo.profileSrc} 
                  alt={brandInfo.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : brandInfo ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-600 font-medium text-sm">
                  {brandInfo.name.charAt(0).toUpperCase()}
                </span>
              </div>
            ) : null}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {deck?.title || "Presentation"}
              </h1>
              {brandInfo?.name && (
                <p className="text-sm text-gray-500">{brandInfo.name}</p>
              )}
            </div>
          </div>
          
          {posts.length > 1 && (
            <div className="text-sm text-gray-500">
              {idx + 1} of {posts.length}
            </div>
          )}
        </div>
      </div>

      {/* Main content area - focused on posts */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full"></div>
          </div>
        ) : err ? (
          <div className="text-center py-16">
            <div className="text-2xl text-gray-400 mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load presentation</h3>
            <p className="text-gray-600">{err}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-2xl text-gray-400 mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Empty presentation</h3>
            <p className="text-gray-600">No content available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Post content - the main focus */}
            <div className="flex justify-center">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <RightPreview
                  post={post}
                  setPost={setCurrentPost}
                  mode="present"
                  clamp={{ maxVmin: 60, maxPx: 480 }}
                  showExport={false}
                />
              </div>
            </div>

            {/* Clean navigation */}
            {posts.length > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button 
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                  onClick={goPrev}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(posts.length, 5) }, (_, i) => {
                    if (posts.length > 5 && i === 4) {
                      return <span key="ellipsis" className="text-gray-400">...</span>;
                    }
                    const pageIndex = posts.length > 5 && i === 4 ? posts.length - 1 : i;
                    return (
                      <button
                        key={pageIndex}
                        onClick={() => setIdx(pageIndex)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === pageIndex ? 'bg-gray-900' : 'bg-gray-300'
                        }`}
                      />
                    );
                  })}
                </div>

                <button 
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                  onClick={goNext}
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Minimal footer */}
      <div className="border-t border-gray-100 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center">
          <p className="text-xs text-gray-400">
            Created with Social Spark
          </p>
        </div>
      </div>
    </div>
  );
}
