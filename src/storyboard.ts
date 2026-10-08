import { storyboardSchema, type Storyboard } from "./schema";

/**
 * 分镜：每个场景 = 一句文案 + 一个动作 + 循环次数。
 * 不填帧数；时长由 schema.sceneFrames 按动作周期算出，保证切场时动作收尾归零。
 */
const raw = {
  scenes: [
    { text: "又抢我饭团", action: "dance", loops: 1 }, // 120 帧
    { text: "算了，躺平", action: "idle", loops: 1 }, // 120 帧
    { text: "谁在叫我", action: "headTilt", loops: 1 }, // 90 帧
  ],
};

// 在数据入口就验。不合格 → 直接报错，片子不渲。
export const storyboard: Storyboard = storyboardSchema.parse(raw);

/**
 * 闪身步 30 秒（900 帧，120 BPM，每拍 15 帧）。
 * 全部硬切：每段都是整周期、首尾回到站中间，切场无缝。
 */
const shanShenRaw = {
  transitionFrames: 0,
  scenes: [
    { text: "准备", action: "groove", loops: 2 }, // 60 帧，0:00–0:02
    { text: "闪身步", action: "shanShen", loops: 4 }, // 240 帧，0:02–0:10
    { text: "垫一拍", action: "groove", loops: 1 }, // 30 帧，0:10–0:11
    { text: "加速", action: "lianShan", loops: 4 }, // 120 帧，0:11–0:15
    { text: "稳住", action: "shanShen", loops: 2 }, // 120 帧，0:15–0:19
    { text: "扑棱", action: "flap", loops: 1 }, // 60 帧，0:19–0:21
    { text: "再闪", action: "lianShan", loops: 2 }, // 60 帧，0:21–0:23
    { text: "闪", action: "shanShen", loops: 1 }, // 60 帧，0:23–0:25
    { text: "连闪", action: "lianShan", loops: 2 }, // 60 帧，0:25–0:27
    { text: "学会了吗", action: "headTilt", loops: 1 }, // 90 帧，0:27–0:30
  ],
};

export const shanShenStoryboard: Storyboard = storyboardSchema.parse(shanShenRaw);
