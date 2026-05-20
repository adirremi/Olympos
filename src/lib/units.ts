export type AccentColor = "blood" | "gold" | "steel" | "ink";

export type Ambience =
  | "ocean"
  | "sky"
  | "topo"
  | "forest"
  | "altitude"
  | "crystal"
  | "desert"
  | "grid";

export type UnitTheme = {
  value: string;
  hebrewName: string;
  code: string;
  englishName: string;
  tagline: string;
  motto: string;
  accent: AccentColor;
  assetPath: string;
  ambience: Ambience;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    onPrimary: string;
    ink: string;
  };
  emblem: "wings" | "anchor" | "blade" | "rescue" | "diamond" | "parachute" | "shield" | "compass";
};

export const unitThemes: Record<string, UnitTheme> = {
  sayeret_matkal: {
    value: "sayeret_matkal",
    hebrewName: 'סיירת מטכ"ל',
    code: "SAYERET MATKAL",
    englishName: "General Staff Reconnaissance",
    tagline: 'מי שמעז · מנצח',
    motto: 'סיור עמוק · ניווט · קור רוח',
    accent: "ink",
    assetPath: "/unit-assets/sayeret-matkal.jpg",
    ambience: "topo",
    palette: {
      primary: "#111418",
      secondary: "#2a2f36",
      accent: "#c0a062",
      surface: "#f3f1ec",
      onPrimary: "#f3f1ec",
      ink: "#0c0d10",
    },
    emblem: "wings",
  },
  shayetet_13: {
    value: "shayetet_13",
    hebrewName: "שייטת 13",
    code: "SHAYETET 13",
    englishName: "Naval Commando",
    tagline: "כעטלף בלילה · ים סלע ברזל",
    motto: "ים · קומנדו · שליטה תחת לחץ",
    accent: "steel",
    assetPath: "/unit-assets/shayetet-13.gif",
    ambience: "ocean",
    palette: {
      primary: "#0a2540",
      secondary: "#1d5b96",
      accent: "#e6f2fb",
      surface: "#eef5fb",
      onPrimary: "#f3f8fc",
      ink: "#06182a",
    },
    emblem: "anchor",
  },
  commando: {
    value: "commando",
    hebrewName: "חטיבת קומנדו",
    code: "COMMANDO BRIGADE",
    englishName: "Oz Brigade · 89",
    tagline: "אגוז · מגלן · דובדבן · רימון",
    motto: "ייעודית · מסתערבים · עומק שטח",
    accent: "ink",
    assetPath: "/unit-assets/maglan.png",
    ambience: "forest",
    palette: {
      primary: "#2f3a25",
      secondary: "#5a6a3d",
      accent: "#d9c98a",
      surface: "#f1eee0",
      onPrimary: "#f2efe2",
      ink: "#1a1e13",
    },
    emblem: "blade",
  },
  "669_shaldag": {
    value: "669_shaldag",
    hebrewName: "669 / שלדג",
    code: "UNIT 669 · SHALDAG",
    englishName: "CSAR · Air Force Commando",
    tagline: "חילוץ · הצלה · מבצעים מיוחדים",
    motto: "חילוץ קרבי · אוויר · דיוק",
    accent: "blood",
    assetPath: "/unit-assets/669.png",
    ambience: "altitude",
    palette: {
      primary: "#1f3a5f",
      secondary: "#3c6ea0",
      accent: "#c8202a",
      surface: "#eef3f8",
      onPrimary: "#f3f6fa",
      ink: "#0d1c2e",
    },
    emblem: "rescue",
  },
  yahalom_oketz: {
    value: "yahalom_oketz",
    hebrewName: "יהלום / עוקץ",
    code: "YAHALOM · OKETZ",
    englishName: "Special Engineering · K9",
    tagline: "הנדסה מבצעית · כלבני קרב",
    motto: "הנדסה מיוחדת · כלבנות · ציר נקי",
    accent: "steel",
    assetPath: "/unit-assets/yahalom.png",
    ambience: "crystal",
    palette: {
      primary: "#1e3a8a",
      secondary: "#3957b8",
      accent: "#c5a572",
      surface: "#eef1f9",
      onPrimary: "#f1f3fa",
      ink: "#0f1a3c",
    },
    emblem: "diamond",
  },
  paratroopers: {
    value: "paratroopers",
    hebrewName: "צנחנים",
    code: "PARATROOPERS",
    englishName: "35th Brigade · Red Beret",
    tagline: "הכומתה האדומה · עד הסוף",
    motto: "חי״ר מובחר · כומתה אדומה · קצב גבוה",
    accent: "blood",
    assetPath: "/unit-assets/paratroopers.png",
    ambience: "sky",
    palette: {
      primary: "#7a1418",
      secondary: "#b22531",
      accent: "#f5e9c8",
      surface: "#f6efe1",
      onPrimary: "#f7ecd9",
      ink: "#1a0708",
    },
    emblem: "parachute",
  },
  combat_service: {
    value: "combat_service",
    hebrewName: "שירות קרבי משמעותי",
    code: "COMBAT SERVICE",
    englishName: "Meaningful Combat Service",
    tagline: "כל יום · כל אימון · בלי תירוצים",
    motto: "כשירות קרבית · משמעת · רצף",
    accent: "ink",
    assetPath: "/unit-assets/combat-service.png",
    ambience: "grid",
    palette: {
      primary: "#3b4632",
      secondary: "#6b6a4a",
      accent: "#d6c890",
      surface: "#efeadb",
      onPrimary: "#f1ede4",
      ink: "#161814",
    },
    emblem: "shield",
  },
  pilot_navy: {
    value: "pilot_navy",
    hebrewName: "טיס / חובלים / צוללות",
    code: "PILOT · NAVY",
    englishName: "Pilot Course · Naval Officers",
    tagline: "אוויר · ים · עומק",
    motto: "אוויר · ים · ניווט · החלטה",
    accent: "gold",
    assetPath: "/unit-assets/air-force.jpg",
    ambience: "altitude",
    palette: {
      primary: "#142b46",
      secondary: "#1e4a78",
      accent: "#c5a572",
      surface: "#ecf2f8",
      onPrimary: "#eef3f8",
      ink: "#0a1726",
    },
    emblem: "compass",
  },
};

export function getUnitTheme(value: string | null | undefined): UnitTheme {
  if (value && unitThemes[value]) {
    return unitThemes[value];
  }
  return unitThemes.combat_service;
}

export const accentBg: Record<AccentColor, string> = {
  blood: "bg-blood text-paper",
  gold: "bg-gold text-ink",
  steel: "bg-steel text-paper",
  ink: "bg-ink text-paper",
};

export const accentText: Record<AccentColor, string> = {
  blood: "text-blood",
  gold: "text-gold",
  steel: "text-steel",
  ink: "text-ink",
};
