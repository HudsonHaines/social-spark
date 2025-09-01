// src/brands/BrandManager.jsx
import React, { useEffect, useState, memo, useCallback } from "react";
import { useBrands } from "../data/brands";
import { useBrandForm, validateBrandForm } from "../data/brandShape";
import BrandFormFields from "../components/BrandFormFields";
import BrandCard from "../components/BrandCard";

const Banner = memo(function Banner({ kind = "info", children }) {
  const cls =
    kind === "error"
      ? "bg-red-50 text-red-700 border-red-200"
      : kind === "success"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-slate-50 text-slate-700 border-slate-200";
  return <div className={`border rounded-lg px-3 py-2 text-sm ${cls}`}>{children}</div>;
});

const BrandManager = memo(function BrandManager({ user, open, onClose }) {
  const userId = user?.id || null;
  if (!open || !userId) return null;

  const { brands, saveBrand, removeBrand, saving, error: hookError } = useBrands(userId);
  const {
    form,
    errors,
    touched,
    isValid,
    resetForm,
    updateField,
    touchField,
    validateForm,
    getFormData,
  } = useBrandForm();

  const [localError, setLocalError] = useState("");
  const [success, setSuccess] = useState("");
  const isEdit = !!form.id;

  useEffect(() => {
    if (!open) {
      resetForm();
      setLocalError("");
      setSuccess("");
    }
  }, [open, resetForm]);

  const clearMessages = useCallback(() => {
    setLocalError("");
    setSuccess("");
  }, []);

  const resetFormAndMessages = useCallback(() => {
    resetForm();
    clearMessages();
  }, [resetForm, clearMessages]);

  const loadForEdit = useCallback((brand) => {
    resetForm({ ...brand, id: brand.id });
    clearMessages();
  }, [resetForm, clearMessages]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    clearMessages();

    if (!userId) {
      setLocalError("You must be signed in.");
      return;
    }

    const validation = validateForm();
    if (!validation.isValid) {
      setLocalError("Please fix the errors above.");
      return;
    }

    try {
      const formData = getFormData();
      const dataToSave = isEdit ? { ...formData, id: form.id } : formData;
      
      const saved = await saveBrand(dataToSave);
      setSuccess(isEdit ? "Brand updated." : "Brand created.");
      
      // Keep in edit mode with the saved data
      resetForm({ ...saved });
    } catch (error) {
      console.error('Save error:', error);
      setLocalError(error?.message || "Failed to save brand.");
    }
  }, [userId, validateForm, getFormData, isEdit, form.id, saveBrand, clearMessages, resetForm]);

  const handleDelete = useCallback(async (id) => {
    clearMessages();
    if (!id) return;

    const ok = confirm("Delete this brand? This cannot be undone.");
    if (!ok) return;

    try {
      await removeBrand(id);
      if (form.id === id) resetFormAndMessages();
      setSuccess("Brand deleted.");
    } catch (error) {
      console.error('Delete error:', error);
      setLocalError(error?.message || "Failed to delete brand.");
    }
  }, [removeBrand, form.id, resetFormAndMessages, clearMessages]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Dialog */}
      <div className="absolute left-1/2 top-16 -translate-x-1/2 w-[min(960px,95vw)] max-h-[90vh] bg-white border rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0">
          <div className="font-semibold">Brand Manager</div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100"
            aria-label="Close"
          >
            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" stroke="currentColor" fill="none">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        {/* Body (scrolls) */}
        <div className="p-5 grid lg:grid-cols-2 gap-6 overflow-y-auto">
          {/* Add/Edit form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{isEdit ? "Edit brand" : "Add brand"}</div>
              {isEdit ? (
                <span className="text-xs text-slate-500">
                  Editing: {form.fb_name || (form.ig_username ? `@${form.ig_username}` : "Unnamed")}
                </span>
              ) : null}
            </div>

            {hookError ? <Banner kind="error">{hookError}</Banner> : null}
            {localError ? <Banner kind="error">{localError}</Banner> : null}
            {success ? <Banner kind="success">{success}</Banner> : null}

            <BrandFormFields
              form={form}
              errors={errors}
              touched={touched}
              onFieldChange={updateField}
              onFieldBlur={touchField}
              disabled={saving}
              showPreview={true}
            />

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" className="btn" disabled={saving || !isValid}>
                {saving ? 'Saving...' : (isEdit ? "Save changes" : "Save brand")}
              </button>
              <button type="button" className="btn-outline" onClick={resetFormAndMessages} disabled={saving}>
                {isEdit ? "Cancel" : "Clear"}
              </button>
              {isEdit && form.id ? (
                <button
                  type="button"
                  className="btn-outline text-red-600 border-red-200 ml-auto"
                  onClick={() => handleDelete(form.id)}
                  disabled={saving}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </form>

          {/* List brands */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Your brands</div>

            {brands.length === 0 ? (
              <div className="border rounded-xl p-4 text-sm text-slate-500">
                No brands yet
              </div>
            ) : (
              <ul className="space-y-2">
                {brands.map((brand) => (
                  <li key={brand.id}>
                    <BrandCard
                      brand={brand}
                      onEdit={(id, formData) => saveBrand({ ...formData, id })}
                      onDelete={handleDelete}
                      showActions={true}
                      showVerifiedToggle={false}
                      showInlineEdit={false}
                      compact={true}
                      disabled={saving}
                      className="hover:bg-slate-50"
                    />
                    {/* Edit action */}
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        className="chip"
                        onClick={() => loadForEdit(brand)}
                        disabled={saving}
                      >
                        Edit in form above
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-xs text-slate-500">
              Tip: Editing a brand here does not auto-update existing posts. Reselect the brand on a post to refresh its info.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BrandManager;
