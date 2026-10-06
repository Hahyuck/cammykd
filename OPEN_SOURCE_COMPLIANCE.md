# GBA PocketFrame — Open Source Compliance

Release target: 1.0.0
Audit date: 2026-10-07

## Native emulator core

GBA PocketFrame uses mGBA 0.10.5 as a separate libretro shared library.

- Upstream: https://github.com/mgba-emu/mgba
- Tag: https://github.com/mgba-emu/mgba/tree/0.10.5
- Commit: 26b7884bc25a5933960f3cdcd98bac1ae14d42e2
- Primary license: Mozilla Public License 2.0 (MPL-2.0)
- GBA PocketFrame modifications to MPL-covered mGBA source: none

mGBA 0.10.5 directly compiles blip-buf into the libretro core. blip-buf is
LGPL-2.1-or-later. The exact mGBA source and build instructions are made
available so recipients can rebuild/relink the native core.

Other relevant mGBA third-party notices:
- inih — BSD-3-Clause
- MurmurHash3 — public domain
- libretro API header — Expat/MIT-style license

The GBA PocketFrame Android build disables mGBA's internal LZMA/7z support;
ZIP/7z archives are decoded by the Android frontend.

## Android archive dependencies

- Apache Commons Compress 1.28.0 — Apache-2.0
- Apache Commons Codec 1.19.0 — Apache-2.0
- Apache Commons IO 2.20.0 — Apache-2.0
- Apache Commons Lang 3.18.0 — Apache-2.0
- XZ for Java 1.10 — 0BSD

## Distribution actions

The release build:
1. includes a user-visible Open Source Licenses screen;
2. packages MPL-2.0, LGPL-2.1, Apache-2.0 and the relevant permissive notices;
3. identifies the exact mGBA source tag and commit;
4. does not bundle commercial ROMs, Nintendo BIOS/boot ROMs, proprietary
   firmware, box art, or game screenshots.

If mGBA source files are modified later or the native linking model changes,
this audit must be repeated.

## Store naming note

Open-source licensing is not the main Google Play IP risk. The current title
"GBA PocketFrame" uses "GBA", which is a Nintendo trademark in video-game
software-related classes. For lowest trademark/review risk, use a neutral
primary title such as "PocketFrame" and describe GB/GBC/GBA compatibility
factually in the store description. If "GBA PocketFrame" is retained, obtain
trademark/legal advice before public release.
