/**
 * scripts/cut-body.mjs —— 从 body.png 里抠掉两只翅膀，并补出躯干描边
 *
 * 背景
 * ----
 * 原始 body.png 是母图去掉头之后的整块，两只翅膀只擦了黑描边、白色填充还在。
 * 翅膀层一旦转出去，身体层上那两块白翅膀形状就露出来 → 「4 只翅膀」。
 * 而且母图里翅膀底下从来没画过躯干，光擦掉填充会留下一块没有描边的白。
 *
 * 做法（全部基于像素蒙版，不依赖任何手绘）
 * ----
 * 1. bodyMask = body.png 不透明区；wingMask = wing-left ∪ wing-right 不透明区。
 * 2. strip = bodyMask − wingMask：两翅之间露出来的那条躯干（很窄）。
 * 3. torso = dilate(strip, EXTEND) ∩ bodyMask：把窄条往翅膀底下各扩 EXTEND 像素，
 *    得到一个「藏在翅膀下面的完整躯干」。翅膀合拢时完全被盖住，张开时露出来的
 *    就是这个躯干，边缘形状自然跟随翅膀内缘。
 * 4. stroke = torso 内侧 STROKE 像素宽的一圈 ∩ wingMask：只给「原本被翅膀盖住、
 *    现在新暴露」的边加黑描边，不碰母图已有的线。
 * 5. 蒙版轻微高斯模糊做抗锯齿，写回 body.png。
 *
 * 幂等：第一次运行把原图备份到 body.orig.png；之后都从备份读，改参数重跑不会叠加。
 *
 * 用法：node scripts/cut-body.mjs
 * 调参：改下面的 EXTEND / STROKE。
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// ─────────────────────────── 参数 ───────────────────────────

/** 躯干从两翅间的窄条往翅膀底下扩多少像素。越大身子越胖。 */
const EXTEND = 100;
/**
 * 翅膀蒙版先膨胀多少像素再去减身体。
 * 原 body.png 里翅膀的黑描边被涂成了白色，所以白色填充比 wing-*.png 大一圈（≈8px）；
 * 不吞掉这圈，它会被当成躯干再往外扩，产生环形和毛刺。
 */
const WING_PAD = 12;
/**
 * 对「两翅之间的窄条」做开运算（先腐蚀再膨胀）的半径。
 * 翅膀底部羽毛缺口之间、肩头拐角处会漏出一些几十像素宽的白色碎条，
 * 它们不是躯干，但会被 EXTEND 放大成突起。宽度小于 2×OPEN 的碎条会被滤掉；
 * 躯干主干（≈230px 宽）和脚（≈100px 宽）不受影响。
 */
const OPEN = 20;
/**
 * 躯干最终形状在翅膀覆盖区内再做一次开运算的半径，抹掉扩张时带进来的羽毛尖等小突起。
 * 只作用于翅膀蒙版内部，脚和两翅之间的原始区域保持原样。
 */
const SMOOTH = 30;
/** 新描边宽度（像素）。母图手绘线约 6~8px。 */
const STROKE = 7;
/** alpha 超过这个值算「不透明」。 */
const ALPHA_ON = 128;
/** 抗锯齿模糊 sigma。 */
const AA_SIGMA = 0.7;

const DIR = path.resolve("public/goose");
const SRC_BACKUP = path.join(DIR, "body.orig.png");
const OUT = path.join(DIR, "body.png");
const SIZE = 1254; // body/head 尺寸；翅膀 1250，同原点，补边到 1254

// ─────────────────────────── 读图 ───────────────────────────

/** 读成 SIZE×SIZE 的 RGBA 原始像素（小图右下补透明边，原点不变）。 */
const readRGBA = async (file) => {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .extend({
      top: 0,
      left: 0,
      bottom: SIZE - (await sharp(file).metadata()).height,
      right: SIZE - (await sharp(file).metadata()).width,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== SIZE || info.height !== SIZE) {
    throw new Error(`${file} 尺寸不是 ${SIZE}: ${info.width}x${info.height}`);
  }
  return data;
};

/** RGBA → 二值蒙版（Uint8Array，1 = 不透明）。 */
const toMask = (rgba) => {
  const m = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) m[i] = rgba[i * 4 + 3] > ALPHA_ON ? 1 : 0;
  return m;
};

// ─────────────────────────── 距离变换 ───────────────────────────

/**
 * Chamfer 3-4 距离变换：每个像素到「最近的 mask=1 像素」的近似欧氏距离。
 * 返回 Float32Array，单位像素。两遍扫描，O(N)。
 * 用它来做膨胀（dist ≤ r）和腐蚀（对取反蒙版做同样计算）。
 */
const distanceTo = (mask) => {
  const INF = 1e9;
  const d = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF;

  const at = (x, y) => y * SIZE + x;
  // 正向：左上 → 右下
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = at(x, y);
      if (d[i] === 0) continue;
      let best = d[i];
      if (x > 0) best = Math.min(best, d[at(x - 1, y)] + 3);
      if (y > 0) {
        best = Math.min(best, d[at(x, y - 1)] + 3);
        if (x > 0) best = Math.min(best, d[at(x - 1, y - 1)] + 4);
        if (x < SIZE - 1) best = Math.min(best, d[at(x + 1, y - 1)] + 4);
      }
      d[i] = best;
    }
  }
  // 反向：右下 → 左上
  for (let y = SIZE - 1; y >= 0; y--) {
    for (let x = SIZE - 1; x >= 0; x--) {
      const i = at(x, y);
      if (d[i] === 0) continue;
      let best = d[i];
      if (x < SIZE - 1) best = Math.min(best, d[at(x + 1, y)] + 3);
      if (y < SIZE - 1) {
        best = Math.min(best, d[at(x, y + 1)] + 3);
        if (x < SIZE - 1) best = Math.min(best, d[at(x + 1, y + 1)] + 4);
        if (x > 0) best = Math.min(best, d[at(x - 1, y + 1)] + 4);
      }
      d[i] = best;
    }
  }
  // chamfer 3-4 里水平/垂直一步 = 3，换算回像素
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
};

