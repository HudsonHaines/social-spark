// src/share/ShareLinksPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Link, 
  ExternalLink, 
  Calendar, 
  Eye, 
  Trash2, 
  Clock, 
  Copy, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Settings,
  Download,
  Search
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { 
  getUserDeckShares, 
  revokeDeckShare, 
  updateDeckShareExpiration,
  getDeckShareStats 
} from '../data/decks';

const ShareLinksPage = () => {
  const { user } = useAuth();
  const [shareLinks, setShareLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, expired, revoked
  const [sortBy, setSortBy] = useState('created_at'); // created_at, last_accessed_at, expires_at
  const [copiedToken, setCopiedToken] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLinks, setSelectedLinks] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Load share links
  const loadShareLinks = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const links = await getUserDeckShares(user.id);
      setShareLinks(links);
    } catch (err) {
      console.error('Failed to load share links:', err);
      setError(err.message || 'Failed to load share links');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadShareLinks();
  }, [loadShareLinks]);

  // Get link status
  const getLinkStatus = useCallback((link) => {
    if (link.is_revoked) return 'revoked';
    if (link.expires_at && new Date(link.expires_at) < new Date()) return 'expired';
    return 'active';
  }, []);

  // Filter and sort links
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = shareLinks;
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = shareLinks.filter(link => getLinkStatus(link) === filterStatus);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(link => 
        link.decks.title.toLowerCase().includes(query) ||
        link.token.toLowerCase().includes(query)
      );
    }
    
    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'created_at') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === 'last_accessed_at') {
        const aDate = a.last_accessed_at ? new Date(a.last_accessed_at) : new Date(0);
        const bDate = b.last_accessed_at ? new Date(b.last_accessed_at) : new Date(0);
        return bDate - aDate;
      }
      if (sortBy === 'expires_at') {
        const aDate = a.expires_at ? new Date(a.expires_at) : new Date('2099-01-01');
        const bDate = b.expires_at ? new Date(b.expires_at) : new Date('2099-01-01');
        return aDate - bDate;
      }
      return 0;
    });
  }, [shareLinks, filterStatus, sortBy, searchQuery, getLinkStatus]);

  // Copy link to clipboard
  const copyLinkToClipboard = useCallback(async (token) => {
    const url = `${window.location.origin}/s/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, []);

  // Revoke share link
  const handleRevoke = useCallback(async (token) => {
    if (!confirm('Are you sure you want to revoke this share link? This action cannot be undone.')) {
      return;
    }
    
    setUpdating(prev => new Set([...prev, token]));
    
    try {
      await revokeDeckShare(token);
      await loadShareLinks(); // Refresh the list
    } catch (err) {
      console.error('Failed to revoke share link:', err);
      alert('Failed to revoke share link: ' + err.message);
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(token);
        return newSet;
      });
    }
  }, [loadShareLinks]);

  // Update expiration
  const handleUpdateExpiration = useCallback(async (token, newExpirationDate) => {
    setUpdating(prev => new Set([...prev, token]));
    
    try {
      await updateDeckShareExpiration(token, newExpirationDate);
      await loadShareLinks(); // Refresh the list
    } catch (err) {
      console.error('Failed to update expiration:', err);
      alert('Failed to update expiration: ' + err.message);
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(token);
        return newSet;
      });
    }
  }, [loadShareLinks]);

  // Bulk operations
  const handleSelectAll = useCallback(() => {
    if (selectedLinks.size === filteredAndSortedLinks.length) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(filteredAndSortedLinks.map(link => link.token)));
    }
  }, [selectedLinks.size, filteredAndSortedLinks]);

  const handleSelectLink = useCallback((token) => {
    setSelectedLinks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(token)) {
        newSet.delete(token);
      } else {
        newSet.add(token);
      }
      return newSet;
    });
  }, []);

  const handleBulkRevoke = useCallback(async () => {
    if (selectedLinks.size === 0) return;
    if (!confirm(`Are you sure you want to revoke ${selectedLinks.size} share link(s)? This action cannot be undone.`)) {
      return;
    }

    setBulkUpdating(true);
    
    try {
      await Promise.all(Array.from(selectedLinks).map(token => revokeDeckShare(token)));
      await loadShareLinks();
      setSelectedLinks(new Set());
      alert(`Successfully revoked ${selectedLinks.size} share link(s).`);
    } catch (err) {
      console.error('Failed to bulk revoke:', err);
      alert('Failed to revoke some links: ' + err.message);
    } finally {
      setBulkUpdating(false);
    }
  }, [selectedLinks, loadShareLinks]);

  const handleBulkExpire = useCallback(async () => {
    if (selectedLinks.size === 0) return;
    const expirationDate = prompt('Enter expiration date (YYYY-MM-DD) or leave empty to remove expiration:');
    if (expirationDate === null) return; // User cancelled

    setBulkUpdating(true);
    
    try {
      await Promise.all(Array.from(selectedLinks).map(token => 
        updateDeckShareExpiration(token, expirationDate || null)
      ));
      await loadShareLinks();
      setSelectedLinks(new Set());
      alert(`Successfully updated expiration for ${selectedLinks.size} share link(s).`);
    } catch (err) {
      console.error('Failed to bulk update expiration:', err);
      alert('Failed to update some links: ' + err.message);
    } finally {
      setBulkUpdating(false);
    }
  }, [selectedLinks, loadShareLinks]);

  // Get links expiring soon (within 7 days)
  const expiringSoonLinks = useMemo(() => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    return shareLinks.filter(link => {
      if (!link.expires_at || link.is_revoked) return false;
      const expirationDate = new Date(link.expires_at);
      const now = new Date();
      return expirationDate > now && expirationDate <= sevenDaysFromNow;
    });
  }, [shareLinks]);

  // Format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Get status badge
  const getStatusBadge = useCallback((link) => {
    const status = getLinkStatus(link);
    const baseClasses = 'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full';
    
    switch (status) {
      case 'active':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-700`}>
            <CheckCircle size={12} />
            Active
          </span>
        );
      case 'expired':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>
            <Clock size={12} />
            Expired
          </span>
        );
      case 'revoked':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-700`}>
            <AlertCircle size={12} />
            Revoked
          </span>
        );
      default:
        return null;
    }
  }, [getLinkStatus]);

  if (loading) {
    return (
      <div className="container-tight py-8">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={24} />
          <p className="text-app-muted">Loading share links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-tight py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Share Link Management</h1>
        <p className="text-app-muted">
          Track and manage all shared deck links sent to clients
        </p>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div className="flex gap-4">
            {/* Filter */}
            <div>
              <label className="label-strong mb-1">Filter by Status</label>
              <select 
                className="select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Links</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="label-strong mb-1">Sort By</label>
              <select 
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created_at">Date Created</option>
                <option value="last_accessed_at">Last Accessed</option>
                <option value="expires_at">Expiration Date</option>
              </select>
            </div>
          </div>

          <button 
            onClick={loadShareLinks}
            className="btn-outline"
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by deck name or token..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <AlertCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedLinks.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                {selectedLinks.size} link(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkExpire}
                  disabled={bulkUpdating}
                  className="btn-outline text-sm"
                >
                  {bulkUpdating ? <RefreshCw size={14} className="animate-spin" /> : <Calendar size={14} />}
                  Set Expiration
                </button>
                <button
                  onClick={handleBulkRevoke}
                  disabled={bulkUpdating}
                  className="btn-outline text-sm text-red-600 hover:bg-red-50"
                >
                  {bulkUpdating ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Revoke Selected
                </button>
                <button
                  onClick={() => setSelectedLinks(new Set())}
                  className="btn-outline text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expiring Soon Warning */}
      {expiringSoonLinks.length > 0 && (
        <div className="card p-4 mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <div className="font-medium text-yellow-800 mb-1">
                {expiringSoonLinks.length} link{expiringSoonLinks.length === 1 ? '' : 's'} expiring soon
              </div>
              <div className="text-sm text-yellow-700 mb-3">
                The following share links will expire within 7 days:
              </div>
              <div className="space-y-1">
                {expiringSoonLinks.slice(0, 3).map(link => (
                  <div key={link.token} className="text-sm text-yellow-700">
                    • <span className="font-medium">{link.decks.title}</span> 
                    {' '}expires {formatDate(link.expires_at)}
                  </div>
                ))}
                {expiringSoonLinks.length > 3 && (
                  <div className="text-sm text-yellow-600">
                    ... and {expiringSoonLinks.length - 3} more
                  </div>
                )}
              </div>
              <button
                onClick={() => setFilterStatus('active')}
                className="mt-3 text-sm text-yellow-800 hover:text-yellow-900 underline"
              >
                View all active links →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Select All Controls */}
      {filteredAndSortedLinks.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={selectedLinks.size === filteredAndSortedLinks.length && filteredAndSortedLinks.length > 0}
            onChange={handleSelectAll}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
          />
          <label className="text-sm text-gray-600">
            Select all {filteredAndSortedLinks.length} link{filteredAndSortedLinks.length === 1 ? '' : 's'}
          </label>
        </div>
      )}

      {/* Share Links List */}
      <div className="space-y-4">
        {filteredAndSortedLinks.length === 0 ? (
          <div className="card p-8 text-center">
            <Link size={48} className="mx-auto mb-4 text-app-muted" />
            <h3 className="text-lg font-medium mb-2">No share links found</h3>
            <p className="text-app-muted">
              {filterStatus === 'all' 
                ? "Create your first share link from the deck editor to get started."
                : `No ${filterStatus} share links found.`
              }
            </p>
          </div>
        ) : (
          filteredAndSortedLinks.map((link) => (
            <ShareLinkCard
              key={link.token}
              link={link}
              onRevoke={handleRevoke}
              onUpdateExpiration={handleUpdateExpiration}
              onCopy={copyLinkToClipboard}
              isUpdating={updating.has(link.token)}
              isCopied={copiedToken === link.token}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              isSelected={selectedLinks.has(link.token)}
              onSelect={handleSelectLink}
            />
          ))
        )}
      </div>

      {/* Summary Stats */}
      {shareLinks.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {shareLinks.filter(link => getLinkStatus(link) === 'active').length}
            </div>
            <div className="text-sm text-app-muted">Active Links</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {shareLinks.filter(link => getLinkStatus(link) === 'expired').length}
            </div>
            <div className="text-sm text-app-muted">Expired Links</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {shareLinks.filter(link => getLinkStatus(link) === 'revoked').length}
            </div>
            <div className="text-sm text-app-muted">Revoked Links</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {shareLinks.reduce((sum, link) => sum + (link.share_count || 0), 0)}
            </div>
            <div className="text-sm text-app-muted">Total Views</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Share Link Card Component
const ShareLinkCard = ({ 
  link, 
  onRevoke, 
  onUpdateExpiration, 
  onCopy, 
  isUpdating, 
  isCopied,
  getStatusBadge,
  formatDate,
  isSelected,
  onSelect
}) => {
  const [showExpirationEdit, setShowExpirationEdit] = useState(false);
  const [newExpiration, setNewExpiration] = useState('');

  const handleExpirationSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!newExpiration) return;
    
    await onUpdateExpiration(link.token, newExpiration);
    setShowExpirationEdit(false);
    setNewExpiration('');
  }, [link.token, newExpiration, onUpdateExpiration]);

  // Set default expiration to 30 days from now
  const getDefaultExpiration = useCallback(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  }, []);

  return (
    <div className={`card p-4 ${isSelected ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(link.token)}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50 mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-medium">{link.decks.title}</h3>
              {getStatusBadge(link)}
            </div>
          <div className="text-sm text-app-muted space-y-1">
            <div>Created: {formatDate(link.created_at)}</div>
            <div>
              Expires: {link.expires_at ? formatDate(link.expires_at) : 'Never'}
            </div>
            <div>
              Last accessed: {formatDate(link.last_accessed_at)}
            </div>
            <div>Views: {link.share_count || 0}</div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 ml-4">
          {/* Copy Link */}
          <button
            onClick={() => onCopy(link.token)}
            className={`btn-outline ${isCopied ? 'bg-green-50 border-green-200' : ''}`}
            title="Copy share link"
          >
            {isCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
          </button>

          {/* View Link */}
          <button
            onClick={() => window.open(`/s/${link.token}`, '_blank')}
            className="btn-outline"
            title="Open share link"
          >
            <ExternalLink size={16} />
          </button>

          {/* Edit Expiration */}
          {!link.is_revoked && (
            <button
              onClick={() => setShowExpirationEdit(!showExpirationEdit)}
              className="btn-outline"
              title="Edit expiration"
              disabled={isUpdating}
            >
              <Calendar size={16} />
            </button>
          )}

          {/* Revoke */}
          {!link.is_revoked && (
            <button
              onClick={() => onRevoke(link.token)}
              className="btn-outline text-red-600 hover:bg-red-50"
              title="Revoke link"
              disabled={isUpdating}
            >
              {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Expiration Edit Form */}
      {showExpirationEdit && (
        <form onSubmit={handleExpirationSubmit} className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label-strong mb-1">New Expiration Date</label>
              <input
                type="datetime-local"
                value={newExpiration}
                onChange={(e) => setNewExpiration(e.target.value)}
                className="input"
                min={new Date().toISOString().slice(0, 16)}
                placeholder={getDefaultExpiration()}
              />
            </div>
            <button
              type="submit"
              className="btn"
              disabled={!newExpiration || isUpdating}
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExpirationEdit(false);
                setNewExpiration('');
              }}
              className="btn-outline"
            >
              Cancel
            </button>
          </div>
          <div className="mt-2 text-xs text-app-muted">
            Leave empty and update to remove expiration (link never expires)
          </div>
        </form>
      )}

      {/* Link URL Preview */}
      <div className="mt-3 p-2 bg-gray-50 rounded text-sm font-mono text-app-muted truncate">
        {window.location.origin}/s/{link.token}
      </div>
    </div>
  );
};

export default ShareLinksPage;