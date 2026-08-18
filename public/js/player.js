/* ============================================================
   Gym जाओ — player.js
   Drives a custom UI on top of the YouTube IFrame Player API.
   No audio is downloaded/redistributed — YouTube streams the
   video itself; we only hide its default chrome and drive it
   with our own transport controls.
   ============================================================ */

// ---- Configuration: edit these two lines to change playlist/name ----
const CONFIG = {
  PLAYLIST_ID: 'PLcx9aTJw_pIs',
  PLAYLIST_DISPLAY_NAME: 'Gym जाओ Playlist',
};

// ---- DOM references ----
const els = {
  songTitle: document.getElementById('songTitle'),
  songStatus: document.getElementById('songStatus'),
  albumArt: document.getElementById('albumArt'),
  albumImg: document.getElementById('albumImg'),
  equalizer: document.getElementById('equalizer'),

  playBtn: document.getElementById('playBtn'),
  iconPlay: document.getElementById('iconPlay'),
  iconPause: document.getElementById('iconPause'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  repeatBtn: document.getElementById('repeatBtn'),

  progressTrack: document.getElementById('progressTrack'),
  progressFill: document.getElementById('progressFill'),
  progressHandle: document.getElementById('progressHandle'),
  currentTime: document.getElementById('currentTime'),
  durationTime: document.getElementById('durationTime'),

  volumeSlider: document.getElementById('volumeSlider'),
  muteBtn: document.getElementById('muteBtn'),
  iconVolHigh: document.getElementById('iconVolHigh'),
  iconVolMute: document.getElementById('iconVolMute'),

  playlistToggle: document.getElementById('playlistToggle'),
  playlistPanel: document.getElementById('playlistPanel'),
  playlistOverlay: document.getElementById('playlistOverlay'),
  playlistClose: document.getElementById('playlistClose'),
  playlistList: document.getElementById('playlistList'),
};

// ---- State ----
let player = null;
let isPlaying = false;
let isSeeking = false;
let shuffleOn = false;
let repeatOn = false;
let lastVolume = 70;
let progressTimer = null;
let playlistIds = [];
let titleCache = {};

// ============================================================
// YouTube IFrame API bootstrap
// ============================================================
// Called automatically by the YouTube iframe_api script once it has loaded.
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytPlayer', {
    height: '1',
    width: '1',
    playerVars: {
      listType: 'playlist',
      list: CONFIG.PLAYLIST_ID,
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      fs: 0,
      iv_load_policy: 3,
      playsinline: 1,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
    },
  });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function onPlayerReady() {
  player.setVolume(Number(els.volumeSlider.value));
  els.songStatus.textContent = 'Ready — tap play to start';
  loadPlaylistIds(0);
}

// getPlaylist() can be empty for a moment right after onReady, so retry briefly.
function loadPlaylistIds(attempt) {
  const ids = player.getPlaylist && player.getPlaylist();
  if (ids && ids.length) {
    playlistIds = ids;
    renderPlaylist();
    showInitialTrack();
  } else if (attempt < 10) {
    setTimeout(() => loadPlaylistIds(attempt + 1), 400);
  } else {
    els.playlistList.innerHTML = '<li class="playlist-empty">Playlist unavailable right now.</li>';
  }
}

// Show track 1's title/thumbnail as soon as the playlist loads, instead of
// leaving "Loading playlist…" up until the visitor actually presses play —
// YouTube never fires a state-change event (so never gives us getVideoData())
// until playback starts, since autoplay is off.
function showInitialTrack() {
  if (isPlaying || !playlistIds.length) return;
  const firstId = playlistIds[0];
  els.albumImg.src = `https://img.youtube.com/vi/${firstId}/hqdefault.jpg`;
  els.songTitle.textContent = titleCache[firstId] || 'Track 1';
}

