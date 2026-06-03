export type CategoryAccent = {
  bg: string;
  text: string;
};

const ACCENTS: Record<string, CategoryAccent> = {
  부수입정보: { bg: "#D7E3F9", text: "#4D81EE" },
  뉴스레터: { bg: "#D5F2E3", text: "#5DC880" },
};

export function getCategoryAccent(
  category: string | null | undefined,
): CategoryAccent | null {
  if (!category) return null;
  return ACCENTS[category] ?? null;
}
