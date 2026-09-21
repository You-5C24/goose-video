/**
 * engine.ts —— 「怎么算出每一帧的姿态」
 *
 * 输入：一个动作定义（若干关键帧轨道）+ 当前帧号
 * 输出：根层 + 四个部件各自的 Transform（旋转 / 平移 / 缩放）
 *
 * 引擎负责三件让动作「有物理感」的事，动作作者只需填少量关键帧：
 * 1. 逐段 easing：每个关键帧可指定「到达本帧」这一段的缓动，默认 inOut。
 * 2. 跟随延迟（LAG）：子部件按 rig.LAG 晚几帧采样自己的轨道。
 * 3. 拖拽（DRAG）：父级在这几帧里的旋转 / 位移变化量，按 rig.DRAG 比例
 *    反向加到子部件上，产生「身体先走、头和翅膀被甩着跟上」的感觉。
 */
import React from "react";
import { Easing } from "remotion";
import { DRAG, LAG, PARTS, type Part } from "./rig";

// ─────────────────────────── 类型 ───────────────────────────

/** 缓动名。描述的是「从上一帧到本帧」这一段怎么走。 */
export type Ease = "linear" | "in" | "out" | "inOut" | "back";

/** 一格关键帧：第 frame 帧，值到 value；ease 缺省为 inOut。 */
export type Keyframe = { frame: number; value: number; ease?: Ease };
export type Track = Keyframe[];

/**
 * 可动画通道。
 * rotate 单位度，x / y 单位像素（y 正数向下），scaleX / scaleY 为倍数（1 = 原样）。
 */
export type Channel = "rotate" | "x" | "y" | "scaleX" | "scaleY";
export type ChannelTracks = Partial<Record<Channel, Track>>;

/**
 * 一个动作。
 * - duration：周期帧数，播放时按 frame % duration 循环。
 * - root：整只鹅一起动（跳跃位移、squash / stretch）。
 * - parts：各部件自己的轨道。
 */
export type ActionDef = {
  duration: number;
  root?: ChannelTracks;
  parts?: Partial<Record<Part, ChannelTracks>>;
};

/** 采样结果：一层的完整变换。 */
export type Transform = {
  rotate: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};

export const IDENTITY: Transform = { rotate: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 };

/** 某一帧的整体姿态。 */
export type Pose = { root: Transform; parts: Record<Part, Transform> };

// ─────────────────────────── easing ───────────────────────────

/**
 * 名字 → 缓动函数。全部基于 remotion.Easing。
 * back 带过冲（先冲过目标再回来），用在「到位」的那一帧上很有弹性。
 */
const EASE: Record<Ease, (p: number) => number> = {
  linear: Easing.linear,
  in: Easing.in(Easing.quad),
  out: Easing.out(Easing.quad),
  inOut: Easing.inOut(Easing.quad),
  back: Easing.out(Easing.back(1.6)),
};

// ─────────────────────────── 采样 ───────────────────────────

/**
 * 查一条轨道在 frame 处的值。
 * - 没有轨道 / 空轨道 → fallback
 * - 早于首帧 → 首值；晚于末帧 → 末值（两端 clamp）
 * - 落在 [a, b] 段内 → 用 b.ease 对进度做缓动后线性混合
 *
 * 不用 remotion.interpolate 是因为它整条轨道只能一个 easing，
 * 这里需要逐段不同（例如跳跃：起跳 out、下落 in）。
 */
export const sampleTrack = (
  track: Track | undefined,
  frame: number,
  fallback: number,
): number => {
  if (!track || track.length === 0) return fallback;
  if (frame <= track[0].frame) return track[0].value;
  const last = track[track.length - 1];
  if (frame >= last.frame) return last.value;

  // 找到 frame 所在的段 [a, b]
  let i = 0;
  while (track[i + 1].frame <= frame) i++;
  const a = track[i];
  const b = track[i + 1];

  const p = (frame - a.frame) / (b.frame - a.frame);
  const eased = EASE[b.ease ?? "inOut"](p);
  return a.value + (b.value - a.value) * eased;
};

/** 把一组通道轨道在 frame 处全部采样成 Transform。 */
const sampleChannels = (
  tracks: ChannelTracks | undefined,
  frame: number,
): Transform => ({
  rotate: sampleTrack(tracks?.rotate, frame, 0),
  x: sampleTrack(tracks?.x, frame, 0),
  y: sampleTrack(tracks?.y, frame, 0),
  scaleX: sampleTrack(tracks?.scaleX, frame, 1),
  scaleY: sampleTrack(tracks?.scaleY, frame, 1),
});

