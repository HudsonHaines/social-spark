// src/components/comments/CommentItem.jsx
import React, { useState, useCallback } from 'react';
import { 
  MoreVertical, 
  Edit3, 
  Trash2,
  User,
  Users,
  Clock
} from 'lucide-react';
import { updateComment, deleteComment, addCommentReaction } from '../../data/comments';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../Toast';
import CommentEditor from './CommentEditor';

const cx = (...a) => a.filter(Boolean).join(" ");

const CommentItem = ({ comment, deckId, onUpdate, isReply = false }) => {
  const authContext = useAuth();
  const user = authContext?.user || null;
  const { toast } = useToast();
  
  const [showEditEditor, setShowEditEditor] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isAuthor = user?.id === comment.author_id;

  const handleEdit = useCallback(async (content) => {
    setUpdating(true);
    try {
      await updateComment(comment.id, { content });
      setShowEditEditor(false);
      onUpdate?.();
      toast.success('Reply updated');
    } catch (error) {
      console.error('Failed to update reply:', error);
      toast.error('Failed to update reply');
    } finally {
      setUpdating(false);
    }
  }, [comment.id, onUpdate, toast]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    
    setUpdating(true);
    try {
      await deleteComment(comment.id);
      onUpdate?.();
      toast.success('Reply deleted');
    } catch (error) {
      console.error('Failed to delete reply:', error);
      toast.error('Failed to delete reply');
    } finally {
      setUpdating(false);
    }
  }, [comment.id, onUpdate, toast]);

  const handleReaction = useCallback(async (emoji) => {
    try {
      await addCommentReaction(comment.id, emoji);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
    }
  }, [comment.id, onUpdate, toast]);

  return (
    <div className={cx(
      "relative flex gap-3 py-3",
      isReply && "border-t border-gray-100",
      comment.status === 'resolved' && "opacity-75"
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.author?.avatar_url ? (
          <img
            src={comment.author.avatar_url}
            alt={comment.author.display_name}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
            {comment.author_type === 'internal' ? (
              <Users className="w-3 h-3 text-gray-600" />
            ) : (
              <User className="w-3 h-3 text-gray-600" />
            )}
          </div>
        )}
      </div>

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-gray-900">
              {comment.author_id === user?.id 
                ? (user.email || 'You') 
                : comment.guest_name 
                  ? comment.guest_name
                  : `User ${comment.author_id?.slice(0, 8)}`
              }
            </span>
            
            {/* Author Type Badge */}
            <span className={cx(
              "px-1.5 py-0.5 text-xs rounded-full",
              comment.author_type === 'internal'
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            )}>
              {comment.author_type === 'internal' ? 'Team' : 'Client'}
            </span>

            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{new Date(comment.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Actions Menu */}
          {isAuthor && (
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreVertical className="w-3 h-3" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  <button
                    onClick={() => {
                      setShowEditEditor(true);
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-1 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-1 text-sm text-left hover:bg-gray-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comment Body */}
        {showEditEditor ? (
          <div className="mb-2">
            <CommentEditor
              deckId={deckId}
              postId={comment.post_id}
              parentId={comment.parent_id}
              initialContent={comment.content}
              onSubmit={handleEdit}
              onCancel={() => setShowEditEditor(false)}
              placeholder="Edit your reply..."
              isReply={true}
            />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none mb-2">
            <p className="text-gray-900 text-sm whitespace-pre-wrap">{comment.content}</p>
          </div>
        )}

        {/* Quick Reactions */}
        <div className="flex items-center gap-1">
          {['👍', '👎', '❤️', '😊'].map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="p-1 text-xs hover:bg-gray-100 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {updating && (
        <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default CommentItem;