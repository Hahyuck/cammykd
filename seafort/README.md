# code.js — sea-fort tour

A real-time three.js world in a single HTML file: a brick tower and a harbour town built in code, on a living sea, under a sky that runs through a whole day with a storm in it.

**Play:** https://hahyuck.github.io/cammykd/seafort/

- Touch (phones, tablets): an invisible pad. Left thumb moves, right thumb looks, double-tap returns to the tour.
- Leave the controls alone for 8 seconds and the camera glides back into the tour.
- Tour camera runs by itself. `W A S D` + mouse: free camera (`Q`/`E` down/up, `Shift` fast, `R` back to the tour). Click for sound, `M` mutes, `Space` pauses.
- Needs WebGL2 and a reasonably strong GPU.

## Credits

- Sky, clouds, light, water, post-processing and the film engine are from **Crimson Loong** by **ChetasLua** — https://github.com/ChetasLua/crimson-loong. This page is a derivative of that work; all credit for the engine goes to its author.
- three.js, MIT licence (see `vendor/LICENSE`; the copyright banner is kept in the built page).
- Tower, town, surf, lightning, ambient sound, free camera: DIVIDE01, written with Claude.
- The wreck islet and buoys are pieces of a Tripo-generated model.

## How it was made

See [PRODUCTION.md](PRODUCTION.md) (Korean): sources, modules, techniques, problems solved, and what is still unverified. Source modules are in `src/`.
