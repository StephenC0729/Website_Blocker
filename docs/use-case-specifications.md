# Bolt Blocker — Use Case Specifications

Version: 1.0  
Scope: Chrome extension with Pomodoro timer, website blocking, analytics, React dashboard, Firebase sync, EmailJS

Conventions:
- Primary actor = initiates the use case
- Supporting actors = systems/services involved (Chrome, Firebase, EmailJS)
- Standard process = main success path
- Alternative process = notable branches and error paths

---

## UC-01 Start timer
- Description: Begin a Pomodoro/Short Break/Long Break/Custom session and start countdown.
- Actors: Primary: User; Supporting: Chrome (notifications), Unified Orchestrator
- Preconditions: Extension loaded; timer not running; duration available for selected session type.
- Postconditions: Timer is running; start/end timestamps stored; UI shows countdown; if unified mode enabled, active category switched accordingly.
- Standard process:
  1) User selects session type and clicks Start.
  2) System records start/end timestamps and marks isRunning=true.
  3) If unified mode is enabled, switch to focus/break category.
  4) Persist timer state and broadcast to UIs.
- Alternative process:
  - A1) Timer already running → reject start and keep current state.
  - A2) Invalid or missing duration → show error, do not start.
  - A3) Unified mode disabled or misconfigured → start timer without category switching.

## UC-02 Pause timer
- Description: Temporarily halt countdown.
- Actors: Primary: User
- Preconditions: A session is running.
- Postconditions: Timer is paused with remaining time preserved; isRunning=false.
- Standard process:
  1) User clicks Pause.
  2) System freezes timeLeft and updates state across contexts.
- Alternative process:
  - A1) No running session → ignore or show message.

## UC-03 Reset timer
- Description: Stop the current session and clear countdown.
- Actors: Primary: User; Supporting: Unified Orchestrator
- Preconditions: A session exists (running or paused).
- Postconditions: Timer cleared to idle; any unified-mode category switch may be restored.
- Standard process:
  1) User clicks Reset.
  2) System clears timestamps, resets state, broadcasts updates.
  3) If unified mode changed category, restore previous category.
- Alternative process:
  - A1) No session to reset → no-op.

## UC-04 Switch session type
- Description: Change session type (e.g., Focus → Short Break).
- Actors: Primary: User; Supporting: Unified Orchestrator
- Preconditions: Timer idle or at a transition; durations defined.
- Postconditions: Selected session type and duration applied; unified-mode category selected accordingly.
- Standard process:
  1) User selects target session type.
  2) System updates timer config and (if requested) starts session.
  3) Apply unified-category mapping.
- Alternative process:
  - A1) Switching during active run → pause or stop required first (as per UI policy).

## UC-05 Create category
- Description: Add a new blocking category with metadata (name/icon).
- Actors: Primary: User
- Preconditions: Dashboard open; valid name provided.
- Postconditions: Category metadata persisted; empty site list initialized.
- Standard process:
  1) User enters name (and optional icon) and submits.
  2) System saves metadata and initializes category.
- Alternative process:
  - A1) Duplicate name or invalid input → show validation error.

## UC-06 Add site to blocklist
- Description: Add a domain/URL to a category.
- Actors: Primary: User
- Preconditions: Category exists; valid URL/domain.
- Postconditions: Normalized domain added to category sites; persisted.
- Standard process:
  1) User supplies URL/domain (dashboard or quick-add).
  2) System normalizes, deduplicates, saves.
- Alternative process:
  - A1) Invalid/unsupported domain → reject with message.
  - A2) Site already present → no-op feedback.

## UC-07 Delete sites/categories
- Description: Remove site entries or delete an entire category.
- Actors: Primary: User
- Preconditions: Target site/category exists.
- Postconditions: Entries removed; if active category deleted, system unsets or switches to safe fallback.
- Standard process:
  1) User selects site(s) or category and confirms deletion.
  2) System updates storage and broadcasts changes.
- Alternative process:
  - A1) Attempt to delete last remaining category → allowed; results in “no active category”.

## UC-08 Switch active category
- Description: Choose which category is currently enforced by the blocker.
- Actors: Primary: User; Supporting: Content Script
- Preconditions: At least one category exists.
- Postconditions: Active category updated; content scripts enforce it immediately.
- Standard process:
  1) User selects a category as active.
  2) System saves activeCategoryId and notifies contexts.
- Alternative process:
  - A1) Selecting None → disables blocking until a category is set.

## UC-09 Access dashboard
- Description: Open the full React dashboard for management.
- Actors: Primary: User; Supporting: Chrome
- Preconditions: Extension installed; dashboard assets built.
- Postconditions: Dashboard SPA loaded; messaging subscriptions established.
- Standard process:
  1) User opens dashboard from popup/extension menu.
  2) System loads SPA and initial data.
- Alternative process:
  - A1) Build missing or load failure → show guidance to rebuild.

## UC-10 View analytics
- Description: Review session history and productivity metrics.
- Actors: Primary: User; Supporting: Analytics Service
- Preconditions: Some logged sessions (or empty state).
- Postconditions: Metrics and charts rendered; history accessible.
- Standard process:
  1) User opens Analytics/Summary page.
  2) System aggregates daily/weekly metrics and renders charts.
