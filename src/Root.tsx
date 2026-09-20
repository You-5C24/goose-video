// src/Root.tsx
import React from "react";
import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";
import type { ShortVideoProps } from "./types";

const sample: ShortVideoProps = {
  title: "白鹅今天在公司门口睡着了",
  captions: [
    { text: "白鹅今天发疯了", startMs: 0, endMs: 1800 },
    { text: "它开始跳舞", startMs: 1900, endMs: 3600 },
    { text: "然后在公司门口睡了", startMs: 3700, endMs: 6000 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ShortVideo"
      component={ShortVideo}
      durationInFrames={240}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={sample}
    />
  );
};
