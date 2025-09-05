// src/components/comments/CommentSystem.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  X,
  Users,
  User
} from 'lucide-react';
import { getComments, getCommentStats, subscribeToComments } from '../../data/comments';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabaseClient';
import CommentThread from './CommentThread';
import CommentEditor from './CommentEditor';
import CommentFilters from './CommentFilters';
import GuestIdentityPrompt from './GuestIdentityPrompt';

const cx = (...a) => a.filter(Boolean).join(" ");

const CommentSystem = ({ 
  deckId, 
  postId = null, 
  isOpen, 
  onClose,
  position = 'right', // 'right', 'bottom', 'modal', 'inline'
  isClientView = false // Filter to only show client comments
}) => {
  const authContext = useAuth();
  const user = authContext?.user || null;
  const { toast } = useToast();
  
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false);
  const [guestIdentity, setGuestIdentity] = useState(null);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    authorType: 'all',
    commentType: 'all'
  });

  // Load comments and stats
  const loadData = useCallback(async () => {
    if (!deckId) return;
    
    try {
      setLoading(true);
      const [commentsData, statsData] = await Promise.all([
        getComments({ deckId, postId, includeResolved: filters.status === 'all', clientViewOnly: isClientView }),
        getCommentStats(deckId, isClientView)
      ]);
      
      
      setComments(commentsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [deckId, postId, filters.status, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time subscription
  useEffect(() => {
    if (!deckId) return;

    const unsubscribe = subscribeToComments(deckId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setComments(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setComments(prev => prev.map(comment => 
          comment.id === payload.new.id ? payload.new : comment
        ));
      } else if (payload.eventType === 'DELETE') {
        setComments(prev => prev.filter(comment => comment.id !== payload.old.id));
      }
      
      // Reload stats when comments change
      loadStats();
    });

    return unsubscribe;
  }, [deckId]);

  const loadStats = useCallback(async () => {
    if (!deckId) return;
    try {
      const statsData = await getCommentStats(deckId, isClientView);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [deckId, isClientView]);

  // Filter comments based on current filters
  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      if (filters.status !== 'all' && comment.status !== filters.status) {
        return false;
      }
      if (filters.authorType !== 'all' && comment.author_type !== filters.authorType) {
        return false;
      }
      if (filters.commentType !== 'all' && comment.comment_type !== filters.commentType) {
        return false;
      }
      return true;
    });
  }, [comments, filters]);

  const handleAddCommentClick = useCallback(() => {
    // Check if user is authenticated or has guest identity
    if (user || guestIdentity) {
      setShowEditor(true);
    } else {
      setShowIdentityPrompt(true);
    }
  }, [user, guestIdentity]);

  const handleGuestIdentity = useCallback((identity) => {
    setGuestIdentity(identity);
    setShowIdentityPrompt(false);
    setShowEditor(true);
  }, []);

  const handleLoginRequest = useCallback(async () => {
    // Use Supabase OAuth with the current share link as redirect
    setShowIdentityPrompt(false);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.href, // Return to current share link page
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      
      if (error) {
        console.error('OAuth error:', error);
        toast.error('Failed to initiate login. Please try again.');
        setShowIdentityPrompt(true); // Show prompt again if login fails
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Failed to initiate login. Please try again.');
      setShowIdentityPrompt(true);
    }
  }, [toast]);

  const handleCommentCreated = useCallback(() => {
    setShowEditor(false);
    loadData();
    toast.success('Comment added successfully');
  }, [loadData, toast]);

  const handleCommentUpdated = useCallback(() => {
    loadData();
    toast.success('Comment updated successfully');
  }, [loadData, toast]);

  if (!isOpen) return null;

  const containerClass = cx(
    "bg-white border border-gray-200 shadow-lg rounded-lg flex flex-col",
    position === 'right' && "fixed right-4 top-20 bottom-4 w-96 z-50",
    position === 'bottom' && "fixed bottom-4 left-4 right-4 h-96 z-50",
    position === 'modal' && "fixed inset-4 z-50",
    position === 'inline' && "h-[calc(100vh-12rem)] min-h-96"
  );

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">
              {postId ? 'Post Comments' : 'Deck Discussion'}
            </h3>
            {stats && (
              <p className="text-sm text-gray-600">
                {stats.total} comment{stats.total !== 1 ? 's' : ''} • {stats.open} unresolved
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Add Comment Button */}
          <button
            onClick={handleAddCommentClick}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Add comment"
          >
            <Plus className="w-4 h-4" />
          </button>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs">
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-3 h-3" />
            <span>{stats.resolved} resolved</span>
          </div>
          <div className="flex items-center gap-1 text-orange-600">
            <Clock className="w-3 h-3" />
            <span>{stats.open} open</span>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <Users className="w-3 h-3" />
            <span>{stats.byAuthor.internal} internal</span>
          </div>
          <div className="flex items-center gap-1 text-purple-600">
            <User className="w-3 h-3" />
            <span>{stats.byAuthor.client} client</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <CommentFilters
        filters={filters}
        onFiltersChange={setFilters}
        stats={stats}
        isCollapsed={!showFilters}
        onToggle={() => setShowFilters(!showFilters)}
      />

      {/* Comment Editor */}
      {showEditor && (
        <div className="border-b border-gray-200">
          <CommentEditor
            deckId={deckId}
            postId={postId}
            onSubmit={handleCommentCreated}
            onCancel={() => setShowEditor(false)}
            placeholder="Add your feedback or comment..."
            guestIdentity={guestIdentity}
          />
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredComments.length === 0 && !showEditor ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h4>
            <p className="text-gray-600 mb-4">
              {postId 
                ? "Be the first to comment on this post" 
                : "Start the conversation about this deck"
              }
            </p>
            <button
              onClick={handleAddCommentClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Comment
            </button>
          </div>
        ) : filteredComments.length === 0 && showEditor ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Write the first comment below
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                deckId={deckId}
                onUpdate={handleCommentUpdated}
              />
            ))}
          </div>
        )}
      </div>

      {/* Guest Identity Prompt */}
      {showIdentityPrompt && (
        <GuestIdentityPrompt
          onGuestIdentity={handleGuestIdentity}
          onLoginRequest={handleLoginRequest}
          onCancel={() => setShowIdentityPrompt(false)}
        />
      )}
    </div>
  );
};

export default CommentSystem;