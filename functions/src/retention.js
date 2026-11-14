// v2.16.7 P10: retention periods (Privacy Notice §7 / DPIA §6), run daily by a scheduled function (emulator-tested only).
// Works on the platform paths (apps/{appId}/…). Deletes by date only; never reads or logs content.
const DAY = 86400000;
export const PERIODS = { threadsDays: 365, usageDays: 120, trackerDays: 730, googleDailyDays: 365, auditDays: 730, inactiveWarnDays: 548, deletionGraceDays: 30 };
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const old = (at, days, now) => { const t = typeof at === "number" ? at : Date.parse(at); return isFinite(t) && now - t > days * DAY; };

export async function retention(db, app, now = Date.now()) {
  const n = { threads: 0, usage: 0, tracker: 0, googleDaily: 0, audit: 0, warned: 0, deletedAccounts: 0 };
  const up = {};
  const users = (await db.ref(`apps/${app}/users`).once("value")).val() || {};
  for (const [uid, u] of Object.entries(users)) {
    const d = (u && u.data) || {};
    for (const [tid, th] of Object.entries(d.threads || {})) if (old(th && th.at, PERIODS.threadsDays, now)) { up[`apps/${app}/users/${uid}/data/threads/${tid}`] = null; n.threads++; }
    for (const day of Object.keys(d.googleDaily || {})) if (day < iso(now - PERIODS.googleDailyDays * DAY)) { up[`apps/${app}/users/${uid}/data/googleDaily/${day}`] = null; n.googleDaily++; }
  }
  const usage = (await db.ref(`apps/${app}/usage`).once("value")).val() || {};
  for (const [uid, days] of Object.entries(usage)) for (const day of Object.keys(days || {})) if (day < iso(now - PERIODS.usageDays * DAY)) { up[`apps/${app}/usage/${uid}/${day}`] = null; n.usage++; }
  const tracker = (await db.ref(`apps/${app}/tracker`).once("value")).val() || {};
  for (const [id, t] of Object.entries(tracker)) if (old(t && (t.created || t.at), PERIODS.trackerDays, now)) { up[`apps/${app}/tracker/${id}`] = null; n.tracker++; }
  const audit = (await db.ref(`apps/${app}/audit`).once("value")).val() || {};
  for (const [id, a] of Object.entries(audit)) if (old(a && a.at, PERIODS.auditDays, now)) { up[`apps/${app}/audit/${id}`] = null; n.audit++; }
  // Accounts: deletion requests are carried out after the grace period; inactive accounts are warned at 18 months.
  const accounts = (await db.ref(`apps/${app}/admin/accounts`).once("value")).val() || {};
  for (const [uid, a] of Object.entries(accounts)) {
    if (a && a.deletionRequested && old(a.deletionRequested, 0, now)) {
      for (const p of ["users", "energy", "ledger", "usage", "entitlements", "memberOf"]) up[`apps/${app}/${p}/${uid}`] = null;
      up[`apps/${app}/admin/accounts/${uid}`] = { status: "deleted", deletedAt: now };
      n.deletedAccounts++;
    } else if (a && a.lastActive && old(a.lastActive, PERIODS.inactiveWarnDays, now) && !a.inactiveWarned) {
      up[`apps/${app}/admin/accounts/${uid}/inactiveWarned`] = now;   // the warning email is sent by a later step (needs an email provider)
      n.warned++;
    }
  }
  if (Object.keys(up).length) await db.ref().update(up);
  return n;
}
