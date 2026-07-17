# DesktopDiary page structure

`desktop-diary.html` remains the canonical website page at the project root. It
is generated from the ordered HTML sections in `source/` and should not be
edited directly.

## Section ownership

- `document-head.html` — metadata, external dependencies, and stylesheets.
- `loader.html` — the loading screen and its early script.
- `desktop-icons-and-companion.html` — desktop icons, mailbox, trash, and Koba.
- `sign-on.html` — sign-on and account-entry controls.
- `connecting.html` — the connection progress window.
- `buddy-list.html` — Buddy List menus, identity display, and toolbar.
- `workspace-and-start-menu.html` — dynamic window layers and the Start menu.
- `search-and-taskbar-tray.html` — companion search, memory, clock, and tray.
- `calendar-and-document-close.html` — calendar, main script, and closing tags.

The exact order lives in `bundle-manifest.json`. These partial sections are
source files, not standalone web pages, so open `desktop-diary.html` when
previewing DesktopDiary.

## After changing a page section

Run:

```sh
python3 tools/build_all.py
python3 tools/verify_phase9.py
```

The builder updates the canonical page automatically. No manual merging is
required, and the public filename stays `desktop-diary.html`.
