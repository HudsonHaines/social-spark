// src/components/comments/CommentEditor.jsx
import React, { useState, useRef, useCallback } from 'react';
import { 
  Send, 
  X, 
  Paperclip, 
  AtSign, 
  Bold, 
  Italic, 
  AlertCircle,
  CheckCircle,
  MessageCircle,
  HelpCircle,
  Heart
} from 'lucide-react';
import { createComment } from '../../data/comments';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../Toast';

const cx = (...a) => a.filter(Boolean).join(" ");

const COMMENT_TYPES = [
  { id: 'general', label: 'General', icon: MessageCircle, color: 'gray' },
  { id: 'approval', label: 'Approval', icon: CheckCircle, color: 'green' },
  { id: 'revision_request', label: 'Needs Revision', icon: AlertCircle, color: 'orange' },
  { id: 'question', label: 'Question', icon: HelpCircle, color: 'blue' },
  { id: 'compliment', label: 'Compliment', icon: Heart, color: 'pink' }
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'gray' },
  { id: 'normal', label: 'Normal', color: 'blue' },
  { id: 'high', label: 'High', color: 'orange' },
  { id: 'urgent', label: 'Urgent', color: 'red' }
];

const CommentEditor = ({ 
  deckId, 
  postId = null, 
  parentId = null,
  onSubmit, 
  onCancel,
  placeholder = "Write your comment...",
  initialContent = "",
  isReply = false,
  guestIdentity = null
}) => {
  const authContext = useAuth();
  const user = authContext?.user || null;
  const { toast } = useToast();
  const textareaRef = useRef(null);
  
  const [content, setContent] = useState(initialContent);
  const [commentType, setCommentType] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [mentions, setMentions] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-resize textarea
  const handleContentChange = useCallback((e) => {
    setContent(e.target.value);
    
    // Auto-resize
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await createComment({
        postId,
        deckId,
        parentId,
        content: content.trim(),
        commentType,
        priority,
        attachments,
        mentions,
        guestIdentity
      });

      onSubmit?.();
      setContent('');
      setCommentType('general');
      setPriority('normal');
      setAttachments([]);
      setMentions([]);
    } catch (error) {
      console.error('Failed to create comment:', error);
      toast.error('Failed to create comment');
    } finally {
      setSubmitting(false);
    }
  }, [content, postId, deckId, parentId, commentType, priority, attachments, mentions, onSubmit, submitting, toast]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onCancel?.();
    }
  }, [handleSubmit, onCancel]);

  const getCommentTypeConfig = (type) => {
    return COMMENT_TYPES.find(t => t.id === type) || COMMENT_TYPES[0];
  };

  const getPriorityConfig = (prio) => {
    return PRIORITIES.find(p => p.id === prio) || PRIORITIES[1];
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Main Editor */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={isReply ? 2 : 3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={submitting}
          />
          
          {/* Character count */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {content.length}/1000
          </div>
        </div>

        {/* Advanced Options */}
        {!isReply && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showAdvanced ? 'Hide' : 'Show'} options
            </button>
          </div>
        )}

        {showAdvanced && !isReply && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border">
            {/* Comment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={commentType}
                onChange={(e) => setCommentType(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
              >
                {COMMENT_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
              >
                {PRIORITIES.map(prio => (
                  <option key={prio.id} value={prio.id}>
                    {prio.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Comment Type Indicator */}
            {!isReply && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                {React.createElement(getCommentTypeConfig(commentType).icon, { 
                  className: `w-4 h-4 text-${getCommentTypeConfig(commentType).color}-500` 
                })}
                <span>{getCommentTypeConfig(commentType).label}</span>
                {priority !== 'normal' && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className={`text-${getPriorityConfig(priority).color}-600 font-medium`}>
                      {getPriorityConfig(priority).label}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className={cx(
                "inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded transition-colors",
                content.trim() && !submitting
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isReply ? 'Reply' : 'Comment'}
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-gray-500 text-right">
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘ Enter</kbd> to submit • <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to cancel
        </div>
      </form>
    </div>
  );
};

export default CommentEditor;