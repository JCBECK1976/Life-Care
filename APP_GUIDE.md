# Lifecare Companion™ — Complete App Guide

> **Purpose of this document.** This is the single source of truth for how Lifecare Companion™ works. It is read by the in-app **Help** companion to answer people's questions about using the app: what things are, where they are, what they mean, how to do something, when to do it, who it applies to and why it works the way it does. It replaces a traditional user guide.
>
> **Keep it current.** Whenever a feature is added, moved, renamed or removed, update this file in the same release.
>
> Last updated: v2.19.1 · 15 November 2026

---

## 1. What Lifecare Companion is

Lifecare Companion™ is a personal health and wellbeing app that brings together **exercise, eating, body composition, measurements and health records** in one place, and pairs them with an AI **Companion** that reviews your data and gives personalised feedback, like a knowledgeable friend who knows your whole picture.

The big idea: everything is connected. What you eat affects your body stats; your training affects your measurements; your bloods, medications and wellbeing shape what good advice looks like. Because the Companion can see all of it, its feedback in one area takes the others into account. For example, eating feedback can reflect your blood results, and exercise feedback can reflect a recent injury you logged in My Health.

### Who it is for
- Anyone tracking their health, training and nutrition over the long term.
- Several people can use the app on the same device. Each person has their **own data, colour theme, feedback and settings**.
- The app is not intended for anyone under 16.

### The Companion
The Companion is the AI built into the app (it uses Anthropic's Claude). It:
- writes **feedback** on your sessions, eating, body stats, measurements and health;
- holds **conversations** with you about that feedback (you can reply and it responds);
- **chats** with you about anything to do with your health (the 💬 chat button);
- **helps you use the app** (the ❓ Help button — this guide is what it reads);
- calculates **nutrition values and ratings** for food you add;
- generates **meal plans, shopping lists, exercise guides and warm-ups**.

It speaks to you directly ("you"), warmly and honestly, and adapts its tone to the mood you set on the Home page.

**One Companion that remembers.** Every conversation (Chat, Help, and the replies under each feedback) sends the conversation so far with your new message, so you can say "those two alternatives…" and it knows what you mean: the last 20 messages in full and a short summary of anything older (conversations are kept for 12 months). It also knows a short summary of your own recent conversations from the other areas (the last 14 days: eating, exercise, body, progress and chat), so its answers agree with each other. It never sees the other person's data or conversations. Its replies are labelled **Your Companion**.

The Companion never suggests starting, stopping or changing any medication or dose: if medication comes up, it suggests asking your GP or pharmacist.

You can pinch to zoom anywhere in the app (since v2.15.2). With a keyboard, the item you are on has a clear blue outline. Ratings are shown with a word and a symbol as well as a colour (✓ Great / ✓ Good / ! Amber / ✕ Red), and text colours meet the WCAG AA contrast level (since v2.17.0).

---

## 2. Finding your way around

### The header (top of every page)
- **Lifecare Companion™** title, with the logo on the left. Under it, in large letters, the **name of the person you are viewing** (it changes when you switch person).
- **Help ?** button (top right, left of the gear) — ask how to use the app. See section 9.
- **⚙ Settings** gear (top right) — opens Settings (colour theme, connections and data tools). See section 10.
- **Week N · Updated [date]** — your current **training week number**, counted from your programme start date, and when your data was last saved. "· Saving..." appears briefly while changes are being saved.
- **Person tabs** (e.g. *JC*, *Becks*) — tap a name to switch who you are viewing. The whole app switches to that person: their data, their colour theme, their feedback and settings. The highlighted tab is the active person. With many people, **swipe the row sideways** to see everyone; long names are shortened with "…". The row always scrolls to show the active person.
- **Adding a person** is switched off for now. It comes back with proper separate accounts for each person.

### The main tabs
| Tab | What it's for |
|---|---|
| **Home** | Your daily dashboard: greeting, Companion Energy, mood, My Day summary, journal, profile/setup and your overall Companion check-in. |
| **My Body** | Body composition stats (weight, body fat, muscle etc.) and tape measurements, with progress charts and feedback. |
| **My Exercise** | Your training plan by day, logging sessions, progress, exercise guides and session feedback. |
| **My Eating** | Planning and tracking meals, your food lists, ratings, nutrition totals, meal generator and eating feedback. |
| **My Shop** | Supermarket choice, Food Checker and your shopping list (generated from your eating plan). |
| **My Health** | Health profile and notes, health log, vital observations, medications, blood results and health feedback. |

### Help and Chat
- **Help ?** (top right, next to the Settings gear) — ask how to use the app. Your Companion answers using this guide.
- **💬 Chat** (round button, bottom right) — chat with your Companion about your health, training, nutrition or progress, using your full data history.

### Signing in
- The app asks you to **Sign in with Google** before it shows anything. Use your **joint Google account** (the one JC and Becks share).
- You only sign in **once per phone** (and once per installed app); it remembers you after that.
- **Fingerprint sign-in:** turn on a **passkey** for the Google account once (on the phone: Google account → Security → Passkeys → Create a passkey). Google then asks for your fingerprint instead of the password.
- If you see **"This Google account doesn't have access"**, you signed in with a different Google account: tap **Sign out** and choose the joint account.
- **Settings → 🔐 Account** shows which account is signed in, with a **Sign out** button.
- **Settings → 🔒 Privacy & your data:** **⬇ Download my data (JSON)** saves everything recorded for the selected person in one file (photos are never stored, so none are included). For the pilot, this card also shows the Privacy Notice and Terms (pilot version), your privacy choices (AI, photo checks, Google Health) and **Delete my data**; new pilot users are asked to accept these the first time they use the app.

### Installing the app on your phone
You can install Lifecare Companion like a normal app, with its own icon on your home screen. It then opens full screen, without the browser bar.
- **Use Chrome (recommended, Android):** open the app in Chrome, tap the **⋮** menu → **Install and create shortcut** → **Install** → **Install**. The app then appears on your home screen with its own icon. (Choose **Install**, not **Create shortcut**: a shortcut just opens the page inside Chrome.)
- **Samsung Internet:** its menu option **Add page to** → **Install as web app** may be **blocked by Google Play Protect** ("Unsafe app blocked … built for an older version of Android"). That warning is about the package Samsung Internet builds, not about Lifecare Companion. Don't tap "Install anyway": press **OK** and install from **Chrome** instead. (**Add page to** → **Home screen** only adds a bookmark that opens in the browser.)
- The **BETA** and **BUILD** test versions install as **separate apps** (named "Lifecare BETA" and "Lifecare BUILD", with purple and orange icons), so you can tell them apart from the normal app.
- Installed apps always load the latest version; nothing is stored offline.
- If Chrome says **"This app is already installed"** but then **"Could not open app"**, see Troubleshooting (section 13).

### Share to Lifecare Companion (Android)
Once the app is installed, you can send a photo straight from your Gallery, Camera or another app: tap **Share** → **Lifecare Companion**. The app opens and asks **"What is this?"**:
- **📏 Body measurements**: a screenshot from your scales or measurement app (goes to My Body → 📷 Upload).
- **📸 Progress photo**: goes to the **Body balance check** (My Body). Analysed, never stored.
- **🍽 Food**: checked in the Food Checker (My Shop).
- **Later (keep it)** keeps the image on the phone until you choose; **Discard** throws it away.

### Photos and privacy
Every photo you give the app (📷 Snap, 📷 Upload, Body Type Photos, measurement Snap, Body balance check, shared images) is **sent to the Companion to be analysed and then discarded: it is never stored**, not in the app's data and not in backups. Only the result is kept (values, ratings, scores and notes). You'll see this note under the photo buttons: *"Images are analysed and then discarded — they're never stored."*
- **No food in the photo?** If a food photo (📷 Snap, Food Checker, adding food by photo, Help Me with What to Eat) shows no food, you'll see *"No food found in this photo — try another photo, or add a description and Re-check"*. No rating or nutrition is shown and **Confirm** is greyed out: use **Re-check** (optionally with a description) or **Cancel**. Nothing is saved. The measurement 📷 Snap works the same way when it can't read a value, or when the photo shows a different body part (e.g. a calf photo when logging Bicep).
- **Body photos must be recognised.** In the **📸 Body balance check** each photo must be a person, full body, in the pose asked for (photo 1 front, photo 2 side, photo 3 back); in **Body Type Photos** each must be a person in one of the requested poses. If one isn't, you'll see e.g. *"Photo 2: This doesn't look like a full-body side photo — please retake it"*, no scores or analysis, and **Save** greyed out: use **Retake** or **Cancel**. Nothing is saved until every photo is valid.

### Common patterns used everywhere
- **My Companion … Feedback** buttons (deep blue) — generate AI feedback for that area. After it is generated, **▼ Show Feedback / ▲ Hide Feedback** opens or closes it.
- **Conversation threads** — under most feedback you can type a reply ("Respond to this feedback…") and the Companion answers. Your messages appear on the right in your colour; Your Companion's replies appear on the left in dark grey, labelled **Your Companion**. The **newest message is at the top**, with the reply box above it, and the box is always full width. Earlier conversation is remembered next time feedback is generated, so it respects what you pushed back on.
- **Feedback History** — older feedback is kept and can be shown with Show/Hide.
- **Open** — anything you've saved (a Progress week, a food list item, a meal you've chosen, a weigh-in or measurement entry) is shown as a short row with an **Open** button. Open shows it **read-only** first ("Viewing"). From there:
  - **Edit** makes it editable ("Editing"), then **Save** or **Cancel**;
  - **Remove** or **Delete** (see below) sits inside the form, never in the row, and always asks you to confirm;
  - **Close** closes it.
  The form slides into view when it opens, so it's never hidden below the screen.
