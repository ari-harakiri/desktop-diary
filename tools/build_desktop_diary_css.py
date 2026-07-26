#!/usr/bin/env python3
"""Generate desktop-diary.css from manifest-ordered stylesheet sources."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "styles" / "bundle-manifest.json"


def load_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def build_bundle(manifest: dict) -> str:
    modules = manifest.get("modules", [])
    if not isinstance(modules, list):
        raise RuntimeError("manifest modules must be a list")

    chunks = []
    for entry in modules:
        src_path = ROOT / entry["path"]
        if not src_path.is_file():
            raise FileNotFoundError(f"missing stylesheet module: {entry['path']}")
        css = src_path.read_text(encoding="utf-8")
        chunks.append(f"\n/*=== BEGIN {entry['path']} ===*/\n{css}\n/*=== END {entry['path']} ===*/\n")

    return "".join(chunks).lstrip("\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Check output is up-to-date")
    args = parser.parse_args()

    manifest = load_manifest()
    generated_path = ROOT / manifest["generated_stylesheet"]
    built = build_bundle(manifest)

    if args.check:
        if not generated_path.is_file():
            raise FileNotFoundError(f"missing generated stylesheet: {generated_path}")
        current = generated_path.read_text(encoding="utf-8")
        if current == built:
            print("desktop-diary stylesheet is up to date.")
            return 0
        print("desktop-diary stylesheet is out of date.", file=sys.stderr)
        return 1

    generated_path.write_text(built, encoding="utf-8")
    print(f"built {generated_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
