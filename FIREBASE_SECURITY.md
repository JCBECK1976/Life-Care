# Firebase Security Requirements — Life Care Companion

## Current State (CRITICAL)

The Firebase Realtime Database `life-care-app-64d04-default-rtdb` currently has **wide-open security rules** — any user can read and write the entire database. Firebase sends daily email warnings about this.

### Why This Matters
- Anyone with the database URL can read all user data (body composition, medical info, medications, blood results)
- Anyone can overwrite or delete all data
- The app already suffered data loss when test-mode rules expired (Oct 2026) — `sGet()`/`sSet()` silently swallow permission errors, so the app loaded default data instead of showing an error

### Database Details
- **Project**: `life-care-app-64d04`
- **Database URL**: `https://life-care-app-64d04-default-rtdb.europe-west1.firebasedatabase.app/`
- **Region**: europe-west1
- **Current rules**: Allow all reads and writes (test mode)

---

## Recommended Security Architecture

### Phase 1: Immediate — Secure with Firebase Auth Rules

The app already uses Google OAuth via Google Identity Services (GIS). The current flow:
1. User clicks "Sign in with Google"
2. GIS returns a credential
3. App signs in to Firebase Auth with that credential
4. User's email becomes the identifier

**Recommended rules** (deploy via Firebase Console → Realtime Database → Rules):

```json
{
  "rules": {
    "data": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    ".read": false,
    ".write": false
  }
}
```

**What this does**:
- Each user can only read/write their own data under `/data/{uid}/`
- No unauthenticated access
- No cross-user data access

**Migration required**:
- Currently the app stores data under `/data/` with a flat structure
- Need to restructure to `/data/{firebase_uid}/` per user
- The `sGet`/`sSet` functions need updating to include the user's UID in the path
- Existing JC and Beck data needs migrating to their respective UID paths

### Phase 2: Error Handling (CRITICAL)

The `sGet()` and `sSet()` functions silently catch and swallow ALL errors, including permission denied:

```javascript
// Current pattern (DANGEROUS):
async function sGet(k) {
  try {
    var s = await get(ref(db, "data/" + k));
    return s.exists() ? s.val() : null;
  } catch(e) { return null; }  // Silently returns null on permission error!
}
```

**Must fix to**:
```javascript
async function sGet(k) {
  try {
    var uid = firebase.auth().currentUser?.uid;
    if (!uid) throw new Error("Not authenticated");
    var s = await get(ref(db, "data/" + uid + "/" + k));
    return s.exists() ? s.val() : null;
  } catch(e) {
    console.error("Firebase read error:", e.code, e.message);
    if (e.code === 'PERMISSION_DENIED') {
      // Surface to user — don't silently fail
      showError("Database access denied. Please sign in again.");
    }
    throw e; // Don't swallow the error
  }
}
```

### Phase 3: Multi-User Architecture

For pilot users and commercialisation:

1. **User isolation**: Each user gets `/data/{uid}/` namespace
2. **Shared household data**: Optional — `/households/{householdId}/` for shared plans (JC+Beck pattern)
3. **Admin access**: Firebase Admin SDK for any server-side operations
4. **Rate limiting**: Firebase Security Rules can enforce write frequency limits
5. **Data validation**: Rules can validate data structure on write

**Recommended expanded rules for multi-user**:

```json
{
  "rules": {
    "data": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        ".validate": "newData.hasChildren()"
      }
    },
    "households": {
      "$householdId": {
        ".read": "data.child('members').child(auth.uid).exists()",
        ".write": "data.child('members').child(auth.uid).exists()",
        "members": {
          "$memberId": {
            ".write": "$memberId === auth.uid || data.parent().child(auth.uid).val() === 'admin'"
          }
        }
      }
    },
    ".read": false,
    ".write": false
  }
}
```

### Phase 4: API Key Security

The Firebase `apiKey` (`AIzaSyDnNHlqyEg3IVxYo9M6Z_pfn5ABMp7Jbt4`) is exposed in client-side code. This is normal for Firebase web apps — the API key identifies the project, not authorises access. Security comes from the database rules, not the API key. However:

- **Do**: Restrict the API key in Google Cloud Console to only the APIs needed (Firebase Auth, Realtime Database)
- **Do**: Add HTTP referrer restrictions to the API key (only allow from `jcbeck1976.github.io`)
- **Don't**: Try to hide it — it must be in client code for Firebase to work

### Anthropic API Key Security

The Anthropic API key for the AI companion features is entered by each user and stored locally. For commercialisation:
- **Current**: Users bring their own key (BYOK model)
- **Future option**: Server-side proxy that holds the API key, users authenticate via Firebase Auth, proxy forwards requests to Anthropic
- This prevents key exposure in browser dev tools

---

## Implementation Checklist

### Immediate (before pilot users)
- [ ] Deploy Firebase Auth security rules (Phase 1)
- [ ] Update `sGet`/`sSet` to include user UID in path
- [ ] Add error surfacing for permission denied errors (Phase 2)
- [ ] Migrate existing JC/Beck data to UID-based paths
- [ ] Test sign-in flow with new rules
- [ ] Restrict Firebase API key in Google Cloud Console

### Before commercialisation
- [ ] Implement household/shared data model (Phase 3)
- [ ] Add data validation rules
- [ ] Consider Anthropic API proxy for key security (Phase 4)
- [ ] Add Firebase App Check for additional security
- [ ] Implement data export/deletion for GDPR compliance
- [ ] Add rate limiting rules

---

## Quick Reference

| Item | Value |
|------|-------|
| Firebase Project | `life-care-app-64d04` |
| Database URL | `https://life-care-app-64d04-default-rtdb.europe-west1.firebasedatabase.app/` |
| Region | europe-west1 |
| Auth Provider | Google (via GIS) |
| OAuth Client ID | `464885753789-a8flgh64f1u9qeocktt6uljvjvsd0sf2.apps.googleusercontent.com` |
| Firebase API Key | `AIzaSyDnNHlqyEg3IVxYo9M6Z_pfn5ABMp7Jbt4` |
| Current Rules | OPEN (insecure) |
| Target Rules | UID-scoped read/write |
