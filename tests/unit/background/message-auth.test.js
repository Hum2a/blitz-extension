import { describe, expect, it } from "vitest";
import {
  assertMessageAllowed,
  isContentScriptSender,
  isExtensionPageSender,
} from "../../../background/message-auth.js";

const EXT_ID = "test-extension-id";

describe("message-auth", () => {
  it("allows extension pages any message type", () => {
    expect(() =>
      assertMessageAllowed(
        { type: "TEST_API_KEY" },
        { url: `chrome-extension://${EXT_ID}/popup/dist/index.html` },
        { external: false }
      )
    ).not.toThrow();
  });

  it("blocks content scripts from privileged messages", () => {
    expect(() =>
      assertMessageAllowed(
        { type: "GENERATE_APPLICATION" },
        { tab: { id: 1 }, url: "https://boards.greenhouse.io/job" },
        { external: false }
      )
    ).toThrow(/content script/i);
  });

  it("allows content scripts job events", () => {
    expect(() =>
      assertMessageAllowed(
        { type: "JOB_DETECTED" },
        { tab: { id: 1 }, url: "https://boards.greenhouse.io/job" },
        { external: false }
      )
    ).not.toThrow();
  });

  it("blocks external web from TEST_API_KEY", () => {
    expect(() =>
      assertMessageAllowed({ type: "TEST_API_KEY" }, { origin: "http://localhost:5173" }, {
        external: true,
      })
    ).toThrow(/extension/i);
  });

  it("allows external web PING and GENERATE_APPLICATION", () => {
    expect(() =>
      assertMessageAllowed({ type: "PING" }, {}, { external: true })
    ).not.toThrow();
    expect(() =>
      assertMessageAllowed({ type: "GENERATE_APPLICATION" }, {}, { external: true })
    ).not.toThrow();
  });

  it("detects extension vs content senders", () => {
    expect(
      isExtensionPageSender({
        url: `chrome-extension://${EXT_ID}/popup/dist/dashboard.html`,
      }, EXT_ID)
    ).toBe(true);
    expect(
      isContentScriptSender(
        { tab: { id: 2 }, url: "https://www.linkedin.com/jobs/view/1" },
        EXT_ID
      )
    ).toBe(true);
  });
});
