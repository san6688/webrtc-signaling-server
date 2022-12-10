import { WebSocketServer } from "ws";

class CustomWebSocketServer extends WebSocketServer {
  constructor(options) {
    super(options);
  }

  getSocketById(socketId) {
    return Array.from(this.clients).find((client) => client.id === socketId);
  }
}

export default CustomWebSocketServer;
