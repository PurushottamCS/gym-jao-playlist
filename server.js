// Minimal Express static server for the Gym जाओ music player.
// No routing logic, no APIs, no database — just serves the /public folder.
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve everything in /public directly (index.html, css, js, assets/background image)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Gym जाओ running at http://localhost:${PORT}`);
});
