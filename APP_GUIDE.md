# Lifecare Companion™ — Complete App Guide

> **Purpose of this document.** This is the single source of truth for how Lifecare Companion™ works. It is read by the in-app **Help** companion to answer people's questions about using the app: what things are, where they are, what they mean, how to do something, when to do it, who it applies to and why it works the way it does. It replaces a traditional user guide.
>
> **Keep it current.** Whenever a feature is added, moved, renamed or removed, update this file in the same release.
>
> Last updated: v2.2.0 · 4 November 2026

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

---

## 2. Finding your way around

### The header (top of every page)
- **Lifecare Companion™** title.
- **Help ?** button (top right, left of the gear) — ask how to use the app. See section 9.
- **⚙ Settings** gear (top right) — opens Settings (colour theme, connections and data tools). See section 10.
- **Week N · Updated [date]** — your current **training week number**, counted from your programme start date, and when your data was last saved. "· Saving..." appears briefly while changes are being saved.
- **Person tabs** (e.g. *JC*, *Becks*) — tap a name to switch who you are viewing. The whole app switches to that person: their data, their colour theme, their feedback and settings. The highlighted tab is the active person.
- **＋** next to the person tabs — add a new person. Type their name and tap **Add**.

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

### Common patterns used everywhere
- **My Companion … Feedback** buttons (deep blue) — generate AI feedback for that area. After it is generated, **▼ Show Feedback / ▲ Hide Feedback** opens or closes it.
- **Conversation threads** — under most feedback you can type a reply ("Respond to this feedback…") and the Companion answers. Your messages appear on the right in your colour; the Companion's replies appear on the left in dark grey. Earlier conversation is remembered next time feedback is generated, so it respects what you pushed back on.
- **Feedback History** — older feedback is kept and can be shown with Show/Hide.
- **🗑 Del / 🗑 Delete** — delete buttons always ask you to confirm. Deletions cannot be undone.
- **✎ Edit / ✎ Update** — edit an item in place.
- **Grey buttons** sit inside content (Progress, Log, Edit); **deep blue buttons** are main actions.
- Messages (green ✓ for success, red for problems) appear near the top of the page or inside the panel you're using.

---

## 3. Home

### Greeting and welcome
"Good morning / afternoon / evening, [name]" with a rotating encouraging message. If no profile exists yet you'll see "New User".

### ⚡ Companion Energy
Companion Energy shows how much AI energy is left for Companion features, as a percentage. Every time the Companion generates feedback, answers a chat or calculates nutrition, it uses a little energy.

- **100%** is a full recharge; **0%** is empty. The bar goes down gradually as AI features are used. Normal use takes very little, so use the features freely.
- **↻ Refresh** checks the connection.
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
A summary of today: **My Eating** (today's planned breakfast, lunch, dinner, snacks and drinks, with an **Open** link to My Eating) and **My Exercises** (today's session, or "No exercises planned"). Buttons take you straight to today in My Eating or My Exercise.

### My Journal
- **+ Add Journal Entry** — write how you're feeling or what's on your mind. Entries are dated.
- **Recent Entries** and **Full History** — read past entries; **🗑 Del** removes one.
- **Why:** journal entries give the Companion context (stress, life events) so its feedback fits what's going on.

### ▼ My Profile (setup questionnaire)
Tap **▼ My Profile** under the greeting to open your setup. It has tabs:
| Tab | What you enter |
|---|---|
| **My Profile** | Your auto-generated profile summary (name, sex, height, ideal weight, date of birth, body type, fibre dominance) and **My Companion Recommendations**. |
| **My Details** | Basic personal information. Also **📸 Body Type Photos** and baseline body composition. |
| **My Family** | Who you live with and relevant family health history. |
| **Personality** | Your personality style, which shapes motivation and habit-formation advice. |
| **Lifestyle** | Daily routine, work pattern (e.g. home/office days) and current activity level. |
| **Food & Drink** | Current eating habits and relationship with food. |
| **Wellbeing** | Sleep, mental health and neurodiversity, which affect how support is approached. |
| **My Health** | Medical history and current health status. |

