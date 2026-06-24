import { useEffect, useMemo, useState } from "react";
import {
  STORY_INTRO_STORAGE_KEY,
  storyIntroPages,
  type StoryJourneyStep,
  type StoryPage,
} from "../../data/storyIntroData";
import { StoryCharacterLayer } from "./StoryCharacterLayer";
import { StoryDialogueBox } from "./StoryDialogueBox";
import { StoryEffectLayer } from "./StoryEffectLayer";
import { StoryNavigation } from "./StoryNavigation";

type StoryIntroProps = {
  forceOpen?: boolean;
  onStartQuest: () => void;
  onSkip: () => void;
  onClose: () => void;
};

function markIntroViewed() {
  localStorage.setItem(STORY_INTRO_STORAGE_KEY, "true");
}

function JourneyPreview({ page }: { page: StoryPage }) {
  const steps = page.journeySteps ?? [];

  return (
    <div className="story-journey-preview" aria-label="Watch Do Teach journey">
      <div className="story-journey-title">WATCH <span /> DO <span /> TEACH</div>
      <div className="story-journey-grid">
        {steps.map((step: StoryJourneyStep) => (
          <article className={`story-journey-card ${step.id}`} key={step.id}>
            <div className="story-journey-bg" style={{ backgroundImage: `url(${step.background})` }} />
            <StoryEffectLayer effects={step.effects} compact />
            <StoryCharacterLayer characters={step.characters} compact />
            <div className="story-journey-card-copy">
              <b>{step.title}</b>
              <p>{step.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function StoryIntro({ forceOpen = false, onStartQuest, onSkip, onClose }: StoryIntroProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const page = storyIntroPages[pageIndex];
  const dialogue = page.dialogues[dialogueIndex];
  const isFinalPage = pageIndex === storyIntroPages.length - 1;
  const isFirstStep = pageIndex === 0 && dialogueIndex === 0;
  const sceneStyle = useMemo(() => ({ backgroundImage: `url(${page.background})`, backgroundPosition: page.backgroundPosition ?? "center" }), [page]);

  useEffect(() => {
    if (!forceOpen && localStorage.getItem(STORY_INTRO_STORAGE_KEY) === "true") {
      onClose();
    }
  }, [forceOpen, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleSkip();
      }
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        handleNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const resetDialogue = (nextPage: number) => {
    setPageIndex(nextPage);
    setDialogueIndex(0);
  };

  const handleNext = () => {
    if (isFinalPage) return;

    if (dialogueIndex < page.dialogues.length - 1) {
      setDialogueIndex((current) => current + 1);
      return;
    }

    resetDialogue(Math.min(pageIndex + 1, storyIntroPages.length - 1));
  };

  const handlePrev = () => {
    if (dialogueIndex > 0) {
      setDialogueIndex((current) => current - 1);
      return;
    }

    if (pageIndex > 0) {
      const prevPage = pageIndex - 1;
      setPageIndex(prevPage);
      setDialogueIndex(storyIntroPages[prevPage].dialogues.length - 1);
    }
  };

  const handleRestart = () => {
    setPageIndex(0);
    setDialogueIndex(0);
  };

  const handleSkip = () => {
    markIntroViewed();
    onSkip();
  };

  const handleStartQuest = () => {
    markIntroViewed();
    onStartQuest();
  };

  return (
    <main className="story-intro-page">
      <section className={`story-scene overlay-${page.overlay ?? "dark"}`} style={sceneStyle}>
        <StoryNavigation title={page.title} page={pageIndex + 1} total={storyIntroPages.length} onSkip={handleSkip} />
        <div className="story-scene-vignette" />
        {page.layout === "journey" ? (
          <JourneyPreview page={page} />
        ) : (
          <>
            <StoryEffectLayer effects={page.effects} />
            <StoryCharacterLayer characters={page.characters} />
          </>
        )}
        <StoryDialogueBox
          page={page}
          dialogue={dialogue}
          dialogueIndex={dialogueIndex}
          dialogueTotal={page.dialogues.length}
          isFirstStep={isFirstStep}
          isFinalPage={isFinalPage}
          onPrev={handlePrev}
          onNext={handleNext}
          onStartQuest={handleStartQuest}
          onRestart={handleRestart}
          onSkip={handleSkip}
        />
      </section>
    </main>
  );
}
