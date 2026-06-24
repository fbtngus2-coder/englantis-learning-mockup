import type { CSSProperties } from "react";
import type { StoryCharacter } from "../../data/storyIntroData";

type StoryCharacterLayerProps = {
  characters: StoryCharacter[];
  compact?: boolean;
};

export function StoryCharacterLayer({ characters, compact = false }: StoryCharacterLayerProps) {
  return (
    <div className={compact ? "story-character-layer compact" : "story-character-layer"}>
      {characters.map((character) => {
        const style = {
          "--story-x": `${character.x}%`,
          "--story-y": `${character.y}%`,
          "--story-width": `${character.width ?? 300}px`,
          "--story-scale": character.scale ?? 1,
          "--story-opacity": character.opacity ?? 1,
          "--story-z": character.zIndex ?? 4,
        } as CSSProperties;

        return (
          <img
            key={character.id}
            className={[
              "story-character",
              character.flipX ? "flip-x" : "",
              character.grayscale ? "grayscale" : "",
              character.className ?? "",
            ].filter(Boolean).join(" ")}
            src={character.src}
            alt=""
            style={style}
            draggable={false}
          />
        );
      })}
    </div>
  );
}
