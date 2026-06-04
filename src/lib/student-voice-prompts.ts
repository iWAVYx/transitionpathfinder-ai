// Age-appropriate Student Voice prompts. Shared by client + server.
// Keep wording warm, plain-language, student-facing.

export type StudentVoicePrompt = {
  key: string;
  question: string;
  helper?: string;
  ageBands: Array<"middle" | "early-high" | "late-high" | "post-secondary">;
};

export const STUDENT_VOICE_PROMPTS: StudentVoicePrompt[] = [
  {
    key: "strengths",
    question: "What are you good at?",
    helper: "Things you do well — at school, at home, or anywhere.",
    ageBands: ["middle", "early-high", "late-high", "post-secondary"],
  },
  {
    key: "enjoy",
    question: "What do you really enjoy doing?",
    helper: "Activities, hobbies, or moments that make you feel like you.",
    ageBands: ["middle", "early-high", "late-high", "post-secondary"],
  },
  {
    key: "hard",
    question: "What feels hard or frustrating right now?",
    helper: "It's okay to be honest. Your team can help.",
    ageBands: ["middle", "early-high", "late-high", "post-secondary"],
  },
  {
    key: "support",
    question: "What kind of help works best for you?",
    helper: "How do you like to learn or get support?",
    ageBands: ["middle", "early-high", "late-high", "post-secondary"],
  },
  {
    key: "future-work",
    question: "What kind of work or job sounds interesting?",
    helper: "Even if you're not sure — what sounds cool or worth trying?",
    ageBands: ["early-high", "late-high", "post-secondary"],
  },
  {
    key: "future-learn",
    question: "After high school, do you want to keep learning?",
    helper: "College, trade school, a certificate, on-the-job — anything counts.",
    ageBands: ["early-high", "late-high", "post-secondary"],
  },
  {
    key: "living",
    question: "Where and how do you want to live as an adult?",
    helper: "Living with family, with roommates, on your own, with support — your choice.",
    ageBands: ["late-high", "post-secondary"],
  },
  {
    key: "community",
    question: "How do you want to spend time with other people?",
    helper: "Friends, clubs, faith, volunteering, sports — what matters to you?",
    ageBands: ["middle", "early-high", "late-high", "post-secondary"],
  },
  {
    key: "voice-meeting",
    question: "What do you want your team to know at your next meeting?",
    helper: "One thing they should hear from you, in your words.",
    ageBands: ["middle", "early-high", "late-high", "post-secondary"],
  },
];
