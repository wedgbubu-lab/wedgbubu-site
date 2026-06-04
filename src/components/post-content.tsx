"use client";

import { useEffect, useState, type MouseEvent } from "react";

export function PostContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!expandedUrl) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpandedUrl(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expandedUrl]);

  function onArticleClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const src = (target as HTMLImageElement).src;
      if (src) setExpandedUrl(src);
    }
  }

  return (
    <>
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={onArticleClick}
      />
      {expandedUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setExpandedUrl(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedUrl(null);
            }}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/15 px-3 py-1 text-base text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            aria-label="닫기"
          >
            ✕
          </button>
          {/* 이미지 자체를 클릭하면 backdrop으로 버블링 안 되게. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedUrl}
            alt=""
            className="max-h-[92vh] max-w-[96vw] rounded-md object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
