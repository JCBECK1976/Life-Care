# Lifecare Companion™ — Privacy Notice

> **DRAFT — for legal review before any users other than JC and Becks.** Not yet in force for anyone else. Placeholders are in [square brackets].

Last updated: 14 November 2026 (draft 1, steps and calorie model added for v2.17.1)

This notice explains what personal data Lifecare Companion collects, why, and what rights you have. It is written for the UK GDPR and the Data Protection Act 2018.

## 1. Who we are
Lifecare Companion is made by **Jan-Christian Zaluski, trading as Companion Apps Studio**. He is the **data controller**.
To contact us about your data, use the contact address shown in the app (Settings → Privacy Policy, or 💬 Send Feedback).

## 2. What data we hold
- **Your account:** the email address of the Google account you sign in with. We do not receive your Google password.
- **Health and fitness data you enter:**
  - weight, body composition and body measurements;
  - exercise logs;
  - eating logs and food lists;
  - health notes, mood and journal entries;
  - the results of photo checks (values and scores only, see section 5);
  - your notes on weigh-ins and measurements (My Notes).
- **From Google Health or Apple Health, only if you connect it:** your **daily steps** and **daily total calories burned** (one figure per day each; no location, heart rate or other readings).
- **Worked out by the app from your data:** your estimated **BMR** (calories your body uses at rest), calorie goal and activity credit. These are calculated when shown and not stored separately.
- **AI usage counts:** how many AI requests were made and how many tokens they used, per day and feature. No content is kept in these counts.
- **Feedback:** what you send with 💬 Send Feedback, and the app owner's notes on it in the Tracker. This includes your account in masked form, the app version and the text.

## 3. Health data and our lawful basis
Health data is **special category data**. We process it only with your **explicit consent** (UK GDPR Article 9(2)(a)), given when you start using the app. Our lawful basis for the rest of your data is also consent (Article 6(1)(a)).
You can withdraw consent at any time (see section 8). Withdrawing does not affect processing that happened before.

## 4. What we use it for
- To show you your own records, trends and plans.
- To work out your calorie goal and daily activity credit (from your body composition, steps, calories burned and logged exercise), and to compare your week with your plan.
- To give you AI-generated feedback, answers and photo checks about your wellness, exercise and eating.
- To keep the app working, fix problems and improve it, using your feedback and usage counts.

We do not sell your data, use it for advertising, or share it with anyone except the processors below.

## 5. AI processing and photos
- **AI requests:** to generate feedback, the relevant data and your question are sent to **Anthropic** (the provider of the Claude AI model), an external **processor**.
- **International transfer:** AI requests are **currently processed by Anthropic in the United States**, under Anthropic's Data Processing Addendum [JC to confirm the DPA applies to the account].
- **Planned move to the EU:** before any users other than JC and Becks, AI processing will move to the **EU**. Requests will go through Claude on Google Cloud Vertex AI at an EU regional or multi-region endpoint, under Google's existing terms. This notice will be updated when that happens.
- **Model training:** according to the provider's terms for its API, data sent through the API is not used to train its models.
- **Photos are analysed and then discarded:**
  - When you take or choose a photo (food, a measurement, a body-composition screen, body photos), it is shrunk and sent for analysis, then discarded.
  - **Photos are never stored:** not in our database, not in backups. Only the result you keep (for example values or scores) is saved.

## 6. Where your data is stored
- **Database and sign-in:** Google Firebase. The database is in Google's **europe-west1 region (Belgium, EU)**; Firebase Authentication handles sign-in.
- **Backups:** encrypted copies of the database are kept in a **private GitHub repository**. They are encrypted before they leave the backup job.
- **App files:** served by GitHub Pages. They contain no personal data.

## 7. How long we keep it
| Data | How long we keep it |
|---|---|
| Your account and records | While your account is in use. If you ask us to delete your account, everything is deleted within **30 days**. |
| Inactive accounts | If an account hasn't been used for **18 months**, we warn you before deleting it. |
| AI feedback threads and chats | **12 months**, then deleted. |
| AI usage counts | **120 days**. |
| Feedback and Tracker entries | **2 years**. |
| Photos | **Not stored**: analysed and then discarded (section 5). |
| Google Health / Apple Health daily steps and calories burned (if connected) | While you stay connected, then **12 months**. |
| Derived figures (BMR, calorie goal, activity credit) | Not stored: worked out each time from the data above. |
| Encrypted backups | They age out: every backup is deleted within **12 months**. Deleted data disappears from backups as they age out. |

## 8. Your rights
You have the right to:
- **access** your data and get a copy;
- **rectify** data that is wrong (most of it you can edit in the app);
- **erase** your data;
- **export** your data in a portable format;
- **withdraw consent** at any time;
- **object to** or **restrict** some processing;
- **complain to the Information Commissioner's Office (ICO)**: ico.org.uk, 0303 123 1113.

To use these rights, contact us (section 1). We will reply within one month.
[In-app deletion and export are planned before other users join.]

## 9. Security
Access to your data requires signing in with an approved Google account. Data is transferred over encrypted connections, and backups are encrypted. Only the app owner can administer the service. No system is perfectly secure: we review our safeguards regularly, and will tell you and the ICO about a serious breach as the law requires.

## 10. Changes to this notice
We will update this notice when the app or the law changes, and show the date above. Significant changes will be shown in the app before they apply.

## 11. Contact
Jan-Christian Zaluski, Companion Apps Studio. Use the contact address shown in the app (Settings → Privacy Policy).