- Alternative process:
  - A1) No data → show empty-state with tips.
  - A2) Chart render error → show fallback table with counts.

## UC-11 Export data
- Description: Export analytics/session data for external use.
- Actors: Primary: User
- Preconditions: Analytics available.
- Postconditions: Downloaded file (e.g., JSON/CSV) provided to the user.
- Standard process:
  1) User clicks Export.
  2) System serializes analytics and triggers download.
- Alternative process:
  - A1) Serialization error → show error and suggest retry.

## UC-12 Configure settings
- Description: Change preferences (e.g., dark mode, notifications, durations).
- Actors: Primary: User
- Preconditions: Settings page open.
- Postconditions: Settings persisted and applied immediately where possible.
- Standard process:
  1) User modifies settings.
  2) System validates and saves; broadcasts to contexts.
- Alternative process:
  - A1) Invalid value (e.g., too short duration) → show validation error.

## UC-13 Toggle unified mode
- Description: Enable/disable automatic category switching tied to session phases.
- Actors: Primary: User; Supporting: Unified Orchestrator
- Preconditions: Categories exist for focus/break selection.
- Postconditions: Unified mode config saved; future sessions auto-apply categories.
- Standard process:
  1) User toggles unified mode and chooses focus/break categories.
  2) System persists configuration.
- Alternative process:
  - A1) Categories not selected → keep unified mode off and prompt selection.

## UC-14 Manage account
- Description: Update profile data, change password, or delete account.
- Actors: Primary: User; Supporting: Firebase
- Preconditions: User authenticated.
- Postconditions: Account changes persisted; local data aligned/cleared as appropriate.
- Standard process:
  1) User performs profile/password update or deletes account.
  2) System calls Firebase APIs and updates local state.
- Alternative process:
  - A1) Not authenticated → prompt sign-in.
  - A2) Provider-restricted action (e.g., Google user without password) → show instructions.

## UC-15 Sign in with Google
- Description: Authenticate via Google OAuth (Firebase) to enable sync.
- Actors: Primary: User; Supporting: Firebase/Google
- Preconditions: Firebase configured; network available.
- Postconditions: User session established; optional initial cloud pull and sync start.
- Standard process:
  1) User clicks “Sign in with Google”.
  2) System completes OAuth; stores auth state; triggers initial sync.
- Alternative process:
  - A1) User cancels or OAuth fails → remain signed out; show error.

## UC-16 Submit contact form
- Description: Send feedback/support message via EmailJS with rate limiting.
- Actors: Primary: User; Supporting: EmailJS
- Preconditions: Valid name, email, subject, message; cooldown not exceeded.
- Postconditions: Email accepted by EmailJS; user notified of success/failure.
- Standard process:
  1) User fills form and clicks Send.
  2) System validates fields, checks cooldown, POSTs to EmailJS, shows result.
- Alternative process:
  - A1) Invalid email/fields → show validation error.
  - A2) Rate limited → instruct to wait remaining seconds.
  - A3) EmailJS error → show API error.

## UC-17 Show blocking overlay
- Description: Block page interaction on sites within the active category.
- Actors: Primary: System (Content Script); Supporting: Chrome
- Preconditions: Active category exists and contains current domain.
- Postconditions: Full-screen overlay shown; interactions disabled until page change or category switch.
- Standard process:
  1) On page load or URL change, system normalizes domain and checks membership.
  2) If matched, inject overlay and disable interactions.
- Alternative process:
  - A1) No active category or no match → no overlay injected.

## UC-18 Notifications on session events
- Description: Notify user on session start/complete (system notification and/or TTS).
- Actors: Primary: System (Background); Supporting: Chrome
- Preconditions: Timer transitions occur; notification permissions available.
- Postconditions: User receives notification/voice alert.
- Standard process:
  1) On session start/complete, system creates Chrome notification and/or speaks TTS.
- Alternative process:
  - A1) Permission denied or disabled → skip notification; rely on UI state only.

## UC-19 Store data (local persistence)
- Description: Persist state, settings, and analytics via chrome.storage.local.
- Actors: Primary: System (Storage Service); Supporting: Chrome
- Preconditions: Extension running; storage available.
- Postconditions: Data safely stored; defaults applied on read.
- Standard process:
  1) Read/write keys through storage abstraction with error handling.
- Alternative process:
  - A1) Storage error → log and continue with in-memory fallback where applicable.

## UC-20 Cloud sync
- Description: Keep local data in sync with Firestore for signed-in users.
- Actors: Primary: System (Sync Service); Supporting: Firebase
- Preconditions: User authenticated; Firebase initialized.
- Postconditions: Local/cloud converge; sync status timestamps updated.
- Standard process:
  1) On sign-in/startup, pull cloud docs and merge by updatedAt.
  2) Push merged values back to cloud; write to local.
  3) Debounce-push on local changes.
- Alternative process:
  - A1) Offline or API error → log warning; retry later; local remains authoritative.

---

End of document.

