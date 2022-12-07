import { WebSocket } from "ws";
export const emitMessage = (socket, event) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  } else {
    console.log("Socket not OPEN to send event ");
  }
};
