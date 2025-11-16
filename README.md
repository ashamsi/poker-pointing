# Poker Pointing (CRA + WebSocket)

This folder contains a small Create React App-style frontend and a minimal WebSocket server for real-time Planning Poker.

Quick start (macOS / zsh)

1. Install frontend deps

```bash
cd /Users/artur-shamsi/artur-dev/web/poker-pointing
npm install
```

2. Install server deps and start the server (in another terminal)

```bash
cd /Users/artur-shamsi/artur-dev/web/poker-pointing/server
npm install
npm start
```

3. Start the frontend

```bash
cd /Users/artur-shamsi/artur-dev/web/poker-pointing
npm start
```

The frontend will attempt to connect to ws://localhost:4000. Open multiple browser windows to see real-time updates.

Notes
- This is a minimal demo server (no authentication, no persistence) intended for local testing.
- To run in production, add a proper HTTP server and secure WebSocket handling.
# Poker Pointing (Planning Poker)

This is a small local Planning Poker (poker pointing) app built with React + Vite.

Features
- Add players
- Choose a vote for each player
- Reveal all votes
- Reset votes and clear players

Quick start (on macOS / zsh)

1. Install dependencies

```bash
cd /Users/artur-shamsi/artur-dev/web/poker-pointing
npm install
```

2. Start dev server

```bash
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

Notes & next steps
- This is a single-machine/local UI. To make it multiplayer across browsers, add a WebSocket server or use a small backend to sync state.
- Optional improvements: persistent storage (localStorage), keyboard shortcuts, nicer card animations, accessibility improvements.
