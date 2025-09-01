import React, { memo, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Edit3, Trash2, Save, X } from 'lucide-react';
import { getBrandDisplayName, getBrandSecondaryText, getBrandAvatarUrl, useBrandForm } from '../data/brandShape';
import BrandFormFields from './BrandFormFields';

const BrandCard = memo(function BrandCard({
  brand,
  onEdit,
  onDelete,
  onToggleVerified,
  showActions = true,
  showVerifiedToggle = true,
  showInlineEdit = false,
  compact = false,
  disabled = false,
  className = '',
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    form,
    errors,
    touched,
    isValid,
    resetForm,
    updateField,
    touchField,
    getFormData,
  } = useBrandForm(brand);

  const startEdit = useCallback(() => {
    resetForm(brand);
    setIsEditing(true);
  }, [resetForm, brand]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    resetForm();
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    
    setIsSaving(true);
    try {
      const formData = getFormData();
      await onEdit?.(brand.id, formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [isValid, getFormData, onEdit, brand.id]);

  const handleDelete = useCallback(() => {
    if (!confirm('Delete this brand? This cannot be undone.')) return;
    onDelete?.(brand.id);
  }, [onDelete, brand.id]);

  const handleToggleVerified = useCallback(() => {
    onToggleVerified?.(brand);
  }, [onToggleVerified, brand]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && isValid) {
      handleSave();
    }
    if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [handleSave, cancelEdit, isValid]);

  const cardClass = compact
    ? `border border-app-border rounded-lg p-3 bg-white ${className}`
    : `card p-0 overflow-hidden ${className}`;

  const avatarSize = compact ? 'w-8 h-8' : 'w-12 h-12';
  const primaryTextClass = compact ? 'font-medium text-sm' : 'font-medium';
  const secondaryTextClass = compact ? 'text-xs text-app-muted' : 'text-xs text-app-muted';

  if (isEditing && showInlineEdit) {
    return (
      <div className={cardClass} onKeyDown={handleKeyDown}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Edit Brand</div>
            <div className="text-xs text-app-muted">
              {getBrandDisplayName(brand)}
            </div>
          </div>

          <BrandFormFields
            form={form}
            errors={errors}
            touched={touched}
            onFieldChange={updateField}
            onFieldBlur={touchField}
            disabled={isSaving}
            showPreview={false}
            compact={compact}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
            <button
              className="btn-outline text-sm"
              onClick={cancelEdit}
              disabled={isSaving}
              type="button"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </button>
            <button
              className="btn text-sm"
              onClick={handleSave}
              disabled={!isValid || isSaving}
              type="button"
            >
              <Save className="w-3 h-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      {compact ? (
        /* Compact Layout */
        <div className="flex items-center gap-3">
          <div className={`${avatarSize} rounded-full bg-app-muted overflow-hidden flex items-center justify-center flex-shrink-0`}>
            {getBrandAvatarUrl(brand) ? (
              <img
                src={getBrandAvatarUrl(brand)}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xs text-app-muted">👤</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className={`${primaryTextClass} truncate`}>
              {getBrandDisplayName(brand)}
              {brand.verified ? ' ✓' : ''}
            </div>
            <div className={`${secondaryTextClass} truncate`}>
              {getBrandSecondaryText(brand)}
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {showInlineEdit && (
                <button
                  className="chip text-xs"
                  onClick={startEdit}
                  disabled={disabled}
                  title="Edit brand"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
              <button
                className="chip text-xs hover:bg-red-50 hover:text-red-600"
                onClick={handleDelete}
                disabled={disabled}
                title="Delete brand"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Full Layout */
        <>
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b">
            <div className={`${avatarSize} rounded-full bg-app-muted overflow-hidden flex items-center justify-center flex-shrink-0`}>
              {getBrandAvatarUrl(brand) ? (
                <img
                  src={getBrandAvatarUrl(brand)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs text-app-muted">👤</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`${primaryTextClass} truncate`}>
                {getBrandDisplayName(brand)}
              </div>
              <div className={`${secondaryTextClass} truncate`}>
                {getBrandSecondaryText(brand)}
              </div>
              {brand.created_at && (
                <div className="text-xs text-app-muted">
                  {new Date(brand.created_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-3 space-y-3">
            {/* Verified Toggle */}
            {showVerifiedToggle && (
              <div className="flex items-center justify-between">
                <div className="text-sm">Verified</div>
                <button
                  className={`chip ${
                    brand.verified ? 'bg-green-50 border-green-200 text-green-700' : 'bg-app-muted'
                  }`}
                  onClick={handleToggleVerified}
                  disabled={disabled}
                  title="Toggle verified status"
                >
                  {brand.verified ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Unverified
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Actions */}
            {showActions && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
                {showInlineEdit && (
                  <button
                    className="chip"
                    onClick={startEdit}
                    disabled={disabled}
                    title="Edit brand"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Edit
                  </button>
                )}
                <button
                  className="chip hover:bg-red-50 hover:text-red-600"
                  onClick={handleDelete}
                  disabled={disabled}
                  title="Delete brand"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default BrandCard;