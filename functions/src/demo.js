// v2.31.2 (Architect, 18 Nov): the STORE REVIEW DEMO ACCOUNT. Admin only. Its own account (UID), synthetic data from
// the fixture generator (one made-up person), Gold (an admin grant, never billed), no household. Never the joint
// account, never an admin, never an account that already holds its own data — so no real data can ever be shown to
// a store reviewer or overwritten. Terms are NOT accepted on the reviewer's behalf: they see the real onboarding.
import { DEFAULT_APP, LOCKED_UIDS, P } from "./config.js";
import { HttpsError, creditPlan, isAdmin, tiersConfig } from "./core.js";
import { makeDemoFlat } from "./fixture.js";
import { toAreas } from "./areas.js";

const need = (c, code, msg) => { if (!c) throw new HttpsError(code, msg); };
const appOf = (data) => (data && /^[a-z0-9-]{2,20}$/.test(data.appId || "") ? data.appId : DEFAULT_APP);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** data: { email } — the review account's sign-in email (a Google account made for store review). */
export async function createReviewDemo({ uid, data }, { db, auth, now = Date.now() }) {
  need(await isAdmin(db, uid), "permission-denied", "Admins only.");
  const app = appOf(data); const email = String((data && data.email) || "").trim().toLowerCase();
  need(EMAIL.test(email), "invalid-argument", "The review account's email is needed.");
  let user = null; try { user = await auth.getUserByEmail(email); } catch (e) { user = null; }
  const created = !user;
  if (!user) user = await auth.createUser({ email, emailVerified: true, displayName: "Alex (demo)" });
  const id = user.uid;
  need(!LOCKED_UIDS.includes(id) && !(await isAdmin(db, id)), "failed-precondition", "Never the joint or an admin account.");
  need(!(await db.ref(`apps/${app}/memberOf/${id}`).once("value")).val(), "failed-precondition", "The demo account must not be in a family.");
  const cur = (await db.ref(`apps/${app}/users/${id}`).once("value")).val();
  need(!cur || (cur.demo && cur.demo.review === true) || !cur.data, "failed-precondition", "This account already has its own data — the demo is only made on an empty or demo account.");
  const { own, family } = toAreas(makeDemoFlat(new Date(now)));
  await db.ref(`apps/${app}/users/${id}`).update({   // keeps any consent record (append-only history) the reviewer already made
    profile: { name: "Alex (demo)" },
    demo: { review: true, createdAt: now, by: uid },
    privacy: { visible: false, logForMe: false },
    data: own, shared: family,
  });
  await db.ref(P.ent(app, id)).set({ tier: "gold", since: now, source: "admin", note: "store review demo" });
  await db.ref(P.account(app, id)).update({ tier: "gold", updated: now, demo: true });
  const allowance = ((await tiersConfig(db, app)).gold || {}).energy || 0;
  if (allowance > 0) await creditPlan(db, app, id, allowance, "demo:gold", "demo_" + id + "_" + new Date(now).toISOString().slice(0, 7), now, "allowance");
  return { ok: true, uid: id, email, created };
}
