import React from "react";
import { Composition } from "remotion";
import { ShortVideo, totalFrames } from "./ShortVideo";
import { Goose } from "./goose/Goose";
import { ACTIONS, ACTION_NAMES } from "./goose/actions";
import { CANVAS } from "./goose/rig";

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    {/* 成片 */}
    <Composition
      id="GooseShort"
      component={ShortVideo}
      width={CANVAS.width}
      height={CANVAS.height}
      fps={FPS}
      durationInFrames={totalFrames}
    />

    {/*
      每个动作一个预览 Composition（Action-idle、Action-jump …），
      时长 = 两个周期，方便在 studio 里单独调参、同时检查循环接缝是否平滑。
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
        durationInFrames={ACTIONS[name].duration * 2}
      />
    ))}
  </>
);