function onPlayerStateChange(event) {
  const state = event.data;

  if (state === YT.PlayerState.PLAYING) {
    isPlaying = true;
    setPlayingUI(true);
    startProgressLoop();
    updateNowPlaying();
    if (!playlistIds.length) loadPlaylistIds(0);
    highlightActive();
  } else if (state === YT.PlayerState.PAUSED) {
    isPlaying = false;
    setPlayingUI(false);
    stopProgressLoop();
    els.songStatus.textContent = 'Paused';
  } else if (state === YT.PlayerState.BUFFERING) {
    els.songStatus.textContent = 'Buffering…';
  } else if (state === YT.PlayerState.CUED) {
    updateNowPlaying();
  }
}

function onPlayerError() {
  els.songStatus.textContent = 'Track unavailable — skipping…';
  setTimeout(() => player.nextVideo(), 1000);
}

// ============================================================
// Now-playing UI
// ============================================================
function updateNowPlaying() {
  const data = player.getVideoData ? player.getVideoData() : null;
  const title = (data && data.title) ? data.title : 'Gym जाओ Track';
  const videoId = data && data.video_id;

  els.songTitle.textContent = title;
  els.songStatus.textContent = isPlaying ? 'Now Playing' : 'Paused';

  if (videoId) {
    els.albumImg.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    if (title) titleCache[videoId] = title;
    updatePlaylistRowTitle(videoId, title);
  }
}

function setPlayingUI(playing) {
  els.iconPlay.style.display = playing ? 'none' : 'block';
  els.iconPause.style.display = playing ? 'block' : 'none';
  els.playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  els.albumArt.classList.toggle('is-playing', playing);
  els.equalizer.classList.toggle('active', playing);
}

// ============================================================
// Progress bar
// ============================================================
function startProgressLoop() {
  stopProgressLoop();
  progressTimer = setInterval(tickProgress, 500);
  tickProgress();
}

function stopProgressLoop() {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = null;
}

function tickProgress() {
  if (!player || isSeeking) return;
  const cur = player.getCurrentTime ? player.getCurrentTime() : 0;
  const dur = player.getDuration ? player.getDuration() : 0;
  const pct = dur > 0 ? (cur / dur) * 100 : 0;

  els.progressFill.style.width = pct + '%';
  els.progressHandle.style.left = pct + '%';
  els.currentTime.textContent = formatTime(cur);
  els.durationTime.textContent = formatTime(dur);
}

function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function seekFromEvent(clientX) {
  const rect = els.progressTrack.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  els.progressFill.style.width = ratio * 100 + '%';
  els.progressHandle.style.left = ratio * 100 + '%';
  return ratio;
}

els.progressTrack.addEventListener('pointerdown', (e) => {
  isSeeking = true;
  seekFromEvent(e.clientX);
  els.progressTrack.setPointerCapture(e.pointerId);
});
els.progressTrack.addEventListener('pointermove', (e) => {
  if (isSeeking) seekFromEvent(e.clientX);
});
els.progressTrack.addEventListener('pointerup', (e) => {
  if (!isSeeking || !player) return;
  const ratio = seekFromEvent(e.clientX);
  const dur = player.getDuration ? player.getDuration() : 0;
  if (dur > 0) player.seekTo(dur * ratio, true);
  isSeeking = false;
});

// ============================================================
// Transport controls
// ============================================================
els.playBtn.addEventListener('click', () => {
  if (!player) return;
  if (isPlaying) player.pauseVideo();
  else player.playVideo();
});

els.prevBtn.addEventListener('click', () => player && player.previousVideo());
els.nextBtn.addEventListener('click', () => player && player.nextVideo());

els.shuffleBtn.addEventListener('click', () => {
  shuffleOn = !shuffleOn;
  els.shuffleBtn.setAttribute('aria-pressed', String(shuffleOn));
  if (player && player.setShuffle) player.setShuffle(shuffleOn);
});

els.repeatBtn.addEventListener('click', () => {
  repeatOn = !repeatOn;
  els.repeatBtn.setAttribute('aria-pressed', String(repeatOn));
  if (player && player.setLoop) player.setLoop(repeatOn);
});

// ============================================================
// Volume
// ============================================================
els.volumeSlider.addEventListener('input', () => {
  const val = Number(els.volumeSlider.value);
  if (player && player.setVolume) player.setVolume(val);
  if (val > 0) {
    lastVolume = val;
    if (player && player.isMuted && player.isMuted()) player.unMute();
  }
  updateVolumeIcon(val);
});

