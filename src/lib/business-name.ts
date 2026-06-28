export function joinedBusinessName(
  businesses: { name: string } | { name: string }[] | null | undefined,
): string {
  if (!businesses) {
    return "Business";
  }

  if (Array.isArray(businesses)) {
    return businesses[0]?.name ?? "Business";
  }

  return businesses.name;
}
