import { supabase } from '../lib/supabaseClient';
import { handleSupabaseError, withRetry, validators } from '../lib/supabaseUtils';
import { processVideoForDeck, getVideoThumbnail } from './videoUtils';

// Constants
const MEDIA_BUCKET = 'post-media';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

/**
 * Convert base64 data URL to Blob
 */
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Compress image with smart quality settings based on platform
 */
async function compressImage(dataURL, options = {}) {
  const {
    maxWidth = 1080,      // Good for social media
    maxHeight = 1350,     // 4:5 aspect ratio max (Instagram)
    quality = 0.85,       // Default quality
    format = 'jpeg'      // Output format
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // Calculate new dimensions while maintaining aspect ratio
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const ratio = Math.min(widthRatio, heightRatio, 1); // Don't upscale
      
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      
      // Use better image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Fill background white for JPEG (handles transparency)
      if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Progressive quality reduction for large images
      let finalQuality = quality;
      const pixels = width * height;
      if (pixels > 2000000) { // > 2MP
        finalQuality = Math.max(0.7, quality - 0.1);
      } else if (pixels > 1000000) { // > 1MP
        finalQuality = Math.max(0.75, quality - 0.05);
      }
      
      // Convert to blob for better size checking
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }
        
        // If compressed is larger than original, use original
        const reader = new FileReader();
        reader.onload = () => {
          const compressedDataURL = reader.result;
          
          // Check if compression actually helped
          if (compressedDataURL.length >= dataURL.length * 0.9) {
            console.log('Compression not effective, using original');
            resolve(dataURL);
          } else {
            const reduction = ((1 - compressedDataURL.length / dataURL.length) * 100).toFixed(1);
            console.log(`Image compressed: ${reduction}% size reduction`);
            resolve(compressedDataURL);
          }
        };
        reader.readAsDataURL(blob);
      }, `image/${format}`, finalQuality);
    };
    
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataURL;
  });
}

/**
 * Compress video using browser APIs (limited but better than nothing)
 * Note: Full video compression requires server-side processing or Web Codecs API
 */
async function compressVideo(dataURL, options = {}) {
  const {
    maxWidth = 720,       // 720p is plenty for social media
    maxDuration = 60,     // Max seconds
    targetSizeMB = 10     // Target file size in MB
  } = options;
  
  // For now, we'll just validate size and duration
  // True video compression would require:
  // 1. Server-side ffmpeg processing, or
  // 2. Web Codecs API (limited browser support), or
  // 3. Third-party service like Cloudinary
  
  const blob = dataURLtoBlob(dataURL);
  const sizeMB = blob.size / (1024 * 1024);
  
  if (sizeMB > 50) {
    console.warn(`Video is ${sizeMB.toFixed(1)}MB - consider server-side compression`);
    // For MVP, we'll upload as-is but warn about size
  }
  
  return dataURL; // Return as-is for now
}

/**
 * Check if storage bucket exists and is properly configured
 */
export async function checkStorageSetup() {
  try {
    // Try to list files in bucket (tests both existence and permissions)
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list('', { limit: 1 });
    
    if (error) {
      console.error('Storage check failed:', error);
      return { 
        exists: false, 
        error: error.message,
        suggestion: error.message.includes('not found') 
          ? `Create a public bucket named "${MEDIA_BUCKET}" in your Supabase dashboard`
          : 'Check your Supabase storage permissions'
      };
    }
    
    console.log('✅ Storage bucket is properly configured');
    return { exists: true, error: null };
    
  } catch (error) {
    console.error('Storage setup check error:', error);
    return { 
      exists: false, 
      error: error.message || 'Unknown error',
      suggestion: 'Check your Supabase configuration'
    };
  }
}

/**
 * Upload a single media file to Supabase Storage
 */
