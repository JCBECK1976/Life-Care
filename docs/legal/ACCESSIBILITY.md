# Lifecare Companion™ — Accessibility Statement

> **DRAFT — for legal review before any users other than JC and Becks.** Based on a quick code review (13 Nov 2026), not a full audit.

Last updated: 18 November 2026 (draft 4, v2.30.1 on /build/)

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
| **Missing screen-reader labels** (axe clean on all checked screens since v2.20.0; full manual check still to do) | Around 50 of roughly 350 buttons have an explicit accessible name. Icon-only buttons and some form fields need labels. | 4.1.2 Name, Role, Value; 1.3.1 Info and Relationships |
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

**Still to do:** small (8–10 px) text sizes in older screens; text resize in a desktop browser's text-only zoom (page zoom works); a full manual audit with TalkBack and VoiceOver.

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
- Then a full WCAG 2.2 AA audit with a screen reader (TalkBack and VoiceOver) and keyboard.
- **Next review of this statement:** [by the pilot-user release, or 13 May 2027 at the latest].
