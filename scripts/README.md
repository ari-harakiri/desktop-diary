# DesktopDiary JavaScript

`desktop-diary.js` is the browser-ready file loaded by `desktop-diary.html`.
It is generated automatically from the ordered source modules and
should not be edited directly.

## Source ownership

- `services/supabase.js` — Supabase accounts, RPCs, analytics, and public data.
- `core/state.js` — saved-state defaults, migrations, and shared runtime state.
- `core/persistence.js` — local saving and account-specific storage.
- `services/firebase.js` — optional Google/Firebase cloud sync.
- `core/media-and-helpers.js` — sounds, icons, trash, dialogs, and shared helpers.
- `core/boot.js` — startup.
- `runtime/error-boundary.js` — the outer error boundary and module insertion point.

## Shared application tools

- `shared/rich-compose.js` — rich text, inserted photos, voice notes, and compose helpers.
- `shared/drafts.js` — draft saving, loading, grouping, and deletion windows.
- `shared/entry-filters.js` — reusable entry type and keyword filters.
- `shared/post-mail-helpers.js` — delivery labels, dates, profile previews, and pigeon-window helpers.

## Feature ownership

- `features/sticky-notes-and-background.js` — custom fonts, desktop backgrounds, and sticky notes.
- `features/desktop-personalization.js` — themes, accessible desktop icons, and Personalize.
- `features/paint.js` — DesktopDiary Paint.
- `features/sign-on.js` — account creation, sign-on, recovery, and sign-off.
- `features/buddy-list.js` — Buddy List display and menus.
- `features/window-system.js` — movable windows and taskbar entries.
- `features/instant-messages.js` — buddy timelines, message windows, statistics, and filters.
- `features/search-and-companion.js` — search, Koba interactions, toys, alerts, and memories.
- `features/scrapbook.js` — scrapbook export, restore, and customization.
- `features/new-message.js` — new buddy messages.
- `features/buddies.js` — buddy and category management.
- `features/status.js` — status and mood editing.
- `features/logs.js` — status and mood history.
- `features/pigeon-delivery.js` — pigeon timing and animation state.
- `features/post-mail-offline.js` — offline Post Mail.
- `features/post-mail-online.js` — online Supabase-backed Post Mail.
- `features/arinet.js` — AriNet bookmarks and browser window.
- `features/help-and-admin.js` — Help, installation, administration, and statistics.
- `features/cloud-sync.js` — the Cloud Sync window.
- `features/profiles.js` — profile editing, help, previews, and blog display.
- `features/penpals.js` — PenPal alerts, requests, notifications, and public profiles.
- `features/profile-diary.js` — private profile Diary entry listing.
- `features/diary.js` — Diary entry creation and editing.
- `features/taskbar-clock.js` — taskbar clock behavior.
- `features/calendar.js` — calendar navigation and day windows.

The load order lives in `bundle-manifest.json`. Do not reorder modules without
checking their dependencies.

## After changing a source module

Run:

```sh
python3 tools/build_all.py
python3 tools/verify_phase9.py
```

The builder performs the merge automatically. No copying and pasting between
files is required.
