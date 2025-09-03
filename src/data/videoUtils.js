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
    console.log('🎬 Starting video thumbnail extraction...');
    console.log('📊 Video Data URL info:', {
      isDataURL: videoDataURL?.startsWith('data:video/'),
      sizeKB: videoDataURL ? (videoDataURL.length / 1024).toFixed(1) : 'N/A',
      mimeType: videoDataURL?.match(/^data:(.*?);/)?.[1] || 'unknown',
      prefix: videoDataURL?.substring(0, 50) + '...'
    });
    
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
      console.log('🔧 Debug info at failure:', {
        videoSrc: video.src ? 'set' : 'not set',
        readyState: video.readyState,
        networkState: video.networkState,
        currentTime: video.currentTime,
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        error: video.error
      });
      cleanup();
      resolve(createVideoPlaceholder(400, 300));
    };
    
    const resolveWithThumbnail = (thumbnail) => {
      console.log('✅ Video thumbnail extracted successfully, size:', (thumbnail.length / 1024).toFixed(1) + 'KB');
      console.log('🎯 Final thumbnail info:', {
        isDataURL: thumbnail?.startsWith('data:image/'),
        format: thumbnail?.match(/^data:image\/(.*?);/)?.[1] || 'unknown',
        sizeKB: (thumbnail?.length / 1024).toFixed(1)
      });
      cleanup();
      resolve(thumbnail);
    };
    
    video.onloadedmetadata = () => {
      console.log(`📹 Video metadata loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`);
      
      if (video.duration <= 0) {
        resolveWithPlaceholder('Video has invalid duration');
        return;
      }
      
      // Capture from the very first frame for better reliability
      const captureTime = 0.1; // Always use 0.1 seconds
      console.log(`⏰ Seeking to ${captureTime}s for thumbnail`);
      video.currentTime = captureTime;
    };
    
    video.oncanplay = () => {
      console.log('🎮 Video can play, attempting to draw frame...');
      console.log('📏 Video dimensions check:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentTime: video.currentTime,
        duration: video.duration,
        readyState: video.readyState
      });
      
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
          
          console.log('🎨 Canvas setup:', {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight
          });
          
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
          
          console.log('📐 Draw calculations:', {
            videoAspect: videoAspect.toFixed(2),
            canvasAspect: canvasAspect.toFixed(2),
            drawX, drawY, drawWidth: drawWidth.toFixed(0), drawHeight: drawHeight.toFixed(0)
          });
          
          console.log('🖼️ Drawing video frame to canvas...');
          ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
          console.log('✅ Video frame drawn successfully');
          
          // Create thumbnail with good compression
          console.log('🗜️ Converting canvas to data URL...');
          const thumbnail = canvas.toDataURL('image/jpeg', 0.85);
          
          console.log('🔍 Thumbnail validation:', {
            hasThumbnail: !!thumbnail,
            isDataURL: thumbnail?.startsWith('data:image/'),
            length: thumbnail?.length || 0,
            sizeKB: thumbnail ? (thumbnail.length / 1024).toFixed(1) : 'N/A',
            prefix: thumbnail?.substring(0, 30) + '...'
          });
          
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
      console.log(`Video seeked to ${video.currentTime}s`);
      // canplay handler will do the extraction
    };
    
    video.onerror = (e) => {
      console.error('🚫 Video error during thumbnail extraction:', e);
      console.log('🔧 Video error details:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState,
        src: video.src ? 'set' : 'not set'
      });
      resolveWithPlaceholder('Video failed to load');
    };
    
    video.onloadstart = () => {
      console.log('▶️ Video load started...');
    };
    
    video.onloadeddata = () => {
      console.log('📦 Video data loaded');
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
    
    console.log('Setting video source...');
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
    console.log('Processing video for deck storage...');
    
    // Get video metadata
    console.log('Getting video metadata...');
    const metadata = await getVideoMetadata(videoDataURL);
    console.log('Video metadata:', metadata);
    
    // Extract thumbnail
    console.log('Extracting video thumbnail...');
    const thumbnail = await extractVideoThumbnail(videoDataURL);
    
    const thumbnailSize = thumbnail ? (thumbnail.length / 1024).toFixed(1) : 'N/A';
    console.log(`Thumbnail extracted: ${thumbnailSize}KB`);
    
    // Check video size
    const videoSizeMB = (videoDataURL.length * 0.75) / (1024 * 1024);
    console.log(`Video size: ${videoSizeMB.toFixed(2)}MB`);
    
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
    
    console.log('Video processing complete:', {
      hasVideo: !!result.videoSrc,
      hasThumbnail: !!result.thumbnail,
      thumbnailType: typeof result.thumbnail,
      thumbnailLength: result.thumbnail?.length
    });
    
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
  console.log('🔍 getVideoThumbnail called for post:', { 
    postId: post.id,
    hasVideoSrc: !!post.videoSrc, 
    hasVideoThumbnail: !!post.videoThumbnail,
    videoSrcType: typeof post.videoSrc,
    thumbnailType: typeof post.videoThumbnail,
    thumbnailIsDataURL: post.videoThumbnail?.startsWith('data:'),
    thumbnailIsURL: post.videoThumbnail?.startsWith('http') || post.videoThumbnail?.includes('supabase'),
    thumbnailPrefix: post.videoThumbnail?.substring(0, 30) + '...',
    videoSrcPrefix: post.videoSrc?.substring(0, 30) + '...'
  });
  
  // If we have a stored thumbnail, use it (could be data URL or regular URL)
  if (post.videoThumbnail) {
    if (post.videoThumbnail.startsWith('data:image/') || 
        post.videoThumbnail.startsWith('http') ||
        post.videoThumbnail.includes('supabase')) {
      console.log('✅ Using stored video thumbnail:', {
        format: post.videoThumbnail.startsWith('data:') ? 'data URL' : 'URL',
        isImage: post.videoThumbnail.startsWith('data:image/'),
        sizeKB: post.videoThumbnail.startsWith('data:') ? (post.videoThumbnail.length / 1024).toFixed(1) : 'N/A',
        preview: post.videoThumbnail.substring(0, 50) + '...'
      });
      return post.videoThumbnail;
    } else {
      console.warn('⚠️ Invalid thumbnail format detected:', {
        thumbnailValue: post.videoThumbnail.substring(0, 100),
        isString: typeof post.videoThumbnail === 'string',
        length: post.videoThumbnail.length
      });
    }
  }
  
  // If video exists but no thumbnail, create placeholder
  if (post.videoSrc) {
    console.log('📷 No valid thumbnail found, creating placeholder for video:', {
      videoSrc: post.videoSrc.substring(0, 50) + '...',
      reason: post.videoThumbnail ? 'invalid thumbnail format' : 'no thumbnail'
    });
    return createVideoPlaceholder(400, 300);
  }
  
  console.log('❌ No video found, returning null');
  return null;
}

/**
 * Check if a video can be played inline
 * @param {string} videoSrc - Video source
 * @returns {boolean} - Whether video can be played
 */
export function canPlayVideo(videoSrc) {
  if (!videoSrc) {
    console.log('canPlayVideo: No video source');
    return false;
  }
  
  // Data URLs can be played
  if (videoSrc.startsWith('data:video/')) {
    console.log('canPlayVideo: Data URL video - can play');
    return true;
  }
  
  // HTTP/HTTPS URLs can be played
  if (videoSrc.startsWith('http://') || videoSrc.startsWith('https://')) {
    console.log('canPlayVideo: HTTP URL video - can play');
    return true;
  }
  
  // Placeholders cannot be played
  if (videoSrc.startsWith('[') && videoSrc.endsWith(']')) {
    console.log('canPlayVideo: Placeholder video - cannot play:', videoSrc);
    return false;
  }
  
  // Supabase URLs can be played
  if (videoSrc.includes('supabase')) {
    console.log('canPlayVideo: Supabase URL - can play');
    return true;
  }
  
  console.log('canPlayVideo: Unknown video format, assuming playable:', videoSrc);
  return true;
}