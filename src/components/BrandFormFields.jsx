import React, { memo } from 'react';

const BrandFormFields = memo(function BrandFormFields({
  form,
  errors = {},
  touched = {},
  onFieldChange,
  onFieldBlur,
  disabled = false,
  showPreview = true,
  compact = false,
}) {
  const fieldClass = compact ? 'input text-sm' : 'input';
  const labelClass = compact ? 'text-xs text-app-muted' : 'text-xs text-app-muted';
  const spacingClass = compact ? 'space-y-2' : 'space-y-3';

  return (
    <div className={spacingClass}>
      {/* Facebook Name */}
      <div>
        <label className={labelClass} htmlFor="brand_fb_name">
          Facebook page name
        </label>
        <input
          id="brand_fb_name"
          className={fieldClass}
          placeholder="e.g. Patagonia"
          value={form.fb_name || ''}
          onChange={(e) => onFieldChange('fb_name', e.target.value)}
          onBlur={() => onFieldBlur?.('fb_name')}
          disabled={disabled}
          autoComplete="organization"
        />
        {touched.fb_name && errors.fb_name && (
          <div className="text-xs text-red-600 mt-1">{errors.fb_name}</div>
        )}
      </div>

      {/* Facebook Avatar URL */}
      <div>
        <label className={labelClass} htmlFor="brand_fb_avatar">
          Facebook avatar URL
        </label>
        <input
          id="brand_fb_avatar"
          className={fieldClass}
          placeholder="https://..."
          value={form.fb_avatar_url || ''}
          onChange={(e) => onFieldChange('fb_avatar_url', e.target.value)}
          onBlur={() => onFieldBlur?.('fb_avatar_url')}
          disabled={disabled}
          autoComplete="url"
          type="url"
        />
        {touched.fb_avatar_url && errors.fb_avatar_url && (
          <div className="text-xs text-red-600 mt-1">{errors.fb_avatar_url}</div>
        )}
      </div>

      {/* Instagram Username */}
      <div>
        <label className={labelClass} htmlFor="brand_ig_username">
          Instagram username
        </label>
        <input
          id="brand_ig_username"
          className={fieldClass}
          placeholder="e.g. patagonia"
          value={form.ig_username || ''}
          onChange={(e) => onFieldChange('ig_username', e.target.value)}
          onBlur={() => onFieldBlur?.('ig_username')}
          disabled={disabled}
          autoComplete="username"
        />
        {touched.ig_username && errors.ig_username && (
          <div className="text-xs text-red-600 mt-1">{errors.ig_username}</div>
        )}
      </div>

      {/* Instagram Avatar URL */}
      <div>
        <label className={labelClass} htmlFor="brand_ig_avatar">
          Instagram avatar URL
        </label>
        <input
          id="brand_ig_avatar"
          className={fieldClass}
          placeholder="https://..."
          value={form.ig_avatar_url || ''}
          onChange={(e) => onFieldChange('ig_avatar_url', e.target.value)}
          onBlur={() => onFieldBlur?.('ig_avatar_url')}
          disabled={disabled}
          autoComplete="url"
          type="url"
        />
        {touched.ig_avatar_url && errors.ig_avatar_url && (
          <div className="text-xs text-red-600 mt-1">{errors.ig_avatar_url}</div>
        )}
      </div>

      {/* Verified Checkbox */}
      <div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.verified || false}
            onChange={(e) => onFieldChange('verified', e.target.checked)}
            onBlur={() => onFieldBlur?.('verified')}
            disabled={disabled}
            className="rounded"
          />
          <span>Verified account</span>
        </label>
        {touched.verified && errors.verified && (
          <div className="text-xs text-red-600 mt-1">{errors.verified}</div>
        )}
      </div>

      {/* Live Preview */}
      {showPreview && (
        <div className="pt-2 border-t border-app-border">
          <div className="text-xs text-app-muted mb-2">Preview</div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-app-muted flex items-center justify-center flex-shrink-0">
              {form.fb_avatar_url || form.ig_avatar_url ? (
                <img
                  src={form.fb_avatar_url || form.ig_avatar_url}
                  className="w-full h-full object-cover"
                  alt=""
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-xs text-app-muted">👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {form.fb_name || 'Facebook name'}
                {form.verified ? ' ✓' : ''}
              </div>
              <div className="text-xs text-app-muted truncate">
                @{form.ig_username || 'instagram'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default BrandFormFields;