/**
 * schema.ts —— 分镜数据的校验与派生
 *
 * 分镜里每个场景只填「做什么动作」和「循环几次」，不填帧数。
 * 场景时长 = 动作周期 × loops，由 sceneFrames() 算出，
 * 这样每个场景一定在动作的整周期结束，切场时姿态干净归零。
 */
import { z } from "zod";
import { ACTIONS, ACTION_NAMES, type ActionName } from "./goose/actions";

/**
 * 动作枚举从 ACTIONS 的 key 推导，不手写。
 * 以后往动作库加一个动作，这里自动跟上，不会漏。
 */
export const actionSchema = z.enum(ACTION_NAMES as [ActionName, ...ActionName[]]);

export const sceneSchema = z.object({
  /** 字幕文案（本轮不渲染，为后续字幕预留） */
  text: z.string().min(1),
  action: actionSchema,
  /** 该动作循环几遍，默认 1；场景帧数 = 周期 × loops */
  loops: z.number().int().positive().default(1),
});

export const storyboardSchema = z.object({
  scenes: z.array(sceneSchema).min(1),
});

// 用 z.output 而不是 z.infer：loops 有 default，解析后一定存在
export type Scene = z.output<typeof sceneSchema>;
export type Storyboard = z.output<typeof storyboardSchema>;

/** 一个场景实际占多少帧。 */
export const sceneFrames = (scene: Scene): number =>
  ACTIONS[scene.action].duration * scene.loops;
