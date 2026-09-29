import Hud from "@/components/Hud";
import Loader from "@/components/Loader";
import Overlay from "@/components/Overlay";
import SmoothScroll from "@/components/SmoothScroll";
import SceneClient from "@/components/three/SceneClient";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <SceneClient />
      <main>
        <Overlay />
      </main>
      <Hud />
      <Loader />
    </>
  );
}
