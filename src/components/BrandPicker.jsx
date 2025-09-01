// src/components/BrandPicker.jsx
import React, { useState, memo, useCallback } from "react";
import { useBrands } from "../data/brands";
import { useBrandForm, getBrandDisplayName } from "../data/brandShape";
import BrandFormFields from "./BrandFormFields";

const BrandPicker = memo(function BrandPicker({ user, value, onChange }) {
  const { brands, saveBrand, removeBrand, saving, error } = useBrands(user?.id);
  const [showAdd, setShowAdd] = useState(false);
  
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

  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (!validation.isValid) {
      return; // Form validation errors will be shown
    }
    
    try {
      const formData = getFormData();
      const saved = await saveBrand(formData);
      resetForm();
      setShowAdd(false);
      onChange?.(saved.id);
    } catch (error) {
      console.error('Save brand failed:', error);
      // Error handling is done by the useBrands hook
    }
  }, [validateForm, getFormData, saveBrand, resetForm, onChange]);
  
  const handleToggleAdd = useCallback(() => {
    setShowAdd(prev => {
      if (prev) {
        // Closing - reset form
        resetForm();
      }
      return !prev;
    });
  }, [resetForm]);
  
  const handleDelete = useCallback(async () => {
    if (!value) return;
    
    try {
      await removeBrand(value);
      onChange?.(null);
    } catch (error) {
      console.error('Delete brand failed:', error);
      // Error handling is done by the useBrands hook
    }
  }, [value, removeBrand, onChange]);

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Brand</label>
      <div className="flex items-center gap-2">
        <select
          className="input flex-1"
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value || null)}
          disabled={saving}
        >
          <option value="">No brand</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {getBrandDisplayName(brand)}
              {brand.verified ? " ✓" : ""}
            </option>
          ))}
        </select>
        <button 
          className="btn" 
          onClick={handleToggleAdd}
          disabled={saving}
        >
          {showAdd ? 'Cancel' : 'Add'}
        </button>
        {value && (
          <button
            className="btn bg-red-600 text-white hover:bg-red-700"
            onClick={handleDelete}
            disabled={saving}
            title="Delete selected brand"
          >
            {saving ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      
      {showAdd && (
        <form onSubmit={handleSave} className="mt-3 border p-3 rounded-xl bg-white">
          <div className="mb-3">
            <div className="text-sm font-medium text-app-strong mb-2">Add new brand</div>
          </div>
          
          <BrandFormFields
            form={form}
            errors={errors}
            touched={touched}
            onFieldChange={updateField}
            onFieldBlur={touchField}
            disabled={saving}
            showPreview={true}
            compact={true}
          />
          
          <div className="flex items-center gap-2 mt-4">
            <button 
              type="submit" 
              className="btn" 
              disabled={saving || !isValid}
            >
              {saving ? 'Saving...' : 'Save brand'}
            </button>
            <button 
              type="button" 
              className="btn-outline" 
              onClick={handleToggleAdd}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
});

export default BrandPicker;
