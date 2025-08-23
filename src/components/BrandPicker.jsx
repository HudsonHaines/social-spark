// src/components/BrandPicker.jsx
import { useState } from "react";
import { useBrands } from "../data/brands";

export default function BrandPicker({ user, value, onChange }) {
  const { brands, saveBrand, removeBrand, saving } = useBrands(user?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    fb_name: "",
    fb_avatar_url: "",
    ig_username: "",
    ig_avatar_url: "",
    verified: false,
  });

  async function handleSave(e) {
    e.preventDefault();
    const saved = await saveBrand(form);
    setForm({
      fb_name: "",
      fb_avatar_url: "",
      ig_username: "",
      ig_avatar_url: "",
      verified: false,
    });
    setShowAdd(false);
    onChange?.(saved.id);
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Brand</label>
      <div className="flex items-center gap-2">
        <select
          className="input flex-1"
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value || null)}
        >
          <option value="">No brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.fb_name || `@${b.ig_username}` || "(untitled brand)"}
              {b.verified ? " ✓" : ""}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => setShowAdd((s) => !s)}>
          Add
        </button>
        {value && (
          <button
            className="btn bg-red-600 text-white"
            onClick={() => removeBrand(value)}
          >
            Delete
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="mt-3 border p-3 rounded-xl space-y-2 bg-white">
          <input
            className="input"
            placeholder="Facebook name"
            value={form.fb_name}
            onChange={(e) => setForm((f) => ({ ...f, fb_name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Facebook avatar URL"
            value={form.fb_avatar_url}
            onChange={(e) => setForm((f) => ({ ...f, fb_avatar_url: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Instagram username"
            value={form.ig_username}
            onChange={(e) => setForm((f) => ({ ...f, ig_username: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Instagram avatar URL"
            value={form.ig_avatar_url}
            onChange={(e) => setForm((f) => ({ ...f, ig_avatar_url: e.target.value }))}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm((f) => ({ ...f, verified: e.target.checked }))}
            />
            Verified
          </label>
          <button type="submit" className="btn" disabled={saving}>
            Save brand
          </button>
        </form>
      )}
    </div>
  );
}
