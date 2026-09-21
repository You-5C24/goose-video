/**
 * Goose.tsx —— 纯渲染
 *
 * 层级（外 → 内）：
 *   root  ：整只鹅的平移 + squash/stretch，缩放支点在脚底（rig.FOOT）
 *   body  ：绕胸腹支点旋转；它一转，怀里的头和翅膀整个坐标系跟着走
 *   head / leftWing / rightWing：各绕自己的支点旋转，挂在 body 内
 *
 * 所有数字都来自 rig.ts，每帧姿态都来自 engine.samplePose，这里不做任何计算。
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { ACTIONS, type ActionName } from "./actions";
import { samplePose, toCss } from "./engine";
import { CHILD_ORDER, FOOT, IMAGE_SIZE, LAYERS, PIVOTS, ROOT_OFFSET } from "./rig";

type GooseProps = { action: ActionName };

/** 四张图都按 top:0 / left:0 叠，靠外层 div 的 transform 去动。 */
const layerImg: React.CSSProperties = { position: "absolute", top: 0, left: 0 };

export const Goose: React.FC<GooseProps> = ({ action }) => {
  const frame = useCurrentFrame();
  const pose = samplePose(ACTIONS[action], frame);
  const { root, parts } = pose;

  return (
    <AbsoluteFill>
      {/* root：把图内坐标搬到画布（ROOT_OFFSET），再叠上动作里的整体位移和缩放 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: IMAGE_SIZE,
          height: IMAGE_SIZE,
          transformOrigin: `${FOOT.x}px ${FOOT.y}px`,
          transform: `translate(${ROOT_OFFSET.x + root.x}px, ${ROOT_OFFSET.y + root.y}px) scale(${root.scaleX}, ${root.scaleY})`,
        }}
      >
        {/* body：根部件，子层都嵌在它里面 */}
        <div style={toCss(parts.body, PIVOTS.body)}>
          <Img src={staticFile(LAYERS.body)} style={layerImg} />

          {CHILD_ORDER.map((part) => (
            <div key={part} style={toCss(parts[part], PIVOTS[part])}>
              <Img src={staticFile(LAYERS[part])} style={layerImg} />
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
