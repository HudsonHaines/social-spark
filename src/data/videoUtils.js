/**
 * Video processing utilities for Social Spark
 * Handles thumbnail extraction, compression, and fallback display
 */

/**
 * Extract thumbnail from video data URL
 * @param {string} videoDataURL - Video data URL
 * @param {number} timeSeconds - Time in video to capture (default: 0.5 second)
 * @returns {Promise<string>} - Thumbnail data URL
 */
export async function extractVideoThumbnail(videoDataURL, timeSeconds = 0.1) {
  return new Promise((resolve) => {
    
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    
    let hasResolved = false;
    
    const cleanup = () => {
      if (!hasResolved) {
        hasResolved = true;
        try {
          video.src = '';
          video.load();
        } catch (e) {
          console.warn('Video cleanup error:', e);
        }
      }
    };
    
    const resolveWithPlaceholder = (reason) => {
      console.warn('❌ Video thumbnail extraction failed:', reason);
      cleanup();
      resolve(createVideoPlaceholder(400, 300));
    };
    
    const resolveWithThumbnail = (thumbnail) => {
      cleanup();
      resolve(thumbnail);
    };
    
    video.onloadedmetadata = () => {
      
      if (video.duration <= 0) {
        resolveWithPlaceholder('Video has invalid duration');
        return;
      }
      
      // Capture from the very first frame for better reliability
      const captureTime = 0.1; // Always use 0.1 seconds
      video.currentTime = captureTime;
    };
    
    video.oncanplay = () => {
      
      // Try to extract frame immediately when video can play
      setTimeout(() => {
        try {
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            resolveWithPlaceholder('Video has no dimensions');
            return;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(video.videoWidth, 800); // Max width 800px
          canvas.height = Math.min(video.videoHeight, 600); // Max height 600px
          
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolveWithPlaceholder('Failed to get canvas context');
            return;
          }
          
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Scale video to fit canvas while maintaining aspect ratio
          const videoAspect = video.videoWidth / video.videoHeight;
          const canvasAspect = canvas.width / canvas.height;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          if (videoAspect > canvasAspect) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / videoAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
          } else {
            drawHeight = canvas.height;
            drawWidth = canvas.height * videoAspect;
            drawY = 0;
            drawX = (canvas.width - drawWidth) / 2;
          }
          
          ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
          
          // Create thumbnail with good compression
          const thumbnail = canvas.toDataURL('image/jpeg', 0.85);
          
          if (thumbnail && thumbnail.length > 1000) { // Basic validity check
            resolveWithThumbnail(thumbnail);
          } else {
            resolveWithPlaceholder('Generated thumbnail is invalid or too small');
          }
        } catch (error) {
          resolveWithPlaceholder(`Canvas error: ${error.message}`);
        }
      }, 100);
    };
    
    video.onseeked = () => {
      // canplay handler will do the extraction
    };
    
    video.onerror = (e) => {
      console.error('🚫 Video error during thumbnail extraction:', e);
      resolveWithPlaceholder('Video failed to load');
    };
    
    video.onloadeddata = () => {
    };
    
    // Set timeout for the entire process
    const timeout = setTimeout(() => {
      resolveWithPlaceholder('Timeout after 8 seconds');
    }, 8000);
    
    // Clear timeout when resolved
    const originalResolve = resolve;
    resolve = (value) => {
      clearTimeout(timeout);
      originalResolve(value);
    };
    
    video.src = videoDataURL;
  });
}

/**
 * Create a video placeholder thumbnail
 * @param {number} width - Width of placeholder
 * @param {number} height - Height of placeholder  
 * @returns {string} - Placeholder data URL
 */
