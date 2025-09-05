import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { fetchUserInvitations, acceptInvitation, declineInvitation } from '../data/organizations';
import OrganizationAvatar from '../components/OrganizationAvatar';

const cx = (...a) => a.filter(Boolean).join(' ');

export default function InvitationNotifications({ className = '' }) {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await fetchUserInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    try {
      setResponding(invitationId);
      await acceptInvitation(invitationId);
      await loadInvitations(); // Refresh the list
      // Optionally refresh organizations
      window.location.reload(); // Simple way to refresh everything
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      alert('Failed to accept invitation: ' + error.message);
    } finally {
      setResponding(null);
    }
  };

  const handleDecline = async (invitationId) => {
    try {
      setResponding(invitationId);
      await declineInvitation(invitationId);
      await loadInvitations(); // Refresh the list
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      alert('Failed to decline invitation: ' + error.message);
    } finally {
      setResponding(null);
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays}d remaining`;
    if (diffHours > 0) return `${diffHours}h remaining`;
    return 'Expires soon';
  };

  if (loading) return null;
  if (invitations.length === 0) return null;

  return (
    <div className={cx('fixed top-16 right-4 z-50 max-w-sm space-y-3', className)}>
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <OrganizationAvatar 
              organization={invitation.organizations} 
              size="md" 
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-blue-900">
                You've been invited to join {invitation.organizations?.name || 'an organization'}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                Role: <strong>{invitation.role.replace('_', ' ')}</strong>
              </div>
              {invitation.invited_by_profile?.display_name && (
                <div className="text-xs text-blue-600 mt-1">
                  Invited by {invitation.invited_by_profile.display_name}
                </div>
              )}
              <div className="text-xs text-blue-500 mt-1">
                {formatTimeRemaining(invitation.expires_at)}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleAccept(invitation.id)}
              disabled={responding === invitation.id}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {responding === invitation.id ? 'Accepting...' : 'Accept'}
            </button>
            <button
              onClick={() => handleDecline(invitation.id)}
              disabled={responding === invitation.id}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400 disabled:opacity-50"
            >
              {responding === invitation.id ? 'Declining...' : 'Decline'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}