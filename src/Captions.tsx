// src/Captions.tsx —— 多条字幕排班
import React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { Caption } from "./Caption";
import type { CaptionLine } from "./types";

export const Captions: React.FC<{ lines: CaptionLine[] }> = ({ lines }) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {lines.map((line, i) => (
        <Sequence
          key={i}
          from={Math.round((line.startMs / 1000) * fps)}
          durationInFrames={Math.max(
            1,
            Math.round(((line.endMs - line.startMs) / 1000) * fps),
          )}
        >
          <Caption line={line} />
        </Sequence>
      ))}
    </>
  );
};
