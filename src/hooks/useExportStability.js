// src/hooks/useExportStability.js
import { useState, useCallback, useRef, useEffect } from "react";
import * as htmlToImage from "html-to-image";

// Wait for all <img> elements in a container to load (or error)
async function waitForImages(containerElement, timeoutMs = 8000) {
  const images = Array.from(containerElement.querySelectorAll("img"));
  if (images.length === 0) return;

  const pending = images.filter(img => !(img.complete && img.naturalWidth > 0));
  if (pending.length === 0) return;

  await new Promise((resolve) => {
    let done = 0;
    const cleanup = [];
    const maybeDone = () => { 
      done += 1; 
      if (done === pending.length) {
        cleanup.forEach(fn => fn());
        resolve(); 
      }
    };
    
    const timer = setTimeout(() => {
      cleanup.forEach(fn => fn());
      resolve();
    }, timeoutMs);
    
    cleanup.push(() => clearTimeout(timer));

    pending.forEach(img => {
      const onLoad = () => maybeDone();
      const onErr = () => maybeDone();
      
      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", onErr, { once: true });
      
      cleanup.push(() => {
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onErr);
      });
    });
  });
}

export function useExportStability() {
  const [isExporting, setIsExporting] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const nodeRef = useRef(null);
  const unsubsRef = useRef([]);
  const timeoutRef = useRef(null);

  const computeReady = useCallback((node) => {
    if (!node) return false;
    const imgs = Array.from(node.querySelectorAll("img"));
    if (imgs.length === 0) return true;
    return imgs.every(img => img.complete && img.naturalWidth > 0);
  }, []);

  // Call this when your preview ref becomes available or changes
  const attachNode = useCallback((node) => {
    // cleanup old listeners
    unsubsRef.current.forEach(fn => { try { fn(); } catch {} });
    unsubsRef.current = [];

    nodeRef.current = node;
    if (!node) { setImagesReady(false); return; }

    // initial readiness
    setImagesReady(computeReady(node));

    // subscribe to each <img> to update readiness as they load
    const imgs = Array.from(node.querySelectorAll("img"));
    imgs.forEach(img => {
      const onChange = () => setImagesReady(computeReady(node));
      img.addEventListener("load", onChange);
      img.addEventListener("error", onChange);
      unsubsRef.current.push(() => {
        img.removeEventListener("load", onChange);
        img.removeEventListener("error", onChange);
      });
    });
  }, [computeReady]);

  const exportOriginalMedia = useCallback(async (post, filename) => {
    console.log("📁 Exporting cropped media", { post, filename });
    
    if (isExporting) {
      console.log("📁 Export already in progress");
      return;
    }

    setIsExporting(true);
    
    try {
      // Handle carousel posts (multiple images)
      if (post.type === "carousel" && post.media && post.media.length > 1) {
        console.log("📁 Exporting carousel with", post.media.length, "images");
        
        // Download all images in the carousel
        for (let i = 0; i < post.media.length; i++) {
          const mediaUrl = post.media[i];
          const carouselFilename = filename 
            ? filename.replace(/\.(jpg|jpeg|png)$/i, `-${i + 1}.$1`)
            : `${post.platform}-carousel-${i + 1}-${Date.now()}.jpg`;
          
          // Determine target aspect ratio for cropping
          let targetAspectRatio = null;
          if (post.isReel || post.type === "reel") {
            targetAspectRatio = 9/16; // Reels are always vertical
          } else if (post.platform === "instagram") {
            // Instagram: use igAdFormat or default to square
            const format = post.igAdFormat || "feed-1:1";
            const ratio = format.split('-')[1] || "1:1";
            targetAspectRatio = getAspectRatioValue(ratio);
          } else {
            // Facebook: use fbAspectRatio
            const ratio = post.fbAspectRatio || "1:1";
            targetAspectRatio = getAspectRatioValue(ratio);
          }
          
          // Crop and download each image
          const croppedBlob = await cropImageToAspectRatio(mediaUrl, targetAspectRatio);
          const blobUrl = URL.createObjectURL(croppedBlob);
          
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = carouselFilename;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 100);
          
          // Small delay between downloads to prevent overwhelming the browser
          if (i < post.media.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        console.log("📁 Carousel export successful - downloaded", post.media.length, "images");
        return true;
      }
      
      // Handle single media (image or video)
      let mediaUrl = null;
      let defaultFilename = `media-${Date.now()}`;
      let shouldCrop = false;
      let targetAspectRatio = null;
      
      // Determine what media to export and if it needs cropping
      if (post.videoSrc) {
        // Export video as-is (no cropping for videos for now)
        mediaUrl = post.videoSrc;
        defaultFilename = `video-${Date.now()}.mp4`;
        shouldCrop = false;
      } else if (post.media && post.media.length > 0) {
        // Export current active image with platform-appropriate cropping
        const activeIndex = post.activeIndex || 0;
        mediaUrl = post.media[activeIndex] || post.media[0];
        defaultFilename = `${post.platform}-image-${Date.now()}.jpg`;
        shouldCrop = true;
        
        // Determine target aspect ratio based on platform and settings
        if (post.isReel || post.type === "reel") {
          targetAspectRatio = 9/16; // Reels are always vertical
        } else if (post.platform === "instagram") {
          // Instagram: use igAdFormat or default to square
          const format = post.igAdFormat || "feed-1:1";
          const ratio = format.split('-')[1] || "1:1";
          targetAspectRatio = getAspectRatioValue(ratio);
        } else {
          // Facebook: use fbAspectRatio
          const ratio = post.fbAspectRatio || "1:1";
          targetAspectRatio = getAspectRatioValue(ratio);
        }
      }
      
      if (!mediaUrl) {
        throw new Error("No media to export");
      }
      
      console.log("📁 Processing single media:", { 
        url: mediaUrl.substring(0, 50) + '...', 
        shouldCrop, 
        targetAspectRatio,
        platform: post.platform 
      });
      
      if (shouldCrop && targetAspectRatio) {
        // Crop the image to the target aspect ratio
        const croppedBlob = await cropImageToAspectRatio(mediaUrl, targetAspectRatio);
        const blobUrl = URL.createObjectURL(croppedBlob);
        
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename || defaultFilename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
        
        console.log("📁 Cropped image export successful");
        return true;
      } else {
        // Export as-is (videos or uncropped images)
        try {
          const link = document.createElement("a");
          link.href = mediaUrl;
          link.download = filename || defaultFilename;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
          }, 100);
          
          console.log("📁 Direct media export successful");
          return true;
        } catch (directDownloadError) {
          console.log("📁 Direct download failed, trying fetch method...");
          
          // Fallback: fetch the file and create a blob
          const response = await fetch(mediaUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch media: ${response.status}`);
          }
          
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename || defaultFilename;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 100);
          
          console.log("📁 Fetch-based media export successful");
          return true;
        }
      }
      
    } catch (err) {
      console.error("📁 Media export failed:", err);
      throw new Error(`Media export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  // Helper function to convert aspect ratio strings to numbers
  const getAspectRatioValue = (ratioString) => {
    switch (ratioString) {
      case "1:1": return 1;
      case "4:5": return 4/5;
      case "9:16": return 9/16;
      case "16:9": return 16/9;
      case "1.91:1": return 1.91;
      default: return 1; // Default to square
    }
  };

  // Helper function to crop image to target aspect ratio
  const cropImageToAspectRatio = async (imageUrl, targetAspectRatio) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const sourceAspectRatio = img.width / img.height;
        let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
        
        // Calculate crop dimensions to match target aspect ratio
        if (sourceAspectRatio > targetAspectRatio) {
          // Source is wider than target, crop width
          sourceWidth = img.height * targetAspectRatio;
          sourceX = (img.width - sourceWidth) / 2;
        } else if (sourceAspectRatio < targetAspectRatio) {
          // Source is taller than target, crop height
          sourceHeight = img.width / targetAspectRatio;
          sourceY = (img.height - sourceHeight) / 2;
        }
        
        // Set canvas size (use a reasonable resolution)
        const maxSize = 1080;
        let canvasWidth, canvasHeight;
        
        if (targetAspectRatio > 1) {
          canvasWidth = maxSize;
          canvasHeight = maxSize / targetAspectRatio;
        } else {
          canvasHeight = maxSize;
          canvasWidth = maxSize * targetAspectRatio;
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Draw the cropped image
        ctx.drawImage(
          img, 
          sourceX, sourceY, sourceWidth, sourceHeight,  // Source crop
          0, 0, canvasWidth, canvasHeight               // Destination
        );
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        }, 'image/jpeg', 0.9);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for cropping'));
      };
      
      img.src = imageUrl;
    });
  };

  // Legacy DOM export function (keeping for backward compatibility)
  const exportAsPng = useCallback(async (previewRef, filename = `mockup-${Date.now()}.png`) => {
    console.log("🖼️ useExportStability: Legacy DOM export called");
    
    // For now, just return false to indicate this method is deprecated
    console.warn("🖼️ Legacy DOM export is deprecated. Use exportOriginalMedia instead.");
    return false;
  }, []);


  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Clean up all event listeners
      unsubsRef.current.forEach(fn => { 
        try { fn(); } catch {} 
      });
      unsubsRef.current = [];
    };
  }, []);

  return { isExporting, imagesReady, exportAsPng, exportOriginalMedia, attachNode };
}
