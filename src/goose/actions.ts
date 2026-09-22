/**
 * actions.ts —— 「这只鹅会做什么」
 *
 * 只放数据。每个动作是一组关键帧轨道，怎么插值 / 怎么跟随由 engine.ts 负责，
 * 部件名和支点由 rig.ts 负责。分镜（storyboard.ts）里的 action 字段就填这里的 key。
 *
 * 填表规则（engine.assertLoopable 会在加载时检查）：
 * - 每条轨道首帧 frame = 0、末帧 frame = duration、首值 = 末值 → 可无缝循环。
 * - 关键帧写法 k(frame, value, ease?)；ease 描述「到达本帧」那一段的缓动，
 *   不写默认 inOut。常用：起跳 / 张开用 "out"（先快后慢），下落 / 回收用 "in"，
 *   到位带弹性用 "back"。
 * - 角度：CSS 正角度 = 顺时针。leftWing 正 = 向外张开；rightWing 用 mirror() 取反。
 * - 位移 y：正数向下。
 * - root 的 scaleX / scaleY 绕脚底缩放（见 rig.FOOT），压扁 = scaleX>1 且 scaleY<1。
 */
import {
  assertLoopable,
  mirror,
  type ActionDef,
  type Ease,
  type Keyframe,
  type Track,
} from "./engine";

/** 关键帧简写。 */
const k = (frame: number, value: number, ease?: Ease): Keyframe =>
  ease ? { frame, value, ease } : { frame, value };

// ─────────────────────────── 动作库 ───────────────────────────

/**
 * idle —— 站着呼吸（120 帧）
 * 整体轻微上下起伏当呼吸，身体极小幅摇摆，头独立微动，翅膀几乎不动。
 * 头和翅膀的跟随拖拽由引擎自动叠加。
 */
const idleWing: Track = [k(0, 0), k(60, -1.5), k(120, 0)];
const idle: ActionDef = {
  duration: 120,
  root: {
    y: [k(0, 0), k(60, -6), k(120, 0)],
  },
  parts: {
    body: { rotate: [k(0, 0), k(60, 1.5), k(120, 0)] },
    head: { rotate: [k(0, 0), k(40, -2), k(85, 1), k(120, 0)] },
    leftWing: { rotate: idleWing },
    rightWing: { rotate: mirror(idleWing) },
  },
};

/**
 * flap —— 拍一下翅膀（60 帧）
 * 先小幅内收蓄力（预备），再快速向外张到 35°，回收时略过冲到内侧再归零。
 * 身体在下拍瞬间被带起 18px，并有一点反向倾斜。
 */
const flapWing: Track = [
  k(0, 0),
  k(6, -4, "in"), // 预备：先往里收一点
  k(18, 35, "out"), // 张开：先快后慢
  k(34, -4), // 回收并过冲到内侧
  k(60, 0),
];
const flap: ActionDef = {
  duration: 60,
  root: {
    y: [k(0, 0), k(6, 4, "in"), k(18, -18, "out"), k(40, 0), k(60, 0)],
  },
  parts: {
    body: { rotate: [k(0, 0), k(18, -2), k(40, 1), k(60, 0)] },
    leftWing: { rotate: flapWing },
    rightWing: { rotate: mirror(flapWing) },
  },
};

/**
 * headTilt —— 歪头（90 帧）
 * 先反向预备 3°，再用 back 缓动过冲到 14° 停住，最后缓缓摆回。
 * 身体顺着头的方向微倾 2°。
 */
const headTilt: ActionDef = {
  duration: 90,
  parts: {
    head: {
      rotate: [
        k(0, 0),
        k(8, -3, "in"), // 反向预备
        k(26, 14, "back"), // 过冲到位
        k(60, 14), // 停住
        k(90, 0),
      ],
    },
    body: { rotate: [k(0, 0), k(26, 2), k(60, 2), k(90, 0)] },
  },
};

/**
 * shakeHead —— 摇头（90 帧）
 * 头做幅度递减的左右振荡（−14 → 14 → −10 → 8 → −4 → 2 → 0），
 * 身体做反相的小幅补偿，让重心看起来在动。
 */
const shakeHead: ActionDef = {
  duration: 90,
  parts: {
    head: {
      rotate: [
        k(0, 0),
        k(10, -14, "out"),
        k(24, 14),
        k(38, -10),
        k(50, 8),
        k(62, -4),
        k(72, 2),
        k(90, 0),
      ],
    },
    body: {
      rotate: [k(0, 0), k(10, 2), k(24, -2), k(38, 1), k(50, -1), k(70, 0), k(90, 0)],
    },
  },
};

/**
 * dance —— 四拍蹦跳舞（120 帧，每拍 30 帧）
 * 每拍：落地（压扁 scaleX 1.05 / scaleY 0.95）→ 腾空 30px（拉长 0.97 / 1.03）→ 落地。
 * 起跳用 out、落地用 in，模拟重力。身体左右交替摆 8°，头反相 4°，翅膀在最高点张开 12°。
 */
