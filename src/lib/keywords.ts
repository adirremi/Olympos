// Category-specific keyword suggestions for local service businesses.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  locksmith: [
    "Car Lockout",
    "Car Key Make",
    "Business Lockout",
    "Rekey",
    "Lock Repair",
    "Key Replacement",
  ],
  plumber: ["Drain Cleaning", "Leak Repair", "Water Heater Repair", "Clogged Drain"],
  plumbing: ["Drain Cleaning", "Leak Repair", "Water Heater Repair", "Clogged Drain"],
  electrician: [
    "Wiring Repair",
    "Panel Upgrade",
    "Lighting Installation",
    "Outlet Repair",
  ],
  electrical: ["Wiring Repair", "Panel Upgrade", "Lighting Installation"],
  hvac: ["AC Repair", "Heating Repair", "Furnace Repair", "Air Conditioning"],
  "garage door": ["Garage Door Repair", "Spring Replacement", "Opener Repair"],
  roofing: ["Roof Repair", "Roof Replacement", "Roof Leak Repair"],
  roofer: ["Roof Repair", "Roof Replacement", "Roof Leak Repair"],
  cleaning: ["House Cleaning", "Office Cleaning", "Deep Cleaning"],
  "pest control": ["Exterminator", "Termite Control", "Rodent Control"],
  towing: ["Tow Truck", "Roadside Assistance", "Jump Start"],
  painter: ["Interior Painting", "Exterior Painting"],
  painting: ["Interior Painting", "Exterior Painting"],
  landscaping: ["Lawn Care", "Tree Trimming", "Garden Maintenance"],
  handyman: ["Home Repair", "Furniture Assembly"],
  appliance: ["Appliance Repair", "Refrigerator Repair", "Washer Repair"],
  mechanic: ["Auto Repair", "Brake Repair", "Oil Change"],
  "auto repair": ["Brake Repair", "Oil Change", "Engine Repair"],
  carpenter: ["Custom Carpentry", "Furniture Repair", "Cabinet Installation"],
  movers: ["Local Movers", "Moving Service", "Furniture Moving"],
  moving: ["Local Movers", "Moving Service", "Furniture Moving"],
};

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function detectCategory(name: string): string | null {
  const lower = name.toLowerCase();
  for (const key of Object.keys(CATEGORY_KEYWORDS)) {
    if (lower.includes(key)) {
      return key;
    }
  }
  return null;
}

// Generates suggested keywords from a business name + location.
export function suggestKeywords(
  businessName: string,
  city?: string | null,
  region?: string | null,
): string[] {
  const category = detectCategory(businessName);
  const words = businessName.trim().split(/\s+/);
  const base = category ? titleCase(category) : titleCase(words[words.length - 1] ?? businessName);

  const result = new Set<string>();
  if (base) {
    result.add(base);
    if (city) {
      result.add(`${base} ${city}`);
    }
    if (region && region !== city) {
      result.add(`${base} ${region}`);
    }
    result.add(`${base} near me`);
    result.add(`Emergency ${base}`);
  }

  if (category) {
    for (const keyword of CATEGORY_KEYWORDS[category]) {
      result.add(keyword);
    }
  }

  return [...result].filter(Boolean);
}

// Turns keywords into hashtags, e.g. "Car Lockout" -> "#CarLockout".
export function keywordsToHashtags(keywords: string[]): string {
  return keywords
    .map((keyword) => "#" + keyword.replace(/[^a-zA-Z0-9]+/g, ""))
    .filter((tag) => tag.length > 1)
    .join(" ");
}
