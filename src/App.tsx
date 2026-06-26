import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { scoringRule, weeklyScores, monthlyScores } from "./data/assessmentData";
import { activityGuides, activityLibrary, activityPhaseCopy, todayActivityLinks } from "./data/activityAtlas";
import { courseNodes, sessionIcons } from "./data/courseMap";
import { cultistGrammarCases } from "./data/cultistGrammarQuestions";
import { doActivityAssets, doActivityBackgroundByItem } from "./data/doActivityAssets";
import { doHubMissions } from "./data/doMissions";
import {
  fogBossDescriptions,
  fogBossModes,
  fogCityDescriptions,
  fogFamilies,
  fogModeDescriptions,
} from "./data/fogBattleData";
import {
  rhythmBeatMs,
  rhythmLaneTop,
  rhythmLeadMs,
  rhythmNotes,
  rhythmTotalMs,
} from "./data/rhythmGame";
import { sceneAssets } from "./data/sceneAssets";
import { dailyModule, sessions } from "./data/learningPath";
import {
  monthlyQuestions,
  npcQuestions,
  runePuzzles,
  sentenceQuestions,
  weeklyQuestions,
} from "./data/practiceQuestions";
import { student } from "./data/studentProfile";
import { defaultTeachLesson } from "./data/teachLessons";
import { letsTeachMissionSteps } from "./data/teachMissions";
import { watchScenes } from "./data/watchScenes";
import type { WatchLecture } from "./data/watchScenes";
import {
  buildTeachResult,
  getCurrentTeachStep,
  getTeachInputForLevel,
  startTeachSession,
  submitTeachAnswer,
} from "./lib/teachAI/mockTeachEngine";
import { sendTeachAiMessage } from "./lib/teachAI/teachApiClient";
import { sendWatchPixQuestion } from "./lib/watchAI/watchPixClient";
import type { WatchPixResponse } from "./lib/watchAI/watchTypes";
import { useGameAudio } from "./lib/useGameAudio";
import type {
  ScaffoldLevel,
  TeachEvaluation,
  TeachMissionStep,
  TeachResult,
  TeachSessionState,
} from "./lib/teachAI/teachTypes";
import { StoryIntro } from "./components/story-intro/StoryIntro";
import type { ActivityItem, ActivityPhase, RhythmJudgement, RhythmKey } from "./types/activity";
import type { CultistNpc } from "./data/cultistGrammarQuestions";
import type { FogBattleState, FogSetupStep } from "./types/fog";
import type { DoMission, Screen } from "./types/navigation";

function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  return (
    <button className={`button button-${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Panel({
  children,
  className = "",
  eyebrow,
}: {
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
}) {
  return (
    <section className={`parchment-panel ${className}`}>
      {eyebrow && <div className="panel-eyebrow">{eyebrow}</div>}
      {children}
    </section>
  );
}

function RewardToast({
  show,
  label = "+200 LINGO",
  message = "잘했어요! 오늘 표현을 정확히 사용했어요.",
}: {
  show: boolean;
  label?: string;
  message?: string;
}) {
  if (!show) return null;

  return (
    <div className="reward-toast" role="status" aria-live="polite">
      <img src={doActivityAssets.exploration.treasureOpen} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.hidden = true; }} />
      <span>
        <b>{message}</b>
        <small>{label}</small>
      </span>
    </div>
  );
}

function characterSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function Character({ name, role, side = "left" }: { name: string; role: string; side?: "left" | "right" }) {
  const slug = characterSlug(name);
  const image = slug === "gram"
    ? sceneAssets.characters.gram
    : slug === "dr-lexi"
      ? sceneAssets.characters.gram
    : slug === "pix"
      ? sceneAssets.characters.pix
    : slug === "milo"
      ? sceneAssets.characters.milo
      : undefined;
  return (
    <div className={`character character-${side} character-${slug} ${image ? "character-image" : ""}`}>
      <div className="character-aura" />
      <div className="character-portrait">
        {image ? <img src={image} alt={name} /> : <span>{name === "Pix" ? "P" : name.slice(0, 1)}</span>}
      </div>
      <div className="character-meta">
        <b>{name}</b>
        <small>{role}</small>
      </div>
    </div>
  );
}

function activityCastFor(item: ActivityItem, phase: ActivityPhase) {
  const base = {
    main: phase === "watch" ? sceneAssets.characters.gram : phase === "teach" ? sceneAssets.characters.lexipraise : sceneAssets.characters.jiho,
    ally: sceneAssets.characters.pix,
    enemy: "",
    className: `cast-${phase}`,
    mainAlt: phase === "watch" ? "Master Gram teaching" : phase === "teach" ? "Dr. Lexi coaching" : "Jinho ready for action",
  };

  if (phase === "watch") {
    return {
      ...base,
      ally: item.id === "watch-checkpoint" ? sceneAssets.characters.pixhappy : sceneAssets.characters.pix,
      className: `cast-watch cast-${item.id}`,
    };
  }

  if (phase === "teach") {
    return {
      ...base,
      main: item.id === "teach-pronunciation" ? sceneAssets.characters.gram : sceneAssets.characters.lexipraise,
      ally: sceneAssets.characters.pixhappy,
      className: `cast-teach cast-${item.id}`,
      mainAlt: item.id === "teach-pronunciation" ? "Master Gram listening" : "Dr. Lexi coaching",
    };
  }

  const enemyIds = new Set(["do-battle", "do-fog-lab", "do-slingshot"]);
  const guideIds = new Set(["do-workshop", "do-detective", "do-slingshot", "do-fog-lab"]);
  const doCastOverrides: Record<string, Partial<{ main: string; ally: string; enemy: string; mainAlt: string }>> = {
    "do-workshop": { main: doActivityAssets.workshop.artisanIdle, mainAlt: "Artisan Tain at the magic workshop" },
    "do-detective": { main: doActivityAssets.detective.miroPoint, mainAlt: "Archivist Miro pointing at evidence" },
    "do-roleplay": { main: doActivityAssets.npcMissionTalk.miloConfused, mainAlt: "Milo asking for directions" },
    "do-slingshot": { main: doActivityAssets.slingshot.jihoAim, enemy: doActivityAssets.slingshot.targetCorrect, mainAlt: "Jiho aiming a magic slingshot" },
    "do-fog-lab": { enemy: doActivityAssets.fogLab.boss },
  };
  const castOverride = doCastOverrides[item.id] ?? {};

  return {
    ...base,
    main: castOverride.main ?? (guideIds.has(item.id) ? sceneAssets.characters.lexipraise : item.id === "do-roleplay" ? sceneAssets.characters.gram : sceneAssets.characters.jiho),
    ally: castOverride.ally ?? (item.id === "do-explore" || item.id === "do-runner" ? sceneAssets.characters.pixhappy : sceneAssets.characters.pix),
    enemy: castOverride.enemy ?? (enemyIds.has(item.id) ? sceneAssets.characters.fogmon : ""),
    className: `cast-do cast-${item.id}`,
    mainAlt: castOverride.mainAlt ?? (guideIds.has(item.id) ? "Dr. Lexi guiding the mission" : item.id === "do-roleplay" ? "Master Gram roleplaying" : "Jinho in the mission"),
  };
}

const doMissionBriefs: Record<string, { title: string; mission: string; control: string; pix: string }> = {
  "do-battle": {
    title: "안개 문장을 정화하기",
    mission: "빈칸이 있는 문장을 보고 가장 자연스러운 영어 단서를 골라 안개를 걷어냅니다.",
    control: "선택지를 클릭하면 바로 판정됩니다. 맞으면 문장석이 정화되고, 틀리면 PIX가 다시 볼 단서를 알려줍니다.",
    pix: "빈칸 앞뒤 관계를 먼저 보세요. 두 장소 사이를 말하면 between이 강한 단서예요.",
  },
  "do-assembly": {
    title: "룬을 순서대로 조립하기",
    mission: "흩어진 단어 룬을 올바른 문장 순서로 끼워 문장 장치를 다시 켭니다.",
    control: "단어 타일을 차례대로 누른 뒤 장치를 작동시켜 확인합니다.",
    pix: "주어, 동사, 위치 표현 순서로 보면 문장 길이 길어져도 덜 헷갈려요.",
  },
  "do-roleplay": {
    title: "Milo에게 길 알려주기",
    mission: "길을 잃은 Milo의 질문을 듣고 오늘 배운 위치 표현으로 목적지를 설명합니다.",
    control: "직접 타이핑하거나 음성 버튼을 눌러 답합니다. 장소 관계를 넣을수록 설득력이 올라갑니다.",
    pix: "near만 쓰면 가까움, between을 쓰면 두 장소 사이 관계까지 알려줄 수 있어요.",
  },
  "do-cultist": {
    title: "수상한 신도 찾기",
    mission: "세 NPC의 문장을 듣고 위치 전치사 신호가 깨진 후보를 찾아냅니다.",
    control: "후보를 눌러 문장을 확인하고, 모두 들은 뒤 의심되는 NPC를 지목합니다.",
    pix: "모양이 아니라 between, near, on이 장소 단서와 맞는지 비교해야 진짜 후보를 찾을 수 있어요.",
  },
  "do-fog-lab": {
    title: "안개몬 배틀 실험",
    mission: "도시, 안개몬, 배틀 방식을 고른 뒤 영어 문제로 반전 LV를 낮춥니다.",
    control: "정답 룬을 고르고 정화 구슬을 적에게 보내거나 공격 버튼을 누릅니다.",
    pix: "배틀은 선택 화면과 전투 화면이 나뉘어요. 먼저 조합을 고른 뒤 출전하세요.",
  },
  "do-explore": {
    title: "동굴 보물 탐험",
    mission: "힌트를 읽고 맞는 단어 유물을 모아 동굴 안쪽 보물문을 엽니다.",
    control: "유물 카드를 클릭해 수집합니다. 함정 단어를 누르면 PIX가 다시 힌트를 줍니다.",
    pix: "단어 뜻만 보지 말고 장면의 분위기와 힌트를 같이 읽어보세요.",
  },
  "do-workshop": {
    title: "마법 공방 제작",
    mission: "제작서를 읽고 순서 표현에 맞게 재료를 배열해 물약을 완성합니다.",
    control: "First, Next, Then, Finally 흐름에 맞게 레시피 카드를 누릅니다.",
    pix: "순서 연결어는 글의 길을 만들어줘요. 첫 단계와 마지막 단계를 먼저 잡아보세요.",
  },
  "do-detective": {
    title: "탐정 증거 연결",
    mission: "짧은 사건 기록을 읽고 결론을 직접 뒷받침하는 결정적 단서를 고릅니다.",
    control: "증거 카드를 클릭합니다. 맞는 증거는 사건판에 연결선이 생깁니다.",
    pix: "그럴듯한 정보와 결정적 증거는 달라요. 질문에 바로 답하는 문장을 찾으세요.",
  },
  "do-runner": {
    title: "WASD 룬 러너",
    mission: "캐릭터를 움직여 빛 단어 룬을 모으고 함정 단어를 피합니다.",
    control: "WASD 또는 방향키로 이동합니다. 화면 오른쪽 이동 버튼도 사용할 수 있습니다.",
    pix: "밝음과 관련된 단어만 모으세요. silent처럼 관계없는 단어는 함정이에요.",
  },
  "do-rhythm": {
    title: "리듬 주문 캐스팅",
    mission: "박자에 맞춰 A, S, D, F 키를 눌러 상황에 맞는 전치사 주문을 완성합니다.",
    control: "Start Beat를 누르고 현재 문제에 보이는 한 단어 버튼을 선택합니다.",
    pix: "초급 모드는 판정이 넉넉해요. 먼저 between, near, on의 장소 단서를 보고 누르세요.",
  },
  "do-slingshot": {
    title: "새총 단어 사격",
    mission: "뜻에 맞는 단어 표적을 찾아 마법 구슬을 당겨 맞힙니다.",
    control: "구슬을 왼쪽 아래로 끌어당긴 뒤 놓으면 반대 방향으로 발사됩니다. 드래그가 어려우면 구슬을 한 번 클릭해 예시 발사를 볼 수 있습니다.",
    pix: "조준선 끝이 실제 도착 방향이에요. radiant 표적의 중심을 노려보세요.",
  },
};

function evaluateMiloBakeryAnswer(answer: string) {
  const normalized = answer.toLowerCase().replace(/\s+/g, " ").trim();
  const mentionsBank = /\bbank\b/.test(normalized);
  const usesNearBank =
    (/\bnear\b/.test(normalized) && mentionsBank)
    || /\bnext to\b.*\bbank\b/.test(normalized)
    || /\bbank\b.*\bnext to\b/.test(normalized)
    || /\bclose to\b.*\bbank\b/.test(normalized)
    || /\bbank\b.*\bclose to\b/.test(normalized);
  const misleadingBetween =
    /\bbetween\b/.test(normalized)
    && /\bbank\b/.test(normalized)
    && /\bhospital\b/.test(normalized);

  if (misleadingBetween) {
    return {
      correct: false,
      message: "Milo는 old bakery가 bank 근처인지 묻고 있어요. bank와 hospital 사이에 있다는 다른 장소 설명은 다시 확인해보세요.",
    };
  }

  if (answer.trim().length < 12 || !usesNearBank) {
    return {
      correct: false,
      message: "old bakery가 bank 근처라는 상황이 드러나게 near the bank 또는 next to the bank로 안내해보세요.",
    };
  }

  return {
    correct: true,
    message: "좋아요. Milo가 old bakery가 bank 근처에 있다는 위치 관계를 이해했어요!",
  };
}

const todayDoMissionScreens: Record<string, Screen> = {
  "do-battle": "sentence",
  "do-assembly": "rune",
  "do-roleplay": "npc",
  "do-cultist": "cultist",
};

function DialogueBox({
  speaker,
  text,
  onNext,
  button = "계속",
}: {
  speaker: string;
  text: string;
  onNext?: () => void;
  button?: string;
}) {
  return (
    <div className="dialogue-box">
      <span className="dialogue-name">{speaker}</span>
      <p>{text}</p>
      {onNext && (
        <button className="dialogue-next" onClick={onNext}>
          {button} <span>›</span>
        </button>
      )}
    </div>
  );
}

function ProgressBar({ value, label, tone = "mint" }: { value: number; label?: string; tone?: "mint" | "gold" | "fog" }) {
  const displayValue = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress-wrap">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <b>{displayValue}%</b>
        </div>
      )}
      <div className="progress-track">
        <div className={`progress-fill ${tone}`} style={{ width: `${displayValue}%` }} />
      </div>
    </div>
  );
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const tone = score >= 85 ? "master" : score >= 70 ? "stable" : score >= 50 ? "weak" : "critical";
  return (
    <div className={`score-badge score-${tone}`}>
      <b>{score}</b>
      <span>{label}</span>
    </div>
  );
}

function ChoiceList({
  choices,
  onChoose,
  selected,
  answer,
  reveal = false,
  locked = false,
}: {
  choices: readonly string[];
  onChoose: (choice: string) => void;
  selected?: string;
  answer?: string;
  reveal?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="choice-list">
      {choices.map((choice, index) => {
        const state =
          reveal && choice === answer ? " correct" : reveal && choice === selected && choice !== answer ? " wrong" : selected === choice ? " selected" : "";
        return (
          <button
            key={choice}
            className={`choice${state}`}
            onClick={() => onChoose(choice)}
            disabled={locked && reveal}
            aria-label={`${String.fromCharCode(65 + index)}. ${choice}`}
          >
            <span className="choice-key" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
            <span className="choice-text">{choice}</span>
          </button>
        );
      })}
    </div>
  );
}

function SuccessBurst({ label = "CORRECT SIGNAL" }: { label?: string }) {
  return (
    <div className="success-burst" role="status" aria-live="polite">
      <span>{label}</span>
      {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
    </div>
  );
}

const cultistAssets = {
  hidden: "/assets/characters/cultist-do/01_common_robed_hidden_npc.png",
  cultistIdle: "/assets/characters/cultist-do/02_revealed_cultist_idle.png",
  cultistFleeing: "/assets/characters/cultist-do/03_revealed_cultist_fleeing.png",
  innocentMale: "/assets/characters/cultist-do/04_innocent_npc_male_wrong_accused.png",
  innocentFemale: "/assets/characters/cultist-do/05_innocent_npc_female_wrong_accused.png",
  hammerHero: "/assets/characters/cultist-do/06_protagonist_squeaky_hammer_attack.png",
  ambiguousRobe: "/assets/characters/cultist-do/07_hooded_ambiguous_npc.png",
  friendlyFemale: "/assets/characters/cultist-do/08_friendly_npc_female.png",
  suspiciousScholar: "/assets/characters/cultist-do/09_suspicious_scholar_cultist_candidate.png",
  altFleeing: "/assets/characters/cultist-do/10_alt_simple_robed_fleeing.png",
};

function cultistNpcImage(npc: CultistNpc, isTarget: boolean, phase: CultistMissionPhase) {
  if (!isTarget) return cultistAssets.hidden;
  if (phase === "wrongAccused") {
    return npc.reactionType === "femaleInnocent" ? cultistAssets.innocentFemale : cultistAssets.innocentMale;
  }
  if (phase === "correctReveal") return cultistAssets.suspiciousScholar;
  if (phase === "cultistFleeing") return cultistAssets.altFleeing;
  return npc.id === "b" ? cultistAssets.ambiguousRobe : cultistAssets.hidden;
}

function cultistWrongAccusedLine(npc: CultistNpc) {
  return npc.reactionType === "femaleInnocent"
    ? `저는 "${npc.sentence}"라고 맞게 말했어요!`
    : `난 "${npc.sentence}"라고 말했다고요!`;
}

function Header({
  screen,
  navigate,
  audioEnabled,
  toggleAudio,
}: {
  screen: Screen;
  navigate: (screen: Screen) => void;
  audioEnabled: boolean;
  toggleAudio: () => void;
}) {
  const learningScreens: Screen[] = ["daily-intro", "watch", "do-hub", "sentence", "rune", "npc", "teach", "daily-result"];
  const step = learningScreens.indexOf(screen);
  const activePhase = step <= 1 ? 0 : step <= 5 ? 1 : step === 6 ? 2 : 3;
  return (
    <header className="topbar">
      <button className="brand" onClick={() => navigate("home")}>
        <span className="brand-mark">E</span>
        <span>
          <b>ENGLANTIS</b>
          <small>English restores the world</small>
        </span>
      </button>
      {step >= 0 ? (
        <div className="journey-progress">
          {["Watch", "Do", "Teach", "Result"].map((item, index) => {
            const active = index === activePhase;
            const done = index < activePhase;
            return <span className={active ? "active" : done ? "done" : ""} key={item}>{item}</span>;
          })}
        </div>
      ) : (
        <div className="topbar-title">
          {screen === "activity-lab"
            ? "Activity Atlas - Experience Lab"
            : screen === "course-select"
              ? "Today's Journey - Course Gate"
              : "The city-state of grammar - Grammia"}
        </div>
      )}
      <div className="topbar-actions">
        <button
          className={`audio-toggle ${audioEnabled ? "is-on" : ""}`}
          onClick={toggleAudio}
          aria-pressed={audioEnabled}
          aria-label={audioEnabled ? "배경음과 효과음 끄기" : "배경음과 효과음 켜기"}
        >
          <span className="audio-toggle-light" aria-hidden="true" />
          <span>{audioEnabled ? "SOUND ON" : "SOUND OFF"}</span>
        </button>
        <div className="student-chip">
          <div className="student-level">LV {student.level}</div>
          <div>
            <b>{student.name}</b>
            <small>{student.lingco} Lingco</small>
          </div>
        </div>
      </div>
    </header>
  );
}

function Home({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="page home-page">
      <div className="home-hero">
        <div className="hero-copy">
          <div className="kicker">Chapter 01 · Grammia</div>
          <h1>Restore the<br /><em>magic of language.</em></h1>
          <p>Watch. Do. Teach. 오늘 배운 영어로 안개 속 도시의 길을 다시 밝혀보세요.</p>
           <div className="hero-actions">
             <Button onClick={() => navigate("course-select")}>Enter the Englantis</Button>
             <Button variant="ghost" onClick={() => navigate("story-intro")}>스토리 확인하기</Button>
             <Button variant="ghost" onClick={() => navigate("map")}>Open Learning Map</Button>
             <Button variant="ghost" onClick={() => navigate("activity-lab")}>Explore Activity Atlas</Button>
           </div>
          <div className="hero-stats">
            <div><span>Current city</span><b>Grammia</b></div>
            <div><span>Week streak</span><b>8 days</b></div>
            <div><span>Fog restored</span><b>68%</b></div>
          </div>
        </div>
        <div className="city-orb">
          <div className="orb-ring ring-one" />
          <div className="orb-ring ring-two" />
          <div className="city-silhouette">
            <i /><i /><i /><i /><i />
          </div>
          <div className="orb-label"><span>GRAMMIA</span><b>City of Grammar</b></div>
        </div>
      </div>
      <section className="dashboard-grid">
        <Panel className="today-card" eyebrow="Today's Quest">
          <div className="quest-number">W2 · D3</div>
          <h2>Places and Prepositions</h2>
          <p>위치를 알려주는 마법 좌표</p>
          <div className="pix-note"><b>Pix:</b> 오늘은 Grammia의 길 표지판을 복원해야 해. between과 near를 배워보자!</div>
          <Button onClick={() => navigate("course-select")}>Open Course Gate</Button>
        </Panel>
        <div className="side-stack">
          <Panel eyebrow="LV Progress">
            <ProgressBar value={student.lvProgress} label="Level 12 · Pathfinder" tone="gold" />
            <p className="muted">다음 레벨까지 320 LV</p>
          </Panel>
          <button className="report-preview" onClick={() => navigate("parent")}>
            <div><small>For Parent</small><b>Monthly Learning Report</b><span>학습 성장을 한눈에 확인하세요</span></div>
            <strong>↗</strong>
          </button>
        </div>
      </section>
    </main>
  );
}

function CourseSelect({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="page course-select-page">
      <div className="course-heading">
        <div>
          <span className="kicker">Today's Journey</span>
          <h1>Choose today's course.</h1>
          <p>Restored courses stay lit, future gates are dimmed, and today's lesson glows on the route.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("home")}>Back to Home</Button>
      </div>

      <section className="course-map-scene" aria-label="Englantis course route">
        <div className="course-map-hud">
          <span>Chapter 01 - Grammia Route</span>
          <b>Week 2 · Day 3</b>
          <small>Watch - Do - Teach</small>
        </div>

        <div className="course-path-glow" />

        {courseNodes.map((node) => {
          const isToday = node.status === "today";
          return (
            <button
              key={node.id}
              className={`course-node course-node-${node.status}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              disabled={node.status === "locked"}
              onClick={() => isToday && navigate("daily-intro")}
              aria-label={`${node.label}. ${node.title}. ${node.subtitle}`}
            >
              <span>{node.label}</span>
              <b>{node.title}</b>
              <small>{node.subtitle}</small>
            </button>
          );
        })}

        <img className="course-pix-guide" src={sceneAssets.characters.pixhappy} alt="Pix guide" />

        <aside className="today-route-card">
          <span className="kicker">Today's Course</span>
          <h2>Places and Prepositions</h2>
          <p>Learn the location words that restore Grammia's route signs, then use them in game-style missions.</p>
          <div className="course-step-strip">
            <span><b>01 Watch</b><small>Visual lesson</small></span>
            <span><b>02 Do</b><small>Game practice</small></span>
            <span><b>03 Teach</b><small>Explain back</small></span>
          </div>
          <div className="course-reward-row">
            <span>Reward</span>
            <b>+160 LV · Fog -12%</b>
          </div>
          <Button onClick={() => navigate("daily-intro")}>Start Today's Course</Button>
        </aside>
      </section>
    </main>
  );
}

function VoiceControl({ active, onClick, label = "Hold to Teach" }: { active: boolean; onClick: () => void; label?: string }) {
  return (
    <button className={`lab-mic ${active ? "listening" : ""}`} onClick={onClick} aria-pressed={active}>
      <span className="mic-core">●</span>
      <span><b>{active ? "Listening..." : label}</b><small>{active ? "말을 마치면 다시 눌러주세요" : "AI가 내용과 발음을 함께 분석합니다"}</small></span>
      <i /><i /><i /><i />
    </button>
  );
}

function ChalkPad() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const board = canvas.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (board.width / rect.width),
      y: (event.clientY - rect.top) * (board.height / rect.height),
    };
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !canvas.current) return;
    const spot = point(event);
    if (!spot) return;
    const context = canvas.current.getContext("2d");
    if (!context) return;
    context.lineWidth = 8;
    context.lineCap = "round";
    context.strokeStyle = "#f5d98c";
    context.lineTo(spot.x, spot.y);
    context.stroke();
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const spot = point(event);
    const context = canvas.current?.getContext("2d");
    if (!spot || !context) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(spot.x, spot.y);
  };

  const stop = () => {
    drawing.current = false;
    canvas.current?.getContext("2d")?.closePath();
  };

  return (
    <div className="chalk-pad">
      <div className="chalk-toolbar"><span>Draw a simple map for “between”</span><button onClick={() => canvas.current?.getContext("2d")?.clearRect(0, 0, 900, 300)}>Clear board</button></div>
      <canvas aria-label="Draw a visual analogy for between" ref={canvas} width="900" height="300" onPointerDown={start} onPointerMove={draw} onPointerUp={stop} onPointerCancel={stop} />
    </div>
  );
}

