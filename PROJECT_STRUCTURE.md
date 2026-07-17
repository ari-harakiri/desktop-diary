# DesktopDiary project structure

Phases 1 through 9 changed where the existing code lives, not how DesktopDiary
behaves. The public entry file remains `desktop-diary.html`, and verified safety
copies of the original files are preserved in `backups/`.

## Current organization

```text
DesktopDiary Codex/
├── README.md                          Two-command project handoff
├── MAINTENANCE.md                     Testing, deployment, and recovery guide
├── index.html                         Website redirect
├── desktop-diary.html                 Generated canonical website page
├── page/
│   ├── bundle-manifest.json           Page-section order and build instructions
│   ├── README.md                      HTML ownership guide
│   └── source/                        Editable page-structure sections
├── styles/
│   ├── desktop-diary.css              Generated browser-ready stylesheet
│   ├── bundle-manifest.json           Stylesheet order and build instructions
│   ├── README.md                      CSS ownership guide
│   └── source/                        Editable feature-focused CSS modules
├── scripts/
│   ├── loader.js                      Loading-screen behavior
│   ├── desktop-diary.js               Generated browser-ready bundle
│   ├── bundle-manifest.json           Module order and build instructions
│   ├── runtime/
│   │   └── error-boundary.js          Outer application safety boundary
│   ├── services/
│   │   ├── supabase.js                Accounts, RPCs, analytics, public data
│   │   └── firebase.js                Optional Google/Firebase cloud sync
│   ├── shared/
│   │   ├── rich-compose.js            Rich text, photos, and voice notes
│   │   ├── drafts.js                  Draft storage and draft windows
│   │   ├── entry-filters.js           Shared entry filters and search matching
│   │   └── post-mail-helpers.js       Shared Post Mail and pigeon helpers
│   ├── core/
│   │   ├── state.js                   Saved-state defaults and migrations
│   │   ├── persistence.js             Local saving and account storage
│   │   ├── media-and-helpers.js       Sounds, icons, dialogs, shared helpers
│   │   └── boot.js                    Startup
│   └── features/
│       ├── sticky-notes-and-background.js  Fonts, backgrounds, sticky notes
│       ├── desktop-personalization.js Themes, icons, Personalize window
│       ├── paint.js                   DesktopDiary Paint
│       ├── sign-on.js                 Accounts and sign-on
│       ├── buddy-list.js              Buddy List display and menus
│       ├── window-system.js           Movable windows and taskbar entries
│       ├── instant-messages.js        Buddy timelines and message windows
│       ├── search-and-companion.js    Search, Koba, toys, alerts, memories
│       ├── scrapbook.js               Scrapbook export and restore
│       ├── new-message.js             New buddy messages
│       ├── buddies.js                 Buddy and category management
│       ├── status.js                  Status and mood editing
│       ├── logs.js                    Status and mood history
│       ├── pigeon-delivery.js         Pigeon scheduling and animations
│       ├── post-mail-offline.js       Offline Post Mail
│       ├── post-mail-online.js        Online Supabase Post Mail
│       ├── arinet.js                  AriNet browser
│       ├── help-and-admin.js          Help, admin, usage statistics
│       ├── cloud-sync.js              Cloud Sync window
│       ├── profiles.js                Profile editing and viewing
│       ├── penpals.js                 PenPals, requests, public profiles
│       ├── profile-diary.js           Private profile Diary listing
│       ├── diary.js                   Diary entry editor
│       ├── taskbar-clock.js           Taskbar clock
│       └── calendar.js                Calendar and daily entries
├── supabase/
│   ├── README.md                      Exact setup order and query names
│   ├── manifest.json                  SQL order, purpose, and checksums
│   ├── dtd-post-mail-schema.sql       Profiles, Diary sharing, Post Mail
│   ├── desktop-diary-admin-setup.sql  Admin and editable Help content
│   └── desktop-diary-usage-analytics-setup.sql
│                                         Privacy-transparent usage statistics
├── companions/                        Koba and pigeon modules
├── assets/
│   ├── embedded/                      Artwork extracted from the old HTML
│   ├── fonts/                         Built-in DesktopDiary fonts
│   ├── sudoku/                        Website-ready Sudoku artwork
│   └── sudoku-game.html               Self-contained Sudoku feature
├── source-assets/                      Original and reference media
│   ├── arinet/                         Original AriNet artwork
│   ├── audio/                          Reference sounds
│   ├── desktop-destroyer/              Planned feature source sheets
│   ├── koba/                           Original Koba artwork and frames
│   ├── pigeon/                         Original pigeon artwork
│   └── sudoku/                         Original Sudoku artwork
├── archive/
│   └── legacy-builds/                  Older non-canonical HTML builds
├── maintenance/
│   └── known-good.json                 Final compatibility and checksum contract
├── tools/                              Maintenance and asset-building scripts
└── backups/                            Read-only safety copies
```

