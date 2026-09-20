// src/Title.tsx
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { fontFamily } from "./fonts";

const MIN = 56; // 手机可读下限
const MAX = 120; // 观感上限
const PADDING = 60;

export const Title: React.FC<{ text: string }> = ({ text }) => {
  const { width } = useVideoConfig();
  const maxWidth = width - PADDING * 2;

  const single = fitText({
    text,
    withinWidth: maxWidth,
    fontFamily,
    fontWeight: 700,
  }).fontSize;

  const fontSize = Math.min(Math.max(single, MIN), MAX);
  const isSingleLine = single >= MIN;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: PADDING,
      }}
    >
      <h1
        style={{
          color: "#fff",
          fontFamily,
          fontWeight: 700,
          fontSize,
          lineHeight: 1.25,
          textAlign: "center",
          margin: 0,
          maxWidth,
          whiteSpace: isSingleLine ? "nowrap" : "normal",
          overflowWrap: "break-word",
        }}
      >
        {text}
      </h1>
    </AbsoluteFill>
  );
};
