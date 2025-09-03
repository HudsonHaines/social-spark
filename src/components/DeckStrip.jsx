// src/components/DeckStrip.jsx
import React, { useRef, useEffect, memo, useState } from "react";
import { 
  Plus, 
  Eye, 
  Copy, 
  Trash2, 
  Video as VideoIcon, 
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Save,
  X
} from "lucide-react";
import { getVideoThumbnail, canPlayVideo } from "../data/videoUtils";

const cx = (...a) => a.filter(Boolean).join(" ");

const DeckStrip = memo(function DeckStrip({
  deck = [],
  currentPost,
  onStartDeckBuilding,
  onAddToDeck,
  onLoadFromDeck,
  onDeleteFromDeck,
  onDuplicateToDeck,
  onSaveDeck,
  onReorderDeck,
  onPreviewDeck,
}) {
  const scrollRef = useRef(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Auto-scroll to end when new items are added
  useEffect(() => {
    if (scrollRef.current && deck.length > 0) {
      const scrollContainer = scrollRef.current;
      // Smooth scroll to the rightmost item when deck changes
      setTimeout(() => {
        scrollContainer.scrollTo({
          left: scrollContainer.scrollWidth,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [deck.length]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleSaveDeck = async () => {
    if (!deckName.trim() || !deck.length) return;
    
    setIsSaving(true);
    try {
      await onSaveDeck(deckName.trim());
      setShowSaveModal(false);
      setDeckName("");
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error("Failed to save deck:", error);
      
      // Provide more specific error messages to user
      let errorMessage = "Failed to save deck. Please try again.";
      if (error.message) {
        if (error.message.includes('auth') || error.message.includes('sign')) {
          errorMessage = "Please sign in to save decks.";
        } else if (error.message.includes('Deck title is required')) {
          errorMessage = "Please enter a deck name.";
        } else if (error.message.includes('Cannot save empty deck')) {
          errorMessage = "Cannot save an empty deck. Add some posts first.";
        } else if (error.message.includes('Invalid post data')) {
          errorMessage = "Some posts have invalid data. Please try recreating them.";
        } else {
          errorMessage = `Save failed: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (deck.length === 0) {
      alert("Add some posts to your deck before saving.");
      return;
    }
    setShowSaveModal(true);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set some data to make the drag valid
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the container, not moving between items
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Create new array with reordered items
    const newDeck = [...deck];
    const draggedItem = newDeck[draggedIndex];
    
    // Remove the dragged item
    newDeck.splice(draggedIndex, 1);
    
    // Insert at new position
    newDeck.splice(dropIndex, 0, draggedItem);
    
    // Call the reorder handler if provided
    if (onReorderDeck) {
      onReorderDeck(newDeck);
    }
    
    // Reset drag state
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (!deck || deck.length === 0) {
    return (
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onStartDeckBuilding}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Start Building Your Deck
          </button>
          <span className="text-sm text-gray-500">
            Add posts to create a presentation deck
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white relative group">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-20 animate-bounce">
          Deck saved successfully! 🎉
        </div>
      )}
      
      {/* Deck Header */}
      <div className="flex items-center px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-sm font-medium text-gray-700">
            Deck Preview
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {deck.length} post{deck.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onPreviewDeck && (
            <button
              onClick={onPreviewDeck}
              className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-colors"
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
          )}
          <button
            onClick={handleSaveClick}
            className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
          >
            <Save className="w-3 h-3" />
            Save Deck
          </button>
          <button
            onClick={onAddToDeck}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Current
          </button>
        </div>
      </div>

      {/* Scrollable Deck Strip */}
      <div className="relative">
        {/* Left Scroll Button */}
        {deck.length > 4 && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm shadow-lg rounded-r-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Right Scroll Button */}
        {deck.length > 4 && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm shadow-lg rounded-l-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Deck Items Container */}
        <div
          ref={scrollRef}
          className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
        >
          {deck.map((item, index) => (
            <DeckItem
              key={item.id}
              item={item}
              index={index}
              onLoad={() => onLoadFromDeck(item.id)}
              onDelete={() => onDeleteFromDeck(item.id)}
              onDuplicate={() => onDuplicateToDeck(item.id)}
              isActive={currentPost?.id === item.id}
              isDragged={draggedIndex === index}
              isDragOver={dragOverIndex === index}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            />
          ))}
          
          {/* Add New Item Button at End */}
          <button
            onClick={onAddToDeck}
            className="flex-shrink-0 w-32 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all group/add"
          >
            <Plus className="w-5 h-5 text-gray-400 group-hover/add:text-blue-500 mb-1" />
            <span className="text-xs text-gray-500 group-hover/add:text-blue-600">Add Post</span>
          </button>
        </div>
      </div>

      {/* Save Deck Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Save Deck</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <label htmlFor="deckName" className="block text-sm font-medium text-gray-700 mb-2">
                Deck Name
              </label>
              <input
                id="deckName"
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Enter deck name..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deckName.trim()) {
                    handleSaveDeck();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                This deck contains {deck.length} post{deck.length === 1 ? '' : 's'}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDeck}
                disabled={!deckName.trim() || isSaving}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const DeckItem = memo(function DeckItem({ 
  item, 
  index, 
  onLoad, 
  onDelete, 
  onDuplicate,
  isActive,
  isDragged,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}) {
  const { post } = item;
  const hasMedia = post?.media?.length > 0 || post?.videoSrc;

  return (
    <div
      draggable
      className={cx(
        "relative flex-shrink-0 w-32 group/item transition-all",
        "cursor-move", // Change cursor to indicate draggable
        isActive && "ring-2 ring-blue-500 rounded-lg",
        isDragged && "opacity-50 scale-95", // Visual feedback when being dragged
        isDragOver && "ring-2 ring-green-400 ring-offset-2" // Visual feedback when drag target
      )}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onLoad}
    >
      {/* Thumbnail */}
      <div className="relative h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 transition-all">
        {post?.media?.length > 0 ? (
          <img 
            src={post.media[0]} 
            alt="" 
            className="w-full h-full object-cover"
          />
        ) : post?.videoSrc ? (
          (() => {
            const thumbnail = getVideoThumbnail(post);
            return thumbnail ? (
              <div className="relative w-full h-full">
                <img 
                  src={thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/60 rounded-full p-2">
                    <VideoIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <VideoIcon className="w-6 h-6 text-white" />
              </div>
            );
          })()
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <div className="text-center">
              <ImageIcon className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <div className="text-[10px] text-gray-500 leading-tight line-clamp-2">
                {post?.caption?.slice(0, 30) || 'Text post'}
              </div>
            </div>
          </div>
        )}

        {/* Index Badge */}
        <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-medium rounded px-1.5 py-0.5">
          {index + 1}
        </div>

        {/* Platform Badge */}
        <div className="absolute top-1 right-1">
          <div className={cx(
            "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
            post?.platform === "facebook" ? "bg-blue-500" : "bg-pink-500"
          )}>
            {post?.platform === "facebook" ? "f" : "📷"}
          </div>
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex gap-1">
            <button 
              className="bg-white/90 hover:bg-white text-gray-700 rounded-full p-1.5 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onLoad();
              }}
              title="Load this post"
            >
              <Eye className="w-3 h-3" />
            </button>
            <button 
              className="bg-white/90 hover:bg-white text-gray-700 rounded-full p-1.5 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button 
              className="bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1.5 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Post Info */}
      <div className="mt-1 px-1">
        <div className="text-[10px] text-gray-600 truncate">
          {post?.brand?.name || 'Untitled'}
        </div>
      </div>
    </div>
  );
});

export default DeckStrip;