// src/hooks/useUndoRedo.js
import { useState, useCallback, useRef, useEffect } from "react";

export function useUndoRedo(initialState, maxHistorySize = 50) {
  // History stack with current state
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Prevent infinite loops when updating state
  const isUpdatingFromHistory = useRef(false);
  
  // Get current state
  const currentState = history[currentIndex];
  
  // Push new state to history
  const pushState = useCallback((newState) => {
    if (isUpdatingFromHistory.current) return;
    
    setHistory(prevHistory => {
      // Remove any history after current index (when we're not at the end)
      const newHistory = prevHistory.slice(0, currentIndex + 1);
      
      // Add new state
      newHistory.push(newState);
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        // Adjust current index since we removed the first item
        setCurrentIndex(prev => Math.max(0, prev - 1));
        return newHistory;
      }
      
      return newHistory;
    });
    
    // Move to the new state
    setCurrentIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [currentIndex, maxHistorySize]);
  
  // Undo - go back in history
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);
  
  // Redo - go forward in history
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, history.length]);
  
  // Reset history with new initial state
  const resetHistory = useCallback((newInitialState) => {
    setHistory([newInitialState]);
    setCurrentIndex(0);
  }, []);
  
  // Can undo/redo flags
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  
  // Set flag when updating from history to prevent loops
  useEffect(() => {
    isUpdatingFromHistory.current = true;
    
    // Small delay to ensure state updates complete
    const timeout = setTimeout(() => {
      isUpdatingFromHistory.current = false;
    }, 0);
    
    return () => clearTimeout(timeout);
  }, [currentIndex]);
  
  return {
    currentState,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    historyLength: history.length,
    currentIndex
  };
}