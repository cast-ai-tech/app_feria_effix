import { beforeEach, describe, expect, it } from "vitest";
import {
  markSplashShown,
  resetSplashForTests,
  shouldShowSplash,
} from "@/lib/banners";

beforeEach(() => {
  resetSplashForTests();
});

describe("splash de patrocinio — 1 vez por sesión de la app", () => {
  it("se muestra la primera vez", () => {
    expect(shouldShowSplash()).toBe(true);
  });

  it("tras marcarse mostrado, no vuelve a aparecer en la sesión", () => {
    expect(shouldShowSplash()).toBe(true);
    markSplashShown();
    expect(shouldShowSplash()).toBe(false);
    expect(shouldShowSplash()).toBe(false);
  });
});
