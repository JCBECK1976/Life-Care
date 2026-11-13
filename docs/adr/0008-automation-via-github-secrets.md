# ADR 0008: Automation via GitHub Actions secrets

- **Status:** Accepted (live 13 Nov 2026)
- **Date:** 12 Nov 2026 (prepared), 13 Nov 2026 (live; key-storage correction)

## Context
Nightly backups, the Build refresh and post-deploy smoke tests need credentials that must never appear in this public repository.

## Decision
- Credentials live only as **GitHub Actions repository secrets**.
- Each job checks that its secrets are present. If any are missing, it logs "secret not set — skipped" and ends without reading or writing anything.
- Backups are encrypted on the runner before they leave it, and stored only in a private repository.
- **The backup encryption key (BACKUP_KEY) is never stored with the backups:** it is kept in the owner's password manager plus one offline copy, and never in the private repository that holds the backups.

## Alternatives rejected
Credentials in the app or repo (exposed); unencrypted backups (exposure if the private repo leaks); storing the key beside the backups (one leak exposes both).

## Consequences
- No secrets in code or docs.
- Jobs are safe to run before setup.
- Losing BACKUP_KEY makes every backup unreadable, so its two copies matter. Rotating it applies to new backups only.
