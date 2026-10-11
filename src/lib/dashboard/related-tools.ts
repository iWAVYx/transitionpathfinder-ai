/** Existing tools surfaced within related dashboard cards, shared with the demo. */
export type RelatedTool = { label: string; to: string; demoTo: string };
export const RELATED_TOOLS: Record<string, RelatedTool[]> = {
  "family:student-profile": [
    {
      label: "Family Priorities",
      to: "/family/priorities",
      demoTo: "/demo/workspace/family?role=family",
    },
  ],
  "family:pathway-report": [
    { label: "Goals & Progress", to: "/goals", demoTo: "/demo/plan?role=family" },
  ],
  "family:documents": [
    {
      label: "Access & Activity History",
      to: "/family/history",
      demoTo: "/demo/feature/family/history",
    },
  ],
  "family:recommended-resources": [
    { label: "Browse Resource Library", to: "/resources", demoTo: "/demo/resources?role=family" },
  ],
  "educator:readiness": [
    { label: "Goals & Progress", to: "/goals", demoTo: "/demo/plan?role=educator" },
  ],
  "educator:pathway-reports": [
    { label: "Start Pathway Builder", to: "/pathway", demoTo: "/demo/intake" },
  ],
  "educator:calendar": [
    { label: "PPT Meeting Prep", to: "/ppt-prep", demoTo: "/demo/feature/educator/meeting-prep" },
  ],
};
