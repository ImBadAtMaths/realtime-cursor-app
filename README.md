# Realtime Cursor App

A static, GitHub Pages-compatible realtime cursor client. Enter a username, join the canvas, and move the pointer to publish canvas-relative coordinates.

## WebSocket protocol

Set `window.REALTIME_CURSOR_WS_URL` before loading `app.js` to connect a WebSocket server. Messages use this shape:

```json
{
  "type": "cursor:update",
  "room": "/",
  "cursor": { "id": "unique-id", "name": "Ada", "color": "#84a7ff", "x": 120, "y": 80 }
}
```

The client also uses `BroadcastChannel` when no server URL is configured, so two tabs on the same page can preview cursor updates locally.
