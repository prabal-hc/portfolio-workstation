/**
 * The sound of the site:
 *  - /audio/jarvis-startup.mp3 – the startup sound, played as the camera first swings behind the desk
 *    (if it is missing, a synthesised power-up + chime is used instead)
 *  - jarvis.voiceClip (content.ts, off by default) – an optional separate voice line ("Welcome to my portfolio"), laid over the startup sound at
 *    `jarvis.voiceAt` seconds (see content.ts). If it is missing, no voice is
 *    added (use this when the startup clip already has JARVIS speaking in it).
 *  - a low room/PC hum while the page is open, and a whoosh on every fast camera move (synthesised)
 *
 * Browsers only allow sound after a click, which is why the site opens with an "Initialize" button.
 */
import { jarvis as copy } from "@/data/content";

type Listener = (e: { speaking: boolean; text: string }) => void;

class Jarvis {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private hum: GainNode | null = null;
  private startup: AudioBuffer | null = null;
  private welcome: AudioBuffer | null = null;
  private loading: Promise<void> | null = null;
  private bed: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private voiceSrc: AudioBufferSourceNode | null = null;
  private listeners = new Set<Listener>();
  private lastWhoosh = 0;
  enabled = false;
  speaking = false;
  greeted = false;

  /** Call from a click handler. */
  unlock(withSound: boolean) {
    this.enabled = withSound;
    if (!withSound || typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      void this.ctx.resume().catch(() => {});
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.impulse(2.6, 2.2);
      const wet = this.ctx.createGain();
      wet.gain.value = 0.35;
      this.reverb.connect(wet).connect(this.master);
      this.startHum();
    } catch {
      this.ctx = null;
    }
    this.loading = this.ctx ? Promise.all([this.load("/audio/jarvis-startup.mp3"), copy.voiceClip ? this.load(copy.voiceClip) : null]).then(([a, b]) => {
      this.startup = a;
      this.welcome = b;
    }) : null;
  }

  /** Fetch + decode an optional clip (null if it is not there). */
  private async load(url: string): Promise<AudioBuffer | null> {
    try {
      const r = await fetch(url);
      if (!r.ok || !(r.headers.get("content-type") ?? "").includes("audio")) return null;
      return await this.ctx!.decodeAudioData(await r.arrayBuffer());
    } catch {
      return null;
    }
  }

  setEnabled(on: boolean) {
    if (on && !this.ctx) {
      this.unlock(true);
      return;
    }
    this.enabled = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.08);
    if (!on) {
      this.stopClips();
    }
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private emit(speaking: boolean) {
    this.speaking = speaking;
    this.listeners.forEach((fn) => fn({ speaking, text: copy.line }));
  }

  /** Exponentially decaying stereo noise: a cheap, convincing room reverb. */
  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  private noise(seconds: number) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  private out(node: AudioNode, wet = true) {
    node.connect(this.master!);
    if (wet) node.connect(this.reverb!);
  }

  private startHum() {
    const ctx = this.ctx!;
    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    this.hum.gain.setTargetAtTime(0.045, ctx.currentTime, 1.5);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    for (const f of [55, 110.4, 165.2]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = f === 55 ? 0.6 : 0.18;
      o.connect(g).connect(lp);
      o.start();
    }
    const air = this.noise(4);
    air.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.4;
    const ag = ctx.createGain();
    ag.gain.value = 0.05; // fan air
    air.connect(bp).connect(ag).connect(lp);
    air.start();
    lp.connect(this.hum);
    this.out(this.hum, false);
  }

  /** The startup sound + greeting. Plays once per visit to the top of the page. */
  greet() {
    if (this.greeted) return;
    this.greeted = true;
    this.emit(true);
    if (!this.enabled || !this.ctx) {
      window.setTimeout(() => this.emit(false), 3200);
      return;
    }
    // give the clips a moment to finish decoding if the visitor scrolled straight away
    const ready = this.loading ?? Promise.resolve();
    void Promise.race([ready, new Promise((r) => setTimeout(r, 1200))]).then(() => this.play());
  }

