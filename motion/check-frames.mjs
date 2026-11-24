import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { RenderInternals } from "@remotion/renderer";

const ffmpeg = RenderInternals.getExecutablePath({
  type: "ffmpeg", indent: false, logLevel: "error", binariesDirectory: null,
});

function decode(input, filter, single = false) {
  return execFileSync(ffmpeg, [
    "-v", "error", "-i", input, "-an", "-vf", filter,
    ...(single ? ["-frames:v", "1"] : []),
    "-pix_fmt", "gray", "-c:v", "rawvideo", "-f", "image2pipe", "-",
  ], { cwd: dirname(ffmpeg), maxBuffer: 16 * 1024 * 1024 });
}

export function checkFrames(video, poster, count) {
  // The real wordmark is at the left. Chrome's repeated compositor tiles
  // stamp a second identical wordmark into the empty middle of the header.
  const width = 320, stripSize = width * 16;
  const strip = decode(video, "scale=400:225,crop=320:16:0:11");
  if (strip.length !== stripSize * count) throw Error("Unexpected video frame count");
  const tiled = [];
  for (let frame = 0; frame < count; frame++) {
    const start = frame * stripSize;
    for (let shift = 156; shift < 248; shift++) {
      let error = 0;
      for (let y = 1; y < 15; y++) {
        for (let x = 16; x < 69; x++) {
          const p = start + y * width + x;
          error += Math.abs(strip[p] - strip[p + shift]);
        }
      }
      if (error / (14 * 53) < 12) { tiled.push(frame); break; }
    }
  }
  if (tiled.length) throw Error("Repeated compositor tiles in frames " + tiled.join(", "));
  const first = decode(video, "scale=160:90", true);
  const cover = decode(poster, "scale=160:90", true);
  let delta = 0;
  for (let i = 0; i < first.length; i++) delta += Math.abs(first[i] - cover[i]);
  if (delta / first.length > 3) throw Error("Opening frame differs from poster");
}
