import type { StoryDialogue, StoryPage } from "../../data/storyIntroData";

type StoryDialogueBoxProps = {
  page: StoryPage;
  dialogue: StoryDialogue;
  dialogueIndex: number;
  dialogueTotal: number;
  isFirstStep: boolean;
  isFinalPage: boolean;
  onPrev: () => void;
  onNext: () => void;
  onStartQuest: () => void;
  onRestart: () => void;
  onSkip: () => void;
};

export function StoryDialogueBox({
  page,
  dialogue,
  dialogueIndex,
  dialogueTotal,
  isFirstStep,
  isFinalPage,
  onPrev,
  onNext,
  onStartQuest,
  onRestart,
  onSkip,
}: StoryDialogueBoxProps) {
  return (
    <section className="story-dialogue-box">
      <div className="story-speaker">{dialogue.speaker}</div>
      <p className="story-dialogue-text">{dialogue.text}</p>
      <div className="story-dialogue-meta">
        <span>{page.narration}</span>
        <small>{dialogueIndex + 1} / {dialogueTotal}</small>
      </div>
      <div className="story-dialogue-actions">
        {!isFinalPage ? (
          <>
            <button type="button" className="story-nav-button ghost" disabled={isFirstStep} onClick={onPrev}>
              이전
            </button>
            <button type="button" className="story-nav-button primary" onClick={onNext}>
              다음
            </button>
          </>
        ) : (
          <>
            <button type="button" className="story-nav-button primary glow" onClick={onStartQuest}>
              {page.primaryAction?.label ?? "첫 번째 퀘스트 시작"}
            </button>
            <button type="button" className="story-nav-button ghost" onClick={onRestart}>
              스토리 다시 보기
            </button>
            <button type="button" className="story-nav-button ghost" onClick={onSkip}>
              건너뛰기
            </button>
          </>
        )}
      </div>
    </section>
  );
}
