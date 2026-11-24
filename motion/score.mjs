// Original stereo score. Note and click times share the composition's frame clock.
import { writeFileSync } from "node:fs";

export function writeScore(destination, steps, duration, fps) {
  const rate = 48000;
  const frames = Math.round(duration * rate / fps);
  const left = new Float64Array(frames);
  const right = new Float64Array(frames);
  const tau = 2 * Math.PI;
  const freq = note => 440 * 2 ** ((note - 69) / 12);
  const clip = x => Math.min(1, Math.max(0, x));
  const ease = x => clip(x) ** 2 * (3 - 2 * clip(x));
  function voice(start, length, pan, sample) {
    const offset = Math.round(start * rate);
    const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
    const size = Math.min(frames-offset, Math.round(length*rate));
    for (let i=0;i<size;i++) {
      const v = sample(i / rate);
      left[offset+i] += v*l;
      right[offset+i] += v*r;
    }
  }

  // Let each voicing decay into a rest. Keep the harmony above the low bass register.
  const chords = [[57,61,64,66], [54,57,62,66], [55,59,62,66], [57,59,64,69]];
  const beat = 0.58;
  function keys(start, note, level, pan, decay) {
    const hz = freq(note);
    const length = decay * 4.5;
    voice(start, length, pan, t => {
      const phase = tau * hz * t;
      const envelope = ease(t / .032) * Math.exp(-t / decay) * ease((length - t) / .16);
      return level * envelope * (Math.sin(phase) + .13 * Math.exp(-4*t) * Math.sin(2*phase));
    });
  }
  for (let bar = 0; bar * 4 * beat < duration / fps; bar++) {
    const chord = chords[Math.floor(bar / 2) % chords.length];
    const downbeat = .07 + bar * 4 * beat;
    chord.forEach((note, k) => {
      keys(downbeat + k*.014, note, k === 0 ? .060 : .051, (k-1.5)*.21, .57);
    });
    // A spare offbeat answer keeps the pulse moving between the longer chord attacks.
    keys(downbeat + 2.5*beat, chord[1], .053, -.16, .29);
    keys(downbeat + 2.5*beat + .019, chord[3], .047, .20, .35);
  }

  function pluck(start, note, level, pan, length=1.15) {
    const hz=freq(note);
    voice(start,length,pan,t=>{
      const a=tau*hz*t;
      return level*ease(t/.018)*Math.exp(-4.9*t)*ease((length-t)/.12)*
        (Math.sin(a)+.16*Math.exp(-6*t)*Math.sin(2.01*a)+.035*Math.exp(-10*t)*Math.sin(3.99*a));
    });
  }
  const motif = [[0,2], [1.5,1], [3,3], [4.5,2], [6,0], [7.5,1]];
  for (let phrase = 0; phrase*8*beat < duration/fps; phrase++) {
    const chord = chords[phrase % chords.length];
    for (const [offset, tone] of motif) {
      const t = .30 + (8*phrase + offset)*beat;
      const nearClick = steps.some(s => Math.abs(s.frame/fps - t) < .17);
      const level = nearClick ? .045 : .088;
      const pan = tone % 2 ? .22 : -.19;
      pluck(t, chord[tone]+(tone < 2 ? 12 : 0), level, pan);
      pluck(t+.20, chord[tone]+(tone < 2 ? 12 : 0), level*.12, -pan);
    }
  }
  // Short felt taps on actual mouse-down frames, plus a resolving dyad on receipt.
  let seed=37383;
  steps.forEach((step,i)=>{
    const at=step.frame/fps;
    const note=[74,69,73,71,74,69,74][i];
    pluck(at,note,.087,(step.x/1440-.5)*.6,.7);
    let filtered=0;
    voice(at,.074,0,t=>{
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      filtered=.62*filtered+.38*(seed/2147483648-1);
      return .063*filtered*ease(t/.005)*Math.exp(-85*t);
    });
  });
  pluck(steps[4].frame/fps+.16,78,.045,.17);
  pluck(steps[6].frame/fps+.24,81,.04,.25);

  const wav=Buffer.alloc(44+frames*4);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);
  wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);
  wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*4,40);
  for(let i=0;i<frames;i++){
    const t=i/rate, gain=1.65*ease(t/.20)*ease((frames-i)/(rate*.90));
    for(const [c,value] of [left[i],right[i]].entries())
      wav.writeInt16LE(Math.round(32767*Math.max(-1,Math.min(1,gain*value))),44+4*i+2*c);
  }
  writeFileSync(destination,wav);
}
