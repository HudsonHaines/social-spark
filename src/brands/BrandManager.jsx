// src/brands/BrandManager.jsx
import React, { useEffect, useState } from "react";
import { useBrands, fetchBrands, upsertBrand, deleteBrand } from "../data/brands";

function Banner({ kind = "info", children }) {
  const cls =
    kind === "error"
      ? "bg-red-50 text-red-700 border-red-200"
      : kind === "success"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-slate-50 text-slate-700 border-slate-200";
  return <div className={`border rounded-lg px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

function EmptyForm() {
  return {
    id: undefined,
    fb_name: "",
    fb_avatar_url: "",
    ig_username: "",
    ig_avatar_url: "",
    verified: false,
  };
}

export default function BrandManager({ user, open, onClose }) {
  const userId = user?.id || null;
  if (!open || !userId) return null;

  const { brands, saveBrand, removeBrand, saving, error: hookError } = useBrands(userId);

  const [form, setForm] = useState(EmptyForm());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isEdit = !!form.id;

  useEffect(() => {
    if (!open) {
      setForm(EmptyForm());
      setError("");
      setSuccess("");
    }
  }, [open]);

  function resetForm() {
    setForm(EmptyForm());
    setError("");
    setSuccess("");
  }

  function loadForEdit(b) {
    setForm({
      id: b.id,
      fb_name: b.fb_name || "",
      fb_avatar_url: b.fb_avatar_url || "",
      ig_username: b.ig_username || "",
      ig_avatar_url: b.ig_avatar_url || "",
      verified: !!b.verified,
    });
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("You must be signed in.");
      return;
    }
    if (!form.fb_name.trim() && !form.ig_username.trim()) {
      setError("Add a Facebook name or an Instagram username.");
      return;
    }

    try {
      const saved = await saveBrand(form);
      setSuccess(isEdit ? "Brand updated." : "Brand created.");
      setForm((f) => ({ ...f, id: saved?.id })); // keep in edit mode
    } catch (e2) {
      setError(e2?.message || "Failed to save brand.");
    }
  }

  async function handleDelete(id) {
    setError("");
    setSuccess("");
    if (!id) return;

    const ok = confirm("Delete this brand? This cannot be undone.");
    if (!ok) return;

    try {
      await removeBrand(id);
      if (form.id === id) resetForm();
      setSuccess("Brand deleted.");
    } catch (e2) {
      setError(e2?.message || "Failed to delete brand.");
    }
  }

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
            {error ? <Banner kind="error">{error}</Banner> : null}
            {success ? <Banner kind="success">{success}</Banner> : null}

            <div>
              <label className="text-xs text-slate-500" htmlFor="bm_fb_name">Facebook page name</label>
              <input
                id="bm_fb_name"
                className="input"
                placeholder="e.g. Patagonia"
                value={form.fb_name}
                onChange={(e) => setForm((f) => ({ ...f, fb_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-slate-500" htmlFor="bm_fb_avatar">Facebook avatar URL</label>
              <input
                id="bm_fb_avatar"
                className="input"
                placeholder="https://..."
                value={form.fb_avatar_url}
                onChange={(e) => setForm((f) => ({ ...f, fb_avatar_url: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-slate-500" htmlFor="bm_ig_username">Instagram username</label>
              <input
                id="bm_ig_username"
                className="input"
                placeholder="e.g. patagonia"
                value={form.ig_username}
                onChange={(e) => setForm((f) => ({ ...f, ig_username: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-slate-500" htmlFor="bm_ig_avatar">Instagram avatar URL</label>
              <input
                id="bm_ig_avatar"
                className="input"
                placeholder="https://..."
                value={form.ig_avatar_url}
                onChange={(e) => setForm((f) => ({ ...f, ig_avatar_url: e.target.value }))}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(e) => setForm((f) => ({ ...f, verified: e.target.checked }))}
              />
              Verified
            </label>

            {/* Tiny preview row */}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200">
                {form.fb_avatar_url ? (
                  <img src={form.fb_avatar_url} className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="text-sm truncate">
                <div className="font-medium truncate">{form.fb_name || "Facebook name"}</div>
                <div className="text-xs text-slate-500 truncate">@{form.ig_username || "instagram"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" className="btn" disabled={saving}>
                {isEdit ? "Save changes" : "Save brand"}
              </button>
              <button type="button" className="btn-outline" onClick={resetForm} disabled={saving}>
                {isEdit ? "Cancel" : "Clear"}
              </button>
              {isEdit ? (
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
          {/* List brands */}
<div className="space-y-3">
  <div className="text-sm font-medium">Your brands</div>

  {brands.length === 0 ? (
    <div className="border rounded-xl p-4 text-sm text-slate-500">
      No brands yet
    </div>
  ) : (
    <ul className="space-y-2">
      {brands.map((b) => (
        <li key={b.id} className="border rounded-xl p-3 bg-white">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shrink-0">
              {b.fb_avatar_url ? (
                <img src={b.fb_avatar_url} className="w-full h-full object-cover" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <div className="font-medium truncate">{b.fb_name || "Facebook name"}</div>
                <div className="text-xs text-slate-500 truncate">@{b.ig_username || "instagram"}</div>
                {b.verified ? (
                  <span className="chip">✓ Verified</span>
                ) : null}
              </div>

              {/* Actions */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="chip"
                  onClick={() => loadForEdit(b)}
                  disabled={saving}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="chip text-red-600"
                  onClick={() => handleDelete(b.id)}
                  disabled={saving}
                >
                  Delete
                </button>
              </div>
            </div>
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
}
