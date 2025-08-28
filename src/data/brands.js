// src/data/brands.js
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// normalize incoming brand shape
function sanitizeBrand(data = {}) {
  return {
    id: data.id ?? undefined,
    fb_name: data.fb_name?.trim() || "",
    fb_avatar_url: data.fb_avatar_url?.trim() || "",
    ig_username: data.ig_username?.trim()?.replace(/^@/, "")?.toLowerCase() || "",
    ig_avatar_url: data.ig_avatar_url?.trim() || "",
    verified: !!data.verified,
  };
}

/* =========================
   Low-level CRUD (Supabase)
   ========================= */

export async function fetchBrands(userId) {
  if (!userId) return [];
  if (!supabase) throw new Error("Supabase client is undefined");

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertBrand(userId, brand) {
  if (!userId) throw new Error("Missing userId");
  if (!supabase) throw new Error("Supabase client is undefined");
  const clean = sanitizeBrand(brand);

  // update
  if (clean.id) {
    const { data, error } = await supabase
      .from("brands")
      .update({
        fb_name: clean.fb_name,
        fb_avatar_url: clean.fb_avatar_url,
        ig_username: clean.ig_username,
        ig_avatar_url: clean.ig_avatar_url,
        verified: clean.verified,
      })
      .eq("id", clean.id)
      .eq("user_id", userId)
      .select()
      .single(); // fail if not found

    if (error) throw error;
    return data;
  }

  // insert
  const { data, error } = await supabase
    .from("brands")
    .insert([
      {
        user_id: userId,
        fb_name: clean.fb_name,
        fb_avatar_url: clean.fb_avatar_url,
        ig_username: clean.ig_username,
        ig_avatar_url: clean.ig_avatar_url,
        verified: clean.verified,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBrand(userId, id) {
  if (!userId) throw new Error("Missing userId");
  if (!id) throw new Error("Missing brand id");
  if (!supabase) throw new Error("Supabase client is undefined");

  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

/* =========================
   React Hook
   ========================= */

export function useBrands(userId) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(!!userId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // reset immediately on sign-out
  useEffect(() => {
    if (!userId) {
      setBrands([]);
      setError("");
      setLoading(false);
    }
  }, [userId]);

  // initial load
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError("");
        if (!userId) return;
        const rows = await fetchBrands(userId);
        if (!cancelled) setBrands(rows);
      } catch (e) {
        console.error("[useBrands] fetch error:", e);
        if (!cancelled) setError(e.message || "Failed to load brands");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // realtime (guarded)
  useEffect(() => {
    if (!userId) return;
    if (!supabase?.channel) {
      console.warn("[useBrands] Realtime channel not available. Skipping subscribe.");
      return;
    }

    let channel;
    try {
      channel = supabase
        .channel(`brands:${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "brands", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new;
              setBrands((prev) => (prev.find((b) => b.id === row.id) ? prev : [row, ...prev]));
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new;
              setBrands((prev) => {
                const idx = prev.findIndex((b) => b.id === row.id);
                if (idx === -1) return prev;
                const next = prev.slice();
                next[idx] = row;
                return next;
              });
            } else if (payload.eventType === "DELETE") {
              const row = payload.old;
              setBrands((prev) => prev.filter((b) => b.id !== row.id));
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.error("[useBrands] realtime subscribe error:", e);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  const saveBrand = useCallback(
    async (brandInput) => {
      if (!userId) throw new Error("Not signed in");
      setSaving(true);
      setError("");
      try {
        const saved = await upsertBrand(userId, brandInput);
        // optimistic update
        setBrands((prev) => {
          const idx = prev.findIndex((b) => b.id === saved.id);
          if (idx === -1) return [saved, ...prev];
          const next = prev.slice();
          next[idx] = saved;
          return next;
        });
        return saved;
      } catch (e) {
        console.error("[useBrands] save error:", e);
        setError(e.message || "Failed to save brand");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );

  const removeBrand = useCallback(
    async (id) => {
      if (!userId) throw new Error("Not signed in");
      setSaving(true);
      setError("");
      try {
        await deleteBrand(userId, id);
        setBrands((prev) => prev.filter((b) => b.id !== id));
        return true;
      } catch (e) {
        console.error("[useBrands] delete error:", e);
        setError(e.message || "Failed to delete brand");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setBrands(await fetchBrands(userId));
    } catch (e) {
      console.error("[useBrands] reload error:", e);
      setError(e.message || "Failed to reload brands");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { brands, loading, saving, error, saveBrand, removeBrand, reload };
}