export async function uploadMediaFile(dataURL, mediaType = 'image', userId, index = 0) {
  if (!dataURL || !dataURL.startsWith('data:')) {
    // If it's already a URL, return it as-is
    if (dataURL && (dataURL.startsWith('http://') || dataURL.startsWith('https://'))) {
      return dataURL;
    }
    throw new Error('Invalid media data provided');
  }

  if (!userId) {
    throw new Error('User ID is required for media upload');
  }

  try {
    // Extract MIME type
    const mimeMatch = dataURL.match(/^data:(.*?);base64,/);
    if (!mimeMatch) {
      throw new Error('Invalid data URL format');
    }
    const mimeType = mimeMatch[1];
    
    // Validate media type
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);
    
    if (!isImage && !isVideo) {
      throw new Error(`Unsupported media type: ${mimeType}`);
    }
    
    // Apply compression based on media type
    let processedDataURL = dataURL;
    
    if (isImage) {
      // Always compress images for optimization
      const originalSizeMB = (dataURL.length * 0.75 / 1024 / 1024).toFixed(2);
      console.log(`Processing image ${index + 1} (${originalSizeMB}MB)...`);
      
      // Use platform-optimized settings
      processedDataURL = await compressImage(dataURL, {
        maxWidth: 1080,     // Instagram/Facebook optimal
        maxHeight: 1350,    // 4:5 aspect ratio max
        quality: 0.85,      // Good quality/size balance
        format: 'jpeg'
      });
      
      const newSizeMB = (processedDataURL.length * 0.75 / 1024 / 1024).toFixed(2);
      console.log(`✓ Image ${index + 1}: ${originalSizeMB}MB → ${newSizeMB}MB`);
      
    } else if (isVideo) {
      // Check video size and warn if large
      const originalSizeMB = (dataURL.length * 0.75 / 1024 / 1024).toFixed(2);
      console.log(`Processing video (${originalSizeMB}MB)...`);
      
      processedDataURL = await compressVideo(dataURL, {
        maxWidth: 720,
        targetSizeMB: 10
      });
      
      if (originalSizeMB > 20) {
        console.warn(`⚠️ Large video (${originalSizeMB}MB) - this may take time to upload`);
      }
    }
    
    // Convert to blob
    const blob = dataURLtoBlob(processedDataURL);
    
    // Check file size
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (blob.size > maxSize) {
      throw new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
    }
    
    // Generate unique file name
    const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${userId}/${timestamp}_${randomStr}_${index}.${extension}`;
    
    console.log(`Uploading ${mediaType} ${index + 1} to Supabase Storage...`);
    
    // Upload to Supabase Storage
    const { data, error } = await withRetry(
      () => supabase.storage
        .from(MEDIA_BUCKET)
        .upload(fileName, blob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        }),
      { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
    );
    
    if (error) {
      // Check if it's a bucket not found error
      if (error.message?.includes('not found')) {
        throw new Error(`Storage bucket "${MEDIA_BUCKET}" not found. Please create it in Supabase dashboard.`);
      }
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(fileName);
    
    if (!publicUrl) {
      throw new Error('Failed to get public URL for uploaded media');
    }
    
    // Ensure the URL is absolute and properly formatted
    const finalUrl = publicUrl.startsWith('http') ? publicUrl : `${window.location.origin}${publicUrl}`;
    
    console.log(`✅ Uploaded ${mediaType} ${index + 1}: ${finalUrl}`);
    return finalUrl;
    
  } catch (error) {
    console.error(`Failed to upload ${mediaType}:`, error);
    throw handleSupabaseError(error, { 
      operation: 'uploadMediaFile', 
      mediaType,
      index 
    });
  }
}

/**
 * Upload multiple media files from a post
 * @param {Object} post - The post object with media
 * @param {string} userId - User ID for organizing uploads
 * @param {Function} onProgress - Optional progress callback (current, total, message)
 */
export async function uploadPostMedia(post, userId, onProgress = null) {
  if (!post || !userId) {
    throw new Error('Post and user ID are required');
  }
  
  const uploadedPost = { ...post };
  
  // Count total media items for progress
  const totalItems = 
    (post.media?.length || 0) + 
    (post.videoSrc?.startsWith('data:') ? 1 : 0) +
    (post.brand?.profileSrc?.startsWith('data:') ? 1 : 0);
  
  let currentItem = 0;
  
  try {
    // Upload regular media (images) - sequential for progress tracking
    if (post.media && Array.isArray(post.media)) {
      const uploadedMedia = [];
      
      for (let index = 0; index < post.media.length; index++) {
        const mediaUrl = post.media[index];
        
        // Skip if already a URL or placeholder
        if (!mediaUrl || !mediaUrl.startsWith('data:')) {
          uploadedMedia.push(mediaUrl);
          continue;
        }
        
        currentItem++;
        if (onProgress) {
          onProgress(currentItem, totalItems, `Uploading image ${index + 1}/${post.media.length}...`);
        }
        
        try {
          const uploadedUrl = await uploadMediaFile(mediaUrl, 'image', userId, index);
          uploadedMedia.push(uploadedUrl);
        } catch (error) {
          console.error(`Failed to upload image ${index + 1}:`, error);
          // Keep original base64 on upload failure rather than broken placeholder
          uploadedMedia.push(mediaUrl);
        }
      }
      
      uploadedPost.media = uploadedMedia;
    }
    
    // Process and upload video if present
    if (post.videoSrc && post.videoSrc.startsWith('data:')) {
      currentItem++;
      if (onProgress) {
        onProgress(currentItem, totalItems, 'Processing video...');
      }
      
      try {
        // Process video to extract thumbnail and metadata
        const videoData = await processVideoForDeck(post.videoSrc);
        
        if (onProgress) {
          onProgress(currentItem, totalItems, 'Uploading video...');
        }
        
        // Try to upload the video
        uploadedPost.videoSrc = await uploadMediaFile(videoData.videoSrc, 'video', userId, 0);
        
        // If video upload succeeded, also upload thumbnail
        if (videoData.thumbnail) {
          try {
            const thumbnailUrl = await uploadMediaFile(videoData.thumbnail, 'image', userId, 998);
            uploadedPost.videoThumbnail = thumbnailUrl;
          } catch (thumbError) {
            console.warn('Failed to upload video thumbnail, keeping local:', thumbError);
            uploadedPost.videoThumbnail = videoData.thumbnail;
          }
        }
        
        // Store metadata
        uploadedPost.videoMetadata = videoData.metadata;
        
      } catch (error) {
        console.error('Failed to process/upload video:', error);
        
        // Fallback: keep original video but try to extract thumbnail
        uploadedPost.videoSrc = post.videoSrc;
        try {
          const videoData = await processVideoForDeck(post.videoSrc);
          uploadedPost.videoThumbnail = videoData.thumbnail;
          uploadedPost.videoMetadata = videoData.metadata;
        } catch (fallbackError) {
          console.error('Fallback video processing also failed:', fallbackError);
        }
      }
    }
    
    // Upload brand profile image if present
    if (post.brand?.profileSrc && post.brand.profileSrc.startsWith('data:')) {
      currentItem++;
      if (onProgress) {
        onProgress(currentItem, totalItems, 'Uploading brand image...');
      }
      
      try {
        const uploadedUrl = await uploadMediaFile(post.brand.profileSrc, 'image', userId, 999);
        uploadedPost.brand = {
          ...uploadedPost.brand,
          profileSrc: uploadedUrl
        };
      } catch (error) {
        console.error('Failed to upload brand image:', error);
        // Keep the rest of brand data even if image upload fails
      }
    }
    
    return uploadedPost;
    
  } catch (error) {
    console.error('Failed to upload post media:', error);
    throw handleSupabaseError(error, { 
      operation: 'uploadPostMedia',
      hasMedia: !!post.media?.length,
      hasVideo: !!post.videoSrc,
      hasBrandImage: !!post.brand?.profileSrc
    });
  }
}

/**
 * Create the media storage bucket if it doesn't exist
 * Note: This requires admin/service role access
 */
export async function ensureMediaBucketExists() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.warn('Cannot list buckets (requires admin access):', listError);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === MEDIA_BUCKET);
    
    if (!bucketExists) {
      // Create bucket (requires admin access)
      const { error: createError } = await supabase.storage.createBucket(MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: MAX_VIDEO_SIZE,
        allowedMimeTypes: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
      });
      
      if (createError) {
        console.warn('Cannot create bucket (requires admin access):', createError);
        return false;
      }
      
      console.log(`✅ Created storage bucket: ${MEDIA_BUCKET}`);
    }
    
    return true;
  } catch (error) {
    console.warn('Bucket check failed:', error);
    return false;
  }
}

/**
 * Delete media files from storage
 */
export async function deleteMediaFiles(urls) {
  if (!urls || !Array.isArray(urls)) return;
  
  const filePaths = urls
    .filter(url => url && url.includes(MEDIA_BUCKET))
    .map(url => {
      // Extract file path from URL
      const parts = url.split(`${MEDIA_BUCKET}/`);
      return parts[1] || null;
    })
    .filter(Boolean);
  
  if (filePaths.length === 0) return;
  
  try {
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove(filePaths);
    
    if (error) throw error;
    console.log(`Deleted ${filePaths.length} media files`);
  } catch (error) {
    console.error('Failed to delete media files:', error);
    // Non-critical error, don't throw
  }
}