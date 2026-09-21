import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Goose } from "./goose/Goose";
import { sceneFrames } from "./schema";
import { storyboard } from "./storyboard";

const TRANSITION_FRAMES = 15;

// 每个场景的帧数 = 动作周期 × loops；转场会吃掉时长，总长要减掉
export const totalFrames =
  storyboard.scenes.reduce((sum, s) => sum + sceneFrames(s), 0) -
  (storyboard.scenes.length - 1) * TRANSITION_FRAMES;

export const ShortVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f7f5ef" }}>
      <TransitionSeries>
        {storyboard.scenes.map((scene, i) => (
          <React.Fragment key={`${scene.action}-${i}`}>
            {i > 0 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
            )}
            <TransitionSeries.Sequence durationInFrames={sceneFrames(scene)}>
              <Goose action={scene.action} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
