// src/components/DeckStrip.jsx
import React, { useRef, useEffect, memo, useState, useMemo } from "react";
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
  X,
  FileText,
  Search,
  Edit3,
  Download
} from "lucide-react";
import { getVideoThumbnail, canPlayVideo } from "../data/videoUtils";
import { useContextMenu } from "./ContextMenu";

const cx = (...a) => a.filter(Boolean).join(" ");

const DeckStrip = memo(function DeckStrip({
  deck = [],
  currentPost,
  onStartDeckBuilding,
  onAddToDeck,
  onAddNewPost, // New prop for adding new empty post
  onLoadFromDeck,
  onDeleteFromDeck,
  onDuplicateToDeck,
  onSaveDeck,
  onReorderDeck,
  onPreviewDeck,
  onStartNewDeck, // New prop for starting fresh
  lastSaved,
  isEditingExistingDeck,
  currentDeckTitle,
  hasUnsavedChanges = false, // New prop to check for unsaved changes
}) {
  const scrollRef = useRef(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // Context menu functionality
  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  // Calculate current post position in deck
  const currentPostIndex = deck.findIndex(item => 
    currentPost?.id && (item.id === currentPost.id || item.post.id === currentPost.id)
  );
  
  // Calculate deck analytics
  const deckStats = useMemo(() => {
    const fbPosts = deck.filter(item => item.post?.platform === 'facebook').length;
    const igPosts = deck.filter(item => item.post?.platform === 'instagram').length;
    const reelsPosts = deck.filter(item => item.post?.isReel).length;
    const postsWithMedia = deck.filter(item => 
      item.post?.media?.length > 0 || item.post?.videoSrc
    ).length;
    const emptyPosts = deck.filter(item => {
      const post = item.post;
      return (!post?.media?.length && !post?.videoSrc && 
              (!post?.caption || post.caption.trim() === "" || post.caption === "Write your post copy here..."));
    }).length;
    
    return { fbPosts, igPosts, reelsPosts, postsWithMedia, emptyPosts };
  }, [deck]);

  // Filter deck items based on search term
  const filteredDeck = useMemo(() => {
    if (!searchTerm.trim()) return deck;
    
    return deck.filter(item => {
      const post = item.post;
      const searchLower = searchTerm.toLowerCase();
      
      return (
        post?.caption?.toLowerCase().includes(searchLower) ||
        post?.brand?.name?.toLowerCase().includes(searchLower) ||
        post?.platform?.toLowerCase().includes(searchLower)
      );
    });
  }, [deck, searchTerm]);

  // Auto-scroll to the active post when loaded from decks page
  useEffect(() => {
    if (scrollRef.current && currentPostIndex >= 0 && deck.length > 0) {
      const scrollContainer = scrollRef.current;
      const activeCard = scrollContainer.children[currentPostIndex];
      
      if (activeCard) {
        setTimeout(() => {
          activeCard.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }, 100);
      }
    }
  }, [currentPostIndex, deck.length]);

  // Auto-scroll to end when new items are added (only if no active post)
  useEffect(() => {
    if (scrollRef.current && deck.length > 0 && currentPostIndex === -1) {
      const scrollContainer = scrollRef.current;
      // Smooth scroll to the rightmost item when deck changes
      setTimeout(() => {
        scrollContainer.scrollTo({
          left: scrollContainer.scrollWidth,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [deck.length, currentPostIndex]);

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

  const handleStartNewDeck = () => {
    if (hasUnsavedChanges) {
      setShowNewDeckModal(true);
    } else {
      onStartNewDeck?.();
    }
  };

  const confirmStartNewDeck = () => {
    setShowNewDeckModal(false);
    onStartNewDeck?.();
  };

  const handleSaveClick = async () => {
    if (deck.length === 0) {
      alert("Add some posts to your deck before saving.");
      return;
    }
    
    // If editing existing deck, save directly without modal
    if (isEditingExistingDeck && currentDeckTitle) {
      setIsSaving(true);
      try {
        await onSaveDeck(currentDeckTitle);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } catch (error) {
        console.error("Failed to save deck:", error);
        alert("Failed to save deck. Please try again.");
      } finally {
        setIsSaving(false);
      }
    } else {
      // For new decks, show the modal
      setShowSaveModal(true);
    }
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
            {isEditingExistingDeck ? (
              <>
                Editing: <span className="text-blue-600">{currentDeckTitle}</span>
              </>
            ) : 'Deck Preview'}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {deck.length} post{deck.length === 1 ? '' : 's'}
          </span>
          
          {/* Current Post Indicator */}
          {currentPostIndex >= 0 && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
              Post {currentPostIndex + 1} of {deck.length}
            </span>
          )}
          
          
          {/* Deck Analytics */}
          {deck.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              {deckStats.fbPosts > 0 && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  FB: {deckStats.fbPosts}
                </span>
              )}
              {deckStats.igPosts > 0 && (
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                  IG: {deckStats.igPosts}
                </span>
              )}
              {deckStats.reelsPosts > 0 && (
                <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full">
                  Reels: {deckStats.reelsPosts}
                </span>
              )}
              {deckStats.emptyPosts > 0 && (
                <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                  Empty: {deckStats.emptyPosts}
                </span>
              )}
            </div>
          )}

          {lastSaved && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Saved {new Date(lastSaved).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          {deck.length > 3 && (
            <div className="flex items-center">
              {showSearch ? (
                <div className="flex items-center bg-gray-50 rounded-lg px-2 py-1">
                  <Search className="w-3 h-3 text-gray-400 mr-1" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={() => !searchTerm && setShowSearch(false)}
                    autoFocus
                    className="bg-transparent text-xs outline-none w-24"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-gray-400 hover:text-gray-600 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                  title="Search posts"
                >
                  <Search className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          
          {/* New Deck Button - only show when editing existing deck */}
          {isEditingExistingDeck && onStartNewDeck && (
            <button
              onClick={handleStartNewDeck}
              className="flex items-center gap-1 px-3 py-1 bg-slate-500 text-white rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors"
              title="Start creating a new deck"
            >
              <FileText className="w-3 h-3" />
              New Deck
            </button>
          )}
          {onPreviewDeck && (
            <button
              onClick={() => {
                if (deckStats.emptyPosts > 0) {
                  const confirmed = window.confirm(
                    `You have ${deckStats.emptyPosts} post${deckStats.emptyPosts === 1 ? '' : 's'} with missing content. Continue with preview anyway?`
                  );
                  if (!confirmed) return;
                }
                onPreviewDeck();
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                deckStats.emptyPosts > 0 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              Preview
              {deckStats.emptyPosts > 0 && (
                <span className="ml-1 bg-white/20 px-1 py-0.5 rounded-full text-[10px]">
                  !
                </span>
              )}
            </button>
          )}
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3" />
            {isSaving ? 'Saving...' : (isEditingExistingDeck ? 'Update Deck' : 'Save Deck')}
          </button>
          <button
            onClick={onAddToDeck}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Current
          </button>
          
          {/* Duplicate Current Post Button */}
          {currentPost && (
            <button
              onClick={() => {
                // Create a duplicate of the current post
                onAddToDeck({ 
                  ...currentPost, 
                  id: null, // Reset ID so it creates a new item
                  caption: currentPost.caption + " (Copy)"
                });
              }}
              className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-lg text-xs font-medium hover:bg-gray-600 transition-colors"
              title="Duplicate current post"
            >
              <Copy className="w-3 h-3" />
              Duplicate
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Deck Strip */}
      <div className="relative">
        {/* Left Scroll Button */}
        {filteredDeck.length > 4 && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm shadow-lg rounded-r-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Right Scroll Button */}
        {filteredDeck.length > 4 && (
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
          {filteredDeck.map((item, index) => (
            <DeckItem
              key={item.id}
              item={item}
              index={index}
              onLoad={() => onLoadFromDeck(item.id)}
              onDelete={() => onDeleteFromDeck(item.id)}
              onDuplicate={() => onDuplicateToDeck(item.id)}
              onContextMenu={(e) => {
                const menuItems = [
                  {
                    key: 'load',
                    label: 'Edit Post',
                    icon: <Edit3 className="w-4 h-4" />,
                    onClick: () => onLoadFromDeck(item.id)
                  },
                  {
                    key: 'duplicate',
                    label: 'Duplicate Post',
                    icon: <Copy className="w-4 h-4" />,
                    onClick: () => onDuplicateToDeck(item.id)
                  },
                  {
                    type: 'separator'
                  },
                  {
                    key: 'delete',
                    label: 'Delete Post',
                    icon: <Trash2 className="w-4 h-4" />,
                    onClick: () => {
                      if (window.confirm('Are you sure you want to delete this post from the deck?')) {
                        onDeleteFromDeck(item.id);
                      }
                    },
                    danger: true
                  }
                ];
                showContextMenu(e, menuItems);
              }}
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
            onClick={onAddNewPost || onAddToDeck}
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

      {/* New Deck Modal */}
      {showNewDeckModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Start New Deck?</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                You have unsaved changes to the current post. Starting a new deck will clear your current work.
              </p>
              <p className="text-sm text-orange-600 mt-2 font-medium">
                💡 Save your changes first if you want to keep them!
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewDeckModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartNewDeck}
                className="flex-1 px-4 py-2 bg-slate-500 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
              >
                Start New Deck
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Context Menu */}
      <ContextMenuComponent />
    </div>
  );
});

const DeckItem = memo(function DeckItem({ 
  item, 
  index, 
  onLoad, 
  onDelete, 
  onDuplicate,
  onContextMenu,
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
  
  // Check if post has unsaved changes (basic heuristic: recently updated but not saved)
  const hasUnsavedChanges = item.updatedAt && (!item.savedAt || item.updatedAt > item.savedAt);
  
  // Check if post is missing essential content
  const missingContent = !hasMedia && (!post?.caption || post.caption.trim() === "" || post.caption === "Write your post copy here...");;

  return (
    <div
      draggable
      className={cx(
        "relative flex-shrink-0 w-32 group/item transition-all",
        "cursor-move", // Change cursor to indicate draggable
        isActive && "ring-2 ring-blue-500 rounded-lg shadow-lg", // Enhanced active state
        isDragged && "opacity-50 scale-95", // Visual feedback when being dragged
        isDragOver && "ring-2 ring-green-400 ring-offset-2", // Visual feedback when drag target
        hasUnsavedChanges && !isActive && "ring-1 ring-orange-300", // Subtle indicator for unsaved changes
        missingContent && "ring-1 ring-red-300" // Warning for missing content
      )}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onLoad}
      onContextMenu={onContextMenu}
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
            post?.platform === "facebook" ? "bg-blue-500" : "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400"
          )}>
            {post?.platform === "facebook" ? (
              "f"
            ) : (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="white" className="w-2 h-2">
                <path d="M12,2.163c3.204,0,3.584,0.012,4.85,0.07c3.252,0.148,4.771,1.691,4.919,4.919c0.058,1.265,0.069,1.645,0.069,4.849c0,3.205-0.012,3.584-0.069,4.849c-0.149,3.225-1.664,4.771-4.919,4.919c-1.266,0.058-1.644,0.07-4.85,0.07c-3.204,0-3.584-0.012-4.849-0.07c-3.26-0.149-4.771-1.699-4.919-4.92c-0.058-1.265-0.07-1.644-0.07-4.849c0-3.204,0.013-3.583,0.07-4.849c0.149-3.227,1.664-4.771,4.919-4.919c1.266-0.057,1.645-0.069,4.849-0.069zm0-2.163c-3.259,0-3.667,0.014-4.947,0.072c-4.358,0.2-6.78,2.618-6.98,6.98c-0.059,1.281-0.073,1.689-0.073,4.948c0,3.259,0.014,3.668,0.072,4.948c0.2,4.358,2.618,6.78,6.98,6.98c1.281,0.058,1.689,0.072,4.948,0.072c3.259,0,3.668-0.014,4.948-0.072c4.354-0.2,6.782-2.618,6.979-6.98c0.059-1.28,0.073-1.689,0.073-4.948c0-3.259-0.014-3.667-0.072-4.947c-0.196-4.354-2.617-6.78-6.979-6.98c-1.281-0.059-1.69-0.073-4.949-0.073zm0,5.838c-3.403,0-6.162,2.759-6.162,6.162c0,3.403,2.759,6.163,6.162,6.163s6.162-2.759,6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0,10.162c-2.209,0-4-1.79-4-4c0-2.209,1.791-4,4-4s4,1.791,4,4c0,2.21-1.791,4-4,4zm6.406-11.845c-0.796,0-1.441,0.645-1.441,1.44s0.645,1.44,1.441,1.44c0.795,0,1.439-0.645,1.439-1.44s-0.644-1.44-1.439-1.44z"/>
              </svg>
            )}
          </div>
        </div>

        {/* Version Badge */}
        {post?.version && post.version > 1 && (
          <div className="absolute bottom-1 right-1">
            <div className="bg-green-500 text-white text-[10px] font-medium rounded px-1.5 py-0.5 shadow-sm">
              v{post.version}
            </div>
          </div>
        )}

        {/* Updated Badge */}
        {post?.updatedAt && (
          <div className="absolute bottom-1 left-1">
            <div className="bg-orange-500 text-white text-[10px] font-medium rounded px-1.5 py-0.5 shadow-sm">
              ↻
            </div>
          </div>
        )}

        {/* Status Indicators */}
        {hasUnsavedChanges && (
          <div className="absolute top-7 right-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Unsaved changes" />
          </div>
        )}
        
        {missingContent && (
          <div className="absolute top-7 left-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Missing content" />
          </div>
        )}

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