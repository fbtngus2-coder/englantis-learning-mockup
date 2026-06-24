import { useEffect, useMemo, useRef, useState } from "react";
import { scoringRule, weeklyScores, monthlyScores } from "./data/assessmentData";
import { activityGuides, activityLibrary, activityPhaseCopy, todayActivityLinks } from "./data/activityAtlas";
import { courseNodes, sessionIcons } from "./data/courseMap";
import { cultistGrammarCases } from "./data/cultistGrammarQuestions";
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
import {
  buildTeachResult,
  getCurrentTeachStep,
  getTeachInputForLevel,
  startTeachSession,
  submitTeachAnswer,
} from "./lib/teachAI/mockTeachEngine";
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
import type { Screen } from "./types/navigation";

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

  return {
    ...base,
    main: guideIds.has(item.id) ? sceneAssets.characters.lexipraise : item.id === "do-roleplay" ? sceneAssets.characters.gram : sceneAssets.characters.jiho,
    ally: item.id === "do-explore" || item.id === "do-runner" ? sceneAssets.characters.pixhappy : sceneAssets.characters.pix,
    enemy: enemyIds.has(item.id) ? sceneAssets.characters.fogmon : "",
    className: `cast-do cast-${item.id}`,
    mainAlt: guideIds.has(item.id) ? "Dr. Lexi guiding the mission" : item.id === "do-roleplay" ? "Master Gram roleplaying" : "Jinho in the mission",
  };
}

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
};

