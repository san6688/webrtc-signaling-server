import { createServer } from "http";
import { readFileSync } from "fs";
import { nanoid } from "nanoid";
import { WebSocketServer } from "ws";
import * as EVENTS from "./events.js";
import { Channel } from "./channel.js";
import { emitMessage } from "./helper.js";

const wsServer = createServer();
//   {
//   cert: readFileSync("./ssl/cert.pem"),
//   key: readFileSync("./ssl/cert.key"),
// }
const wss = new WebSocketServer({ server: wsServer });
const channels = new Channel(2);

wss.on("connection", (socket) => {
  console.log("new connection");

  socket.on("message", (msg) => {
    console.log("socket::message data=%s", msg);

    try {
      const event = JSON.parse(msg);
      handleEvent(socket, event);
    } catch (error) {
      console.error("failed to handle onmessage", error);
    }
  });

  socket.once("close", () => {
    console.log(`socket - ${socket.id}::close`);
    if (socket.channel) {
      channels.leave(socket.channel, socket.id);
    }
  });
});

const handleEvent = (socket, event) => {
  switch (event.type) {
    case EVENTS.INIT:
      socket.id = nanoid();
      emitMessage(socket, {
        type: EVENTS.INIT_SUCCESS,
        data: { id: socket.id },
      });
      break;
    case EVENTS.OPEN_CHANNEL:
      var res = channels.open(event.data.deviceId);
      emitMessage(socket, {
        type: EVENTS.OPENED_CHANNEL,
        data: res,
      });
      break;
    case EVENTS.JOIN_CHANNEL:
      var res = channels.join(event.data.deviceId, socket.id);
      if (res.status === "OK") {
        socket.channel = event.data.deviceId;
      }
      emitMessage(socket, {
        type: res.status === "OK" ? EVENTS.JOIN_SUCCESS : EVENTS.JOIN_FAILED,
        data: res,
      });
      break;
    case EVENTS.LEAVE_CHANNEL:
      var res = channels.leave(event.data.deviceId, socket.id);
      emitMessage(socket, {
        type: EVENTS.LEFT_CHANNEL,
        data: res,
      });
      break;
    case EVENTS.DEVICE_OFFER:
    case EVENTS.TAM_ANSWER:
    case EVENTS.ICECANDIDATE:
      var res = channels.getRemoteClient(event.data.deviceId, socket.id);
      console.log(`remoteclient :: ${res}`);
      if (!res) {
        emitMessage(socket, {
          type: EVENTS.PEER_UNAVAILABLE,
          data: { status: 404, msg: "Peer not available" },
        });
      } else {
        const remoteSocket = Array.from(wss.clients).find(
          (client) => client.id === res
        );
        emitMessage(remoteSocket, event);
      }
      break;

    default:
      console.log(`Event Type ${event.type} is not supported`);
  }
};

wsServer.listen(8888);
console.log("wss server listening on port 8888");
