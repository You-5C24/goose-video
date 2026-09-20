// src/types.ts
export type CaptionLine = {
  text: string;
  startMs: number; // 相对它所在时间轴
  endMs: number;
};

export type ShortVideoProps = {
  title: string;
  captions: CaptionLine[];
};
