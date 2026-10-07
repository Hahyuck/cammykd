# GBA PocketFrame 1.0.0 — Google Play Release Checklist

## Build / package
- Package: `com.pocketframe.app`
- Version: `1.0.0`
- Version code: `20`
- Target SDK: 36
- Architecture: arm64-v8a
- No `INTERNET` permission
- Android automatic backup disabled
- No ads, analytics, login, subscriptions, or IAP
- Games/ROMs/BIOS not included

## Before uploading
- Create a private upload keystore and keep it out of the public repository.
- Sign the release AAB with the upload key.
- Enable Google Play App Signing in Play Console.
- Publish a public privacy-policy URL, for example `docs/privacy.html` via GitHub Pages.
- Publish the exact release source/build materials and open-source notices.
- Do a final manifest/dependency scan after signing.

## Play Console declarations
- Data safety: verify after final dependency scan; current design has no collection/sharing and no network permission.
- Ads: No.
- App access: no login required.
- Content rating: complete honestly; the app includes no game content itself.
- State clearly that games/ROMs/BIOS are not included and users provide files they are legally entitled to use.
- Do not use Nintendo logos, copyrighted characters, bundled commercial screenshots, or proprietary game assets.

## Testing
- Install 1.0 candidate over the previous package and verify saves remain accessible.
- GB, GBC, GBA smoke tests.
- ZIP and 7z ROM loading.
- Native SRAM save + restart + reload.
- Quick Save / Quick Load.
- ROM swap, Close Game, Exit App.
- Portrait/landscape rotation.
- Speed: 1x / 1.5x / 2x / 3x.
- Control-layout custom preset save/load.
- Physical controller input.
- Background/resume and repeated rotation stress test.
- Export/clear local diagnostic report.

## New personal Play accounts
If the developer account is a personal account created after November 13, 2023, Google currently requires a closed test with at least 12 opted-in testers continuously for 14 days before production access can be requested.
