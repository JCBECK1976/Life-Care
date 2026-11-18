# Lifecare Companion™ — Accessibility Statement

> **DRAFT — for legal review before any users other than JC and Becks.** Based on a quick code review (13 Nov 2026), not a full audit.

Last updated: 18 November 2026 (draft 5, v2.34.0 on /build/)

## 1. Our target
We aim for the app to meet **WCAG 2.2 level AA**. The app is designed phone-first (360 px and wider), and also works on desktop browsers.

## 2. Current status: partially compliant
A review of the code (13 Nov) found the gaps below. Since **v2.17.0** (14 Nov) most are fixed, and automated checks (axe, WCAG 2.0–2.2 A and AA) run on the main screens with every change. A full manual audit with a screen reader is still to do.

| Gap | What it means | WCAG 2.2 |
|---|---|---|
| ~~Zoom is blocked~~ (fixed v2.15.2) | The page sets `maximum-scale=1` / `user-scalable=no`, so you can't pinch-zoom on a phone. | 1.4.4 Resize Text |
| ~~Colour-only RAG cues~~ (fixed v2.17.0: symbol + word) | Food ratings use red / amber / green colours. Some places show the colour without the word (GREAT / AMBER / RED) or an icon. | 1.4.1 Use of Colour |
| ~~Light grey text below 4.5:1~~ (fixed v2.17.0; small sizes remain) | Many labels and notes are 8–10 px, and a light grey (#94a3b8) on white is below the 4.5:1 contrast ratio. | 1.4.3 Contrast (Minimum), 1.4.12 Text Spacing |
| **Emoji used as labels** | Some buttons are an emoji with little or no text (e.g. 👁, 📷, ✕). Screen readers read the emoji's name, or nothing useful. | 1.1.1 Non-text Content, 2.5.3 Label in Name |
| **Missing screen-reader labels** (axe clean on all checked screens since v2.20.0; v2.34.0: every control on the main flows has a name in the tree TalkBack reads; manual pass on a phone still to do) | Around 50 of roughly 350 buttons have an explicit accessible name. Icon-only buttons and some form fields need labels. | 4.1.2 Name, Role, Value; 1.3.1 Info and Relationships |
| ~~Focus states~~ (visible outline v2.17.0; v2.20.0: Chat, Help, Privacy and Review Item are dialogs — focus moves in, Tab stays inside, Esc closes, focus returns) | Keyboard focus relies on browser defaults, which are hard to see on some custom buttons. Focus order through overlays (Help, Chat, Open forms) has not been checked. | 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured, 2.4.3 Focus Order |
| ~~Touch target size~~ (v2.20.0: on touch screens every button and field is at least 44 px tall and icon-only buttons 44 × 44; v2.30.1: small action buttons keep ≥ 8 px between neighbours; an automated check found no target under 24 px with a neighbour inside its 24 px circle on the main screens) | Some small buttons in tables and lists may be under 24 × 24 px. | 2.5.8 Target Size (Minimum) |
| ~~Charts~~ (v2.30.1: every chart has a spoken summary — first → latest, lowest, highest — and full charts have **As text** with the numbers; the symptom chart has a sentence and a table) | Trend charts have no text alternative beyond the values shown nearby. | 1.1.1 Non-text Content |
| ~~Status messages~~ (v2.20.0: save/error banners, Chat/Help messages and Companion replies are live regions) | Some confirmations ("✓ Saved") are announced; others may not be. | 4.1.3 Status Messages |

**v2.20.0 (16 Nov, on /build/):**
- Contrast: amber and green rating text darkened to ≥ 4.5:1 (#b45309, #15803d; red #b91c1c) in the eating lists and pickers; white-on-green Accept button darkened.
- Labels: the exercise log's Week, Progression and Notes fields are labelled.
- axe (WCAG 2.0–2.2 A + AA) now also runs at 360 px on Update Lists (search results, Build a meal, My own), the exercise log form, Chat and Help.
- Every input, select and text box has a visible 1 px border (#cbd5e1).

**v2.30.1 (18 Nov, on /build/):**
- Text size: the Android and iPhone apps follow the phone's text size up to 200%; tested by doubling every text size at 360 px — no main screen scrolls sideways (a data table scrolls inside itself; button rows wrap).
- Charts have text alternatives (see the table). Undo after deleting your records; one tap never saves twice; bottom-sheet pickers with 48 px rows; loading skeletons announce "Loading…".
- New pilot screens (Symptoms, HRT, GP prep): radio groups for the 0–3 scores, labelled fields, 44 px controls, a table and a sentence for the trend chart.

**v2.34.0 (18 Nov, on /build/) — native accessibility:**
- **How it was checked:** the Android app shows the web app in a WebView, which gives TalkBack the accessibility tree Chromium builds. An automated test reads that tree on the main flows at 360 px (Home, My Body + Record, My Exercise, My Eating, My Shop, My Health, Settings) and checks what TalkBack would announce: every control has a name, no name is only an emoji, no unnamed images, each screen has headings, and axe (WCAG 2.0–2.2 A + AA) passes. VoiceOver uses WebKit's tree, which follows the same HTML roles and labels; it was not run on an iPhone yet (no Mac or phone available to the developer — see the manual script below).
- **Found and fixed:** 12 boxes in My Body → Record (and the same pattern in other older forms) were read as "edit box" with no name — each visible label is now linked to its box; the main tabs had no headings — section titles are now headings, so TalkBack/VoiceOver heading navigation works; 10+ buttons were all called "👁 Progress" — now "Weight progress", "Close chest progress", "Week eating progress", and they say whether they're open; the five mood buttons were read as emoji names ("pensive face") — now "Mood: Good" etc., and say which is chosen; two decorative icons were announced as images — hidden from screen readers.
- **Text size:** the Android app (font scale) and the iPhone app (Dynamic Type / Larger Text) follow the phone's text size up to 200%, and now pick up a change when you come back to the app (before, only when it started).

**Manual check on a phone (before other users join; about 20 minutes each):**
1. Android: Settings → Accessibility → TalkBack on. iPhone: Settings → Accessibility → VoiceOver on.
2. Open the app; swipe right through Home: each button should say what it does (e.g. "Mood: Good, button, not pressed").
3. Use heading navigation (TalkBack: reading controls → Headings; VoiceOver: rotor → Headings) on each tab: you should land on the section titles.
4. My Body → Record: each box should say its name (Week, Stones, Pounds, Body Fat %…); type a weigh-in and Save.
5. Open a Progress button, then close it: it should say "expanded"/"collapsed".
6. Settings → Account: turn on Lock the app; leave and reopen the app; the lock screen should be read and Unlock should work.
7. Set the phone's text size to the largest; reopen the app: text should be bigger and nothing cut off sideways.
Note anything that is read wrongly or can't be reached, and send it with 💬 Send Feedback.

**Still to do:** small (8–10 px) text sizes in older screens; text resize in a desktop browser's text-only zoom (page zoom works); the manual TalkBack and VoiceOver pass above on real phones; decorative emoji at the start of some button names are still read aloud (e.g. "camera Upload") — understandable, but noisy.

What works:
- The page language is set.
- Most screens are usable at 360 px without sideways scrolling.
- Photo features always have a text description field.
- New form controls (since v2.13) have accessible labels.

## 3. How to report a problem
Use **💬 Send Feedback** in the app (choose 🐛 Bug and describe the problem). It goes to the app owner's Tracker, and to the contact email if one is set. Tell us which screen and what assistive technology you use. We aim to reply within **10 working days**.
If you aren't happy with our response, you can contact the Equality Advisory and Support Service (EASS).

## 4. Plan and review
- Done: pinch-zoom (v2.15.2); contrast, colour cues, focus outline, icon-button labels (v2.17.0); dialog focus and Esc, 44 px touch targets, live status messages, more contrast fixes (v2.20.0); phone text size up to 200%, chart text alternatives, target spacing (v2.30.1). Still to do before other users join: small text sizes in older screens.
- Done (automated, v2.34.0): the TalkBack accessibility tree on the main flows. Then the manual TalkBack / VoiceOver pass above on real phones, and a keyboard pass.
- **Next review of this statement:** [by the pilot-user release, or 13 May 2027 at the latest].
