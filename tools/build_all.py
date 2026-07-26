#!/usr/bin/env python3
"""Run the local build pipeline used by this repo."""

from __future__ import annotations

import json
import shlex
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "scripts" / "bundle-manifest.json").read_text(encoding="utf-8"))


def run(cmd: str) -> bool:
    parts = shlex.split(cmd)
    if not parts:
        print("FAILED: empty command")
        return False

    script_index = 1 if parts[0] == "python3" else 0
    if script_index >= len(parts):
        print(f"FAILED: malformed command: {cmd}")
        return False

    script_path = ROOT / parts[script_index]
    if not script_path.is_file():
        print(f"FAILED: missing script: {script_path}")
        return False

    try:
        subprocess.check_call(parts, cwd=ROOT)
        return True
    except subprocess.CalledProcessError:
        print(f"FAILED: {cmd}")
        return False


def main() -> int:
    ok = True

    # Build JavaScript bundle.
    ok = run("python3 tools/build_desktop_diary.py") and ok

    # Optional CSS rebuild if a helper exists in this workspace.
    if (ROOT / "tools" / "build_desktop_diary_css.py").is_file():
        ok = run("python3 tools/build_desktop_diary_css.py") and ok
    else:
        print("INFO: skipping optional tools/build_desktop_diary_css.py (not present)")

    # Optional deployment artifact sync.
    if (ROOT / "tools" / "build_github_deploy.py").is_file():
        ok = run("python3 tools/build_github_deploy.py") and ok

    # Optional phase check if present.
    verify_command = MANIFEST.get("verify_command")
    if verify_command:
        # Expected format: "python3 tools/verify_phase9.py"
        ok = run(verify_command) and ok

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
