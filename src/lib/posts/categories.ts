export const POST_CATEGORIES = ["뉴스레터", "부수입정보"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export function isValidCategory(value: string): value is PostCategory {
  return (POST_CATEGORIES as readonly string[]).includes(value);
}
