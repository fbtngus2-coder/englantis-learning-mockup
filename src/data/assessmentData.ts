export const scoringRule = [
  { range: "85-100", label: "Master", note: "충분히 숙달됨", tone: "master" },
  { range: "70-84", label: "Stable", note: "일반 복습 유지", tone: "stable" },
  { range: "50-69", label: "Weak", note: "보강 활동 추가", tone: "weak" },
  { range: "0-49", label: "Critical", note: "우선 보강 필요", tone: "critical" },
];

export const weeklyScores = [
  ["Vocabulary", 88, "Master"],
  ["Recall", 80, "Stable"],
  ["Speaking", 76, "Stable"],
  ["Sentence Build", 72, "Stable"],
  ["Grammar", 58, "Weak"],
  ["Prepositions", 45, "Critical"],
  ["Teach", 64, "Weak"],
] as const;

export const monthlyScores = [
  ["Vocabulary", 90, "Master"],
  ["Speaking", 78, "Stable"],
  ["Sentence Build", 74, "Stable"],
  ["Grammar", 62, "Weak"],
  ["Situation Use", 82, "Stable"],
  ["Teach", 70, "Stable"],
] as const;