function Header({ screen, navigate }: { screen: Screen; navigate: (screen: Screen) => void }) {
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
      <div className="student-chip">
        <div className="student-level">LV {student.level}</div>
        <div>
          <b>{student.name}</b>
          <small>{student.lingco} Lingco</small>
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
  const [runner, setRunner] = useState({ x: 12, y: 70 });
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
  const [fogStep, setFogStep] = useState<FogSetupStep>("city");
  const [showBossModes, setShowBossModes] = useState(false);
  const [fogReady, setFogReady] = useState(false);
  const [fogBattleState, setFogBattleState] = useState<FogBattleState>("setup");
  const [fogPlayerHp, setFogPlayerHp] = useState(100);
  const [fogEnemyHp, setFogEnemyHp] = useState(100);
  const [fogCombatFx, setFogCombatFx] = useState<"idle" | "player-attack" | "enemy-attack">("idle");
  const [fogLastAttack, setFogLastAttack] = useState("");
  const [fogPixHint, setFogPixHint] = useState(false);
  const [fogOrb, setFogOrb] = useState({ x: 18, y: 60, dragging: false });
  const [fogStageShift, setFogStageShift] = useState({ x: 0, y: 0 });

  const runnerTargets = [
    { word: "radiant", x: 24, y: 30, good: true },
    { word: "gleam", x: 62, y: 24, good: true },
    { word: "illuminate", x: 78, y: 68, good: true },
    { word: "silent", x: 43, y: 58, good: false },
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
  const rhythmHits = Object.values(rhythmJudgements).filter((result) => result !== "miss").length;
  const rhythmNextNote = rhythmNotes.find((_, index) => !rhythmJudgements[index]);
  const rhythmProgress = Math.min(100, Math.max(0, (rhythmTime / rhythmTotalMs) * 100));
  const rhythmPattern = rhythmNotes.slice(0, 6).map((note) => note.key);

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
      const touched = runnerTargets.find((target) => Math.abs(target.x - next.x) < 7 && Math.abs(target.y - next.y) < 9);
      if (touched?.good) {
        setRunnerWords((words) => {
          if (words.includes(touched.word)) return words;
          const updated = [...words, touched.word];
          setFeedback(updated.length === 3 ? "탐험 완료 · 빛 어휘 3개를 모아 숲의 길을 복원했습니다!" : `${touched.word} 유물 획득 · 빛 어휘 ${updated.length}/3`);
          return updated;
        });
      } else if (touched) {
        setFeedback("silent는 소리와 관련된 단어예요. 빛의 유물을 찾아 계속 움직이세요.");
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
    setFeedback("BEAT START · 노트가 가운데 판정선에 닿을 때 맞는 키를 누르세요.");
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
      .filter(({ index }) => !rhythmJudgements[index])
      .sort((a, b) => a.diff - b.diff);
    const closest = windows[0];
    if (!closest || closest.diff > 260 || closest.note.key !== pressed) {
      setCombo(0);
      setFeedback(closest ? `MISS · 판정선 근처의 노트는 ${closest.note.key} 키예요.` : "MISS · 다음 주문 패턴을 기다리세요.");
      return;
    }
    const grade: RhythmJudgement = closest.diff <= 95 ? "perfect" : "good";
    setRhythmJudgements((current) => ({ ...current, [closest.index]: grade }));
    setCombo((value) => {
      const next = value + 1;
      setFeedback(`${grade === "perfect" ? "PERFECT" : "GOOD"} · Combo x${next}`);
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
          if (!next[index] && elapsed - hitAt > 260) {
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
    const perfects = Object.values(rhythmJudgements).filter((result) => result === "perfect").length;
    const goods = Object.values(rhythmJudgements).filter((result) => result === "good").length;
    setFeedback(perfects + goods >= 6 ? `SPELL CLEAR · ${perfects} Perfect / ${goods} Good` : "RETRY BEAT · 판정선에 닿는 순간을 다시 노려보세요.");
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
        "do-explore": { location: "LUMIO GROVE", actor: "Pix", role: "Expedition Guide", objective: "Recover four lost light words", line: "숲 곳곳에 빛을 나타내는 단어가 숨어 있어. 설명을 읽고 알맞은 유물을 찾아보자." },
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
          { word: "glow", hint: "은은하게 빛나다", mark: "G" },
          { word: "shine", hint: "밝게 빛나다", mark: "S" },
          { word: "bright", hint: "빛이 밝은", mark: "B" },
          { word: "dark", hint: "빛이 없는", mark: "D" },
        ];
        return (
          <div className="expedition-demo">
            <div className="expedition-copy"><span className="demo-stage-label">Vocabulary expedition · Light & nature</span><h3>빛의 숲에서 잃어버린 단어 유물 4개를 수집하세요.</h3><p>{collected.length} / 4 relics recovered</p></div>
            <div className="artifact-grid">{relics.map((relic) => <button className={collected.includes(relic.word) ? "collected" : ""} key={relic.word} onClick={() => setCollected((current) => current.includes(relic.word) ? current.filter((word) => word !== relic.word) : [...current, relic.word])}><i>{relic.mark}</i><b>{relic.word}</b><small>{relic.hint}</small></button>)}</div>
          </div>
        );
      }
      case "do-assembly": {
        const parts = ["The", "crystal", "glowed", "all", "night."];
        return (
          <div className="device-demo">
            <span className="demo-stage-label">Grammar engineering · Past tense</span><div className={`device-core ${sequence.length === parts.length ? "charged" : ""}`}><i>{sequence.length}/5</i><b>TIME ENGINE</b><small>Connect the sentence circuits</small></div>
            <div className="sequence-slot">{sequence.length ? sequence.join(" ") : "Tap components in the correct order"}</div>
            <div className="token-row">{parts.map((part) => <button key={part} disabled={sequence.includes(part)} onClick={() => setSequence([...sequence, part])}>{part}</button>)}</div>
            <div className="lab-inline-actions"><button onClick={() => setSequence([])}>Reset</button><button onClick={() => success(sequence.join(" ") === parts.join(" ") ? "장치 재가동 · 과거형 glowed가 시간 엔진을 움직였습니다!" : "회로 순서를 다시 확인하세요.")}>Power device</button></div>
          </div>
        );
      }
      case "do-battle":
        return (
          <div className="battle-demo">
            <div className={`fog-target ${playing ? "listening" : ""}`}><span>ECHO SHIELD 72%</span><b>{playing ? "!" : "?"}</b></div>
            <div><span className="demo-stage-label">Listening battle · Sound memory</span><h3>신호를 듣고 빈칸에 들어갈 과거형 동사를 공격하세요.</h3><button className="signal-play" onClick={() => { setPlaying(true); success("재생 신호 · “The bell rang twice.”"); }}>Play echo signal</button><p className="battle-sentence">The bell ___ twice.</p><div className="lab-option-grid">{["rang", "shone", "sang"].map((word) => <button className={selected === word ? (word === "rang" ? "correct" : "wrong") : ""} key={word} onClick={() => { setSelected(word); success(word === "rang" ? "정화 공격 적중 · 듣기 신호와 동사가 정확히 연결됐습니다!" : "소리의 의미와 문장을 다시 연결해보세요."); }}>{word}</button>)}</div></div>
          </div>
        );
      case "do-workshop": {
        const recipe = ["First, heat the crystal.", "Next, add moonwater.", "Then, stir it slowly.", "Finally, turn off the flame."];
        return (
          <div className="workshop-demo">
            <span className="demo-stage-label">Writing workshop · Sequence expressions</span><h3>제작 순서를 눌러 달빛 물약을 완성하세요.</h3>
            <div className="recipe-track">{sequence.length ? sequence.map((line, index) => <span key={line}><i>{index + 1}</i>{line}</span>) : <p>Choose the recipe steps below</p>}</div>
            <div className="recipe-parts">{[recipe[2], recipe[0], recipe[3], recipe[1]].map((line) => <button key={line} disabled={sequence.includes(line)} onClick={() => setSequence([...sequence, line])}>{line}</button>)}</div>
            <div className="lab-inline-actions"><button onClick={() => setSequence([])}>Clear recipe</button><button onClick={() => success(sequence.join("|") === recipe.join("|") ? "제작 성공 · 순서 표현이 정확한 달빛 물약이 완성됐습니다!" : "First부터 Finally까지 제작 흐름을 다시 살펴보세요.")}>Craft potion</button></div>
          </div>
        );
      }
      case "do-detective":
        return (
          <div className="detective-demo">
            <span className="demo-stage-label">Reading mystery · Find decisive evidence</span><div className="case-file"><b>CASE 014 · The Missing Lantern</b><p>Mina left the archive before sunset. At midnight, the lantern was still warm and a fresh blue feather lay beside it.</p></div><h3>누군가 최근까지 등불을 사용했다는 결정적 단서는?</h3>
            <div className="evidence-grid">{["Mina left before sunset.", "The lantern was still warm.", "A blue feather was beside it."].map((clue, index) => <button className={selected === clue ? (index === 1 ? "correct" : "wrong") : ""} key={clue} onClick={() => { setSelected(clue); success(index === 1 ? "사건 해결 · warm이라는 상태 정보로 최근 사용을 추론했습니다!" : "흥미로운 단서지만, 최근 사용 시점을 직접 증명하지는 못해요."); }}><i>0{index + 1}</i><span>{clue}</span></button>)}</div>
          </div>
        );
      case "do-roleplay":
        return (
          <div className="open-talk-demo roleplay-demo"><div className="ai-bubble"><b>MERCHANT LUMA · FESTIVAL MARKET</b><p>I only lend my magic compass to a responsible adventurer. Why should I trust you?</p></div><div className="roleplay-goal"><span>MISSION GOAL</span><b>Give a reason + make a promise</b><small>Example tools: because, I will, I can</small></div><label>Your open response<textarea value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Try: You can trust me because I will return it after the festival." /></label><div className="roleplay-actions"><VoiceControl active={active} onClick={voice} label="Answer by voice" /><button className="lab-action" onClick={() => success(typed.trim().length > 18 ? "설득 성공 · 이유와 약속이 포함되어 상인이 나침반을 빌려주었습니다!" : "조금 더 구체적인 이유와 약속을 영어로 말해보세요.")}>Send response</button></div></div>
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
              </div>
              <div className="runner-path" />
              {runnerTargets.map((target) => <div key={target.word} className={`runner-rune ${target.good ? "good" : "trap"} ${runnerWords.includes(target.word) ? "collected" : ""}`} style={{ left: `${target.x}%`, top: `${target.y}%` }}><i>{target.good ? "✦" : "?"}</i><span>{target.word}</span></div>)}
              <div className="runner-avatar" style={{ left: `${runner.x}%`, top: `${runner.y}%` }}><i>J</i><span>YOU</span></div>
            </div>
            <div className="runner-controls"><span>빛과 관련된 유물만 수집하세요.</span><div><button onClick={() => moveRunner(-6, 0)}>A</button><button onClick={() => moveRunner(0, -6)}>W</button><button onClick={() => moveRunner(0, 6)}>S</button><button onClick={() => moveRunner(6, 0)}>D</button></div></div>
          </div>
        );
      case "do-rhythm":
        return (
          <div className="rhythm-demo">
            <div className="arcade-topline"><span>RHYTHM SPELL · HIT THE GLOW LINE</span><b>COMBO x{combo}</b><small>{rhythmPlaying ? `${Math.max(0, Math.ceil((rhythmTotalMs - rhythmTime) / 1000))}s` : "PRESS START"}</small></div>
            <h3>The <em>CRYS</em>tal <em>GLOWED</em> all <em>NIGHT</em>.</h3>
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
                const timing = rhythmPlaying && !status && Math.abs(hitAt - rhythmTime) <= 160;
                if (!visible) return null;
                return (
                  <i
                    key={`${note.key}-${index}`}
                    className={`rhythm-note lane-${note.key.toLowerCase()} ${status ?? ""} ${timing ? "timing" : ""}`}
                    style={{ left: `${left}%`, top: `${rhythmLaneTop[note.key]}%` }}
                  >
                    <span>{note.key}</span>
                    <small>{note.label}</small>
                  </i>
                );
              })}
            </div>
            <div className="rhythm-meter"><i style={{ width: `${rhythmProgress}%` }} /><span>{rhythmHits}/{rhythmNotes.length} HIT</span></div>
            <div className="rhythm-keys">{(["A", "S", "D", "F"] as RhythmKey[]).map((key) => <button key={key} className={rhythmNextNote?.key === key ? "next" : ""} onClick={() => hitRhythm(key)}><i>{key}</i><span>{key === "A" ? "The / again" : key === "S" ? "CRYS-tal / all" : key === "D" ? "GLOWED" : "NIGHT / CAST"}</span></button>)}</div>
            <button className="rhythm-start" onClick={startRhythmGame}>{rhythmPlaying ? "Restart Beat" : "Start Beat"}</button>
          </div>
        );
        return (
          <div className="rhythm-demo">
            <div className="arcade-topline"><span>RHYTHM SPELL · SENTENCE STRESS</span><b>COMBO x{combo}</b><small>KEYS A S D F</small></div>
            <h3>The <em>CRYS</em>tal <em>GLOWED</em> all <em>NIGHT</em>.</h3>
            <div className="rhythm-track">{rhythmPattern.map((key, index) => <i key={`${key}-${index}`} className={index === rhythmIndex ? "active" : index < rhythmIndex ? "hit" : ""}><span>{key}</span></i>)}</div>
            <div className="rhythm-keys">{["A", "S", "D", "F"].map((key) => <button key={key} className={rhythmPattern[rhythmIndex] === key ? "next" : ""} onClick={() => hitRhythm(key)}><i>{key}</i><span>{key === "A" ? "The" : key === "S" ? "CRYS-tal" : key === "D" ? "GLOWED" : "NIGHT"}</span></button>)}</div>
          </div>
        );
      case "do-slingshot":
        return (
          <div className="slingshot-demo">
            <div className="arcade-topline"><span>VOCABULARY TARGET · SUPER BRIGHT</span><b>HIT: RADIANT</b><small>DRAG + RELEASE</small></div>
            <div className="sling-field">
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
                  const shot = slingLanding;
                  const hit = slingTargets.find((target) => Math.abs(target.x - shot.x) < 10 && Math.abs(target.y - shot.y) < 13);
                  setSling({ ...shot, dragging: false, shot: true });
                  success(shot.x > 68 && shot.y < 48 ? "BULLSEYE · radiant 표적 적중! 강한 빛의 LV가 발생했습니다." : "표적을 빗나갔어요. 구슬을 왼쪽 아래로 더 길게 당겨보세요.");
                  window.setTimeout(() => success(hit?.word === "radiant" ? "BULLSEYE · radiant 표적 명중! 조준선과 같은 방향으로 정확히 발사됐어요." : "MISS · 구슬을 왼쪽 아래로 더 당겨 radiant 표적의 중심을 노려보세요."), 0);
                }}
                aria-label="Drag and release magic orb"
              >●</button>
              <div className="sling-anchor"><i /><i /></div>
            </div>
            <p className="sling-hint">구슬을 왼쪽 아래로 당겼다가 놓아 위쪽의 <b>radiant</b> 표적을 맞히세요.</p>
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
                  <div className="fog-enemy-art"><i /></div>
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
                <div className={`fog-creature-shape family-${fogCity} creature-${fogCreature}`}><i /><i /><b>{creature[0].slice(0, 1)}</b></div>
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

  return (
    <div className={`activity-sandbox sandbox-${phase} scene-${item.id} ${feedback ? "scene-reacting" : ""}`}>
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
    const close = (event: KeyboardEvent) => event.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", close);
    document.body.classList.toggle("activity-focus-open", expanded);
    return () => {
      window.removeEventListener("keydown", close);
      document.body.classList.remove("activity-focus-open");
    };
  }, [expanded]);
  const selectPhase = (nextPhase: ActivityPhase) => {
    if (nextPhase === "teach") {
      navigate("teach");
      return;
    }
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
    <main className={`page activity-lab-page ${expanded ? "activity-focus-mode" : ""}`}>
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

function WatchScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  const [scene, setScene] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const data = watchScenes[scene];
  const isLast = scene === watchScenes.length - 1;
  const next = () => {
    setScore(null);
    if (isLast) navigate("do-hub");
    else setScene((value) => value + 1);
  };
  return (
    <main className="page visual-novel-page">
      <div className="scene-topline"><span>WATCH · Visual Lesson</span><b>Scene {scene + 1} / {watchScenes.length}</b></div>
      <div className="visual-scene classroom">
        <Character name="Gram" role="Master of Grammia" />
        <div className="lesson-focus">
          <div className="magic-board">
            <small>MAGIC COORDINATE</small>
            {data.sentence ? <h2>{data.sentence}</h2> : <div className="coordinate-art"><i /><i /><i /></div>}
            <p>{data.support}</p>
          </div>
          {data.sentence && scene < 5 && (
            <button className="mic-button" onClick={() => setScore(82)}>
              <span>●</span>{score ? `Pronunciation Check ${score}%` : "문장 따라 읽기"}
            </button>
          )}
        </div>
        <Character name="Pix" role="Magic guide" side="right" />
        <DialogueBox speaker={data.speaker} text={data.text} onNext={next} button={isLast ? "Go to Do Activities" : "다음 대사"} />
      </div>
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
        <div className="completion-ring"><b>{completed.length}</b><span>/ {doHubMissions.length} restored</span></div>
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
        <img className="battle-actor battle-fogmon" src={sceneAssets.characters.fogmon} alt="Fog creature" />
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
  const check = () => {
    if (selected.join(" ") === data.answer) {
      setStatus("success");
      setMessage("룬 문장이 복원되었어!");
      if (puzzle === runePuzzles.length - 1) {
        setTimeout(() => {
          complete();
          navigate("do-hub");
        }, 900);
      } else {
        setTimeout(() => {
          setPuzzle((value) => value + 1);
          setSelected([]);
          setStatus("idle");
          setMessage("");
        }, 800);
      }
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
          <div className="rune-answer">
            {data.blocks.map((_, index) => selected[index]
              ? <button key={`${selected[index]}-${index}`} onClick={() => { setStatus("idle"); setSelected(selected.filter((__, selectedIndex) => selectedIndex !== index)); }}>{selected[index]}</button>
              : <span className="empty-rune" key={index}>{index + 1}</span>)}
          </div>
          <div className="rune-blocks">{data.blocks.filter((word) => !selected.includes(word)).map((word) => <button key={word} onClick={() => { setStatus("idle"); setSelected([...selected, word]); }}>{word}</button>)}</div>
          {message && <p className={`puzzle-message ${status}`} role="status">{message}</p>}
          <div className="center-actions"><Button variant="ghost" onClick={() => { setSelected([]); setStatus("idle"); setMessage(""); }}>Reset</Button><Button onClick={check} disabled={!selected.length || status === "success"}>Activate Rune</Button></div>
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
    <main className="page visual-novel-page">
      <div className="scene-topline"><span>DO-N1 · NPC Mission Talk</span><b>Mission {question + 1} / 2</b></div>
      <div className={`visual-scene town ${selected ? correct ? "answer-correct" : "answer-wrong" : ""}`}>
        <Character name="Milo" role="Lost citizen" />
        <div className="npc-objective">
          <span>FIELD REQUEST · MILO</span>
          <b>{question === 0 ? "Find the boy" : "Find the park"}</b>
          <small>{question === 0 ? "Use between to describe two landmarks." : "Use near to describe a close landmark."}</small>
          <div className="locator-signal"><i /><i /><i /><span>{correct ? "ROUTE FOUND" : "SCANNING ROUTE"}</span></div>
        </div>
        <div className="mission-dialogue npc-console">
          <div className="npc-speaker-card">
            <img src={sceneAssets.characters.milo} alt="" aria-hidden="true" />
            <div>
              <span>Milo's Request</span>
              <b>{question === 0 ? "길을 잃은 아이를 찾아주세요." : "공원이 어디인지 알려주세요."}</b>
            </div>
          </div>
          <DialogueBox speaker="Milo" text={correct ? data.response : data.line} />
          <ChoiceList choices={data.choices} onChoose={setSelected} selected={selected} answer={data.answer} reveal={Boolean(selected)} />
          {selected && <div className={`feedback ${correct ? "success" : "error"}`} role="status">{correct ? "Pix: 좋아! 상황에 맞는 문장을 골랐어." : "Pix: 위치 관계를 다시 확인해보자."}</div>}
          <Button onClick={next} disabled={!correct}>{question === 1 ? "Complete Mission" : "Continue"}</Button>
        </div>
        <Character name="Pix" role="Mission guide" side="right" />
        {correct && <SuccessBurst label="ROUTE FOUND" />}
      </div>
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
  const data = cultistGrammarCases[round];
  const selectedNpc = data.npcs.find((npc) => npc.id === selectedId);
  const allTalked = talked.length === data.npcs.length;
  const isCorrect = Boolean(selectedNpc?.isCultist);
  const progress = ((round + (isCorrect && phase !== "hammerAttack" ? 1 : 0)) / cultistGrammarCases.length) * 100;

  const imageForNpc = (npc: CultistNpc) => {
    if (selectedId !== npc.id) return cultistAssets.hidden;
    if (phase === "wrongAccused") {
      return npc.reactionType === "femaleInnocent" ? cultistAssets.innocentFemale : cultistAssets.innocentMale;
    }
    if (phase === "correctReveal") return cultistAssets.cultistIdle;
    if (phase === "cultistFleeing") return cultistAssets.cultistFleeing;
    return cultistAssets.hidden;
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
  };

  return (
    <main className={`cultist-mission-page phase-${phase}`}>
      <div className="cultist-mission-hud">
        <Button variant="ghost" onClick={() => navigate("do-hub")}>Exit Mission</Button>
        <span>DO-G1 · Find the Cultist</span>
        <b>Round {round + 1} / {cultistGrammarCases.length}</b>
      </div>
      <section className="cultist-arena">
        <div className="cultist-top-panel">
          <div>
            <span>Grammar Investigation</span>
            <h1>사이비 신도를 찾아라</h1>
            <p>{data.mission}</p>
          </div>
          <div className="cultist-progress">
            <ProgressBar value={progress} label="Cultist exposed" tone="mint" />
            <small>문장 확인 {talked.length} / {data.npcs.length}</small>
          </div>
        </div>

        <aside className="cultist-clue-card">
          <span>PIX GRAMMAR CLUE</span>
          <b>{data.title}</b>
          <p>{data.clue}</p>
          <small>{allTalked ? "이제 문법이 깨진 후보를 선택하세요." : "NPC를 한 명씩 눌러 문장을 먼저 확인하세요."}</small>
        </aside>

        <div className="cultist-npc-row">
          {data.npcs.map((npc, index) => {
            const hasTalked = talked.includes(npc.id);
            const isSelected = selectedId === npc.id;
            const canAccuse = allTalked && phase === "selecting";
            return (
              <article key={npc.id} className={`cultist-npc-card ${hasTalked ? "has-talked" : ""} ${isSelected ? "selected" : ""} ${isSelected && npc.isCultist && phase !== "hammerAttack" ? "revealed-cultist" : ""}`}>
                <button className="cultist-npc-portrait" onClick={() => (canAccuse ? accuseNpc(npc) : listenToNpc(npc))}>
                  <img src={imageForNpc(npc)} alt={`${npc.label} portrait`} />
                  {isSelected && phase === "hammerAttack" && <img className="cultist-hammer-hero" src={cultistAssets.hammerHero} alt="" aria-hidden="true" />}
                </button>
                <div className="cultist-npc-info">
                  <span>{String.fromCharCode(65 + index)}</span>
                  <b>{hasTalked ? npc.sentence : "문장 듣기 전"}</b>
                  <small>{hasTalked ? "문장 신호 확인됨" : "눌러서 문장 확인"}</small>
                </div>
                <button className="cultist-accuse-button" disabled={!canAccuse} onClick={() => accuseNpc(npc)}>
                  {canAccuse ? "이 NPC가 수상해요" : hasTalked ? "확인 완료" : "먼저 듣기"}
                </button>
              </article>
            );
          })}
        </div>

        <div className={`cultist-feedback ${phase === "wrongAccused" ? "error" : phase === "correctReveal" || phase === "cultistFleeing" ? "success" : ""}`}>
          <img src={sceneAssets.characters.pix} alt="Pix" />
          <div>
            <span>Pix Hint</span>
            {!selectedNpc && <p>{allTalked ? "세 문장을 비교해 보세요. 주어와 동사가 서로 약속을 지키지 않는 후보가 있어요." : "처음에는 모두 같은 로브를 입고 있어요. 외형이 아니라 문장을 근거로 찾아야 해요."}</p>}
            {phase === "hammerAttack" && <p>Jiho가 말랑망치를 들고 출동합니다. 문법 신호를 확인하는 중...</p>}
            {phase === "wrongAccused" && selectedNpc && <p>이 NPC는 올바른 문장을 말했어요. "{selectedNpc.sentence}"는 규칙에 맞습니다.</p>}
            {(phase === "correctReveal" || phase === "cultistFleeing") && selectedNpc && (
              <p>
                정답! "{selectedNpc.sentence}"가 깨진 문장이에요.
                <br />
                올바른 문장: <b>{selectedNpc.correctSentence}</b>
                <br />
                {selectedNpc.grammarPoint}
              </p>
            )}
          </div>
          {phase === "wrongAccused" && <Button onClick={retry}>다시 추리하기</Button>}
          {(phase === "correctReveal" || phase === "cultistFleeing") && <Button onClick={nextRound}>{round === cultistGrammarCases.length - 1 ? "미션 완료" : "다음 조사"}</Button>}
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
        <span className="kicker">TeachAI Mission · Mock Mode</span>
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
  onAnswerChange,
  onSubmit,
  onAdvance,
}: {
  step: TeachMissionStep;
  scaffoldLevel: ScaffoldLevel;
  answer: string;
  evaluation: TeachEvaluation | null;
  pendingSession: TeachSessionState | null;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  onAdvance: () => void;
}) {
  const inputConfig = getTeachInputForLevel(step, scaffoldLevel);
  const locked = Boolean(evaluation?.correct);
  const canSubmit = answer.trim().length > 0 && !locked;

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
        <Button disabled={!canSubmit} onClick={onSubmit}>NPC에게 알려주기</Button>
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

function TeachAIStage({ navigate }: { navigate: (screen: Screen) => void }) {
  const [scaffoldLevel, setScaffoldLevel] = useState<ScaffoldLevel>(2);
  const [started, setStarted] = useState(false);
  const [session, setSession] = useState<TeachSessionState>(() => startTeachSession(defaultTeachLesson.id, 2));
  const [pendingSession, setPendingSession] = useState<TeachSessionState | null>(null);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<TeachEvaluation | null>(null);
  const [result, setResult] = useState<TeachResult | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
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

  const submitAnswer = () => {
    if (!answer.trim() || evaluation?.correct) return;
    const response = submitTeachAnswer(session, step, answer, hintLevel);
    setEvaluation(response.evaluation);
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
        <Panel eyebrow="Learning Record"><div className="record-list"><span><b>Words</b>between · near · bank · hospital · magazine · university</span><span><b>Do</b>Sentence Purify · Rune Puzzle · NPC Mission Talk</span><span><b>Teach</b>between과 near의 차이를 Milo에게 설명함</span></div></Panel>
        <Panel className="insight-card strength" eyebrow="Strength"><h3>문장 구조를 안정적으로 복원했어요.</h3><p>장소 단어를 빠르게 이해하고, 룬 퍼즐에서 올바른 문장 순서를 만들었습니다.</p></Panel>
        <Panel className="insight-card practice" eyebrow="Needs Practice"><h3>전치사 차이를 한 번 더 확인해요.</h3><p>between과 near를 처음에는 헷갈렸지만 Teach 단계에서 설명하며 이해도가 상승했습니다.</p></Panel>
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

function DoHubFlow({
  navigate,
  completed,
}: {
  navigate: (screen: Screen) => void;
  completed: string[];
}) {
  const [activeMission, setActiveMission] = useState(doHubMissions[0].id);
  const active = doHubMissions.find((activity) => activity.id === activeMission) ?? doHubMissions[0];
  const allDone = completed.length >= doHubMissions.length;
  return (
    <main className="page do-hub-page">
      <div className="page-heading">
        <div>
          <span className="kicker">DO · Today's Field Practice</span>
          <h1>오늘 배운 표현을 써보자.</h1>
          <p>Activity Atlas의 Today's Course와 같은 {doHubMissions.length}개 미션입니다. 모두 완료하면 TeachAI가 열립니다.</p>
        </div>
        <div className="completion-ring"><b>{completed.length}</b><span>/ {doHubMissions.length} restored</span></div>
      </div>
      <div className="lesson-flow-strip do-flow-strip">
        <span><b>01</b> Watch 완료</span>
        <span className="active"><b>02</b> Do 미션 진행</span>
        <span className={allDone ? "active" : ""}><b>03</b> TeachAI {allDone ? "열림" : "대기"}</span>
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
        </div>
      </div>
    );
  }

  if (item.id === "do-assembly") {
    return (
      <div className="activity-sandbox sandbox-do scene-do-assembly">
        <div className="sandbox-world-shade" />
        <div className="atlas-demo-card rune-puzzle-demo">
          <span className="demo-stage-label">Today's DO 02 · Rune Puzzle</span>
          <h3>{sequence.length ? sequence.join(" ") : "단어 룬을 순서대로 눌러 문장을 완성하세요."}</h3>
          <div className="token-row">
            {parts.map((part) => (
              <button key={part} disabled={sequence.includes(part)} onClick={() => setSequence([...sequence, part])}>{part}</button>
            ))}
          </div>
          <div className="lab-inline-actions">
            <button onClick={() => setSequence([])}>Reset</button>
            <button onClick={() => setFeedback(sequence.join(" ") === parts.join(" ") ? "문장 룬 복원 성공!" : "아직 순서가 어색해요. 주어 → be동사 → 위치 표현 순서로 다시 보세요.")}>Check</button>
          </div>
          {feedback && <p className="atlas-demo-feedback">{feedback}</p>}
        </div>
      </div>
    );
  }

  if (item.id === "do-roleplay") {
    return (
      <div className="activity-sandbox sandbox-do scene-do-roleplay">
        <div className="sandbox-world-shade" />
        <div className="atlas-demo-card roleplay-demo">
          <span className="demo-stage-label">Today's DO 03 · NPC Mission Talk</span>
          <div className="ai-bubble"><b>Milo</b><p>I am lost. Is the hospital near the bank?</p></div>
          <label>답변을 직접 입력해보세요<textarea value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Try: Yes, the hospital is near the bank." /></label>
          <button className="lab-action" onClick={() => setFeedback(typed.length > 18 ? "좋아요. NPC가 길을 이해했어요!" : "near 또는 between을 넣어 조금 더 길게 말해보세요.")}>Send response</button>
          {feedback && <p className="atlas-demo-feedback">{feedback}</p>}
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
    const imageForDemoNpc = (npc: CultistNpc) => {
      if (cultistAccused !== npc.id) return cultistAssets.hidden;
      if (cultistPhase === "wrongAccused") return npc.reactionType === "femaleInnocent" ? cultistAssets.innocentFemale : cultistAssets.innocentMale;
      if (cultistPhase === "correctReveal") return cultistAssets.cultistIdle;
      if (cultistPhase === "cultistFleeing") return cultistAssets.cultistFleeing;
      return cultistAssets.hidden;
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
        setFeedback(npc.isCultist ? "정답! 로브 속 신도가 드러났어요." : "이 문장은 규칙에 맞아요. 다른 후보의 동사를 비교해보세요.");
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
              <h3>문법 신호가 깨진 NPC를 찾아라</h3>
              <p>세 NPC를 눌러 문장을 모두 확인한 뒤, 문법이 틀린 후보를 지목하세요.</p>
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
          <div className="cultist-atlas-row">
            {demoCase.npcs.map((npc, index) => {
              const hasTalked = cultistTalked.includes(npc.id);
              const isAccused = cultistAccused === npc.id;
              return (
                <button
                  key={npc.id}
                  className={`cultist-atlas-card ${hasTalked ? "has-talked" : ""} ${isAccused ? "accused" : ""} ${isAccused && npc.isCultist && cultistPhase !== "hammerAttack" ? "revealed" : ""} ${isAccused && !npc.isCultist && cultistPhase === "wrongAccused" ? "innocent" : ""}`}
                  onClick={() => accuseDemoNpc(npc)}
                >
                  <img src={imageForDemoNpc(npc)} alt={`${String.fromCharCode(65 + index)} candidate`} />
                  {isAccused && cultistPhase === "hammerAttack" && <img className="cultist-atlas-hammer" src={cultistAssets.hammerHero} alt="" aria-hidden="true" />}
                  <i>{String.fromCharCode(65 + index)}</i>
                  <b>{hasTalked ? npc.sentence : "문장 듣기"}</b>
                  <small>{canAccuse ? "지목하기" : hasTalked ? "문장 확인됨" : "눌러서 듣기"}</small>
                </button>
              );
            })}
          </div>
          <div className={`cultist-atlas-feedback ${cultistPhase === "wrongAccused" ? "error" : cultistPhase === "correctReveal" || cultistPhase === "cultistFleeing" ? "success" : ""}`}>
            <img src={sceneAssets.characters.pix} alt="Pix" />
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
        </div>
      </div>
    );
  }

  return <ActivitySandbox item={item} phase={phase} />;
}

function ActivityLabFlow({ navigate }: { navigate: (screen: Screen) => void }) {
  const [phase, setPhase] = useState<ActivityPhase>("watch");
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState<Record<ActivityPhase, string>>({
    watch: activityLibrary.watch[0].id,
    do: activityLibrary.do[0].id,
    teach: activityLibrary.teach[0].id,
  });
  const selected = activityLibrary[phase].find((item) => item.id === selection[phase]) ?? activityLibrary[phase][0];
  const linkedIds = todayActivityLinks[phase] ?? [];
  const linkedIndex = linkedIds.indexOf(selected.id);
  const isTodayLinked = linkedIndex >= 0;
  const guide = activityGuides[selected.id] ?? {
    activity: selected.description,
    control: `${selected.input} 방식으로 화면 안내를 따라 조작합니다.`,
    learning: phase === "watch" ? "새 개념을 보고 듣고 이해합니다." : phase === "teach" ? "배운 내용을 설명하며 이해를 완성합니다." : "배운 영어를 실제 상황에 적용합니다.",
  };

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", close);
    document.body.classList.toggle("activity-focus-open", expanded);
    return () => {
      window.removeEventListener("keydown", close);
      document.body.classList.remove("activity-focus-open");
    };
  }, [expanded]);

  const selectPhase = (nextPhase: ActivityPhase) => {
    if (nextPhase === "teach") {
      navigate("teach");
      return;
    }
    setPhase(nextPhase);
  };

  return (
    <main className={`page activity-lab-page ${expanded ? "activity-focus-mode" : ""}`}>
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
            <span>0{index + 1}</span><b>{item}</b><small>{item === "teach" ? "TEACHAI 바로 열기" : activityPhaseCopy[item][0]}</small>
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
            </div>
            <div className="preview-tools">
              <div className="ai-badge"><i>AI</i><span><b>Adaptive input</b><small>Voice-first · fallback supported</small></span></div>
              <button className="focus-toggle recommended" onClick={() => setExpanded(!expanded)}>
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
    <div className={`app screen-${screen}`}>
      <div className="ambient-light one" /><div className="ambient-light two" /><div className="noise" />
      {!noHeader && screen !== "parent" && <Header screen={screen} navigate={setScreen} />}
      {content}
    </div>
  );
}
