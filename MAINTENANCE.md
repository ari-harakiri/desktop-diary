# DesktopDiary maintenance and recovery

This is the final handoff for the nine-phase organization system. It is written
so routine work does not require manually combining files.

## Normal change workflow

1. Edit the matching source file described in `PROJECT_STRUCTURE.md`.
2. Rebuild all generated browser files:

   ```sh
   python3 tools/build_all.py
   ```

3. Run the complete safety check:

   ```sh
   python3 tools/verify_phase9.py
   ```

4. Preview `desktop-diary.html` and test the feature you changed.
5. Upload the updated source files and generated files together.

## Generated files

| Browser-ready file | Editable source | Builder |
|---|---|---|
| `desktop-diary.html` | `page/source/` | `tools/build_desktop_diary_html.py` |
| `styles/desktop-diary.css` | `styles/source/` | `tools/build_desktop_diary_css.py` |
| `scripts/desktop-diary.js` | `scripts/core/`, `features/`, `services/`, and `shared/` | `tools/build_desktop_diary.py` |

`tools/build_all.py` runs all three builders in the correct order.

## Protected compatibility contract

The final verifier protects these names because changing them without a
migration can make existing diaries appear missing:

- IndexedDB database: `instant-diary-db`
- IndexedDB object store: `kv`
- General diary key: `buddy-diary-data-v1`
- Per-account prefix: `buddy-diary-data-v1-account-`
- Active-session key: `desktop-diary-signed-in`
- Remembered-account key: `desktop-diary-last-account-email`
- Supabase-session key: `desktop-diary-supabase-session`
- Existing top-level saved-state fields and Firebase collection paths

If a future feature genuinely needs to change one of these, write a migration
that reads the old name and preserves the data before updating the known-good
contract.

## Supabase safety contract

- The browser sends analytics only an approved event name and broad device
  class.
- Supabase reads the stored preference and decides whether an account identity
  may be attached.
- Analytics failures remain silent and cannot block DesktopDiary.
- Row-level security, function grants, and administrator checks remain in the
  three ordered SQL files under `supabase/`.
- A Supabase service-role key must never appear in HTML or JavaScript.

Organizational work does not require rerunning SQL in Supabase. Use the exact
query names and setup order in `supabase/README.md` only when configuring a new
database or deliberately deploying a SQL change.

## Recovery map

- Original pre-organization page: `backups/desktop-diary-phase-1-original-2026-07-16.html`
- Phase 6 stylesheet: `backups/desktop-diary-phase-6-stylesheet.css`
- Phase 7 canonical page: `backups/desktop-diary-phase-7-page.html`
- Earlier JavaScript and manifests: `backups/desktop-diary-phase-2-*` and
  `backups/desktop-diary-phase-3-*`
- Supabase recovery SQL: `backups/phase-5-supabase/`
- Phase 6 asset-tool recovery copies: `backups/phase-6-assets/`
- Original artwork provenance: `source-assets/manifest.json`
- Legacy page provenance: `archive/manifest.json`
- Final known-good checksums: `maintenance/known-good.json`

Do not replace the whole project from a backup when only one generated file is
out of date. First run `python3 tools/build_all.py`; it safely recreates the
three generated files from their organized sources.

## Final release checklist

- Run `python3 tools/build_all.py --check`.
- Run `python3 tools/verify_phase9.py`.
- Confirm sign-on or the existing signed-in desktop loads.
- Open Start, Personalize, Paint, companion search, and the calendar.
- Check Koba, the mailbox, Post Mail, and AriNet.
- Confirm the browser reports no missing local resources.
- Upload `desktop-diary.html` with its `page/`, `styles/`, `scripts/`,
  `companions/`, and `assets/` dependencies.
- Run Supabase SQL only when a deliberate database change requires it.
