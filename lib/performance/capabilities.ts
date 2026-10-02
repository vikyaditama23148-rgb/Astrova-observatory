import type { DeviceHints } from "./quality";

export interface Capabilities {
  hints: DeviceHints;
  webgl: boolean;
  webgpu: boolean;
}

type NavigatorWithExtras = Navigator & { deviceMemory?: number; gpu?: unknown };

export function detectCapabilities(): Capabilities {
  const nav = navigator as NavigatorWithExtras;
  let webgl = false;
  let maxTextureSize = 4096;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (gl) {
      webgl = true;
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    }
  } catch {
    webgl = false;
  }
  return {
    webgl,
    // Detection only. The renderer stays on WebGL; see PERFORMANCE.md.
    webgpu: typeof nav.gpu !== "undefined",
    hints: {
      isMobile: /Android|iPhone|iPad|iPod/i.test(nav.userAgent) || (nav.maxTouchPoints > 1 && window.innerWidth < 1024),
      cores: nav.hardwareConcurrency || 4,
      memoryGb: nav.deviceMemory ?? null,
      maxTextureSize,
    },
  };
}
