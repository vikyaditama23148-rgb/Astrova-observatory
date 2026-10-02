export type QualityLevel = "performance" | "balanced" | "high" | "ultra";
export type QualityChoice = QualityLevel | "auto";

export interface QualitySettings {
  maxDpr: number;
  textureSize: number;
  sphereSegments: number;
  starCount: number;
  atmosphere: boolean;
  corona: boolean;
  antialias: boolean;
}

export const QUALITY: Record<QualityLevel, QualitySettings> = {
  performance: { maxDpr: 1, textureSize: 512, sphereSegments: 32, starCount: 1200, atmosphere: false, corona: false, antialias: false },
  balanced: { maxDpr: 1.5, textureSize: 1024, sphereSegments: 48, starCount: 3000, atmosphere: true, corona: true, antialias: true },
  high: { maxDpr: 2, textureSize: 2048, sphereSegments: 64, starCount: 5000, atmosphere: true, corona: true, antialias: true },
  ultra: { maxDpr: 2.5, textureSize: 4096, sphereSegments: 96, starCount: 8000, atmosphere: true, corona: true, antialias: true },
};

export const QUALITY_STORAGE_KEY = "astrova-observatory:quality";

export interface DeviceHints {
  isMobile: boolean;
  cores: number;
  memoryGb: number | null;
  maxTextureSize: number;
}

/** Heuristic only; real-device FPS has not been measured. */
export function pickAutoQuality(h: DeviceHints): QualityLevel {
  if (h.isMobile || h.cores <= 4 || (h.memoryGb !== null && h.memoryGb <= 4)) return "performance";
  if (h.maxTextureSize < 8192) return "balanced";
  if (h.cores >= 12 && (h.memoryGb === null || h.memoryGb >= 8)) return "high";
  return "balanced";
}

export function resolveQuality(choice: QualityChoice, hints: DeviceHints): QualityLevel {
  return choice === "auto" ? pickAutoQuality(hints) : choice;
}

export function isQualityChoice(v: unknown): v is QualityChoice {
  return v === "auto" || v === "performance" || v === "balanced" || v === "high" || v === "ultra";
}
