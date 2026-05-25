# Blitz extension — unit tests

Vitest + happy-dom + Testing Library. Pure logic in `popup/src/lib/` is the primary target; Chrome APIs are mocked in `tests/setup/`.

## Layout

```
tests/
├── setup/
│   ├── vitest.setup.js      # global hooks, crypto.randomUUID stub
│   └── chrome-mock.js       # chrome.storage.local + runtime messaging
├── fixtures/                # JSON sample jobs, applications, AI responses
├── helpers/                 # seedStorage(), chrome mock utilities
└── unit/
    ├── lib/                 # one test file per lib module (or group)
    └── components/          # React component tests (@/ alias)
```

## Commands (from `blitz-extension/`)

| Script | Description |
|--------|-------------|
| `npm run test:unit` | Run all unit tests once |
| `npm run test:unit:watch` | Watch mode |
| `npm run test:unit:coverage` | Run with V8 coverage report in `coverage/` |
| `npm run test:unit:ui` | Vitest browser UI |
| `npm run test` | Unit tests + manifest validate + license worker (optional) |
| `npm run test:ci` | Unit tests + validate (CI-safe, no network) |
| `npm run test:validate` | Manifest/build validation only |
| `npm run test:license` | License worker HTTP smoke test |

## Writing tests

1. **Lib modules** — import from `popup/src/lib/…` (or `@/lib/…`). Prefer testing exported pure functions.
2. **Storage / license** — use `seedStorage()` from `tests/helpers/fake-storage.js` before calling storage APIs.
3. **Fetch / network** — `vi.stubGlobal("fetch", vi.fn())` in the test file; never use real API keys.
4. **React** — add `*.test.jsx` under `tests/unit/components/`; import components via `@/components/…`.
5. **Content / background** — add `tests/unit/content/` or `tests/unit/background/` when extracting testable helpers.

### Example

```js
import { describe, expect, it } from "vitest";
import { seedStorage } from "../../helpers/fake-storage.js";
import { getStorage, setStorage } from "../../../popup/src/lib/storage.js";

describe("my feature", () => {
  it("reads defaults", async () => {
    seedStorage({});
    expect(await getStorage("cv_text")).toBe("");
  });
});
```

## Coverage

Coverage includes `popup/src/lib`, `content`, and `background`. Thresholds start at 0% so CI stays green while the suite grows — raise thresholds in `vitest.config.js` when ready.

## CI

GitHub Actions runs `npm run test:ci` (unit + validate) on every PR.
