import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import OrganizationAvatar from "../components/OrganizationAvatar";
import { 
  fetchUserOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  fetchOrganizationMembers,
  addUserToOrganization,
  inviteUserToOrganization,
  updateMemberRole,
  removeMemberFromOrganization,
  getUserRole,
  uploadOrganizationAvatar,
  fetchOrganizationInvitations,
  cancelInvitation
} from "../data/organizations";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function OrganizationManager({ open, onClose }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: "", description: "", avatar_url: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("project_manager");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadOrganizations();
      setError(null);
      setSuccess(null);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await fetchUserOrganizations();
      setOrganizations(data);
      if (data.length > 0 && !selectedOrg) {
        setSelectedOrg(data[0]);
        loadMembers(data[0].id);
        loadInvitations(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (orgId) => {
    try {
      const data = await fetchOrganizationMembers(orgId);
      setMembers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadInvitations = async (orgId) => {
    try {
      const data = await fetchOrganizationInvitations(orgId);
      setInvitations(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateOrg = async () => {
    if (!orgForm.name.trim()) {
      setError("Organization name is required");
      return;
    }

    try {
      setLoading(true);
      await createOrganization(orgForm);
      setSuccess("Organization created successfully!");
      setOrgForm({ name: "", description: "", avatar_url: "" });
      setShowCreateForm(false);
      await loadOrganizations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedOrg || !inviteEmail.trim()) {
      setError("Email address is required");
      return;
    }

    try {
      setLoading(true);
      await inviteUserToOrganization(selectedOrg.id, inviteEmail, inviteRole);
      setSuccess("Member invited successfully!");
      setInviteEmail("");
      setShowInviteForm(false);
      await loadMembers(selectedOrg.id);
      await loadInvitations(selectedOrg.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (!selectedOrg) return;

    try {
      await updateMemberRole(selectedOrg.id, memberId, newRole);
      setSuccess("Role updated successfully!");
      await loadMembers(selectedOrg.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedOrg || !confirm("Are you sure you want to remove this member?")) return;

    try {
      await removeMemberFromOrganization(selectedOrg.id, memberId);
      setSuccess("Member removed successfully!");
      await loadMembers(selectedOrg.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!selectedOrg || !confirm("Are you sure you want to cancel this invitation?")) return;

    try {
      await cancelInvitation(invitationId);
      setSuccess("Invitation cancelled successfully!");
      await loadInvitations(selectedOrg.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAvatarUpload = async (file, orgId) => {
    if (!file || !orgId) return;

    try {
      setUploadingAvatar(true);
      console.log('Uploading avatar for org:', orgId);
      
      // Upload for existing organization
      const avatarUrl = await uploadOrganizationAvatar(orgId, file);
      console.log('Avatar uploaded, URL:', avatarUrl);
      
      await updateOrganization(orgId, { ...selectedOrg, avatar_url: avatarUrl });
      setSuccess("Avatar updated successfully!");
      await loadOrganizations();
      
      if (selectedOrg) {
        const updatedOrgs = await fetchUserOrganizations();
        const updatedOrg = updatedOrgs.find(org => org.id === orgId);
        if (updatedOrg) setSelectedOrg(updatedOrg);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Organization Management</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
              title="Close"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-[70vh]">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Organizations</h3>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + New
              </button>
            </div>

            {loading && organizations.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : organizations.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p className="mb-2">No organizations yet</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Create First Organization
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrg(org);
                      loadMembers(org.id);
                      loadInvitations(org.id);
                    }}
                    className={cx(
                      "w-full text-left p-3 rounded border flex items-center gap-3",
                      selectedOrg?.id === org.id
                        ? "bg-blue-50 border-blue-200"
                        : "hover:bg-gray-50 border-gray-200"
                    )}
                  >
                    <OrganizationAvatar organization={org} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{org.name}</div>
                      <div className="text-sm text-gray-500 truncate">
                        Role: {org.organization_memberships[0]?.role}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Create Organization Form */}
            {showCreateForm && (
              <div className="mt-4 p-4 border rounded bg-gray-50">
                <h4 className="font-medium mb-3">Create Organization</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Organization name"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={orgForm.description}
                    onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded h-20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateOrg}
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setOrgForm({ name: "", description: "", avatar_url: "" });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            {selectedOrg ? (
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative">
                      <OrganizationAvatar organization={selectedOrg} size="xl" />
                      {selectedOrg.organization_memberships[0]?.role === 'admin' && (
                        <label className="absolute inset-0 cursor-pointer rounded-full hover:bg-black hover:bg-opacity-10 flex items-center justify-center transition">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handleAvatarUpload(file, selectedOrg.id);
                            }}
                            disabled={uploadingAvatar}
                            className="sr-only"
                          />
                          <svg className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </label>
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <div className="text-white text-xs">...</div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold">{selectedOrg.name}</h3>
                      {selectedOrg.description && (
                        <p className="text-gray-600 mt-1">{selectedOrg.description}</p>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        Your role: {selectedOrg.organization_memberships[0]?.role}
                      </div>
                    </div>
                  </div>
                  {selectedOrg.organization_memberships[0]?.role === 'admin' && (
                    <button
                      onClick={() => setShowInviteForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      Invite Member
                    </button>
                  )}
                </div>

                {/* Invite Member Form */}
                {showInviteForm && (
                  <div className="mb-6 p-4 border rounded bg-blue-50">
                    <h4 className="font-medium mb-3">Invite New Member</h4>
                    <p className="text-sm text-gray-600 mb-3">Enter the email address of the person you want to invite to this organization. They must already have an account.</p>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="px-3 py-2 border rounded"
                      >
                        <option value="project_manager">Project Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={handleInviteMember}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        Invite
                      </button>
                      <button
                        onClick={() => {
                          setShowInviteForm(false);
                          setInviteEmail("");
                        }}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Members List */}
                <div>
                  <h4 className="font-medium mb-3">Members ({members.length})</h4>
                  {members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No members found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              {member.profiles?.display_name?.[0] || "?"}
                            </div>
                            <div>
                              <div className="font-medium">
                                {member.profiles?.display_name || "Unknown User"}
                              </div>
                              <div className="text-sm text-gray-500">
                                Joined {new Date(member.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                              disabled={member.user_id === user?.id}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value="project_manager">Project Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                            {member.user_id !== user?.id && 
                             selectedOrg.organization_memberships[0]?.role === 'admin' && (
                              <button
                                onClick={() => handleRemoveMember(member.user_id)}
                                className="text-red-600 hover:text-red-800 px-2 py-1 text-sm"
                                title="Remove member"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Invitations */}
                {selectedOrg.organization_memberships[0]?.role === 'admin' && (
                  <div className="mt-8">
                    <h4 className="font-medium mb-3">Pending Invitations ({invitations.filter(inv => inv.status === 'pending').length})</h4>
                    {invitations.filter(inv => inv.status === 'pending').length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No pending invitations
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {invitations.filter(inv => inv.status === 'pending').map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-3 border rounded bg-orange-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                                <span className="text-sm">!</span>
                              </div>
                              <div>
                                <div className="font-medium">
                                  {invitation.invitee_email}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Invited as {invitation.role.replace('_', ' ')} • 
                                  Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                </div>
                                {invitation.invited_by_profile?.display_name && (
                                  <div className="text-xs text-gray-500">
                                    Invited by {invitation.invited_by_profile.display_name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                Pending
                              </span>
                              <button
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="text-red-600 hover:text-red-800 px-2 py-1 text-sm"
                                title="Cancel invitation"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Select an organization to view details
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {(error || success) && (
          <div className="p-4 border-t border-gray-200">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded text-sm">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {success && (
              <div className="bg-green-50 text-green-700 p-3 rounded text-sm">
                {success}
                <button
                  onClick={() => setSuccess(null)}
                  className="ml-2 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}