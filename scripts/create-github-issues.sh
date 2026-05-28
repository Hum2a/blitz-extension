#!/usr/bin/env bash
# Creates GitHub issues from docs/GITHUB_ISSUES_BACKLOG.md (requires gh auth login).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

ensure_label() {
  local name="$1" color="$2"
  gh label create "$name" --color "$color" --force 2>/dev/null || true
}

ensure_label "phase-0" "b60205"
ensure_label "phase-1" "1d76db"
ensure_label "phase-2" "0e8a16"
ensure_label "phase-3" "5319e7"
ensure_label "phase-4" "6f42c1"
ensure_label "security" "d73a4a"
ensure_label "testing" "0075ca"
ensure_label "enhancement" "a2eeef"
ensure_label "documentation" "0075ca"
ensure_label "ci" "fbca04"

create_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"
  gh issue create --title "$title" --label "$labels" --body "$body"
}

create_issue "[security] License worker rate limiting" "security,phase-0" \
  "Add Cloudflare WAF or Worker rate limiting on POST license validation. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[security] Sanitize rich CV editor on every change" "security,phase-0" \
  "Run sanitizeRichHtml on ReviewDocumentEditor / CvTemplateRichEditor onChange. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[security] Add npm audit to CI" "security,ci,phase-0" \
  "Run npm audit in CI; enable Dependabot. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[testing] Unit tests for sync-engine.js" "testing,phase-1" \
  "Cover merge, suspend, unlock, push/pull. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[testing] Service worker message router tests" "testing,phase-1" \
  "Mock handleMessage + message-auth. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[docs] Reconcile ADMIN_ROADMAP with shipped admin" "documentation,phase-1" \
  "Update docs/ADMIN_ROADMAP.md. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Wire feature_flags in extension" "enhancement,phase-1" \
  "Consume app_config.feature_flags in popup. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] dailyLimit preference UI and enforcement" "enhancement,phase-1" \
  "Settings UI + queue/generation enforcement. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Expand client telemetry (no PII)" "enhancement,phase-1" \
  "generate_completed, platform, queue_finished events. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[testing] Raise Vitest coverage thresholds" "testing,phase-1" \
  "vitest.config.js coverage floors. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Lever ATS support" "enhancement,phase-2" \
  "New content/lever.js + manifest. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Ashby ATS support" "enhancement,phase-2" \
  "New content/ashby.js + manifest. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Tailor-only mode for external apply" "enhancement,phase-2" \
  "Export without fill for external apply. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Queue pause, retry, and URL dedupe" "enhancement,phase-2" \
  "JobQueue + queue-processor improvements. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Web workspace application history parity" "enhancement,phase-2" \
  "IDB origin gap for app.blitzai.online. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Widget match score and quick Review" "enhancement,phase-2" \
  "job-widget.js UX. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Lemon Squeezy customer portal in Settings" "enhancement,phase-3" \
  "Subscription management link. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] Smart job-list capture" "enhancement,phase-3" \
  "Bulk add from list/search pages. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[testing] E2E smoke tests (Playwright)" "testing,phase-4" \
  "Install → generate → review smoke. See docs/GITHUB_ISSUES_BACKLOG.md."

create_issue "[enhancement] i18n for UI and generation language" "enhancement,phase-4" \
  "Localized UI + prompt language preference. See docs/GITHUB_ISSUES_BACKLOG.md."

echo "Done. Open issues: $(gh issue list --limit 25)"
