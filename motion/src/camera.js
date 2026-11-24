// Coordinates are CSS pixels in the captured 1440 × 810 workspace.
// The camera holds a shot until the next move starts.
import capture from "./screens.json";

export const windowWidth = 962;
export const windowHeight = 560;
export const progress = (f, a, b) => Math.max(0, Math.min(1, (f - a) / (b - a)));
const smooth = t => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const ratio = windowHeight / windowWidth;

const shots = [
  // Start, settle, horizontal centre, vertical centre, visible width
  [0, 0, 720, 405, 1440],
  [28, 52, 320, 208, 650],     // Orders in the sidebar
  [68, 109, 470, 666, 796],    // Order 1045 in the register
  [135, 165, 570, 320, 830],   // Details and estimate tab
  [204, 226, 611, 450, 732],   // Estimate lines and agreed total
  [282, 312, 1187, 392, 528],  // Balance and payment button
  [327, 352, 719, 227, 570],   // Full payment dialog
  [403, 428, 1188, 385, 515],  // Paid balance
  [450, 474, 720, 405, 1440],  // Orient the viewer before returning to the menu
  [474, 487, 420, 280, 900],
  [500, 532, 590, 338, 916],   // Receipts tab
  [559, 583, 821, 441, 1140],  // Whole ledger entry
  [587, 614, 1133, 467, 606],  // Client and amount of the first receipt
];

function bounds([, , cx, cy, width]) {
  const height = width * ratio;
  const x = Math.max(0, Math.min(capture.viewport.width - width, cx - width / 2));
  const y = height > capture.viewport.height ? (capture.viewport.height - height) / 2 :
    Math.max(0, Math.min(capture.viewport.height - height, cy - height / 2));
  return { x, y, width };
}

export function cameraAt(frame) {
  let previous = bounds(shots[0]);
  for (const shot of shots.slice(1)) {
    if (frame < shot[0]) break;
    const next = bounds(shot);
    const t = smooth(progress(frame, shot[0], shot[1]));
    if (t < 1) return {x: mix(previous.x, next.x, t), y: mix(previous.y, next.y, t), width: mix(previous.width, next.width, t)};
    previous = next;
  }
  return previous;
}

export function pointerAt(frame) {
  const {steps} = capture;
  const index = steps.findIndex(s => s.frame >= frame);
  if (index < 0) return steps[steps.length - 1];
  if (index === 0) return steps[0];
  const a = steps[index - 1], b = steps[index];
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const travel = 13 + Math.min(14, distance / 65);
  const t = smooth(progress(frame, b.frame - travel - 4, b.frame - 4));
  return {x: mix(a.x, b.x, t), y: mix(a.y, b.y, t)};
}
