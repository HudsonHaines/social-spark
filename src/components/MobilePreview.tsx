import React from "react";

type MobilePreviewProps = { children: React.ReactNode };

const MobilePreview: React.FC<MobilePreviewProps> = ({ children }) => {
  return (
    <div className="relative mx-auto flex items-center justify-center p-4">
      <div
        className="relative rounded-[40px] border-[12px] border-black bg-black shadow-2xl"
        style={{ width: 410, height: 864 }}
      >
        <div className="absolute left-1/2 top-0 h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-black" />
        <div className="absolute inset-[10px] overflow-hidden rounded-[30px] bg-white">
          {/* Scrollable phone viewport */}
          <div className="h-full w-full overflow-y-auto">
            <div className="mx-auto w-full max-w-[500px] p-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MobilePreview);
