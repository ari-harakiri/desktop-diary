#!/usr/bin/env python3
"""Generate scripts/desktop-diary.js from manifest-ordered source modules."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "scripts" / "bundle-manifest.json"


def load_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def build_bundle(manifest: dict) -> str:
    marker = manifest.get("module_marker")
    if not marker:
        raise RuntimeError("bundle manifest missing module_marker")

    template = (ROOT / manifest["runtime_template"]).read_text(encoding="utf-8")
    if marker not in template:
        raise RuntimeError(f"runtime template missing marker: {marker!r}")

    modules = manifest.get("modules", [])
    if not isinstance(modules, list):
        raise RuntimeError("manifest modules must be a list")

    source_chunks = []
    for entry in modules:
        path = ROOT / entry["path"]
        if not path.is_file():
            raise FileNotFoundError(f"missing module path: {entry['path']}")
        source = path.read_text(encoding="utf-8")
        source_chunks.append(f"\n  // === BEGIN {entry['path']} ===\n{source}\n  // === END {entry['path']} ===\n")

    return template.replace(marker, "".join(source_chunks))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Verify generated output is up to date.")
    args = parser.parse_args()

    manifest = load_manifest()
    generated_path = ROOT / manifest["generated_bundle"]
    built = build_bundle(manifest)

    if args.check:
        if not generated_path.is_file():
            raise FileNotFoundError(f"generated bundle missing: {generated_path}")
        current = generated_path.read_text(encoding="utf-8")
        if current == built:
            print("desktop-diary bundle is up to date.")
            return 0
        print("desktop-diary bundle is out of date.", file=sys.stderr)
        return 1

    generated_path.write_text(built, encoding="utf-8")
    print(f"built {generated_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
