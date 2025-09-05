import React from 'react';
import SimpleVideoControls from './SimpleVideoControls';
import { useView } from '../contexts/ViewContext';

export default function SimpleFacebookReel({ post, videoRef, mode = "create" }) {
  const { isMobile } = useView();
  return (
    <div 
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
          <>
            <video
              ref={videoRef}
              src={post.videoSrc}
              className="w-full h-full object-cover"
              controls={false}
              muted
              loop
              playsInline
              poster={post.media?.[0]}
            />
            
            {/* Simple video controls - only in create mode */}
            {mode === "create" && (
              <SimpleVideoControls videoRef={videoRef} />
            )}
          </>
        ) : post.media?.[0] ? (
          <img
            src={post.media[0]}
            alt=""
            className="w-full h-full object-cover"
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
      </div>

      {/* Facebook UI Overlay */}
      <div className="absolute inset-0 select-none pointer-events-none">
        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <div className="flex items-center">
              <span className="text-white font-bold text-lg tracking-tight">
                Reels
              </span>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>

        {/* Right Side Actions */}
        <div className="absolute right-3 bottom-40 flex flex-col items-center space-y-6">
          {/* Like */}
          <div className="flex flex-col items-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white" className="drop-shadow-lg mb-1">
              <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
            </svg>
            <span className="text-white text-xs font-semibold drop-shadow-md">434K</span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="drop-shadow-lg mb-1">
              <path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
            </svg>
            <span className="text-white text-xs font-semibold drop-shadow-md">8.7K</span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="drop-shadow-lg mb-1">
              <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
            </svg>
            <span className="text-white text-xs font-semibold drop-shadow-md">13.7K</span>
          </div>
        </div>

        {/* Bottom Profile Info Panel */}
        <div className="absolute bottom-0 left-0 right-0">
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

        {/* Facebook Comment Bar - Mobile Only */}
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