const danceWing: Track = [
  k(0, 0),
  k(15, 12, "out"),
  k(30, 0, "in"),
  k(45, 12, "out"),
  k(60, 0, "in"),
  k(75, 12, "out"),
  k(90, 0, "in"),
  k(105, 12, "out"),
  k(120, 0, "in"),
];
const dance: ActionDef = {
  duration: 120,
  root: {
    y: [
      k(0, 0),
      k(15, -30, "out"),
      k(30, 0, "in"),
      k(45, -30, "out"),
      k(60, 0, "in"),
      k(75, -30, "out"),
      k(90, 0, "in"),
      k(105, -30, "out"),
      k(120, 0, "in"),
    ],
    // 落地压扁、腾空拉长；首末都在落地态，所以首值 = 末值 = 压扁
    scaleX: [
      k(0, 1.05),
      k(15, 0.97),
      k(30, 1.05),
      k(45, 0.97),
      k(60, 1.05),
      k(75, 0.97),
      k(90, 1.05),
      k(105, 0.97),
      k(120, 1.05),
    ],
    scaleY: [
      k(0, 0.95),
      k(15, 1.03),
      k(30, 0.95),
      k(45, 1.03),
      k(60, 0.95),
      k(75, 1.03),
      k(90, 0.95),
      k(105, 1.03),
      k(120, 0.95),
    ],
  },
  parts: {
    body: {
      rotate: [
        k(0, 0),
        k(15, -8),
        k(30, 0),
        k(45, 8),
        k(60, 0),
        k(75, -8),
        k(90, 0),
        k(105, 8),
        k(120, 0),
      ],
    },
    head: {
      rotate: [
        k(0, 0),
        k(15, 4),
        k(30, 0),
        k(45, -4),
        k(60, 0),
        k(75, 4),
        k(90, 0),
        k(105, -4),
        k(120, 0),
      ],
    },
    leftWing: { rotate: danceWing },
    rightWing: { rotate: mirror(danceWing) },
  },
};

/**
 * jump —— 一次完整跳跃（72 帧）
 * 时间线：0–10 静止 → 10–18 下蹲蓄力（下移 30px、压扁 1.10/0.88）
 * → 18–36 起跳到最高点 −260px（离地瞬间拉长 0.94/1.08，最高点恢复 1/1）
 * → 36–50 下落（临落地略拉长）→ 50–52 落地重压扁 1.12/0.86 → 60 回弹 → 72 归位。
 * 翅膀在起跳时向外扬 25°，身体前后微倾。头的滞后感由引擎 DRAG 自动产生。
 */
const jumpWing: Track = [
  k(0, 0),
  k(10, 0),
  k(18, -6, "in"), // 下蹲时翅膀略收
  k(30, 25, "out"), // 起跳扬翅
  k(50, 0),
  k(72, 0),
];
const jump: ActionDef = {
  duration: 72,
  root: {
    y: [
      k(0, 0),
      k(10, 0),
      k(18, 30, "in"), // 下蹲
      k(36, -260, "out"), // 最高点
      k(50, 0, "in"), // 落地
      k(72, 0),
    ],
    scaleX: [
      k(0, 1),
      k(10, 1),
      k(18, 1.1), // 蹲：横向变宽
      k(28, 0.94), // 离地：拉长变窄
      k(36, 1),
      k(46, 0.96), // 临落地略拉长
      k(52, 1.12), // 落地重压扁
      k(60, 0.98), // 回弹
      k(72, 1),
    ],
    scaleY: [
      k(0, 1),
      k(10, 1),
      k(18, 0.88),
      k(28, 1.08),
      k(36, 1),
      k(46, 1.04),
      k(52, 0.86),
      k(60, 1.02),
      k(72, 1),
    ],
  },
  parts: {
    body: { rotate: [k(0, 0), k(18, 3), k(36, -2), k(52, 2), k(72, 0)] },
    leftWing: { rotate: jumpWing },
    rightWing: { rotate: mirror(jumpWing) },
  },
};

/**
 * waddle —— 单向晃动走（120 帧）
 * 从画面偏左平移到偏右；晃是身体左右倾 + 轻微起伏，不是迈步。
 * 单向净位移，所以 loopable: false，不能无缝循环。
 */
const waddleWing: Track = [
  k(0, 0),
  k(15, 8, "out"),
  k(30, 0, "in"),
  k(45, 8, "out"),
  k(60, 0, "in"),
  k(75, 8, "out"),
  k(90, 0, "in"),
  k(105, 8, "out"),
  k(120, 0, "in"),
];
const waddle: ActionDef = {
  duration: 120,
  loopable: false,
  root: {
    x: [k(0, -360), k(120, 360, "linear")],
    y: [
      k(0, 0),
      k(15, 8, "in"),
      k(30, 0, "out"),
      k(45, 8, "in"),
      k(60, 0, "out"),
      k(75, 8, "in"),
      k(90, 0, "out"),
      k(105, 8, "in"),
      k(120, 0, "out"),
    ],
  },
  parts: {
    body: {
      rotate: [
        k(0, 0),
        k(15, -8),
        k(30, 0),
        k(45, 8),
        k(60, 0),
        k(75, -8),
        k(90, 0),
        k(105, 8),
        k(120, 0),
      ],
    },
    head: {
      rotate: [
        k(0, 0),
        k(15, 4),
        k(30, 0),
        k(45, -4),
        k(60, 0),
        k(75, 4),
        k(90, 0),
        k(105, -4),
        k(120, 0),
      ],
    },
    leftWing: { rotate: waddleWing },
    rightWing: { rotate: mirror(waddleWing) },
  },
};

// ─────────────────────────── 导出 ───────────────────────────

/**
 * 用 satisfies 而不是 Record<string, ActionDef> 标注：
 * 这样 key 仍是字面量类型，ActionName 能自动从这里推导，加新动作不用改别处。
 */
export const ACTIONS = {
  idle,
  flap,
  headTilt,
  shakeHead,
  dance,
  jump,
  waddle,
} satisfies Record<string, ActionDef>;

export type ActionName = keyof typeof ACTIONS;

/** 供 zod 枚举和 Root.tsx 遍历预览用。 */
export const ACTION_NAMES = Object.keys(ACTIONS) as ActionName[];

// 模块加载即校验，写坏了立刻在 studio 里报错，不会渲染出会跳帧的片子。
for (const name of ACTION_NAMES) {
  assertLoopable(name, ACTIONS[name]);
}
