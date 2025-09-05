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
    console.log("🖼️ useExportStability: exportAsPng called", { 
      previewRef: !!previewRef, 
      nodeRef: !!nodeRef.current, 
      filename,
      isExporting 
    });
    
    let node = previewRef?.current || nodeRef.current;
    console.log("🖼️ useExportStability: node resolved", { 
      nodeExists: !!node, 
      nodeName: node?.tagName, 
      nodeChildren: node?.children?.length,
      nodeHTML: node?.innerHTML?.substring(0, 200),
      nodeRect: node?.getBoundingClientRect(),
      nodeStyles: node ? window.getComputedStyle(node).cssText?.substring(0, 200) : 'no node',
      nodeClassList: node?.classList?.toString(),
      nodeId: node?.id,
      childElements: Array.from(node?.children || []).map(child => ({
        tagName: child.tagName,
        className: child.className,
        rect: child.getBoundingClientRect()
      }))
    });
    
    if (!node || isExporting) {
      console.log("🖼️ useExportStability: Early return", { noNode: !node, isExporting });
      return;
    }

    console.log("🖼️ useExportStability: Starting export process...");
    setIsExporting(true);
    try {
      await waitForImages(node);
      // Longer delay to ensure layout paints and fonts load
      await new Promise(r => setTimeout(r, 500));

      // Dynamic pixel ratio based on content size for better scaling
      let rect = node.getBoundingClientRect();
      console.log("🖼️ useExportStability: Node dimensions", { 
        width: rect.width, 
        height: rect.height, 
        x: rect.x, 
        y: rect.y,
        visible: rect.width > 0 && rect.height > 0 
      });

      // Check if node has zero dimensions and try to find a better target
      if (rect.width === 0 || rect.height === 0) {
        console.warn("🖼️ Node has zero dimensions! Looking for child with dimensions...");
        
        // Try to find a child element with actual dimensions
        const childWithDimensions = Array.from(node.children).find(child => {
          const childRect = child.getBoundingClientRect();
          console.log("🖼️ Checking child:", child.tagName, childRect);
          return childRect.width > 0 && childRect.height > 0;
        });
        
        if (childWithDimensions) {
          console.log("🖼️ Found child with dimensions, using it instead:", childWithDimensions);
          node = childWithDimensions;
          rect = node.getBoundingClientRect();
          console.log("🖼️ New target dimensions:", { width: rect.width, height: rect.height });
        } else {
          console.log("🖼️ No child with dimensions found. Searching entire document for visible post elements...");
          
          // Search for common post container classes
          const selectors = [
            '.fb-post-container',
            '.card',
            '.bg-white',
            '[class*="post"]',
            '[class*="facebook"]', 
            '[class*="instagram"]'
          ];
          
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`🖼️ Found ${elements.length} elements matching "${selector}"`);
            
            for (const element of elements) {
              const elementRect = element.getBoundingClientRect();
              console.log(`🖼️ Element ${selector}:`, { 
                rect: elementRect, 
                visible: elementRect.width > 0 && elementRect.height > 0,
                className: element.className,
                innerHTML: element.innerHTML?.substring(0, 100)
              });
              
              if (elementRect.width > 100 && elementRect.height > 100) {
                console.log("🖼️ Found viable element, switching to it:", element);
                node = element;
                // Recalculate rect for the new node
                rect = node.getBoundingClientRect();
                console.log("🖼️ Updated dimensions:", { width: rect.width, height: rect.height });
                break;
              }
            }
            if (node !== previewRef?.current && node !== nodeRef.current) break;
          }
        }
      }

      console.log("🖼️ useExportStability: Generating PNG data...");
      
      // Try with better export settings for content capture
      const targetWidth = rect.width > 0 ? rect.width : 400;
      const targetHeight = rect.height > 0 ? rect.height : 400;
      
      console.log("🖼️ Export target dimensions:", { targetWidth, targetHeight });
      
      const dataUrl = await htmlToImage.toPng(node, {
        backgroundColor: "#ffffff",
        pixelRatio: 2, // Higher pixel ratio for better quality
        quality: 1,
        cacheBust: true,
        width: targetWidth,
        height: targetHeight,
        // Better font handling
        skipFonts: false,
        preferredFontFormat: 'woff2',
        // Better image handling
        useCORS: true,
        allowTaint: true,
        // Additional style handling
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
      });

      console.log("🖼️ useExportStability: PNG generated, size:", dataUrl.length, "bytes");
      
      // More efficient download method
      console.log("🖼️ useExportStability: Creating download link...");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      console.log("🖼️ useExportStability: Triggering download...");
      link.click();
      
      // Cleanup with small delay to ensure download starts
      setTimeout(() => {
        console.log("🖼️ useExportStability: Cleaning up download link...");
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
