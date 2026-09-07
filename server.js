const http = require("node:http");
const { WebSocket, WebSocketServer } = require("ws");

const port = Number(process.env.PORT || 8080);
const server = http.createServer((request, response) => {
  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end("Realtime cursor relay is running.\n");
});
const websocketServer = new WebSocketServer({ server });
const clients = new Map();

function isCursor(cursor) {
  return cursor && typeof cursor.id === "string" && typeof cursor.name === "string"
    && typeof cursor.color === "string" && Number.isFinite(cursor.x) && Number.isFinite(cursor.y);
}

function send(client, message) {
  if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
}

function broadcast(room, message, excludedClient) {
  for (const [client, state] of clients) {
    if (client !== excludedClient && state.room === room) send(client, message);
  }
}

websocketServer.on("connection", (client) => {
  clients.set(client, { room: null, cursor: null });

  client.on("message", (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      return;
    }
    if (typeof message.room !== "string" || message.room.length > 200) return;
    const state = clients.get(client);
    if (!state) return;

    if (message.type === "join" && isCursor(message.cursor)) {
      state.room = message.room;
      state.cursor = message.cursor;
      for (const [otherClient, otherState] of clients) {
        if (otherClient !== client && otherState.room === state.room && otherState.cursor) {
          send(client, { type: "cursor:update", room: state.room, cursor: otherState.cursor });
        }
      }
      broadcast(state.room, { type: "cursor:update", room: state.room, cursor: state.cursor }, client);
    } else if (message.type === "cursor:update" && state.room === message.room && isCursor(message.cursor)) {
      state.cursor = message.cursor;
      broadcast(state.room, message, client);
    }
  });

  client.on("close", () => {
    const state = clients.get(client);
    clients.delete(client);
    if (state && state.room && state.cursor) {
      broadcast(state.room, { type: "cursor:leave", room: state.room, id: state.cursor.id });
    }
  });
});

server.listen(port, () => console.log(`Realtime cursor relay listening on port ${port}`));
