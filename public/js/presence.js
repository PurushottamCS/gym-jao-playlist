/* ============================================================
   Gym जाओ — presence.js
   Drives the "GYM BUDDIES" badge in the top-left corner: a live
   count of how many people currently have the site open, backed by
   the tiny heartbeat API in server.js (no accounts, no database —
   just an in-memory "last seen" map keyed by a random per-tab id).
   ============================================================ */

(function () {
  const HEARTBEAT_INTERVAL_MS = 10 * 1000; // how often this tab checks in
  const CLIENT_ID_KEY = 'gymBuddiesClientId';

  const countEl = document.getElementById('onlineCount');
  const badgeEl = document.getElementById('gymBuddies');
  if (!countEl || !badgeEl) return; // markup not present — nothing to drive

  // One id per tab: sessionStorage survives reloads in this tab but not
  // across new tabs, so opening several tabs counts as several buddies —
  // which matches what the badge is meant to show (people online right now).
  function getClientId() {
    let id = sessionStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  }

  const clientId = getClientId();

  function setCount(count) {
    if (typeof count !== 'number') return;
    countEl.textContent = String(Math.max(1, count)); // this tab is always at least 1
    badgeEl.classList.add('is-live');
  }

  function heartbeat() {
    fetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCount(data.count))
      .catch(() => {
        /* offline/server hiccup — keep showing the last known count */
      });
  }

  // Best-effort: tell the server we're gone as soon as the tab closes, so
  // the count drops immediately instead of waiting out the server's TTL.
  function announceLeave() {
    if (!navigator.sendBeacon) return;
    const payload = new Blob([JSON.stringify({ clientId })], { type: 'application/json' });
    navigator.sendBeacon('/api/presence/leave', payload);
  }

  heartbeat();
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  window.addEventListener('pagehide', announceLeave);
})();
