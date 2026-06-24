import type { CSSProperties } from "react";
import type { StoryEffect } from "../../data/storyIntroData";

type StoryEffectLayerProps = {
  effects?: StoryEffect[];
  compact?: boolean;
};

export function StoryEffectLayer({ effects = [], compact = false }: StoryEffectLayerProps) {
  return (
    <div className={compact ? "story-effect-layer compact" : "story-effect-layer"}>
      {effects.map((effect) => {
        const style = {
          "--story-x": `${effect.x ?? 50}%`,
          "--story-y": `${effect.y ?? 50}%`,
          "--story-width": `${effect.width ?? 320}px`,
          "--story-scale": effect.scale ?? 1,
          "--story-opacity": effect.opacity ?? 1,
          "--story-z": effect.zIndex ?? 3,
        } as CSSProperties;

        if (effect.type && effect.type !== "image") {
          return (
            <div
              key={effect.id}
              className={[
                "story-css-effect",
                `story-${effect.type}`,
                effect.className ?? "",
              ].filter(Boolean).join(" ")}
              style={style}
            />
          );
        }

        if (!effect.src) return null;

        return (
          <img
            key={effect.id}
            className={["story-effect", effect.className ?? ""].filter(Boolean).join(" ")}
            src={effect.src}
            alt=""
            style={style}
            draggable={false}
          />
        );
      })}
    </div>
  );
}