function ActivitySandbox({ item, phase }: { item: ActivityItem; phase: ActivityPhase }) {
  const [feedback, setFeedback] = useState("");
  const [active, setActive] = useState(false);
  const [typed, setTyped] = useState("");
  const [selected, setSelected] = useState("");
  const [sequence, setSequence] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [material, setMaterial] = useState<string[]>(["Rule"]);
  const [collected, setCollected] = useState<string[]>([]);
  const [runner, setRunner] = useState({ x: 22, y: 31 });
  const [runnerWords, setRunnerWords] = useState<string[]>([]);
  const [rhythmPlaying, setRhythmPlaying] = useState(false);
  const [rhythmTime, setRhythmTime] = useState(0);
  const [rhythmJudgements, setRhythmJudgements] = useState<Record<number, RhythmJudgement>>({});
  const [rhythmIndex, setRhythmIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [sling, setSling] = useState({ x: 20, y: 72, dragging: false, shot: false });
  const rhythmStart = useRef<number | null>(null);
  const [fogCity, setFogCity] = useState(0);
  const [fogCreature, setFogCreature] = useState(0);
  const [fogMode, setFogMode] = useState("Choose It");
  const [bossMode, setBossMode] = useState("");
  const [fogStep, setFogStep] = useState<FogSetupStep>("battle");
  const [showBossModes, setShowBossModes] = useState(false);
  const [fogReady, setFogReady] = useState(true);
  const [fogBattleState, setFogBattleState] = useState<FogBattleState>("setup");
  const [fogPlayerHp, setFogPlayerHp] = useState(100);
  const [fogEnemyHp, setFogEnemyHp] = useState(100);
  const [fogCombatFx, setFogCombatFx] = useState<"idle" | "player-attack" | "enemy-attack">("idle");
  const [fogLastAttack, setFogLastAttack] = useState("");
  const [fogPixHint, setFogPixHint] = useState(false);
  const [fogOrb, setFogOrb] = useState({ x: 18, y: 60, dragging: false });
  const [fogStageShift, setFogStageShift] = useState({ x: 0, y: 0 });

  const runnerTargets = [
    { word: "radiant", x: 25, y: 31, good: true },
    { word: "gleam", x: 62, y: 25, good: true },
    { word: "illuminate", x: 78, y: 67, good: true },
    { word: "silent", x: 43, y: 61, good: false },
  ];
  const runnerRoute = ["radiant", "gleam", "illuminate"];
  const runnerBounds = [
    { x1: 11, x2: 36, y1: 16, y2: 48 },
    { x1: 47, x2: 75, y1: 12, y2: 40 },
    { x1: 34, x2: 58, y1: 52, y2: 82 },
    { x1: 68, x2: 90, y1: 50, y2: 82 },
    { x1: 34, x2: 52, y1: 29, y2: 41 },
    { x1: 45, x2: 56, y1: 40, y2: 62 },
    { x1: 55, x2: 71, y1: 63, y2: 75 },
  ];
  const slingAnchor = { x: 20, y: 72 };
  const slingTargets = [
    { word: "dim", x: 78, y: 70 },
    { word: "radiant", x: 79, y: 25 },
    { word: "silent", x: 56, y: 34 },
  ];
  const slingLanding = {
    x: Math.max(6, Math.min(94, slingAnchor.x + (slingAnchor.x - sling.x) * 4.2)),
    y: Math.max(10, Math.min(92, slingAnchor.y + (slingAnchor.y - sling.y) * 3.1)),
  };
  const slingAimEnd = sling.shot ? { x: sling.x, y: sling.y } : slingLanding;
  const slingPullPower = Math.hypot(slingAnchor.x - sling.x, slingAnchor.y - sling.y);
  const rhythmChallengeIds = Array.from(new Set(rhythmNotes.map((note) => note.pairId)));
  const rhythmChallengeCount = rhythmChallengeIds.length;
  const rhythmHits = rhythmNotes.filter((note, index) => note.correct && rhythmJudgements[index] && rhythmJudgements[index] !== "miss").length;
  const rhythmNextChallenge = rhythmNotes.find((note) => !rhythmNotes.some((candidate, index) => candidate.pairId === note.pairId && rhythmJudgements[index]));
  const rhythmNextNote = rhythmNextChallenge
    ? rhythmNotes.find((note) => note.pairId === rhythmNextChallenge.pairId && note.correct)
    : undefined;
  const rhythmProgress = Math.min(100, Math.max(0, (rhythmTime / rhythmTotalMs) * 100));
  const rhythmPattern = rhythmNotes.filter((note) => note.correct).map((note) => note.key);

  const voice = () => {
    setActive((value) => !value);
    setFeedback(active ? "AI 분석 완료 · 의미 전달이 명확하고 발음 리듬도 좋아요." : "음성을 듣고 있어요. 자신의 말로 편하게 설명해보세요.");
  };

  const success = (message: string) => setFeedback(message);
  const beginFogBattle = () => {
    const family = fogFamilies[fogCity];
    const creature = family.creatures[fogCreature];
    setFogBattleState("battle");
    setFogPlayerHp(100);
    setFogEnemyHp(100);
    setSelected("");
    setFogLastAttack("");
    setFogCombatFx("idle");
    setFogPixHint(false);
    setFogOrb({ x: 18, y: 60, dragging: false });
    setFeedback(`${family.city} 전투 구역 진입 · ${creature[1]}의 반전 LV를 영어 공격으로 상쇄하세요!`);
  };
  const returnToFogSetup = () => {
    setFogBattleState("setup");
    setFogPlayerHp(100);
    setFogEnemyHp(100);
    setSelected("");
    setFogLastAttack("");
    setFogCombatFx("idle");
    setFogPixHint(false);
    setFogOrb({ x: 18, y: 60, dragging: false });
    setFeedback("");
  };
  const retryFogBattle = () => {
    setFogBattleState("battle");
    setFogPlayerHp(100);
    setFogEnemyHp(100);
    setSelected("");
    setFogLastAttack("");
    setFogCombatFx("idle");
    setFogOrb({ x: 18, y: 60, dragging: false });
    setFeedback("재도전 신호 준비 완료 · 정답을 골라 정화 공격을 시작하세요.");
  };
  const nextFogBattle = () => {
    const family = fogFamilies[fogCity];
    const nextCreature = (fogCreature + 1) % family.creatures.length;
    setFogCreature(nextCreature);
    setFogBattleState("battle");
    setFogPlayerHp(100);
    setFogEnemyHp(100);
    setSelected("");
    setFogLastAttack("");
    setFogCombatFx("idle");
    setFogOrb({ x: 18, y: 60, dragging: false });
    setFeedback(`${family.creatures[nextCreature][1]}이 나타났습니다 · 다음 정화 배틀 시작!`);
  };
  const attackFogCreature = (choice: string) => {
    const family = fogFamilies[fogCity];
    const creature = family.creatures[fogCreature];
    setSelected(choice);
    setFogLastAttack(choice);
    if (choice === family.answer) {
      setFogCombatFx("player-attack");
      setFogEnemyHp(0);
      success(`정화 주문 적중 · ${creature[1]}의 반전 LV가 무너지고 있습니다!`);
      window.setTimeout(() => {
        setFogCombatFx("idle");
        setFogBattleState("victory");
        success(`${creature[1]} 정화 성공 · 올바른 영어 LV가 안개를 걷어냈습니다!`);
      }, 650);
      return;
    }
    setFogCombatFx("enemy-attack");
    const nextHp = Math.max(0, fogPlayerHp - 34);
    setFogPlayerHp(nextHp);
    if (nextHp === 0) {
      success(`${creature[1]}의 반격 적중 · 정화 에너지가 모두 소진되었습니다.`);
      window.setTimeout(() => {
        setFogCombatFx("idle");
        setFogBattleState("defeat");
        success(`${creature[1]}의 반전 LV가 너무 강해요. 전투 규칙을 확인하고 다시 도전하세요.`);
      }, 650);
    } else {
      success(`공격이 빗나갔습니다 · ${creature[1]}의 방해로 정화 에너지가 감소했어요.`);
      window.setTimeout(() => setFogCombatFx("idle"), 650);
    }
  };
  const castSelectedFogRune = () => {
    if (!selected) {
      success("먼저 정답이라고 생각하는 룬 카드를 선택하세요.");
      return;
    }
    attackFogCreature(selected);
    setFogOrb({ x: 18, y: 60, dragging: false });
  };
  const moveRunner = (dx: number, dy: number) => {
    setRunner((current) => {
      const next = { x: Math.max(5, Math.min(92, current.x + dx)), y: Math.max(12, Math.min(82, current.y + dy)) };
      const insidePath = runnerBounds.some((bounds) => next.x >= bounds.x1 && next.x <= bounds.x2 && next.y >= bounds.y1 && next.y <= bounds.y2);
      if (!insidePath) {
        setFeedback("벽은 통과할 수 없어요. 방과 통로 안에서 빛 단어가 있는 길을 따라가세요.");
        return current;
      }
      const touched = runnerTargets.find((target) => Math.abs(target.x - next.x) < 7 && Math.abs(target.y - next.y) < 9);
      if (touched?.good) {
        setRunnerWords((words) => {
          if (words.includes(touched.word)) return words;
          const nextWord = runnerRoute[words.length];
          if (touched.word !== nextWord) {
            setFeedback(`아직 ${touched.word} 차례가 아니에요. 먼저 ${nextWord} 룬을 찾으세요.`);
            return words;
          }
          const updated = [...words, touched.word];
          setFeedback(updated.length === 3 ? "탐험 완료! 빛 단어 3개를 순서대로 모아 출구 문을 열었어요." : `${touched.word} 룬 수집! 다음 빛 단어를 찾아가세요. ${updated.length}/3`);
          return updated;
        });
      } else if (touched) {
        setFeedback("silent는 빛과 관련 없는 함정 단어예요. 알맞은 경로로 돌아가세요.");
      } else {
        const nextWord = runnerRoute[runnerWords.length] ?? "exit";
        setFeedback(`이동 완료 · 현재 위치 (${Math.round(next.x)}, ${Math.round(next.y)}). 다음 목표는 ${nextWord} 룬이에요.`);
      }
      return next;
    });
  };
  const hitRhythmLegacy = (key: string) => {
    if (key.toUpperCase() === rhythmPattern[rhythmIndex]) {
      const next = rhythmIndex + 1;
      setCombo((value) => value + 1);
      setRhythmIndex(next % rhythmPattern.length);
      setFeedback(next === rhythmPattern.length ? "PERFECT SPELL · 문장 강세 리듬을 완성했습니다!" : `GOOD · Combo x${combo + 1}`);
    } else {
      setCombo(0);
      setFeedback(`MISS · 다음 박자는 ${rhythmPattern[rhythmIndex]} 키예요.`);
    }
  };
  const startRhythmGame = () => {
    rhythmStart.current = performance.now();
    setRhythmPlaying(true);
    setRhythmTime(0);
    setRhythmJudgements({});
    setCombo(0);
    setFeedback("BEAT START · 동시에 오는 두 노트 중 문법상 맞는 단어의 키를 누르세요.");
  };
  const hitRhythm = (key: string) => {
    const pressed = key.toUpperCase() as RhythmKey;
    if (!["A", "S", "D", "F"].includes(pressed)) return;
    if (!rhythmPlaying) {
      startRhythmGame();
      return;
    }
    const windows = rhythmNotes
      .map((note, index) => ({ note, index, diff: Math.abs(note.beat * rhythmBeatMs + rhythmLeadMs - rhythmTime) }))
      .filter(({ note }) => !rhythmNotes.some((candidate, candidateIndex) => candidate.pairId === note.pairId && rhythmJudgements[candidateIndex]))
      .sort((a, b) => a.diff - b.diff);
    const closest = windows[0];
    if (!closest || closest.diff > 900) {
      setCombo(0);
      setFeedback(closest ? `MISS · 판정선에 더 가까워졌을 때 고르세요. 힌트: ${closest.note.prompt}` : "MISS · 다음 주문 패턴을 기다리세요.");
      return;
    }
    const pair = rhythmNotes
      .map((note, index) => ({ note, index }))
      .filter(({ note }) => note.pairId === closest.note.pairId);
    const chosen = pair.find(({ note }) => note.key === pressed);
    const correctNote = pair.find(({ note }) => note.correct)?.note;
    if (!chosen || !chosen.note.correct) {
      setCombo(0);
      setRhythmJudgements((current) => ({
        ...current,
        ...Object.fromEntries(pair.map(({ index }) => [index, "miss" as RhythmJudgement])),
      }));
      setFeedback(`MISS · ${closest.note.prompt} 정답은 ${correctNote?.key ?? "?"}: ${correctNote?.label ?? ""} 입니다.`);
      return;
    }
    const grade: RhythmJudgement = closest.diff <= 450 ? "perfect" : "good";
    setRhythmJudgements((current) => ({
      ...current,
      ...Object.fromEntries(pair.map(({ note, index }) => [index, note.correct ? grade : "miss" as RhythmJudgement])),
    }));
    setCombo((value) => {
      const next = value + 1;
      setFeedback(`${grade === "perfect" ? "PERFECT" : "GOOD"} · ${chosen.note.label} 선택, Combo x${next}`);
      return next;
    });
  };
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (item.id === "do-runner") {
        const moves: Record<string, [number, number]> = { w: [0, -6], arrowup: [0, -6], s: [0, 6], arrowdown: [0, 6], a: [-6, 0], arrowleft: [-6, 0], d: [6, 0], arrowright: [6, 0] };
        const move = moves[event.key.toLowerCase()];
        if (move) {
          event.preventDefault();
          moveRunner(...move);
        }
      }
      if (item.id === "do-rhythm" && ["a", "s", "d", "f"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        hitRhythm(event.key);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [item.id, rhythmPlaying, rhythmTime, rhythmJudgements]);

  useEffect(() => {
    if (item.id !== "do-rhythm" || !rhythmPlaying) return;
    if (rhythmStart.current === null) rhythmStart.current = performance.now() - rhythmTime;
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - (rhythmStart.current ?? performance.now());
      setRhythmTime(elapsed);
      setRhythmJudgements((current) => {
        let changed = false;
        const next = { ...current };
        rhythmNotes.forEach((note, index) => {
          const hitAt = note.beat * rhythmBeatMs + rhythmLeadMs;
          if (!next[index] && elapsed - hitAt > 500) {
            next[index] = "miss";
            changed = true;
          }
        });
        return changed ? next : current;
      });
      if (elapsed >= rhythmTotalMs) {
        setRhythmPlaying(false);
        rhythmStart.current = null;
      }
    }, 24);
    return () => window.clearInterval(timer);
  }, [item.id, rhythmPlaying]);

  useEffect(() => {
    if (item.id !== "do-rhythm" || rhythmPlaying) return;
    const judged = Object.keys(rhythmJudgements).length;
    if (judged < rhythmNotes.length) return;
    const perfects = rhythmNotes.filter((note, index) => note.correct && rhythmJudgements[index] === "perfect").length;
    const goods = rhythmNotes.filter((note, index) => note.correct && rhythmJudgements[index] === "good").length;
    setFeedback(perfects + goods >= 3 ? `SPELL CLEAR · 문법 노트 ${perfects + goods}/${rhythmChallengeCount}개 성공!` : "RETRY BEAT · 문제를 읽고 두 노트 중 알맞은 단어를 고르세요.");
  }, [item.id, rhythmPlaying, rhythmJudgements]);

  useEffect(() => {
    if (item.id === "do-explore" && collected.length === 4) {
      success("원정 완료 · 빛 어휘 4개가 도감에 복원되었습니다!");
    }
  }, [collected.length, item.id]);

  const scene = (() => {
    if (phase === "watch") {
      return {
        location: "GRAMMIA ACADEMY",
        actor: item.id === "watch-checkpoint" ? "Pix" : "Master Gram",
        role: item.id === "watch-checkpoint" ? "AI Learning Guide" : "Master of Grammia",
        objective: item.id === "watch-shadow" ? "Match the rhythm and meaning" : "Discover the magic coordinate",
        line: item.id === "watch-shadow"
          ? "내 문장을 듣고, 의미와 리듬을 살려 그대로 따라 말해보렴."
          : item.id === "watch-video"
            ? "마법 좌표가 실제 문장 속에서 어떻게 움직이는지 함께 보자."
            : "오늘은 장소와 장소를 이어주는 세 가지 마법 좌표를 배울 거란다.",
      };
    }
    if (phase === "do") {
      const scenes: Record<string, { location: string; actor: string; role: string; objective: string; line: string }> = {
        "do-explore": { location: "LUMIO CRYSTAL CAVE", actor: "Pix", role: "Treasure Guide", objective: "Follow clues and unlock the inner treasure", line: "동굴 깊은 곳에 단어 유물이 잠들어 있어. 힌트를 읽고 알맞은 유물을 모으면 보물문이 열릴 거야." },
        "do-assembly": { location: "GRAMMIA DEVICE CHAMBER", actor: "Master Gram", role: "Sentence Engineer", objective: "Rebuild the past-tense engine", line: "장치 부품은 문장과 같단다. 올바른 순서로 연결해야 과거의 기록이 다시 움직여." },
        "do-battle": { location: "LISTENIA FOG DISTRICT", actor: "Echo Wraith", role: "Distorted Sound Creature", objective: "Identify the true sound signal", line: "안개 속에서 진짜 소리를 골라내야 해. 신호를 듣고 정확한 동사를 선택해!" },
        "do-workshop": { location: "WRITIA MAGIC WORKSHOP", actor: "Artisan Tain", role: "Sequence Crafter", objective: "Craft the moonlight potion", line: "좋은 제작서는 순서가 분명해야 해. 연결 표현을 따라 물약을 완성해보자." },
        "do-detective": { location: "READIA NIGHT ARCHIVE", actor: "Archivist Miro", role: "Evidence Keeper", objective: "Solve the missing lantern case", line: "짧은 기록 속에도 결정적인 단서가 숨어 있어. 읽고 추론해서 사건을 해결해보렴." },
        "do-roleplay": { location: "VOCANIA FESTIVAL MARKET", actor: "Merchant Luma", role: "AI Roleplay Partner", objective: "Borrow the magic compass", line: "나를 설득하면 축제용 마법 나침반을 빌려주지. 이유와 약속을 영어로 말해보렴." },
        "do-runner": { location: "LUMIO RUIN FIELD", actor: "Jinho", role: "Rune Runner", objective: "Move with WASD and recover light runes", line: "WASD나 방향키로 직접 움직여 빛과 관련된 영어 유물 세 개를 찾아보자." },
        "do-rhythm": { location: "SPEAKIA RHYTHM STAGE", actor: "Lucas", role: "Rhythm Master", objective: "Cast the stress-pattern spell", line: "강세는 영어의 박자야. 움직이는 룬 순서에 맞춰 A, S, D, F 키를 눌러봐." },
        "do-slingshot": { location: "VOCANIA SLING RANGE", actor: "Dr. Lexi", role: "Target Coach", objective: "Hit the correct vocabulary target", line: "구슬을 왼쪽 아래로 당겼다가 놓으면 반대 방향으로 날아가. radiant 표적을 노려봐!" },
        "do-fog-lab": { location: "FOG CREATURE BATTLE LAB", actor: "Dr. Lexi", role: "Fog Creature Researcher", objective: "Test 18 battle patterns and 5 bosses", line: "안개몬은 악한 존재가 아니야. 올바른 영어로 반전 LV를 상쇄해 안개를 걷어주자." },
      };
      return scenes[item.id] ?? scenes["do-explore"];
    }
    return {
      location: "MILO'S LEARNING ROOM",
      actor: "Milo",
      role: "NPC Learner",
      objective: item.id === "teach-analogy" ? "Explain with a visual analogy" : `Teach by ${item.title}`,
      line: item.id === "teach-correct"
        ? "내 문장에 뭔가 이상한 것 같아. 틀린 부분과 이유를 알려줄래?"
        : item.id === "teach-analogy"
          ? "between이 아직 헷갈려. 그림으로 보여주면 더 잘 이해할 수 있을 것 같아!"
          : "내가 다른 NPC에게도 설명할 수 있도록, 네 방식으로 가르쳐줘.",
    };
  })();

  const preview = (() => {
    switch (item.id) {
      case "watch-human-lecture":
      case "watch-vr-lecture": {
        const demoLecture = item.id === "watch-human-lecture" ? watchScenes[0] : watchScenes[1];
        return (
          <div className={`watch-atlas-demo ${item.id === "watch-vr-lecture" ? "watch-atlas-vr" : "watch-atlas-real"}`}>
            <span className="demo-stage-label">{demoLecture.label} · Pix AI ready</span>
            {demoLecture.embedSrc && <iframe src={demoLecture.embedSrc} title={demoLecture.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />}
            {demoLecture.videoSrc && <video src={demoLecture.videoSrc} controls preload="metadata" />}
            <div className="watch-atlas-pix">
              <img src={sceneAssets.characters.pixhappy} alt="Pix" />
              <p>{demoLecture.pixPrompt}</p>
              <small>{item.id === "watch-vr-lecture" ? "장면 속 거리와 방향을 보며 near 단서를 찾습니다." : "실제 선생님 설명 흐름을 보며 between / near / on을 정리합니다."}</small>
            </div>
          </div>
        );
      }
      case "watch-master-lecture": {
        const demoLecture = watchScenes[2];
        const pages = demoLecture.bookPages ?? [];
        const page = pages[step % Math.max(1, pages.length)];
        return (
          <div className="watch-atlas-demo watch-atlas-master">
            <span className="demo-stage-label">{demoLecture.label} · {demoLecture.instructor}</span>
            {page && <img src={page.src} alt={`${demoLecture.instructor} ${page.label}`} />}
            <div className="watch-atlas-pix">
              <img src={sceneAssets.characters.pix} alt="Pix" />
              <p>{demoLecture.masterLines?.[step % Math.max(1, pages.length)] ?? demoLecture.pixPrompt}</p>
              <small>{page?.label ?? "교재"} · {step + 1} / {Math.max(1, pages.length)}</small>
              <button className="lab-action" onClick={() => setStep((value) => (value + 1) % Math.max(1, pages.length))}>Next page</button>
            </div>
          </div>
        );
      }
      case "watch-dialogue":
        return (
          <div className="dialogue-demo">
            <div className="demo-stage-label">Interactive Story · Line {step + 1} / 3</div>
            <div className="demo-speaker"><span>{step === 1 ? "PIX" : "MASTER GRAM"}</span><p>{[
              "두 장소 사이에 있을 때는 between을 쓴단다.",
              "그러면 은행과 병원 사이에 있는 사람도 말할 수 있겠네!",
              "맞아. He is standing between a bank and a hospital.",
            ][step]}</p></div>
            <button className="lab-action" onClick={() => setStep((value) => (value + 1) % 3)}>Next dialogue</button>
          </div>
        );
      case "watch-video":
        return (
          <div className={`video-demo ${playing ? "playing" : ""}`}>
            <div className="video-board"><span>MAGIC COORDINATES</span><div className="coordinate-scene"><i>BANK</i><b>between</b><i>HOSPITAL</i></div><button onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause lecture" : "Play lecture"}>{playing ? "Ⅱ" : "▶"}</button></div>
            <div className="video-timeline"><i style={{ width: playing ? "68%" : "32%" }} /><span>02:14 / 04:20</span><b>Question at 02:40</b></div>
          </div>
        );
      case "watch-checkpoint":
        return (
          <div className="checkpoint-demo">
            <span className="demo-stage-label">Lecture paused · Checkpoint</span>
            <h3>The park is ___ the apartment.</h3>
            <div className="lab-option-grid">{["between", "near", "on"].map((word) => <button className={selected === word ? (word === "near" ? "correct" : "wrong") : ""} key={word} onClick={() => { setSelected(word); success(word === "near" ? "정확해요. 강의를 이어갈게요!" : "조금 가까이에 있다는 뜻을 떠올려보세요."); }}>{word}</button>)}</div>
          </div>
        );
      case "watch-shadow":
        return (
          <div className="shadow-demo">
            <span className="demo-stage-label">Shadowing · Rhythm Guide</span><h3>He is standing <em>between</em> a bank and a hospital.</h3>
            <div className="sound-wave">{Array.from({ length: 26 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 17) % 45)}px` }} />)}</div>
            <VoiceControl active={active} onClick={voice} label="Repeat after Master" />
          </div>
        );
      case "watch-adaptive":
        return (
          <div className="adaptive-demo">
            <span className="demo-stage-label">AI-adjusted lesson</span>
            <h3>How should Master explain it today?</h3>
            <div className="adaptive-controls"><label>Lesson pace</label>{["Slow + examples", "Standard", "Fast + challenge"].map((choice) => <button className={selected === choice ? "active" : ""} key={choice} onClick={() => { setSelected(choice); success(`${choice} 모드로 다음 설명을 재구성했습니다.`); }}>{choice}</button>)}</div>
            <div className="ai-example"><b>Personal example · Games</b><p>“The healer stands between the knight and the wizard.”</p></div>
          </div>
        );
      case "do-explore": {
        const relics = [
          { clue: "은은하게 빛나다", answer: "glow", choices: ["glow", "dark", "quiet", "heavy"], mark: "G" },
          { clue: "밝게 빛나다", answer: "shine", choices: ["hide", "shine", "sleep", "slow"], mark: "S" },
          { clue: "빛이 밝은", answer: "bright", choices: ["small", "bright", "late", "silent"], mark: "B" },
          { clue: "강한 빛을 내는", answer: "radiant", choices: ["radiant", "empty", "cold", "dark"], mark: "R" },
        ];
        const currentRelic = relics[Math.min(collected.length, relics.length - 1)];
        const expeditionDone = collected.length >= relics.length;
        const chooseRelic = (word: string) => {
          if (expeditionDone) return;
          if (word !== currentRelic.answer) {
            success(`${word}는 이번 힌트와 맞지 않아요. 장면의 분위기와 뜻을 다시 비교해보세요.`);
            return;
          }
          setCollected((current) => [...current, word]);
          success(collected.length + 1 === relics.length ? "보물문 개방! 빛 단어를 모두 정확히 골랐어요." : `${word} 유물 회수! 다음 힌트로 이동합니다.`);
        };
        return (
          <div className="expedition-demo">
            <img className="do-prop cave-torch-left" src={doActivityAssets.exploration.torchOn} alt="" aria-hidden="true" />
            <img className="do-prop cave-chest" src={expeditionDone ? doActivityAssets.exploration.treasureOpen : doActivityAssets.exploration.treasureClosed} alt="" aria-hidden="true" />
            <img className="do-prop cave-glow" src={doActivityAssets.exploration.treasureGlow} alt="" aria-hidden="true" />
            <div className="expedition-copy">
              <span className="demo-stage-label">Cave expedition · Treasure words</span>
              <h3>{expeditionDone ? "보물상자가 열렸습니다!" : "힌트에 맞는 영어 단어 유물을 고르세요."}</h3>
              <p>{collected.length} / {relics.length} relics recovered</p>
              {!expeditionDone && <div className="relic-clue"><b>CLUE {collected.length + 1}</b><span>{currentRelic.clue}</span></div>}
            </div>
            <div className="artifact-grid">
              {(expeditionDone ? collected : currentRelic.choices).map((word) => (
                <button
                  className={collected.includes(word) ? "collected" : word === "dark" || word === "silent" ? "trap-artifact" : ""}
                  key={word}
                  onClick={() => chooseRelic(word)}
                  disabled={expeditionDone}
                >
                  <img src={word === "dark" || word === "silent" ? doActivityAssets.exploration.artifactWrong : doActivityAssets.exploration.artifactCorrect} alt="" aria-hidden="true" />
                  <i>{word.slice(0, 1).toUpperCase()}</i>
                  <b>{word}</b>
                  <small>{collected.includes(word) ? "recovered" : "choose"}</small>
                </button>
              ))}
            </div>
            <RewardToast show={expeditionDone} message="보물 탐험 성공!" label="+200 LINGO" />
          </div>
        );
      }
      case "do-assembly": {
        const parts = ["The", "crystal", "glowed", "all", "night."];
        return (
          <div className="device-demo">
            <img className="do-prop rune-door-art" src={sequence.length === parts.length ? doActivityAssets.runePuzzle.doorOpen : doActivityAssets.runePuzzle.doorLocked} alt="" aria-hidden="true" />
            <img className="do-prop rune-door-light" src={doActivityAssets.runePuzzle.doorLight} alt="" aria-hidden="true" />
            <span className="demo-stage-label">Grammar engineering · Past tense</span><div className={`device-core ${sequence.length === parts.length ? "charged" : ""}`}><i>{sequence.length}/5</i><b>TIME ENGINE</b><small>Connect the sentence circuits</small></div>
            <div className="sequence-slot">{sequence.length ? sequence.join(" ") : "Tap components in the correct order"}</div>
            <div className="token-row rune-token-row">{parts.map((part) => <button key={part} disabled={sequence.includes(part)} onClick={() => setSequence([...sequence, part])}><img src={doActivityAssets.runePuzzle.wordTile} alt="" aria-hidden="true" />{part}</button>)}</div>
            <div className="lab-inline-actions"><button onClick={() => setSequence([])}>Reset</button><button onClick={() => success(sequence.join(" ") === parts.join(" ") ? "장치 재가동 · 과거형 glowed가 시간 엔진을 움직였습니다!" : "회로 순서를 다시 확인하세요.")}>Power device</button></div>
          </div>
        );
      }
      case "do-battle":
        return (
          <div className="battle-demo">
            <div className={`fog-target ${playing ? "listening" : ""}`}>
              <img className="sentence-stone-art" src={selected === "rang" ? doActivityAssets.sentencePurify.stonePurified : doActivityAssets.sentencePurify.stoneBlank} alt="" aria-hidden="true" />
              {selected === "rang" && <img className="purify-beam-art" src={doActivityAssets.sentencePurify.purifyBeam} alt="" aria-hidden="true" />}
              <span>ECHO SHIELD 72%</span><b>{playing ? "!" : "?"}</b>
            </div>
            <div><span className="demo-stage-label">Listening battle · Sound memory</span><h3>신호를 듣고 빈칸에 들어갈 과거형 동사를 공격하세요.</h3><button className="signal-play" onClick={() => { setPlaying(true); success("재생 신호 · “The bell rang twice.”"); }}>Play echo signal</button><p className="battle-sentence">The bell ___ twice.</p><div className="lab-option-grid">{["rang", "shone", "sang"].map((word) => <button className={selected === word ? (word === "rang" ? "correct" : "wrong") : ""} key={word} onClick={() => { setSelected(word); success(word === "rang" ? "정화 공격 적중 · 듣기 신호와 동사가 정확히 연결됐습니다!" : "소리의 의미와 문장을 다시 연결해보세요."); }}>{word}</button>)}</div></div>
          </div>
        );
      case "do-workshop": {
        const recipe = ["First, heat the crystal.", "Next, add moonwater.", "Then, stir it slowly.", "Finally, turn off the flame."];
        const recipeOptions = [
          { line: recipe[2], ingredient: "slow stir", className: "herb" },
          { line: recipe[0], ingredient: "sun crystal", className: "crystal" },
          { line: recipe[3], ingredient: "soft flame", className: "flame" },
          { line: recipe[1], ingredient: "moonwater", className: "water" },
        ];
        const recipeIsCorrect = sequence.join("|") === recipe.join("|");
        const workshopDone = selected === "workshop-success" && recipeIsCorrect;
        const workshopFailed = selected === "workshop-error";
        const checkWorkshop = () => {
          if (recipeIsCorrect) {
            setSelected("workshop-success");
            success("제작 성공! 순서 표현이 정확한 달빛 물약이 완성됐습니다.");
            return;
          }
          setSelected("workshop-error");
          success("First부터 Finally까지 제작 흐름을 다시 살펴보세요.");
        };
        return (
          <div className="workshop-demo">
            <img className="do-prop workshop-artisan" src={workshopDone ? doActivityAssets.workshop.artisanSuccess : doActivityAssets.workshop.artisanIdle} alt="" aria-hidden="true" />
            <img className="do-prop workshop-cauldron" src={workshopDone ? doActivityAssets.workshop.cauldronSuccess : workshopFailed ? doActivityAssets.workshop.cauldronFail : doActivityAssets.workshop.cauldronIdle} alt="" aria-hidden="true" />
            <img className="do-prop workshop-scroll" src={doActivityAssets.workshop.recipeScroll} alt="" aria-hidden="true" />
            {workshopDone && <img className="do-prop workshop-success-burst" src={doActivityAssets.workshop.successBurst} alt="" aria-hidden="true" />}
            <div className="workshop-copy">
              <span className="demo-stage-label">Writing workshop · Sequence expressions</span>
              <h3>냄비에 재료를 순서대로 넣어 달빛 물약을 완성하세요.</h3>
            </div>
            <div className="recipe-track">{sequence.length ? sequence.map((line, index) => <span key={line}><i>{index + 1}</i>{line}</span>) : <p>Choose the recipe steps below</p>}</div>
            <div className="recipe-parts">{recipeOptions.map((item) => <button className={`ingredient-card ${item.className}`} key={item.line} disabled={sequence.includes(item.line)} onClick={() => { setSelected(""); setSequence([...sequence, item.line]); }}><img src={doActivityAssets.workshop.ingredientCard} alt="" aria-hidden="true" /><i /><b>{item.ingredient}</b><span>{item.line}</span></button>)}</div>
            <div className="lab-inline-actions"><button onClick={() => { setSequence([]); setSelected(""); }}>Clear recipe</button><button onClick={checkWorkshop}>Craft potion</button></div>
            <RewardToast show={workshopDone} message="달빛 물약 완성!" label="+200 LINGO" />
          </div>
        );
      }
      case "do-detective":
        return (
          <div className="detective-demo">
            <img className="do-prop detective-miro" src={selected ? doActivityAssets.detective.miroSurprised : doActivityAssets.detective.miroIdle} alt="" aria-hidden="true" />
            <img className="do-prop detective-board" src={selected ? doActivityAssets.detective.caseBoardConnected : doActivityAssets.detective.caseBoardEmpty} alt="" aria-hidden="true" />
            {selected && <img className="do-prop detective-stamp" src={doActivityAssets.detective.stampSolved} alt="" aria-hidden="true" />}
            <span className="demo-stage-label">Reading mystery · Find decisive evidence</span><div className="case-file"><b>CASE 014 · The Missing Lantern</b><p>Mina left the archive before sunset. At midnight, the lantern was still warm and a fresh blue feather lay beside it.</p></div><h3>누군가 최근까지 등불을 사용했다는 결정적 단서는?</h3>
            <div className="evidence-grid">{["Mina left before sunset.", "The lantern was still warm.", "A blue feather was beside it."].map((clue, index) => <button className={selected === clue ? (index === 1 ? "correct" : "wrong") : ""} key={clue} onClick={() => { setSelected(clue); success(index === 1 ? "사건 해결 · warm이라는 상태 정보로 최근 사용을 추론했습니다!" : "흥미로운 단서지만, 최근 사용 시점을 직접 증명하지는 못해요."); }}><i>0{index + 1}</i><span>{clue}</span></button>)}</div>
            <RewardToast show={selected === "The lantern was still warm."} message="증거 연결 성공!" label="+200 LINGO" />
          </div>
        );
      case "do-roleplay":
        return (
          <div className="open-talk-demo roleplay-demo">
            <img className="do-prop roleplay-milo" src={doActivityAssets.npcMissionTalk.miloConfused} alt="" aria-hidden="true" />
            <img className="do-prop route-signpost" src={doActivityAssets.npcMissionTalk.routeSignpost} alt="" aria-hidden="true" />
            <img className="do-prop route-map" src={doActivityAssets.npcMissionTalk.mapFragment} alt="" aria-hidden="true" />
            <img className="do-prop route-light-path" src={doActivityAssets.npcMissionTalk.routeLightPath} alt="" aria-hidden="true" />
            <div className="ai-bubble"><b>MILO · LOST IN THE MARKET</b><p>I can't find the old bakery. Is it near the bank?</p></div>
            <div className="roleplay-goal"><span>MISSION GOAL</span><b>Guide Milo using a location phrase</b><small>Useful tools: between, near, next to</small></div>
            <label>Your open response<textarea value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Try: It is near the bank." /></label>
            <div className="roleplay-actions"><VoiceControl active={active} onClick={voice} label="Answer by voice" /><button className="lab-action" onClick={() => success(evaluateMiloBakeryAnswer(typed).message)}>Send response</button></div>
          </div>
        );
      case "do-runner":
        return (
          <div className="runner-demo">
            <div className="arcade-topline"><span>LIGHT RUNE EXPEDITION</span><b>{runnerWords.length}/3 RECOVERED</b><small>WASD / ARROW KEYS</small></div>
            <div className="runner-field">
              <div className="dungeon-map" aria-hidden="true">
                <i className="dungeon-room room-a" />
                <i className="dungeon-room room-b" />
                <i className="dungeon-room room-c" />
                <i className="dungeon-room room-d" />
                <span className="dungeon-corridor corridor-a" />
                <span className="dungeon-corridor corridor-b" />
                <span className="dungeon-corridor corridor-c" />
                <b className="dungeon-door">LOCKED GATE</b>
                <b className="dungeon-exit">EXIT</b>
                <em className="runner-torch torch-a" />
                <em className="runner-torch torch-b" />
                <em className="runner-torch torch-c" />
                <img className="runner-map-prop runner-spike" src={doActivityAssets.runner.spikeTrap} alt="" aria-hidden="true" />
                <img className="runner-map-prop runner-fog" src={doActivityAssets.runner.fogHazard} alt="" aria-hidden="true" />
                <img className="runner-map-prop runner-exit-portal" src={runnerWords.length >= 3 ? doActivityAssets.runner.exitOpen : doActivityAssets.runner.exitClosed} alt="" aria-hidden="true" />
              </div>
              <div className="runner-path" />
              {runnerTargets.map((target) => {
                const isNextTarget = target.word === runnerRoute[runnerWords.length];
                return (
                  <div key={target.word} className={`runner-rune ${target.good ? "good" : "trap"} ${runnerWords.includes(target.word) ? "collected" : ""} ${isNextTarget ? "next-target" : ""}`} style={{ left: `${target.x}%`, top: `${target.y}%` }}>
                    <i>{target.good ? "✦" : "?"}</i>
                    <span>{isNextTarget ? `NEXT · ${target.word}` : target.word}</span>
                  </div>
                );
              })}
              <div className="runner-avatar" style={{ left: `${runner.x}%`, top: `${runner.y}%` }}><i>J</i><span>YOU</span></div>
            </div>
            <div className="runner-controls"><span>벽 안쪽 통로를 따라 radiant → gleam → illuminate 순서로 찾으세요.</span><div><button onClick={() => moveRunner(-6, 0)}>A</button><button onClick={() => moveRunner(0, -6)}>W</button><button onClick={() => moveRunner(0, 6)}>S</button><button onClick={() => moveRunner(6, 0)}>D</button></div></div>
            <RewardToast show={runnerWords.length >= 3} message="탐험 경로 완주!" label="+200 LINGO" />
          </div>
        );
      case "do-rhythm": {
        const activePair = rhythmNextChallenge
          ? rhythmNotes.filter((note) => note.pairId === rhythmNextChallenge.pairId)
          : rhythmNotes.filter((note) => note.pairId === 0);
        const labelForKey = (key: RhythmKey) => activePair.find((note) => note.key === key)?.label ?? "wait";
        return (
          <div className="rhythm-demo">
            <div className="arcade-topline"><span>RHYTHM SPELL · GRAMMAR NOTE</span><b>COMBO x{combo}</b><small>{rhythmPlaying ? `${Math.max(0, Math.ceil((rhythmTotalMs - rhythmTime) / 1000))}s` : "PRESS START"}</small></div>
            <h3>{rhythmNextChallenge?.prompt ?? "두 노트 중 문법상 맞는 단어를 고르세요."}</h3>
            <div className="rhythm-stage">
              <div className="rhythm-lanes" aria-hidden="true">{(["A", "S", "D", "F"] as RhythmKey[]).map((key) => <span key={key}>{key}</span>)}</div>
              <div className="rhythm-hit-line"><b>HIT</b></div>
              {rhythmNotes.map((note, index) => {
                const hitAt = note.beat * rhythmBeatMs + rhythmLeadMs;
                const travelStart = hitAt - rhythmLeadMs;
                const progress = rhythmPlaying ? (rhythmTime - travelStart) / rhythmLeadMs : -0.2 + index * 0.14;
                const left = Math.max(8, Math.min(106, 100 - progress * 50));
                const visible = rhythmPlaying ? rhythmTime >= travelStart - 180 && rhythmTime <= hitAt + 560 : index < 7;
                const status = rhythmJudgements[index];
                const timing = rhythmPlaying && !status && Math.abs(hitAt - rhythmTime) <= 450;
                if (!visible) return null;
                return (
                  <i
                    key={`${note.key}-${index}`}
                    className={`rhythm-note lane-${note.key.toLowerCase()} ${status ?? ""} ${timing ? "timing" : ""}`}
                    style={{ left: `${left}%`, top: `${rhythmLaneTop[note.key]}%` }}
                  >
                    <img src={doActivityAssets.rhythm.notes[note.key]} alt="" aria-hidden="true" />
                    <span>{note.key}</span>
                    <small>{note.label}</small>
                  </i>
                );
              })}
            </div>
            <div className="rhythm-meter"><i style={{ width: `${rhythmProgress}%` }} /><span>{rhythmHits}/{rhythmChallengeCount} grammar notes</span></div>
            <div className="rhythm-keys">{(["A", "S", "D", "F"] as RhythmKey[]).map((key) => {
              const activeLabel = labelForKey(key);
              return <button key={key} className={rhythmNextNote?.key === key ? "next" : ""} onClick={() => hitRhythm(key)} disabled={activeLabel === "wait" && rhythmPlaying}><i>{key}</i><span>{activeLabel}</span></button>;
            })}</div>
            <button className="rhythm-start" onClick={startRhythmGame}>{rhythmPlaying ? "Restart Beat" : "Start Beat"}</button>
            <RewardToast show={Object.keys(rhythmJudgements).length >= rhythmNotes.length && rhythmHits >= 3} message="리듬 주문 성공!" label="+200 LINGO" />
          </div>
        );
      }
      case "do-slingshot":
        return (
          <div className="slingshot-demo">
            <div className="arcade-topline"><span>VOCABULARY TARGET · SUPER BRIGHT</span><b>HIT: RADIANT</b><small>DRAG + RELEASE</small></div>
            <div className="sling-field">
              <img className="sling-weapon-art" src={doActivityAssets.slingshot.slingshot} alt="" aria-hidden="true" />
              <img className="sling-jiho-art" src={sling.shot ? doActivityAssets.slingshot.jihoRelease : doActivityAssets.slingshot.jihoAim} alt="" aria-hidden="true" />
              <svg className={`sling-trajectory ${sling.dragging || sling.shot || slingPullPower > 2 ? "aiming" : ""}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <line x1={slingAnchor.x} y1={slingAnchor.y} x2={slingAimEnd.x} y2={slingAimEnd.y} />
                <circle cx={slingAimEnd.x} cy={slingAimEnd.y} r="2.4" />
              </svg>
              <div className="sling-band" style={{ width: `${Math.max(0, 20 - sling.x) + 6}%`, transform: `rotate(${(sling.y - 72) * .55}deg)` }} />
              {[["dim", 78, 70], ["radiant", 79, 25], ["silent", 56, 34]].map(([word, x, y]) => <div key={word} className={`sling-target ${word === "radiant" ? "correct-target" : ""}`} style={{ left: `${x}%`, top: `${y}%` }}><i>◎</i><span>{word}</span></div>)}
              <button
                className={`sling-orb ${sling.dragging ? "dragging" : ""} ${sling.shot ? "shot" : ""}`}
                style={{ left: `${sling.x}%`, top: `${sling.y}%` }}
                onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setSling((value) => ({ ...value, dragging: true, shot: false })); }}
                onPointerMove={(event) => {
                  if (!sling.dragging) return;
                  const field = event.currentTarget.parentElement?.getBoundingClientRect();
                  if (!field) return;
                  setSling((value) => ({ ...value, x: Math.max(4, Math.min(28, ((event.clientX - field.left) / field.width) * 100)), y: Math.max(60, Math.min(90, ((event.clientY - field.top) / field.height) * 100)) }));
                }}
                onPointerUp={() => {
                  const clickShot = slingPullPower < 4;
                  const shot = clickShot ? { x: 79, y: 25 } : slingLanding;
                  const hit = slingTargets.find((target) => Math.abs(target.x - shot.x) < 10 && Math.abs(target.y - shot.y) < 13);
                  setSling({ ...shot, dragging: false, shot: true });
                  success(clickShot ? "CLICK SHOT · radiant 표적을 맞히는 예시 발사를 보여줬어요." : shot.x > 68 && shot.y < 48 ? "BULLSEYE · radiant 표적 적중! 강한 빛의 LV가 발생했습니다." : "표적을 빗나갔어요. 구슬을 왼쪽 아래로 더 길게 당겨보세요.");
                  window.setTimeout(() => success(hit?.word === "radiant" ? "BULLSEYE · radiant 표적 명중! 조준선과 같은 방향으로 정확히 발사됐어요." : "MISS · 구슬을 왼쪽 아래로 더 당겨 radiant 표적의 중심을 노려보세요."), 0);
                }}
                aria-label="Drag and release magic orb"
              >●</button>
              <div className="sling-anchor"><i /><i /></div>
            </div>
            <p className="sling-hint">구슬을 왼쪽 아래로 당겼다가 놓아 위쪽의 <b>radiant</b> 표적을 맞히세요. 드래그가 어렵다면 구슬을 한 번 클릭해 예시 발사를 볼 수 있어요.</p>
          </div>
        );
      case "do-fog-lab": {
        const family = fogFamilies[fogCity];
        const creature = family.creatures[fogCreature];
        const setupSteps: { id: FogSetupStep; label: string; value: string }[] = [
          { id: "city", label: "01 도시", value: family.city },
          { id: "creature", label: "02 안개몬", value: creature[1] },
          { id: "battle", label: "03 배틀", value: fogMode },
        ];
        if (fogBattleState !== "setup") {
          const resultTitle = fogBattleState === "victory" ? "정화 완료!" : "정화 에너지 소진";
          const resultCopy = fogBattleState === "victory"
            ? `${creature[1]}의 반전 LV를 상쇄했습니다. ${family.city}의 안개가 조금 걷혔어요.`
            : `${fogMode} 규칙을 다시 확인하고 같은 안개몬에게 재도전하세요.`;
          return (
            <div className={`fog-battle-arena fog-battle-${fogBattleState} fog-fx-${fogCombatFx}`}>
              <div className="fog-battle-topbar">
                <span><small>정화 배틀</small><b>{family.city} · {bossMode || fogMode}</b></span>
                <button onClick={returnToFogSetup}>배틀 설정으로 돌아가기</button>
              </div>
              <div className="fog-combat-hud">
                <div className="fog-fighter-card player"><span><i>J</i><b>Jinho</b><small>정화 에너지</small></span><strong>{fogPlayerHp}</strong><em><i style={{ width: `${fogPlayerHp}%` }} /></em></div>
                <div className="fog-versus"><small>BATTLE 01</small><b>VS</b><span>{fogMode}</span></div>
                <div className="fog-fighter-card enemy"><span><i>{creature[0].slice(0, 1)}</i><b>{creature[1]}</b><small>{creature[3]}</small></span><strong>{fogEnemyHp}</strong><em><i style={{ width: `${fogEnemyHp}%` }} /></em></div>
              </div>
              <div
                className="fog-combat-stage"
                style={{ "--fog-shift-x": `${fogStageShift.x}px`, "--fog-shift-y": `${fogStageShift.y}px` } as React.CSSProperties}
                onPointerMove={(event) => {
                  const field = event.currentTarget.getBoundingClientRect();
                  setFogStageShift({ x: ((event.clientX - field.left) / field.width - .5) * 10, y: ((event.clientY - field.top) / field.height - .5) * 6 });
                  if (!fogOrb.dragging) return;
                  setFogOrb({
                    x: Math.max(8, Math.min(90, ((event.clientX - field.left) / field.width) * 100)),
                    y: Math.max(18, Math.min(82, ((event.clientY - field.top) / field.height) * 100)),
                    dragging: true,
                  });
                }}
                onPointerLeave={() => setFogStageShift({ x: 0, y: 0 })}
                onPointerUp={() => {
                  if (!fogOrb.dragging) return;
                  if (fogOrb.x > 62) castSelectedFogRune();
                  else {
                    setFogOrb({ x: 18, y: 60, dragging: false });
                    success(selected ? "구슬을 안개몬 쪽까지 더 멀리 드래그해 발사하세요." : "먼저 아래에서 정화 룬을 선택하세요.");
                  }
                }}
              >
                <div className="fog-stage-scenery"><i /><i /><i /><i /></div>
                <div className="fog-player-unit"><div className="fog-player-art" /><span>JINHO</span><small>ENGLISH RESTORER</small></div>
                <button className={`fog-pix-companion ${fogPixHint ? "hinting" : ""}`} onClick={() => { setFogPixHint(!fogPixHint); success(fogPixHint ? "PIX 힌트를 닫았습니다." : `${fogMode} 힌트 · ${fogModeDescriptions[fogMode]}`); }} aria-label="Ask PIX for a hint"><i /><span>PIX</span>{fogPixHint && <b>{fogModeDescriptions[fogMode]}</b>}</button>
                <div className="fog-spell-path">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div>
                <button
                  className={`fog-drag-orb ${fogOrb.dragging ? "dragging" : ""} ${selected ? "armed" : ""}`}
                  style={{ left: `${fogOrb.x}%`, top: `${fogOrb.y}%` }}
                  onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setFogOrb((value) => ({ ...value, dragging: true })); }}
                  aria-label="Drag purification orb toward the Fog Creature"
                ><i />{selected && <span>{selected}</span>}</button>
                <div className={`fog-enemy-unit ${fogBattleState === "victory" ? "purified" : ""}`}>
                  <div className="fog-enemy-art"><img src={doActivityAssets.fogLab.boss} alt="" aria-hidden="true" /><i /></div>
                  <span>{creature[1]} · {creature[0]}</span><small>{creature[2]}</small>
                </div>
              </div>
              {fogBattleState === "battle" ? (
                <div className="fog-command-panel">
                  <div className="fog-command-copy"><span>정화 공격 · {fogMode}</span><h3>{family.prompt}</h3><p>룬을 선택하고 빛 구슬을 안개몬에게 드래그하거나 공격 버튼을 누르세요.</p></div>
                  <div className="fog-command-actions">
                    <div className="fog-answer-row">{family.choices.map((choice) => <button className={selected === choice ? (fogLastAttack === choice ? "wrong" : "armed") : ""} key={choice} aria-label={`Equip ${choice} rune`} onClick={() => { setSelected(choice); setFogLastAttack(""); success(`${choice} 룬 장착 완료 · 빛 구슬을 안개몬에게 드래그하세요.`); }}>{choice}</button>)}</div>
                    <button className="fog-cast-button" disabled={!selected} onClick={castSelectedFogRune}><i>✦</i><span>정화 공격</span><small>CAST</small></button>
                  </div>
                </div>
              ) : (
                <div className={`fog-result-panel ${fogBattleState}`}>
                  <span>{fogBattleState === "victory" ? "MISSION CLEAR" : "MISSION RETRY"}</span>
                  <div><h3>{resultTitle}</h3><p>{resultCopy}</p></div>
                  <div className="fog-result-actions">
                    <button onClick={retryFogBattle}>같은 배틀 재도전</button>
                    {fogBattleState === "victory" && <button onClick={nextFogBattle}>다음 안개몬 배틀</button>}
                    <button onClick={returnToFogSetup}>새 배틀 설정</button>
                  </div>
                  <RewardToast show={fogBattleState === "victory"} message="안개몬 정화 성공!" label="+200 LINGO" />
                </div>
              )}
            </div>
          );
        }
        return (
          <div className="fog-lab-demo fog-setup-screen">
            <div className="fog-loadout">
              {setupSteps.map((setup) => <button className={fogStep === setup.id ? "active" : ""} key={setup.id} onClick={() => setFogStep(setup.id)}><small>{setup.label}</small><b>{setup.value}</b></button>)}
              <span><small>출전 상태</small><b>{fogReady ? "배틀 준비 완료" : "세 단계를 선택하세요"}</b></span>
            </div>
            <div className="fog-lab-body">
              <div className={`fog-specimen tone-${family.tone}`}>
                <div className={`fog-creature-shape family-${fogCity} creature-${fogCreature}`}><img src={doActivityAssets.fogLab.boss} alt="" aria-hidden="true" /><i /><i /><b>{creature[0].slice(0, 1)}</b></div>
                <span>{creature[1]} · {creature[0]}</span><small>{creature[2]}</small><p>{creature[3]}</p>
                <div className="fog-specimen-status"><i />{fogReady ? "출전 대상 지정 완료" : "반전 LV 분석 중"}</div>
              </div>
              <div className="fog-console">
                <div className="fog-setup-heading"><span>배틀 설정 · {fogStep === "city" ? "도시 선택" : fogStep === "creature" ? "안개몬 선택" : "배틀 방식 선택"}</span><small>한 단계씩 선택하면 오른쪽 전투 규칙이 바뀝니다.</small></div>
                {fogStep === "city" && <div className="fog-selection-grid fog-city-selection">{fogFamilies.map((entry, index) => <button className={fogCity === index ? "active" : ""} key={entry.city} onClick={() => { setFogCity(index); setFogCreature(0); setFogMode(entry.modes[0]); setBossMode(""); setSelected(""); setFogReady(false); setFogStep("creature"); }} aria-label={`Select ${entry.city} city`}><b>{entry.city}</b><small>{entry.focus}</small><p>{fogCityDescriptions[entry.city]}</p></button>)}</div>}
                {fogStep === "creature" && <div className="fog-selection-grid">{family.creatures.map((entry, index) => <button className={fogCreature === index ? "active" : ""} key={entry[0]} onClick={() => { setFogCreature(index); setSelected(""); setFogReady(true); setFogStep("battle"); }} aria-label={`Select ${entry[1]} fog creature`}><b>{entry[1]} · {entry[0]}</b><small>{entry[2]}</small><p>{entry[3]}</p></button>)}</div>}
                {fogStep === "battle" && <div className="fog-selection-grid">{family.modes.map((mode) => <button className={fogMode === mode ? "active" : ""} key={mode} onClick={() => { setFogMode(mode); setBossMode(""); setSelected(""); setFogReady(true); success(`${family.city} · ${mode} 출전 준비가 완료되었습니다.`); }} aria-label={`Select ${mode} battle mode`}><b>{mode}</b><p>{fogModeDescriptions[mode]}</p></button>)}</div>}
                <div className={`fog-launch-panel ${fogReady ? "ready" : ""}`}>
                  <span><small>선택한 출전 조합</small><b>{family.city} · {creature[1]} · {bossMode || fogMode}</b><p>{fogReady ? "준비가 끝났습니다. 출전하면 별도의 배틀 화면으로 이동합니다." : "도시와 안개몬을 고른 뒤 마지막으로 배틀 방식을 선택하세요."}</p></span>
                  <button disabled={!fogReady} onClick={beginFogBattle}>{fogReady ? "정화 배틀 출전" : "배틀 방식 선택 필요"}<small>{fogReady ? "BATTLE START" : "STEP 03"}</small></button>
                </div>
                <button className="boss-disclosure" onClick={() => setShowBossModes(!showBossModes)}><span>BOSS CHALLENGE</span><b>{showBossModes ? "보스 배틀 설명 접기" : "보스 배틀은 무엇인가요?"}</b><small>기본 배틀을 익힌 뒤 도전하는 복합 학습 모드</small></button>
                {showBossModes && <div className="boss-mode-panel">{fogBossModes.map((mode, index) => <button className={bossMode === mode ? "active" : ""} key={mode} onClick={() => { setBossMode(mode); setFogReady(true); success(`${mode} 보스 배틀 출전 준비가 완료되었습니다.`); }}><b>{mode.split(" · ")[0]}</b><small>{mode.split(" · ")[1]}</small><p>{fogBossDescriptions[index]}</p></button>)}</div>}
              </div>
            </div>
          </div>
        );
      }
      case "teach-correct":
        return (
          <div className="correct-demo"><span className="demo-stage-label">NPC draft · Find and fix</span><h3>He is standing <button className={selected === "near" ? "wrong" : ""} onClick={() => setSelected("near")}>near</button> a bank and a hospital.</h3><div className="lab-option-grid">{["between", "on", "at"].map((word) => <button key={word} onClick={() => success(word === "between" ? "교정 성공 · 이제 왜 between인지 설명해 주세요." : "두 장소와의 관계를 다시 살펴보세요.")}>{word}</button>)}</div></div>
        );
      case "teach-quiz":
        return (
          <div className="quiz-maker"><span className="demo-stage-label">Create a question for NPC</span><label>Question<input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="The cat is ___ the boxes." /></label><div className="lab-option-grid">{["between", "near", "+ Add choice"].map((word) => <button key={word}>{word}</button>)}</div><button className="lab-action" onClick={() => success(typed.trim() ? "문제가 NPC의 복습 덱에 저장되었습니다." : "문제 문장을 먼저 만들어주세요.")}>Publish quiz</button></div>
        );
      case "teach-material":
        return (
          <div className="material-maker"><span className="demo-stage-label">Mini lesson sheet</span><div className="material-parts">{["Rule", "Picture", "Example", "Question"].map((part) => <button className={material.includes(part) ? "active" : ""} key={part} onClick={() => setMaterial(material.includes(part) ? material.filter((value) => value !== part) : [...material, part])}>{part}</button>)}</div><div className="material-page"><b>BETWEEN</b>{material.map((part) => <span key={part}>{part} block</span>)}</div><button className="lab-action" onClick={() => success("교재 초안을 AI가 읽기 쉬운 순서로 정리했습니다.")}>Ask Pix to arrange</button></div>
        );
      case "teach-writing":
        return (
          <div className="writing-demo"><span className="demo-stage-label">NPC writing desk</span><p className="npc-draft">Original: “The bank are near park.”</p><label>Your revision<textarea value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Rewrite the sentence and add a short reason." /></label><button className="lab-action" onClick={() => success(typed.trim() ? "첨삭 전달 완료 · NPC가 수정 이유를 다시 설명합니다." : "수정 문장을 작성해 주세요.")}>Return feedback</button></div>
        );
      case "teach-analogy":
        return (
          <div className="analogy-demo"><span className="demo-stage-label">Explain with a drawing</span><ChalkPad /><VoiceControl active={active} onClick={voice} label="Explain your drawing" /></div>
        );
      case "teach-review":
        return (
          <div className="review-demo"><span className="demo-stage-label">NPC mastery check</span><h3>What should we review first?</h3><div className="review-checks">{["Meaning recall", "Use in a sentence", "Explain the rule"].map((check) => <button className={selected === check ? "active" : ""} key={check} onClick={() => { setSelected(check); success(`${check} 복습 질문을 시작합니다.`); }}><i>✓</i><span>{check}</span></button>)}</div></div>
        );
      default:
        return (
          <div className="teach-voice-demo">
            <div className="npc-class"><span>NPC</span><b>?</b><p>{item.title} 활동을 기다리고 있어요.</p></div>
            <div><span className="demo-stage-label">AI teaching session</span><h3>{item.description}</h3><p className="teaching-prompt">“between은 두 장소 사이에 있을 때 써. 예를 들면…”</p><VoiceControl active={active} onClick={voice} label={item.id === "teach-pronunciation" ? "Coach pronunciation" : "Start teaching"} /></div>
          </div>
        );
    }
  })();
  const cast = activityCastFor(item, phase);
  const sandboxStyle: CSSProperties = phase === "do" && doActivityBackgroundByItem[item.id]
    ? { backgroundImage: `url(${doActivityBackgroundByItem[item.id]})` }
    : {};
  const missionBrief = phase === "do" ? doMissionBriefs[item.id] : undefined;

  return (
    <div className={`activity-sandbox sandbox-${phase} scene-${item.id} ${feedback ? "scene-reacting" : ""}`} style={sandboxStyle}>
      <div className="sandbox-world-shade" />
      <div className="gameplay-ornaments" aria-hidden="true">
        <i className="magic-ring ring-a" />
        <i className="magic-ring ring-b" />
        <span className="ui-rune rune-a">E</span>
        <span className="ui-rune rune-b">L</span>
        <span className="ui-rune rune-c">V</span>
      </div>
      <div className="sandbox-world-hud">
        <span><i>{phase === "watch" ? "W" : phase === "do" ? "D" : "T"}</i><b>{scene.location}</b><small>{scene.objective}</small></span>
        <div className="scene-signal"><small>{phase === "watch" ? "LESSON SIGNAL" : phase === "do" ? "MISSION SIGNAL" : "UNDERSTANDING"}</small><b>{feedback ? "ACTIVE" : "READY"}</b><i><em style={{ width: feedback ? "82%" : "38%" }} /></i></div>
      </div>
      {missionBrief && (
        <aside className="scene-play-brief" aria-label="Activity guide">
          <span>MISSION GUIDE</span>
          <b>{missionBrief.title}</b>
          <p>{missionBrief.mission}</p>
          <small>{missionBrief.control}</small>
        </aside>
      )}
      {missionBrief && (
        <aside className="scene-pix-hint-card" aria-label="Pix hint">
          <i>PIX</i>
          <span>{missionBrief.pix}</span>
        </aside>
      )}
      <div className={`activity-cast ${cast.className}`} aria-hidden="true">
        <img className="cast-main" src={cast.main} alt={cast.mainAlt} />
        {cast.enemy && <img className="cast-enemy" src={cast.enemy} alt="Fog creature enemy" />}
        <img className="cast-ally" src={cast.ally} alt="Pix companion" />
      </div>
      <div className="scene-character-tag">
        <i>{scene.actor.slice(0, 1)}</i><span><b>{scene.actor}</b><small>{scene.role}</small></span>
      </div>
      <div className="scene-effect-layer">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
      <div className="sandbox-preview-frame">{preview}</div>
      <div className={`scene-dialogue-panel lab-feedback ${feedback ? "show" : ""}`} role="status">
        <span>{feedback ? "PIX · LIVE FEEDBACK" : scene.actor}</span>
        <p>{feedback || scene.line}</p>
        <small>{feedback ? "AI analysis applied to the scene" : "Interact with the activity to continue"}</small>
      </div>
    </div>
  );
}

