// src/brands/BrandsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  ArrowLeft,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Save,
  X,
} from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function BrandsPage({
  userId,
  onBack,
  onOpenBrandManager, // opens your BrandManager modal
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  // inline edit state
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    fb_name: "",
    ig_username: "",
    fb_avatar_url: "",
    ig_avatar_url: "",
  });

  // load brands
  async function load() {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      console.error(e);
      alert("Could not load brands.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  // helpers
  function startEdit(b) {
    setEditingId(b.id);
    setDraft({
      fb_name: b.fb_name || "",
      ig_username: b.ig_username || "",
      fb_avatar_url: b.fb_avatar_url || "",
      ig_avatar_url: b.ig_avatar_url || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({
      fb_name: "",
      ig_username: "",
      fb_avatar_url: "",
      ig_avatar_url: "",
    });
  }

  function sanitizeUsername(s) {
    return (s || "").replace(/^@/, "").trim();
  }

  function isValidUrl(u) {
    if (!u) return true; // empty allowed
    try {
      const url = new URL(u);
      return !!url.protocol && !!url.host;
    } catch {
      return false;
    }
  }

  async function saveEdit(id) {
    const fb_name = draft.fb_name.trim();
    const ig_username = sanitizeUsername(draft.ig_username);
    const fb_avatar_url = draft.fb_avatar_url.trim();
    const ig_avatar_url = draft.ig_avatar_url.trim();

    if (!fb_name) {
      alert("Facebook name is required.");
      return;
    }
    if (!isValidUrl(fb_avatar_url) || !isValidUrl(ig_avatar_url)) {
      alert("One of the avatar URLs is not a valid URL.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({ fb_name, ig_username, fb_avatar_url, ig_avatar_url })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      await load();
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this brand?")) return;
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
      await load();
    } catch (e) {
      console.error(e);
      alert("Could not delete brand.");
    }
  }

  async function handleToggleVerified(b) {
    try {
      const { error } = await supabase
        .from("brands")
        .update({ verified: !b.verified })
        .eq("id", b.id)
        .eq("user_id", userId);
      if (error) throw error;
      await load();
    } catch (e) {
      console.error(e);
      alert("Could not update brand.");
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const a = r.fb_name?.toLowerCase?.() || "";
      const b = r.ig_username?.toLowerCase?.() || "";
      return a.includes(term) || b.includes(term);
    });
  }, [rows, q]);

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
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" onClick={onOpenBrandManager}>
            + New brand
          </button>
        </div>
      </div>

      <div className="bg-app-surface p-4 w-full">
        {loading ? (
          <div className="text-sm text-app-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-app-muted">No brands yet.</div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((b) => {
              const isEditing = editingId === b.id;
              return (
                <li key={b.id} className="card p-0 overflow-hidden">
                  {/* header */}
                  <div className="flex items-center gap-3 p-3 border-b">
                    <div className="w-12 h-12 rounded-full bg-app-muted overflow-hidden flex items-center justify-center shrink-0">
                      {b.fb_avatar_url || b.ig_avatar_url ? (
                        <img
                          src={b.fb_avatar_url || b.ig_avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs text-app-muted">No avatar</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.fb_name || "(no FB name)"}</div>
                      <div className="text-xs text-app-muted truncate">@{b.ig_username || "ig"}</div>
                      <div className="text-xs text-app-muted">
                        {new Date(b.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* body */}
                  <div className="p-3 space-y-3">
                    {/* verified toggle row */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Verified</div>
                      <button
                        className={cx(
                          "chip",
                          b.verified ? "bg-green-50 border-green-200" : "bg-slate-50"
                        )}
                        onClick={() => handleToggleVerified(b)}
                        title="Toggle verified"
                      >
                        {b.verified ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> On
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" /> Off
                          </>
                        )}
                      </button>
                    </div>

                    {/* edit block */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <label className="text-xs text-app-muted" htmlFor={`fb_${b.id}`}>
                          Facebook name
                        </label>
                        <input
                          id={`fb_${b.id}`}
                          className="input"
                          value={draft.fb_name}
                          onChange={(e) => setDraft((d) => ({ ...d, fb_name: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(b.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                        />

                        <label className="text-xs text-app-muted" htmlFor={`ig_${b.id}`}>
                          Instagram username
                        </label>
                        <input
                          id={`ig_${b.id}`}
                          className="input"
                          value={draft.ig_username}
                          onChange={(e) => setDraft((d) => ({ ...d, ig_username: e.target.value }))}
                          placeholder="e.g. patagonia"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(b.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />

                        <label className="text-xs text-app-muted" htmlFor={`fbav_${b.id}`}>
                          Facebook avatar URL
                        </label>
                        <input
                          id={`fbav_${b.id}`}
                          className="input"
                          value={draft.fb_avatar_url}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, fb_avatar_url: e.target.value }))
                          }
                          placeholder="https://..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(b.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />

                        <label className="text-xs text-app-muted" htmlFor={`igav_${b.id}`}>
                          Instagram avatar URL
                        </label>
                        <input
                          id={`igav_${b.id}`}
                          className="input"
                          value={draft.ig_avatar_url}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, ig_avatar_url: e.target.value }))
                          }
                          placeholder="https://..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(b.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button className="btn-outline" onClick={cancelEdit} disabled={saving}>
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                          <button
                            className="btn"
                            onClick={() => saveEdit(b.id)}
                            disabled={saving}
                            title="Save changes"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm">
                          <div className="font-medium">{b.fb_name || "(no FB name)"}</div>
                          <div className="text-xs text-app-muted">@{b.ig_username || "ig"}</div>
                        </div>

                        {/* actions */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            className="chip"
                            onClick={() => startEdit(b)}
                            title="Inline edit"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                          <button
                            className="chip"
                            onClick={() => handleDelete(b.id)}
                            title="Delete brand"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
