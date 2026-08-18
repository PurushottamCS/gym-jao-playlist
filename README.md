# Gym जाओ — Workout Music Player

A lightweight, dark-gym themed music player. Vanilla HTML/CSS/JS on the
front end, a one-file Express static server on the back end, playback
driven by the official **YouTube IFrame Player API** (no audio is
downloaded or redistributed).

## Project structure

```text
gym-music/
├── public/
│   ├── index.html        # page structure (header, player card, playlist drawer)
│   ├── css/
│   │   └── style.css     # all styling — dark glassmorphism, responsive rules
│   ├── js/
│   │   └── player.js      # YouTube IFrame API wiring + all UI behavior
│   └── assets/
│       └── background.jpg # <- put your background image here (see below)
├── server.js              # Express static server
├── package.json
└── README.md
```

## Run it

```bash
cd gym-music
npm install
npm start
```

Then open **http://localhost:3000**

(Port can be overridden with `PORT=xxxx npm start`.)

## Adding your background image

Currently set to:

```
public/assets/gym_final.png
```

That exact path is what `public/css/style.css` references
(`.bg-layer { background-image: url('../assets/gym_final.png'); }`).
If you swap in a different file, either keep that same filename or
update that one line in `style.css` to match your new filename.

## Changing the YouTube playlist later

Open `public/js/player.js` and edit the two lines at the top:

```js
const CONFIG = {
  PLAYLIST_ID: 'PLcx9aTJw_pIs',        // the `list=` value from the playlist URL
  PLAYLIST_DISPLAY_NAME: 'Gym जाओ Playlist', // label shown in the player
};
```

To get `PLAYLIST_ID` from a URL like
`https://youtube.com/playlist?list=XXXXXXXX&si=...`, copy just the
`XXXXXXXX` part (ignore the `&si=...` tracking parameter).

## How playback works

- The YouTube IFrame Player is created against the configured playlist
  and kept off-screen (not `display:none`, so playback isn't throttled),
  with its native controls hidden — all transport is driven by our own
  buttons calling the player's API (`playVideo`, `pauseVideo`,
  `nextVideo`, `previousVideo`, `seekTo`, `setVolume`, `setShuffle`,
  `setLoop`, `playVideoAt`).
- The current song title and album art come from the IFrame API
  (`getVideoData()`) and YouTube's public thumbnail CDN.
- Track titles in the playlist panel are fetched once via YouTube's
  public **oEmbed** endpoint (no API key needed); if a title fails to
  load it falls back to "Track N".
- Autoplay is intentionally off — the page never plays audio until the
  visitor taps Play, in line with browser autoplay policies.

## Notes

- Only dependency: `express`. No build step, no frontend framework.
- Keyboard shortcuts: Space = play/pause, ← / → = previous/next.
- Mobile: the playlist becomes a bottom drawer instead of a side panel.
