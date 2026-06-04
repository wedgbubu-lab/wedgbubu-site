"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TipImage from "@tiptap/extension-image";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const BUCKET = "post-images";

function pickExt(file: File) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  return (m?.[1] ?? "bin").toLowerCase();
}

function randomKey(file: File) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${id}.${pickExt(file)}`;
}

export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "본문을 작성하세요…",
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [html, setHtml] = useState<string>(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TipImage.configure({
        inline: false,
        HTMLAttributes: { class: "post-image" },
      }),
    ],
    content: defaultValue,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap ProseMirror px-3 py-3",
        "data-placeholder": placeholder,
      },
    },
    onUpdate({ editor }) {
      setHtml(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  // defaultValue 자체는 폼 reset/server 액션 후 페이지 재렌더 시 새로 들어올 수 있음.
  useEffect(() => {
    if (!editor) return;
    if (defaultValue !== editor.getHTML()) {
      editor.commands.setContent(defaultValue || "", { emitUpdate: false });
      setHtml(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  async function uploadAndInsert(files: FileList | null) {
    if (!editor || !files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    const supabase = createClient();
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setUploadError(`이미지가 아닌 파일은 건너뜀: ${file.name}`);
          continue;
        }
        const key = randomKey(file);
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(key, file, { contentType: file.type, upsert: false });
        if (upErr) {
          setUploadError(`${file.name}: ${upErr.message}`);
          continue;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
        editor
          .chain()
          .focus()
          .setImage({ src: data.publicUrl, alt: file.name })
          .createParagraphNear()
          .run();
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-md border bg-background">
      <Toolbar
        editor={editor}
        onPickImage={uploadAndInsert}
        uploading={uploading}
      />
      <EditorContent editor={editor} />
      {uploadError ? (
        <p className="border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {uploadError}
        </p>
      ) : null}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function Toolbar({
  editor,
  onPickImage,
  uploading,
}: {
  editor: Editor | null;
  onPickImage: (files: FileList | null) => void;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!editor) {
    return <div className="h-10 border-b" />;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-1.5">
      <ToolBtn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="굵게"
      >
        <span className="font-bold">B</span>
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="기울임"
      >
        <span className="italic">I</span>
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="취소선"
      >
        <span className="line-through">S</span>
      </ToolBtn>

      <Divider />

      <ToolBtn
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        title="제목 2"
      >
        H2
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        title="제목 3"
      >
        H3
      </ToolBtn>

      <Divider />

      <ToolBtn
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="목록"
      >
        •
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="번호 목록"
      >
        1.
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="인용"
      >
        ❝
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="인라인 코드"
      >
        {"</>"}
      </ToolBtn>

      <Divider />

      <ToolBtn
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href ?? "";
          const url = window.prompt("URL", prev);
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
        }}
        title="링크"
      >
        🔗
      </ToolBtn>
      <ToolBtn
        onClick={() => fileRef.current?.click()}
        title="이미지 추가 (여러 장 선택 가능)"
      >
        {uploading ? "…" : "🖼"}
      </ToolBtn>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onPickImage(e.target.files);
          e.target.value = "";
        }}
      />

      <Divider />

      <ToolBtn
        onClick={() => editor.chain().focus().undo().run()}
        title="실행 취소"
      >
        ↶
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().redo().run()}
        title="다시 실행"
      >
        ↷
      </ToolBtn>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" />;
}

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs transition-colors hover:bg-muted",
        active && "bg-muted font-semibold text-foreground",
      )}
    >
      {children}
    </button>
  );
}
