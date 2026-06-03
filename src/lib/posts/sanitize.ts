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
];

const ALLOWED_ATTRS = {
  a: ["href", "rel", "target"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto"];

/** 저장 직전 본문 HTML을 화이트리스트 기반으로 살균. 외부 링크는 강제 noopener+target. */
export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ALLOWED_SCHEMES,
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
