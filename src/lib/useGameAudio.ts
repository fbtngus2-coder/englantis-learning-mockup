import { useCallback, useEffect, useRef, useState } from "react";
import type { Screen } from "../types/navigation";

const AUDIO_ENABLED_KEY = "englantis-audio-enabled";

const effectSources = {
  click: "/assets/audio/ui-click.ogg",
  hover: "/assets/audio/ui-hover.ogg",
  select: "/assets/audio/ui-select.ogg",
  success: "/assets/audio/ui-success.ogg",
  error: "/assets/audio/ui-error.ogg",
  transition: "/assets/audio/ui-transition.ogg",
} as const;

const bgmTracks = {
  homeBright: { src: "/assets/bgm/home-bright.mp3", volume: 0.16 },
  cheerfulSunshine: { src: "/assets/bgm/cheerful-sunshine.mp3", volume: 0.14 },
  calmSpringMoon: { src: "/assets/bgm/calm-spring-moon.mp3", volume: 0.13 },
  parentPostcard: { src: "/assets/bgm/parent-postcard.mp3", volume: 0.12 },
  arcadeClassic: { src: "/assets/bgm/arcade-classic.mp3", volume: 0.13 },
  cuteMilo: { src: "/assets/bgm/cute-milo.mp3", volume: 0.14 },
  gameFroggyAdventure: { src: "/assets/bgm/game-froggy-adventure.mp3", volume: 0.13 },
  successBrighter: { src: "/assets/bgm/success-brighter.mp3", volume: 0.13 },
  medievalMoonspire: { src: "/assets/bgm/medieval-moonspire.ogg", volume: 0.13 },
  medievalWindsOfValor: { src: "/assets/bgm/medieval-winds-of-valor.ogg", volume: 0.13 },
  medievalDarkwoodPath: { src: "/assets/bgm/medieval-darkwood-path.ogg", volume: 0.12 },
  medievalFrostbound: { src: "/assets/bgm/medieval-frostbound.ogg", volume: 0.12 },
  medievalEmberlight: { src: "/assets/bgm/medieval-emberlight.ogg", volume: 0.13 },
  medievalSilverbrook: { src: "/assets/bgm/medieval-silverbrook.ogg", volume: 0.12 },
  medievalMysticGrove: { src: "/assets/bgm/medieval-mystic-grove.ogg", volume: 0.12 },
  medievalThroneOfStorms: { src: "/assets/bgm/medieval-throne-of-storms.ogg", volume: 0.13 },
  medievalSorrowsEdge: { src: "/assets/bgm/medieval-sorrows-edge.ogg", volume: 0.12 },
  medievalElvenDawn: { src: "/assets/bgm/medieval-elven-dawn.ogg", volume: 0.12 },
} as const;

type EffectName = keyof typeof effectSources;
type BgmTrackKey = keyof typeof bgmTracks;

const screenBgmTracks: Record<Screen, BgmTrackKey> = {
  home: "homeBright",
  "story-intro": "medievalMoonspire",
  "course-select": "medievalElvenDawn",
  map: "medievalMysticGrove",
  "daily-intro": "medievalSilverbrook",
  watch: "calmSpringMoon",
  "do-hub": "gameFroggyAdventure",
  sentence: "medievalThroneOfStorms",
  rune: "medievalMysticGrove",
  npc: "cuteMilo",
  cultist: "medievalDarkwoodPath",
  teach: "arcadeClassic",
  "daily-result": "successBrighter",
  "weekly-intro": "medievalFrostbound",
  "weekly-boss": "medievalThroneOfStorms",
  "weekly-result": "medievalEmberlight",
  "monthly-intro": "medievalSorrowsEdge",
  "monthly-boss": "medievalThroneOfStorms",
  "monthly-summary": "medievalEmberlight",
  "final-teach": "medievalWindsOfValor",
  "activity-lab": "gameFroggyAdventure",
  parent: "parentPostcard",
};