- **Button colours (the same everywhere):**
  | Button | Colour | Means |
  |---|---|---|
  | **Edit** | deep blue | change it |
  | **Remove** | deep orange | take it out of a week, a meal or a history (your lists are not touched) |
  | **Delete** | red | permanently delete a list item or a measurement type |
  | **Close / Cancel** | grey | close without changing anything |
- **Outlined buttons** open things inside a card, each in its own colour: **Open** and **📷 Snap** (blue), **👁 Progress** (violet), **📋 Log** (green). While a panel is open its button turns solid dark blue (e.g. **✕ Progress**); tap it again to close.
- **Deep blue buttons** are main actions (e.g. the **My Companion … Feedback** buttons).
- Messages (green ✓ for success, red for problems) appear near the top of the page or inside the panel you're using.
- **Number boxes** (weights, reps, amounts) open the number keypad, and tapping one selects what's there, so typing replaces it.
- **Long forms** (e.g. the exercise log) keep **Save** at the bottom of the screen while you scroll. The 💬 chat button sits in the corner and leaves room under the last buttons.
- **Keyboard and screen readers:** Chat, Help and other pop-ups keep focus inside and close with **Esc**; on a phone every button is at least 44 px tall.

---

## 3. Home

### Greeting and welcome
"Good morning / afternoon / evening, [name]" with a rotating encouraging message. If no profile exists yet you'll see "New User".

### ⚡ Companion Energy
Companion Energy shows how much AI energy is left for Companion features, as a percentage. Every time the Companion generates feedback, answers a chat or calculates nutrition, it uses a little energy.

- **100%** is a full recharge; **0%** is empty. The bar goes down gradually as AI features are used. Normal use takes very little, so use the features freely.
- **↻ Refresh** checks the connection. (On opening the app it is checked at most once a day.)
- Status labels:
  - *Good energy / Getting low / Running low* — normal operation.
  - *Empty — recharge needed* — the AI service has no energy left. AI features won't work until the app owner recharges it.
  - *Recharged — level resets in Settings* — the AI is working but the bar needs resetting to 100% by the app owner.
  - *No API key / Invalid key* — the app owner needs to check the AI key in Settings.
  - *Rate limited* — too many requests in a short time; wait a moment.
  - *Connection error* — couldn't reach the AI service.
- If a feature shows "⚡ Companion Energy Empty. Please top up!", the AI service has genuinely run out. Let the app owner know.
- **For the app owner:** after recharging credit at console.anthropic.com, open **⚙ Settings → ⚡ Companion Energy Level**, enter the new balance and tap **Set as 100%**. The bar then runs from that level down to 0%.

### My Mood
Five faces: 😔 Really struggling, 😕 Not great, 😐 OK, 🙂 Good, 😊 Great. Tap one to set today's mood (tap again to clear). **Why it matters:** the Companion adjusts its tone to your mood. On a hard day it is gentler and more supportive; on a good day it can push you more. Mood resets each day.

### My Day
A summary of today: **My Eating** (today's planned breakfast, lunch, dinner, snacks and drinks by name, one line each; more than one snack or drink shows as e.g. "Apple +2 more"; with an **Open** link to My Eating) and **My Exercises** (today's session, or "No exercises planned"). Buttons take you straight to today in My Eating or My Exercise.

### Today: Planned vs Actual
Between My Day and My Journal. One table with two columns, **Planned** and **Actual**:
| Row | What it means |
|---|---|
| **Body burn** (bold; BMR + daily living) | What your body uses on an ordinary day. Same in both columns. |
| **Your goal deficit** | Your goal's daily adjustment, e.g. −359 (shown as **Your goal surplus** when your goal adds calories, e.g. Build fitness). The goal name and timescale are in the note under the table. Same in both columns. |
| **Exercise** | Planned: what that day's planned exercises would add. Actual: what your logged exercises and steps (above your allowance) add. |
| **Goal** (bold) | Body burn + your goal deficit + Exercise. |
| **Eating** | Planned: the day's selections at their original planned values. Actual: what's stored now, after portion changes, 📷 Snap checks and variations. |
| **On track** | In **both** columns: Planned = planned eating − planned goal, Actual = actual eating − actual goal, e.g. "−120" with "−6%" underneath: green at or under, red over. |
- **Week to date ±N%** (top right): everything you ate on the past days of this week that have something logged, against those days' goals. Today and future days never count, and nor do days with nothing logged.
- **▸ Show earlier days this week** shows the same table for each earlier day.
- The note under the table: *"Actual includes eating selections stored in the day which need to be kept up to date, plus any exercises logged when completed"*. In other words, keep your eating selections up to date and log exercises when you finish them, and the Actual column stays right.
- Until your goal setup is done the card says so and offers **Set up my goal**.

### My Journal
- **+ Add Journal Entry** — write how you're feeling or what's on your mind. Entries are dated.
- **Recent Entries** and **Full History** — read past entries; **🗑 Del** removes one.
- **Why:** journal entries give the Companion context (stress, life events) so its feedback fits what's going on.

### ▼ My Profile (setup questionnaire)
Tap **▼ My Profile** under the greeting to open your setup. It has tabs:
| Tab | What you enter |
|---|---|
| **My Profile** | **My goal** with **Change my goal**, your Companion's **recommended target weight**, your auto-generated profile summary (name, sex, height, ideal weight, date of birth, body type, fibre dominance) and **My Companion Recommendations**. |
| **My Details** | Basic personal information. Also **📸 Body Type Photos** and baseline body composition. |
| **My Family** | Who you live with and relevant family health history. |
| **Personality** | Your personality style, which shapes motivation and habit-formation advice. |
| **Lifestyle** | Daily routine, work pattern (e.g. home/office days) and current activity level. |
| **Food & Drink** | Current eating habits and relationship with food. |
| **Wellbeing** | Sleep, mental health and neurodiversity, which affect how support is approached. |
| **My Health** | Medical history and current health status. |

Tap **Save Setup** to save answers. 🔒 Your information is private and used only by your Companion.

