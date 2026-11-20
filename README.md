# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ko1216-lild/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ko1216-lild/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# gta6-cover-art-01 — entry

**Neon Coast Cover Maker** — an entry for make.fun's bounty
*gta6-cover-art-01*. A fully offline web app (static files under
`app/`, no libraries, no network: photos never leave the machine)
that turns a person's photo and a caption into cover art in the
style of GTA's multi-panel posters, and exports a PNG.

- Load photos by file picker or drag & drop (two bundled samples
  included), assign photos per panel or let one photo fill every
  panel with different crops.
- Four multi-panel layouts: Classic Collage (diagonal five-panel),
  Triptych, Grid Story, and Hero + Strip.
- Three colour grades — Vice Sunset, Neon Nights, Golden Hour —
  with an intensity slider.
- Poster lettering of your own: editable title and subtitle, five
  accent colours, position and size controls. No Rockstar logo,
  artwork or fonts anywhere.
- Export PNG at 1080x1080, 1080x1350 and 1920x1080.

`main.ts` copies `app/` and `screenshots/` to the output directory
and writes `dossier.json` (via the kit's vendored
`vendor/makefun-app.ts`, unchanged). The screenshots in
`screenshots/` are real renders of this app.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```
