(() => {
  const canvas = document.querySelector("#cursor-canvas");
  const context = canvas.getContext("2d");
  const form = document.querySelector("#join-form");
  const usernameInput = document.querySelector("#username");
  const status = document.querySelector("#connection-status");
  const statusDot = document.querySelector("#connection-dot");
  const cursorList = document.querySelector("#cursor-list");
  const cursorCount = document.querySelector("#cursor-count");
  const emptyState = document.querySelector("#empty-state");
  const cursors = new Map();
  const room = `realtime-cursor:${location.pathname || "/"}`;
  const serverUrl = typeof window.REALTIME_CURSOR_WS_URL === "string"
    ? window.REALTIME_CURSOR_WS_URL.trim()
    : "";
  const channel = !serverUrl && "BroadcastChannel" in window ? new BroadcastChannel(room) : null;
  let socket;
  let localUser;
  let color = "#84a7ff";

  function setStatus(message, state) {
    status.textContent = message;
    statusDot.className = `status-dot ${state || ""}`;
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawCursors();
  }

  function coordinates(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(bounds.width, Math.round(event.clientX - bounds.left))),
      y: Math.max(0, Math.min(bounds.height, Math.round(event.clientY - bounds.top))),
    };
  }

  function publish(cursor) {
    const message = { type: "cursor:update", room, cursor };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else if (channel) {
      channel.postMessage(message);
      receive(message);
    }
  }

  function receive(message) {
    if (!message || message.room !== room) return;
    if (message.type === "cursor:leave") {
      cursors.delete(message.id);
    } else if (message.type === "cursor:update" && message.cursor) {
      cursors.set(message.cursor.id, message.cursor);
    } else {
      return;
    }
    renderCursorList();
    drawCursors();
  }

  function renderCursorList() {
    const visible = [...cursors.values()].sort((a, b) => a.name.localeCompare(b.name));
    cursorCount.textContent = visible.length;
    emptyState.hidden = Boolean(localUser);
    cursorList.replaceChildren(...visible.map((cursor) => {
      const item = document.createElement("li");
      item.className = "cursor-item";
      const swatch = document.createElement("span");
      swatch.className = "cursor-swatch";
      swatch.style.backgroundColor = cursor.color;
      const details = document.createElement("span");
      details.className = "cursor-details";
      const name = document.createElement("span");
      name.className = "cursor-name";
      name.textContent = cursor.name;
      const coords = document.createElement("span");
      coords.className = "cursor-coordinates";
      coords.textContent = `x: ${cursor.x}, y: ${cursor.y}`;
      details.append(name, coords);
      item.append(swatch, details);
      return item;
    }));
  }

  function drawCursors() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    for (const cursor of cursors.values()) {
      context.save();
      context.fillStyle = cursor.color;
      context.strokeStyle = "#10131c";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(cursor.x, cursor.y);
      context.lineTo(cursor.x + 7, cursor.y + 21);
      context.lineTo(cursor.x + 13, cursor.y + 16);
      context.lineTo(cursor.x + 21, cursor.y + 25);
      context.lineTo(cursor.x + 25, cursor.y + 21);
      context.lineTo(cursor.x + 17, cursor.y + 12);
      context.lineTo(cursor.x + 24, cursor.y + 9);
      context.closePath();
      context.fill();
      context.stroke();
      context.font = "600 12px system-ui";
      const labelWidth = context.measureText(cursor.name).width + 14;
      context.fillStyle = "rgba(16, 19, 28, .9)";
      context.fillRect(cursor.x + 26, cursor.y + 17, labelWidth, 20);
      context.fillStyle = "#eef2ff";
      context.fillText(cursor.name, cursor.x + 33, cursor.y + 31);
      context.restore();
    }
  }

  function connect() {
    if (!serverUrl) {
      setStatus("Local preview mode", "connected");
      return;
    }
    socket = new WebSocket(serverUrl);
    socket.addEventListener("open", () => {
      setStatus("Connected to realtime server", "connected");
      if (localUser) socket.send(JSON.stringify({ type: "join", room, cursor: localUser }));
    });
    socket.addEventListener("message", (event) => {
      try { receive(JSON.parse(event.data)); } catch (error) { console.error("Invalid cursor message", error); }
    });
    socket.addEventListener("error", () => setStatus("Realtime server unavailable", "error"));
    socket.addEventListener("close", () => { if (localUser) setStatus("Disconnected from realtime server", "error"); });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = usernameInput.value.trim();
    if (!name) return;
    localUser = { id: `${name}-${crypto.randomUUID()}`, name, color, x: 0, y: 0 };
    cursors.set(localUser.id, localUser);
    setStatus(serverUrl ? "Connecting..." : "Local preview mode", "connected");
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "join", room, cursor: localUser }));
    }
    renderCursorList();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!localUser) return;
    Object.assign(localUser, coordinates(event));
    publish(localUser);
  });
  channel?.addEventListener("message", (event) => receive(event.data));
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  connect();
})();
