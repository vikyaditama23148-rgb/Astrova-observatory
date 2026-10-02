import { isPlanetId } from "@/data/planets";
import type { PlanetId } from "@/types/planet";

export interface ObservatoryContext {
  selectedPlanet: PlanetId | null;
  returnTo: string | null;
  studentId: string | null;
  learningContext: string | null;
}

/** Main Astrova site. The Observatory is a branch of it, so its host is always allowed in absolute returnTo URLs. */
export const MAIN_SITE_ORIGIN = "https://astrova-two.vercel.app";
export const MAIN_SITE_LOGIN_URL = `${MAIN_SITE_ORIGIN}/login`;

/** Hosts allowed for absolute returnTo URLs: the main site plus NEXT_PUBLIC_ALLOWED_RETURN_HOSTS (comma-separated). */
export function allowedHosts(): string[] {
  const env = process.env.NEXT_PUBLIC_ALLOWED_RETURN_HOSTS ?? "";
  const extra = env.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  return [new URL(MAIN_SITE_ORIGIN).hostname, ...extra];
}

/**
 * Accepts only same-site relative paths ("/hub") or https URLs whose host is on the allowlist.
 * Everything else (javascript:, data:, protocol-relative "//evil", backslash tricks) returns null.
 */
export function sanitizeReturnTo(raw: string | null | undefined, hosts: string[] = allowedHosts()): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (value.length > 2048 || /[\u0000-\u001f\\]/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return hosts.includes(url.hostname.toLowerCase()) ? url.toString() : null;
  } catch {
    return null;
  }
}

function clean(raw: string | null, max = 64): string | null {
  if (!raw) return null;
  const v = raw.trim();
  return v && v.length <= max && /^[\w .:-]+$/.test(v) ? v : null;
}

export function parseContext(params: URLSearchParams, hosts?: string[]): ObservatoryContext {
  const planet = params.get("selectedPlanet")?.toLowerCase() ?? null;
  return {
    selectedPlanet: isPlanetId(planet) ? planet : null,
    returnTo: sanitizeReturnTo(params.get("returnTo") ?? params.get("returnPath"), hosts),
    studentId: clean(params.get("studentId")),
    learningContext: clean(params.get("learningContext"), 128),
  };
}