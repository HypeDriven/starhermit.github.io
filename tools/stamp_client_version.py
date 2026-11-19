#!/usr/bin/env python3
"""Accept client build metadata from the existing production deploy script.

Usage: stamp_client_version.py <platform> <version> <size-in-bytes> [<platform> <version> <size> ...]

The homepage no longer displays these values. The deployment script still
publishes the separate downloads/version.json manifest for the self-updater.
"""
import re
import sys

PLATFORMS = ("windows", "linux", "macos", "android")


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
    return 0


if __name__ == "__main__":
    sys.exit(main())
