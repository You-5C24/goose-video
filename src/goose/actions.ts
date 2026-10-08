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

/**
 * groove —— 踩点律动（30 帧 = 两拍，按 120 BPM 每拍 15 帧）
 * 每拍开头快速下沉压扁（out），拍内慢慢弹回；身体左右各摆一次，头反相，翅膀随拍微张。
 * 用作闪身步之间的「垫拍」。
 */
const grooveWing: Track = [k(0, 0), k(4, 6, "out"), k(15, 0), k(19, 6, "out"), k(30, 0)];
const groove: ActionDef = {
  duration: 30,
  root: {
    y: [k(0, 0), k(4, 12, "out"), k(15, 0), k(19, 12, "out"), k(30, 0)],
    scaleX: [k(0, 1), k(4, 1.04, "out"), k(15, 1), k(19, 1.04, "out"), k(30, 1)],
    scaleY: [k(0, 1), k(4, 0.96, "out"), k(15, 1), k(19, 0.96, "out"), k(30, 1)],
  },
  parts: {
    body: { rotate: [k(0, 0), k(8, -4), k(15, 0), k(23, 4), k(30, 0)] },
    head: { rotate: [k(0, 0), k(8, 5), k(15, 0), k(23, -5), k(30, 0)] },
    leftWing: { rotate: grooveWing },
    rightWing: { rotate: mirror(grooveWing) },
  },
};

/**
 * 闪身步的一拍分四个时间点（相对拍起点的帧）：
 *   anticipate 反向蓄力（往反方向挪一点、下蹲压扁、身体反向倾）
 *   arrive     闪到落点并过冲（横向拉长、身体顺着方向猛倾、翅膀甩开）
 *   settle     收回过冲（轻微回弹）
 *   beat       拍尾，站稳在落点
 * 从 anticipate 到 arrive 只有两三帧，配合 trail 残影就是「瞬移」的观感。
 */
type FlashTiming = { anticipate: number; arrive: number; settle: number; beat: number };

/** 闪身的横向幅度（px）。竖屏里鹅本身约 740px 宽，再大翅膀尖会出画。 */
const SHAN = 140;
/** 落点过冲（px）和反向蓄力（px）。 */
const SHAN_OVERSHOOT = 16;
const SHAN_WINDUP = 12;
/** 停在侧边时身体朝外倾的角度：在左侧往左倾，在右侧往右倾，中间站直。 */
const SHAN_HOLD_LEAN = 5;

/**
 * 按落点序列生成一整段闪身步。
 * path[0] 是起点，之后每个元素是一拍闪到的横向位置；首尾必须相同才能循环。
 * 每拍的关键帧形状相同，只是方向和落点不同，所以用函数展开而不是手抄几十行。
 */
const flashSteps = (path: number[], t: FlashTiming): ActionDef => {
  const lean = (x: number) => Math.sign(x) * SHAN_HOLD_LEAN;
  const x: Track = [k(0, path[0])];
  const y: Track = [k(0, 0)];
  const scaleX: Track = [k(0, 1)];
  const scaleY: Track = [k(0, 1)];
  const body: Track = [k(0, lean(path[0]))];
  const head: Track = [k(0, 0)];
  const wing: Track = [k(0, 0)];

  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const dir = Math.sign(to - from);
    const s = (i - 1) * t.beat;
    const [a, b, c, e] = [s + t.anticipate, s + t.arrive, s + t.settle, s + t.beat];

    x.push(k(a, from - dir * SHAN_WINDUP, "out"), k(b, to + dir * SHAN_OVERSHOOT, "out"), k(c, to, "out"), k(e, to));
    y.push(k(a, 10, "out"), k(b, -6, "out"), k(c, 0), k(e, 0));
    scaleX.push(k(a, 1.05, "out"), k(b, 1.1, "out"), k(c, 0.97), k(e, 1));
    scaleY.push(k(a, 0.95, "out"), k(b, 0.93, "out"), k(c, 1.03), k(e, 1));
    body.push(
      k(a, lean(from) - dir * 4, "out"),
      k(b, lean(from) + dir * 12, "out"),
      k(c, lean(to) - dir * 2),
      k(e, lean(to)),
    );
    // 头往运动反方向甩（被落下），回稳时略甩过头；引擎的 LAG 会再晚几帧，正好落在闪完之后
    head.push(k(a, 0), k(b, -dir * 8, "out"), k(c, dir * 3), k(e, 0));
    wing.push(k(a, -4, "in"), k(b, 10, "out"), k(c, 2), k(e, 0));
  }

  return {
    duration: (path.length - 1) * t.beat,
    trail: true,
    root: { x, y, scaleX, scaleY },
    parts: {
      body: { rotate: body },
      head: { rotate: head },
      leftWing: { rotate: wing },
      rightWing: { rotate: mirror(wing) },
    },
  };
};

/**
 * shanShen —— 闪身步（60 帧 = 四拍）
 * 每拍一闪：中 → 左 → 中 → 右 → 中。蓄力 4 帧，3 帧闪到，带残影。
 */
const shanShen = flashSteps([0, -SHAN, 0, SHAN, 0], {
  anticipate: 4,
  arrive: 7,
  settle: 11,
  beat: 15,
});

/**
 * lianShan —— 连闪（30 帧 = 两拍，每半拍一闪）
 * 中 → 左 → 右 → 左 → 中，左右之间直接横穿，残影拉得最长。
 */
const lianShan = flashSteps([0, -SHAN, SHAN, -SHAN, 0], {
  anticipate: 2,
  arrive: 4,
  settle: 6,
  beat: 7.5,
});

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
  groove,
  shanShen,
  lianShan,
} satisfies Record<string, ActionDef>;

export type ActionName = keyof typeof ACTIONS;

/** 供 zod 枚举和 Root.tsx 遍历预览用。 */
export const ACTION_NAMES = Object.keys(ACTIONS) as ActionName[];

// 模块加载即校验，写坏了立刻在 studio 里报错，不会渲染出会跳帧的片子。
for (const name of ACTION_NAMES) {
  assertLoopable(name, ACTIONS[name]);
}
