// src/ShortVideo.tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { Title } from "./Title";
import { Captions } from "./Captions";
import type { ShortVideoProps } from "./types";

export const ShortVideo: React.FC<ShortVideoProps> = ({ title, captions }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1020" }}>
      <Title text={title} />
      <Captions lines={captions} />
    </AbsoluteFill>
  );
};
