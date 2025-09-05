// src/share/ShareViewer.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import RightPreview from "../components/RightPreview";
import { ensurePostShape } from "../data/postShape";
import { supabase } from "../lib/supabaseClient";
import { ViewProvider } from "../contexts/ViewContext";
import ViewToggle from "../components/ViewToggle";
import { Skeleton } from "../components/Skeleton";
import CommentSystem from "../components/comments/CommentSystem";
import { MessageSquare } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

function ShareViewerInner({ token }) {
  const authContext = useAuth();
  const user = authContext?.user || null;
  
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deck, setDeck] = useState(null);
  const [posts, setPosts] = useState([]);
  const [idx, setIdx] = useState(0);
  const [brandInfo, setBrandInfo] = useState(null);
  const [organizationInfo, setOrganizationInfo] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [userIsInternal, setUserIsInternal] = useState(false);

  const [currentPost, setCurrentPost] = useState(() => ensurePostShape({}));
  const videoRef = useRef(null); // Add videoRef for proper video controls

  // Update current post when index changes
  useEffect(() => {
    if (posts[idx]) {
      setCurrentPost(ensurePostShape(posts[idx]));
    }
  }, [posts, idx]);

  const post = currentPost;

  const goPrev = useCallback(() => setIdx((i) => (posts.length ? (i - 1 + posts.length) % posts.length : 0)), [posts.length]);
  const goNext = useCallback(() => setIdx((i) => (posts.length ? (i + 1) % posts.length : 0)), [posts.length]);
  
  // Check if user is internal to this deck (owner or organization member)
  const checkUserIsInternal = useCallback(async (userId, deckData) => {
    try {
      // Check if user is deck owner
      if (deckData.user_id === userId) {
        setUserIsInternal(true);
        return;
      }
      
      // Check if user is member of deck's organization
      if (deckData.organization_id) {
        const { data: membership, error } = await supabase
          .from('organization_memberships')
          .select('role')
          .eq('organization_id', deckData.organization_id)
          .eq('user_id', userId)
          .single();
        
        if (!error && membership) {
          setUserIsInternal(true);
          return;
        }
      }
      
      // User is not internal
      setUserIsInternal(false);
    } catch (error) {
      console.error('Error checking user permissions:', error);
      setUserIsInternal(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_deck_share", { p_token: token });
        if (error) throw error;
        if (data?.error) throw new Error(String(data.error));
        setDeck(data.deck);
        // Map posts with their deck item IDs for proper commenting
        const postsWithIds = (data.items || []).map((r) => ({
          ...ensurePostShape(r.post_json),
          id: r.id // Use the deck item ID, not the post JSON id
        }));
        setPosts(postsWithIds);
        
        // Check if authenticated user is internal to this deck
        if (user && data.deck) {
          checkUserIsInternal(user.id, data.deck);
        }
        
        // Extract brand info from first post that has it
        const firstPostWithBrand = postsWithIds.find(post => post?.brand && (post.brand.name || post.brand.profileSrc));
        if (firstPostWithBrand?.brand) {
          setBrandInfo({
            name: firstPostWithBrand.brand.name || 'Client',
            profileSrc: firstPostWithBrand.brand.profileSrc,
            username: firstPostWithBrand.brand.username,
            verified: firstPostWithBrand.brand.verified
          });
        }

        // Try to get organization info from the deck owner
        if (data.deck?.user_id) {
          try {
            // Try multiple approaches to get organization info
            
            // Approach 1: Check if deck has organization_id directly
            if (data.deck.organization_id) {
              const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('id, name')
                .eq('id', data.deck.organization_id)
                .single();
              
              if (!orgError && orgData) {
                setOrganizationInfo(orgData);
              }
            } else {
              // Approach 2: Look up user's organization membership
              const { data: orgData, error: orgError } = await supabase
                .from('organization_memberships')
                .select(`
                  role,
                  organizations(id, name)
                `)
                .eq('user_id', data.deck.user_id);

              if (!orgError && orgData && orgData.length > 0) {
                // Prefer owner role, but take any membership
                const ownerMembership = orgData.find(m => m.role === 'owner');
                const membership = ownerMembership || orgData[0];
                
                if (membership?.organizations) {
                  setOrganizationInfo({
                    id: membership.organizations.id,
                    name: membership.organizations.name
                  });
                }
              }
            }
          } catch (orgErr) {
            // Not a critical error, continue without org info
            console.error('Could not fetch organization info:', orgErr);
          }
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
  
  // Check user permissions when auth state changes
  useEffect(() => {
    if (user && deck) {
      checkUserIsInternal(user.id, deck);
    } else {
      setUserIsInternal(false);
    }
  }, [user, deck, checkUserIsInternal]);

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
          
          <div className="flex items-center gap-4">
            <ViewToggle size="small" showLabels={false} />
            {posts.length > 1 && (
              <div className="text-sm text-gray-500">
                {idx + 1} of {posts.length}
              </div>
            )}
            
            {/* Comments toggle button */}
            {deck?.id && (
              <button
                onClick={() => setShowComments(!showComments)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showComments
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Comments
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content area - dynamic layout based on comments state */}
      <div className={`mx-auto px-6 py-8 ${showComments ? 'max-w-7xl' : 'max-w-4xl'}`}>
        {loading ? (
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            {/* Post preview skeleton */}
            <div className="flex justify-center">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <Skeleton className="aspect-square w-96" />
              </div>
            </div>
            {/* Navigation skeleton */}
            <div className="flex items-center justify-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
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
          <div className={`${showComments ? 'grid grid-cols-2 gap-8 items-start' : 'space-y-6'}`}>
            {/* Post content section */}
            <div className={`${showComments ? '' : 'flex justify-center'}`}>
              <div className="space-y-6">
                {/* Post content */}
                <div className={`${showComments ? '' : 'flex justify-center'}`}>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <RightPreview
                      post={post}
                      setPost={setCurrentPost}
                      mode="present"
                      videoRef={videoRef}
                      clamp={{ maxVmin: showComments ? 70 : 85, maxPx: showComments ? 450 : 550 }}
                      showExport={false}
                      deckId={deck?.id}
                    />
                  </div>
                </div>

                {/* Navigation - only show when not in comments mode for cleaner layout */}
                {posts.length > 1 && (
                  <div className={`flex items-center ${showComments ? 'justify-start' : 'justify-center'} gap-4 pt-4`}>
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
            </div>

            {/* Comments section - only visible when showComments is true */}
            {showComments && deck?.id && post?.id && (
              <div className="sticky top-8">
                <CommentSystem
                  deckId={deck.id}
                  postId={post.id}  // Post-specific comments
                  isOpen={showComments}
                  onClose={() => setShowComments(false)}
                  position="inline"
                  isClientView={!userIsInternal}  // Show all comments to internal users, client-only to others
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Minimal footer */}
      <div className="border-t border-gray-100 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center space-y-2">
          {brandInfo?.name && (
            <p className="text-xs text-gray-500">
              Prepared for <span className="font-medium">{brandInfo.name}</span> by <span className="font-medium">{organizationInfo?.name || 'Social Spark'}</span>
            </p>
          )}
          <p className="text-xs text-gray-400">
            Created with Social Spark
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ShareViewer({ token }) {
  return (
    <ViewProvider>
      <ShareViewerInner token={token} />
    </ViewProvider>
  );
}
