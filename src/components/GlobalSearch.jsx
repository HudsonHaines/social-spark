// src/components/GlobalSearch.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  Image as ImageIcon, 
  Film, 
  Images, 
  Facebook, 
  Instagram, 
  Package, 
  User, 
  ArrowRight,
  Clock,
  Hash
} from 'lucide-react';
import { listDecks, listDeckItems } from '../data/decks';
import { ensurePostShape } from '../data/postShape';
import { supabase } from '../lib/supabaseClient';

const cx = (...a) => a.filter(Boolean).join(" ");

// Search result types
const RESULT_TYPES = {
  DECK: 'deck',
  POST: 'post',
  BRAND: 'brand',
  CONTENT: 'content'
};

const GlobalSearch = ({ 
  isOpen, 
  onClose, 
  onNavigateToDeck, 
  onLoadPostToEditor, 
  onNavigateToBrands,
  userId 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const selectedResult = results[selectedIndex];
        if (selectedResult) {
          handleSelectResult(selectedResult);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length > 1) {
        performSearch(query.trim());
      } else {
        setResults([]);
        setSelectedIndex(0);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, userId]);

  const performSearch = useCallback(async (searchQuery) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const searchResults = [];
      const searchLower = searchQuery.toLowerCase();

      // Search decks
      const decks = await listDecks(userId);
      for (const deck of decks) {
        if (deck.title?.toLowerCase().includes(searchLower)) {
          searchResults.push({
            type: RESULT_TYPES.DECK,
            id: deck.id,
            title: deck.title,
            subtitle: `Deck • ${deck.item_count || 0} posts`,
            icon: <Package className="w-4 h-4" />,
            data: deck,
            score: calculateScore(deck.title, searchQuery) + 10 // Boost deck matches
          });
        }
      }

      // Search posts within decks
      const allPosts = [];
      for (const deck of decks.slice(0, 20)) { // Limit to prevent too many API calls
        try {
          const items = await listDeckItems(deck.id);
          for (const item of items) {
            const post = ensurePostShape(item.post_json);
            allPosts.push({
              ...item,
              post,
              deckTitle: deck.title,
              deckId: deck.id
            });
          }
        } catch (error) {
          console.error(`Failed to load items for deck ${deck.id}:`, error);
        }
      }

      // Search post content
      for (const item of allPosts) {
        const post = item.post;
        let matchedFields = [];
        let score = 0;

        // Search caption
        if (post.caption?.toLowerCase().includes(searchLower)) {
          matchedFields.push('caption');
          score += calculateScore(post.caption, searchQuery);
        }

        // Search brand name
        if (post.brand?.name?.toLowerCase().includes(searchLower)) {
          matchedFields.push('brand');
          score += calculateScore(post.brand.name, searchQuery) + 5;
        }

        // Search platform
        if (post.platform?.toLowerCase().includes(searchLower)) {
          matchedFields.push('platform');
          score += calculateScore(post.platform, searchQuery);
        }

        // Search carousel content
        if (post.mediaMeta?.length > 0) {
          for (const meta of post.mediaMeta) {
            if (meta.headline?.toLowerCase().includes(searchLower)) {
              matchedFields.push('carousel headline');
              score += calculateScore(meta.headline, searchQuery);
            }
            if (meta.subhead?.toLowerCase().includes(searchLower)) {
              matchedFields.push('carousel text');
              score += calculateScore(meta.subhead, searchQuery);
            }
          }
        }

        // Search link preview content
        if (post.link?.headline?.toLowerCase().includes(searchLower)) {
          matchedFields.push('link headline');
          score += calculateScore(post.link.headline, searchQuery);
        }
        if (post.link?.subhead?.toLowerCase().includes(searchLower)) {
          matchedFields.push('link description');
          score += calculateScore(post.link.subhead, searchQuery);
        }

        if (matchedFields.length > 0) {
          searchResults.push({
            type: RESULT_TYPES.POST,
            id: item.id,
            title: getPostTitle(post),
            subtitle: `${item.deckTitle} • ${matchedFields.join(', ')}`,
            icon: getPostIcon(post),
            data: { ...item, matchedFields },
            score
          });
        }
      }

      // Search unique brands
      const uniqueBrands = new Map();
      for (const item of allPosts) {
        const brand = item.post.brand;
        if (brand?.name && !uniqueBrands.has(brand.name)) {
          if (brand.name.toLowerCase().includes(searchLower)) {
            uniqueBrands.set(brand.name, {
              type: RESULT_TYPES.BRAND,
              id: brand.id || brand.name,
              title: brand.name,
              subtitle: `Brand • ${brand.username ? `@${brand.username}` : 'No username'}`,
              icon: brand.profileSrc ? (
                <div className="w-4 h-4 rounded-full overflow-hidden">
                  <img src={brand.profileSrc} alt="" className="w-full h-full object-cover" />
                </div>
              ) : <User className="w-4 h-4" />,
              data: brand,
              score: calculateScore(brand.name, searchQuery) + 8
            });
          }
        }
      }
      searchResults.push(...uniqueBrands.values());

      // Sort by score (highest first)
      const sortedResults = searchResults.sort((a, b) => b.score - a.score);
      
      setResults(sortedResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const calculateScore = (text, query) => {
    if (!text || !query) return 0;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Exact match gets highest score
    if (lowerText === lowerQuery) return 100;
    
    // Starts with query gets high score
    if (lowerText.startsWith(lowerQuery)) return 80;
    
    // Contains query gets medium score
    if (lowerText.includes(lowerQuery)) return 60;
    
    // Word boundary match
    const words = lowerText.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(lowerQuery)) return 70;
      if (word === lowerQuery) return 90;
    }
    
    return 0;
  };

  const getPostTitle = (post) => {
    if (post.caption) {
      const truncated = post.caption.substring(0, 50);
      return truncated.length < post.caption.length ? `${truncated}...` : truncated;
    }
    if (post.brand?.name) return `${post.brand.name} Post`;
    return `${post.platform || 'Social'} Post`;
  };

  const getPostIcon = (post) => {
    if (post.type === "reel" || post.isReel) return <Film className="w-4 h-4" />;
    if (post.type === "carousel") return <Images className="w-4 h-4" />;
    if (post.type === "video") return <Film className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  const getPlatformIcon = (platform) => {
    if (platform === "instagram") return <Instagram className="w-4 h-4 text-pink-500" />;
    if (platform === "facebook") return <Facebook className="w-4 h-4 text-blue-500" />;
    return null;
  };

  const handleSelectResult = (result) => {
    switch (result.type) {
      case RESULT_TYPES.DECK:
        onNavigateToDeck?.(result.data);
        break;
      case RESULT_TYPES.POST:
        onLoadPostToEditor?.(result.data.post, result.data.deckId, result.data.id, result.data.deckTitle);
        break;
      case RESULT_TYPES.BRAND:
        onNavigateToBrands?.(result.data);
        break;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/50 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search decks, posts, brands, and content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-lg border-0 outline-none bg-transparent placeholder-gray-400"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>Searching...</span>
              </div>
            </div>
          )}

          {!loading && query.length > 1 && results.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or check your spelling</p>
            </div>
          )}

          {!loading && query.length <= 1 && (
            <div className="text-center py-8 text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Start typing to search...</p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>Decks</span>
                </div>
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>Posts</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Brands</span>
                </div>
              </div>
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}-${index}`}
              onClick={() => handleSelectResult(result)}
              className={cx(
                "w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left",
                index === selectedIndex && "bg-blue-50 border-r-2 border-blue-500"
              )}
            >
              <div className={cx(
                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                result.type === RESULT_TYPES.DECK && "bg-purple-100",
                result.type === RESULT_TYPES.POST && "bg-blue-100", 
                result.type === RESULT_TYPES.BRAND && "bg-green-100",
                result.type === RESULT_TYPES.CONTENT && "bg-orange-100"
              )}>
                {result.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">{result.title}</p>
                  {result.data?.platform && getPlatformIcon(result.data.platform)}
                </div>
                <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                
                {result.data?.matchedFields && result.data.matchedFields.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {result.data.matchedFields.slice(0, 3).map((field, i) => (
                      <span 
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600"
                      >
                        <Hash className="w-2 h-2 mr-1" />
                        {field}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="border-t border-gray-100 p-3 bg-gray-50/50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;