/**
 * 计算第 frame 帧的完整姿态。
 *
 * 帧号处理：
 * - local = frame % duration：本部件「现在」在周期里的位置。
 * - lagged = max(0, frame − LAG) % duration：子部件延迟后的位置。
 *   注意是先在全局帧上减延迟、再取模，这样两个循环之间接缝连续，
 *   而每个场景的第 0 帧一定是静止姿态（delay 被 clamp 到 0）。
 *
 * 拖拽项（非 body 部件）：
 * - 旋转参考父级 body 自己的 rotate 轨道；
 * - 位移参考 root.y（整只鹅的上下运动）。
 * 取「延迟时刻的父级值 − 当前父级值」再乘 DRAG，父级往哪边走，
 * 子部件就先往反方向落后一点，随后自然追上。
 */
export const samplePose = (def: ActionDef, frame: number): Pose => {
  const { duration } = def;
  const local = frame % duration;
  const root = sampleChannels(def.root, local);

  const parts = {} as Record<Part, Transform>;
  for (const part of PARTS) {
    const lagged = Math.max(0, frame - LAG[part]) % duration;
    const own = sampleChannels(def.parts?.[part], lagged);

    if (part !== "body") {
      const drag = DRAG[part];
      // 父级（body）旋转的落后量
      const bodyRotNow = sampleChannels(def.parts?.body, local).rotate;
      const bodyRotThen = sampleChannels(def.parts?.body, lagged).rotate;
      own.rotate += drag * (bodyRotThen - bodyRotNow);
      // 整体上下位移的落后量（跳跃时头会比身体慢半拍）
      const rootYThen = sampleChannels(def.root, lagged).y;
      own.y += drag * (rootYThen - root.y);
    }

    parts[part] = own;
  }

  return { root, parts };
};

// ─────────────────────────── 输出 ───────────────────────────

/**
 * Transform → 可直接塞给 <div style> 的 CSS。
 * 所有层都 top:0 / left:0 叠放，靠 transformOrigin 指定各自支点。
 * transform 顺序 translate → rotate → scale：先绕支点转/缩，再整体挪。
 */
export const toCss = (
  tf: Transform,
  pivot: { x: number; y: number },
): React.CSSProperties => ({
  position: "absolute",
  top: 0,
  left: 0,
  transformOrigin: `${pivot.x}px ${pivot.y}px`,
  transform: `translate(${tf.x}px, ${tf.y}px) rotate(${tf.rotate}deg) scale(${tf.scaleX}, ${tf.scaleY})`,
});

// ─────────────────────────── 工具 ───────────────────────────

/** 右翅 = 左翅取反（角度镜像），帧号和 ease 保持不变。 */
export const mirror = (track: Track): Track =>
  track.map((k) => ({ ...k, value: -k.value }));

/**
 * 校验动作可无缝循环。每条轨道必须：
 * - 帧号严格递增
 * - 首帧 frame = 0，末帧 frame = duration
 * - 首值 = 末值（否则 frame % duration 回绕时会跳）
 * 在 actions.ts 模块加载时调用，写错立刻抛错，不进渲染。
 */
export const assertLoopable = (name: string, def: ActionDef): void => {
  const check = (owner: string, channel: string, track: Track) => {
    const where = `动作 "${name}" → ${owner}.${channel}`;
    if (track.length < 2) throw new Error(`${where}: 至少需要 2 个关键帧`);
    for (let i = 1; i < track.length; i++) {
      if (track[i].frame <= track[i - 1].frame) {
        throw new Error(`${where}: 第 ${i} 个关键帧的 frame 未严格递增`);
      }
    }
    if (track[0].frame !== 0) throw new Error(`${where}: 首帧 frame 必须为 0`);
    const last = track[track.length - 1];
    if (last.frame !== def.duration) {
      throw new Error(`${where}: 末帧 frame 必须等于 duration (${def.duration})`);
    }
    if (track[0].value !== last.value) {
      throw new Error(`${where}: 首值 (${track[0].value}) 必须等于末值 (${last.value})，否则循环会跳`);
    }
  };

  for (const [channel, track] of Object.entries(def.root ?? {})) {
    if (track) check("root", channel, track);
  }
  for (const [part, tracks] of Object.entries(def.parts ?? {})) {
    for (const [channel, track] of Object.entries(tracks ?? {})) {
      if (track) check(part, channel, track);
    }
  }
};
