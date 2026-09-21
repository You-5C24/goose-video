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
