import React from "react";
import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";
import { Goose } from "./goose/Goose";
import { ACTIONS, ACTION_NAMES } from "./goose/actions";
import { CANVAS } from "./goose/rig";
import { storyboardFrames } from "./schema";
import { shanShenStoryboard, storyboard } from "./storyboard";

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    {/* 成片 */}
    <Composition
      id="GooseShort"
      component={ShortVideo}
      defaultProps={{ storyboard }}
      width={CANVAS.width}
      height={CANVAS.height}
      fps={FPS}
      durationInFrames={storyboardFrames(storyboard)}
    />

    {/* 闪身步 30 秒 */}
    <Composition
      id="GooseShanShen"
      component={ShortVideo}
      defaultProps={{ storyboard: shanShenStoryboard }}
      width={CANVAS.width}
      height={CANVAS.height}
      fps={FPS}
      durationInFrames={storyboardFrames(shanShenStoryboard)}
    />

    {/*
      每个动作一个预览 Composition（Action-idle、Action-jump …）。
      可循环动作时长 = 两个周期，方便调参并检查接缝；
      loopable === false 的一次性动作只播一个周期，避免预览后半段瞬移回起点。
    */}
    {ACTION_NAMES.map((name) => (
      <Composition
        key={name}
        id={`Action-${name}`}
        component={Goose}
        defaultProps={{ action: name }}
        width={CANVAS.width}
        height={CANVAS.height}
        fps={FPS}
        durationInFrames={
          ACTIONS[name].duration * (ACTIONS[name].loopable === false ? 1 : 2)
        }
      />
    ))}
  </>
);