Tap **Save Setup** to save answers. 🔒 Your information is private and used only by your Companion.

**My Companion Recommendations** (in My Profile) generates personalised **daily nutrition targets** (calories, protein, saturated fat, added sugar, fibre) and **body composition goals** (target weight, body fat, waist, visceral fat), split into 🏋️ Activities, 🥗 Dietary and 🏥 Medical advice. Complete the other tabs first for the best result.

**📸 Body Type Photos / 🔍 My Companion Body Type Check** — upload photos (front relaxed, bicep flex, side profile, back, quad flex and calf raise) and the Companion assesses body type, muscle fibre dominance and an ideal weight range, combined with your answers and body comp data. Results are estimates from photos, not clinical measurements.

**📊 Baseline body composition** — upload a screenshot from your scales app so the app has a starting point.

### My Companion Feedback (Home check-in)
The overall **Companion Check-in** looks across everything (exercise, eating, body, health, mood, journal) and gives **What's going well**, **Opportunities** and **Focus next 2 weeks**. You can reply in the conversation thread underneath.

---

## 4. My Body

### My Body Stats
Tracks body composition, usually from a smart scale:
**Weight, Body Fat %, Muscle Mass, Muscle Rate %, Visceral Fat, Subcutaneous Fat %, Body Water %, Bone Mass, BMR (kcal), Body Age.** Each shows a status (e.g. Acceptable / Too High, Standard / High, Excellent) where relevant.

- **📋 Record** — type in today's values.
- **📷 Upload** — upload a screenshot from your scales app; the Companion reads the values ("✓ Values extracted — review and save"). Check them, then save.
- **Progress** — each stat has a history table (WK / VALUE / NOTES) and a chart once there are 2+ entries. Entries can be deleted.
- **Google Health Connect** (Android) can sync weight, body fat, steps and activities automatically. See Settings.

### My Body Measurements
Tape measurements in cm (e.g. chest, waist, hips, arms, thighs).
- For each measurement: **Log** today's value (shows **Previous** for comparison), optional **Note** and optional **photo** (✓ Photo; tap to view full size).
- **Progress** shows a WEEK / CM table and chart.
- **Measurement Settings** — ✎ rename or 🗑 delete a measurement.
- **+ Add Body Measurement** — add any body part to track (e.g. Hips, Neck, Thigh).
- **When:** re-check every 4 weeks. Measure chest at nipple level and waist at the midpoint between the lowest rib and the hip bone, the same way each time.

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
  | **Ready to Move** | Hit your target two sessions in a row; ready to increase weight. |
  | **Moved Up** | Weight has been increased. |
  | **Maintaining** | Deliberately holding at this weight. |
  | **Reduce** | Weight has been dropped (e.g. form or recovery). |
- **📋 NOTES FROM LAST SESSION** — notes you left last time, carried forward.
- **👁 Progress** (grey) — opens the progress panel.
- **📋 Log** (grey) — opens the log form.

### Logging a session (📋 Log)
- Enter each **set** (weight and reps, or the right measure for the exercise type).
- **Session Quality** toggles: **Full Range of Motion** (or **Completed in One** for cardio-type exercises) and **Good Form**, each *Good* or *Working Towards*. If Full Range is "Working Towards", the Companion won't recommend increasing weight. It will tell you to master the full controlled range first, using a 3-second lowering phase.
- **Progression** choice: *Standard (follow progression rules)*, *Move Up* (override: ready to increase), *Hold* (keep current weight) or *Reduce* (drop weight).
- **Notes (carried to next session)** — appear on the card next time.
- **Logging for two people:** the log form has person tabs (e.g. JC / Becks). You can switch to the other person and log their sets for the same exercise in the same sitting. **Switching here makes that person the active person** (their colour and data show). Both people's logs are saved when you press Save.
- **Save** (or **Update** when editing a previous entry). **Edit Previous Entry** lets you correct a past week; **Cancel Edit — Log New Instead** returns to a new log.
- **Why honesty matters:** the Companion bases its progression advice on what you log. Inflating reps leads to bad recommendations.

