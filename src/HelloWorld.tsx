import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

export const HelloWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();

  // const x = interpolate(
  //   frame,
  //   [0, durationInFrames / 2, durationInFrames - 1], // 帧号的三个锚点
  //   [0, width - 200, 0], // 对应位置的三个锚点
  // );

  const progress = frame / durationInFrames;
  const eased = Easing.inOut(Easing.quad)(progress); // 0 → 1，但两端压扁
  const x = eased * (width - 200);

  return (
    <AbsoluteFill className="bg-slate-900">
      <div className="absolute text-[200px]" style={{ left: x, top: 400 }}>
        🦢
      </div>
    </AbsoluteFill>
  );
};
