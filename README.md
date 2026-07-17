# DesktopDiary

DesktopDiary is organized into editable HTML, CSS, and JavaScript source files
that automatically rebuild the same browser-ready website files. The canonical
page remains `desktop-diary.html`.

## The two commands to remember

After making a code or design change, run:

```sh
python3 tools/build_all.py
python3 tools/verify_phase9.py
```

The first command rebuilds JavaScript, CSS, and HTML in the correct order. The
second checks the complete project, including local files, saved-data names,
recovery copies, and Supabase security boundaries.

To check whether generated files are current without rewriting them, run:

```sh
python3 tools/build_all.py --check
```

## Where to make changes

- Page structure: `page/source/`
- Appearance and animation styling: `styles/source/`
- App behavior: `scripts/core/`, `scripts/features/`, `scripts/services/`, and
  `scripts/shared/`
- Koba and pigeon behavior or artwork: `companions/`
- Supabase setup: `supabase/`
- Website-ready artwork: `assets/`
- Original or working artwork: `source-assets/`

Do not directly edit the generated files `desktop-diary.html`,
`styles/desktop-diary.css`, or `scripts/desktop-diary.js`. The builders create
them automatically, so no manual merging is required.

## Important safety rules

- Keep the filename `desktop-diary.html` unchanged.
- Do not rename saved-data keys without writing and testing a migration.
- Never put a Supabase service-role key in browser code.
- Keep consent and administrator decisions server-authoritative in Supabase.
- Do not edit files under `backups/` or `archive/legacy-builds/`.

See `PROJECT_STRUCTURE.md` for the folder map and `MAINTENANCE.md` for the full
testing, deployment, and recovery checklist.