### Progress panel (👁 Progress)
- Table of weeks with weight and reps; **+ Add Week** to add a missed week; chart once there are 2+ weeks.
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
- **Update Eating Lists** — manage your food lists (see below).
- **🔄 Re-evaluate Ratings** — re-rates all your food items against your current health profile.
- **Clear Week** — removes all meal selections for the week (asks first).
- **Day tabs:** **Week** (whole-week view) and **Mon–Sun**, each showing that day's calories.

### The rating system (RAG)
Every food item has a colour rating, worked out for **you** (your targets, health conditions and bloods):
| Rating | Colour | Meaning | How often |
|---|---|---|---|
| **GREAT** | Dark green | Fits your daily targets well; a healthy choice. | Any day |
| **AMBER** | Amber | Acceptable but has some concerns (e.g. sat fat, sugar, calories). | At most **once a week** |
| **RED** | Red | Should be limited. | At most **once a month** |

If you pick an AMBER item already used this week, or a RED item used in the past month, a ⚠️ appears next to it. Tap it to see why. Ratings can change after **Re-evaluate Ratings** (for example after new blood results). Changed items show 🔄; tap it to see the old rating, the new one and the reason.

### A day tab
**Daily Eating Tracker** with **Breakfast, Lunch, Dinner, Desserts, Snacks, Drinks** and other items:
- Each slot is a searchable dropdown of your list items, colour coded by rating. Type to search.
- **+ Add New** adds another row for that meal (e.g. a second breakfast item).
- **🗑 Del** removes a row. On the **first** breakfast, lunch or dinner row it clears the selection but keeps the box.
- **📷 Portion** — photograph your plate. The Companion compares **Planned** vs **Actual** (including sat fat) and flags if a different food is detected. **Confirm Portion** to use the actual values (✓ Portion verified).
- **Dinner sides** — for packaged products, add 🥔 Potato and 🥗 Veg sides.
- **+ Add new item…** at the bottom of any dropdown lets you add a food that isn't on your list (see "Adding food" below). After it's added, it's selected in that slot and the add box closes.
- **Day notes** — e.g. "Ate out, exam stress, birthday". Gives the Companion context.
- **📋 Copy Day** — copy this day's selections to other days.
- **Nutrition Overview (g)** — totals for the day (kcal, protein, fat, sat fat, carbs, fibre, salt) and **Daily Percentage of Recommendations**.
- **🍽 Help Me with What to Eat** — when you're out: describe where you are (e.g. "M&S services", "hotel buffet", "Pizza Express"), optionally upload a photo of the menu, buffet or shelf, and say what you're looking for. The Companion picks the **best option** for you and lists others to **Also consider**. **✓ Confirm & Add** puts it in your day.
- **My Companion Eating Feedback** — feedback on the day.
- The reminder line: *It's important to track accurate and honest information for your companion to give you the most appropriate feedback. Use 'Update Eating Lists' to update eating selection list items.*

### The Week tab
- **My Week** — average kcal/day; **📋 Copy Week** copies the week's day selections to future weeks.
- **Week — Nutrition Overview (g)** — a table per day plus **Daily Totals**, **Recommended** and **Weekly Percentage of Recommendations** (kcal, protein, sat fat, carbs, fibre, salt).
- **⏱ Quick Prep Days** — tick days when you're short of time and set a minutes limit. The meal generator will only choose dinners within that prep time on those days.
- **Set Defaults** — default meals for each slot (Breakfast, Lunch, Dinner, Dessert, Drink, Snacks). **Individual** applies to the current person only; **All** applies to everyone. **+ Add New** adds more default rows; **🗑 Del** removes one.
- **My Companion Meals Generator** — applies your defaults and fills any empty breakfast, lunch and dinner slots with recommended choices from your lists, respecting ratings and quick prep days. You can change any day afterwards.
- **My Companion Week's Feedback** — patterns and nutritional trends across the week.
- Then go to **My Shop** to generate your shopping list.

