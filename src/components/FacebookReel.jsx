// src/components/FacebookReel.jsx
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, ChevronUp, Pause, Volume2, VolumeX } from 'lucide-react';
import { useView } from '../contexts/ViewContext';

const cx = (...a) => a.filter(Boolean).join(" ");

// Facebook-specific UI elements
const FacebookReelsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M17.5 1.25c1.4 0 2.75 1.35 2.75 2.75v16c0 1.4-1.35 2.75-2.75 2.75H6.5c-1.4 0-2.75-1.35-2.75-2.75V4c0-1.4 1.35-2.75 2.75-2.75H17.5zm-7 4.5v12l8.5-6-8.5-6z"/>
  </svg>
);

const FacebookLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#1877f2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    <circle cx="12" cy="12" r="12" fill="white"/>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877f2"/>
  </svg>
);

export default function FacebookReel({ 
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

    const handlePlay = () => updatePost && updatePost(prev => prev.playing !== true ? { ...prev, playing: true } : prev);
    const handlePause = () => updatePost && updatePost(prev => prev.playing !== false ? { ...prev, playing: false } : prev);

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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Segoe UI Historic", "Segoe UI Emoji", sans-serif'
      }}
    >
      {/* Video Content */}
      <div className="absolute inset-0">
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
              console.log('🎬 FacebookReel video click', { video, paused: video?.paused });
              
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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
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
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
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

      {/* Facebook Reels UI Overlay - Pixel Perfect */}
      <div className="absolute inset-0 select-none">
        

        {/* Brand Logo Overlay (top left) */}
        {post.brand?.logoSrc && (
          <div className="absolute top-16 left-4">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
              <img 
                src={post.brand.logoSrc} 
                alt="" 
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
        )}

        {/* Top Navigation Bar - Facebook Style */}
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <div className="flex items-center">
              <span className="text-white font-bold text-lg tracking-tight">
                Reels
              </span>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>



        {/* Right Side Actions - Facebook Style */}
        <div className="absolute right-3 bottom-40 flex flex-col items-center space-y-6 pointer-events-none">
          {/* Like */}
          <div className="flex flex-col items-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white" className="drop-shadow-lg mb-1">
              <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
            </svg>
            <span className="text-white text-xs font-semibold drop-shadow-md">
              434K
            </span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="drop-shadow-lg mb-1">
              <path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
            </svg>
            <span className="text-white text-xs font-semibold drop-shadow-md">
              8.7K
            </span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="drop-shadow-lg mb-1">
              <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
            </svg>
            <span className="text-white text-xs font-semibold drop-shadow-md">
              13.7K
            </span>
          </div>
        </div>

        {/* Bottom Profile Info Panel */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          
          <div className={`relative px-4 ${isMobile ? 'pb-40' : 'pb-6'}`}>
            {/* Profile Section */}
            <div className="flex items-center mb-3">
              <div className="w-9 h-9 rounded-full overflow-hidden mr-3 border border-white/20">
                {post.brand?.profileSrc ? (
                  <img src={post.brand.profileSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {post.brand?.name?.charAt(0) || 'B'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className="text-white font-bold text-base mr-2">
                    {post.brand?.name || 'Your Brand'}
                  </span>
                  <button className="ml-3 bg-transparent border border-white/40 rounded-md px-3 py-1 text-white text-sm font-semibold">
                    Follow
                  </button>
                </div>
                <div className="text-white/80 text-sm">
                  🎵 {post.brand?.name || 'Your Brand'} • Original audio
                </div>
              </div>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="text-white text-base leading-tight mb-4">
                {post.caption.length > 60 ? 
                  <>
                    {post.caption.substring(0, 60)}...
                    <button className="text-white/70 ml-1">more</button>
                  </> 
                  : post.caption
                }
              </div>
            )}
          </div>
        </div>

        {/* Facebook Comment Bar - Properly Positioned */}
        {isMobile && (
        <div className="absolute left-0 right-0 bg-black" style={{ height: '91px', borderBottomLeftRadius: '50px', borderBottomRightRadius: '50px', bottom: '60px' }}>
          <div className="flex items-center px-4 py-3">
            {/* Comment input area with rounded background */}
            <div 
              className="flex-1 rounded-full px-5 py-3 mr-3"
              style={{ backgroundColor: '#3a3b3c' }}
            >
              <span className="text-gray-300 text-base font-normal">Add a comment</span>
            </div>
            
            {/* Emoji button */}
            <button className="mr-3 p-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" fill="none"/>
                <circle cx="9" cy="9" r="1.5" fill="white"/>
                <circle cx="15" cy="9" r="1.5" fill="white"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </button>
            
            {/* GIF button */}
            <button 
              className="rounded-md px-3 py-2"
              style={{ backgroundColor: '#4a4b4c', border: '1px solid #5a5a5a' }}
            >
              <span className="text-white font-bold text-sm">GIF</span>
            </button>
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


      </div>
    </div>
  );
}