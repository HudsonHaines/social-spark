// src/components/AppShell.jsx
import React from "react";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function AppShell({ topBar, left, right, previewRef, mode = "create" }) {
  const isPresent = mode === "present";

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900">
      {topBar}

      <div
        className={cx(
          "mx-auto max-w-[1400px] p-4 gap-4",
          isPresent ? "grid grid-cols-1" : "grid grid-cols-1 lg:grid-cols-[460px_minmax(0,1fr)]"
        )}
      >
        {!isPresent ? <div>{left}</div> : null}

        {/* Right: preview, ref used for PNG export */}
        <div ref={previewRef} className={cx(isPresent && "max-w-[640px] mx-auto w-full")}>
          {right}
        </div>
      </div>
    </div>
  );
}