### Update Eating Lists (your food lists)
Tap **Update Eating Lists** to open **🍽️ My Eating Lists**: Breakfasts, Lunches, Dinners, Snacks, Desserts and Drinks, each listing your items (colour coded, with kcal).
- **✎ Update** — opens an **Update Item** panel under the item: name, nutrition, rating, description, type (📦 Packaged or 🍳 Ingredient Prepared) and ingredients. Edit, then **✓ Confirm**. If you changed ingredients, the Companion recalculates the nutrition first. You'll see "Nutritional values updated", then press **✓ Continue — Save** to save or **Edit Again** to change more. Nothing is saved with old values if the recalculation fails.
- **🗑 Del** — delete an item.
- **+ Add New Item to Lists** — add a single item (below).
- **📋 Bulk** — add many at once (below).
- **✕ Close** — close the lists.

### Adding food — one item
1. Type a name (e.g. "Costa Rocky Road" or "Overnight oats with berries"). UK products from **Open Food Facts** appear as you type; tap one to use its label data (per 100g). Or tap **Add** for an AI lookup. **📷** lets you photograph the product or meal instead.
2. The **Review Item** panel shows the nutrition values, rating and a description of how it suits you.
3. Choose the **Type**: **📦 Packaged** (a shop-bought product) or **🍳 Ingredient Prepared** (something you make). For prepared items, edit the **🧾 Ingredients** with your actual amounts (e.g. "Rolled oats (85g), Almond milk (300ml)…"), separated by commas.
4. Choose which lists to add it to (**Add to categories**); for dinner, say whether it's a main or a side (potato, veg or salad).
5. Press **✓ Confirm**.
   - If you changed the ingredients, the Companion **recalculates** the nutrition ("Recalculating…"), then shows **"Nutritional values updated"**. Press **✓ Continue — Add** to add it, or **Edit Again** to keep editing.
   - If you didn't change anything, it's added straight away.
   - If the recalculation fails, you'll see why and can try again or cancel. **An item is never added with values that don't match its ingredients.**
6. Duplicates are detected; if the item already exists, you're told and (when adding from a meal slot) the existing item is selected.

### Adding food — bulk
Tap **📋 Bulk**, paste a list (one per line or comma-separated), choose **one category**, then **Upload Items**. The Companion calculates baseline nutrition, ratings and descriptions for all of them and **adds them automatically, without reviewing each one**. Duplicates and items it couldn't identify are skipped and counted. Because bulk items aren't individually checked, **open any item with ✎ Update to confirm its description and ingredients for accuracy**.

### Re-evaluate Ratings
Re-rates every item in your lists against your current health profile, targets and bloods. Use it after new blood results, a change in health conditions or new targets.

### Ingredients and the shopping list
For prepared dinners, the ingredients become shopping list items. For packaged items, the product itself goes on the list.

---

## 7. My Shop

- **🛒 Choose My Supermarket** — your preferred supermarket. Shopping suggestions are tailored to it.
- **📷 Food Checker** — type a food or scan a product (photo) to check its nutrition and rating for you. Then **Add to which list?** to put it in your eating lists.
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
- **General Health Notes** — current or temporary matters: recovering from a cold, an injury, fatigue, stress, sleep issues, pain, symptoms to track. **Why:** the Companion uses these, e.g. it will adapt exercise advice for an injury.
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
Ask anything about your health, training, nutrition or progress, e.g. "Why did my bicep curl reps drop?", "Am I eating enough protein?", "What should I focus on next?". The Companion answers using your full data. Recent messages show as a conversation; **Show older messages** reveals earlier ones.

### Help ?
Tap **Help ?** at the top right of the screen, next to the Settings gear. Ask how to use the app: where something is, what something means, how to do something, why it works the way it does. The Help companion answers from this guide, in the same conversation style. It helps with the **app**; for questions about your own health data, use 💬 Chat.

---

## 10. Settings

