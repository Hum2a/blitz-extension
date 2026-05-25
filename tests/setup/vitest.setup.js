import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, vi } from "vitest";
import { resetChromeMock } from "./chrome-mock.js";

// Node Web Crypto (happy-dom lacks subtle) + deterministic UUIDs for queue-utils
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  subtle: webcrypto.subtle,
  getRandomValues: (buffer) => webcrypto.getRandomValues(buffer),
  randomUUID: () =>
    `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, "0")}`,
});

beforeEach(() => {
  uuidCounter = 0;
  resetChromeMock();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
