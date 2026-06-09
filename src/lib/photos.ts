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



export const photos = {
  // ── Home / hero moments ───────────────────────────────────────────────
  // Teen student looking forward — transition-planning energy
  homeHero: u("photo-1571260899304-425eee4c7efc"),
  // High-school student studying with notebook
  homeStudent: u("photo-1434030216411-0b793f4b4173"),
  // Student with backpack walking toward school
  homeStudentPhoto: u("photo-1503676260728-1c00da094a0b"),
  // Parent and teen talking at home — family support
  homeFamily: u("photo-1543269865-cbf427effbad"),
  // Teacher working one-on-one with a student
  homeEducator: u("photo-1577896851231-70ef18881754"),
  // Path through woods — the "pathway" metaphor
  homePathway: u("photo-1441260038675-7329ab4cc264"),
  // Open road at sunrise — looking ahead
  homeRoad: u("photo-1469854523086-cc02fe5d8800"),

  // ── Pathway destinations ──────────────────────────────────────────────
  // College campus / university building
  pathCollege: u("photo-1562774053-701939374585"),
  // Hands-on trade / technical work (welding sparks)
  pathTechnical: u("photo-1504917595217-d4dc5ebe6122"),
  // Young person at work in an apprenticeship setting
  pathCareer: u("photo-1521737604893-d14cc237f11d"),
  // Community / volunteering / life skills
  pathLifeskills: u("photo-1593113598332-cd288d649433"),
  // Planning meeting around a table
  pathProgress: u("photo-1517048676732-d65bc937f952"),

  // ── Product / platform ────────────────────────────────────────────────
  // Laptop with data dashboard
  dashboard: u("photo-1551288049-bebda4e38f71"),
  // IEP / paperwork on a desk
  iepUpload: u("photo-1568667256549-094345857637"),
  // Organized notes — "organize" layer
  layerOrganize: u("photo-1454165804606-c3d57bc86b40"),
  // Writing on a laptop — "generate" layer
  layerGenerate: u("photo-1499750310107-5fef28a66643"),
  // Team collaborating — "connect" layer
  layerConnect: u("photo-1556761175-5973dc0f32e7"),
  // Library / resources
  resources: u("photo-1521587760476-6c12a4b040da"),

  // ── Section moods ─────────────────────────────────────────────────────
  // Winding path — framework / journey
  framework: u("photo-1501785888041-af3ef285b470"),
  // Library stacks — research
  research: u("photo-1507842217343-583bb7270b66"),

  // ── About ─────────────────────────────────────────────────────────────
  // Teacher mentoring a student
  about: u("photo-1580582932707-520aed937b7b"),
  // Students collaborating in a classroom
  aboutStudent: u("photo-1427504494785-3a9ca7044f45"),

  // ── Ambient backgrounds ───────────────────────────────────────────────
  bgSunrise: u("photo-1469854523086-cc02fe5d8800", 1920),
  bgTopo: u("photo-1502082553048-f009c37129b9", 1920),

  // ── Audience pages ────────────────────────────────────────────────────
  // Special-ed classroom / teacher with diverse learners
  platform: u("photo-1588072432836-e10032774350"),
  educators: u("photo-1577896851231-70ef18881754"),
  // Parent and teen — supportive family conversation
  families: u("photo-1591343395082-e120087004b4"),
};

export type PhotoKey = keyof typeof photos;
