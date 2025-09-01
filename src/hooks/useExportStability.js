// src/hooks/useExportStability.js
import { useState, useCallback, useRef } from "react";
import * as htmlToImage from "html-to-image";

// Wait for all <img> elements in a container to load (or error)
async function waitForImages(containerElement, timeoutMs = 8000) {
  const images = Array.from(containerElement.querySelectorAll("img"));
  if (images.length === 0) return;

  const pending = images.filter(img => !(img.complete && img.naturalWidth > 0));
  if (pending.length === 0) return;

  await new Promise((resolve) => {
    let done = 0;
    const maybeDone = () => { done += 1; if (done === pending.length) resolve(); };
    const timer = setTimeout(() => resolve(), timeoutMs); // do not hang forever

    pending.forEach(img => {
      const onLoad = () => { img.removeEventListener("load", onLoad); maybeDone(); };
      const onErr  = () => { img.removeEventListener("error", onErr); maybeDone(); };
      img.addEventListener("load", onLoad);
      img.addEventListener("error", onErr);
    });

    // best effort cleanup when promise resolves
    void timer;
  });
}

export function useExportStability() {
  const [isExporting, setIsExporting] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const nodeRef = useRef(null);
  const unsubsRef = useRef([]);

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

      const dataUrl = await htmlToImage.toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        quality: 1,
        backgroundColor: "#ffffff",
        style: { transform: "scale(1)", transformOrigin: "top left" },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  return { isExporting, imagesReady, exportAsPng, attachNode };
}
