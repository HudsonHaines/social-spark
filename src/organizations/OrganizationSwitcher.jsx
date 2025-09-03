import React, { useState, useRef, useEffect } from 'react';
import { useOrganization } from './OrganizationProvider';
import OrganizationAvatar from '../components/OrganizationAvatar';

const cx = (...a) => a.filter(Boolean).join(' ');

export default function OrganizationSwitcher({ className = '' }) {
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (org) => {
    setCurrentOrganization(org);
    setOpen(false);
  };

  // Don't show if user has no organizations
  if (organizations.length === 0) {
    return null;
  }

  const displayName = currentOrganization?.name || 'Personal';
  const canSwitchToPersonal = true; // Allow switching to personal context

  return (
    <div ref={ref} className={cx('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        title="Switch organization"
      >
        {currentOrganization ? (
          <OrganizationAvatar organization={currentOrganization} size="sm" />
        ) : (
          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium">
            P
          </div>
        )}
        <span className="truncate max-w-[120px]">{displayName}</span>
        <svg
          className={cx('w-4 h-4 transition-transform', open && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-gray-200 rounded-lg shadow-lg" style={{
          zIndex: 9999
        }}>
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-2 py-1">
              ORGANIZATION
            </div>
            
            {/* Personal context option */}
            {canSwitchToPersonal && (
              <button
                onClick={() => handleSelect(null)}
                className={cx(
                  'w-full text-left px-2 py-2 text-sm rounded hover:bg-gray-50 transition flex items-center gap-2',
                  !currentOrganization && 'bg-blue-50 text-blue-700'
                )}
              >
                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  P
                </div>
                <span>Personal</span>
                {!currentOrganization && (
                  <svg className="w-4 h-4 ml-auto" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            )}

            {/* Organization options */}
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org)}
                className={cx(
                  'w-full text-left px-2 py-2 text-sm rounded hover:bg-gray-50 transition flex items-center gap-2',
                  currentOrganization?.id === org.id && 'bg-blue-50 text-blue-700'
                )}
              >
                <OrganizationAvatar organization={org} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{org.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {org.organization_memberships?.[0]?.role}
                  </div>
                </div>
                {currentOrganization?.id === org.id && (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}