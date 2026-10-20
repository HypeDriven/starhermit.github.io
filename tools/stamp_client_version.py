#!/usr/bin/env python3
"""Stamp the published Windows client's version and size into the landing pages.

Usage: stamp_client_version.py <version> <size-in-bytes>

Run by ../deploy_starhermit_production.sh right after it copies a new build to
downloads/StarHermit.exe (beside downloads/version.json, which the client's self-updater
reads). Only the English source changes: the download card's
<span class="client-build">v0.2.0 · 4.5</span> - digits and dots only, so the localizer
never treats it as prose - and the translated pages are then re-rendered offline from the
translation cache (tools/localize.py, needs `npm ci`), which carries the new span into every
language and refreshes localization/manifest.json. Nothing is sent to a translation service.
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPAN = re.compile(r'(<span class="client-build">)[^<]*(</span>)')


def main() -> int:
    if len(sys.argv) != 3 or not re.fullmatch(r"[0-9]+(\.[0-9]+)*", sys.argv[1]) or not sys.argv[2].isdigit():
        print(__doc__, file=sys.stderr)
        return 2
    version, size = sys.argv[1], int(sys.argv[2])
    megabytes = f"{size / (1024 * 1024):.1f}"
    page = ROOT / "index.html"
    text = page.read_text(encoding="utf-8")
    new, count = SPAN.subn(lambda m: f"{m.group(1)}v{version} · {megabytes}{m.group(2)}", text)
    if count != 1:
        print('index.html has no single <span class="client-build"> to stamp', file=sys.stderr)
        return 1
    if new != text:
        page.write_text(new, encoding="utf-8")
    subprocess.run([sys.executable, "tools/localize.py"], cwd=ROOT, check=True)
    print(f"stamped v{version} ({megabytes} MB) into the landing pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