function ActivityLab({ navigate }: { navigate: (screen: Screen) => void }) {
  const [phase, setPhase] = useState<ActivityPhase>("watch");
  const [expanded, setExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selection, setSelection] = useState<Record<ActivityPhase, string>>({
    watch: activityLibrary.watch[0].id,
    do: activityLibrary.do[0].id,
    teach: activityLibrary.teach[0].id,
  });
  const selected = activityLibrary[phase].find((item) => item.id === selection[phase]) ?? activityLibrary[phase][0];
  const guide = activityGuides[selected.id] ?? {
    activity: selected.description,
    control: `${selected.input} 방식으로 화면의 안내에 따라 활동합니다.`,
    learning: phase === "watch" ? "새 개념을 보고 듣고 이해합니다." : phase === "teach" ? "배운 내용을 설명하며 이해를 완성합니다." : "배운 영어를 실제 상황에 적용합니다.",
  };
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        setDetailsOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    document.body.classList.toggle("activity-focus-open", expanded);
    return () => {
      window.removeEventListener("keydown", close);
      document.body.classList.remove("activity-focus-open");
    };
  }, [expanded]);

  useEffect(() => {
    setDetailsOpen(false);
  }, [phase, selected.id]);
  const selectPhase = (nextPhase: ActivityPhase) => {
    setPhase(nextPhase);
  };
  const handlePreviewAction = () => {
    if (phase === "teach") {
      navigate("teach");
      return;
    }
    setExpanded(!expanded);
  };

  return (
    <main
      className={`page activity-lab-page activity-${selected.id} ${expanded ? "activity-focus-mode" : ""} ${expanded && detailsOpen ? "activity-details-open" : ""}`}
      data-bgm-context={`${phase}:${selected.id}`}
    >
      <div className="activity-lab-heading">
        <div><span className="kicker">Activity Atlas · Prototype Gallery</span><h1>One lesson, many ways to learn.</h1><p>기획안의 활동 유형을 단계별로 살펴보고, 각 입력 방식이 어떻게 다른 경험이 되는지 직접 체험해보세요.</p></div>
        <Button variant="ghost" onClick={() => navigate("home")}>Back to Home</Button>
      </div>
      <nav className="phase-selector" aria-label="Activity phase">
        {(["watch", "do", "teach"] as ActivityPhase[]).map((item, index) => <button key={item} className={phase === item ? "active" : ""} onClick={() => selectPhase(item)} aria-label={`${index + 1}. ${item.toUpperCase()} - ${item === "teach" ? "Open TeachAI" : activityPhaseCopy[item][0]}`}><span>0{index + 1}</span><b>{item}</b><small>{item === "teach" ? "OPEN TEACHAI" : activityPhaseCopy[item][0]}</small></button>)}
      </nav>
      <section className="activity-atlas">
        <aside className="activity-catalog">
          <div className="catalog-heading"><span>{phase} collection</span><b>{activityLibrary[phase].length} activity types</b><p>{activityPhaseCopy[phase][1]}</p></div>
          <div className="catalog-list">
            {activityLibrary[phase].map((item, index) => <div className="catalog-entry" key={item.id}>{phase === "do" && item.group !== activityLibrary[phase][index - 1]?.group && <span className="catalog-group-label">{item.group}</span>}<button className={selected.id === item.id ? "active" : ""} onClick={() => setSelection({ ...selection, [phase]: item.id })} aria-label={`${item.title}. ${item.subtitle}`}><i>{item.badge}</i><span><b>{item.title}</b><small>{item.subtitle}</small></span><em>›</em></button></div>)}
          </div>
        </aside>
        <div className="activity-preview">
          <header className="preview-heading">
            <div><span>{selected.badge} · {selected.input}</span><h2>{selected.title}</h2><p>{selected.description}</p></div>
            <div className="preview-tools"><div className="ai-badge"><i>AI</i><span><b>Adaptive input</b><small>Voice-first · fallback supported</small></span></div><button className="focus-toggle" onClick={handlePreviewAction}><i>{phase === "teach" ? "T" : expanded ? "×" : "□"}</i><span>{phase === "teach" ? "TeachAI 바로 시작" : expanded ? "집중 모드 닫기" : "전체화면으로 체험"}</span><small>{phase === "teach" ? "Watch·Do 없이 열기" : expanded ? "ESC로 돌아가기" : "활동을 크게 열기"}</small></button></div>
          </header>
          <div className="activity-guide">
            <div><i>01</i><span><b>어떤 활동인가요?</b><p>{guide.activity}</p></span></div>
            <div><i>02</i><span><b>어떻게 조작하나요?</b><p>{guide.control}</p></span></div>
            <div><i>03</i><span><b>무엇을 배우나요?</b><p>{guide.learning}</p></span></div>
          </div>
          <ActivitySandbox key={selected.id} item={selected} phase={phase} />
        </div>
      </section>
    </main>
  );
}

