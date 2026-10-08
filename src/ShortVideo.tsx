import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Goose } from "./goose/Goose";
import { sceneFrames, type Storyboard } from "./schema";

/** 按分镜串场景；transitionFrames > 0 时场景间淡入淡出，0 时硬切。 */
export const ShortVideo: React.FC<{ storyboard: Storyboard }> = ({ storyboard }) => {
  const { scenes, transitionFrames } = storyboard;
  return (
    <AbsoluteFill style={{ backgroundColor: "#f7f5ef" }}>
      <TransitionSeries>
        {scenes.map((scene, i) => (
          <React.Fragment key={`${scene.action}-${i}`}>
            {i > 0 && transitionFrames > 0 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: transitionFrames })}
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