function createVideoPlaceholder(width = 400, height = 300) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Dark background
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, width, height);
  
  // Play icon
  ctx.fillStyle = '#ffffff';
  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width, height) * 0.3;
  
  ctx.beginPath();
  ctx.moveTo(centerX - size/3, centerY - size/2);
  ctx.lineTo(centerX + size/2, centerY);
  ctx.lineTo(centerX - size/3, centerY + size/2);
  ctx.closePath();
  ctx.fill();
  
  // "Video" text
  ctx.font = `${Math.max(12, size/8)}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Video', centerX, centerY + size/2 + 20);
  
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Get video metadata
 * @param {string} videoDataURL - Video data URL
 * @returns {Promise<object>} - Video metadata
 */
export async function getVideoMetadata(videoDataURL) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: video.videoWidth / video.videoHeight
      });
    };
    
    video.onerror = () => {
      resolve({
        duration: 0,
        width: 0,
        height: 0,
        aspectRatio: 16/9
      });
    };
    
    // Timeout fallback
    setTimeout(() => {
      resolve({
        duration: 0,
        width: 0,
        height: 0,
        aspectRatio: 16/9
      });
    }, 5000);
    
    video.src = videoDataURL;
  });
}

/**
 * Process video for deck storage
 * Extracts thumbnail and handles large video files
 * @param {string} videoDataURL - Video data URL
 * @returns {Promise<object>} - Processed video data
 */
export async function processVideoForDeck(videoDataURL) {
  if (!videoDataURL || !videoDataURL.startsWith('data:video/')) {
    return {
      videoSrc: videoDataURL,
      thumbnail: null,
      metadata: null
    };
  }
  
  try {
    
    // Get video metadata
    const metadata = await getVideoMetadata(videoDataURL);
    
    // Extract thumbnail
    const thumbnail = await extractVideoThumbnail(videoDataURL);
    
    const thumbnailSize = thumbnail ? (thumbnail.length / 1024).toFixed(1) : 'N/A';
    
    // Check video size
    const videoSizeMB = (videoDataURL.length * 0.75) / (1024 * 1024);
    
    // For large videos, we'll keep the original for now but add metadata
    let processedVideoSrc = videoDataURL;
    let storageStrategy = 'inline';
    
    if (videoSizeMB > 25) {
      console.warn(`Video is very large (${videoSizeMB.toFixed(1)}MB) - consider server-side processing`);
      storageStrategy = 'needs-compression';
    }
    
    const result = {
      videoSrc: processedVideoSrc,
      thumbnail: thumbnail,
      metadata: {
        ...metadata,
        sizeMB: videoSizeMB,
        storageStrategy: storageStrategy
      }
    };
    
    return result;
    
  } catch (error) {
    console.error('Failed to process video:', error);
    
    return {
      videoSrc: videoDataURL,
      thumbnail: createVideoPlaceholder(),
      metadata: {
        duration: 0,
        width: 0,
        height: 0,
        aspectRatio: 16/9,
        sizeMB: (videoDataURL.length * 0.75) / (1024 * 1024),
        storageStrategy: 'error'
      }
    };
  }
}

/**
 * Create video thumbnail for display components
 * @param {object} post - Post object
 * @returns {string} - Thumbnail URL or placeholder
 */
export function getVideoThumbnail(post) {
  
  // If we have a stored thumbnail, use it (could be data URL or regular URL)
  if (post.videoThumbnail) {
    if (post.videoThumbnail.startsWith('data:image/') || 
        post.videoThumbnail.startsWith('http') ||
        post.videoThumbnail.includes('supabase')) {
      return post.videoThumbnail;
    } else {
      console.warn('⚠️ Invalid thumbnail format detected:', post.videoThumbnail.substring(0, 100));
    }
  }
  
  // If video exists but no thumbnail, create placeholder
  if (post.videoSrc) {
    return createVideoPlaceholder(400, 300);
  }
  
  return null;
}

/**
 * Check if a video can be played inline
 * @param {string} videoSrc - Video source
 * @returns {boolean} - Whether video can be played
 */
export function canPlayVideo(videoSrc) {
  if (!videoSrc) {
    return false;
  }
  
  // Data URLs can be played
  if (videoSrc.startsWith('data:video/')) {
    return true;
  }
  
  // HTTP/HTTPS URLs can be played
  if (videoSrc.startsWith('http://') || videoSrc.startsWith('https://')) {
    return true;
  }
  
  // Placeholders cannot be played
  if (videoSrc.startsWith('[') && videoSrc.endsWith(']')) {
    return false;
  }
  
  // Supabase URLs can be played
  if (videoSrc.includes('supabase')) {
    return true;
  }
  
  return true;
}