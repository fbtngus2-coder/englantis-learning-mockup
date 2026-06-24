type StoryNavigationProps = {
  title: string;
  page: number;
  total: number;
  onSkip: () => void;
};

export function StoryNavigation({ title, page, total, onSkip }: StoryNavigationProps) {
  return (
    <header className="story-topbar">
      <div>
        <span>{String(page).padStart(2, "0")}</span>
        <b>{title}</b>
      </div>
      <div className="story-page-tools">
        <span>{String(page).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <button type="button" onClick={onSkip}>SKIP</button>
      </div>
    </header>
  );
}
