import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getExtensionId,
  isExtensionPage,
  isLocalWeb,
  isWebDashboard,
  setExtensionId,
} from "../../../popup/src/lib/extension-env.js";

describe("extension-env", () => {
  const originalLocation = globalThis.location;

  afterEach(() => {
    Object.defineProperty(globalThis, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    localStorage.clear();
  });

  it("detects extension pages by protocol", () => {
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "chrome-extension:", hostname: "abc" },
      writable: true,
      configurable: true,
    });
    expect(isExtensionPage()).toBe(true);
    expect(getExtensionId()).toBe("test-extension-id");
  });

  it("reads extension id from localStorage on web dashboard", () => {
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "http:", hostname: "localhost" },
      writable: true,
      configurable: true,
    });
    setExtensionId("my-ext-id");
    expect(isExtensionPage()).toBe(false);
    expect(getExtensionId()).toBe("my-ext-id");
    expect(isWebDashboard()).toBe(true);
    expect(isLocalWeb()).toBe(true);
  });

  it("isLocalWeb is false on remote hosts", () => {
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "https:", hostname: "example.com" },
      writable: true,
      configurable: true,
    });
    expect(isLocalWeb()).toBe(false);
  });
});