**My Companion Recommendations** (in My Profile) generates personalised **daily nutrition targets** (calories — always your goal's daily calorie goal — protein, saturated fat, added sugar, fibre) and **body composition goals** (target weight, body fat, waist, visceral fat), split into 🏋️ Activities, 🥗 Dietary and 🏥 Medical advice. Complete the other tabs first for the best result.

**📸 Body Type Photos / 🔍 My Companion Body Type Check** — upload photos (front relaxed, bicep flex, side profile, back, quad flex and calf raise) and the Companion assesses body type, muscle fibre dominance and an ideal weight range, combined with your answers and body comp data. Results are estimates from photos, not clinical measurements. The photos are analysed and then discarded: only the date, the file name and the analysis are kept.

**📊 Baseline body composition** — upload a screenshot from your scales app so the app has a starting point.

### My Companion Feedback (Home check-in)
The overall **Companion Check-in** looks across everything (exercise, eating, body, health, mood, journal) and gives **What's going well**, **Opportunities** and **Focus next 2 weeks**. You can reply in the conversation thread underneath.

---

## 4. My Body

### My Body Stats
Tracks body composition, usually from a smart scale:
**Weight, Body Fat %, Muscle Mass, Muscle Rate %, Visceral Fat, Subcutaneous Fat %, Body Water %, Bone Mass, BMR (kcal), Body Age.** Each shows a status (e.g. Acceptable / Too High, Standard / High, Excellent) where relevant.

- **📋 Record** — type in today's values. **My Notes** (e.g. "birthday week", "after a long flight") is saved with that weigh-in; every Companion allows for it when reading your numbers. Measurements have My Notes too.
- **📷 Upload** — upload a screenshot from your scales app; the Companion reads the values ("✓ Values extracted — review and save"). Check them, then save.
- **👁 Progress** (under each stat) — the history, newest first, one row per week (week + value) with **Open**, and a chart once there are 2+ entries. **Open** shows the entry read-only (week, value, note); **Edit** to change it and **Save**, or **Remove** to take it out (asks first).
- Your calorie goal is shown on **Home** and on each day in **My Eating** (see "Your goal and your calorie goal" under My Eating). Weigh-ins with body fat % make it more accurate.

### My Body Measurements
Tape measurements in cm (e.g. chest, waist, hips, arms, thighs).
- For each measurement: **📋 Log** today's value (shows **Previous** for comparison) with an optional **Note**.
- **📷 Snap** (in the Log form) reads the value from a photo, e.g. a tape measure or a scale screen:
  1. Optionally describe it first ("tape at nipple level", "reading in inches"), then take the photo.
  2. The Companion shows the value it read and where it read it. You can still edit the description.
  3. **Confirm** fills in the value (then press **Save**); **Re-check** asks for an independent, closer look and shows the first reading for comparison; **Cancel** keeps nothing. Nothing is saved until you Confirm and Save, and the photo is never stored.
- **👁 Progress** shows the history (week + cm, with **Open** on each row) and a chart. Open → **Edit** / **Save**, or **Remove** (asks first).
- **Measurement Settings** — **Edit** (rename) or **Delete** (red: deletes the measurement type and all its data; asks first).
- **+ Add Body Measurement** — add any body part to track (e.g. Hips, Neck, Thigh).
- **When:** re-check every 4 weeks. Measure chest at nipple level and waist at the midpoint between the lowest rib and the hip bone, the same way each time.

### 📸 Body balance check
At the bottom of My Body. It's off until you tap **Turn on body balance checks** (each person chooses for themselves).
- About **every 4 weeks**, choose **front, side and back** photos (same light, same distance, relaxed). Until you have done one, it says "No progress photos yet".
- The Companion scores the same checklist each time from 1 to 5, with a short note each: upper chest, lower chest, shoulders, shoulder-to-waist ratio, left/right arm symmetry, back, core/waist, glutes, quads and calves.
- From the second check on, it compares with your last check (▲ / ▼ with the old and new score) and with your tape measurements.
- It may flag a region that is developing faster or slower, or a left/right difference, with **one suggested training adjustment**. Suggestions only: tap **Accept suggestion** if you want your Companion to keep it in mind. Nothing in your plan changes by itself.
- **The photos are analysed and never stored**; only the scores and notes are kept. **Turn off body balance checks** at the bottom.

### Feedback
- **My Companion Body Feedback** — reviews body comp and measurement trends (weight, body fat, muscle) cross-referenced with your eating, activity and health data.
- **My Companion Measurement Feedback** — reviews tape-measure trends and evidence of recomposition (losing fat while gaining or keeping muscle).

**Why track accurately:** the Companion can only give good advice from honest, consistent data. Measure at the same time of day, under the same conditions.

---

## 5. My Exercise

### Day tabs
**Sun Mon Tue Wed Thu Fri Sat** — each day shows that day's session. The current day opens by default from My Day.

### Session layout
1. **🔥 Warm-Up (~3 min)** — tap to expand. Generated for the session's exercises.
2. **Exercises** — one card per exercise.
3. **🧊 Cool-Down** — tap to expand.
4. **🔥 Generate / 🔄 Regenerate Warm-Up & Cool-Down** — creates or refreshes them (they also regenerate automatically when exercises change).
5. **+ Add Exercise**.
6. **My Companion Session Feedback**.

### An exercise card
- **Name** and the latest **weight · reps** (e.g. 40kg · 12x3), plus the exercise type if not weights.
- **Status badge**, set by your session feedback:
  | Status | Meaning |
  |---|---|
  | **Building** | Below your rep target; keep building reps at this weight. |
  | **Consolidating** | Hit your target once; repeat it to confirm. |
  | **Ready to Move** | Hit your target two sessions in a row; ready to increase weight. The card shows a concrete next step, e.g. **"Next: try 49–55 kg (the next 1–2 steps on your stack)"**, and a **My next weight** box (or reps / seconds for that exercise): type the exact value you'll use and tap **Set**. The card then shows it like any progressed exercise: the new target as the headline (e.g. **70kg · 12x3**, reps at the bottom of your range), status **Moved Up**, and **"✓ Next weight set: 70 kg"** with **Undo** for about 5 seconds. Your next log pre-fills it, and Previous still shows last week. The week's note is one line (e.g. *"Wk18: next weight 70 kg (set by you)"*), replaced if you change it, never repeated. To change it later, tap **✎** on the exercise and change the weight. (Your stack steps come from "increments: 45, 47, 49" in the exercise's progression notes, if you add them; otherwise the usual pin stack.) |
  | **Moved Up** | Weight has been increased. |
  | **Maintaining** | Deliberately holding at this weight. |
  | **Reduce** | Weight has been dropped (e.g. form or recovery). |
- **📋 NOTES FROM LAST SESSION** — notes you left last time, carried forward.
- **👁 Progress** (violet outline) — opens the progress panel.
- **📋 Log** (green outline) — opens the log form.

### Logging a session (📋 Log)
- The form says who it is for (**Logging for JC**). It belongs to that person: if you switch person in the header while it is open, the app asks first ("Discard JC's unsaved log entries and switch to Becks?"), so you never log one person's sets against another.
- Enter each **set** separately: weight and reps per set (e.g. 63 kg × 10, 56 kg × 8, 63 kg × 8), or the right measure for the exercise type. A new log is pre-filled with each set from your last session — **except** when the exercise is Ready to Move, a progression was accepted, or you set your next weight: then it pre-fills the **next** weight with reps at the bottom of the range (e.g. 49 kg × 12), shown as **"Progression: 49 kg × 12 (…) — pre-filled below"** under **Previous** (Previous always shows last week, never the progression).
- **Session Quality:** for **Range** (Full Range of Motion, or Completed in One for cardio-type exercises) and **Form**, tap **Working towards** or **Good**. **Neither is chosen for you**, and you can't save until both are chosen. If you try, the missing one is outlined in red with "Choose Form and Range to save". If Range is "Working towards", the Companion won't recommend increasing weight; it will tell you to master the full controlled range first, using a 3-second lowering phase.
- **Progression** choice: *Standard (follow progression rules)*, *Move Up* (override: ready to increase), *Hold* (keep current weight) or *Reduce* (drop weight).
- **Week** starts at the **current training week** (the week in the header). If you've already logged this week, the form opens that entry so you **Update** it instead of logging over it. **Previous** shows your latest logged week before this one.
- **My Notes (carried to next session)** appear on the card next time. Every box for your own notes is called **My Notes** across the app, so you can tell it apart from the Companion's feedback.
- **Logging for more than one person:** the person tabs inside the form let you log someone else's sets for the same exercise in the same sitting. When you press Save, the person shown must have Form and Range chosen. Anyone else you filled in is saved **only if** their Form and Range are chosen too. One line confirms it, e.g. "Saved for JC · Becks not saved (Form and Range not chosen)".
- **Save** (or **Update** when editing a previous entry). **Edit Previous Entry** lets you correct a past week; **Cancel Edit — Log New Instead** returns to a new log.
- **Why honesty matters:** the Companion bases its progression advice on what you log. Inflating reps leads to bad recommendations.

### Progress panel (👁 Progress)
- One row per week: week, weight, reps and **Open**. Form and Range are shown inside **Open**. **+ Add Week** adds a missed week; a chart appears once there are 2+ weeks. When the sets in a week used different weights, the row (and the card) shows the range, e.g. **56–63kg**, with a **Sets:** line underneath (63kg×10, 56kg×8, 63kg×8).
- **Open week N** shows that week read-only: each set, **Range** and **Form** (as a chip: **Good** or **Working towards**), **My Notes**, and the **Companion Feedback** for that week (if any) with **your decision** (Accepted / Rejected and your note). **Edit** lets you change the week number, any set (**+ Add set**), Range, Form, My Notes and your decision on the feedback, then **Save**. **Remove** takes the week out (asks first).
- Changing or removing an **older** week never changes the exercise card or its status badge. Only the latest week does: if you change or remove it, the card shows the new latest week and the status clears until your next session feedback.
- **Strength vs Population** — an estimate of where your performance sits against people of your sex and age (untrained, and including trained). Estimated from cable machine performance, so treat it as a guide, not a test result.
- **ℹ️ Exercise Information:** **📖 Exercise Guide** (how to perform it), **🧘 Pre & Post Exercise** (prep and stretches), **Progression Rules** (your editable rules, e.g. build to 15 reps before increasing weight). Guides are AI-generated, so review them for accuracy. Older exercises can use **🔄 Generate / Update Guides**.
- **Exercise Settings:**
  - **✎ Edit** — change type, sets, starting values, progression rules, notes and equipment/form notes. AI recommendations are fetched to help.
  - **🗑 Delete** — permanently removes the exercise and all its history.
  - **⏸ Stop Exercise** — pauses an exercise without losing anything (see below).
  - **▶ Restart Exercise** — shown instead of Stop on a stopped exercise.

### Stopping and restarting exercises
- **⏸ Stop Exercise** hides the exercise from the day's list. All history stays exactly as it was. It applies to that day's exercise only; if the same exercise is on another day, that one stays active.
- Stopped exercises are listed under **▼ Stopped Exercises (n)** after the last active exercise. Tap to show them, marked **⏸ Stopped**.
- Stopped exercises are **view-only**: you can see progress and details, but you can't log them. They're also left out of session feedback.
- To use one again: open its **Exercise Settings** → **▶ Restart Exercise**. It returns to the active list exactly as before.
- **When to use:** injury, equipment change, a programme rotation, or anything you want to pause rather than delete.

### Exercise types
Weights, Bodyweight, Timed Hold, Cardio, Walking, Sports/Activity, Stretching/Mobility. The type decides what you log (weight and reps, time, distance, sessions, etc.).

### + Add Exercise
Search the exercise database or type a new name. Select a match or **Add Custom**, confirm the type and starting values, and the Companion suggests progression rules and generates guides.

### My Companion Session Feedback
Generate after logging a session. It includes:
- **Session Companion Check-in** — summary of the session.
- **Next session** — what to aim for next time.
- **Exercise Feedback & Recommendations** — per exercise: a verdict, a status and a recommendation (e.g. increase weight, add reps, hold). For each one you can **Accept** or **Decline**, optionally adding a note explaining why. Shows *pending* until you've reviewed all, then *All reviewed*. Your decisions and notes are remembered next time.
- **🗑 remove** — removes that exercise from the day (asks first).
- A conversation thread to discuss the feedback.
- The Companion follows your progression rules strictly (e.g. it won't recommend a weight increase until the rep target is met two sessions in a row) and considers the same exercise on other days, your health log, medications, body comp and mood.

---

## 6. My Eating

### Layout
- **Update Eating Lists** manages your food lists (see below).
- **🔄 Re-rate all lists** re-rates every list item using the portion bands below. Items whose rating changes get a 🔄 and a **Check me** badge.
- **🔎 Re-check nutrition** checks every list item **per portion**. Anything whose saved calories look like a **whole recipe**, a **per-100 g** value, or far from one portion is marked **Check me — confirm portions** (e.g. "the saved 2,400 kcal looks like the whole recipe (about 4 portions); one portion is about 600 kcal"). It changes nothing itself: open the item, **Edit**, and press **✓ Confirm**; your Companion works out the values per portion with you.
- **Clear Week** removes all meal selections for the week (asks first).
- **Day tabs:** **Week** (whole-week view) and **Sun–Sat**. The week runs Sunday to Saturday, the same as exercise. Each tab shows that day's calories.

### The rating system (RAG)
Every food is rated for **one portion as you eat it**, on saturated fat and added (free) sugar (sugar added in cooking or processing, not the natural sugar in fruit or plain milk). The higher of the two decides:
- **Your food lists** (shared by everyone) are rated against the **UK reference intake**: **2,000 kcal**, **20 g saturated fat** and **25 g added sugar**. So a list item has the same rating for everyone.
- **Your selections** (the meals on your days) are rated against **your own goal and limits**: your daily calorie goal, with saturated fat and sugar limits scaled to it (never above 20 g / 25 g if a condition such as high cholesterol or prediabetes makes them a priority).


| Rating | One portion uses | How often |
|---|---|---|
| **GREAT** | up to 10% of a daily limit | any day |
| **GOOD** | up to 25% | daily |
| **AMBER** | up to 50% | a few times a week (up to 3) |
| **RED — weekly treat** | up to 80% | once a week |
| **RED — monthly treat** | over 80%, or more than 40% of the day's calories (2,000 kcal for list items, your goal for your selections) | once a month |

Plenty of fibre (5 g+) or protein (20 g+) lifts an item one band (never above AMBER if it's over 50%). For example, 3 biscuits come out AMBER and a large brownie with ice cream comes out RED monthly treat. The rating is calculated the same way every time, and the reason shows when you hover or tap (e.g. "AMBER: one portion is 10g added sugar = 40% of the 25g daily limit").

**Why can a meal be rated differently from the list?** Because your selection is rated against *your* goal. If it differs you'll see a note such as **"RED today — for your goal"** (or "— large portion" / "— with changes" when you changed the portion). Example: a 760 kcal pasta is GREAT on the list (38% of 2,000 kcal) but RED for someone whose goal is 1,767 kcal (43% of their day). The ⚠️ "already … this week" warnings use the same rating you see on your day.

**Your meals have their own rating.** When you log a food, that meal keeps its own copy of the food and its own rating, worked out from what you actually ate (e.g. a bigger portion). The selected item's text is coloured by that rating. The ⚠️ warnings ("already 3 times this week") count what you actually logged. Editing or deleting a list item **never changes past days**.

### A day tab
**Daily Eating Tracker** with **Breakfast, Lunch, Dinner, Desserts, Snacks, Drinks**:
- Each slot is a searchable picker of your list items, colour coded by rating, with kcal. The search forgives spelling ("porrige" finds porridge). On a phone the rows are large, your current choice is highlighted, and **✕ Close** closes it. After you pick, the row flashes and **"Added: …"** appears at the bottom with **Undo** for about 5 seconds. On a phone the picker opens as a full-screen sheet with the search box at the top, so the keyboard never hides the results.
- **+ Add New** adds another row for that meal; an empty extra row has a **✕** to remove it.
- **Open** (next to 📷 Snap) on a filled slot opens **that meal's own copy** of the food, read-only: portion, changes, nutrition, its rating today and your list item's rating (with why they differ, if they do).
  - **Edit** → set the **Portion** (½×, 1×, 1½×, 2× or type a number) and any **Changes** ("chips instead of potato", "no sauce"). With changes, the Companion recalculates the nutrition of what you actually ate and the rating is worked out again. A portion change on a photo-checked meal scales the photo's values.
  - **Save** shows *"Saved for this meal only. To update the list item permanently, please go to 'Update Eating Lists'."* Your list item is never changed here.
  - **Remove** takes the food out of this meal (asks first). It doesn't touch your list.
  - **Open** on an empty slot starts adding a food to that meal.
- **📷 Snap** (on every slot, empty or filled) photographs your food:
  1. Optionally describe it first ("large plate", "2 sausages", "28g bar", "half eaten"); the Companion gives your description priority. Then **📷 Take photo**.
  2. The result shows the food, its values, its rating and the weight it assumed, e.g. **"Assumed: ~450g — rice 200g, frankfurters 120g, beans 130g"**.
  3. **Confirm** saves it; **↻ Re-check** asks for an independent **deep dive** (component by component, with grams), shown as "Re-check deep dive — re-assessed outcome" with a comparison line ("First check: large · RED → Deep dive: medium · GOOD"). You can change the description and re-check again. **Cancel** saves nothing.
  4. On Confirm:
     - the **same food** as the slot updates this meal's portion only;
     - a **different food** updates the slot (with **Undo**);
     - a food that **isn't in your list** asks once: **"Save <food> to your <slot> list for future selection?"** Yes adds it to your list; No keeps it for this meal only.
  5. A ✓ shows the portion was checked by photo.
- **Dinner sides**: for packaged products, add 🥔 Potato and 🥗 Veg sides.
- **+ Add new item…** at the bottom of any picker adds a food that isn't on your list (see "Adding food").
- **My Notes** (day notes), e.g. "Ate out, exam stress, birthday", give the Companion context.
- **📋 Copy Day** copies this day's selections to other days. Copies start fresh: portions and ticks are not copied.
- **Nutrition Overview (g)** shows the day's totals (from what you logged) and the **Daily Percentage of Recommendations**.
- **🍽 Help Me with What to Eat**: when you're out, describe where you are, optionally add a photo of the menu or shelf, and the Companion picks the **best option**. **✓ Confirm & Add** puts it in your day.
- **My Companion Eating Feedback** gives feedback on the day. It knows the difference between what you've **eaten** (days before today) and what is still **planned** (today onwards): the feedback is headed **What you ate** or **Your plan**, and for a plan it talks about what you're about to eat rather than judging it as eaten. If feedback is cut off or doesn't come back, it says so; press the button again.
- The reminder line: *It's important to track accurate and honest information for your companion to give you the most appropriate feedback. Use 'Update Eating Lists' to update eating selection list items.*

### The Week tab
- **My Week** shows average kcal/day. **📋 Copy Week** copies the week's selections to future weeks.
- **Week — Nutrition Overview (g)** has a table per day plus totals and percentages of your recommendations.
- **⏱ Quick Prep Days**: tick days when you're short of time; the generator then picks dinners within that prep time.
- **Set Defaults** sets default meals for each slot (**Individual** or **All**).
- **My Companion Meals Generator**, for every day and slot:
  1. keeps what you've already chosen;
  2. otherwise uses your **default**;
  3. only then fills the empty slot from that slot's list.

  It never invents items. If a list is empty, those slots stay empty and the summary says so (e.g. "Breakfast: your default · Lunch: 1 kept, 6 generated · 1 slot left empty").
- **My Companion Week's Feedback** shows patterns and trends across the week. It's headed **What you ate** (a past week), **Plan review** (a week that hasn't started) or **So far this week + the rest of your plan**.
- Then go to **My Shop** for your shopping list.

### Update Eating Lists (your food lists)
Tap **Update Eating Lists** to open **🍽️ My Eating Lists**. At the top are three tabs for adding food (**Single item**, **Build a meal**, **My own**); below are your lists (Breakfasts, Lunches, Dinners, Snacks, Desserts, Drinks), colour coded with kcal.

**Everything is per portion.** Every item and meal shows its values **per portion**, with what a portion is, e.g. *"1 portion = ¼ jar (88 g)"* or *"1 portion = 1 of 4 servings"*. Packaged foods keep the label's per-100 g values behind the scenes, and the app works out your portion from them.

#### Single item
Start typing: after 2 letters results appear as you type, in this order: **In your lists**, **Common foods** (the app's foods and a built-in list of everyday UK foods marked **Typical values**, e.g. dried pasta shapes at 75 g dried per portion, rice, potatoes, bread, eggs, meat, fish, fruit and veg, milk, cheese, oats) and **UK products** (Open Food Facts). Pick one, check the name and **My portion size (g)** (the values follow as you type), **Confirm**, choose the lists to add it to, and **Save**.
- **Spelling doesn't matter.** Typos, missing or swapped letters and sound-alikes still find it ("fruselli" finds fusilli, "penny" finds penne, "spagetti", "brocoli"). Plain words work too: "pasta spirals", "pasta shells", "bag of dried pasta" or just "pasta" list the pasta shapes (spirals = fusilli, shells = conchiglie, tubes = penne, bows = farfalle, ribbons = tagliatelle).
- **Can't see it? Describe it instead.** Type it in your own words (e.g. "bag of dried pasta spirals"); your Companion works out what it is and offers 1–3 choices to tap. If it isn't sure, it asks you.
- **Check the portion.** A UK product that only has per-100 g values, or is a sauce, jar, condiment or spread, shows its type (e.g. **sauce / jar**), its pack size and "1 portion = … g". You confirm the portion (**Yes, 1 portion = …**) before you can add it. This stops a jar of pasta bake *sauce* at 107 kcal per 100 g being added as a portion of pasta bake. A sauce with no pack size starts at **¼ of a typical 500 g jar (125 g)** — adjust it. Ready meals (e.g. a supermarket pasta bake) are labelled **ready meal**; **dried pasta** only means plain dried pasta.
- If UK product search isn't responding, your lists and common foods still show; tap **Try again**.

#### Build a meal
For meals made of several things, e.g. a pasta bake: search on the left (the same forgiving search: your lists, common foods, UK products) and tap items to move them to the right. When you tap one, the search clears, **"Added: …"** appears and the new ingredient is highlighted. Tapping something that's already in the meal asks *"… is already in this meal. Add another portion?"* (**Yes** adds a portion to that row, **No** leaves it). Set an **amount** for each (**portions**, or **grams** for items whose weight is known), name the meal and answer **How many portions does this make?** (required, there's no default; until you fill it the box shows the whole dish's total). For a bake, curry, stew, pie, chilli or lasagne, or anything over 900 kcal, a note asks *"Is this the whole dish? Most bakes serve 3–4."* Each ingredient is a small card: its name, then amount, unit and kcal, with **✕** to remove it. UK products with only per-100 g values come in **in grams** (the pack size) so you can check the amount. The values per portion are **Σ ingredients ÷ serves**, worked out by the app itself, no AI. Example: a jar of pasta bake sauce (500 g) + penne (250 g) + mozzarella (125 g) + chicken (300 g), serves 4 → about **445 kcal per portion**. **Next** → choose lists → **Save**.

**After Save** you stay on the form: it shows **"✓ Saved … to Dinners (… kcal per portion)"** with **Add to a day** (choose the day, today by default, and the meal, by default the list you ticked) and **Done**. If you already have a different item with the same name in that list, the app asks first: **Replace it with this one** or **Keep both**. This works the same for Single item, Build a meal and My own.

#### My own (create my own item)
Describe it (ingredients, amounts, brand) and tap **Send**. Your Companion asks about anything it needs, one question at a time: raw or cooked weights, amounts, the brand, or **how many portions it makes**. Answer and **Send** again. When it has enough it shows the values **per portion** (and any assumptions); **Confirm** → choose lists → **Save**. Items you create can be used in **Build a meal**.

#### Adding from a meal slot
Each meal drop-down shows **only the items already in that list**. If what you want isn't there, choose **+ Not in my list?** at the bottom. Update Lists opens, saying *"Adding for Monday lunch"*. Add the item any of the three ways and leave **Add to Monday lunch now** ticked; when you **Save**, it's added to your list **and** to that meal, and you're taken back to that day, scrolled to the meal, with it highlighted and **"Added to Monday lunch"** with **Undo** at the bottom. Carry on choosing the rest of the day. **Back to Monday lunch** returns without adding.

#### Your lists
- **Check me** badge: items added by bulk upload, flagged by Re-rate or Re-check nutrition, or **older recipes that need their portions confirmed** ("Check me — confirm portions"), show **Check me** next to the name. Tap or hover for the reason. It clears once you open the item and save it.
- Each row has **Open**: portion, calories and nutrition per portion, rating (and why), type, ingredients. **Edit** opens the item: name, type and ingredients. If you change the ingredients, your Companion works out the new values **per portion** with you (the same conversation as **My own**), then press **Save**.
- **Meals** you built show their ingredients and **Edit meal**: add or remove ingredients and change amounts and **Serves**. To change an ingredient's own nutrition, edit that item in your list.
- **Delete** (red, inside the Open form) deletes an item from your list (asks first). Past days keep their own copy, so nothing you logged changes.
- **📷 Photo or bulk paste** adds an item from a photo, or many at once (**📋 Bulk**).
- **✕ Close** closes the lists.

### Adding food by photo
Under **Update Eating Lists → 📷 Photo or bulk paste**, tap **📷** to photograph a food or label. Your Companion gives the values for **one portion** ("1 portion = 1 bar (60 g) · values per portion": the label's per-serving values, or a sensible portion of what's shown). **Review Item** shows them with the rating and how it suits you; choose the lists and confirm. Duplicates are detected.
- If it can't tell the portion (e.g. a pot or a big tub?), it **asks you** in **My own** instead of guessing.
- If you change the ingredients on **Review Item**, **✓ Confirm** opens **My own** with them, so the values are worked out per portion with you.
- Typing a description in this form (and **Add**) also opens **My own**.

### Adding food — bulk
Under **📷 Photo or bulk paste**, tap **📋 Bulk** and paste a list (one per line or comma-separated).
- **Choose a category**: none is pre-selected, and the button says "Choose a category first" until you do. You're asked to confirm, e.g. "Add 14 items to Drinks?".
- Long lists are rated **10 at a time** with a progress bar, and each batch is saved as soon as it's done. If a batch fails, **Retry** re-sends just that batch.
- **Cancel** really stops: anything still on its way is ignored. If earlier batches were already saved, you're told how many, with **Undo**.
- Every line gets values for **one portion** with what a portion is ("1 portion = 1 bag (25 g)"); answers that don't make sense are re-asked automatically.
- Lines your Companion can't work out aren't dropped: they're listed as **"needs a little more from you"**, each with **Finish with my Companion**, which opens the conversation with its question.
- When it finishes, a message (tap **OK**) reminds you that ratings are AI estimates. New items show **Check me** until you've opened and saved them.

### Ingredients and the shopping list
For prepared dinners, the ingredients become shopping list items. For packaged items, the product itself goes on the list.

---


### Your goal and your calorie goal (Home and My Eating)
Everyone chooses **one goal**. It sets your daily calorie goal everywhere (Home, My Eating and every Companion) and how your Companion frames its feedback.

| Goal | What it means | Calories |
|---|---|---|
| **Work towards a healthy body weight** | Lose weight steadily and improve your body composition, at a pace that's healthy and sustainable. | A deficit sized by your **timescale** |
| **Maintain a healthy lifestyle** | You're in a good place: keep your health, exercise and eating balanced. | Maintenance |
| **Build fitness & strength** | Grow muscle, strength and fitness, fuelled properly. | A small surplus (about +7.5%); maintenance if body fat is high, to build muscle while losing fat ("recomposition") |
| **Grow to a healthy lifestyle** | A combined approach: healthier eating, regular exercise and better body composition, together. | A gentle deficit (about 10%) if above a healthy weight, otherwise maintenance |
| **Support my health** | Shape your eating, exercise and body composition around your health conditions — always alongside your GP's advice. | A modest deficit (up to 10%) only if above a healthy weight; nutrient priorities from your conditions (e.g. saturated fat for cholesterol, sugars for blood glucose). Needs at least one condition in **My Health → My conditions**. |

- **Setting it up (needed once):** your goal (and timescale where it applies), sex, age, height, current weight and your **typical activity level** (*Mostly sitting*, *On my feet a fair bit*, *Very active*). The app opens this for new people and once for existing people; until it's done, the calorie goal isn't worked out. Change it any time: **Home → ▼ My Profile → My Profile → Change my goal**.
- **Daily calorie goal = Body burn + Aim + Exercise.** Body burn is your BMR (from your lean mass over your last 3–4 weigh-ins) plus daily living. On a day with step data from Google Health it's BMR × 1.15 and steps above your allowance count as exercise; on other days it's BMR × your activity level (1.15 / 1.3 / 1.45).
- The goal never goes below your **safe minimum** (90% of your BMR, and at least 1,200 kcal for women / 1,500 kcal for men).
- **▸ How this is calculated** (under the table) shows every number used, and your **activity adjustment %**.
- This is wellness guidance, not medical advice: talk to your GP before big changes to your diet.

#### Questions about goals and calories
**What does each goal mean?**
See the table above. In short: *healthy body weight* = steady weight loss to a healthy weight by your chosen timescale; *maintain* = keep things balanced at maintenance; *build fitness & strength* = fuel training with a small surplus (or maintenance for recomposition); *grow to a healthy lifestyle* = improve eating, exercise and body composition together with a gentle deficit if needed; *support my health* = shape everything around your health conditions, alongside your GP's advice.

**How do I change my goal?**
**Home → ▼ My Profile → My Profile → Change my goal.** Your Companion may also suggest a change (for example, switching to *Maintain* once you've been in the healthy weight range for 6 weeks or more, or a longer timescale if your pace looks hard to keep up). It's only a suggestion: you choose **Accept** or **Not now**.

**How does the timescale slider work, and what are the safety limits?**
For weight goals you choose **3 to 24 months**. Your **target weight is recommended by your Companion** (see below); you can accept it or change it. It works out the weekly pace and the daily gap (about **7,700 kcal per kg**). The colour tells you how healthy that pace is:
- **green**: a healthy, sustainable pace;
- **amber**: brisk (more than 0.75% of your body weight a week, or a gap of more than 20% of your body burn);
- **red**: too fast (more than 1% of your body weight a week, more than 25% of your body burn, or below your safe minimum).
On amber or red it offers steadier options such as **"Steady: 7 months · Gentle: 10 months"**: tap one to use it. If you keep a red pace anyway, the daily aim is still limited to 25% of your body burn and never below your safe minimum. A target below a healthy weight (**BMI 18.5**) can't be chosen.

**How is my target weight worked out?**
Your Companion recommends it from your profile; you don't have to come up with a number. It shows as *"Your Companion recommends: 85.6 kg (range 83.5–87.8 kg)"* with a line saying why, in the goal setup and in **My Profile**.
- **With body composition** (weigh-ins with body fat %): target = your **lean mass ÷ (1 − a healthy body-fat %)** for your sex and age: men 40+ 18–22%, women 40+ 25–31%, a little lower for younger adults. The mid-point gives the target and the ends give the range. This suits muscular people better than BMI. Example: 91.9 kg at 25.5% body fat = 68.5 kg lean ÷ 0.80 = **85.6 kg**.
- **Without body fat %:** the top half of the healthy range for your height (BMI 22–24.9), labelled **estimate — add body composition for a better target**.
- **Accept** it, or tap **Change** and type your own. If yours is different you'll see *"This isn't your Companion's recommendation based on your profile"*. Both figures are kept, and your Companion may gently mention the recommended one in feedback. A target below a healthy weight (BMI 18.5) can't be chosen, and the timescale safety limits still apply.
- The recommendation is recalculated as your body composition changes. If it moves by 2 kg or more, your Companion suggests updating your target on the Today card (**Accept** or **Not now**).

**What is my typical activity level for?**
On days without step data it decides how much daily living adds to your BMR: *Mostly sitting* ×1.15, *On my feet a fair bit* ×1.3, *Very active* ×1.45. On days with steps from Google Health the app uses ×1.15 plus the steps you actually walked above your allowance, so nothing counts twice.

**What do the rows in the Today table mean?**
**Body burn** is what your body uses on an ordinary day. **Aim** is your goal's adjustment (− for a deficit, + for a surplus). **Exercise** is what exercise adds: *Planned* from the day's planned exercises, *Actual* from what you logged and your steps. **Goal** is the sum. **Eating**: *Planned* is your selections at their original planned values, *Actual* is what's stored now, after portion changes, 📷 Snap checks and variations. **On track** compares actual eating with the actual goal: green at or under, red over.

**What does the note "Actual includes eating selections stored in the day…" mean?**
The Actual column can only be as good as what's in the app. Keep each day's eating selections up to date (change portions, Snap or skip what you didn't eat) and log exercises when you finish them, and the Actual column and "Week to date" are right.

**What does "Week to date" show, and why doesn't it count today?**
It adds up what you ate on the past days of this week and compares it with those days' goals, e.g. "Week to date −4%" (green at or under, red over). It counts only **complete days** (Sunday to yesterday) that have something logged: today isn't finished yet, future days haven't happened, and a day you forgot to log doesn't drag your score down. Tap **▸ Show earlier days this week** for each day's table.

**What is BMR and why does it change?**
BMR (basal metabolic rate) is the calories your body burns at complete rest. The app uses the Katch-McArdle formula on your **lean mass** (weight minus fat), averaged over your **last 3–4 weigh-ins** that include body fat %. So it moves as your weight and body fat change; more muscle means a higher BMR. If body fat % is missing it's estimated from weight, height, age and sex (labelled **estimate**): add a weigh-in with body fat % for a better figure.

**Why don't my first few thousand steps add calories?**
Daily living already includes a normal amount of walking about. That amount is your personal **step allowance** (worked out from your height, weight and BMR, between 2,000 and 3,500 steps). Only steps **beyond** it count as exercise, so they aren't counted twice.

**How are exercise calories counted?**
Only the **extra** you burn compared with resting. Each type of exercise has a **MET** value (weights 5.0, bodyweight 3.8, cardio 7.0, timed holds 2.8, stretching 2.3). Extra calories = (MET − 1) × your weight in kg × hours; the length is the session time if recorded, otherwise about 3 minutes per set. Example: 30 minutes of weights at 91.9 kg ≈ +184. If Google Health gives your **total calories burned** for the day, that is used instead (what you burned above your body burn).

**Why is my exercise credit lower than my watch says?**
Your watch shows **gross** calories, including what your body would have burned anyway at rest. The app counts **net** calories, the extra on top of your body burn, so nothing is counted twice. Then your **activity adjustment %** applies (100% to start). After a few weeks the Companion may compare your weight trend with what you ate and **suggest** a different adjustment; you choose **Accept** or **Decline**, or set it yourself under **▸ How this is calculated → Change adjustment** (50–150%).

**What does "limited to your safe minimum" mean?**
Your goal would have been below your **safe minimum**: 90% of your BMR, and never under **1,200 kcal for women** or **1,500 kcal for men**. Eating less than that for long isn't recommended, so the goal stays at the safe minimum. A longer timescale removes the message.

**How do My Notes on weigh-ins help?**
A note such as "birthday week" or "after a long flight" is saved with that weigh-in (or measurement). Every Companion that reads your body data sees it, so it can explain a jump in weight instead of treating it as a trend.

## 7. My Shop

- **🛒 Choose My Supermarket** — your preferred supermarket. Shopping suggestions are tailored to it.
- **📷 Food Checker** — type a food or scan a product (photo) to check its nutrition and rating for you. The text box doubles as an optional description for the photo (e.g. '28g bar', 'brand'), which the Companion gives priority, and the result says what size it assumed ("Assumed: 28g bar — 125 kcal"). Then **Add to which list?** to put it in your eating lists.
- **My Companion Shopping Generator** — builds the shopping list from the week planned in **My Eating**. Plan your week first.
- **My Shopping List:**
  - Items generated from your eating plan, plus items you add (**Add item to shopping list…** → **+ Add**).
  - **Default** — mark an item to be added automatically every week (shown under **Weekly Defaults**; **✕ Remove** to stop).
  - **Group by Aisle** — group items by supermarket category.
  - **Clear List**.
  - Items generated from your eating plan say so if you try to remove them.

---

## 8. My Health

- **Personal Health Profile** — lasting information: smoker/non-smoker, alcohol, allergies, neurodiversities, disabilities, family health history, menopause status.
- **My conditions** — health conditions you're managing (e.g. high cholesterol, prediabetes). Needed for the *Support my health* goal; every Companion takes them into account.
- **My Notes (general health)** — current or temporary matters: recovering from a cold, an injury, fatigue, stress, sleep issues, pain, symptoms to track. **Why:** the Companion uses these, e.g. it will adapt exercise advice for an injury.
- **Health Log** — dated notes: symptoms, observations, changes, appointments.
- **My Vital Observations** — **Record Vitals**: date, time, blood pressure (systolic/diastolic), heart rate, SpO2 %. **History** lists past readings.
- **My Medications** —
  - **📄 Upload** a prescription or medication list; the Companion extracts the medications.
  - **+ Add** — choose from the list or **+ Add custom…**; set name, type (Medication/Supplement), dosage, when to take, frequency (Daily, Twice daily, Training days, Weekly, As needed) and notes.
  - **Active Medications** and **Stopped Medications**: **⏹ Stop** moves one to stopped; **Restart** brings it back. A **Change History** is kept.
- **My Bloods** — **Add Blood Results** (upload a results letter and the values are extracted, or enter them), **Save Blood Results**; **Latest Results** and **Older Results**.
- **My Companion Health Feedback** — **Health Companion Check-in** with **Concerns**, **Actions** and **Medication Notes**. It's not medical advice. Discuss concerns with your GP or health professional.

---

## 9. Chat and Help

### 💬 Chat with your Companion
Ask anything about your health, training, nutrition or progress, e.g. "Why did my bicep curl reps drop?", "Am I eating enough protein?", "What should I focus on next?". The Companion answers using your full data. The **newest message is at the top** (the Companion's reply sits above the question it answers), so you see it straight away. **Show older messages** (at the end) reveals earlier ones. All Companion conversations, including Help and the feedback replies, work the same way, with the reply box above the conversation.

### Help ?
Tap **Help ?** at the top right of the screen, next to the Settings gear. Ask how to use the app: where something is, what something means, how to do something, why it works the way it does. The Help companion answers from this guide, in the same conversation style. It helps with the **app**; for questions about your own health data, use 💬 Chat.

---

## 10. Settings

Open with the **⚙ Settings** gear (top right, to the right of **Help ?**).
- **🎨 My Colour Theme** — Blue, Purple, Green, Teal, Rose, Amber, Indigo or Slate. Changes your highlighted tabs, info boxes and accents. Each person has their own colour.
- **📱 Google Health — calories burned** — connects your own Google account so the app can read your **daily total calories burned** for this week (Sunday–Saturday). Only the daily totals are saved; the Google sign-in stays on this device (connect again on each device, and after about an hour). The status line says exactly what happened: connected or not, when it last synced and how many days were read, or why it failed (e.g. "expired — reconnect"). **🔄 Sync this week's calories** reads them; **⏹ Disconnect on this device** forgets the sign-in. For the app owner: a switch per person to use the calculated calorie target (off by default). Being set up: needs the Google Cloud steps first (plan J10).
- **🍎 Apple Health** (iOS) — coming soon.
- **Admin-only settings** (for the app owner) are grouped in sections, each with a short explanation:
  - **App & AI:** **🔑 API Keys** (Claude API key from console.anthropic.com → API Keys), **⚡ Companion Energy Level** (enter the balance after a recharge; it becomes 100%), **📊 AI usage**, **📧 Feedback email** and **🔧 Debug Mode**. Debug Mode, once turned on, stays on for this device and shows a red **🔧 DEBUG ON** badge in the header. It logs a safe summary of Home check-in feedback, eating feedback and Ask a Question calls: status, stop reason and token counts, never the question, the reply or any key. The log clears when the app reloads. **Turn Off** stops it. Measurement types can also be added there.
  - **Data & backups:** **Open** next to Download backup, Restore or Data viewer opens the 🗂 Data tools page at that tool (described below). Recovery is **Download backup** then **Restore**. The old "Reset to Default Data" button was removed in v2.15.0, and "Clear old eating history" in v2.15.1 (its one-off job is done).
  - **Firebase:** the project, which data this app uses, and links to the Firebase console (database, rules, sign-in users). Rules and data are never changed from the app.
  - **GitHub & releases:** this version, and links to the repository, deploys, releases, the changelog and the three versions of the app (App, Beta, Build).
  - **Integrations:** the Google OAuth Client ID (for Google Health Connect).
  - **Tracker** and **Documentation**: grouped links to the guides, design (HLD, LLD, decisions/ADRs, test strategy), the plan, and the legal drafts (marked **Draft — for legal review**). Private documents (01 SAD, 02 DPIA, 03 Service design + runbooks, 04 Risk register, 05 Supplier register + ROPA) are named only; they're in the vault.
- **🗂 Data tools** (admin only):
  - **⬇️ Download backup** saves all the real data as one dated file, e.g. *lifecare_backup_beta_2026-11-10-2049.json*, in the same layout as a Firebase export. On the Build test app it also includes the build copy. It shows the file size and counts only. Keep it somewhere safe: it contains health data. Photos are never in it (they're never stored).
  - **Restore from Firebase Export**: paste a Download-backup file (or a Firebase export) and press **Preview** to see what it contains (counts only). Then choose:
    - **Merge missing exercise weeks** (safe: adds missing weeks, changes nothing else); or
    - **Full restore of data**, which replaces everything in **this app's own data** with the file: the real data on the normal app and Beta, the build copy on the Build test app. It asks twice, and you must type **RESTORE**.
  - A **Firebase Data Viewer** and **Restore Missing Weeks from Comments** are also there. **← Back to Settings** returns you to Settings.
  - **📊 AI usage** (admin only): how many AI calls were made and how many tokens they used, per day and per feature (Help, Chat, My Eating, photo checks…), with the estimated cost. Only counts are kept, never what anyone typed or photographed. **⚡ Companion Energy** is worked out from these counts: what has been spent since the last **Set as 100%**.
  - **📝 Tracker** (admin only): everything sent with **💬 Send Feedback** appears here as **Feedback**, status **New** (a red badge shows how many are new). It also shows **the plan**: each time you open the Tracker it loads the plan (plan.json) and adds or updates its items (defects, features and tasks, by phase). Filters: Category (Feedback / Defect / Feature / Task), Phase, Status and Priority. Status starts on **Outstanding** (everything not Done or Won't do); choose **Completed** or **All** to see finished items. A box above the list totals the **Token %** of open plan items per phase (the estimated share of a weekly allowance). **Open** shows an item read-only. For feedback and items you added, **Edit** lets you re-categorise it, set the status, a priority, an admin note and a link/ref, then **Save**; **Remove** takes it out (asks first). Plan items say **Managed by plan**: only their admin note can be edited here, and your note is kept when the plan changes. **+ Add** adds a Defect, Feature or Task. Text only: no screenshots or images are stored.
  - **📧 Feedback email** (admin only): shows the address 💬 Send Feedback emails go to (also the contact in the Privacy Policy). Press **Edit**, change it, then **Save**: the form closes and shows **✓ Saved**. Leave it empty for no email: feedback is still saved to the 📝 Tracker.

### Send Feedback, Privacy Policy
At the bottom of the app: **💬 Send Feedback** (choose 🐛 Bug or ✨ Feature and describe it; it is always saved to the app owner's Tracker. If the owner has set a feedback email address, your phone's email app then opens with the message filled in: **press Send there** to email it too, because the app can't send email itself) and **Privacy Policy**. The version number (e.g. v2.1.0) is shown at the very bottom. Test versions of the app show a coloured **BUILD** or **BETA** badge under the Help and Settings buttons at the top (and in the browser tab name), and their version ends in -build… or -beta…; the normal app has no badge.

---

## 11. How it all fits together

- **Profile → targets → ratings.** Your setup and Companion Recommendations set your daily targets. Ratings for every food are judged against those targets and your health data (e.g. blood cholesterol makes sat fat matter more).
- **Food lists → plan → shopping.** Food lists feed the day dropdowns and the meal generator; the planned week feeds the shopping list.
- **Logs → status → next session.** Each exercise log feeds session feedback, which sets status badges and recommendations; accepting or declining recommendations, and your notes, shape the next feedback.
- **Body stats and measurements → body feedback**, cross-referenced with eating and activity, show whether the plan is working (e.g. fat down, muscle held).
- **Health (bloods, medications, notes, vitals) → every feedback.** The Companion considers health context in exercise and eating advice too.
- **Mood and journal → tone.** The Companion adapts how it talks to you.
- **Conversations → memory.** What you say in feedback threads is remembered next time that feedback is generated.

## 12. A typical week (when to do what)

- **Daily:** set your mood; tick off or adjust today's meals; use 📷 Snap when portions differ or you ate something unplanned; add day notes; write a journal entry when useful.
- **After each training session:** log every exercise honestly (with quality toggles), then generate **My Companion Session Feedback** and Accept/Decline its recommendations.
- **Weekly (e.g. Sunday):** set defaults and quick prep days, run the **Meals Generator**, adjust days, then generate the shopping list in **My Shop**. Generate **Week's Feedback** at the end of the week.
- **Weekly or fortnightly:** record body stats (same time of day, same conditions).
- **Every 4 weeks:** tape measurements and the **📸 Body balance check** (front, side and back photos).
- **When they happen:** add blood results, medication changes and health notes, then **🔄 Re-rate all lists** if your health picture or your lists changed.
- **After recharging AI credit (app owner):** ⚙ Settings → ⚡ Companion Energy Level → **Set as 100%**.

## 13. Troubleshooting

| Problem | What to do |
|---|---|
| "⚡ Companion Energy Empty. Please top up!" | The AI service is out of energy. The app owner recharges it at console.anthropic.com, then sets the new level in **⚙ Settings → ⚡ Companion Energy Level**. |
| Energy bar looks wrong (e.g. low but AI works) | The app owner resets it in **⚙ Settings → ⚡ Companion Energy Level → Set as 100%**. |
| "Invalid API key" / "No API key" | The app owner needs to check the Claude key in Settings → API Keys. |
| "Rate limit reached" / "API busy" | Wait a moment and try again. |
| Feedback was "cut off" | Press the feedback button again. |
| A food I want isn't in the meal drop-down | Choose **+ Not in my list?** at the bottom: add it (single item, build a meal or create your own) with **Add to … now** ticked and you're taken back with it selected. |
| I can't find a food because I don't know how to spell it | Type it however you think it's spelt, or in plain words ("pasta spirals"). If nothing matches, tap **Describe it instead**. |
| "UK product search isn't responding right now" | Open Food Facts is busy. Your lists and common foods still work; tap **Try again** in a moment. |
| A food's calories look far too high | Values are **per portion**: open the item and check **"1 portion = …"**. For packaged foods set **My portion size (g)**; for a recipe, check how many portions it makes (**Serves**), or use **Build a meal**. Items marked **Check me — confirm portions** need this. |
| The Companion asks me questions when I create an item | That's on purpose: it asks about anything unclear (raw or cooked, amounts, brand, how many portions) instead of guessing. Answer and tap **Send**. |
| Recalculation failed when adding food | Press Confirm to retry, or Cancel. The item isn't added with wrong values. |
| An exercise has disappeared | It may be stopped. Open **▼ Stopped Exercises** below the last exercise and use **▶ Restart Exercise** in its settings. |
| Can't log an exercise | Stopped exercises are view-only. Restart it first. |
| Wrong person's colour or data showing | Tap the correct name at the top. |
| A ⚠️ next to a meal | That AMBER/RED item has already been used this week/month. Tap the ⚠️ for details. |
| A 🔄 next to a food | Its rating changed after re-evaluation. Tap it to see why. |
| The app looks out of date after an update | Close the tab completely and reopen the link; check the version number at the bottom. |
| Chrome says "This app is already installed" but then "Could not open app" | An old install is left over. On the phone: **Settings → Apps**, remove any leftover Lifecare / LC app. Then in Chrome: **⋮ → Settings → Site settings → All sites** → the app's site → **Delete & reset**. Install again from Chrome (section 2, Installing the app). |
| An Open form or panel seems to be missing | It opens just below the card and scrolls into view; if you scrolled away, scroll back up to the card. |

## 14. Glossary

- **Companion** — the AI built into the app.
- **Companion Energy** — how much AI energy is left, as a percentage of the last recharge.
- **RAG / rating** — GREAT (green), AMBER, RED food ratings.
- **Packaged** — a shop-bought product with fixed label nutrition.
- **Ingredient Prepared** — something you make; nutrition is calculated from your ingredients and amounts.
- **Defaults** — meals applied automatically to each week.
- **Quick Prep Days** — days limited to quick dinners.
- **Progression rules** — when to add reps or weight for an exercise.
- **Full Range / Completed in One / Good Form** — session quality toggles.
- **Eccentric tempo** — the lowering phase of a lift, done slowly (about 3 seconds) for control and training effect.
- **Status** — Building, Consolidating, Ready to Move, Moved Up, Maintaining, Reduce.
- **Stopped exercise** — paused, hidden, view-only until restarted.
- **Open form** — the read-only view of a saved entry, with Edit, Remove/Delete and Close.
- **Remove / Delete** — Remove takes something out of a week, meal or history; Delete permanently deletes a list item or measurement type.
- **Body balance check** — the 4-weekly photo check that scores the same checklist each time (photos never stored).
- **Training week** — the week number since your programme started (shown in the header).
- **Body comp** — body composition (weight, fat, muscle, water etc.).
- **BMR** — basal metabolic rate: calories your body uses at rest.
- **Body burn** — BMR + daily living: BMR × 1.15 on days with step data, otherwise BMR × your activity level.
- **Goal (person goal)** — the one goal you chose (e.g. Work towards a healthy body weight); it sets your daily calorie goal.
- **Aim** — your goal's daily adjustment: − for a deficit, + for a surplus.
- **Activity level** — Mostly sitting / On my feet a fair bit / Very active; used on days without step data.
- **Week to date** — what you ate on this week's past logged days against their goals.
- **Safe minimum** — the lowest calorie goal the app sets: 90% of your BMR, at least 1,200 kcal (women) / 1,500 kcal (men).
- **Step allowance** — the steps already included in your baseline; only steps beyond it add calories.
- **MET** — how hard an exercise is compared with resting; used to count exercise calories.
- **Activity adjustment %** — scales your activity credit (100% to start); the Companion may suggest a change.
- **Planned vs Actual** — the Today table on Home (and in My Eating): body burn, aim, exercise, goal, eating and on track.
- **Visceral fat** — fat around internal organs; a health marker.
- **Open Food Facts** — a free UK/global product nutrition database the app searches.
