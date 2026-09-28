"use client";

import { forwardRef, useMemo } from "react";
import { Effect, EffectAttribute } from "postprocessing";
import * as THREE from "three";

/**
 * Radial zoom blur + chromatic split, driven by the camera's speed: when a shot whips to the next screen,
 * the frame streaks toward its centre like a crash zoom, then snaps clean as it lands.
 */
const fragment = /* glsl */ `
uniform float strength;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (strength < 0.002) { outputColor = inputColor; return; }
  vec2 center = vec2(0.5);
  vec2 dir = uv - center;
  float dist = length(dir);
  vec3 acc = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 20; i++) {
    float t = float(i) / 19.0;
    float s = 1.0 - strength * 0.14 * t;
    float w = 1.0 - t * 0.6;
    acc += texture2D(inputBuffer, center + dir * s).rgb * w;
    total += w;
  }
  vec3 blurred = acc / total;
  float ca = strength * 0.012 * dist;
  vec2 off = normalize(dir + 1e-5) * ca;
  float r = texture2D(inputBuffer, uv + off).r;
  float b = texture2D(inputBuffer, uv - off).b;
  float k = clamp(strength, 0.0, 1.0) * smoothstep(0.05, 0.45, dist);
  vec3 col = mix(inputColor.rgb, blurred, k);
  col.r = mix(col.r, r, k * 0.7);
  col.b = mix(col.b, b, k * 0.7);
  outputColor = vec4(col, inputColor.a);
}
`;

export class ZoomBlurEffect extends Effect {
  constructor() {
    super("ZoomBlurEffect", fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([["strength", new THREE.Uniform(0)]]),
    });
  }
  set strength(v: number) {
    this.uniforms.get("strength")!.value = v;
  }
}

/** The single instance the camera rig drives. */
export const zoomBlur = { effect: null as ZoomBlurEffect | null };

export const ZoomBlur = forwardRef<ZoomBlurEffect>(function ZoomBlur(_, ref) {
  const effect = useMemo(() => {
    const e = new ZoomBlurEffect();
    zoomBlur.effect = e;
    return e;
  }, []);
  return <primitive ref={ref} object={effect} dispose={null} />;
});
