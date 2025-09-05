// src/components/comments/CommentFilters.jsx
import React from 'react';
import { 
  Filter,
  CheckCircle,
  Clock,
  Archive,
  MessageCircle,
  AlertCircle,
  HelpCircle,
  Heart,
  Users,
  User,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const cx = (...a) => a.filter(Boolean).join(" ");

const FILTER_OPTIONS = {
  status: [
    { id: 'all', label: 'All Comments', icon: MessageCircle, color: 'gray' },
    { id: 'open', label: 'Open', icon: Clock, color: 'orange' },
    { id: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'green' },
    { id: 'archived', label: 'Archived', icon: Archive, color: 'red' }
  ],
  authorType: [
    { id: 'all', label: 'All Authors', icon: Users, color: 'gray' },
    { id: 'internal', label: 'Team', icon: Users, color: 'blue' },
    { id: 'client', label: 'Clients', icon: User, color: 'purple' }
  ],
  commentType: [
    { id: 'all', label: 'All Types', icon: MessageCircle, color: 'gray' },
    { id: 'general', label: 'General', icon: MessageCircle, color: 'gray' },
    { id: 'approval', label: 'Approval', icon: CheckCircle, color: 'green' },
    { id: 'revision_request', label: 'Revision', icon: AlertCircle, color: 'orange' },
    { id: 'question', label: 'Questions', icon: HelpCircle, color: 'blue' },
    { id: 'compliment', label: 'Compliments', icon: Heart, color: 'pink' }
  ]
};

const CommentFilters = ({ filters, onFiltersChange, stats, isCollapsed = true, onToggle }) => {
  const hasActiveFilters = Object.values(filters).some(filter => filter !== 'all');

  const handleFilterChange = (filterType, value) => {
    onFiltersChange({
      ...filters,
      [filterType]: value
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: 'all',
      authorType: 'all',
      commentType: 'all'
    });
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      {/* Header - Always visible */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          
          {/* Active filter count */}
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
              {Object.values(filters).filter(filter => filter !== 'all').length}
            </span>
          )}
          
          <div className="ml-auto flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-white rounded transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
            
            {/* Toggle button */}
            <button
              onClick={onToggle}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-white rounded transition-colors"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Hide
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters - Collapsible */}
      {!isCollapsed && (
        <div className="px-3 pb-3 border-t border-gray-200">
          <div className="space-y-3">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <div className="flex gap-1 overflow-x-auto">
                {FILTER_OPTIONS.status.map(option => {
                  const Icon = option.icon;
                  const isActive = filters.status === option.id;
                  const count = option.id === 'all' 
                    ? stats?.total 
                    : option.id === 'open' 
                      ? stats?.open
                      : option.id === 'resolved'
                        ? stats?.resolved
                        : 0;

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleFilterChange('status', option.id)}
                      className={cx(
                        "flex items-center gap-1 px-2 py-1 text-xs rounded whitespace-nowrap transition-colors",
                        isActive
                          ? `bg-${option.color}-100 text-${option.color}-700 border border-${option.color}-200`
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{option.label}</span>
                      {typeof count === 'number' && (
                        <span className={cx(
                          "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                          isActive
                            ? "bg-white/75"
                            : "bg-gray-100"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Author Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Author</label>
              <div className="flex gap-1 overflow-x-auto">
                {FILTER_OPTIONS.authorType.map(option => {
                  const Icon = option.icon;
                  const isActive = filters.authorType === option.id;
                  const count = option.id === 'all'
                    ? stats?.total
                    : option.id === 'internal'
                      ? stats?.byAuthor?.internal
                      : stats?.byAuthor?.client;

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleFilterChange('authorType', option.id)}
                      className={cx(
                        "flex items-center gap-1 px-2 py-1 text-xs rounded whitespace-nowrap transition-colors",
                        isActive
                          ? `bg-${option.color}-100 text-${option.color}-700 border border-${option.color}-200`
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{option.label}</span>
                      {typeof count === 'number' && (
                        <span className={cx(
                          "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                          isActive
                            ? "bg-white/75"
                            : "bg-gray-100"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <div className="flex gap-1 overflow-x-auto">
                {FILTER_OPTIONS.commentType.map(option => {
                  const Icon = option.icon;
                  const isActive = filters.commentType === option.id;
                  const count = option.id === 'all'
                    ? stats?.total
                    : stats?.byType?.[option.id];

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleFilterChange('commentType', option.id)}
                      className={cx(
                        "flex items-center gap-1 px-2 py-1 text-xs rounded whitespace-nowrap transition-colors",
                        isActive
                          ? `bg-${option.color}-100 text-${option.color}-700 border border-${option.color}-200`
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{option.label}</span>
                      {typeof count === 'number' && count > 0 && (
                        <span className={cx(
                          "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                          isActive
                            ? "bg-white/75"
                            : "bg-gray-100"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Filter Summary */}
            {hasActiveFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>Active filters:</span>
                  <div className="flex items-center gap-1">
                    {Object.entries(filters).map(([key, value]) => {
                      if (value === 'all') return null;
                      
                      const option = FILTER_OPTIONS[key]?.find(opt => opt.id === value);
                      if (!option) return null;

                      return (
                        <span
                          key={key}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                        >
                          {option.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentFilters;