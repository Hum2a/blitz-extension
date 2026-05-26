import PageHeader from "../components/PageHeader.jsx";

export default function Privacy() {
  return (
    <div>
      <PageHeader
        title="Privacy & admin scope"
        subtitle="What Blitz staff can and cannot see in this dashboard."
      />
      <div className="card prose">
        <h2>We can see (metadata)</h2>
        <ul>
          <li>Account email, user ID, role, join date, last seen</li>
          <li>License tier, usage counter, expiry, source</li>
          <li>Cloud sync: document keys, timestamps, device IDs, content hashes</li>
          <li>Synced application record IDs and update times (not job content)</li>
          <li>Admin audit log of staff actions</li>
          <li>Opt-in client events (e.g. extension_opened — no CV text)</li>
          <li>Billing webhook events from Lemon Squeezy</li>
        </ul>
        <h2>We cannot see</h2>
        <ul>
          <li>CV text, cover letters, screening answers, API keys</li>
          <li>Decrypted application content (end-to-end encrypted)</li>
          <li>AI prompts or model responses (BYOK — calls go direct to Anthropic/OpenAI)</li>
        </ul>
        <h2>Staff actions</h2>
        <ul>
          <li>
            <strong>Admin</strong> — view data, change licenses, suspend users, revoke sessions
          </li>
          <li>
            <strong>Developer</strong> — roles, delete accounts, reset cloud sync, app config
          </li>
        </ul>
        <p className="muted small">
          User-facing controls: sign out, reset cloud data, delete account (extension Settings).
        </p>
      </div>
    </div>
  );
}
