import React from 'react';

const cx = (...a) => a.filter(Boolean).join(' ');

export default function OrganizationAvatar({ 
  organization, 
  size = 'md', 
  className = '',
  onClick = null 
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const avatarUrl = organization?.avatar_url;
  const name = organization?.name || 'Org';
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div 
      className={cx(
        'rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
        sizeClasses[size],
        avatarUrl ? 'bg-gray-100' : 'bg-blue-600 text-white font-medium',
        onClick && 'cursor-pointer hover:opacity-80 transition',
        className
      )}
      onClick={onClick}
      title={name}
    >
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={`${name} avatar`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div 
        className={cx(
          'w-full h-full flex items-center justify-center',
          avatarUrl && 'hidden'
        )}
      >
        {initials}
      </div>
    </div>
  );
}