Open with the **⚙ Settings** gear (top right, to the right of **Help ?**).
- **🎨 My Colour Theme** — Blue, Purple, Green, Teal, Rose, Amber, Indigo or Slate. Changes your highlighted tabs, info boxes and accents. Each person has their own colour.
- **📱 Google Health Connect** (Android only) — syncs body composition and activity data from your phone. Setup: download Google Health Connect from the Play Store, connect your scales/health apps to it, then tap **🔗 Connect Google Health**. Use **🔄 Sync Google Health Data** to sync and **⏹ Disconnect** to stop.
- **🍎 Apple Health** (iOS) — coming soon.
- **Admin-only tools** (for the app owner): **⚡ Companion Energy Level** (enter the balance after a recharge; it becomes 100%), **🔑 API Keys** (Claude API key from console.anthropic.com → API Keys; Google OAuth Client ID for Health Connect), **⚠ Reset Data** (overwrites everything with default data; cannot be undone), **🔧 Debug Mode** and measurement types. **🗂 Data tools** (Settings → Open Data tools; admin only): a Firebase Data Viewer to look at the stored data, plus recovery tools to restore missing weeks and to restore from a Firebase export. **← Back to Settings** returns you to Settings.

### Send Feedback, Privacy Policy
At the bottom of the app: **💬 Send Feedback** (choose 🐛 Bug or ✨ Feature, describe it, and it opens an email) and **Privacy Policy**. The version number (e.g. v2.1.0) is shown at the very bottom. Test versions of the app show a coloured **BUILD** or **BETA** badge next to "Lifecare Companion™" at the top (and in the browser tab name), and their version ends in -build… or -beta…; the normal app has no badge.

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

- **Daily:** set your mood; tick off or adjust today's meals; use 📷 Portion when portions differ; add day notes; write a journal entry when useful.
- **After each training session:** log every exercise honestly (with quality toggles), then generate **My Companion Session Feedback** and Accept/Decline its recommendations.
- **Weekly (e.g. Sunday):** set defaults and quick prep days, run the **Meals Generator**, adjust days, then generate the shopping list in **My Shop**. Generate **Week's Feedback** at the end of the week.
- **Weekly or fortnightly:** record body stats (same time of day, same conditions).
- **Every 4 weeks:** tape measurements and progress photos.
- **When they happen:** add blood results, medication changes and health notes, then **Re-evaluate Ratings** if your health picture changed.
- **After recharging AI credit (app owner):** ⚙ Settings → ⚡ Companion Energy Level → **Set as 100%**.

## 13. Troubleshooting

| Problem | What to do |
|---|---|
| "⚡ Companion Energy Empty. Please top up!" | The AI service is out of energy. The app owner recharges it at console.anthropic.com, then sets the new level in **⚙ Settings → ⚡ Companion Energy Level**. |
| Energy bar looks wrong (e.g. low but AI works) | The app owner resets it in **⚙ Settings → ⚡ Companion Energy Level → Set as 100%**. |
| "Invalid API key" / "No API key" | The app owner needs to check the Claude key in Settings → API Keys. |
| "Rate limit reached" / "API busy" | Wait a moment and try again. |
| Feedback was "cut off" | Press the feedback button again. |
| Recalculation failed when adding food | Press Confirm to retry, or Cancel. The item isn't added with wrong values. |
| An exercise has disappeared | It may be stopped. Open **▼ Stopped Exercises** below the last exercise and use **▶ Restart Exercise** in its settings. |
| Can't log an exercise | Stopped exercises are view-only. Restart it first. |
| Wrong person's colour or data showing | Tap the correct name at the top. |
| A ⚠️ next to a meal | That AMBER/RED item has already been used this week/month. Tap the ⚠️ for details. |
| A 🔄 next to a food | Its rating changed after re-evaluation. Tap it to see why. |
| The app looks out of date after an update | Close the tab completely and reopen the link; check the version number at the bottom. |

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
- **Training week** — the week number since your programme started (shown in the header).
- **Body comp** — body composition (weight, fat, muscle, water etc.).
- **BMR** — basal metabolic rate: calories your body uses at rest.
- **Visceral fat** — fat around internal organs; a health marker.
- **Open Food Facts** — a free UK/global product nutrition database the app searches.
