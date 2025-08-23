import React, { useEffect, useRef, useState } from 'react';
import { createBrand, deleteBrand, fetchBrands, updateBrand, uploadBrandAvatar } from '../data/brands';

export default function BrandManager({ open, onClose, onSaved, selectedId, setSelectedId }) {
  const [brands, setBrands] = useState([]);
  const [busy, setBusy] = useState(false);
  const fbRef = useRef(null);
  const igRef = useRef(null);

  async function load() {
    setBusy(true);
    try {
      const rows = await fetchBrands();
      setBrands(rows);
      // Ensure selected stays valid
      if (selectedId && !rows.find(b => b.id === selectedId)) {
        setSelectedId(rows[0]?.id || null);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (open) load(); }, [open]);

  async function onCreate() {
    setBusy(true);
    try {
      const row = await createBrand({ fb_name: 'Brand', ig_username: 'brand', verified: false });
      await load();
      setSelectedId(row.id);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  async function onUpdate(id, patch) {
    setBusy(true);
    try {
      await updateBrand(id, patch);
      await load();
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    setBusy(true);
    try {
      await deleteBrand(id);
      await load();
      if (selectedId === id) setSelectedId(null);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(id, which, file) {
    setBusy(true);
    try {
      const url = await uploadBrandAvatar(file, which);
      await onUpdate(id, { [which === 'fb' ? 'fb_avatar_url' : 'ig_avatar_url']: url });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto w-[800px] bg-white border rounded-2xl shadow p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Brands</div>
          <div className="flex items-center gap-2">
            {busy ? <span className="text-xs text-slate-500">Saving…</span> : null}
            <button className="btn" onClick={onCreate}>New brand</button>
            <button className="btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="mt-3 divide-y">
          {brands.length === 0 ? (
            <div className="text-sm text-slate-600 p-3">No brands yet. Click New brand.</div>
          ) : brands.map(b => (
            <div key={b.id} className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="selectedBrand"
                    checked={selectedId === b.id}
                    onChange={() => setSelectedId(b.id)}
                  />
                  <div>
                    <div className="text-sm font-medium">{b.fb_name || '(no FB name)'} · @{b.ig_username || '(no IG)'}</div>
                    <div className="text-xs text-slate-500">{b.verified ? 'Verified' : 'Not verified'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="chip" onClick={() => onDelete(b.id)}>Delete</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="border rounded-xl p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Facebook</div>
                  <label className="text-xs text-slate-500">Page name</label>
                  <input className="input w-full"
                    value={b.fb_name || ''}
                    onChange={e => onUpdate(b.id, { fb_name: e.target.value })}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                      {b.fb_avatar_url ? <img src={b.fb_avatar_url} className="w-full h-full object-cover" /> : null}
                    </div>
                    <button className="btn-outline" onClick={() => fbRef.current?.click()}>Change avatar</button>
                    <input
                      ref={fbRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) onUpload(b.id, 'fb', f);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>

                <div className="border rounded-xl p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Instagram</div>
                  <label className="text-xs text-slate-500">Username</label>
                  <input className="input w-full"
                    value={b.ig_username || ''}
                    onChange={e => onUpdate(b.id, { ig_username: e.target.value.replace(/^@/, '') })}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                      {b.ig_avatar_url ? <img src={b.ig_avatar_url} className="w-full h-full object-cover" /> : null}
                    </div>
                    <button className="btn-outline" onClick={() => igRef.current?.click()}>Change avatar</button>
                    <input
                      ref={igRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) onUpload(b.id, 'ig', f);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!b.verified}
                    onChange={e => onUpdate(b.id, { verified: e.target.checked })}
                  />
                  Verified badge
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
