// src/Caption.tsx —— 一条字幕，逐字高亮
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "./fonts";
import type { CaptionLine } from "./types";

export const Caption: React.FC<{ line: CaptionLine }> = ({ line }) => {
  const frame = useCurrentFrame(); // 局部帧，从这条字幕的第 0 帧起
  const { fps } = useVideoConfig();

  const nowMs = (frame / fps) * 1000; // 相对毫秒
  const chars = Array.from(line.text); // 别用 split("")，会把 emoji 劈成两半
  const perChar = (line.endMs - line.startMs) / chars.length;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 320,
      }}
    >
      <h2
        style={{
          fontFamily,
          fontSize: 64,
          fontWeight: 700,
          textAlign: "center",
          margin: 0,
        }}
      >
        {chars.map((ch, i) => (
          <span
            key={i}
            style={{
              color: nowMs >= i * perChar ? "#FFD700" : "rgba(255,255,255,0.4)",
            }}
          >
            {ch}
          </span>
        ))}
      </h2>
    </AbsoluteFill>
  );
};
