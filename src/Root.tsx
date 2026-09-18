import "./index.css";
// src/Root.tsx
import { Composition, Folder } from "remotion";
import { HelloWorld } from "./HelloWorld";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="横屏">
        <Composition
          id="HelloWorld"
          component={HelloWorld}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Folder name="竖屏">
        <Composition
          id="HelloWorldVertical"
          component={HelloWorld}
          durationInFrames={450}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
    </>
  );
};
