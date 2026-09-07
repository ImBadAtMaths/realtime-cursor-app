# Realtime Cursor App

A static, GitHub Pages-compatible realtime cursor client plus a small Node.js WebSocket relay. Enter a username, join the canvas, and move the pointer to publish canvas-relative coordinates to other connected users.

## Run locally

Install the relay dependency and start the server:

```sh
npm install
npm start
```

Serve this repository with any static file server, then set `window.REALTIME_CURSOR_WS_URL` in `config.js` to `ws://localhost:8080` before opening the page. The relay broadcasts updates only to clients in the same room and removes cursors when users disconnect.

## WebSocket protocol

For GitHub Pages, deploy the static files to Pages and host `server.js` separately on a Node-capable service. Set `window.REALTIME_CURSOR_WS_URL` in `config.js` to the service's secure `wss://` URL. GitHub Pages serves static files only; it does not host this WebSocket server. Leave the value empty to use the same-browser BroadcastChannel preview.

Messages use this shape:

```json
{
  "type": "cursor:update",
  "room": "/",
  "cursor": { "id": "unique-id", "name": "Ada", "color": "#84a7ff", "x": 120, "y": 80 }
}
```

The client uses `BroadcastChannel` only when no server URL is configured. Once a URL is set, all cursor updates go through the relay for true cross-user sharing.
