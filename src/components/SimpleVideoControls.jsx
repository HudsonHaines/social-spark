// Simple, self-contained video controls that don't cause render loops
import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

export default function SimpleVideoControls({ videoRef, className = "" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  const handlePlayPause = () => {
    const video = videoRef?.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };
  
  const handleMuteToggle = () => {
    const video = videoRef?.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };
  
  // Center play button when paused
  if (!isPlaying) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center w-16 h-16 bg-black/60 hover:bg-black/80 rounded-full transition-colors pointer-events-auto backdrop-blur-sm"
        >
          <Play className="w-8 h-8 text-white ml-1" />
        </button>
      </div>
    );
  }
  
  // Hover controls when playing
  return (
    <div className={`absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none ${className}`}>
      <div className="flex items-center gap-4 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 pointer-events-auto">
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
        >
          <Pause className="w-5 h-5 text-white" />
        </button>
        
        <button
          onClick={handleMuteToggle}
          className="flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}