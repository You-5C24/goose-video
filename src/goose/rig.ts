/**
 * rig.ts —— 「这只鹅长什么样」
 *
 * 这里只放静态描述：有哪些部件、每个部件绕哪转、谁挂在谁身上、图在哪、
 * 以及把它摆到画布上要平移多少。所有坐标和魔法数字都集中在此，
 * 组件（Goose.tsx）和动作库（actions.ts）里不得再出现裸数字。
 *
 * 坐标系约定
 * ----------
 * - 四张分层图（body / head / wing-left / wing-right）由同一张母图
 *   goose-master.png 同原点裁切而来，body/head 为 1254×1254，两张翅膀为
 *   1250×1250（只是尾部少 4px），所以全部按 top:0 / left:0 叠放即对齐。
 * - 下面所有 x / y 都是「图内像素坐标」（左上角为原点），不是画布坐标。
 * - CSS rotate 正角度 = 顺时针。对 leftWing 来说，正角度 = 翅膀向外张开；
 *   rightWing 的轨道一律用 engine.mirror(leftWing 轨道) 取反得到，不要手写。
 */

/** 部件名元组。用 as const 派生出字面量类型 Part，让 PIVOTS / LAYERS / tracks 的 key 都受约束。 */
export const PARTS = ["body", "head", "leftWing", "rightWing"] as const;
export type Part = (typeof PARTS)[number];

/** body / head 的实际尺寸；根容器按这个尺寸开框，翅膀图小 4px 不影响。 */
export const IMAGE_SIZE = 1254;

/** 每层用的图，路径相对 public/，交给 staticFile()。 */
export const LAYERS: Record<Part, string> = {
  body: "goose/body.png",
  head: "goose/head.png",
  leftWing: "goose/wing-left.png",
  rightWing: "goose/wing-right.png",
};

/**
 * 每个部件的旋转支点（图内坐标）。
 * - body：胸腹中部偏下，身体左右摇摆时脚不会滑。
 * - head：颈根，头点/摇时脖子从这里弯。
 * - leftWing / rightWing：翅根（肩）。
 */
export const PIVOTS: Record<Part, { x: number; y: number }> = {
  body: { x: 625, y: 800 },
  head: { x: 640, y: 507 },
  leftWing: { x: 470, y: 512 },
  rightWing: { x: 780, y: 512 },
};

/**
 * 父子关系：决定 DOM 嵌套（父转子随）和引擎里「跟随拖拽」的参考对象。
 * body 是根部件，其余三个都挂在 body 上。
 */
export const PARENT: Record<Part, Part | null> = {
  body: null,
  head: "body",
  leftWing: "body",
  rightWing: "body",
};

/** body 内部子层的绘制顺序（先画的在下）。 */
export const CHILD_ORDER: readonly Part[] = ["head", "leftWing", "rightWing"];

/**
 * 跟随延迟（帧）：子部件比父级晚几帧到位，模拟「身体先动、脖子/翅膀后到」。
 * body 是根，永远 0。
 */
export const LAG: Record<Part, number> = {
  body: 0,
  head: 3,
  leftWing: 2,
  rightWing: 2,
};

/**
 * 拖拽系数（0~1）：父级在 LAG 帧内转了多少 / 挪了多少，子部件就反向「落后」多少比例。
 * 0 = 完全刚性跟随；越大越软。body 是根，永远 0。
 */
export const DRAG: Record<Part, number> = {
  body: 0,
  head: 0.5,
  leftWing: 0.35,
  rightWing: 0.35,
};

/**
 * 脚底（图内坐标）：整只鹅做 squash / stretch 时的缩放支点。
 * 用脚底而不是图中心，是为了压扁时脚踩在地上不飘。
 * 数值来自 sharp 量出的 alpha 包围盒：x 273~1010（中心 642），y 底边 1149。
 */
export const FOOT = { x: 642, y: 1149 };

/** 竖屏画布尺寸，和 Root.tsx 里的 Composition 保持一致。 */
export const CANVAS = { width: 1080, height: 1920 };

/** 希望脚底落在画布的哪一行：约 85% 高度，上方留 ~560px 给以后的字幕。 */
export const FEET_Y_ON_CANVAS = 1640;

/**
 * 把图内坐标搬到画布上的根平移。
 * - x：让大鹅包围盒中心（642）对齐画布中线（540）→ 540 − 642 = −102
 * - y：让脚底（1149）落到 FEET_Y_ON_CANVAS（1640）→ 1640 − 1149 = 491
 */
export const ROOT_OFFSET = {
  x: CANVAS.width / 2 - FOOT.x,
  y: FEET_Y_ON_CANVAS - FOOT.y,
};
