// src/brands/BrandsPage.jsx
import React, { useEffect, useMemo, useState, memo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { ArrowLeft, Plus } from "lucide-react";
import { useBrands } from "../data/brands";
import { getBrandDisplayName, getBrandSecondaryText } from "../data/brandShape";
import BrandCard from "../components/BrandCard";

const cx = (...a) => a.filter(Boolean).join(" ");

const BrandsPage = memo(function BrandsPage({
  userId,
  onBack,
  onOpenBrandManager,
}) {
  const { brands, saveBrand, removeBrand, loading, error } = useBrands(userId);
  const [searchQuery, setSearchQuery] = useState("");

  // Error display
  useEffect(() => {
    if (error) {
      console.error('Brands loading error:', error);
    }
  }, [error]);

  // Brand operation handlers
  const handleEditBrand = useCallback(async (id, formData) => {
    try {
      await saveBrand({ ...formData, id });
    } catch (error) {
      console.error('Edit failed:', error);
      alert('Could not save changes: ' + (error.message || 'Unknown error'));
      throw error; // Re-throw to let BrandCard handle the error state
    }
  }, [saveBrand]);

  const handleDeleteBrand = useCallback(async (id) => {
    try {
      await removeBrand(id);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Could not delete brand: ' + (error.message || 'Unknown error'));
    }
  }, [removeBrand]);

  const handleToggleVerified = useCallback(async (brand) => {
    try {
      const updatedData = {
        fb_name: brand.fb_name,
        fb_avatar_url: brand.fb_avatar_url,
        ig_username: brand.ig_username,
        ig_avatar_url: brand.ig_avatar_url,
        verified: !brand.verified,
      };
      await saveBrand({ ...updatedData, id: brand.id });
    } catch (error) {
      console.error('Toggle verified failed:', error);
      alert('Could not update verification status: ' + (error.message || 'Unknown error'));
    }
  }, [saveBrand]);

  // Filtered brands based on search
  const filteredBrands = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return brands;
    
    return brands.filter((brand) => {
      const displayName = getBrandDisplayName(brand).toLowerCase();
      const secondaryText = getBrandSecondaryText(brand).toLowerCase();
      const fbName = (brand.fb_name || '').toLowerCase();
      const igUsername = (brand.ig_username || '').toLowerCase();
      
      return displayName.includes(term) || 
             secondaryText.includes(term) || 
             fbName.includes(term) || 
             igUsername.includes(term);
    });
  }, [brands, searchQuery]);

  return (
    <div className="panel w-full overflow-hidden flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn-outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <div className="font-medium text-app-strong">Manage brands</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="Search brands"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn px-4 whitespace-nowrap" onClick={onOpenBrandManager}>
            <Plus className="w-4 h-4 mr-2" />
            New Brand
          </button>
        </div>
      </div>

      <div className="bg-app-surface p-4 w-full">
        {loading ? (
          <div className="text-sm text-app-muted">Loading brands...</div>
        ) : error ? (
          <div className="text-sm text-red-600">Error loading brands: {error}</div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-sm text-app-muted">
            {searchQuery ? `No brands found matching "${searchQuery}"` : 'No brands yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBrands.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                onEdit={handleEditBrand}
                onDelete={handleDeleteBrand}
                onToggleVerified={handleToggleVerified}
                showActions={true}
                showVerifiedToggle={true}
                showInlineEdit={true}
                compact={false}
                disabled={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default BrandsPage;