  private play() {
    const ctx = this.ctx!;
    const t = ctx.currentTime + 0.03;
    if (this.startup) {
      const src = ctx.createBufferSource();
      src.buffer = this.startup;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      src.connect(gain).connect(this.master!);
      src.start(t);
      src.onended = () => {
        if (this.bed?.src === src) this.bed = null;
      };
      this.bed = { src, gain };
    } else this.powerUp(t);

    const at = copy.voiceAt;
    if (this.welcome) {
      const v = ctx.createBufferSource();
      v.buffer = this.welcome;
      const g = ctx.createGain();
      g.gain.value = 1.15;
      v.connect(g);
      this.out(g); // a touch of room on the voice
      v.start(t + at);
      v.onended = () => this.emit(false);
      this.voiceSrc = v;
      this.duck(t + at, this.welcome.duration);
    } else {
      // no separate voice clip: the startup sound carries the greeting
      window.setTimeout(() => this.emit(false), (at + 2.4) * 1000);
    }
  }

  /** Dip the startup sound under the voice so the words sit on top. */
  private duck(at: number, length: number) {
    const g = this.bed?.gain.gain;
    if (!g) return;
    g.setTargetAtTime(0.45, at - 0.15, 0.08);
    g.setTargetAtTime(0.9, at + length, 0.4);
  }

  /** Once the camera moves on to the screens, let the startup sound sit back. */
  settle() {
    if (this.bed && this.ctx) this.bed.gain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.6);
  }

  private stopClips() {
    try {
      this.bed?.src.stop();
      this.voiceSrc?.stop();
    } catch {}
    this.bed = null;
    this.voiceSrc = null;
  }

  /** The fallback power-up when there is no startup clip: sub swell, rising sweep, glassy chime. */
  private powerUp(t: number) {
    const ctx = this.ctx!;
    // sub swell
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(38, t);
    sub.frequency.exponentialRampToValueAtTime(62, t + 1.4);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.exponentialRampToValueAtTime(0.5, t + 0.9);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    sub.connect(sg);
    this.out(sg, false);
    sub.start(t);
    sub.stop(t + 2.7);

    // rising filtered sweep ("systems spinning up")
    const sweep = ctx.createOscillator();
    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(90, t);
    sweep.frequency.exponentialRampToValueAtTime(880, t + 1.2);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 6;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + 1.2);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.0001, t);
    wg.gain.exponentialRampToValueAtTime(0.09, t + 1.0);
    wg.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    sweep.connect(bp).connect(wg);
    this.out(wg);
    sweep.start(t);
    sweep.stop(t + 1.6);

    // glassy HUD chime (a fifth + octave, bell-like decay)
    const chimeAt = t + 1.25;
    [880, 1318.5, 1760, 2637].forEach((f, k) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, chimeAt + k * 0.06);
      g.gain.exponentialRampToValueAtTime(0.12 / (k + 1), chimeAt + k * 0.06 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, chimeAt + k * 0.06 + 2.2);
      o.connect(g);
      this.out(g);
      o.start(chimeAt + k * 0.06);
      o.stop(chimeAt + 2.4 + k * 0.06);
    });

    // data chatter: tiny blips under the chime
    for (let k = 0; k < 9; k++) this.blip(chimeAt + 0.25 + k * 0.07, 1800 + Math.random() * 2400, 0.02);
  }

  /** Allow the greeting again (the visitor went back to the very top). */
  rearm() {
    if (!this.greeted || this.speaking) return;
    this.greeted = false;
    this.stopClips();
  }

  blip(at?: number, freq = 2400, vol = 0.03) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = at ?? ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    o.connect(hp).connect(g);
    this.out(g);
    o.start(t);
    o.stop(t + 0.06);
  }

  /** Air rushing past the lens. `power` 0..1. */
  whoosh(power = 1) {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastWhoosh < 450) return;
    this.lastWhoosh = now;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = this.noise(1.1);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.28);
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32 * power, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    src.connect(bp).connect(g);
    this.out(g);
    src.start(t);
    src.stop(t + 1.1);
    // low thump as the shot lands
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.6);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t + 0.3);
    og.gain.exponentialRampToValueAtTime(0.28 * power, t + 0.33);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(og);
    this.out(og, false);
    o.start(t + 0.3);
    o.stop(t + 0.75);
  }
}

export const jarvis = new Jarvis();
