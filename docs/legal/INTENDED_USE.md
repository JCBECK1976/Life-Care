# Lifecare Companion™ — Intended Use and Clinical Safety Statement

> **DRAFT — for legal review before any users other than JC and Becks.** It records the intended purpose and the design guardrails. It is not a regulatory determination.

Last updated: 13 November 2026 (draft 1)

## 1. Intended purpose
Lifecare Companion is a **personal wellness** app for adults. It is for:
- **habit tracking:** exercise, eating, weight, body measurements, mood and journal;
- **general guidance** on diet and exercise for healthy living, with AI-generated feedback on the person's own entries;
- **organising personal health notes** the person chooses to record, so feedback can take them into account.

**Intended users:** adults managing their own general wellness. It is not for children, and not for use by health professionals to care for patients.

## 2. What it is not
- It is **not a medical device**, and it is not intended to diagnose, prevent, monitor, predict, treat or alleviate any disease, injury or disability.
- It does **not** interpret test results, symptoms or vital signs to give a diagnosis or clinical risk score.
- It does **not** give medication advice: no dosing, starting, stopping or changing medicines.
- It is **not for emergencies**. Users are directed to 999 / NHS 111.

## 3. Design guardrails (to stay outside UK MHRA software-as-a-medical-device scope)
1. **No diagnosis:**
   - The AI is instructed not to diagnose or name conditions from the person's data.
   - Health notes and blood results are context for wellness feedback only.
2. **No medication advice:**
   - The AI is instructed never to give medical advice, which covers dosing or changing medicines.
   - Medicines the person records (or reads from a document they upload) are kept as notes and used as context only.
   - Since v2.15.2, every AI prompt that sees health data also carries an explicit rule: never suggest starting, stopping or changing medication or doses; defer to the GP or pharmacist.
3. **Defer to clinicians:**
   - Feedback that touches on health tells the person to check with their GP or a qualified professional.
   - Concerning journal or mood content gets a supportive message and a signpost (GP, NHS 111, Samaritans, Mind), not clinical advice.
   - Described emergency symptoms are directed to 999.
4. **General guidance only:**
   - Food ratings come from fixed, published nutrition rules in code (saturated fat, added sugar, fibre, protein, energy share), not clinical judgement.
   - Exercise guidance is general fitness progression.
5. **Transparency:** users are told that AI outputs can be wrong (Terms of Use §2, once shown in the app) and that photos are analysed and then discarded (privacy notes next to every photo button).
6. **No clinical claims** in the app, store listings, website or marketing.

## 4. Review triggers (re-assess intended use and regulatory status before any of these)
- Any feature that suggests, adjusts or checks **medication** or **dosing**.
- Interpreting **symptoms, test results or vital signs** to give a diagnosis, risk score, alert or triage.
- Targets or plans for a **specific medical condition** (e.g. diabetes, heart disease, eating disorders, pregnancy).
- Reading data from **medical devices**, or making claims about accuracy that clinical decisions would rely on.
- Use by or for **health professionals**, or for **children**.
- **Automated alerts** that tell the user to seek or avoid care.
- **Marketing wording** that describes medical benefits.
- **Integrations that send data to clinical systems** (e.g. NHS records).

Who reviews: the app owner with the Architect, and legal/regulatory advice before release where a trigger applies. Record the outcome as an ADR.

## 5. Related documents
[TERMS_OF_USE.md](TERMS_OF_USE.md) · [PRIVACY_NOTICE.md](PRIVACY_NOTICE.md) · private: DPIA and clinical risk notes (vault).
