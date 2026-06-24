export type SessionStatus =
  | "completed"
  | "current"
  | "locked"
  | "completed-review"
  | "locked-review"
  | "locked-monthly-review";

const topics = [
  ["Vehicles & Actions", "Move through the mist", "Skyway Check"],
  ["Direction Words", "Places & Prepositions", "Map & Preposition Review"],
  ["Travel Phrases", "Let's Expressions", "Journey Check"],
  ["Mission Practice", "Final Reinforcement", "Englantis Travel Guide"],
];

export const sessions = Array.from({ length: 20 }, (_, index) => {
  const week = Math.floor(index / 5) + 1;
  const day = (index % 5) + 1;
  const id = `w${week}d${day}`;
  const isReview = day === 5;
  let status: SessionStatus = "locked";
  if (index < 7) status = isReview ? "completed-review" : "completed";
  if (id === "w2d3") status = "current";
  if (isReview && index > 7) status = week === 4 ? "locked-monthly-review" : "locked-review";

  return {
    id,
    week,
    day,
    title: isReview ? topics[week - 1][2] : topics[week - 1][Math.min(day - 1, 1)],
    status,
    type: week === 4 && day === 5 ? "monthly" : isReview ? "weekly" : "daily",
  };
});

export const dailyModule = {
  title: "Places and Prepositions",
  subtitle: "위치를 알려주는 마법 좌표",
  city: "Grammia",
  master: "Gram",
  companion: "Pix",
  vocab: ["between", "near", "bank", "hospital", "magazine", "university"],
  keySentence: "He is standing between a bank and a hospital.",
};
