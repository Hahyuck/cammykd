# GBA PocketFrame 1.0.0 — Open Source Notices

GBA PocketFrame's own application/frontend code is intended to be distributed under the MIT License unless a file states otherwise.

## mGBA 0.10.5
- License: Mozilla Public License 2.0 (MPL-2.0)
- The distributed `libmgba_libretro.so` is built from the mGBA 0.10.5 source tree.
- Exact source/build materials used for the released binary are exported alongside the release so recipients can rebuild the core and obtain source for MPL-covered files.

mGBA includes third-party code with additional licenses. In particular, `src/third-party/blip_buf/*` is LGPL-2.1-or-later. The release source materials preserve the complete source/build path needed to rebuild the mGBA libretro core with a modified copy of that component.

Other mGBA bundled components include inih (BSD-3-Clause) and public-domain components. Preserve upstream copyright/license files in the source distribution.

## Apache Commons Compress 1.28.0
- License: Apache License 2.0
- Preserve applicable LICENSE and NOTICE information.

## XZ for Java 1.12
- License: 0BSD
- Used for archive support.

## Android / Gradle dependencies
AndroidX and other transitive dependencies retain their respective licenses. A final dependency/license inventory should be retained with the release source materials.

## No proprietary game content
No commercial ROMs, BIOS files, Nintendo artwork, or other proprietary game assets are distributed with GBA PocketFrame.