function LearningMap({ navigate }: { navigate: (screen: Screen) => void }) {
  const [activeWeek, setActiveWeek] = useState(2);
  const regionMeta = [
    { name: "Verdant Crossing", focus: "Vehicles & Actions", signal: "Restored" },
    { name: "Grammia Capital", focus: "Places & Prepositions", signal: "Current Route" },
    { name: "Silent Tower", focus: "Travel Phrases", signal: "Fog Locked" },
    { name: "Moonlit Harbor", focus: "Mission Practice", signal: "Fog Locked" },
  ];
  const weekSessions = sessions.filter((session) => session.week === activeWeek);
  const route = (type: string) => {
    if (type === "monthly") navigate("monthly-intro");
    else if (type === "weekly") navigate("weekly-intro");
    else navigate("daily-intro");
  };
  return (
    <main className="page map-page">
      <div className="page-heading">
        <div><span className="kicker">Monthly Journey</span><h1>The Roads of Englantis</h1><p>빛난 길은 배운 영어로 복원한 지역입니다. 리뷰 관문에서 한 주의 힘을 확인하세요.</p></div>
        <Button variant="ghost" onClick={() => navigate("home")}>Back to Home</Button>
      </div>
      <div className="map-shell">
        <div className="map-command"><span>Chapter 01 · Route Scanner</span><b>{regionMeta[activeWeek - 1].name}</b><small>{regionMeta[activeWeek - 1].focus}</small></div>
        <div className="map-region-markers">
          {regionMeta.map((region, index) => (
            <button
              key={region.name}
              className={`map-region-marker region-${index + 1} ${activeWeek === index + 1 ? "active" : ""} ${index === 0 ? "restored" : index === 1 ? "current" : "locked"}`}
              onClick={() => setActiveWeek(index + 1)}
              aria-pressed={activeWeek === index + 1}
            >
              <span>W{index + 1}</span>
              <b>{region.name}</b>
              <small>{region.signal}</small>
            </button>
          ))}
        </div>
        <div className="map-week-panel">
          <div className="week-panel-copy"><span>WEEK {activeWeek} EXPEDITION</span><b>{regionMeta[activeWeek - 1].focus}</b><small>빛나는 퀘스트를 선택해 경로를 이어가세요.</small></div>
          <div className="map-route">
            {weekSessions.map((session, index) => (
              <button
                key={session.id}
                className={`map-node ${session.status} ${session.type}`}
                onClick={() => route(session.type)}
                disabled={session.status.includes("locked") && session.id !== "w2d5" && session.type !== "monthly"}
              >
                <span className="node-icon">{session.type === "daily" ? index + 1 : sessionIcons[session.type]}</span>
                <span className="node-copy"><b>DAY {session.day}</b><small>{session.title}</small></span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="map-legend">
        <span><i className="legend-completed" /> Restored</span>
        <span><i className="legend-current" /> Current quest</span>
        <span><i className="legend-locked" /> Hidden in fog</span>
      </div>
    </main>
  );
}

function DailyIntro({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="page intro-page">
      <div className="intro-scene">
        <div className="rune-compass"><span>W2</span><b>D3</b></div>
        <div className="intro-content">
          <span className="kicker">{dailyModule.city} Quest · Master {dailyModule.master}</span>
          <h1>{dailyModule.title}</h1>
          <h2>{dailyModule.subtitle}</h2>
          <p>Grammia의 길 표지판이 안개에 가려졌어! 장소의 위치를 알려주는 마법 좌표를 배워야 해.</p>
          <div className="word-runes">{dailyModule.vocab.map((word) => <span key={word}>{word}</span>)}</div>
          <Panel className="key-sentence" eyebrow="Today's Key Sentence"><p>{dailyModule.keySentence}</p></Panel>
          <div className="hero-actions"><Button onClick={() => navigate("watch")}>Start Quest</Button><Button variant="ghost" onClick={() => navigate("map")}>Return to Map</Button></div>
        </div>
        <Character name="Pix" role="Your learning companion" side="right" />
      </div>
    </main>
  );
}

type WatchPixMessage = {
  id: string;
  role: "student" | "pix";
  text: string;
  detail?: string;
  source?: WatchPixResponse["source"];
};

function requestedWatchExampleCount(question: string) {
  const digitMatch = question.match(/(\d+)\s*(개|문장|sentences?|examples?)/i);
  if (digitMatch) return Math.max(1, Math.min(6, Number(digitMatch[1])));
  if (/세\s*개|세\s*문장|three/i.test(question)) return 3;
  if (/두\s*개|두\s*문장|two/i.test(question)) return 2;
  return 3;
}

function wantsWatchExamples(question: string) {
  return /예시|예문|문장|활용|sentence|example/i.test(question);
}

function formatWatchExamples(examples: string[]) {
  return examples.map((example, index) => `${index + 1}. ${example}`).join("\n");
}

function buildLocalWatchPixResponse(lecture: WatchLecture, question: string): WatchPixResponse {
  const lowerQuestion = question.toLowerCase();
  const count = requestedWatchExampleCount(question);

  if (lowerQuestion.includes("near") && wantsWatchExamples(question)) {
    const examples = [
      "There is a park near my house.",
      "The library is near the school.",
      "I sit near the window in class.",
      "The bus stop is near the hospital.",
      "My bag is near the desk.",
      "The bakery is near the bank.",
    ].slice(0, count);
    return {
      answer: `near를 활용한 예시 문장 ${examples.length}개예요.\n${formatWatchExamples(examples)}`,
      quickCheck: "near는 한 기준점 가까이에 있을 때 씁니다.",
      followUp: "직접 하나 더 만들면: The ___ is near the ___.",
      source: "local",
    };
  }

  if (lowerQuestion.includes("between") && wantsWatchExamples(question)) {
    const examples = [
      "The bank is between the school and the hospital.",
      "I sit between Mina and Joon.",
      "The cat is between the boxes.",
      "The park is between the library and the museum.",
      "My pencil is between two books.",
      "The station is between City Hall and the market.",
    ].slice(0, count);
    return {
      answer: `between을 활용한 예시 문장 ${examples.length}개예요.\n${formatWatchExamples(examples)}`,
      quickCheck: "between은 두 기준점 사이에 있을 때 씁니다.",
      followUp: "직접 하나 더 만들면: The ___ is between ___ and ___.",
      source: "local",
    };
  }

  if (lowerQuestion.includes("on") && wantsWatchExamples(question)) {
    const examples = [
      "The book is on the desk.",
      "My sister puts a magazine on the box.",
      "There is a cup on the table.",
      "The picture is on the wall.",
      "My phone is on the chair.",
      "The sticker is on the notebook.",
    ].slice(0, count);
    return {
      answer: `on을 활용한 예시 문장 ${examples.length}개예요.\n${formatWatchExamples(examples)}`,
      quickCheck: "on은 표면 위에 닿아 있을 때 씁니다.",
      followUp: "직접 하나 더 만들면: The ___ is on the ___.",
      source: "local",
    };
  }

  if (lowerQuestion.includes("between") || question.includes("사이")) {
    return {
      answer: "between은 두 장소나 두 대상의 가운데를 말할 때 써요. 기준점이 두 개 보이면 먼저 between을 떠올리면 됩니다.",
      quickCheck: "두 기준점 사이 = between",
      followUp: `오늘 문장으로 다시 보면: ${lecture.keySentence}`,
      source: "local",
    };
  }

  if (lowerQuestion.includes("near") || question.includes("근처") || question.includes("가까")) {
    return {
      answer: "near는 정확히 사이가 아니라 가까운 곳에 있다는 뜻이에요. 기준 장소가 하나이고 주변에 있으면 near가 자연스럽습니다.",
      quickCheck: "한 기준점 가까이 = near",
      followUp: "예: There is a park near Tiger's apartment.",
      source: "local",
    };
  }

  if (lowerQuestion.includes("on") || question.includes("위")) {
    return {
      answer: "on은 표면 위에 닿아 있을 때 사용해요. 책상 위, 상자 위처럼 아래에서 받쳐주는 느낌을 생각하면 됩니다.",
      quickCheck: "표면에 닿아 있음 = on",
      followUp: "예: My sister puts a magazine on the box.",
      source: "local",
    };
  }

  return {
    answer: `${lecture.title}의 핵심은 장면이나 교재에서 위치 단서를 먼저 찾는 거예요. 두 대상 사이인지, 한 장소 근처인지, 표면 위인지 확인하면 전치사를 고르기 쉬워집니다.`,
    quickCheck: lecture.objective,
    followUp: `지금 강의의 기준 문장은 "${lecture.keySentence}"예요.`,
    source: "local",
  };
}

function initialWatchPixMessage(lecture: WatchLecture): WatchPixMessage {
  return {
    id: `${lecture.id}-intro`,
    role: "pix",
    text: lecture.pixPrompt,
    detail: "궁금한 점이 생기면 Pix를 눌러 바로 질문할 수 있어요.",
    source: "local",
  };
}

function WatchScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  const [activeLectureId, setActiveLectureId] = useState<WatchLecture["id"]>(watchScenes[0].id);
  const [bookPage, setBookPage] = useState(0);
  const [pixOpen, setPixOpen] = useState(false);
  const [pixQuestion, setPixQuestion] = useState("");
  const [pixMessages, setPixMessages] = useState<WatchPixMessage[]>(() => [initialWatchPixMessage(watchScenes[0])]);
  const [pixLoading, setPixLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaFrameRef = useRef<HTMLDivElement>(null);

  const lecture = watchScenes.find((item) => item.id === activeLectureId) ?? watchScenes[0];
  const activeIndex = Math.max(0, watchScenes.findIndex((item) => item.id === lecture.id));
  const activeBookPage = lecture.bookPages?.[bookPage] ?? lecture.bookPages?.[0];
  const masterLectureLine = lecture.masterLines?.[bookPage]
    ?? lecture.captions[bookPage % lecture.captions.length]
    ?? lecture.description;

  useEffect(() => {
    setBookPage(0);
    setPixQuestion("");
    setPixLoading(false);
    setPixMessages([initialWatchPixMessage(lecture)]);
  }, [lecture]);

  const askPix = async (question = pixQuestion) => {
    const trimmed = question.trim();
    if (!trimmed || pixLoading) return;

    setPixOpen(true);
    setPixQuestion("");
    setPixLoading(true);
    setPixMessages((messages) => [
      ...messages,
      { id: `student-${Date.now()}`, role: "student", text: trimmed },
    ]);

    try {
      const response = await sendWatchPixQuestion({
        lectureId: lecture.id,
        lectureTitle: lecture.title,
        instructor: lecture.instructor,
        objective: lecture.objective,
        keySentence: lecture.keySentence,
        captions: lecture.captions,
        question: trimmed,
      });
      setPixMessages((messages) => [
        ...messages,
        {
          id: `pix-${Date.now()}`,
          role: "pix",
          text: response.answer,
          detail: `${response.quickCheck} ${response.followUp}`,
          source: response.source,
        },
      ]);
    } catch {
      const response = buildLocalWatchPixResponse(lecture, trimmed);
      setPixMessages((messages) => [
        ...messages,
        {
          id: `pix-${Date.now()}`,
          role: "pix",
          text: response.answer,
          detail: `${response.quickCheck} ${response.followUp}`,
          source: response.source,
        },
      ]);
    } finally {
      setPixLoading(false);
    }
  };

  const openVideoFullscreen = async () => {
    const video = videoRef.current;
    const target = video ?? mediaFrameRef.current;
    if (!target) return;

    try {
      await target.requestFullscreen();
      await video?.play().catch(() => undefined);
    } catch {
      setPixOpen(true);
      setPixMessages((messages) => [
        ...messages,
        {
          id: `pix-fullscreen-${Date.now()}`,
          role: "pix",
          text: "브라우저가 전체화면을 바로 열지 못했어요. 영상 오른쪽 아래의 기본 전체화면 아이콘을 눌러도 됩니다.",
          source: "local",
        },
      ]);
    }
  };

  return (
    <main className="page watch-studio-page">
      <div className="watch-studio-heading">
        <div>
          <span className="kicker">WATCH · AI Lecture Studio</span>
          <h1>강의를 보고, 궁금하면 Pix에게 바로 물어보세요.</h1>
          <p>실제 강의, VR 캐릭터 강의, 도시 MASTER 교재 강의 중 하나를 선택해 오늘 표현을 이해합니다.</p>
        </div>
        <div className="watch-top-actions">
          <Button variant="ghost" onClick={() => navigate("course-select")}>과정표로 돌아가기</Button>
          <Button onClick={() => navigate("do-hub")}>DO 미션으로 이동</Button>
        </div>
      </div>

      <section className="watch-studio-layout">
        <aside className="watch-lecture-list" aria-label="Watch lecture types">
          <span>강의 선택</span>
          {watchScenes.map((item, index) => (
            <button
              key={item.id}
              className={item.id === lecture.id ? "active" : ""}
              onClick={() => setActiveLectureId(item.id)}
              aria-pressed={item.id === lecture.id}
            >
              <i>{String(index + 1).padStart(2, "0")}</i>
              <b>{item.title}</b>
              <small>{item.format}</small>
            </button>
          ))}
          <div className="watch-objective-card">
            <small>오늘의 목표</small>
            <b>{lecture.objective}</b>
            <p>{lecture.keySentence}</p>
          </div>
        </aside>

        <section className={`watch-main-stage watch-${lecture.id}`}>
          <div className="watch-stage-topline">
            <span>{lecture.label}</span>
            <b>{lecture.instructor}</b>
            <small>{activeIndex + 1} / {watchScenes.length}</small>
          </div>

          <div className="watch-media-frame" ref={mediaFrameRef}>
            {lecture.embedSrc ? (
              <>
                <iframe
                  key={lecture.embedSrc}
                  className="watch-lecture-video watch-youtube-embed"
                  src={lecture.embedSrc}
                  title={lecture.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
                <button className="watch-fullscreen-button" onClick={openVideoFullscreen}>
                  전체화면
                </button>
              </>
            ) : lecture.videoSrc ? (
              <>
                <video
                  key={lecture.videoSrc}
                  ref={videoRef}
                  className="watch-lecture-video"
                  src={lecture.videoSrc}
                  controls
                  playsInline
                  preload="metadata"
                />
                <button className="watch-fullscreen-button" onClick={openVideoFullscreen}>
                  전체화면
                </button>
              </>
            ) : (
              <div className="watch-master-board">
                <div className="watch-master-copy watch-master-speaker">
                  <span>MASTER LESSON</span>
                  <b>{lecture.instructor}</b>
                  <img className="watch-master-character" src={sceneAssets.characters.gram} alt={`${lecture.instructor} 강사 캐릭터`} />
                  <div className="watch-master-speech">
                    <strong>{lecture.instructor}</strong>
                    <p>{masterLectureLine}</p>
                  </div>
                </div>
                {activeBookPage && <img className="watch-master-page-image" src={activeBookPage.src} alt={`${lecture.instructor} ${activeBookPage.label}`} />}
                <div className="watch-page-switcher" aria-label="Textbook pages">
                  {lecture.bookPages?.map((page, index) => (
                    <button
                      key={page.label}
                      className={bookPage === index ? "active" : ""}
                      onClick={() => setBookPage(index)}
                      aria-label={`${page.label} 보기`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="watch-master-subtitle" aria-live="polite">
                  <b>{lecture.instructor}</b>
                  <span>{masterLectureLine}</span>
                </div>
              </div>
            )}

            <button className={`watch-pix-button ${pixOpen ? "active" : ""}`} onClick={() => setPixOpen((open) => !open)}>
              <img src={sceneAssets.characters.pixhappy} alt="Pix" />
              <span>ASK PIX</span>
            </button>
          </div>

          <div className="watch-caption-panel">
            <div>
              <span>{lecture.format}</span>
              <h2>{lecture.title}</h2>
              <p>{lecture.description}</p>
            </div>
            <ul>
              {lecture.captions.map((caption) => <li key={caption}>{caption}</li>)}
            </ul>
          </div>
        </section>

        <aside className={`watch-pix-ai-panel ${pixOpen ? "open" : ""}`} aria-label="Pix AI helper">
          <header>
            <img src={sceneAssets.characters.pix} alt="Pix AI helper" />
            <div>
              <span>PIX · Watch AI</span>
              <b>{pixLoading ? "생각하는 중..." : "강의 중 질문 도우미"}</b>
            </div>
            <button className="watch-pix-close" onClick={() => setPixOpen(false)} aria-label="Pix 도움 닫기">×</button>
          </header>

          <div className="watch-pix-thread" aria-live="polite">
            {pixMessages.map((message) => (
              <div className={`watch-pix-message ${message.role}`} key={message.id}>
                <b>{message.role === "pix" ? "Pix" : "You"}</b>
                <p>{message.text}</p>
                {message.detail && <small>{message.detail}</small>}
                {message.source === "openai" && <em>AI</em>}
              </div>
            ))}
            {pixLoading && <div className="watch-pix-message pix loading"><b>Pix</b><p>강의 내용을 다시 살펴보고 있어요...</p></div>}
          </div>

          <div className="watch-quick-questions">
            {lecture.quickQuestions.map((question) => (
              <button key={question} onClick={() => askPix(question)} disabled={pixLoading}>
                {question}
              </button>
            ))}
          </div>

          <form className="watch-pix-form" onSubmit={(event) => {
            event.preventDefault();
            void askPix();
          }}>
            <textarea
              value={pixQuestion}
              onChange={(event) => setPixQuestion(event.target.value)}
              placeholder="궁금한 점을 적어보세요. 예: between이랑 near는 뭐가 달라?"
            />
            <button type="submit" disabled={!pixQuestion.trim() || pixLoading}>Pix에게 질문</button>
          </form>
        </aside>
      </section>
    </main>
  );
}

function DoHub({
  navigate,
  completed,
}: {
  navigate: (screen: Screen) => void;
  completed: string[];
}) {
  const [activeMission, setActiveMission] = useState(doHubMissions[0].id);
  const active = doHubMissions.find((activity) => activity.id === activeMission) ?? doHubMissions[0];
  return (
    <main className="page do-hub-page">
      <div className="page-heading">
        <div><span className="kicker">DO · Field Practice</span><h1>오늘 배운 표현을 써보자</h1><p>정확한 영어를 선택하면 Grammia의 길이 다시 밝아져!</p></div>
        <div className="do-hub-actions">
          <Button variant="ghost" onClick={() => navigate("course-select")}>과정표로 돌아가기</Button>
          <Button variant="ghost" onClick={() => navigate("home")}>홈으로 돌아가기</Button>
          <div className="completion-ring"><b>{completed.length}</b><span>/ {doHubMissions.length} restored</span></div>
        </div>
      </div>
      <div className="mission-board">
        <section className={`mission-stage mission-${active.id}`}>
          <div className="mission-stage-top"><span>ACTIVE FIELD MISSION</span><b>{completed.includes(active.id) ? "RESTORED" : "READY"}</b></div>
          <div className="mission-stage-copy">
            <span className="mission-code">DO · {active.skill}</span>
            <h2>{active.title}</h2>
            <h3>{active.subtitle}</h3>
            <p>{active.description}</p>
            <div className="mission-specs"><span><small>OBJECTIVE</small>{active.objective}</span><span><small>REWARD</small>{active.reward}</span></div>
            <Button onClick={() => navigate(active.screen)}>{completed.includes(active.id) ? "Replay Mission" : "Deploy to Mission"}</Button>
          </div>
        </section>
        <aside className="mission-ledger">
          <div className="ledger-title"><span>Grammia Field Board</span><b>Choose a mission</b><small>{doHubMissions.length}가지 방식으로 오늘의 표현을 사용해보세요.</small></div>
          {doHubMissions.map((activity, index) => (
            <button key={activity.id} className={`mission-row ${active.id === activity.id ? "active" : ""} ${completed.includes(activity.id) ? "complete" : ""}`} onClick={() => setActiveMission(activity.id)} aria-pressed={active.id === activity.id}>
              <i>{completed.includes(activity.id) ? "✓" : `0${index + 1}`}</i>
              <span><b>{activity.title}</b><small>{activity.skill}</small></span>
              <em>{activity.reward}</em>
            </button>
          ))}
          <div className="ledger-progress"><ProgressBar value={(completed.length / doHubMissions.length) * 100} label="Field restoration" tone="mint" /></div>
        </aside>
      </div>
      <div className="hub-footer"><p><b>Pix's note</b> {doHubMissions.length}가지 미션을 완료하면 Milo에게 오늘 배운 내용을 가르칠 수 있어.</p><Button disabled={completed.length < doHubMissions.length} onClick={() => navigate("teach")}>Unlock Teach Mission</Button></div>
    </main>
  );
}

function FogBattleScene({
  navigate,
  complete,
}: {
  navigate: (screen: Screen) => void;
  complete: () => void;
}) {
  const [question, setQuestion] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [reveal, setReveal] = useState(false);
  const [shake, setShake] = useState(false);
  const data = sentenceQuestions[question];
  const battleTranslationClues = [
    "그는 은행과 병원 사이에 서 있어요.",
    "Tiger의 아파트 근처에 공원이 있어요.",
    "내 여동생은 잡지를 상자 위에 올려놓아요.",
  ];
  const battlePixHints = [
    "두 장소 사이의 관계를 찾으면 안개가 약해져요.",
    "가까이 있다는 단서가 보이면 near를 떠올려요.",
    "무언가의 표면 위에 있으면 on을 확인해요.",
  ];
  const correct = selected === data.answer;
  const hp = Math.round(((sentenceQuestions.length - question - (correct ? 1 : 0)) / sentenceQuestions.length) * 100);
  const finalPurified = correct && question === sentenceQuestions.length - 1;
  const choose = (choice: string) => {
    setSelected(choice);
    setReveal(true);
    if (choice !== data.answer) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };
  const next = () => {
    if (question === sentenceQuestions.length - 1) {
      complete();
      navigate("do-hub");
    } else {
      setQuestion((value) => value + 1);
      setSelected(undefined);
      setReveal(false);
    }
  };
  return (
    <main className={`battle-page ${shake ? "shake" : ""} ${reveal && selected === data.answer ? "purified" : ""}`}>
      <div className="battle-hud"><Button variant="ghost" onClick={() => navigate("do-hub")}>Exit Mission</Button><span>DO-B2 · Sentence Purify</span><b>Jiho · LV 12</b></div>
      <div className="battle-stage">
        <img className="battle-actor battle-jiho" src={sceneAssets.characters.jiho} alt="Jiho casting a spell" />
        <img className={`battle-actor battle-fogmon ${finalPurified ? "is-purified" : ""}`} src={finalPurified ? sceneAssets.characters.fogmonPurified : sceneAssets.characters.fogmon} alt={finalPurified ? "Purified fog creature" : "Fog creature"} />
        <img className="battle-actor battle-pix-img" src={sceneAssets.characters.pix} alt="Pix giving a hint" />
        <div className="battle-spell-beam" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="fog-creature"><div className="fog-core"><span>?</span></div><i /><i /><i /></div>
        <div className="battle-mission-card">
          <span>Translation Clue</span>
          <b>{battleTranslationClues[question]}</b>
          <small>먼저 한국어 뜻을 보고 빈칸의 관계를 추리하세요.</small>
        </div>
        <div className="battle-progress-card">
          <span>Mission Progress</span>
          <b>{question + 1} / {sentenceQuestions.length}</b>
          <i style={{ width: `${((question + (reveal && correct ? 1 : 0)) / sentenceQuestions.length) * 100}%` }} />
        </div>
        <div className="enemy-hud"><span>Fogbound Signkeeper</span><ProgressBar value={hp} label="Fog density" tone="fog" /></div>
        <div className="battle-pix">P<div>{reveal ? (selected === data.answer ? data.correct : data.wrong) : "문장 속 장소의 관계를 잘 살펴봐!"}</div></div>
        <Panel className="battle-question" eyebrow={`Purification spell · ${question + 1} / ${sentenceQuestions.length}`}>
          <h2>{data.prompt}</h2>
          <ChoiceList choices={data.choices} onChoose={choose} selected={selected} answer={data.answer} reveal={reveal} />
          {correct && <Button onClick={next}>{question === sentenceQuestions.length - 1 ? "Complete Purification" : "Next Spell"}</Button>}
        </Panel>
        {finalPurified && (
          <div className="battle-purified-art" role="status" aria-live="polite">
            <img src={doActivityAssets.sentencePurify.stonePurified} alt="" aria-hidden="true" />
            <span>
              <b>Purified!</b>
              <small>Sentence stone restored</small>
            </span>
          </div>
        )}
        {reveal && selected === data.answer && <SuccessBurst label="PURIFIED" />}
      </div>
    </main>
  );
}

function RunePuzzle({
  navigate,
  complete,
}: {
  navigate: (screen: Screen) => void;
  complete: () => void;
}) {
  const [puzzle, setPuzzle] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const data = runePuzzles[puzzle];
  const resetRune = () => {
    setSelected([]);
    setStatus("idle");
    setMessage("");
  };
  const advanceRune = () => {
    if (puzzle === runePuzzles.length - 1) {
      complete();
      navigate("do-hub");
      return;
    }
    setPuzzle((value) => value + 1);
    resetRune();
  };
  const check = () => {
    if (selected.join(" ") === data.answer) {
      setStatus("success");
      setMessage("룬 문장이 복원되었어!");
    } else {
      setStatus("error");
      setMessage("룬의 순서를 다시 살펴봐. 주어부터 시작해보자.");
    }
  };
  return (
    <main className={`rune-mission-page ${status === "success" ? "answer-correct" : status === "error" ? "answer-wrong" : ""}`}>
      <div className="mission-hud"><span>DO-N4 · Rune Observatory</span><div className="hud-pips">{runePuzzles.map((_, index) => <i key={index} className={index < puzzle ? "done" : index === puzzle ? "active" : ""} />)}</div><Button variant="ghost" onClick={() => navigate("do-hub")}>Exit Mission</Button></div>
      <div className="rune-workbench">
        <img className="rune-pix-guide" src={sceneAssets.characters.pix} alt="Pix hint guide" />
        <aside className="rune-brief">
          <span>RESTORATION ORDER</span>
          <h1>Build the sentence rune</h1>
          <p>흩어진 문장 조각을 의미가 통하는 순서로 연결하세요.</p>
          <div><small>TRANSLATION CLUE</small><b>{data.hint}</b></div>
          <div><small>ACTIVE RUNE</small><b>{puzzle + 1} / {runePuzzles.length}</b></div>
        </aside>
        <section className="rune-console">
          <div className="rune-status-strip">
            <div>
              <span>Translation Clue</span>
              <b>{data.hint}</b>
            </div>
            <div>
              <span>Current Progress</span>
              <b>{puzzle + 1} / {runePuzzles.length}</b>
            </div>
          </div>
          <div className="puzzle-count">RUNE SEQUENCE {puzzle + 1}</div>
          <div className={`rune-restoration-visual ${status === "success" ? "is-restored" : ""}`} aria-hidden="true">
            <img className="rune-restoration-door" src={status === "success" ? doActivityAssets.runePuzzle.doorOpen : doActivityAssets.runePuzzle.doorLocked} alt="" />
            {status === "success" && <img className="rune-restoration-light" src={doActivityAssets.runePuzzle.doorLight} alt="" />}
            {status === "success" && <img className="rune-restoration-snap" src={doActivityAssets.runePuzzle.runeSnap} alt="" />}
            <span>{status === "success" ? "RUNE GATE RESTORED" : "RESTORE THE RUNE GATE"}</span>
          </div>
          <div className="rune-answer">
            {data.blocks.map((_, index) => selected[index]
              ? <button key={`${selected[index]}-${index}`} onClick={() => { setStatus("idle"); setSelected(selected.filter((__, selectedIndex) => selectedIndex !== index)); }}>{selected[index]}</button>
              : <span className="empty-rune" key={index}>{index + 1}</span>)}
          </div>
          <div className="rune-blocks">{data.blocks.filter((word) => !selected.includes(word)).map((word) => <button key={word} onClick={() => { setStatus("idle"); setSelected([...selected, word]); }}>{word}</button>)}</div>
          {message && <p className={`puzzle-message ${status}`} role="status">{message}</p>}
          <div className="center-actions">
            <Button variant="ghost" onClick={resetRune}>Reset</Button>
            {status === "success"
              ? <Button onClick={advanceRune}>{puzzle === runePuzzles.length - 1 ? "Complete Rune Gate" : "Next Rune"}</Button>
              : <Button onClick={check} disabled={!selected.length}>Activate Rune</Button>}
          </div>
        </section>
        {status === "success" && <SuccessBurst label="RUNE RESTORED" />}
      </div>
    </main>
  );
}

function NpcMission({
  navigate,
  complete,
}: {
  navigate: (screen: Screen) => void;
  complete: () => void;
}) {
  const [question, setQuestion] = useState(0);
  const [selected, setSelected] = useState("");
  const data = npcQuestions[question];
  const correct = selected === data.answer;
  const objective = question === 0 ? "Find the boy" : "Find the park";
  const objectiveHint = question === 0 ? "Use between to describe two landmarks." : "Use near to describe a close landmark.";
  const next = () => {
    if (!correct) return;
    if (question === npcQuestions.length - 1) {
      complete();
      navigate("do-hub");
    } else {
      setQuestion(1);
      setSelected("");
    }
  };
  return (
    <main className={`npc-mission-page ${selected ? correct ? "answer-correct" : "answer-wrong" : ""}`}>
      <div className="npc-mission-hud">
        <span>DO-N1 · NPC Mission Talk</span>
        <b>Mission {question + 1} / 2</b>
        <Button variant="ghost" onClick={() => navigate("do-hub")}>Exit Mission</Button>
      </div>
      <section className="npc-mission-stage">
        <div className="npc-mission-visual">
          <img className="npc-mission-milo" src={doActivityAssets.npcMissionTalk.miloConfused} alt="Milo asking for directions" />
          <img className="npc-mission-sign" src={doActivityAssets.npcMissionTalk.routeSignpost} alt="" aria-hidden="true" />
          <img className="npc-mission-map" src={doActivityAssets.npcMissionTalk.mapFragment} alt="" aria-hidden="true" />
          <img className="npc-mission-path" src={doActivityAssets.npcMissionTalk.routeLightPath} alt="" aria-hidden="true" />
          <div className="npc-mission-objective">
            <span>FIELD REQUEST · MILO</span>
            <b>{objective}</b>
            <small>{objectiveHint}</small>
            <div className="locator-signal"><i /><i /><i /><span>{correct ? "ROUTE FOUND" : "SCANNING ROUTE"}</span></div>
          </div>
        </div>
        <div className="npc-mission-panel">
          <div className="npc-mission-speaker">
            <img src={doActivityAssets.npcMissionTalk.miloConfused} alt="" aria-hidden="true" />
            <div>
              <span>Milo's Request</span>
              <b>{question === 0 ? "길을 잃은 아이를 찾아주세요." : "공원이 어디인지 알려주세요."}</b>
            </div>
          </div>
          <div className="npc-mission-dialogue">
            <span>Milo</span>
            <p>{correct ? data.response : data.line}</p>
          </div>
          <div className="npc-choice-grid">
            {data.choices.map((choice, index) => (
              <button
                key={choice}
                className={`${selected === choice ? (choice === data.answer ? "correct" : "wrong") : ""}`}
                onClick={() => setSelected(choice)}
              >
                <i>{String.fromCharCode(65 + index)}</i>
                <span>{choice}</span>
              </button>
            ))}
          </div>
          <div className={`npc-mission-feedback ${selected ? (correct ? "success" : "error") : ""}`} role="status">
            <img src={sceneAssets.characters.pix} alt="" aria-hidden="true" />
            <p>{selected ? (correct ? "좋아요! 상황에 맞는 위치 표현으로 안내했어요." : "위치 관계를 다시 확인해보세요. 두 장소 사이인지, 가까운 곳인지가 단서예요.") : "Milo의 질문을 읽고 오늘 배운 위치 표현으로 가장 자연스러운 안내 문장을 고르세요."}</p>
          </div>
          <div className="npc-mission-actions">
            <Button onClick={next} disabled={!correct}>{question === 1 ? "Complete Mission" : "Continue"}</Button>
          </div>
        </div>
        {correct && <RewardToast show message="Milo 안내 성공!" label="+160 LINGO" />}
      </section>
    </main>
  );
}

type CultistMissionPhase = "selecting" | "hammerAttack" | "correctReveal" | "cultistFleeing" | "wrongAccused";

function CultistGrammarMission({
  navigate,
  complete,
}: {
  navigate: (screen: Screen) => void;
  complete: () => void;
}) {
  const [round, setRound] = useState(0);
  const [talked, setTalked] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [phase, setPhase] = useState<CultistMissionPhase>("selecting");
  const [guideOpen, setGuideOpen] = useState(false);
  const data = cultistGrammarCases[round];
  const selectedNpc = data.npcs.find((npc) => npc.id === selectedId);
  const allTalked = talked.length === data.npcs.length;
  const isCorrect = Boolean(selectedNpc?.isCultist);
  const progress = ((round + (isCorrect && phase !== "hammerAttack" ? 1 : 0)) / cultistGrammarCases.length) * 100;

  const imageForNpc = (npc: CultistNpc) => {
    return cultistNpcImage(npc, selectedId === npc.id, phase);
  };

  const listenToNpc = (npc: CultistNpc) => {
    if (phase !== "selecting" && phase !== "wrongAccused") return;
    setTalked((items) => Array.from(new Set([...items, npc.id])));
  };

  const accuseNpc = (npc: CultistNpc) => {
    if (!allTalked || phase !== "selecting") return;
    setSelectedId(npc.id);
    setPhase("hammerAttack");
    window.setTimeout(() => {
      setPhase(npc.isCultist ? "correctReveal" : "wrongAccused");
    }, 520);
    if (npc.isCultist) {
      window.setTimeout(() => setPhase("cultistFleeing"), 1250);
    }
  };

  const retry = () => {
    setSelectedId("");
    setPhase("selecting");
  };

  const nextRound = () => {
    if (round === cultistGrammarCases.length - 1) {
      complete();
      navigate("do-hub");
      return;
    }
    setRound((value) => value + 1);
    setTalked([]);
    setSelectedId("");
    setPhase("selecting");
    setGuideOpen(false);
  };

  const canAccuse = allTalked && phase === "selecting";
  const pixPrompt = phase === "hammerAttack"
    ? "문법 신호를 확인하는 중입니다."
    : phase === "wrongAccused"
      ? "이 후보는 올바른 문장을 말했어요. 다시 비교해보세요."
      : phase === "correctReveal" || phase === "cultistFleeing"
        ? "정답 문장과 올바른 문장을 비교해보세요."
        : canAccuse
          ? "세 문장을 모두 확인했어요. 규칙이 깨진 후보를 지목하세요."
          : "A, B, C 후보를 눌러 문장을 먼저 확인하세요.";

  return (
    <main className={`cultist-mission-page phase-${phase}`}>
      <div className="cultist-mission-hud">
        <Button variant="ghost" onClick={() => navigate("do-hub")}>Exit Mission</Button>
        <span>DO-G1 · Find the Cultist</span>
        <b>Round {round + 1} / {cultistGrammarCases.length}</b>
      </div>
      <section className="cultist-arena">
        <div className="cultist-atlas-game cultist-learning-game">
          <header className="cultist-atlas-header">
            <div>
              <span>Grammar Investigation · Round {round + 1}</span>
              <h3>사이비 신도를 찾아라</h3>
              <p>{data.mission}</p>
            </div>
            <div className="cultist-atlas-progress">
              <ProgressBar value={progress} label="Cultist exposed" tone="mint" />
              <small>문장 확인 {talked.length} / {data.npcs.length}</small>
            </div>
          </header>
          <button className="cultist-guide-toggle" type="button" onClick={() => setGuideOpen((open) => !open)}>
            {guideOpen ? "게임 방법 접기" : "게임 방법 보기"}
          </button>
          <div className={`cultist-atlas-rule ${guideOpen ? "is-open" : "is-collapsed"}`}>
            <b>PIX GRAMMAR CLUE</b>
            <span>{data.clue}</span>
            <em>{allTalked ? "이제 의심 후보를 지목하세요." : "먼저 모든 문장을 확인하세요."}</em>
          </div>
          <div className={`cultist-atlas-brief ${guideOpen ? "is-open" : "is-collapsed"}`} aria-live="polite">
            <span className={talked.length > 0 ? "done" : ""}>1. 문장 수집</span>
            <span className={allTalked ? "done" : ""}>2. 규칙 비교</span>
            <span className={selectedId ? "done" : ""}>3. 후보 지목</span>
            <b>{pixPrompt}</b>
          </div>
          <div className="cultist-atlas-row">
            {data.npcs.map((npc, index) => {
              const hasTalked = talked.includes(npc.id);
              const isSelected = selectedId === npc.id;
              const candidateLabel = String.fromCharCode(65 + index);
              const npcImage = imageForNpc(npc);
              return (
                <button
                  key={npc.id}
                  className={`cultist-atlas-card ${hasTalked ? "has-talked" : ""} ${isSelected ? "accused" : ""} ${isSelected && npc.isCultist && phase !== "hammerAttack" ? "revealed" : ""} ${isSelected && !npc.isCultist && phase === "wrongAccused" ? "innocent reacting" : ""}`}
                  style={{ "--cultist-image": `url(${npcImage})` } as CSSProperties}
                  onClick={() => (canAccuse ? accuseNpc(npc) : listenToNpc(npc))}
                  aria-label={canAccuse ? `${candidateLabel} 후보 지목하기: ${npc.sentence}` : `${candidateLabel} 후보 문장 확인`}
                >
                  <img src={npcImage} alt={`${candidateLabel} candidate`} onError={(event) => { event.currentTarget.style.opacity = "0"; }} />
                  {isSelected && phase === "hammerAttack" && <img className="cultist-atlas-hammer" src={cultistAssets.hammerHero} alt="" aria-hidden="true" />}
                  {hasTalked && <span className="cultist-atlas-speech">{npc.sentence}</span>}
                  {isSelected && !npc.isCultist && phase === "wrongAccused" && <span className="cultist-atlas-reaction">{cultistWrongAccusedLine(npc)}</span>}
                  <i>{candidateLabel}</i>
                  <b>{hasTalked ? npc.sentence : "문장 듣기 전"}</b>
                  <small>{canAccuse ? "지목하기" : hasTalked ? "확인 완료" : "눌러서 듣기"}</small>
                </button>
              );
            })}
          </div>
          <div className={`cultist-atlas-feedback ${phase === "wrongAccused" ? "error" : phase === "correctReveal" || phase === "cultistFleeing" ? "success" : ""}`} role="status" aria-live="polite">
            <img src={sceneAssets.characters.pix} alt="Pix" onError={(event) => { event.currentTarget.hidden = true; }} />
            <p>
              {!selectedNpc && (allTalked ? "세 문장을 비교해 보세요. 위치 단서와 전치사가 서로 맞지 않는 후보가 있어요." : "처음에는 모두 같은 로브를 입고 있어요. 외형이 아니라 문장을 근거로 찾아야 해요.")}
              {phase === "hammerAttack" && "Jiho가 말랑망치를 들고 출동합니다. 문법 신호를 확인하는 중..."}
              {phase === "wrongAccused" && selectedNpc && <>이 NPC는 올바른 문장을 말했어요. <b>{selectedNpc.sentence}</b>는 규칙에 맞습니다.</>}
              {(phase === "correctReveal" || phase === "cultistFleeing") && selectedNpc && <>정답! <b>{selectedNpc.sentence}</b>가 깨진 문장이에요. 올바른 문장은 <b>{selectedNpc.correctSentence}</b>입니다. {selectedNpc.grammarPoint}</>}
            </p>
            {phase === "wrongAccused" && <button className="cultist-atlas-retry" onClick={retry}>다시 추리하기</button>}
            {(phase === "correctReveal" || phase === "cultistFleeing") && <button className="cultist-atlas-retry" onClick={nextRound}>{round === cultistGrammarCases.length - 1 ? "미션 완료" : "다음 조사"}</button>}
            <RewardToast show={phase === "correctReveal" || phase === "cultistFleeing"} message="문법 신도 검거 성공!" label="+200 LINGO" />
          </div>
        </div>
      </section>
    </main>
  );
}

function TeachMock({ navigate }: { navigate: (screen: Screen) => void }) {
  const [step, setStep] = useState(0);
  const understanding = [40, 65, 90][step];
  const lines = [
    "I'm confused. I think between means close to something. Is that right?",
    "Oh! So between means in the middle. Then what does near mean?",
    "Now I understand! The park is near the apartment, but the boy is between the bank and the hospital!",
  ];
  const choices = step === 0
    ? ["Between means in the middle of two things.", "Between means on top of something.", "Between means far away."]
    : ["Near means close to something.", "Near means between two things.", "Near means under something."];
  const answer = choices[0];
  const [selected, setSelected] = useState("");
  return (
    <main className="page visual-novel-page">
      <div className="scene-topline"><span>TEACH · Explain what you learned</span><b>Teach Type · Explain</b></div>
      <div className={`visual-scene library ${selected ? selected === answer ? "answer-correct" : "answer-wrong" : ""}`}>
        <Character name="Milo" role="Your student" />
        <div className="teach-console">
          <Panel className="understanding-panel" eyebrow="NPC Learning Signal"><ProgressBar value={understanding} label="Milo Understanding" tone="mint" /></Panel>
          <DialogueBox speaker="Milo" text={lines[step]} />
          {step < 2 ? (
            <>
              <ChoiceList choices={choices} onChoose={setSelected} selected={selected} answer={answer} reveal={Boolean(selected)} />
              <Button
                disabled={selected !== answer}
                onClick={() => { setStep((value) => value + 1); setSelected(""); }}
              >Teach this idea</Button>
            </>
          ) : (
            <Panel className="teach-result" eyebrow="Teach Mission Complete">
              <h2>Milo can explain the difference.</h2>
              <div className="reward-row"><span>Understanding <b>90%</b></span><span>LV <b>+40</b></span><span>Lingco <b>+15</b></span></div>
              <Button onClick={() => navigate("daily-result")}>View Quest Result</Button>
            </Panel>
          )}
        </div>
        <Character name="Pix" role="AI teaching coach" side="right" />
        {selected === answer && <SuccessBurst label="UNDERSTANDING UP" />}
      </div>
    </main>
  );
}

const scaffoldOptions: { level: ScaffoldLevel; title: string; description: string; input: string }[] = [
  { level: 1, title: "선택형 Teach", input: "Choice", description: "보기와 강한 힌트로 교정-이유-평가 흐름을 경험합니다." },
  { level: 2, title: "타이핑형 Teach", input: "Typing", description: "정답 문장은 직접 쓰고, 이유는 짧은 키워드로 설명합니다." },
  { level: 3, title: "빈칸 대화형", input: "Blank", description: "문장 스타터와 빈칸을 활용해 설명 구조를 익힙니다." },
  { level: 4, title: "자유 대화형", input: "Free", description: "자기 말로 NPC에게 규칙과 예문을 설명합니다." },
];

function TeachMissionHeader({
  session,
  progress,
}: {
  session: TeachSessionState;
  progress: number;
}) {
  return (
    <header className="teach-ai-header">
      <div>
        <span className="kicker">TeachAI Mission · NPC Teach-back</span>
        <h1>{defaultTeachLesson.title}</h1>
        <p>{defaultTeachLesson.missionGoal}</p>
      </div>
      <div className="teach-ai-status">
        <span>Target</span>
        <b>{defaultTeachLesson.targetGrammar}</b>
        <ProgressBar value={progress} label="NPC Understanding" tone="mint" />
        <small>Score {session.score} · Attempts {session.attempts} · Hints {session.hintUsed}</small>
      </div>
    </header>
  );
}

function TeachStepProgress({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="teach-step-progress" aria-label="TeachAI step progress">
      {letsTeachMissionSteps.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "locked";
        return (
          <div className={`teach-step-pill ${state}`} key={step.id}>
            <span>{index + 1}</span>
            <b>{step.title}</b>
            <small>{step.expectedAction.replace(/_/g, " ")}</small>
          </div>
        );
      })}
    </div>
  );
}

function NPCDialoguePanel({
  step,
  evaluation,
  session,
}: {
  step: TeachMissionStep;
  evaluation: TeachEvaluation | null;
  session: TeachSessionState;
}) {
  return (
    <section className={`npc-dialogue-panel ${evaluation ? evaluation.correct ? "correct" : "retry" : ""}`}>
      <div className="npc-avatar">
        <span>M</span>
        <small>{defaultTeachLesson.npc.title}</small>
      </div>
      <div className="npc-bubble">
        <span>{defaultTeachLesson.npc.npcName} · teachable NPC</span>
        <p>{evaluation ? evaluation.npcMessage : step.npcLine}</p>
        {evaluation && <small>{evaluation.teacherNote}</small>}
      </div>
      <div className="npc-state-meter">
        <span>Understanding {session.npcUnderstanding}%</span>
        <ProgressBar value={session.npcUnderstanding} tone="mint" />
        <span>Confidence {session.npcConfidence}%</span>
        <ProgressBar value={session.npcConfidence} tone="gold" />
      </div>
    </section>
  );
}

function StudentInputPanel({
  step,
  scaffoldLevel,
  answer,
  evaluation,
  pendingSession,
  submitting = false,
  onAnswerChange,
  onSubmit,
  onAdvance,
}: {
  step: TeachMissionStep;
  scaffoldLevel: ScaffoldLevel;
  answer: string;
  evaluation: TeachEvaluation | null;
  pendingSession: TeachSessionState | null;
  submitting?: boolean;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  onAdvance: () => void;
}) {
  const inputConfig = getTeachInputForLevel(step, scaffoldLevel);
  const locked = Boolean(evaluation?.correct);
  const canSubmit = answer.trim().length > 0 && !locked && !submitting;

  return (
    <section className="student-input-panel">
      <div className="student-input-copy">
        <span>{step.missionLabel}</span>
        <h2>{inputConfig.prompt}</h2>
        {inputConfig.starter && <p className="teach-starter">{inputConfig.starter}</p>}
        <p>예시 답안: {inputConfig.exampleAnswer}</p>
      </div>

      {(inputConfig.inputType === "choice" || inputConfig.inputType === "ox") && inputConfig.choices ? (
        <ChoiceList
          choices={inputConfig.choices}
          selected={answer}
          answer={inputConfig.correctAnswer}
          reveal={Boolean(evaluation)}
          locked={locked}
          onChoose={onAnswerChange}
        />
      ) : inputConfig.inputType === "blank" ? (
        <input
          className="teach-blank-box"
          value={answer}
          disabled={locked}
          placeholder={inputConfig.placeholder ?? inputConfig.exampleAnswer}
          onChange={(event) => onAnswerChange(event.target.value)}
        />
      ) : (
        <textarea
          className={`teach-answer-box ${inputConfig.inputType === "free_text" ? "free-mode" : ""}`}
          value={answer}
          disabled={locked}
          placeholder={inputConfig.placeholder ?? inputConfig.exampleAnswer}
          onChange={(event) => onAnswerChange(event.target.value)}
        />
      )}

      {evaluation && (
        <div className={`teach-evaluation ${evaluation.correct ? "success" : "retry"}`} role="status">
          <b>{evaluation.correct ? "NPC understanding up" : "Teach one more time"}</b>
          <span>{evaluation.pixGuide}</span>
        </div>
      )}

      <div className="teach-input-actions">
        <Button disabled={!canSubmit} onClick={onSubmit}>{submitting ? "NPC가 듣는 중..." : "NPC에게 알려주기"}</Button>
        {evaluation?.correct && (
          <Button variant="ghost" onClick={onAdvance}>
            {pendingSession?.completed ? "결과 보기" : "다음 Teach 단계"}
          </Button>
        )}
      </div>
    </section>
  );
}

function PixHelperPanel({
  step,
  scaffoldLevel,
  hintLevel,
  onHint,
}: {
  step: TeachMissionStep;
  scaffoldLevel: ScaffoldLevel;
  hintLevel: number;
  onHint: () => void;
}) {
  const alwaysOpen = scaffoldLevel === 1;
  const visibleHintCount = alwaysOpen ? Math.max(2, hintLevel) : hintLevel;
  const visibleHints = step.hintLadder.slice(0, visibleHintCount);
  const canRevealMore = visibleHintCount < step.hintLadder.length;
  const helperMode = scaffoldLevel === 1 ? "힌트 항상 공개" : scaffoldLevel === 4 ? "요청 시만 개입" : "힌트 버튼";

  return (
    <aside className="pix-helper-panel">
      <div className="pix-helper-head">
        <img src={sceneAssets.characters.pix} alt="PIX helper" />
        <div>
          <span>PIX · helper AI</span>
          <b>{helperMode}</b>
        </div>
      </div>
      <div className="pix-guide-card">
        <span>What to do</span>
        <b>{step.pixGuide}</b>
      </div>
      <div className="pix-guide-card">
        <span>Lesson rule</span>
        <b>{defaultTeachLesson.successConcept}</b>
      </div>
      <div className="pix-hint-stack">
        <span>Progressive hints</span>
        {visibleHints.length ? (
          visibleHints.map((hint, index) => <p key={hint}><b>Hint {index + 1}</b>{hint}</p>)
        ) : (
          <p><b>Ready</b>막히면 PIX에게 힌트를 요청하세요.</p>
        )}
        {scaffoldLevel > 1 && (
          <button className="pix-hint-button" onClick={onHint} disabled={!canRevealMore}>
            {canRevealMore ? "PIX 힌트 보기" : "힌트 모두 열림"}
          </button>
        )}
      </div>
    </aside>
  );
}

function TeachResultModal({
  result,
  navigate,
  onRestart,
}: {
  result: TeachResult;
  navigate: (screen: Screen) => void;
  onRestart: () => void;
}) {
  return (
    <section className="teach-result-modal">
      <span className="kicker">Teach Mission Complete</span>
      <h2>NPC가 오늘 규칙을 배웠어요.</h2>
      <p>{result.studentSummary}</p>
      <div className="teach-result-stats">
        <div><span>Teach Score</span><b>{result.score}</b></div>
        <div><span>Understanding</span><b>{result.understanding}%</b></div>
        <div><span>Confidence</span><b>{result.confidence}%</b></div>
      </div>
      <div className="teach-metric-grid">
        {result.metrics.map((metric) => (
          <div className={`teach-metric ${metric.tone}`} key={metric.label}>
            <span>{metric.label}</span>
            <b>{metric.value}</b>
          </div>
        ))}
      </div>
      <p className="teach-next-practice">{result.nextPractice}</p>
      <details className="teach-report-details">
        <summary>리포트 문구 보기</summary>
        <p><b>학부모용</b>{result.parentSummary}</p>
        <p><b>원장/강사용</b>{result.teacherSummary}</p>
      </details>
      <div className="hero-actions">
        <Button onClick={() => navigate("daily-result")}>Quest Result로 이동</Button>
        <Button variant="ghost" onClick={onRestart}>다시 가르치기</Button>
      </div>
    </section>
  );
}

function applyTeachEvaluation(
  session: TeachSessionState,
  step: TeachMissionStep,
  answer: string,
  hintLevel: number,
  evaluation: TeachEvaluation,
): TeachSessionState {
  const nextIndex = evaluation.correct ? session.currentStepIndex + 1 : session.currentStepIndex;
  const completed = nextIndex >= letsTeachMissionSteps.length;
  const inputConfig = getTeachInputForLevel(step, session.scaffoldLevel);

  return {
    ...session,
    attempts: session.attempts + 1,
    score: Math.min(100, session.score + evaluation.scoreDelta),
    currentStepIndex: nextIndex,
    completed,
    npcUnderstanding: Math.min(100, session.npcUnderstanding + evaluation.understandingDelta),
    npcConfidence: Math.min(100, session.npcConfidence + evaluation.confidenceDelta),
    history: [
      ...session.history,
      {
        stepId: step.id,
        answer,
        correct: evaluation.correct,
        feedback: evaluation.npcMessage,
        inputType: inputConfig.inputType,
        scoreDelta: evaluation.scoreDelta,
        hintLevel,
      },
    ],
  };
}

function buildEvaluationFromApi(
  step: TeachMissionStep,
  answer: string,
  response: Awaited<ReturnType<typeof sendTeachAiMessage>>,
): TeachEvaluation {
  return {
    correct: response.isCorrect,
    scoreDelta: response.isCorrect ? response.scoreDelta : 0,
    npcMessage: response.npcMessage,
    pixGuide: response.pixGuide,
    teacherNote: response.teacherNote ?? (response.isCorrect ? step.teacherNote : "아직 설명 신호가 부족합니다. 예시와 규칙을 다시 연결해보세요."),
    normalizedAnswer: response.normalizedAnswer ?? answer.trim(),
    understandingDelta: response.isCorrect ? response.npcStateUpdate.understandingDelta : 0,
    confidenceDelta: response.isCorrect ? response.npcStateUpdate.confidenceDelta : 0,
    skillKey: step.skillKey,
  };
}

function TeachAIStage({ navigate }: { navigate: (screen: Screen) => void }) {
  const [scaffoldLevel, setScaffoldLevel] = useState<ScaffoldLevel>(2);
  const [started, setStarted] = useState(false);
  const [session, setSession] = useState<TeachSessionState>(() => startTeachSession(defaultTeachLesson.id, 2));
  const [pendingSession, setPendingSession] = useState<TeachSessionState | null>(null);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<TeachEvaluation | null>(null);
  const [result, setResult] = useState<TeachResult | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const step = getCurrentTeachStep(session);
  const progress = result ? 100 : session.npcUnderstanding;

  const resetFeedback = () => {
    setAnswer("");
    setEvaluation(null);
    setPendingSession(null);
    setHintLevel(0);
  };

  const beginMission = () => {
    const nextSession = startTeachSession(defaultTeachLesson.id, scaffoldLevel);
    setSession(nextSession);
    setStarted(true);
    setResult(null);
    resetFeedback();
  };

  const restartMission = () => {
    const nextSession = startTeachSession(defaultTeachLesson.id, scaffoldLevel);
    setSession(nextSession);
    setResult(null);
    resetFeedback();
  };

  const updateAnswer = (nextAnswer: string) => {
    setAnswer(nextAnswer);
    if (evaluation && !evaluation.correct) {
      setEvaluation(null);
    }
  };

  const requestPixHint = () => {
    if (hintLevel >= step.hintLadder.length) return;
    setHintLevel((value) => value + 1);
    setSession((value) => ({ ...value, hintUsed: value.hintUsed + 1 }));
  };

  const submitAnswer = async () => {
    if (!answer.trim() || evaluation?.correct || submitting) return;
    setSubmitting(true);

    try {
      const apiResponse = await sendTeachAiMessage({
        sessionId: session.sessionId,
        lessonId: session.lessonId,
        teachLevel: session.scaffoldLevel,
        currentStep: step.type,
        studentMessage: answer,
        conversationHistory: session.history,
        lesson: defaultTeachLesson,
        step,
        hintLevel,
      });
      const nextEvaluation = buildEvaluationFromApi(step, answer, apiResponse);
      const nextSession = applyTeachEvaluation(session, step, answer, hintLevel, nextEvaluation);

      setEvaluation(nextEvaluation);
      if (nextEvaluation.correct) {
        setPendingSession(nextSession);
      } else {
        setSession(nextSession);
        setPendingSession(null);
        if (session.scaffoldLevel === 2 && hintLevel === 0) {
          setHintLevel(1);
          setSession((value) => ({ ...value, hintUsed: value.hintUsed + 1 }));
        }
      }
    } catch (error) {
      console.warn("TeachAI OpenAI request failed. Falling back to mock evaluator.", error);
      const response = submitTeachAnswer(session, step, answer, hintLevel);
      setEvaluation({
        ...response.evaluation,
        pixGuide: `${response.evaluation.pixGuide} 빠른 로컬 채점으로 바로 확인했어요.`,
      });
      if (response.evaluation.correct) {
        setPendingSession(response.nextSession);
      } else {
        setSession(response.nextSession);
        setPendingSession(null);
        if (session.scaffoldLevel === 2 && hintLevel === 0) {
          setHintLevel(1);
          setSession((value) => ({ ...value, hintUsed: value.hintUsed + 1 }));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const advanceStep = () => {
    if (!pendingSession) return;
    if (pendingSession.completed) {
      setSession(pendingSession);
      setResult(buildTeachResult(pendingSession));
      resetFeedback();
      return;
    }
    setSession(pendingSession);
    resetFeedback();
  };

  if (!started) {
    return (
      <main className="page teach-ai-page">
        <div className="teach-ai-exit-row">
          <Button variant="ghost" onClick={() => navigate("do-hub")}>Exit Teach</Button>
        </div>
        <section className="teach-ai-intro">
          <div className="teach-ai-intro-bg" />
          <div className="teach-ai-intro-copy">
            <span className="kicker">TeachAI · NPC Teach-back Mission</span>
            <h1>Teach an NPC how English works.</h1>
            <p>PIX는 조력자, NPC는 제자입니다. 학생은 오늘 배운 규칙을 NPC에게 설명하며 진짜 이해했는지 확인합니다.</p>
            <div className="teach-ai-rule-card">
              <span>Today’s Rule</span>
              <b>{defaultTeachLesson.targetGrammar}</b>
              <small>{defaultTeachLesson.koreanMeaning} · {defaultTeachLesson.unitTheme}</small>
            </div>
          </div>
          <div className="teach-ai-intro-side">
            <img src={sceneAssets.characters.pixhappy} alt="PIX helper ready" />
            <div className="teach-ai-mission-card">
              <b>Mission Flow</b>
              <span>NPC 오개념 → 학생 교정 → 이유 설명 → 새 예문 → NPC 재적용</span>
            </div>
          </div>
        </section>

        <section className="teach-scaffold-select">
          <div>
            <span className="kicker">Teach Level</span>
            <h2>오늘의 입력 방식</h2>
          </div>
          <div className="scaffold-options">
            {scaffoldOptions.map((option) => (
              <button
                className={scaffoldLevel === option.level ? "selected" : ""}
                key={option.level}
                onClick={() => setScaffoldLevel(option.level)}
              >
                <span>LV {option.level} · {option.input}</span>
                <b>{option.title}</b>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
          <div className="hero-actions">
            <Button onClick={beginMission}>Teach Mission 시작</Button>
            <Button variant="ghost" onClick={() => navigate("daily-result")}>건너뛰고 결과 보기</Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page teach-ai-page teach-ai-active-page">
      <div className="teach-ai-exit-row">
        <Button variant="ghost" onClick={() => navigate("do-hub")}>Exit Teach</Button>
      </div>
      <TeachMissionHeader session={session} progress={progress} />
      <TeachStepProgress currentIndex={session.currentStepIndex} />
      <section className={`teach-ai-stage ${evaluation ? evaluation.correct ? "answer-correct" : "answer-wrong" : ""}`}>
        <div className="teach-ai-stage-bg" />
        <div className="teach-ai-character dr-lexi-coach">
          <img src={sceneAssets.characters.lexipraise} alt="Dr. Lexi coaching" />
          <span>Dr. Lexi · Coach</span>
        </div>
        <div className="teach-ai-character jiho-teacher">
          <img src={sceneAssets.characters.jiho} alt="Jiho teaching" />
          <span>Jiho · Student Teacher</span>
        </div>
        <div className={`teach-ai-workbench ${result ? "result-mode" : ""}`}>
          {result ? (
            <TeachResultModal result={result} navigate={navigate} onRestart={restartMission} />
          ) : (
            <>
              <NPCDialoguePanel step={step} evaluation={evaluation} session={pendingSession ?? session} />
              <StudentInputPanel
                step={step}
                scaffoldLevel={session.scaffoldLevel}
                answer={answer}
                evaluation={evaluation}
                pendingSession={pendingSession}
                onAnswerChange={updateAnswer}
                onSubmit={submitAnswer}
                onAdvance={advanceStep}
                submitting={submitting}
              />
              <PixHelperPanel
                step={step}
                scaffoldLevel={session.scaffoldLevel}
                hintLevel={hintLevel}
                onHint={requestPixHint}
              />
            </>
          )}
        </div>
        {evaluation?.correct && <SuccessBurst label="NPC UNDERSTANDING UP" />}
      </section>
    </main>
  );
}

function DailyResult({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="page result-page">
      <div className="result-burst"><span>QUEST COMPLETE</span><h1>Grammia's magic coordinates<br />have been restored.</h1><p>오늘 배운 표현을 사용하고, Milo에게 직접 가르치며 학습을 완성했습니다.</p></div>
      <div className="result-grid">
        <Panel eyebrow="Today's Growth"><div className="reward-big"><div><span>LV earned</span><b>+95</b></div><div><span>Lingco earned</span><b>+30</b></div></div><ProgressBar value={82} label="Quest mastery" tone="gold" /></Panel>
        <Panel eyebrow="Learning Record"><div className="record-list"><span><b>Words</b>between · near · on · bank · hospital · magazine · box</span><span><b>Do</b>Sentence Purify · Rune Puzzle · NPC Mission Talk · Find the Cultist</span><span><b>Teach</b>between / near / on을 Milo에게 설명함</span></div></Panel>
        <Panel className="insight-card strength" eyebrow="Strength"><h3>문장 구조를 안정적으로 복원했어요.</h3><p>장소 단어를 빠르게 이해하고, 룬 퍼즐에서 올바른 문장 순서를 만들었습니다.</p></Panel>
        <Panel className="insight-card practice" eyebrow="Needs Practice"><h3>전치사 차이를 한 번 더 확인해요.</h3><p>between, near, on을 처음에는 헷갈렸지만 Teach 단계에서 장소 단서와 함께 설명하며 이해도가 상승했습니다.</p></Panel>
      </div>
      <div className="center-actions"><Button variant="ghost" onClick={() => navigate("home")}>Back to Home</Button><Button onClick={() => navigate("map")}>View Learning Map</Button></div>
    </main>
  );
}

function ReviewIntro({ type, navigate }: { type: "weekly" | "monthly"; navigate: (screen: Screen) => void }) {
  const monthly = type === "monthly";
  return (
    <main className="page review-intro">
      <div className={`boss-emblem ${monthly ? "monthly" : ""}`}><span>{monthly ? "M" : "W2"}</span><i /><i /></div>
      <span className="kicker">{monthly ? "Week 4 · Day 5" : "Week 2 · Day 5"} · Review Gate</span>
      <h1>{monthly ? "Englantis Travel Guide" : "Map & Preposition Review"}</h1>
      <h2>{monthly ? "한 달 동안 배운 영어로 여행 가이드를 완성합니다." : "이번 주 장소와 전치사 마법을 점검합니다."}</h2>
      <p>{monthly ? "탈것, 방향, 장소, 여행 표현을 모아 NPC에게 잉글란티스 여행법을 가르쳐보자!" : "장소와 위치 표현이 잘 기억나는지 확인하고 다음 모험의 경로를 찾아보자!"}</p>
      <div className="review-focus">
        {(monthly ? ["Vehicles & Actions", "Directions & Places", "Travel & Let's", "Review & Reinforcement"] : ["Direction Words", "Places", "Prepositions", "Key Sentences"]).map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}
      </div>
      <div className="hero-actions"><Button onClick={() => navigate(monthly ? "monthly-boss" : "weekly-boss")}>Start Review Boss</Button><Button variant="ghost" onClick={() => navigate("map")}>Return to Map</Button></div>
    </main>
  );
}

function ReviewBoss({
  type,
  navigate,
}: {
  type: "weekly" | "monthly";
  navigate: (screen: Screen) => void;
}) {
  const questions = type === "weekly" ? weeklyQuestions : monthlyQuestions;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [score, setScore] = useState(0);
  const [credited, setCredited] = useState(false);
  const data = questions[index];
  const correct = selected === data[2];
  const choose = (choice: string) => {
    setSelected(choice);
    if (choice === data[2] && !credited) {
      setScore((value) => value + 1);
      setCredited(true);
    }
  };
  const next = () => {
    if (index === questions.length - 1) navigate(type === "weekly" ? "weekly-result" : "monthly-summary");
    else {
      setIndex((value) => value + 1);
      setSelected("");
      setCredited(false);
    }
  };
  return (
    <main className={`review-boss-page ${selected ? correct ? "answer-correct" : "answer-wrong" : ""}`}>
      <div className="boss-hud"><Button variant="ghost" onClick={() => navigate("map")}>Exit Gate</Button><span>{type === "weekly" ? "WEEKLY" : "MONTHLY"} REVIEW GATE</span><ProgressBar value={((index + (selected ? 1 : 0)) / questions.length) * 100} label={`Review progress · ${index + 1} / ${questions.length}`} tone="gold" /><b>Correct {score}</b></div>
      <div className="boss-arena">
        <div className="gate-status">
          <span>GATE SIGNAL</span>
          <h1>{type === "weekly" ? "MAP MEMORY" : "TRAVEL MEMORY"}</h1>
          <p>정답 신호를 모아 잠든 관문을 깨우세요.</p>
          <div className="trial-runes">{questions.map((_, trial) => <i key={trial} className={trial < index ? "done" : trial === index ? "active" : ""}>{trial + 1}</i>)}</div>
          <b>{selected ? (correct ? "Signal accepted" : "Signal unstable") : "Awaiting answer"}</b>
        </div>
        <Panel className="review-question" eyebrow={`Trial ${index + 1} · Mixed Recall`}>
          <h2>{data[0]}</h2>
          <ChoiceList choices={data[1]} onChoose={choose} selected={selected} answer={data[2]} reveal={Boolean(selected)} locked />
          {selected && <div className={`feedback ${correct ? "success" : "error"}`} role="status">{correct ? "Memory signal stable." : "Pix: 이 문장은 다음 학습에 다시 넣어둘게."}</div>}
          <Button onClick={next} disabled={!selected}>{index === questions.length - 1 ? "Complete Review" : "Next Trial"}</Button>
        </Panel>
        {selected && correct && <SuccessBurst label="SIGNAL ACCEPTED" />}
      </div>
    </main>
  );
}

function ScoreGrid({ scores }: { scores: readonly (readonly [string, number, string])[] }) {
  return <div className="score-grid">{scores.map(([label, score, grade]) => <ScoreBadge key={label} score={score} label={`${label} · ${grade}`} />)}</div>;
}

function WeeklyResult({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="page weekly-result-page">
      <div className="page-heading"><div><span className="kicker">Review Analysis · Week 2</span><h1>Weekly Review Complete</h1><p>장소 단어는 안정적으로 익혔지만 between과 near 구분은 추가 보강이 필요합니다.</p></div><div className="result-grade">STABLE<small>Overall result</small></div></div>
      <div className="review-result-layout">
        <div>
          <ScoreGrid scores={weeklyScores} />
          <Panel className="recommendation" eyebrow="Next Week Recommendation">
            <h2>Pix가 다음 학습 경로를 조정했어요.</h2>
            <div className="recommend-list"><span>01<b>Sentence Purify</b>전치사 빈칸 문제 2회 추가</span><span>02<b>Rune Puzzle</b>위치 표현 문장 2개 추가</span><span>03<b>Teach</b>NPC가 전치사 차이를 먼저 질문</span><span>04<b>Watch</b>시작 전 30초 전치사 리마인드</span></div>
          </Panel>
        </div>
        <Panel className="rule-card" eyebrow="Scoring Rule">
          {scoringRule.map((rule) => <div className={`rule-row ${rule.tone}`} key={rule.label}><b>{rule.label}</b><span>{rule.range}</span><small>{rule.note}</small></div>)}
          <div className="parent-summary"><b>Parent Summary</b><p>Jiho는 장소 단어는 안정적으로 익혔지만 위치를 구분하는 전치사에서 어려움을 보였습니다. 다음 주에는 전치사 활동을 자동 추가합니다.</p></div>
        </Panel>
      </div>
      <div className="center-actions"><Button variant="ghost" onClick={() => navigate("home")}>Back to Home</Button><Button onClick={() => navigate("map")}>Continue Journey</Button></div>
    </main>
  );
}

function MonthlySummary({ navigate }: { navigate: (screen: Screen) => void }) {
  const metrics = [["Completed sessions", "19 / 20"], ["Monthly completion", "95%"], ["Do activities", "42"], ["Teach activities", "16"], ["LV earned", "+1,240"], ["Study time", "14h 20m"]];
  return (
    <main className="page monthly-summary-page">
      <div className="page-heading"><div><span className="kicker">Monthly Analysis · Chapter 01</span><h1>Your first Englantis journey is complete.</h1><p>Jiho의 한 달 학습 기록과 다음 모험을 위한 성장 신호입니다.</p></div><div className="result-grade master-grade">95%<small>Journey complete</small></div></div>
      <div className="metric-row">{metrics.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>
      <ScoreGrid scores={monthlyScores} />
      <div className="two-columns">
        <Panel className="insight-card strength" eyebrow="Strengths"><h3>상황에 맞는 영어를 빠르게 선택합니다.</h3><p>교통수단과 장소 단어를 빠르게 인지하고 Let's go to~ 표현을 상황에 맞게 선택했습니다. Teach 활동에도 적극적으로 참여했습니다.</p></Panel>
        <Panel className="insight-card practice" eyebrow="Needs Practice"><h3>위치 표현과 긴 문장 발화를 보강합니다.</h3><p>between / near / at / in 구분, 일반동사 s 사용, 6단어 이상 긴 문장의 발화 속도를 다음 달 학습에 반영합니다.</p></Panel>
      </div>
      <Panel className="rule-card monthly-rule-card" eyebrow="Scoring Rule">
        {scoringRule.map((rule) => <div className={`rule-row ${rule.tone}`} key={rule.label}><b>{rule.label}</b><span>{rule.range}</span><small>{rule.note}</small></div>)}
      </Panel>
      <div className="center-actions"><Button variant="ghost" onClick={() => navigate("parent")}>View Parent Report</Button><Button onClick={() => navigate("final-teach")}>Prepare Final Teach</Button></div>
    </main>
  );
}

function FinalTeach({ navigate }: { navigate: (screen: Screen) => void }) {
  const cards = ["My dad has a big car.", "East is that way.", "He is standing between a bank and a hospital.", "There is a park near Tiger's apartment.", "Let's go fishing at the lake."];
  return (
    <main className="page final-teach">
      <div className="final-copy"><span className="kicker">Final Teach Mission</span><h1>My Englantis<br />Travel Guide</h1><p>이번 달에 배운 표현을 사용해서 NPC에게 잉글란티스 여행법을 가르쳐줘!</p><div className="condition-list"><span><b>01</b>약 1분 동안 설명하기</span><span><b>02</b>핵심 문장 5개 이상 사용</span><span><b>03</b>방향 · 장소 · Let's 표현 포함</span></div><div className="hero-actions"><Button onClick={() => navigate("parent")}>Complete Final Teach</Button><Button variant="ghost" onClick={() => navigate("monthly-summary")}>Practice Again</Button></div></div>
      <div className="teach-deck">{cards.map((card, index) => <div style={{ "--i": index } as React.CSSProperties} key={card}><small>KEY SENTENCE {index + 1}</small><p>{card}</p></div>)}</div>
    </main>
  );
}

function ParentReport({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="report-page">
      <header className="report-header"><div><span>ENGLANTIS LEARNING REPORT</span><h1>Jiho's Monthly Learning Summary</h1><p>Chapter 01 · May Journey</p></div><Button variant="ghost" onClick={() => navigate("home")}>Close Report</Button></header>
      <div className="report-summary"><div className="report-score"><b>Stable</b><span>월간 종합 판정</span></div><p>Jiho는 이번 달 교통수단, 방향, 장소, 여행 표현을 중심으로 영어 문장을 학습했습니다. 게임형 활동에서 반복 사용하고, Teach 단계에서 NPC에게 직접 설명하며 학습을 마무리했습니다.</p></div>
      <div className="report-metrics"><div><span>완료 회차</span><b>19 / 20</b></div><div><span>월간 완료율</span><b>95%</b></div><div><span>총 학습 시간</span><b>14h 20m</b></div><div><span>Do / Teach</span><b>42 / 16</b></div></div>
      <div className="report-body">
        <div>
          <h2>Skill Overview</h2>
          {monthlyScores.map(([label, score, grade]) => <div className="report-skill" key={label}><span>{label}<small>{grade}</small></span><ProgressBar value={score} tone={score >= 70 ? "mint" : "gold"} /><b>{score}</b></div>)}
        </div>
        <div className="report-notes">
          <div className="report-note good"><span>Strength</span><h3>상황에 맞는 표현을 선택할 수 있습니다.</h3><p>장소와 교통수단 단어를 빠르게 인지하고 Let's go to~, Where is~? 같은 표현을 상황에 맞게 선택합니다.</p></div>
          <div className="report-note care"><span>Needs Practice</span><h3>위치 전치사와 동사 형태를 반복합니다.</h3><p>between, near, at, in 구분과 drives, uses, reads 같은 일반동사의 형태 변화에 추가 연습이 필요합니다.</p></div>
          <div className="report-note plan"><span>Next Plan</span><h3>다음 달 첫 주 학습에 자동 반영됩니다.</h3><p>전치사 Fill-the-Gap, 일반동사 Fix-it, Teach 단계의 위치 설명 질문이 자동으로 추가됩니다.</p></div>
        </div>
      </div>
      <footer className="report-footer"><span>Generated from Jiho's learning signals</span><b>ENGLANTIS · English restores the world</b></footer>
    </main>
  );
}

function HomeFlow({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="page home-page">
      <div className="home-hero">
        <div className="hero-copy">
          <div className="kicker">Chapter 01 · Grammia</div>
          <h1>Restore the<br /><em>magic of language.</em></h1>
          <p>Watch · Do · Teach 순서로 오늘의 영어를 배우고, 게임 미션에서 직접 써보고, 마지막에는 PIX에게 설명하며 완성합니다.</p>
          <div className="hero-actions">
            <Button onClick={() => navigate("course-select")}>오늘 학습 입장</Button>
            <Button variant="ghost" onClick={() => navigate("story-intro")}>스토리 먼저 보기</Button>
            <Button variant="ghost" onClick={() => navigate("map")}>전체 여정 보기</Button>
            <Button variant="ghost" onClick={() => navigate("activity-lab")}>활동 체험실</Button>
          </div>
          <div className="hero-stats">
            <div><span>현재 도시</span><b>Grammia</b></div>
            <div><span>연속 학습</span><b>8 days</b></div>
            <div><span>복원도</span><b>68%</b></div>
          </div>
        </div>
        <div className="city-orb">
          <div className="orb-ring ring-one" />
          <div className="orb-ring ring-two" />
          <div className="city-silhouette">
            <i /><i /><i /><i /><i />
          </div>
          <div className="orb-label"><span>GRAMMIA</span><b>City of Grammar</b></div>
        </div>
      </div>
      <section className="dashboard-grid">
        <Panel className="today-card" eyebrow="Today's Quest">
          <div className="quest-number">W2 · D3</div>
          <h2>{dailyModule.title}</h2>
          <p>{dailyModule.subtitle}</p>
          <div className="pix-note"><b>Pix:</b> 오늘은 Grammia의 길 표지판을 복원해야 해. between과 near를 배운 뒤, DO 미션 {doHubMissions.length}개와 TeachAI까지 이어가자!</div>
          <Button onClick={() => navigate("course-select")}>오늘 과정 확인하기</Button>
        </Panel>
        <div className="side-stack">
          <Panel eyebrow="LV Progress">
            <ProgressBar value={student.lvProgress} label="Level 12 · Pathfinder" tone="gold" />
            <p className="muted">다음 레벨까지 320 LV</p>
          </Panel>
          <button className="report-preview" onClick={() => navigate("parent")}>
            <div><small>For Parent</small><b>Monthly Learning Report</b><span>학습 성장과 약점 신호를 한눈에 확인하세요.</span></div>
            <strong>↗</strong>
          </button>
        </div>
      </section>
    </main>
  );
}

function CourseSelectFlow({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="page course-select-page">
      <div className="course-heading">
        <div>
          <span className="kicker">Today's Journey</span>
          <h1>오늘의 과정을 선택하세요.</h1>
          <p>완료한 과정은 밝게 표시되고, 오늘 할 과정은 빛나며, 아직 열리지 않은 과정은 잠겨 있습니다.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("home")}>홈으로 돌아가기</Button>
      </div>

      <section className="course-map-scene" aria-label="Englantis course route">
        <div className="course-map-hud">
          <span>Chapter 01 · Grammia Route</span>
          <b>Week 2 · Day 3</b>
          <small>Watch → Do → TeachAI</small>
        </div>

        <div className="course-path-glow" />

        {courseNodes.map((node) => {
          const isToday = node.status === "today";
          const statusLabel = node.status === "done" ? "완료" : node.status === "today" ? "오늘 학습" : "잠김";
          return (
            <button
              key={node.id}
              className={`course-node course-node-${node.status}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              disabled={node.status === "locked"}
              onClick={() => isToday && navigate("daily-intro")}
              aria-label={`${node.label}. ${node.title}. ${statusLabel}`}
            >
              <span>{node.label}</span>
              <b>{node.title}</b>
              <small>{statusLabel}</small>
            </button>
          );
        })}

        <img className="course-pix-guide" src={sceneAssets.characters.pix} alt="Pix guiding today's lesson route" />

        <div className="today-route-card">
          <span className="kicker">Today · Ready</span>
          <h2>{dailyModule.title}</h2>
          <p>오늘의 학습은 개념을 보고, {doHubMissions.length}가지 DO 미션에서 써보고, TeachAI에서 직접 가르치며 끝납니다.</p>
          <div className="course-step-strip">
            <span><b>01 WATCH</b><small>개념 발견</small></span>
            <span><b>02 DO</b><small>{doHubMissions.length}개 미션</small></span>
            <span><b>03 TEACHAI</b><small>직접 설명</small></span>
          </div>
          <div className="course-reward-row">
            <div><span>Today's Goal</span><b>{dailyModule.subtitle}</b></div>
            <div><span>Reward</span><b>+600 LV</b></div>
          </div>
          <Button onClick={() => navigate("daily-intro")}>오늘 학습 시작</Button>
        </div>
      </section>
    </main>
  );
}

function DailyIntroFlow({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="page intro-page">
      <div className="intro-scene">
        <div className="rune-compass"><span>W2</span><b>D3</b></div>
        <div className="intro-content">
          <span className="kicker">{dailyModule.city} Quest · Master {dailyModule.master}</span>
          <h1>{dailyModule.title}</h1>
          <h2>{dailyModule.subtitle}</h2>
          <p>Grammia의 길 표지판이 안개에 가려졌어요. 장소의 위치를 알려주는 표현을 배우고, 게임 미션에서 직접 써본 뒤 PIX에게 설명해보세요.</p>
          <div className="word-runes">{dailyModule.vocab.map((word) => <span key={word}>{word}</span>)}</div>
          <Panel className="key-sentence" eyebrow="Today's Key Sentence"><p>{dailyModule.keySentence}</p></Panel>
          <div className="lesson-flow-strip">
            <span className="active"><b>1</b> WATCH로 이해하기</span>
            <span><b>2</b> DO 미션 {doHubMissions.length}개</span>
            <span><b>3</b> TeachAI로 마스터</span>
          </div>
          <div className="hero-actions">
            <Button onClick={() => navigate("watch")}>WATCH 시작</Button>
            <Button variant="ghost" onClick={() => navigate("course-select")}>과정표로 돌아가기</Button>
          </div>
        </div>
        <Character name="Pix" role="Your learning companion" side="right" />
      </div>
    </main>
  );
}

function getRecommendedDoMissionId(completed: string[]) {
  const nextMission = doHubMissions.find((mission) => !completed.includes(mission.id));
  if (nextMission) return nextMission.id;

  const latestCompleted = [...completed]
    .reverse()
    .find((id) => doHubMissions.some((mission) => mission.id === id));
  return latestCompleted ?? doHubMissions[0].id;
}

function getDoMissionIntro(mission: DoMission) {
  if (mission.id === "npc") {
    return {
      background: doActivityBackgroundByItem["do-roleplay"],
      character: doActivityAssets.npcMissionTalk.miloConfused,
      prop: doActivityAssets.npcMissionTalk.routeSignpost,
      title: "길을 잃은 Milo에게 위치를 알려주는 말하기 미션",
      task: "Milo의 상황을 읽고 between, near 같은 위치 표현으로 목적지를 안내합니다.",
      learn: "상황에 맞는 장소 관계 표현",
    };
  }

  if (mission.id === "cultist") {
    return {
      background: doActivityAssets.findCultist.background,
      character: cultistAssets.hidden,
      prop: cultistAssets.hammerHero,
      title: "위치 전치사 신호가 깨진 NPC를 추리하는 조사 미션",
      task: "세 NPC의 문장을 차례로 확인한 뒤, 위치 단서와 맞지 않는 전치사를 근거로 후보를 지목합니다.",
      learn: "between, near, on 의미 구분",
    };
  }

  if (mission.id === "rune") {
    return {
      background: doActivityBackgroundByItem["do-assembly"],
      character: doActivityAssets.runePuzzle.doorLocked,
      prop: doActivityAssets.runePuzzle.wordTile,
      title: "흩어진 단어 룬을 문장 순서로 조립하는 퍼즐",
      task: "주어, 동사, 장소 표현의 순서를 생각하며 단어 룬을 올바른 문장으로 복원합니다.",
      learn: "영어 문장 어순",
    };
  }

  return {
    background: doActivityAssets.sentencePurify.background,
    character: sceneAssets.characters.jiho,
    prop: doActivityAssets.sentencePurify.stoneBlank,
    title: "뜻에 맞는 위치 표현을 골라 문장을 정화하는 미션",
    task: "한국어 뜻과 문장 맥락을 보고 빈칸에 가장 자연스러운 영어 표현을 선택합니다.",
    learn: "between, near, on 의미 구분",
  };
}

function DoMissionEntryPreview({ mission }: { mission: DoMission }) {
  const intro = getDoMissionIntro(mission);

  return (
    <div className={`do-intro-card do-intro-${mission.id}`} style={{ "--do-intro-bg": `url(${intro.background})` } as CSSProperties}>
      <div className="do-intro-copy">
        <span>{mission.skill}</span>
        <h2>{mission.title}</h2>
        <p>{mission.description}</p>
        <dl>
          <div>
            <dt>Goal</dt>
            <dd>{mission.objective}</dd>
          </div>
          <div>
            <dt>Reward</dt>
            <dd>{mission.reward}</dd>
          </div>
        </dl>
      </div>
      <div className="do-intro-visual" aria-hidden="true">
        <img className="do-intro-character" src={intro.character} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
        <img className="do-intro-prop" src={intro.prop} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
        <div className="do-intro-brief">
          <span>Mission Brief</span>
          <b>{intro.title}</b>
          <p>{intro.task}</p>
          <small>{intro.learn}</small>
        </div>
      </div>
    </div>
  );
}

function DoHubFlow({
  navigate,
  completed,
}: {
  navigate: (screen: Screen) => void;
  completed: string[];
}) {
  const [activeMission, setActiveMission] = useState(() => getRecommendedDoMissionId(completed));
  const active = doHubMissions.find((activity) => activity.id === activeMission) ?? doHubMissions[0];
  const allDone = completed.length >= doHubMissions.length;

  useEffect(() => {
    setActiveMission((current) => {
      if (!completed.includes(current)) return current;
      return getRecommendedDoMissionId(completed);
    });
  }, [completed]);

  return (
    <main className="page do-hub-page">
      <div className="page-heading">
        <div>
          <span className="kicker">DO · Today's Field Practice</span>
          <h1>오늘 배운 표현을 써보자.</h1>
          <p>Activity Atlas의 Today's Course와 같은 {doHubMissions.length}개 미션입니다. 모두 완료하면 TeachAI가 열립니다.</p>
        </div>
        <div className="do-hub-actions">
          <Button variant="ghost" onClick={() => navigate("course-select")}>과정표로 돌아가기</Button>
          <Button variant="ghost" onClick={() => navigate("home")}>홈으로 돌아가기</Button>
          <div className="completion-ring"><b>{completed.length}</b><span>/ {doHubMissions.length} restored</span></div>
        </div>
      </div>
      <div className="lesson-flow-strip do-flow-strip">
        <span><b>01</b> Watch 완료</span>
        <span className="active"><b>02</b> Do 미션 진행</span>
        <span className={allDone ? "active" : ""}><b>03</b> TeachAI {allDone ? "열림" : "대기"}</span>
      </div>
      <div className="do-entry-board">
        <section className={`do-entry-stage do-entry-${active.id}`}>
          <div className="do-entry-top"><span>ACTIVE FIELD MISSION</span><b>{completed.includes(active.id) ? "RESTORED" : "READY"}</b></div>
          <div className="do-entry-play">
            <DoMissionEntryPreview mission={active} />
          </div>
          <div className="do-entry-action">
            <span>
              <b>{active.title}</b>
              <small>{active.objective}</small>
            </span>
            <Button onClick={() => navigate(active.screen)}>{completed.includes(active.id) ? "다시 플레이" : "미션 시작"}</Button>
          </div>
        </section>
        <aside className="mission-ledger">
          <div className="ledger-title"><span>Today's DO Route</span><b>미션 {doHubMissions.length}개를 순서대로 확인하세요</b><small>각 미션은 오늘 배운 표현과 문장 규칙을 다른 방식으로 사용합니다.</small></div>
          {doHubMissions.map((activity, index) => (
            <button key={activity.id} className={`mission-row ${active.id === activity.id ? "active" : ""} ${completed.includes(activity.id) ? "complete" : ""}`} onClick={() => setActiveMission(activity.id)} aria-pressed={active.id === activity.id}>
              <i>{completed.includes(activity.id) ? "OK" : `0${index + 1}`}</i>
              <span><b>{activity.title}</b><small>{activity.skill}</small></span>
              <em>{activity.reward}</em>
            </button>
          ))}
          <div className="ledger-progress"><ProgressBar value={(completed.length / doHubMissions.length) * 100} label="Field restoration" tone="mint" /></div>
        </aside>
      </div>
      <div className="hub-footer"><p><b>Pix's note</b> {doHubMissions.length}가지 미션을 완료하면 Milo에게 오늘 배운 내용을 가르칠 수 있어.</p><Button disabled={!allDone} onClick={() => navigate("teach")}>{allDone ? "TeachAI 시작하기" : `${doHubMissions.length}개 미션 완료 후 열림`}</Button></div>
    </main>
  );
}

function ActivitySandboxFlow({ item, phase }: { item: ActivityItem; phase: ActivityPhase }) {
  const [selected, setSelected] = useState("");
  const [sequence, setSequence] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState("");
  const [cultistTalked, setCultistTalked] = useState<string[]>([]);
  const [cultistAccused, setCultistAccused] = useState("");
  const [cultistPhase, setCultistPhase] = useState<CultistMissionPhase>("selecting");
  const parts = ["He", "is", "standing", "between", "a bank", "and", "a hospital."];

  if (phase !== "do") {
    return <ActivitySandbox item={item} phase={phase} />;
  }

  if (item.id === "do-battle") {
    return (
      <div className="activity-sandbox sandbox-do scene-do-battle">
        <div className="sandbox-world-shade" />
        <div className="atlas-demo-card sentence-purify-demo">
          <span className="demo-stage-label">Today's DO 01 · Sentence Purify</span>
          <h3>He is standing ___ a bank and a hospital.</h3>
          <p>뜻을 보고 안개 문장을 정화할 표현을 고르세요.</p>
          <div className="lab-option-grid">
            {["between", "near", "on"].map((word) => (
              <button
                key={word}
                className={selected === word ? (word === "between" ? "correct" : "wrong") : ""}
                onClick={() => {
                  setSelected(word);
                  setFeedback(word === "between" ? "정답! 두 장소 사이를 말할 때는 between을 씁니다." : "조금 달라요. 두 장소 사이에 있다는 단서에 집중해보세요.");
                }}
              >
                {word}
              </button>
            ))}
          </div>
          {feedback && <p className="atlas-demo-feedback">{feedback}</p>}
          <RewardToast show={selected === "between"} message="문장 정화 성공!" label="+120 LINGO" />
        </div>
      </div>
    );
  }

  if (item.id === "do-assembly") {
    const scrambledParts = ["hospital.", "a bank", "between", "is", "He", "and", "standing"];
    return (
      <div className="activity-sandbox sandbox-do scene-do-assembly">
        <div className="sandbox-world-shade" />
        <div className="atlas-demo-card rune-puzzle-demo">
          <span className="demo-stage-label">Today's DO 02 · Rune Puzzle</span>
          <h3>{sequence.length ? sequence.join(" ") : "단어 룬을 순서대로 눌러 문장을 완성하세요."}</h3>
          <div className="token-row">
            {scrambledParts.map((part) => (
              <button key={part} disabled={sequence.includes(part)} onClick={() => setSequence([...sequence, part])}>{part}</button>
            ))}
          </div>
          <div className="lab-inline-actions">
            <button onClick={() => setSequence([])}>Reset</button>
            <button onClick={() => setFeedback(sequence.join(" ") === parts.join(" ") ? "문장 룬 복원 성공!" : "아직 순서가 어색해요. 주어 → be동사 → 위치 표현 순서로 다시 보세요.")}>Check</button>
          </div>
          {feedback && <p className="atlas-demo-feedback">{feedback}</p>}
          <RewardToast show={sequence.join(" ") === parts.join(" ")} message="룬 퍼즐 복원 성공!" label="+140 LINGO" />
        </div>
      </div>
    );
  }

  if (item.id === "do-roleplay") {
    const roleplayCheck = evaluateMiloBakeryAnswer(typed);
    const roleplaySolved = selected === "roleplay-success";
    return (
      <div className="activity-sandbox sandbox-do scene-do-roleplay">
        <div className="sandbox-world-shade" />
        <div className="atlas-demo-card open-talk-demo roleplay-demo">
          <img className="do-prop roleplay-milo" src={doActivityAssets.npcMissionTalk.miloConfused} alt="" aria-hidden="true" />
          <img className="do-prop route-signpost" src={doActivityAssets.npcMissionTalk.routeSignpost} alt="" aria-hidden="true" />
          <img className="do-prop route-map" src={doActivityAssets.npcMissionTalk.mapFragment} alt="" aria-hidden="true" />
          <img className="do-prop route-light-path" src={doActivityAssets.npcMissionTalk.routeLightPath} alt="" aria-hidden="true" />
          <span className="demo-stage-label">Today's DO 03 · NPC Mission Talk</span>
          <div className="ai-bubble"><b>Milo</b><p>I can't find the old bakery. Is it near the bank?</p></div>
          <div className="roleplay-goal"><span>MISSION GOAL</span><b>Guide Milo using this situation</b><small>Use near the bank or next to the bank in a complete answer.</small></div>
          <label>답변을 직접 입력해보세요<textarea value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Try: It is near the bank." /></label>
          <div className="roleplay-actions"><button className="lab-action" onClick={() => {
            setSelected(roleplayCheck.correct ? "roleplay-success" : "roleplay-retry");
            setFeedback(roleplayCheck.message);
          }}>Send response</button></div>
          {feedback && <p className="atlas-demo-feedback">{feedback}</p>}
          <RewardToast show={roleplaySolved} message="Milo 안내 성공!" label="+200 LINGO" />
        </div>
      </div>
    );
  }

  if (item.id === "do-cultist") {
    const demoCase = cultistGrammarCases[0];
    const accusedNpc = demoCase.npcs.find((npc) => npc.id === cultistAccused);
    const allTalked = cultistTalked.length === demoCase.npcs.length;
    const canAccuse = allTalked && cultistPhase === "selecting";
    const demoProgress = (cultistTalked.length / demoCase.npcs.length) * 100;
    const pixPrompt = cultistPhase === "hammerAttack"
      ? "지호가 문법 망치를 휘두르는 중이에요."
      : cultistPhase === "wrongAccused"
        ? "오답 NPC는 다시 로브 속으로 돌려보내고, 남은 문장의 전치사 단서를 비교해요."
        : cultistPhase === "correctReveal" || cultistPhase === "cultistFleeing"
          ? "문장이 깨진 이유를 확인한 뒤 다시 체험할 수 있어요."
          : canAccuse
            ? "세 문장을 모두 들었어요. 규칙을 깨뜨린 NPC를 지목하세요."
            : "A, B, C를 차례로 눌러 문장을 수집하세요.";
    const imageForDemoNpc = (npc: CultistNpc) => {
      return cultistNpcImage(npc, cultistAccused === npc.id, cultistPhase);
    };
    const listenToDemoNpc = (npc: CultistNpc) => {
      if (cultistPhase !== "selecting" && cultistPhase !== "wrongAccused") return;
      setCultistTalked((items) => Array.from(new Set([...items, npc.id])));
      setFeedback(`"${npc.sentence}"`);
      if (cultistPhase === "wrongAccused") {
        setCultistAccused("");
        setCultistPhase("selecting");
      }
    };
    const accuseDemoNpc = (npc: CultistNpc) => {
      if (!canAccuse) {
        listenToDemoNpc(npc);
        return;
      }
      setCultistAccused(npc.id);
      setCultistPhase("hammerAttack");
      setFeedback("뿅망치 판정 중...");
      window.setTimeout(() => {
        setCultistPhase(npc.isCultist ? "correctReveal" : "wrongAccused");
        setFeedback(npc.isCultist ? "정답! 로브 속 신도가 드러났어요." : "이 문장은 규칙에 맞아요. 다른 후보의 전치사 단서를 비교해보세요.");
      }, 520);
      if (npc.isCultist) {
        window.setTimeout(() => setCultistPhase("cultistFleeing"), 1250);
      }
    };
    const resetCultistDemo = () => {
      setCultistTalked([]);
      setCultistAccused("");
      setCultistPhase("selecting");
      setFeedback("");
    };
    return (
      <div className={`activity-sandbox sandbox-do scene-do-cultist phase-${cultistPhase}`}>
        <div className="sandbox-world-shade" />
        <div className="cultist-atlas-game">
          <header className="cultist-atlas-header">
            <div>
              <span>Today's DO 04 · Grammar Hunt</span>
              <h3>위치 전치사 신호가 깨진 NPC를 찾아라</h3>
              <p>세 NPC를 눌러 문장을 모두 확인한 뒤, 장소 단서와 맞지 않는 전치사를 쓴 후보를 지목하세요.</p>
            </div>
            <div className="cultist-atlas-progress">
              <ProgressBar value={demoProgress} label="Sentence Check" tone="mint" />
              <small>{cultistTalked.length} / {demoCase.npcs.length} checked</small>
            </div>
          </header>
          <div className="cultist-atlas-rule">
            <b>PIX CLUE</b>
            <span>{demoCase.clue}</span>
            <em>{canAccuse ? "이제 수상한 후보를 지목하세요." : "먼저 A, B, C의 문장을 모두 들어야 합니다."}</em>
          </div>
          <div className="cultist-atlas-brief" aria-live="polite">
            <span className={cultistTalked.length > 0 ? "done" : ""}>1. 문장 수집</span>
            <span className={canAccuse || cultistAccused ? "done" : ""}>2. 규칙 비교</span>
            <span className={cultistAccused ? "done" : ""}>3. 수상한 NPC 지목</span>
            <b>{pixPrompt}</b>
          </div>
          <div className="cultist-atlas-row">
            {demoCase.npcs.map((npc, index) => {
              const hasTalked = cultistTalked.includes(npc.id);
              const isAccused = cultistAccused === npc.id;
              const demoNpcImage = imageForDemoNpc(npc);
              return (
                <button
                  key={npc.id}
                  className={`cultist-atlas-card ${hasTalked ? "has-talked" : ""} ${isAccused ? "accused" : ""} ${isAccused && npc.isCultist && cultistPhase !== "hammerAttack" ? "revealed" : ""} ${isAccused && !npc.isCultist && cultistPhase === "wrongAccused" ? "innocent reacting" : ""}`}
                  style={{ "--cultist-image": `url(${demoNpcImage})` } as CSSProperties}
                  onClick={() => accuseDemoNpc(npc)}
                >
                  <img src={demoNpcImage} alt={`${String.fromCharCode(65 + index)} candidate`} onError={(event) => { event.currentTarget.style.opacity = "0"; }} />
                  {isAccused && cultistPhase === "hammerAttack" && <img className="cultist-atlas-hammer" src={cultistAssets.hammerHero} alt="" aria-hidden="true" />}
                  {hasTalked && <span className="cultist-atlas-speech">{npc.sentence}</span>}
                  {isAccused && !npc.isCultist && cultistPhase === "wrongAccused" && <span className="cultist-atlas-reaction">{cultistWrongAccusedLine(npc)}</span>}
                  <i>{String.fromCharCode(65 + index)}</i>
                  <b>{hasTalked ? npc.sentence : "문장 듣기"}</b>
                  <small>{canAccuse ? "지목하기" : hasTalked ? "문장 확인됨" : "눌러서 듣기"}</small>
                </button>
              );
            })}
          </div>
          <div className={`cultist-atlas-feedback ${cultistPhase === "wrongAccused" ? "error" : cultistPhase === "correctReveal" || cultistPhase === "cultistFleeing" ? "success" : ""}`} role="status" aria-live="polite">
            <img src={sceneAssets.characters.pix} alt="Pix" onError={(event) => { event.currentTarget.hidden = true; }} />
            <p>
              {!accusedNpc && !feedback && "외형은 모두 같아요. 문장을 근거로 찾아야 합니다."}
              {!accusedNpc && feedback && <>방금 들은 문장: <b>{feedback}</b></>}
              {cultistPhase === "hammerAttack" && "Jiho가 말랑망치를 휘두르는 중..."}
              {cultistPhase === "wrongAccused" && accusedNpc && <>아니에요. <b>{accusedNpc.sentence}</b>는 규칙에 맞는 문장입니다.</>}
              {(cultistPhase === "correctReveal" || cultistPhase === "cultistFleeing") && accusedNpc && <>정답! <b>{accusedNpc.sentence}</b>가 깨진 문장입니다. 올바른 문장은 <b>{accusedNpc.correctSentence}</b>예요.</>}
            </p>
            {cultistPhase === "wrongAccused" && <button className="cultist-atlas-retry" onClick={resetCultistDemo}>다시 추리하기</button>}
            {(cultistPhase === "correctReveal" || cultistPhase === "cultistFleeing") && <button className="cultist-atlas-retry" onClick={resetCultistDemo}>다시 체험하기</button>}
          </div>
          <RewardToast show={cultistPhase === "correctReveal" || cultistPhase === "cultistFleeing"} message="문법 신도 검거 성공!" label="+200 LINGO" />
        </div>
      </div>
    );
  }

  return <ActivitySandbox item={item} phase={phase} />;
}

function ActivityLabFlow({ navigate }: { navigate: (screen: Screen) => void }) {
  const [phase, setPhase] = useState<ActivityPhase>("watch");
  const [expanded, setExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selection, setSelection] = useState<Record<ActivityPhase, string>>({
    watch: activityLibrary.watch[0].id,
    do: activityLibrary.do[0].id,
    teach: activityLibrary.teach[0].id,
  });
  const selected = activityLibrary[phase].find((item) => item.id === selection[phase]) ?? activityLibrary[phase][0];
  const linkedIds = todayActivityLinks[phase] ?? [];
  const linkedIndex = linkedIds.indexOf(selected.id);
  const isTodayLinked = linkedIndex >= 0;
  const linkedMissionScreen = phase === "do" ? todayDoMissionScreens[selected.id] : undefined;
  const guide = activityGuides[selected.id] ?? {
    activity: selected.description,
    control: `${selected.input} 방식으로 화면 안내를 따라 조작합니다.`,
    learning: phase === "watch" ? "새 개념을 보고 듣고 이해합니다." : phase === "teach" ? "배운 내용을 설명하며 이해를 완성합니다." : "배운 영어를 실제 상황에 적용합니다.",
  };

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        setDetailsOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    document.body.classList.toggle("activity-focus-open", expanded);
    return () => {
      window.removeEventListener("keydown", close);
      document.body.classList.remove("activity-focus-open");
    };
  }, [expanded]);

  useEffect(() => {
    setDetailsOpen(false);
  }, [phase, selected.id]);

  const selectPhase = (nextPhase: ActivityPhase) => {
    if (nextPhase === "teach") {
      navigate("teach");
      return;
    }
    setPhase(nextPhase);
  };

  return (
    <main
      className={`page activity-lab-page activity-${selected.id} ${expanded ? "activity-focus-mode" : ""} ${expanded && detailsOpen ? "activity-details-open" : ""}`}
      data-bgm-context={`${phase}:${selected.id}`}
    >
      <div className="activity-lab-heading">
        <div>
          <span className="kicker">Activity Atlas · Prototype Gallery</span>
          <h1>오늘 학습과 연결된 활동 체험실</h1>
          <p>Today's Course 배지가 붙은 활동은 실제 오늘 과정에서 그대로 등장합니다. 크게 체험하기를 눌러 게임 화면처럼 확인하세요.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("home")}>홈으로 돌아가기</Button>
      </div>
      <nav className="phase-selector" aria-label="Activity phase">
        {(["watch", "do", "teach"] as ActivityPhase[]).map((item, index) => (
          <button key={item} className={phase === item ? "active" : ""} onClick={() => selectPhase(item)} aria-label={`${index + 1}. ${item.toUpperCase()}`}>
            <span>0{index + 1}</span><b>{item}</b><small>{item === "teach" ? "TEACH 체험" : activityPhaseCopy[item][0]}</small>
          </button>
        ))}
      </nav>
      <section className="activity-atlas">
        <aside className="activity-catalog">
          <div className="catalog-heading"><span>{phase} collection</span><b>{activityLibrary[phase].length} activity types</b><p>{activityPhaseCopy[phase][1]}</p></div>
          <div className="catalog-list">
            {activityLibrary[phase].map((item, index) => {
              const linked = linkedIds.includes(item.id);
              return (
                <div className="catalog-entry" key={item.id}>
                  {item.group !== activityLibrary[phase][index - 1]?.group && <span className="catalog-group-label">{item.group}</span>}
                  <button className={`${selected.id === item.id ? "active" : ""} ${linked ? "course-linked" : ""}`} onClick={() => setSelection({ ...selection, [phase]: item.id })} aria-label={`${item.title}. ${item.subtitle}`}>
                    <i>{item.badge}</i><span><b>{item.title}</b><small>{item.subtitle}</small>{linked && <strong className="course-linked-pill">오늘 학습</strong>}</span><em>›</em>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
        <div className="activity-preview">
          <header className="preview-heading">
            <div>
              <span>{isTodayLinked ? `TODAY'S COURSE · STEP ${linkedIndex + 1}` : `${selected.badge} · ${selected.input}`}</span>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
              {isTodayLinked && <small className="preview-route-note">Enter the Englantis에서 실제로 진행되는 활동입니다.</small>}
              {phase === "do" && <small className="preview-route-note asset-placeholder-note">임시 에셋 모드: 최종 이미지가 오면 같은 자리에 교체됩니다.</small>}
            </div>
            <div className="preview-tools">
              <div className="ai-badge"><i>AI</i><span><b>Adaptive input</b><small>Voice-first · fallback supported</small></span></div>
              {linkedMissionScreen && <button className="focus-toggle mission-link" onClick={() => navigate(linkedMissionScreen)}><i>▶</i><span>오늘 미션 실행</span><small>실제 학습 흐름으로 이동</small></button>}
              {expanded && (
                <button className={`focus-toggle info-toggle ${detailsOpen ? "active" : ""}`} onClick={() => setDetailsOpen((open) => !open)}>
                  <i>i</i><span>{detailsOpen ? "설명 닫기" : "설명 보기"}</span><small>활동 안내</small>
                </button>
              )}
              <button className="focus-toggle recommended" onClick={() => {
                const nextExpanded = !expanded;
                setExpanded(nextExpanded);
                if (!nextExpanded) setDetailsOpen(false);
              }}>
                <i>{expanded ? "×" : "▣"}</i><span>{expanded ? "집중 모드 닫기" : "크게 체험하기"}</span><small>{expanded ? "ESC로 돌아가기" : "추천 · 실제 플레이 화면"}</small>
              </button>
            </div>
          </header>
          <div className="activity-guide">
            <div><i>01</i><span><b>어떤 활동인가요?</b><p>{guide.activity}</p></span></div>
            <div><i>02</i><span><b>어떻게 조작하나요?</b><p>{guide.control}</p></span></div>
            <div><i>03</i><span><b>무엇을 배우나요?</b><p>{guide.learning}</p></span></div>
          </div>
          <ActivitySandboxFlow key={selected.id} item={selected} phase={phase} />
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [completed, setCompleted] = useState<string[]>([]);
  const { audioEnabled, bgmTrack, bgmTrackSrc, toggleAudio } = useGameAudio(screen);
  const complete = (id: string) => setCompleted((items) => Array.from(new Set([...items, id])));
  const noHeader = useMemo(() => ["story-intro", "sentence", "weekly-boss", "monthly-boss"].includes(screen), [screen]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  const content = (() => {
    switch (screen) {
      case "home": return <HomeFlow navigate={setScreen} />;
      case "story-intro": return <StoryIntro forceOpen onStartQuest={() => setScreen("course-select")} onSkip={() => setScreen("home")} onClose={() => setScreen("home")} />;
      case "course-select": return <CourseSelectFlow navigate={setScreen} />;
      case "map": return <LearningMap navigate={setScreen} />;
      case "daily-intro": return <DailyIntroFlow navigate={setScreen} />;
      case "watch": return <WatchScreen navigate={setScreen} />;
      case "do-hub": return <DoHubFlow navigate={setScreen} completed={completed} />;
      case "sentence": return <FogBattleScene navigate={setScreen} complete={() => complete("sentence")} />;
      case "rune": return <RunePuzzle navigate={setScreen} complete={() => complete("rune")} />;
      case "npc": return <NpcMission navigate={setScreen} complete={() => complete("npc")} />;
      case "cultist": return <CultistGrammarMission navigate={setScreen} complete={() => complete("cultist")} />;
      case "teach": return <TeachAIStage navigate={setScreen} />;
      case "daily-result": return <DailyResult navigate={setScreen} />;
      case "weekly-intro": return <ReviewIntro type="weekly" navigate={setScreen} />;
      case "weekly-boss": return <ReviewBoss type="weekly" navigate={setScreen} />;
      case "weekly-result": return <WeeklyResult navigate={setScreen} />;
      case "monthly-intro": return <ReviewIntro type="monthly" navigate={setScreen} />;
      case "monthly-boss": return <ReviewBoss type="monthly" navigate={setScreen} />;
      case "monthly-summary": return <MonthlySummary navigate={setScreen} />;
      case "final-teach": return <FinalTeach navigate={setScreen} />;
      case "activity-lab": return <ActivityLabFlow navigate={setScreen} />;
      case "parent": return <ParentReport navigate={setScreen} />;
    }
  })();

  return (
    <div className={`app screen-${screen}`} data-bgm-track={bgmTrack} data-bgm-src={bgmTrackSrc}>
      <div className="ambient-light one" /><div className="ambient-light two" /><div className="noise" />
      {!noHeader && screen !== "parent" && (
        <Header screen={screen} navigate={setScreen} audioEnabled={audioEnabled} toggleAudio={toggleAudio} />
      )}
      {(noHeader || screen === "parent") && (
        <button
          className={`audio-toggle audio-toggle-floating ${audioEnabled ? "is-on" : ""}`}
          onClick={toggleAudio}
          aria-pressed={audioEnabled}
          aria-label={audioEnabled ? "배경음과 효과음 끄기" : "배경음과 효과음 켜기"}
        >
          <span className="audio-toggle-light" aria-hidden="true" />
          <span>{audioEnabled ? "SOUND ON" : "SOUND OFF"}</span>
        </button>
      )}
      {content}
    </div>
  );
}
