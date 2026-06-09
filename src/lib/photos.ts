// Curated Unsplash imagery (royalty-free under the Unsplash License).
// Each photo is hand-picked to match the subject matter of the section it
// appears in: special education, transition planning, families, educators,
// and post-secondary pathways (college, technical, career, life skills).

const base = "https://images.unsplash.com";
const u = (id: string, w = 1600) =>
  `${base}/${id}?auto=format&fit=crop&w=${w}&q=80`;

/**
 * Build a responsive srcset string for an Unsplash photo id.
 * Lets the browser pick the smallest variant that fits the viewport,
 * cutting wasted bytes on phones/tablets vs always shipping the 1600w.
 */
export const photoSrcSet = (id: string, widths: number[] = [640, 960, 1280, 1600, 1920]) =>
  widths.map((w) => `${u(id, w)} ${w}w`).join(", ");

/**
 * Raw Unsplash photo ids keyed by friendly name. Kept in sync with `photos`
 * below so callers can derive `srcSet` via `srcSetFor("homeHero")` without
 * repeating the id string.
 */
export const photoIds = {
  // ── Home / hero moments ───────────────────────────────────────────────
  homeHero: "photo-1571260899304-425eee4c7efc",
  homeStudent: "photo-1434030216411-0b793f4b4173",
  homeStudentPhoto: "photo-1503676260728-1c00da094a0b",
  homeFamily: "photo-1543269865-cbf427effbad",
  homeEducator: "photo-1577896851231-70ef18881754",
  homePathway: "photo-1441260038675-7329ab4cc264",
  homeRoad: "photo-1469854523086-cc02fe5d8800",

  // ── Pathway destinations ──────────────────────────────────────────────
  pathCollege: "photo-1562774053-701939374585",
  pathTechnical: "photo-1504917595217-d4dc5ebe6122",
  pathCareer: "photo-1521737604893-d14cc237f11d",
  pathLifeskills: "photo-1593113598332-cd288d649433",
  pathProgress: "photo-1517048676732-d65bc937f952",

  // ── Product / platform ────────────────────────────────────────────────
  dashboard: "photo-1551288049-bebda4e38f71",
  iepUpload: "photo-1568667256549-094345857637",
  layerOrganize: "photo-1454165804606-c3d57bc86b40",
  layerGenerate: "photo-1499750310107-5fef28a66643",
  layerConnect: "photo-1556761175-5973dc0f32e7",
  resources: "photo-1521587760476-6c12a4b040da",

  // ── Section moods ─────────────────────────────────────────────────────
  framework: "photo-1501785888041-af3ef285b470",
  research: "photo-1507842217343-583bb7270b66",

  // ── About ─────────────────────────────────────────────────────────────
  about: "photo-1580582932707-520aed937b7b",
  aboutStudent: "photo-1427504494785-3a9ca7044f45",

  // ── Ambient backgrounds ───────────────────────────────────────────────
  bgSunrise: "photo-1469854523086-cc02fe5d8800",
  bgTopo: "photo-1502082553048-f009c37129b9",

  // ── Audience pages ────────────────────────────────────────────────────
  platform: "photo-1588072432836-e10032774350",
  educators: "photo-1577896851231-70ef18881754",
  families: "photo-1591343395082-e120087004b4",
} as const;

export type PhotoKey = keyof typeof photoIds;

const buildPhotos = () => {
  const out = {} as Record<PhotoKey, string>;
  (Object.keys(photoIds) as PhotoKey[]).forEach((k) => {
    const w = k === "bgSunrise" || k === "bgTopo" ? 1920 : 1600;
    out[k] = u(photoIds[k], w);
  });
  return out;
};

export const photos = buildPhotos();

/** Convenience: build a responsive srcset for a known PhotoKey. */
export const srcSetFor = (key: PhotoKey, widths?: number[]) =>
  photoSrcSet(photoIds[key], widths);
