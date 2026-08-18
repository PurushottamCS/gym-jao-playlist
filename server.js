// Minimal Express static server for the Gym जाओ music player.
// Just serves the /public folder, plus a tiny in-memory "GYM BUDDIES"
// presence API so the header can show how many people are online right now.
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve everything in /public directly (index.html, css, js, assets/background image)
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------
// GYM BUDDIES presence tracking
// No database — just an in-memory map of clientId -> lastSeen time.
// Each browser tab generates a random clientId and "checks in" via a
// heartbeat every few seconds; anyone not heard from within HEARTBEAT_TTL
// is considered gone. Good enough for a single-process app like this one.
// ---------------------------------------------------------------
const HEARTBEAT_TTL_MS = 25 * 1000; // must comfortably exceed presence.js's heartbeat interval
const onlineClients = new Map(); // clientId -> lastSeen (ms epoch)

function pruneStaleClients() {
  const cutoff = Date.now() - HEARTBEAT_TTL_MS;
  for (const [clientId, lastSeen] of onlineClients) {
    if (lastSeen < cutoff) onlineClients.delete(clientId);
  }
}

// Heartbeat: a client calls this on load and on an interval to say "I'm still here".
app.post('/api/presence/heartbeat', (req, res) => {
  const clientId = req.body && req.body.clientId;
  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'clientId is required' });
  }
  onlineClients.set(clientId, Date.now());
  pruneStaleClients();
  res.json({ count: onlineClients.size });
});

// Leave: sent via navigator.sendBeacon when a tab closes/unloads, so the
// count drops immediately instead of waiting out the TTL.
app.post('/api/presence/leave', (req, res) => {
  const clientId = req.body && req.body.clientId;
  if (clientId) onlineClients.delete(clientId);
  res.status(204).end();
});

// Plain read: lets the UI poll the current count without also renewing
// its own heartbeat (used between heartbeat ticks for a snappier display).
app.get('/api/presence/count', (req, res) => {
  pruneStaleClients();
  res.json({ count: onlineClients.size });
});

app.listen(PORT, () => {
  console.log(`Gym जाओ running at http://localhost:${PORT}`);
});
