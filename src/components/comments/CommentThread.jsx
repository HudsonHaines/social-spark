// src/components/comments/CommentThread.jsx
import React, { useState, useCallback } from 'react';
import { 
  MessageCircle, 
  MoreVertical, 
  Reply, 
  Check, 
  X, 
  Edit3, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Heart,
  HelpCircle,
  User,
  Users
} from 'lucide-react';
import { updateCommentStatus, updateComment, deleteComment, addCommentReaction } from '../../data/comments';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../Toast';
import CommentEditor from './CommentEditor';
import CommentItem from './CommentItem';

const cx = (...a) => a.filter(Boolean).join(" ");

const COMMENT_TYPE_CONFIG = {
  general: { icon: MessageCircle, label: 'General', color: 'gray' },
  approval: { icon: CheckCircle, label: 'Approval', color: 'green' },
  revision_request: { icon: AlertCircle, label: 'Needs Revision', color: 'orange' },
  question: { icon: HelpCircle, label: 'Question', color: 'blue' },
  compliment: { icon: Heart, label: 'Compliment', color: 'pink' }
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'gray' },
  normal: { label: 'Normal', color: 'blue' },
  high: { label: 'High', color: 'orange' },
  urgent: { label: 'Urgent', color: 'red' }
};

const CommentThread = ({ comment, deckId, onUpdate }) => {
  const authContext = useAuth();
  const user = authContext?.user || null;
  const { toast } = useToast();
  
  const [showReplies, setShowReplies] = useState(true);
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [showEditEditor, setShowEditEditor] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isAuthor = user?.id === comment.author_id;
  const canResolve = comment.status !== 'resolved'; // Can be enhanced with permission check
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleResolve = useCallback(async () => {
    setUpdating(true);
    try {
      await updateCommentStatus(comment.id, 'resolved', user?.id);
      onUpdate?.();
      toast.success('Comment resolved');
    } catch (error) {
      console.error('Failed to resolve comment:', error);
      toast.error('Failed to resolve comment');
    } finally {
      setUpdating(false);
    }
  }, [comment.id, user?.id, onUpdate, toast]);

  const handleReopen = useCallback(async () => {
    setUpdating(true);
    try {
      await updateCommentStatus(comment.id, 'open');
      onUpdate?.();
      toast.success('Comment reopened');
    } catch (error) {
      console.error('Failed to reopen comment:', error);
      toast.error('Failed to reopen comment');
    } finally {
      setUpdating(false);
    }
  }, [comment.id, onUpdate, toast]);

  const handleEdit = useCallback(async (content, priority, commentType) => {
    setUpdating(true);
    try {
      await updateComment(comment.id, { content, priority, commentType });
      setShowEditEditor(false);
      onUpdate?.();
      toast.success('Comment updated');
    } catch (error) {
      console.error('Failed to update comment:', error);
      toast.error('Failed to update comment');
    } finally {
      setUpdating(false);
    }
  }, [comment.id, onUpdate, toast]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    setUpdating(true);
    try {
      await deleteComment(comment.id);
      onUpdate?.();
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
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

  const handleReplySubmit = useCallback(() => {
    setShowReplyEditor(false);
    onUpdate?.();
    toast.success('Reply added');
  }, [onUpdate, toast]);

  const typeConfig = COMMENT_TYPE_CONFIG[comment.comment_type] || COMMENT_TYPE_CONFIG.general;
  const priorityConfig = PRIORITY_CONFIG[comment.priority] || PRIORITY_CONFIG.normal;
  const TypeIcon = typeConfig.icon;

  return (
    <div className={cx(
      "relative",
      comment.status === 'resolved' && "opacity-75"
    )}>
      {/* Main Comment */}
      <div className="flex gap-3 p-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.author?.avatar_url ? (
            <img
              src={comment.author.avatar_url}
              alt={comment.author.display_name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              {comment.author_type === 'internal' ? (
                <Users className="w-4 h-4 text-gray-600" />
              ) : (
                <User className="w-4 h-4 text-gray-600" />
              )}
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
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
                "px-2 py-0.5 text-xs rounded-full",
                comment.author_type === 'internal'
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
              )}>
                {comment.author_type === 'internal' ? 'Team' : 'Client'}
              </span>

              {/* Comment Type & Priority */}
              <div className="flex items-center gap-1">
                <TypeIcon className={`w-3 h-3 text-${typeConfig.color}-500`} />
                <span className={`text-${typeConfig.color}-600`}>{typeConfig.label}</span>
                {comment.priority !== 'normal' && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className={`text-${priorityConfig.color}-600 font-medium`}>
                      {priorityConfig.label}
                    </span>
                  </>
                )}
              </div>

              <span className="text-gray-500">
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  {canResolve && (
                    <button
                      onClick={handleResolve}
                      disabled={updating}
                      className="w-full px-3 py-1 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Check className="w-3 h-3" />
                      Resolve
                    </button>
                  )}
                  
                  {comment.status === 'resolved' && (
                    <button
                      onClick={handleReopen}
                      disabled={updating}
                      className="w-full px-3 py-1 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <X className="w-3 h-3" />
                      Reopen
                    </button>
                  )}
                  
                  {isAuthor && (
                    <>
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comment Body */}
          {showEditEditor ? (
            <div className="mb-3">
              <CommentEditor
                deckId={deckId}
                postId={comment.post_id}
                initialContent={comment.content}
                onSubmit={handleEdit}
                onCancel={() => setShowEditEditor(false)}
                placeholder="Edit your comment..."
                isReply={false}
              />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none mb-3">
              <p className="text-gray-900 whitespace-pre-wrap">{comment.content}</p>
            </div>
          )}

          {/* Status Indicator */}
          {comment.status === 'resolved' && (
            <div className="flex items-center gap-1 text-sm text-green-600 mb-3">
              <CheckCircle className="w-4 h-4" />
              <span>Resolved</span>
              {comment.resolved_by_user && (
                <span className="text-gray-500">
                  by {comment.resolved_by_user.display_name}
                </span>
              )}
              {comment.resolved_at && (
                <span className="text-gray-500">
                  on {new Date(comment.resolved_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setShowReplyEditor(!showReplyEditor)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>

            {/* Quick Reactions */}
            <div className="flex items-center gap-1">
              {['👍', '👎', '❤️', '😊'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="p-1 text-sm hover:bg-gray-100 rounded"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {hasReplies && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
              >
                <MessageCircle className="w-4 h-4" />
                {showReplies ? 'Hide' : 'Show'} {comment.replies.length} replies
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply Editor */}
      {showReplyEditor && (
        <div className="ml-11 border-l-2 border-gray-100 pl-4 pb-4">
          <CommentEditor
            deckId={deckId}
            postId={comment.post_id}
            parentId={comment.id}
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyEditor(false)}
            placeholder="Write a reply..."
            isReply={true}
          />
        </div>
      )}

      {/* Replies */}
      {hasReplies && showReplies && (
        <div className="ml-11 border-l-2 border-gray-100 pl-4">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              deckId={deckId}
              onUpdate={onUpdate}
              isReply={true}
            />
          ))}
        </div>
      )}

      {updating && (
        <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default CommentThread;