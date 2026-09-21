# AGENTS.md

Remotion 竖屏短片（1080×1920 @30fps）。主角是一只用四层 PNG 拼出来的大鹅，
靠关键帧动作库驱动。本文件是给 AI 协作者和新同事的项目约定，改代码前先读完。

## 命令

| 目的                         | 命令                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| 打开 studio 预览             | `npm run dev`                                              |
| 类型 + lint 检查（改完必跑） | `npm run lint`                                             |
| 渲染单帧看效果               | `npx remotion still <CompositionId> --frame=<n> <out.png>` |
| 渲染成片                     | `npx remotion render GooseShort out/goose.mp4`             |

Composition 列表：`GooseShort`（成片）和 `Action-<name>`（每个动作两个周期的预览，用来调参和检查循环接缝）。

## 目录职责

```
src/
  goose/rig.ts       这只鹅长什么样：部件名、支点、父子层级、图路径、构图常量、跟随参数
  goose/engine.ts    怎么算每帧姿态：关键帧类型、easing、采样、层级跟随/拖拽、CSS 转换、循环校验
  goose/actions.ts   它会做什么：6 个动作的关键帧数据（只放数据）
  goose/Goose.tsx    纯渲染：把 pose 套到四层 div 上，不做计算
  schema.ts          分镜 zod 校验；sceneFrames() 把 loops 换算成帧数
  storyboard.ts      分镜数据：每场景 = 文案 + 动作 + 循环次数
  ShortVideo.tsx     按分镜串场景，fade 转场
  Root.tsx           注册成片 + 每动作预览 Composition
  fonts.ts index.css 字幕预留，本轮未接线，不要删
public/goose/        四张分层图 + 母图，不要改
```

## 不变量（改任何东西前先对照）

- 四层图由母图同原点裁切，全部 `top:0 / left:0` 叠放即对齐。body/head 1254px，翅膀 1250px，差的 4px 在尾部，无影响。
- 所有坐标、支点、构图偏移只在 `rig.ts`。组件和动作里不得出现裸数字坐标。
- 层级：root（平移 + 绕脚底缩放）→ body（旋转）→ head / leftWing / rightWing（各绕自己支点旋转，嵌在 body 内）。
- 每条动作轨道：首帧 frame = 0，末帧 frame = duration，首值 = 末值。`engine.assertLoopable` 在模块加载时强制检查，不满足直接抛错。
- 场景时长 = 动作周期 × loops，由 `schema.sceneFrames` 计算；分镜不填帧数。这是「切场时动作收尾归零」的保证。
- 角度约定：CSS 正角度 = 顺时针；leftWing 正角度 = 向外张开；rightWing 轨道一律 `mirror(leftWing 轨道)`，不要手写。
- 位移 y 正数向下；squash = scaleX > 1 且 scaleY < 1，缩放支点是脚底 `rig.FOOT`。
- 子部件的跟随延迟（`rig.LAG`）和拖拽（`rig.DRAG`）由引擎自动叠加，动作里不需要手工错相位。

## 不要做

- 不改 `public/goose/*` 里的图；要换图先重新量支点和包围盒并同步 `rig.ts`。
- 不在 `Goose.tsx` / `actions.ts` 里写魔法数字坐标。
- 不删 `fonts.ts`、`index.css`、`storyboard.text` 字段——字幕后续要接。
- 不把上一轮对话里的临时指令留成代码注释（例如「用你原来的值」）。注释只描述代码现在是什么、为什么。

## 调动作的流程

1. `npm run dev`，打开 `Action-<name>` Composition 看两个周期。
2. 改 `actions.ts` 里对应动作的关键帧（或 `rig.ts` 里的 LAG / DRAG）。
3. studio 报 `assertLoopable` 错误就按提示修（首末帧 / 首末值 / 递增）。
4. `npm run lint` 过了再提交。

## 加新动作

在 `actions.ts` 里新增一个 `ActionDef` 并加入 `ACTIONS`。`ActionName`、zod 枚举、Root 里的预览 Composition 都会自动跟上，不需要改别处。