## Where future changes belong

- Do not edit `desktop-diary.html` directly. It remains the canonical public
  file but is generated automatically.
- Change page structure or load order in the matching file under `page/source/`,
  then run the HTML builder.
- Do not edit `styles/desktop-diary.css` directly. It is generated automatically.
- Change DesktopDiary colors, layout, windows, or animations in the matching
  file under `styles/source/`, then run the CSS builder.
- Do not edit `scripts/desktop-diary.js` directly. It is generated automatically.
- Change app behavior in the matching file under `scripts/core/`,
  `scripts/services/`, `scripts/shared/`, or `scripts/features/`, then run the
  builder.
- Put helpers used by more than one feature in `scripts/shared/`; keep complete
  windows and user-facing workflows in `scripts/features/`.
- Keep Koba and pigeon work inside `companions/` whenever possible.
- Put original artwork and working files in `source-assets/`; copy or generate
  browser-ready media into `assets/` or `companions/sprites/`.
- Treat everything in `archive/legacy-builds/` as read-only historical context.
- Keep Supabase setup SQL in `supabase/`, preserve its manifest order, and use
  the exact query names in `supabase/README.md`.
- Put website-ready images in `assets/`; keep raw source artwork unchanged until
  its references have been inventoried.
- Never edit the files in `backups/`. They are recovery copies.

## Important compatibility rules

1. Keep the filename `desktop-diary.html`.
2. Do not change saved-data keys while reorganizing code.
3. Keep JavaScript files in their current load order unless their dependencies
   have been mapped first.
4. Keep Supabase privacy and authorization decisions server-authoritative.
5. Test sign-on, saving, themes, Paint, companions, Post Mail, and the admin
   window after structural changes.
6. Keep `scripts/bundle-manifest.json` in dependency order.
7. Do not merge the three Supabase SQL files or weaken their row-level security.
8. Keep `desktop-diary.html` at the project root as the canonical master.
9. Verify every media-path change; original artwork paths are not runtime paths.
10. Keep `styles/bundle-manifest.json` in dependency order and load only the
    generated stylesheet from `desktop-diary.html`.
11. Keep `page/bundle-manifest.json` in document order and always generate the
    canonical root `desktop-diary.html` after changing a page section.

## Building the JavaScript

After changing a source module, run:

```sh
python3 tools/build_desktop_diary.py
```

This automatically combines the ordered modules into `scripts/desktop-diary.js`.
You never need to copy, paste, or manually merge the files.

## Building the CSS

After changing a stylesheet source module, run:

```sh
python3 tools/build_desktop_diary_css.py
```

This combines the ordered files under `styles/source/` into
`styles/desktop-diary.css`. The website still downloads one stylesheet, and you
never need to merge CSS by hand.

## Building the HTML

After changing a page-structure section, run:

```sh
python3 tools/build_desktop_diary_html.py
```

This combines the ordered files under `page/source/` into the canonical
`desktop-diary.html`. The public filename and deployment entry point do not
change, and no manual merging is needed.

## Verification

Run this from the project folder after organizational work:

```sh
python3 tools/build_all.py
python3 tools/verify_phase9.py
```

`build_all.py` rebuilds JavaScript, CSS, and HTML in the correct order.
`verify_phase9.py` includes all earlier phase checks, verifies every known-good
runtime file and local reference, protects saved-data names, and confirms the
server-authoritative Supabase privacy boundaries.
