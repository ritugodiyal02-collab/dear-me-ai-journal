# Gemini Reflections Journal - User-Authenticated AI Reflection & Brainstorming

A full-stack, user-authenticated journaling and conversational brainstorming platform built with React, Express, Google Cloud Firestore, Firebase Authentication, and the Gemini 3.6 Flash API with resilient fallback models.

---

## Architecture & Threat Modeling Summary

| Threat Zone | Primary Risk | Implemented Countermeasure |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Injection, Malformed payloads | Strict schema validation, null-safe payload parsing, clean Markdown rendering. |
| **2. Planning & Reasoning** | Prompt Injection, Instruction override | System instruction isolation; user prompts encapsulated as plain data. |
| **3. Tool & Server Execution**| Model outages / API 503/429 | Resilient Fallback Ladder: `gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`. |
| **4. Memory & State** | Cross-tenant data leakage | Strict owner-bound Firestore security rules (`request.auth.uid == userId`). |
| **5. Inter-System Comms** | API Token exposure | Server-side Gemini proxy; API keys never leaked to frontend browser bundle. |

---

## 1. Prerequisites & GCP APIs

Ensure the following Google Cloud APIs are enabled in your GCP project:
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. Secret Management Setup

Create the `GEMINI_API_KEY` secret in Google Cloud Secret Manager and grant the default Cloud Run runtime service account permissions to access it.

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Firestore)

Deploy the following owner-bound Firestore security rules to guarantee complete tenant isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/reflections/{reflectionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 4. Cloud Run Deployment Flow

Deploy the container directly to Google Cloud Run with the Secret Manager environment variable binding:

```bash
gcloud run deploy gemini-reflections-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## 5. Required Campaign Labeling (Verification)

Apply the mandatory verification resource label to register the service for automated challenge verification:

```bash
gcloud run services update gemini-reflections-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Stability & User Walkthrough Test Cases

### Test Case 1: User Authentication & Resilient Guest Mode
- **Step 1.1**: Open the application landing page.
- **Expected**: The landing hero displays with the "Sign in with Google Account" CTA, "Explore as Guest (Local Sanctuary)" button, and "Encrypted & Private" security badge.
- **Step 1.2**: Click "Explore as Guest (Local Sanctuary)".
- **Expected**: User immediately enters the application without authentication blockers, assigned an explorer profile with local storage persistence.
- **Step 1.3**: If clicking "Sign in with Google Account" on an unapproved domain:
- **Expected**: The system catches `auth/unauthorized-domain`, displays an interactive helper card with the exact hostname, a single-click Copy button, a direct link to Firebase Console Settings, and an instant "Continue as Guest" fallback.

### Test Case 2: Multi-Turn Conversational Reflection
- **Step 2.1**: Select "Reflection & Inquiry" mode and type a reflection into the Journal Entry body.
- **Step 2.2**: Click a quick prompt (e.g., *"What underlying assumptions might I be making here?"*) or type a custom prompt in the chat input and click Send.
- **Expected**: Gemini responds empathetically with formatted Markdown, structured insights, and active model tag (`gemini-3.6-flash`).
- **Step 2.3**: Enter a follow-up response in the chat input.
- **Expected**: Multi-turn dialogue maintains context of previous turns and journal body.

### Test Case 3: Creative Brainstorming & Action Milestones
- **Step 3.1**: Switch the mode tab to "Brainstorming" or "Action Planner".
- **Step 3.2**: Send a prompt asking for actionable strategies.
- **Expected**: Gemini tailors its output structure to bulleted brainstorm ideas and concrete milestone steps.

### Test Case 4: Automated Synthesis & Persistence
- **Step 4.1**: Click the "Synthesize Insights" button.
- **Expected**: Gemini analyzes the draft and transcript, returning an Executive Summary, Key Insights, and Action Milestones into the structured insight panel.
- **Step 4.2**: Observe the persistence indicator.
- **Expected**: Shows "Saved" badge (synced to Firestore for authenticated users, local browser storage for guest exploration).

### Test Case 5: History Search, Filter, and Deletion
- **Step 5.1**: Click "New Reflection" in the navbar to open a blank entry.
- **Step 5.2**: In the History sidebar, search for a keyword from the previous entry or click a tag filter.
- **Expected**: The list filters instantly.
- **Step 5.3**: Click the past reflection from the list.
- **Expected**: Loads the full content, chat history, and synthesis.
- **Step 5.4**: Click the delete icon on an entry and confirm the prompt.
- **Expected**: The entry is safely deleted and removed from the sidebar.

### Test Case 6: Scrapbook Creation & Physical Book Flip
- **Step 6.1**: In the navbar, click "Scrapbooks".
- **Step 6.2**: Click "Create New Scrapbook", provide a title and select a theme (e.g., Vintage Parchment or Cozy Forest).
- **Expected**: The new scrapbook is created and opens in the physical book flipper view.
- **Step 6.3**: Add pages, stickers, and photos or click "Ask Story Assistant".
- **Expected**: Interactive page turns animate smoothly, and Gemini Story Assistant generates thoughtful caption ideas.

