#!/usr/bin/env python3
"""Inject ALL permissions a food delivery app needs into the Android manifest.

Run after `npx cap add android` (which generates android/app/src/main/
AndroidManifest.xml from a template with only INTERNET). The script inserts
every <uses-permission> the Dadu Food app needs — location (GPS delivery +
rider tracking), camera + gallery (Easypaisa receipt photo), microphone
(Munchi voice agent), notifications (order updates) — before the
<application> tag. Idempotent: running it twice adds nothing.

Usage: python3 scripts/add-android-permissions.py [path/to/AndroidManifest.xml]
Default path: android/app/src/main/AndroidManifest.xml (relative to repo root).
"""

import sys
from pathlib import Path

# Every permission the app needs (user 28 Nov 02:47: "sari permission dalo").
PERMISSIONS = [
    # Network (app is online-first: orders, Firebase, maps)
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    # Location — GPS delivery address + rider live tracking
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_BACKGROUND_LOCATION",
    # Camera + gallery — Easypaisa receipt screenshot upload
    "android.permission.CAMERA",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    # Microphone — Munchi voice agent (Groq voice calls)
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    # Notifications — order status updates
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.VIBRATE",
    "android.permission.WAKE_LOCK",
    "android.permission.RECEIVE_BOOT_COMPLETED",
    # Foreground service — rider live location while delivering
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_LOCATION",
]

# Features the app uses (declared so Play / the installer shows them).
FEATURES = [
    ('android.hardware.camera', 'false'),
    ('android.hardware.location.gps', 'false'),
    ('android.hardware.microphone', 'false'),
]


def main() -> int:
    manifest = Path(sys.argv[1] if len(sys.argv) > 1 else "android/app/src/main/AndroidManifest.xml")
    text = manifest.read_text(encoding="utf-8")

    lines = []
    for perm in PERMISSIONS:
        tag = f'    <uses-permission android:name="{perm}" />'
        if tag not in text:
            lines.append(tag)
    for name, required in FEATURES:
        tag = f'    <uses-feature android:name="{name}" android:required="{required}" />'
        if tag not in text:
            lines.append(tag)

    if not lines:
        print("All permissions already present — nothing to add.")
        return 0

    anchor = "    <application"
    idx = text.index(anchor)
    text = text[:idx] + "\n".join(lines) + "\n" + text[idx:]
    manifest.write_text(text, encoding="utf-8")
    print(f"Added {len(lines)} permission/feature entries to {manifest}")
    for line in lines:
        print("  +", line.strip())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
