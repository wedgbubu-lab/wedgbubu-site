"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const BUCKET = "post-images";

function pickExt(file: File) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  return (m?.[1] ?? "bin").toLowerCase();
}

function randomKey(file: File) {
  // crypto.randomUUID는 모던 브라우저 표준.
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${id}.${pickExt(file)}`;
}

export function ImageGalleryInput({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: string[];
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const added: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError(`이미지가 아닌 파일은 무시됨: ${file.name}`);
          continue;
        }
        const key = randomKey(file);
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(key, file, { contentType: file.type, upsert: false });
        if (upErr) {
          setError(`${file.name}: ${upErr.message}`);
          continue;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
        added.push(data.publicUrl);
      }
      if (added.length) setUrls((prev) => [...prev, ...added]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAt(idx: number) {
    setUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "업로드 중…" : "이미지 추가"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {urls.length}장 · 여러 장 동시 선택 가능
        </span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {urls.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url, i) => (
            <li
              key={url + i}
              className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              <Image
                src={url}
                alt={`업로드 이미지 ${i + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 25vw"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 rounded-full bg-background/90 px-1.5 py-0.5 text-xs font-medium text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                aria-label="제거"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
          업로드된 이미지가 없습니다.
        </p>
      )}

      <input type="hidden" name={name} value={JSON.stringify(urls)} />
    </div>
  );
}
