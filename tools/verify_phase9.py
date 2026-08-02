#!/usr/bin/env python3
"""Best-effort post-build verification for the JS bundle."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    manifest = json.loads((ROOT / "scripts" / "bundle-manifest.json").read_text(encoding="utf-8"))
    bundle_path = ROOT / manifest["generated_bundle"]
    template = (ROOT / manifest["runtime_template"]).read_text(encoding="utf-8")

    if not bundle_path.is_file():
        print("FAIL: generated bundle missing.")
        return 1

    bundle_text = bundle_path.read_text(encoding="utf-8")
    marker = manifest.get("module_marker", "")

    if marker in bundle_text:
        print("FAIL: marker token still present in generated bundle.")
        return 1

    if "function" not in bundle_text and "var " not in bundle_text:
        print("FAIL: generated bundle looks empty.")
        return 1

    if template.count(marker) != 1:
        print("WARN: marker count in template is unexpected.")

    # Spot-check that module files used in the manifest exist in the bundle.
    missing = []
    for module in manifest.get("modules", []):
        if f"BEGIN {module['path']}" not in bundle_text:
            missing.append(module["path"])

    if missing:
        print("FAIL: missing module markers in bundle:")
        for entry in missing:
            print(" -", entry)
        return 1

    canonical_path = ROOT / "desktop-diary.html"
    stylesheet_path = ROOT / "styles" / "desktop-diary.css"
    canonical = canonical_path.read_text(encoding="utf-8")
    stylesheet = stylesheet_path.read_text(encoding="utf-8")
    daily_memo_checks = (
        ("function openDailyMemoFromDesktopIcon(e)", bundle_text),
        ("window.open('daily-memo/index.html','_blank','noopener')", bundle_text),
        ('src="daily-memo/assets/printer-yellow-beige.png"', canonical),
        ("body:not(.signed-in) #typewriter-desktop-icon", stylesheet),
    )
    missing_daily_memo = [snippet for snippet, text in daily_memo_checks if snippet not in text]
    if missing_daily_memo:
        print("FAIL: Daily Memo regression detected:")
        for entry in missing_daily_memo:
            print(" -", entry)
        return 1

    daily_memo_files = (
        "daily-memo/index.html",
        "daily-memo/styles.css",
        "daily-memo/script.js",
        "daily-memo/assets/printer.png",
        "daily-memo/assets/printer-yellow-beige.png",
        "daily-memo/assets/button.png",
        "daily-memo/assets/heart.png",
    )
    missing_daily_memo_files = [path for path in daily_memo_files if not (ROOT / path).is_file()]
    if missing_daily_memo_files:
        print("FAIL: Daily Memo printer files are missing:")
        for entry in missing_daily_memo_files:
            print(" -", entry)
        return 1

    print("verify ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
