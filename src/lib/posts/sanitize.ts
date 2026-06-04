import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "u",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "img",
];

const ALLOWED_ATTRS = {
  a: ["href", "rel", "target"],
  img: ["src", "alt"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto"];

// 게시물 이미지는 우리 Supabase Storage 버킷의 public URL만 허용.
const POST_IMAGE_RE =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/post-images\//i;

/** 저장 직전 본문 HTML을 화이트리스트 기반으로 살균. */
export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: { img: ["https"] },
    transformTags: {
      a: (_tag, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    },
    // img의 src가 우리 버킷 패턴이 아니면 통째로 제거.
    exclusiveFilter: (frame) => {
      if (frame.tag === "img") {
        const src = frame.attribs?.src ?? "";
        return !POST_IMAGE_RE.test(src);
      }
      return false;
    },
  });
}

/** 리스트 미리보기용: 모든 태그 제거 + 공백 정리 + 길이 컷. */
export function stripHtmlForPreview(html: string, maxLength = 240): string {
  const text = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}