const activityBgmTracks: Record<string, BgmTrackKey> = {
  "watch:watch-human-lecture": "calmSpringMoon",
  "watch:watch-vr-lecture": "medievalElvenDawn",
  "watch:watch-master-lecture": "medievalSilverbrook",
  "watch:watch-dialogue": "medievalMoonspire",
  "watch:watch-video": "calmSpringMoon",
  "watch:watch-checkpoint": "cheerfulSunshine",
  "watch:watch-shadow": "cuteMilo",
  "watch:watch-adaptive": "medievalElvenDawn",
  "do:do-battle": "medievalThroneOfStorms",
  "do:do-assembly": "arcadeClassic",
  "do:do-roleplay": "cuteMilo",
  "do:do-cultist": "medievalDarkwoodPath",
  "do:do-fog-lab": "medievalThroneOfStorms",
  "do:do-explore": "medievalMysticGrove",
  "do:do-workshop": "medievalEmberlight",
  "do:do-detective": "medievalDarkwoodPath",
  "do:do-runner": "cheerfulSunshine",
  "do:do-rhythm": "arcadeClassic",
  "do:do-slingshot": "medievalWindsOfValor",
  "teach:teach-tell": "medievalEmberlight",
};

function getActivityBgmTrack(): BgmTrackKey | null {
  if (typeof document === "undefined") return null;

  const context = document.querySelector<HTMLElement>("[data-bgm-context]")?.dataset.bgmContext;
  if (context) {
    const selectedId = context.split(":").pop() ?? "";
    return activityBgmTracks[context] ?? activityBgmTracks[selectedId] ?? null;
  }

  const sandbox = document.querySelector<HTMLElement>(".activity-sandbox");
  if (!sandbox) return null;
  if (sandbox.classList.contains("scene-do-battle")) return "medievalThroneOfStorms";
  if (sandbox.classList.contains("scene-do-assembly")) return "arcadeClassic";
  if (sandbox.classList.contains("scene-do-roleplay")) return "cuteMilo";
  if (sandbox.classList.contains("scene-do-cultist")) return "medievalDarkwoodPath";
  return null;
}

function getBgmTrackKey(screen: Screen): BgmTrackKey {
  if (screen === "activity-lab") {
    return getActivityBgmTrack() ?? screenBgmTracks[screen];
  }
  return screenBgmTracks[screen];
}

function readInitialAudioSetting() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUDIO_ENABLED_KEY) === "on";
}

function isInteractiveElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest(
    [
      "button",
      "a[href]",
      "[role='button']",
      "input",
      "select",
      "textarea",
      ".choice",
      ".mission-row",
      ".map-node",
      ".map-region-marker",
      ".course-node",
      ".dialogue-next",
      ".report-preview",
      ".fog-pix-companion",
      ".sling-target",
    ].join(", ")
  ) as HTMLElement | null;
}

function isDisabledElement(element: HTMLElement) {
  return (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    element.classList.contains("disabled")
  );
}

function pickEffectName(element: HTMLElement): EffectName {
  if (isDisabledElement(element)) return "error";
  if (element.closest(".wrong, .incorrect, .answer-wrong, .error")) return "error";
  if (element.closest(".correct, .answer-correct, .success, .reward-toast")) return "success";
  if (
    element.closest(
      ".button-primary, .dialogue-next, .mission-row, .map-node, .map-region-marker, .course-node, .choice"
    )
  ) {
    return "select";
  }
  return "click";
}

function spawnClickBurst(event: PointerEvent) {
  if (typeof document === "undefined") return;
  const burst = document.createElement("span");
  burst.className = "magic-click-burst";
  burst.style.left = `${event.clientX}px`;
  burst.style.top = `${event.clientY}px`;
  document.body.appendChild(burst);
  window.setTimeout(() => burst.remove(), 640);
}

