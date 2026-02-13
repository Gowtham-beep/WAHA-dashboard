"use client";

import { useEffect } from "react";
import Image from "next/image";

type ScreenshotModalProps = {
  open: boolean;
  screenshot: string;
  sessionName: string;
  onClose: () => void;
};

export default function ScreenshotModal({
  open,
  screenshot,
  sessionName,
  onClose,
}: ScreenshotModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !screenshot) return null;

  const isImage = screenshot.startsWith("data:image/");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl rounded-xl border border-[#dbe3f4] bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Session Screenshot: {sessionName || "N/A"}</h3>
          <button
            onClick={onClose}
            className="rounded-md border border-[#dbe3f4] px-3 py-1 text-sm font-medium text-[rgb(41,98,255)] hover:bg-[#f3f7ff]"
          >
            Close
          </button>
        </div>
        <div className="max-h-[82vh] overflow-auto rounded-lg border border-[#dbe3f4] bg-[#f8fbff] p-3">
          {isImage ? (
            <Image
              src={screenshot}
              alt="Session screenshot large view"
              width={1800}
              height={1100}
              unoptimized
              className="h-auto w-full rounded-md object-contain"
            />
          ) : (
            <pre className="text-xs">{screenshot}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
