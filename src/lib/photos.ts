// Curated Unsplash imagery (royalty-free under the Unsplash License).
// Centralized so every page pulls from the same source of truth.
// Photo credits remain with their photographers on unsplash.com.

const base = "https://images.unsplash.com";
const u = (id: string, w = 1600) =>
  `${base}/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const photos = {
  // Hero / landscape moments
  homeHero: u("photo-1523050854058-8df90110c9f1"), // graduation caps thrown in the air
  homeStudent: u("photo-1503676260728-1c00da094a0b"), // student writing in notebook
  homeStudentPhoto: u("photo-1571260899304-425eee4c7efc"), // teen with backpack outdoors
  homeFamily: u("photo-1511895426328-dc8714191300"), // family together at table
  homeEducator: u("photo-1577896851231-70ef18881754"), // teacher with students in classroom
  homePathway: u("photo-1500382017468-9049fed747ef"), // sunlit path through field
  homeRoad: u("photo-1470770841072-f978cf4d019e"), // open road at sunrise

  // Pathway destinations
  pathCollege: u("photo-1607237138185-eedd9c632b0b"), // ivy college campus
  pathTechnical: u("photo-1581094794329-c8112a89af12"), // hands-on trade work
  pathCareer: u("photo-1521737711867-e3b97375f902"), // young professionals at work
  pathLifeskills: u("photo-1529390079861-591de354faf5"), // community volunteering
  pathProgress: u("photo-1517048676732-d65bc937f952"), // collaborative planning meeting

  // Product / platform
  dashboard: u("photo-1551288049-bebda4e38f71"), // laptop with charts
  iepUpload: u("photo-1568667256549-094345857637"), // document on desk with pen
  layerOrganize: u("photo-1454165804606-c3d57bc86b40"), // organized notes and laptop
  layerGenerate: u("photo-1486312338219-ce68d2c6f44d"), // person writing at glowing laptop
  layerConnect: u("photo-1543269865-cbf427effbad"), // team collaborating
  resources: u("photo-1532012197267-da84d127e765"), // open books library

  // Section moods
  framework: u("photo-1500380804539-4e1e8c1e7118"), // golden hour winding path
  research: u("photo-1481627834876-b7833e8f5570"), // sunlit library stacks

  // About page
  about: u("photo-1497486751825-1233686d5d80"), // teacher mentoring student
  aboutStudent: u("photo-1522202176988-66273c2fd55f"), // students collaborating

  // Framework backgrounds (ambient)
  bgSunrise: u("photo-1470770841072-f978cf4d019e", 1920),
  bgTopo: u("photo-1502082553048-f009c37129b9", 1920),

  // Platform
  platform: u("photo-1531482615713-2afd69097998"), // person working on laptop, warm
  educators: u("photo-1580582932707-520aed937b7b"), // teacher in front of class
  families: u("photo-1542810634-71277d95dcbb"), // parent and teen talking
};

export type PhotoKey = keyof typeof photos;
