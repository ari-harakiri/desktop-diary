#!/usr/bin/env python3
"""Back-compat wrapper for older build manifests/scripts."""

from __future__ import annotations

from pathlib import Path
import runpy


def main() -> int:
    namespace = runpy.run_path(str(Path(__file__).with_name("verify_phase9.py")))
    return int(namespace.get("main", lambda: 0)())


if __name__ == "__main__":
    raise SystemExit(main())
