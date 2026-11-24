import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkFrames } from "./check-frames.mjs";
import { writeScore } from "./score.mjs";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const route = JSON.parse(readFileSync(path("src/screens.json"), "utf8"));
writeScore(path("public/score.wav"), route.steps, route.durationInFrames, route.fps);
const localChrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browserExecutable =
  process.env.REMOTION_BROWSER_EXECUTABLE ||
  (existsSync(localChrome) ? localChrome : undefined);
const serveUrl = await bundle({
  entryPoint: path("src/index.jsx"),
  publicDir: path("public"),
});
const settings = {
  serveUrl,
  browserExecutable,
  chromiumOptions: { gl: "swangle" },
};
const composition = await selectComposition({
  ...settings,
  id: "OrderToPayment",
});
mkdirSync(path("../site/video"), { recursive: true });
const poster = await selectComposition({ ...settings, id: "OverviewPoster" });
const temp = mkdtempSync(join(tmpdir(), "zakazpotok-film-"));
const coverFile = join(temp, "overview-poster.jpg");
const videoFile = join(temp, "overview.mp4");
try {
  await renderStill({
    ...settings,
    composition: poster,
    imageFormat: "jpeg",
    jpegQuality: 92,
    output: coverFile,
  });
  await renderMedia({
    ...settings,
    composition,
    imageFormat: "png",
    codec: "h264",
    pixelFormat: "yuv420p",
    audioCodec: "aac",
    audioBitrate: "192k",
    sampleRate: 48000,
    disableSharedMemoryCapture: true,
    crf: 18,
    x264Preset: "fast",
    concurrency: 1,
    outputLocation: videoFile,
    onStart: () => console.log("Rendering", composition.durationInFrames, "frames"),
  });
  checkFrames(videoFile, coverFile, composition.durationInFrames);
  copyFileSync(coverFile, path("../site/video/overview-poster.jpg"));
  copyFileSync(videoFile, path("../site/video/overview.mp4"));
  console.log("Video and poster verified.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
