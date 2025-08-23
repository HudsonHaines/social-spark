// src/data/brands.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// List brands for a user
export async function listBrandsByUser(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Create or update a brand
export async function upsertBrand(payload) {
  const clean = {
    id: payload.id ?? undefined,
    user_id: payload.user_id,
    fb_name: payload.fb_name ?? null,
    fb_avatar_url: payload.fb_avatar_url ?? null,
    ig_username: payload.ig_username ?? null,
    ig_avatar_url: payload.ig_avatar_url ?? null,
    verified: !!payload.verified,
  };
  const { data, error } = await supabase
    .from("brands")
    .upsert(clean)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete a brand
export async function deleteBrand(id, userId) {
  if (!id || !userId) return;
  const { error } = await supabase
    .from("brands")
    .delete()
    .match({ id, user_id: userId });
  if (error) throw error;
}

// Hook for managing brands
export function useBrands(userId) {
  const [brands, setBrands] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const rows = await listBrandsByUser(userId);
      setBrands(rows);
    } catch (e) {
      setError(e);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
  }, [userId, refresh]);

  const brandMap = useMemo(() => {
    const m = new Map();
    for (const b of brands) m.set(b.id, b);
    return m;
  }, [brands]);

  const saveBrand = useCallback(
    async (payload) => {
      setSaving(true);
      try {
        const saved = await upsertBrand({ ...payload, user_id: userId });
        await refresh();
        return saved;
      } finally {
        setSaving(false);
      }
    },
    [userId, refresh]
  );

  const removeBrand = useCallback(
    async (id) => {
      setSaving(true);
      try {
        await deleteBrand(id, userId);
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [userId, refresh]
  );

  return { brands, brandMap, refresh, saveBrand, removeBrand, saving, error };
}
