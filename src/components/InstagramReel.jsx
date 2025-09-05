// src/components/InstagramReel.jsx
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useView } from '../contexts/ViewContext';

const cx = (...a) => a.filter(Boolean).join(" ");

// Exact Instagram UI elements
const InstagramReelsIcon = () => (
  <svg width="18" height="22" viewBox="0 0 24 24" fill="white">
    <path d="M17.5 1.25c1.4 0 2.75 1.35 2.75 2.75v16c0 1.4-1.35 2.75-2.75 2.75H6.5c-1.4 0-2.75-1.35-2.75-2.75V4c0-1.4 1.35-2.75 2.75-2.75H17.5zm-7 4.5v12l8.5-6-8.5-6z"/>
  </svg>
);


export default function InstagramReel({ 
  post, 
  updatePost, // Add updatePost prop to update post state
  previewRef, 
  videoRef, 
  aspectClass, 
  mode = "create" 
}) {
  const { isMobile } = useView();
  const mediaCount = post.media?.length || 0;
  const currentIndex = post.activeIndex || 0;
  // Use post.playing instead of local state
  const isPlaying = post.playing || false;

  useEffect(() => {
    const video = videoRef?.current;
    if (!video || !updatePost) return;

    const handlePlay = () => updatePost(prev => prev.playing !== true ? { ...prev, playing: true } : prev);
    const handlePause = () => updatePost(prev => prev.playing !== false ? { ...prev, playing: false } : prev);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef, updatePost]);

  return (
    <div 
      ref={previewRef} 
      className="bg-black w-full h-full relative overflow-hidden"
      style={{ 
        aspectRatio: '9/16',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* Video Content */}
      <div 
        className="absolute inset-0"
        onClick={async (e) => {
          e.stopPropagation();
          const video = videoRef?.current;
          console.log('🎬 InstagramReel wrapper click', { video, paused: video?.paused });
          
          if (video && video.paused) {
            try {
              await video.play();
              updatePost && updatePost(prev => ({ ...prev, playing: true }));
              console.log('✅ Video started playing');
            } catch (error) {
              console.error('❌ Video play failed:', error);
            }
          } else if (video) {
            video.pause();
            updatePost && updatePost(prev => ({ ...prev, playing: false }));
            console.log('⏸️ Video paused');
          }
        }}
      >
        {post.videoSrc ? (
          <video
            ref={videoRef}
            src={post.videoSrc}
            className="w-full h-full object-cover cursor-pointer"
            controls={false}
            muted={post.muted ?? true}
            loop
            playsInline
            poster={post.media?.[0]}
            onClick={async (e) => {
              e.stopPropagation();
              const video = videoRef?.current || e.target;
              console.log('🎬 InstagramReel video click', { video, paused: video?.paused });
              
              if (video && video.paused) {
                try {
                  await video.play();
                  updatePost && updatePost(prev => ({ ...prev, playing: true }));
                  console.log('✅ Video started playing');
                } catch (error) {
                  console.error('❌ Video play failed:', error);
                }
              } else if (video) {
                video.pause();
                updatePost && updatePost(prev => ({ ...prev, playing: false }));
                console.log('⏸️ Video paused');
              }
            }}
          />
        ) : post.media?.[currentIndex] ? (
          <img
            src={post.media[currentIndex]}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-800 flex items-center justify-center">
                📹
              </div>
              <div className="text-sm">Add Reel video</div>
            </div>
          </div>
        )}
        
        {/* Center Play Button - Always visible when paused */}
        {mode === "create" && post.videoSrc && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const video = videoRef?.current;
                if (video) {
                  video.play();
                  updatePost && updatePost(prev => ({ ...prev, playing: true }));
                }
              }}
              className="flex items-center justify-center w-16 h-16 bg-black/60 hover:bg-black/80 rounded-full transition-colors pointer-events-auto backdrop-blur-sm"
              title="Play"
            >
              <Play className="w-8 h-8 text-white ml-1" />
            </button>
          </div>
        )}

        {/* Video Controls Overlay - Only show in create mode */}
        {mode === "create" && post.videoSrc && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="flex items-center gap-4 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 pointer-events-auto">
              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const video = videoRef?.current;
                  if (video && updatePost) {
                    if (video.paused) {
                      video.play();
                      updatePost(prev => ({ ...prev, playing: true }));
                    } else {
                      video.pause();
                      updatePost(prev => ({ ...prev, playing: false }));
                    }
                  }
                }}
                className="flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>
              
              {/* Mute/Unmute Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const video = videoRef?.current;
                  if (video && updatePost) {
                    const newMuted = !post.muted;
                    video.muted = newMuted;
                    updatePost(prev => ({ ...prev, muted: newMuted }));
                  }
                }}
                className="flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                title={post.muted ? "Unmute" : "Mute"}
              >
                {post.muted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instagram Reels UI Overlay - Pixel Perfect */}
      <div className="absolute inset-0 select-none">
        {/* Top Navigation Bar - Clean Instagram Style */}
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
        </div>


        {/* Bottom Info Panel - Left Aligned like Instagram */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
          
          <div className={`relative px-4 pr-20 ${isMobile ? 'pb-40' : 'pb-6'}`}>
            {/* Profile Section */}
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full overflow-hidden mr-3">
                {post.brand?.profileSrc ? (
                  <img src={post.brand.profileSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {post.brand?.name?.charAt(0) || 'Y'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <span className="text-white font-semibold text-base drop-shadow-lg">
                  {post.brand?.name || 'yourbrand'}
                </span>
              </div>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="text-white text-base leading-tight mb-3 drop-shadow-lg">
                {post.caption.length > 50 ? 
                  `${post.caption.substring(0, 50)}...` 
                  : post.caption
                }
              </div>
            )}

            {/* Sponsored label */}
            <div className="mt-1">
              <span className="text-white/80 text-xs font-medium">Sponsored</span>
            </div>
          </div>
        </div>

        {/* Instagram Bottom Navigation - Properly Positioned */}
        {isMobile && (
        <div className="absolute left-0 right-0" style={{ backgroundColor: '#262626', height: '91px', borderBottomLeftRadius: '50px', borderBottomRightRadius: '50px', bottom: '60px' }}>
          <div className="flex items-center justify-around px-4" style={{ height: '49px', paddingTop: '8px' }}>
            {/* Home - Filled house */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M9.464 1.286C10.294.803 11.092.5 12 .5c.908 0 1.706.303 2.536.786.83.484 1.791 1.145 3.112 2.108.674.497 1.405 1.019 2.131 1.566.726.547 1.446 1.122 2.131 1.784C23.395 7.312 24 8.226 24 9.5V21c0 .828-.672 1.5-1.5 1.5h-5c-.828 0-1.5-.672-1.5-1.5v-5.5c0-.828-.672-1.5-1.5-1.5h-3c-.828 0-1.5.672-1.5 1.5V21c0 .828-.672 1.5-1.5 1.5h-5C.672 22.5 0 21.828 0 21V9.5c0-1.274.605-2.188 2.09-3.756C2.862 5.082 3.582 4.507 4.308 3.96c.726-.547 1.457-1.069 2.131-1.566C7.76 1.431 8.72.77 9.55.286z"/>
            </svg>
            
            {/* Search - Circle outline */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            
            {/* Plus - Rounded square with plus */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="6" ry="6"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            
            {/* Reels - Play button (active/filled) */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="2" y="4" width="20" height="16" rx="3" ry="3" fill="white"/>
              <polygon points="9,8 9,16 16,12" fill="black"/>
            </svg>
            
            {/* Profile - Brand avatar with red dot */}
            <div className="relative">
              <div 
                className="rounded-full overflow-hidden"
                style={{ width: '24px', height: '24px' }}
              >
                {post.brand?.profileSrc ? (
                  <img src={post.brand.profileSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white rounded-full"></div>
                )}
              </div>
              {/* Red notification dot */}
              <div 
                className="absolute bg-red-500 rounded-full"
                style={{ 
                  width: '6px', 
                  height: '6px',
                  top: '-1px',
                  right: '-1px'
                }}
              ></div>
            </div>
          </div>
          
          {/* Home indicator */}
          <div className="flex items-center justify-center" style={{ height: '42px' }}>
            <div 
              className="bg-white rounded-full"
              style={{ width: '134px', height: '5px', opacity: '0.3' }}
            ></div>
          </div>
        </div>
        )}


        {/* CSS for animations moved to global CSS */}
      </div>
    </div>
  );
}