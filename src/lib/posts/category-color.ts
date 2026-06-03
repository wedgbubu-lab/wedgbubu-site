export type CategoryAccent = {
  hex: string;
};

const ACCENTS: Record<string, CategoryAccent> = {
  부수입정보: { hex: "#FFB88A" },
  뉴스레터: { hex: "#FFF689" },
};

export function getCategoryAccent(
  category: string | null | undefined,
): CategoryAccent | null {
  if (!category) return null;
  return ACCENTS[category] ?? null;
}
