// src/delivery/DeliveryPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { listDeckItems, getDeckFromDeliveryToken } from "../data/decks";
import { ensurePostShape } from "../data/postShape";
import { useExportStability } from "../hooks/useExportStability";
import {
  Download,
  Facebook,
  Instagram,
  Film,
  Image as ImageIcon,
  Images,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Package,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowDown
} from "lucide-react";
import { SkeletonDeliveryCard } from "../components/Skeleton";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function DeliveryPage() {
  // Extract token from URL path (same pattern as ShareViewer)
  const deliveryToken = useMemo(() => {
    const match = window.location.pathname.match(/^\/delivery\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, []);
  const [state, setState] = useState({
    deck: null,
    posts: [],
    loading: true,
    error: null,
    downloadingItems: new Set(),
    bulkDownloading: false
  });

  const { exportOriginalMedia } = useExportStability();

  // Load deck and items using delivery token
  useEffect(() => {
    if (!deliveryToken) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: "Invalid delivery link" 
      }));
      return;
    }
    
    const loadDeckData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // Get deck data from delivery token
        const { deckId, deck } = await getDeckFromDeliveryToken(deliveryToken);
        
        // Load deck items
        const items = await listDeckItems(deckId);
        
        const posts = items.map((item, index) => ({
          ...item,
          displayIndex: index + 1,
          post: ensurePostShape(item.post_json)
        }));
        
        setState(prev => ({ 
          ...prev, 
          deck,
          posts, 
          loading: false 
        }));
      } catch (error) {
        console.error("Failed to load delivery data:", error);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message || "Failed to load deck data" 
        }));
      }
    };
    
    loadDeckData();
  }, [deliveryToken]);

  // Handle individual post download
  const handleDownloadPost = useCallback(async (post, displayIndex) => {
    if (!exportOriginalMedia) return;
    
    const itemId = `${displayIndex}`;
    setState(prev => ({
      ...prev,
      downloadingItems: new Set(prev.downloadingItems).add(itemId)
    }));

    try {
      const deckName = state.deck?.title || "deck";
      const filename = generateFileName(deckName, displayIndex, post);
      await exportOriginalMedia(post, filename);
    } catch (error) {
      console.error("Download failed:", error);
      alert(`Download failed: ${error.message}`);
    } finally {
      setState(prev => {
        const newDownloading = new Set(prev.downloadingItems);
        newDownloading.delete(itemId);
        return { ...prev, downloadingItems: newDownloading };
      });
    }
  }, [exportOriginalMedia, state.deck]);

  // Handle bulk download
  const handleBulkDownload = useCallback(async () => {
    if (!exportOriginalMedia || state.posts.length === 0) return;
    
    setState(prev => ({ ...prev, bulkDownloading: true }));
    
    try {
      const deckName = state.deck?.title || "deck";
      let successCount = 0;
      let failCount = 0;
      
      // Download all posts with a small delay between each
      for (let i = 0; i < state.posts.length; i++) {
        const item = state.posts[i];
        try {
          const filename = generateFileName(deckName, item.displayIndex, item.post);
          await exportOriginalMedia(item.post, filename);
          successCount++;
          
          // Small delay to prevent overwhelming the browser
          if (i < state.posts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Failed to download post ${item.displayIndex}:`, error);
          failCount++;
        }
      }
      
      // Show results
      if (failCount === 0) {
        alert(`Successfully downloaded all ${successCount} assets!`);
      } else {
        alert(`Downloaded ${successCount} assets successfully. ${failCount} failed.`);
      }
      
    } catch (error) {
      console.error("Bulk download failed:", error);
      alert(`Bulk download failed: ${error.message}`);
    } finally {
      setState(prev => ({ ...prev, bulkDownloading: false }));
    }
  }, [exportOriginalMedia, state.posts, state.deck]);

  // Generate smart filename
  const generateFileName = (deckName, postIndex, post) => {
    const sanitizedDeckName = deckName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const platform = post.platform || 'post';
    const mediaType = getMediaType(post);
    const extension = getFileExtension(post);
    
    return `${sanitizedDeckName}_post-${postIndex}_${platform}${mediaType}.${extension}`;
  };

  const getMediaType = (post) => {
    if (post.type === "reel" || post.isReel) return "-reel";
    if (post.type === "carousel" && post.media?.length > 1) return "-carousel";
    if (post.type === "video" && post.videoSrc) return "-video";
    return "";
  };

  const getFileExtension = (post) => {
    if (post.videoSrc) return "mp4";
    return "jpg";
  };

  const getPlatformIcon = (platform) => {
    if (platform === "instagram") return <Instagram className="w-4 h-4" />;
    if (platform === "facebook") return <Facebook className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  const getPostTypeIcon = (post) => {
    if (post.type === "reel" || post.isReel) return <Film className="w-4 h-4" />;
    if (post.type === "carousel") return <Images className="w-4 h-4" />;
    if (post.type === "video") return <Film className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="space-y-8">
            {Array.from({ length: 3 }, (_, i) => (
              <SkeletonDeliveryCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state  
  if (state.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Content</h2>
          <p className="text-gray-600 leading-relaxed">{state.error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (state.posts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg border">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No Content Available</h2>
          <p className="text-gray-600 leading-relaxed">This deck doesn't contain any approved posts yet. Check back later or contact your content team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Approved Content
              </span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {state.deck?.title || "Social Media Assets"}
            </h1>
          </div>
          
          {/* Stats and Bulk Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 rounded-2xl p-4 border border-white/40 shadow-sm">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{state.posts.length} posts ready</span>
              </div>
            </div>
            
            {/* Enhanced Bulk Download Button */}
            {state.posts.length > 0 && (
              <button
                onClick={handleBulkDownload}
                disabled={state.bulkDownloading}
                className={cx(
                  "inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg",
                  state.bulkDownloading
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-xl hover:scale-105 active:scale-95"
                )}
              >
                {state.bulkDownloading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Downloading All...</span>
                    <div className="text-xs opacity-75">Please wait</div>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-5 h-5" />
                    <span>Download All Assets</span>
                    <div className="px-2 py-1 bg-white/20 rounded-lg text-xs font-normal">
                      {state.posts.length} items
                    </div>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Posts Grid */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {state.posts.map((item) => (
            <PostCard
              key={item.id}
              post={item.post}
              displayIndex={item.displayIndex}
              onDownload={() => handleDownloadPost(item.post, item.displayIndex)}
              downloading={state.downloadingItems.has(`${item.displayIndex}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Individual Post Card Component
function PostCard({ post, displayIndex, onDownload, downloading }) {
  const [copiedText, setCopiedText] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleCopyText = useCallback(async (text, type) => {
    if (!navigator.clipboard || !window.isSecureContext) {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } else {
      await navigator.clipboard.writeText(text);
    }
    
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  }, []);

  const getPlatformIcon = (platform) => {
    if (platform === "instagram") return <Instagram className="w-4 h-4" />;
    if (platform === "facebook") return <Facebook className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  const getPostTypeIcon = (post) => {
    if (post.type === "reel" || post.isReel) return <Film className="w-4 h-4" />;
    if (post.type === "carousel") return <Images className="w-4 h-4" />;
    if (post.type === "video") return <Film className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  const getMediaCount = () => {
    if (post.type === "carousel" && post.media?.length > 1) {
      return ` (${post.media.length} images)`;
    }
    return "";
  };

  // Get preview content
  const getPreviewContent = () => {
    if (post.videoSrc) {
      return { type: 'video', src: post.videoSrc, thumbnail: post.thumbnail };
    }
    if (post.type === "carousel" && post.media && post.media.length > 1) {
      return { type: 'carousel', images: post.media };
    }
    return { type: 'image', src: post.media?.[0] || null };
  };

  const previewContent = getPreviewContent();

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/40 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col lg:flex-row">
        {/* Visual Preview Section */}
        <div className="lg:w-80 lg:flex-shrink-0">
          {previewContent.type === 'carousel' ? (
            // Carousel Preview - Horizontal scrollable layout
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
              {/* Simple carousel preview - just show first image */}
              <img
                src={previewContent.images[0]}
                alt="Carousel preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              
              {/* Simple carousel indicator */}
              <div className="absolute bottom-3 left-3">
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Images className="w-3 h-3 text-white" />
                  <span className="text-white text-xs font-medium">{previewContent.images.length} slides</span>
                </div>
              </div>
              
              {/* Media Type Overlay */}
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2">
                  <div className={cx(
                    "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm border border-white/20 shadow-lg",
                    post.platform === "instagram" 
                      ? "bg-purple-500/90 text-white"
                      : "bg-blue-500/90 text-white"
                  )}>
                    {getPlatformIcon(post.platform)}
                    <span className="capitalize">{post.platform}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-black/60 text-white backdrop-blur-sm border border-white/20 shadow-lg">
                    <Images className="w-3 h-3" />
                    <span>Carousel ({previewContent.images.length})</span>
                  </div>
                </div>
              </div>
            </div>
          ) : previewContent.type === 'video' ? (
            // Video Preview
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
              <video
                className="w-full h-full object-cover"
                poster={previewContent.thumbnail}
                muted
                playsInline
                onLoadedData={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              >
                <source src={previewContent.src} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* Video Play Indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
                  <Film className="w-8 h-8 text-white ml-1" />
                </div>
              </div>
              
              {/* Media Type Overlay */}
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2">
                  <div className={cx(
                    "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm border border-white/20 shadow-lg",
                    post.platform === "instagram" 
                      ? "bg-purple-500/90 text-white"
                      : "bg-blue-500/90 text-white"
                  )}>
                    {getPlatformIcon(post.platform)}
                    <span className="capitalize">{post.platform}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-black/60 text-white backdrop-blur-sm border border-white/20 shadow-lg">
                    <Film className="w-3 h-3" />
                    <span className="capitalize">{post.type || 'video'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : previewContent.src ? (
            // Single Image Preview
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
              <img
                src={previewContent.src}
                alt={`Post ${displayIndex} preview`}
                className={cx(
                  "w-full h-full object-cover transition-all duration-500",
                  imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* Media Type Overlay */}
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2">
                  <div className={cx(
                    "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm border border-white/20 shadow-lg",
                    post.platform === "instagram" 
                      ? "bg-purple-500/90 text-white"
                      : "bg-blue-500/90 text-white"
                  )}>
                    {getPlatformIcon(post.platform)}
                    <span className="capitalize">{post.platform}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-black/60 text-white backdrop-blur-sm border border-white/20 shadow-lg">
                    {getPostTypeIcon(post)}
                    <span className="capitalize">{post.type}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // No Preview Available
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-500">No preview available</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6 lg:p-8">
          {/* Post Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Post {displayIndex}
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <p className="text-sm text-gray-600">Ready for download and posting</p>
            </div>

            {/* Enhanced Download Button */}
            <button
              onClick={onDownload}
              disabled={downloading}
              className={cx(
                "inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg relative overflow-hidden",
                downloading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:scale-105 active:scale-95"
              )}
            >
              {downloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download Asset</span>
                </>
              )}
              {!downloading && (
                <div className="absolute inset-0 bg-white/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              )}
            </button>
          </div>

          {/* Post Content */}
          <div className="space-y-6">
            {/* Caption */}
            {post.caption && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    Post Copy
                  </h3>
                  <button
                    onClick={() => handleCopyText(post.caption, 'caption')}
                    className={cx(
                      "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                      copiedText === 'caption'
                        ? "bg-green-100 text-green-800 shadow-sm"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-md"
                    )}
                  >
                    {copiedText === 'caption' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200/50">
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{post.caption.length} characters</span>
                    <span className="px-2 py-1 bg-white/70 rounded-lg">Ready to post</span>
                  </div>
                </div>
              </div>
            )}

            {/* Carousel Card Text */}
            {post.type === "carousel" && post.mediaMeta && post.mediaMeta.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Carousel Cards</h3>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                    {post.mediaMeta.length} slides
                  </span>
                </div>
                <div className="grid gap-4">
                  {post.mediaMeta.map((cardMeta, index) => {
                    // Only show cards that have text content
                    if (!cardMeta.headline && !cardMeta.subhead) return null;
                    
                    return (
                      <div key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl overflow-hidden border border-purple-200/50">
                        <div className="flex gap-4">
                          {/* Carousel slide thumbnail */}
                          <div className="w-24 flex-shrink-0">
                            <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                              {previewContent.images[index] ? (
                                <img
                                  src={previewContent.images[index]}
                                  alt={`Carousel slide ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Card content */}
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {index + 1}
                                </div>
                                <span className="text-sm font-semibold text-gray-900">Slide {index + 1}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {cardMeta.headline && (
                                  <button
                                    onClick={() => handleCopyText(cardMeta.headline, `card-${index}-headline`)}
                                    className={cx(
                                      "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-all",
                                      copiedText === `card-${index}-headline`
                                        ? "bg-green-100 text-green-800"
                                        : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                    )}
                                    title="Copy headline"
                                  >
                                    {copiedText === `card-${index}-headline` ? (
                                      <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>Title</span>
                                  </button>
                                )}
                                {cardMeta.subhead && (
                                  <button
                                    onClick={() => handleCopyText(cardMeta.subhead, `card-${index}-subhead`)}
                                    className={cx(
                                      "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-all",
                                      copiedText === `card-${index}-subhead`
                                        ? "bg-green-100 text-green-800"
                                        : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                    )}
                                    title="Copy description"
                                  >
                                    {copiedText === `card-${index}-subhead` ? (
                                      <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>Text</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              {cardMeta.headline && (
                                <div className="bg-white/70 rounded-lg p-3 border border-white/40">
                                  <span className="text-xs font-semibold text-purple-600 block mb-1">HEADLINE</span>
                                  <p className="text-sm font-semibold text-gray-900 leading-relaxed">{cardMeta.headline}</p>
                                </div>
                              )}
                              
                              {cardMeta.subhead && (
                                <div className="bg-white/70 rounded-lg p-3 border border-white/40">
                                  <span className="text-xs font-semibold text-purple-600 block mb-1">DESCRIPTION</span>
                                  <p className="text-sm text-gray-800 leading-relaxed">{cardMeta.subhead}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Link Preview (Facebook only) */}
            {post.platform === "facebook" && post.link?.url && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Link Preview</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    Facebook
                  </span>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200/50 space-y-4">
                  {post.link.headline && (
                    <div className="bg-white/70 rounded-lg p-3 border border-white/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-600 block">LINK HEADLINE</span>
                        <button
                          onClick={() => handleCopyText(post.link.headline, 'headline')}
                          className={cx(
                            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-all",
                            copiedText === 'headline'
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          )}
                        >
                          {copiedText === 'headline' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy</span>
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-relaxed">{post.link.headline}</p>
                    </div>
                  )}
                  
                  {post.link.subhead && (
                    <div className="bg-white/70 rounded-lg p-3 border border-white/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-600 block">DESCRIPTION</span>
                        <button
                          onClick={() => handleCopyText(post.link.subhead, 'subhead')}
                          className={cx(
                            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-all",
                            copiedText === 'subhead'
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          )}
                        >
                          {copiedText === 'subhead' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy</span>
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{post.link.subhead}</p>
                    </div>
                  )}
                  
                  <div className="bg-white/70 rounded-lg p-3 border border-white/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{post.link.url}</p>
                      </div>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm">
                        {post.link.cta || "Learn More"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}