/** 蒙版取反。 */
const invert = (mask) => mask.map((v) => (v ? 0 : 1));

/** 二值蒙版 → 轻微模糊后的 0~1 软蒙版（抗锯齿）。 */
const soften = async (mask) => {
  const gray = Buffer.alloc(SIZE * SIZE);
  for (let i = 0; i < mask.length; i++) gray[i] = mask[i] ? 255 : 0;
  // 注意：sharp 对单通道 raw 做 blur 后可能升成 3 通道输出，必须按实际 channels 取步长
  const { data, info } = await sharp(gray, {
    raw: { width: SIZE, height: SIZE, channels: 1 },
  })
    .blur(AA_SIGMA)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const stride = info.channels;
  const f = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < f.length; i++) f[i] = data[i * stride] / 255;
  return f;
};

// ─────────────────────────── 主流程 ───────────────────────────

const main = async () => {
  // 0. 备份 / 选源：始终从原图重算，保证幂等
  if (!fs.existsSync(SRC_BACKUP)) {
    fs.copyFileSync(OUT, SRC_BACKUP);
    console.log(`已备份原图 → ${path.relative(process.cwd(), SRC_BACKUP)}`);
  }
  const body = await readRGBA(SRC_BACKUP);
  const wingL = await readRGBA(path.join(DIR, "wing-left.png"));
  const wingR = await readRGBA(path.join(DIR, "wing-right.png"));

  // 1. 蒙版
  const bodyMask = toMask(body);
  const mL = toMask(wingL);
  const mR = toMask(wingR);
  const wingRaw = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < wingRaw.length; i++) wingRaw[i] = mL[i] | mR[i];
  // 膨胀 WING_PAD 像素，吞掉 body.png 里比翅膀 PNG 多出来的那圈白边
  const dWing = distanceTo(wingRaw);
  const wingMask = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < wingMask.length; i++) wingMask[i] = dWing[i] <= WING_PAD ? 1 : 0;

  // 2. 两翅之间露出来的窄条躯干
  const stripRaw = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < stripRaw.length; i++) stripRaw[i] = bodyMask[i] && !wingMask[i] ? 1 : 0;

  // 2b. 开运算：腐蚀 OPEN → 膨胀 OPEN，去掉细碎白条
  const dToOutsideStrip = distanceTo(invert(stripRaw));
  const eroded = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < eroded.length; i++) eroded[i] = dToOutsideStrip[i] > OPEN ? 1 : 0;
  const dEroded = distanceTo(eroded);
  const strip = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < strip.length; i++) strip[i] = stripRaw[i] && dEroded[i] <= OPEN ? 1 : 0;

  // 3. 往翅膀底下扩 EXTEND 像素，得到完整躯干（仍限制在原身体轮廓内）
  const dStrip = distanceTo(strip);
  const torsoRaw = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < torsoRaw.length; i++) torsoRaw[i] = bodyMask[i] && dStrip[i] <= EXTEND ? 1 : 0;

  // 3b. 翅膀覆盖区内再开运算一次，抹掉扩张带进来的羽毛尖；翅膀区外原样保留
  const dOutTorso = distanceTo(invert(torsoRaw));
  const torsoEroded = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < torsoEroded.length; i++) torsoEroded[i] = dOutTorso[i] > SMOOTH ? 1 : 0;
  const dTorsoEroded = distanceTo(torsoEroded);
  const torso = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < torso.length; i++) {
    torso[i] = torsoRaw[i] && (!wingMask[i] || dTorsoEroded[i] <= SMOOTH) ? 1 : 0;
  }

  // 4. 躯干内侧一圈作为新描边，但只保留原本被翅膀盖住的部分
  const dOutside = distanceTo(invert(torso)); // 到「躯干外」的距离 = 离边缘多远
  const stroke = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < stroke.length; i++) {
    stroke[i] = torso[i] && dOutside[i] <= STROKE && wingMask[i] ? 1 : 0;
  }

  // 5. 抗锯齿并合成
  const torsoSoft = await soften(torso);
  const strokeSoft = await soften(stroke);
  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const o = i * 4;
    const s = strokeSoft[i];
    // 颜色：向黑色混合 s 比例
    out[o] = Math.round(body[o] * (1 - s));
    out[o + 1] = Math.round(body[o + 1] * (1 - s));
    out[o + 2] = Math.round(body[o + 2] * (1 - s));
    // 透明度：原 alpha × 躯干软蒙版
    out[o + 3] = Math.round(body[o + 3] * torsoSoft[i]);
  }
  await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .png()
    .toFile(OUT);

  // 统计输出，方便对照
  let keep = 0;
  for (let i = 0; i < torso.length; i++) keep += torso[i];
  console.log(`写入 ${path.relative(process.cwd(), OUT)}`);
  console.log(`参数 EXTEND=${EXTEND} STROKE=${STROKE} WING_PAD=${WING_PAD} OPEN=${OPEN} SMOOTH=${SMOOTH}；躯干像素 ${keep}，原身体像素 ${bodyMask.reduce((a, b) => a + b, 0)}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