els.muteBtn.addEventListener('click', () => {
  if (!player) return;
  const muted = player.isMuted && player.isMuted();
  if (muted) {
    player.unMute();
    els.volumeSlider.value = lastVolume || 70;
    updateVolumeIcon(Number(els.volumeSlider.value));
  } else {
    lastVolume = Number(els.volumeSlider.value) || lastVolume;
    player.mute();
    els.volumeSlider.value = 0;
    updateVolumeIcon(0);
  }
});

function updateVolumeIcon(val) {
  const muted = val <= 0;
  els.iconVolHigh.style.display = muted ? 'none' : 'block';
  els.iconVolMute.style.display = muted ? 'block' : 'none';
}

// ============================================================
// Playlist panel
// ============================================================
function openPlaylist() {
  els.playlistPanel.classList.add('open');
  els.playlistOverlay.classList.add('open');
  els.playlistPanel.setAttribute('aria-hidden', 'false');
  els.playlistToggle.setAttribute('aria-expanded', 'true');
}

function closePlaylist() {
  els.playlistPanel.classList.remove('open');
  els.playlistOverlay.classList.remove('open');
  els.playlistPanel.setAttribute('aria-hidden', 'true');
  els.playlistToggle.setAttribute('aria-expanded', 'false');
}

els.playlistToggle.addEventListener('click', () => {
  const isOpen = els.playlistPanel.classList.contains('open');
  isOpen ? closePlaylist() : openPlaylist();
});
els.playlistClose.addEventListener('click', closePlaylist);
els.playlistOverlay.addEventListener('click', closePlaylist);

function renderPlaylist() {
  els.playlistList.innerHTML = '';
  playlistIds.forEach((videoId, index) => {
    const li = document.createElement('li');
    li.dataset.videoId = videoId;
    li.dataset.index = index;
    li.innerHTML = `
      <span class="track-num">${index + 1}</span>
      <span class="track-title">${titleCache[videoId] || 'Track ' + (index + 1)}</span>
      <button class="track-play" aria-label="Play track ${index + 1}" title="Play">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
      </button>`;
    li.addEventListener('click', () => {
      player.playVideoAt(index);
      if (window.innerWidth <= 560) closePlaylist();
    });
    els.playlistList.appendChild(li);
  });
  highlightActive();
  fetchPlaylistTitles();
}

function highlightActive() {
  if (!player || !player.getPlaylistIndex) return;
  const idx = player.getPlaylistIndex();
  [...els.playlistList.children].forEach((li) => {
    li.classList.toggle('active', Number(li.dataset.index) === idx);
  });
}

function updatePlaylistRowTitle(videoId, title) {
  const li = els.playlistList.querySelector(`li[data-video-id="${videoId}"]`);
  if (li) li.querySelector('.track-title').textContent = title;
}

// Fetch real titles for every track via YouTube's public oEmbed endpoint
// (no API key required). Falls back silently to "Track N" if it fails.
function fetchPlaylistTitles() {
  playlistIds.forEach((videoId, index) => {
    if (titleCache[videoId]) return;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      'https://www.youtube.com/watch?v=' + videoId
    )}&format=json`;

    fetch(oembedUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.title) {
          titleCache[videoId] = data.title;
          updatePlaylistRowTitle(videoId, data.title);
          // Track 1's real title arrives async — swap it into the main
          // display too, as long as the visitor hasn't started playback
          // (which would mean onPlayerStateChange already owns the title).
          if (index === 0 && !isPlaying) {
            els.songTitle.textContent = data.title;
          }
        }
      })
      .catch(() => {
        /* keep the "Track N" placeholder on failure */
      });
  });
}

// ============================================================
// Keyboard shortcuts (space = play/pause, arrows = prev/next)
// ============================================================
document.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (e.code === 'Space') {
    e.preventDefault();
    els.playBtn.click();
  } else if (e.code === 'ArrowRight') {
    els.nextBtn.click();
  } else if (e.code === 'ArrowLeft') {
    els.prevBtn.click();
  }
});
