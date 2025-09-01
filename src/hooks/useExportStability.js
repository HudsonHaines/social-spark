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

  const exportAsPng = useCallback(async (previewRef, filename = `mockup-${Date.now()}.png`) => {
    const node = previewRef?.current || nodeRef.current;
    if (!node || isExporting) return;

    setIsExporting(true);
    try {
      await waitForImages(node);
      // small delay to ensure layout paints
      await new Promise(r => setTimeout(r, 100));

      // Dynamic pixel ratio based on content size for better scaling
      const rect = node.getBoundingClientRect();
      const isLarge = rect.width > 800 || rect.height > 800;
      const pixelRatio = isLarge ? 1.5 : 2; // Reduce pixel ratio for large content

      const dataUrl = await htmlToImage.toPng(node, {
        pixelRatio,
        cacheBust: true,
        quality: 1,
        backgroundColor: "#ffffff",
        style: { 
          transform: "scale(1)", 
          transformOrigin: "top left",
          // Ensure consistent rendering across different post sizes
          boxSizing: "border-box"
        },
        // Improve rendering for complex layouts
        skipFonts: false,
        preferredFontFormat: 'woff2',
      });

      // More efficient download method
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup with small delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        // Revoke data URL to free memory
        URL.revokeObjectURL(dataUrl);
      }, 100);
      
      return true;
    } catch (err) {
      console.error("PNG export failed:", err);
      throw new Error(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
      // refresh readiness in case images changed
      setImagesReady(computeReady(nodeRef.current));
    }
  }, [isExporting, computeReady]);

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

  return { isExporting, imagesReady, exportAsPng, attachNode };
}
