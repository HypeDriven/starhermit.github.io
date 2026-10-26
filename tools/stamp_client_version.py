#!/usr/bin/env python3
"""Stamp the published clients' versions and sizes into the landing pages.

Usage: stamp_client_version.py <platform> <version> <size-in-bytes> [<platform> <version> <size> ...]
       platform: windows | linux

Run by ../deploy_starhermit_production.sh right after it copies new builds to downloads/
(beside downloads/version.json, which the clients' self-updater reads). Only the English
source changes: each download card's <span class="client-build" data-platform="windows">v0.2.0 · 4.5</span>
- digits and dots only, so the localizer never treats it as prose - and the translated pages
are then re-rendered offline from the translation cache (tools/localize.py, needs `npm ci`),
which carries the new spans into every language and refreshes localization/manifest.json.
Nothing is sent to a translation service.
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLATFORMS = ("windows", "linux")


def stamp(text: str, platform: str, version: str, size: int) -> str:
    span = re.compile(rf'(<span class="client-build" data-platform="{platform}">)[^<]*(</span>)')
    megabytes = f"{size / (1024 * 1024):.1f}"
    new, count = span.subn(lambda m: f"{m.group(1)}v{version} · {megabytes}{m.group(2)}", text)
    if count != 1:
        raise ValueError(f'index.html has no single <span class="client-build" data-platform="{platform}"> to stamp')
    print(f"stamped {platform} v{version} ({megabytes} MB)")
    return new


def main() -> int:
    args = sys.argv[1:]
    if not args or len(args) % 3:
        print(__doc__, file=sys.stderr)
        return 2
    builds = [args[i:i + 3] for i in range(0, len(args), 3)]
    for platform, version, size in builds:
        if platform not in PLATFORMS or not re.fullmatch(r"[0-9]+(\.[0-9]+)*", version) or not size.isdigit():
            print(__doc__, file=sys.stderr)
            return 2
    page = ROOT / "index.html"
    text = original = page.read_text(encoding="utf-8")
    try:
        for platform, version, size in builds:
            text = stamp(text, platform, version, int(size))
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1
    if text != original:
        page.write_text(text, encoding="utf-8")
    subprocess.run([sys.executable, "tools/localize.py"], cwd=ROOT, check=True)
    print("re-rendered the translated pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
