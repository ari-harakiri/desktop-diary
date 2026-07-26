# DesktopDiary styles

`desktop-diary.css` is the browser-ready stylesheet loaded by
`desktop-diary.html`. It is generated from the ordered files in `source/` and
should not be edited directly.

## Source ownership

- `foundation.css` — theme variables, fonts, page defaults, and desktop canvas.
- `window-system.css` — shared window chrome, menus, buttons, and inputs.
- `desktop-and-sign-on.css` — desktop icons, mailbox, companion base, and sign-on.
- `buddy-list.css` — Buddy List window and categories.
- `messages-and-compose.css` — instant messages and the shared rich composer.
- `sticky-notes.css` — sticky-note appearance and controls.
- `new-message-and-buddies.css` — new-message and buddy forms.
- `arinet.css` — AriNet browser.
- `post-mail.css` — Post Mail windows, stationery, and letters.
- `paint.css` — DesktopDiary Paint.
- `help-and-admin.css` — Help, administration, and usage statistics.
- `profiles.css` — profiles and profile Diary display.
- `search.css` — desktop and companion search.
- `profile-setup.css` — profile editing and account setup.
- `scrapbook.css` — scrapbook editor and preview.
- `personalization.css` — status display and Personalize controls.
- `taskbar-and-responsive.css` — taskbar, Start menu, calendar, and mobile rules.
- `companion-assets.css` — companion sprite variables and asset overrides.
- `koba-actions.css` — Koba actions, food, sleep, memos, and animations.
- `koba-play-ball.css` — Play Ball and curated Koba sprite overrides.
- `loader.css` — loading-screen animation.

The exact dependency order lives in `bundle-manifest.json`. Source files are not
loaded separately because their relative artwork URLs are designed for the
generated stylesheet's location.

## After changing a source module

Run:

```sh
python3 tools/build_all.py
python3 tools/verify_phase9.py
```

The builder performs the merge automatically. No copying and pasting is needed.
