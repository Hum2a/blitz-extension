import { describe, expect, it } from "vitest";
import {
  CONTENT_SCRIPT_MESSAGE_TYPES,
  EXTERNAL_BLOCKED_MESSAGE_TYPES,
  EXTERNAL_WEB_MESSAGE_TYPES,
} from "../../../background/message-auth.js";

/**
 * Service worker routing contract — ensures external/web and content paths stay aligned.
 */
describe("service worker message contracts", () => {
  it("content scripts cannot call generation directly", () => {
    expect(CONTENT_SCRIPT_MESSAGE_TYPES.has("GENERATE_APPLICATION")).toBe(false);
    expect(CONTENT_SCRIPT_MESSAGE_TYPES.has("WIDGET_GENERATE")).toBe(true);
    expect(CONTENT_SCRIPT_MESSAGE_TYPES.has("JOB_DETECTED")).toBe(true);
  });

  it("web dashboard can generate but not test API keys", () => {
    expect(EXTERNAL_WEB_MESSAGE_TYPES.has("GENERATE_APPLICATION")).toBe(true);
    expect(EXTERNAL_BLOCKED_MESSAGE_TYPES.has("TEST_API_KEY")).toBe(true);
    expect(EXTERNAL_WEB_MESSAGE_TYPES.has("TEST_API_KEY")).toBe(false);
  });

  it("web dashboard can sync and queue", () => {
    expect(EXTERNAL_WEB_MESSAGE_TYPES.has("SYNC_NOW")).toBe(true);
    expect(EXTERNAL_WEB_MESSAGE_TYPES.has("PROCESS_QUEUE")).toBe(true);
  });
});