export function useGameAudio(screen: Screen) {
  const [enabled, setEnabled] = useState(readInitialAudioSetting);
  const [unlocked, setUnlocked] = useState(false);
  const [bgmKey, setBgmKey] = useState<BgmTrackKey>(() => screenBgmTracks[screen]);
  const effectsRef = useRef<Partial<Record<EffectName, HTMLAudioElement>>>({});
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmKeyRef = useRef<BgmTrackKey | null>(null);
  const lastScreenRef = useRef(screen);
  const lastHoverTimeRef = useRef(0);

  useEffect(() => {
    const effects: Partial<Record<EffectName, HTMLAudioElement>> = {};
    (Object.keys(effectSources) as EffectName[]).forEach((name) => {
      const audio = new Audio(effectSources[name]);
      audio.preload = "auto";
      effects[name] = audio;
    });
    effectsRef.current = effects;

    const initialBgmKey = getBgmTrackKey(screen);
    const bgm = new Audio(bgmTracks[initialBgmKey].src);
    bgm.preload = "auto";
    bgm.loop = true;
    bgm.volume = bgmTracks[initialBgmKey].volume;
    bgmRef.current = bgm;
    currentBgmKeyRef.current = initialBgmKey;

    return () => {
      Object.values(effectsRef.current).forEach((audio) => {
        audio?.pause();
      });
      bgmRef.current?.pause();
    };
  }, [screen]);

  useEffect(() => {
    const updateBgmKey = () => setBgmKey(getBgmTrackKey(screen));
    updateBgmKey();

    if (screen !== "activity-lab" || typeof MutationObserver === "undefined" || typeof document === "undefined") {
      return;
    }

    const observer = new MutationObserver(updateBgmKey);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-bgm-context"],
    });
    return () => observer.disconnect();
  }, [screen]);

  const playEffect = useCallback((name: EffectName, volume = 0.28) => {
    const source = effectsRef.current[name];
    if (!source) return;
    const audio = source.cloneNode(true) as HTMLAudioElement;
    audio.volume = name === "hover" ? 0.12 : volume;
    void audio.play().catch(() => undefined);
  }, []);

  const toggleAudio = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(AUDIO_ENABLED_KEY, next ? "on" : "off");
      if (next) {
        setUnlocked(true);
        window.setTimeout(() => playEffect("success", 0.3), 0);
      } else {
        bgmRef.current?.pause();
      }
      return next;
    });
  }, [playEffect]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const interactiveElement = isInteractiveElement(event.target);
      if (!interactiveElement) return;

      setUnlocked(true);
      spawnClickBurst(event);
      if (enabled) playEffect(pickEffectName(interactiveElement));
    };

    const onPointerOver = (event: PointerEvent) => {
      if (!enabled || !isInteractiveElement(event.target)) return;
      const now = window.performance.now();
      if (now - lastHoverTimeRef.current < 150) return;
      lastHoverTimeRef.current = now;
      playEffect("hover");
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerover", onPointerOver, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerover", onPointerOver, true);
    };
  }, [enabled, playEffect]);

  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;

    const nextTrack = bgmTracks[bgmKey];
    if (currentBgmKeyRef.current !== bgmKey) {
      bgm.pause();
      bgm.src = nextTrack.src;
      bgm.currentTime = 0;
      bgm.load();
      currentBgmKeyRef.current = bgmKey;
    }

    bgm.volume = nextTrack.volume;
    bgm.loop = true;

    if (enabled && unlocked) {
      void bgm.play().catch(() => undefined);
    } else {
      bgm.pause();
    }
  }, [bgmKey, enabled, unlocked]);

  useEffect(() => {
    if (lastScreenRef.current !== screen) {
      if (enabled && unlocked) playEffect("transition", 0.2);
      lastScreenRef.current = screen;
    }
  }, [enabled, playEffect, screen, unlocked]);

  return { audioEnabled: enabled, bgmTrack: bgmKey, bgmTrackSrc: bgmTracks[bgmKey].src, toggleAudio };
}
