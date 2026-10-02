import { describe, expect, it } from "vitest";
import { INITIAL_VIEW, viewReducer } from "@/lib/camera/states";
import { parseContext, sanitizeReturnTo } from "@/lib/integration/params";
import { QUALITY, pickAutoQuality, resolveQuality } from "@/lib/performance/quality";

describe("camera state transitions", () => {
  it("select -> explore -> pov -> reset", () => {
    let s = viewReducer(INITIAL_VIEW, { type: "select", planetId: "earth" });
    expect(s).toEqual({ mode: "PLANET_FOCUS", planetId: "earth" });
    s = viewReducer(s, { type: "explore" });
    expect(s.mode).toBe("PLANET_ORBIT");
    s = viewReducer(s, { type: "pov", planetId: "earth" });
    expect(s.mode).toBe("POV_PLANET");
    expect(viewReducer(s, { type: "reset" })).toEqual(INITIAL_VIEW);
  });
  it("explore without a selection is a no-op", () => {
    expect(viewReducer(INITIAL_VIEW, { type: "explore" })).toBe(INITIAL_VIEW);
  });
  it("free space clears the selection", () => {
    const s = viewReducer({ mode: "PLANET_FOCUS", planetId: "mars" }, { type: "free" });
    expect(s).toEqual({ mode: "FREE_SPACE", planetId: null });
  });
});

describe("returnTo safety", () => {
  const hosts = ["astrova.example"];
  it("accepts same-site relative paths", () => {
    expect(sanitizeReturnTo("/hub", hosts)).toBe("/hub");
    expect(sanitizeReturnTo("/hub?x=1", hosts)).toBe("/hub?x=1");
  });
  it("accepts https URLs on the allowlist only", () => {
    expect(sanitizeReturnTo("https://astrova.example/hub", hosts)).toBe("https://astrova.example/hub");
    expect(sanitizeReturnTo("https://evil.example/hub", hosts)).toBeNull();
    expect(sanitizeReturnTo("http://astrova.example/hub", hosts)).toBeNull();
  });
  it("rejects dangerous or malformed values", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "/\\evil.example", "https://user:pw@astrova.example/", "", "   ", "not a url"]) {
      expect(sanitizeReturnTo(bad, hosts)).toBeNull();
    }
    expect(sanitizeReturnTo(null, hosts)).toBeNull();
    expect(sanitizeReturnTo("/" + "a".repeat(3000), hosts)).toBeNull();
  });
});

describe("URL context parsing", () => {
  it("parses valid parameters", () => {
    const c = parseContext(new URLSearchParams("selectedPlanet=Uranus&returnTo=/hub&studentId=abc-123&learningContext=ipas.tata-surya"), []);
    expect(c).toEqual({ selectedPlanet: "uranus", returnTo: "/hub", studentId: "abc-123", learningContext: "ipas.tata-surya" });
  });
  it("ignores invalid parameters instead of throwing", () => {
    const c = parseContext(new URLSearchParams("selectedPlanet=pluto&returnTo=javascript:x&studentId=<script>"), []);
    expect(c).toEqual({ selectedPlanet: null, returnTo: null, studentId: null, learningContext: null });
  });
});

describe("quality presets", () => {
  it("scales monotonically from performance to ultra", () => {
    const order = ["performance", "balanced", "high", "ultra"] as const;
    for (let i = 1; i < order.length; i++) {
      expect(QUALITY[order[i]].textureSize).toBeGreaterThan(QUALITY[order[i - 1]].textureSize);
      expect(QUALITY[order[i]].starCount).toBeGreaterThan(QUALITY[order[i - 1]].starCount);
      expect(QUALITY[order[i]].maxDpr).toBeGreaterThanOrEqual(QUALITY[order[i - 1]].maxDpr);
    }
  });
  it("auto picks performance on mobile and honours manual choice", () => {
    const mobile = { isMobile: true, cores: 8, memoryGb: 8, maxTextureSize: 16384 };
    expect(pickAutoQuality(mobile)).toBe("performance");
    expect(resolveQuality("ultra", mobile)).toBe("ultra");
  });
});
