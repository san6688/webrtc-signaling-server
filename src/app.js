import { createServer } from "http";
import express from "express";
import { nanoid } from "nanoid";
//import { WebSocketServer } from "ws";
import CustomWebSocketServer from "./customWebsocketServer.js";
import * as EVENTS from "./events.js";
import { Channel } from "./channel.js";
import { emitMessage } from "./helper.js";

const app = express();
app.use(express.static("./public"));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

export const wsServer = createServer(app);
//   {
//   cert: readFileSync("./ssl/cert.pem"),
//   key: readFileSync("./ssl/cert.key"),
// }
export const wss = new CustomWebSocketServer({ server: wsServer });
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
      var res = channels.leave(socket.channel, socket.id);
      if (res?.status === "OK") {
        const _channelClients = channels.getClients(socket.channel);
        if (_channelClients) {
          Array.from(_channelClients).forEach((peerId) => {
            const _peer = wss.getSocketById(peerId);
            emitMessage(_peer, {
              type: EVENTS.PEER_DISCONNECTED,
              data: {
                status: "OK",
                msg: `Peer ${socket.id} left channel ${socket.channel}`,
              },
            });
          });
        }
      }
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
      const _exisitingPeers = channels.getClients(event.data.deviceId);
      const _autoConnect = _exisitingPeers?.size === 1;
      var res = channels.join(event.data.deviceId, socket.id);
      if (res.status === "OK") {
        socket.channel = event.data.deviceId;
        const _channelClient = channels.getRemoteClient(
          event.data.deviceId,
          socket.id
        );
        if (_channelClient) {
          //broadcast to peers
          const _peer = wss.getSocketById(_channelClient);
          emitMessage(_peer, {
            type: EVENTS.PEER_CONNECTED,
            data: {
              status: "OK",
              msg: `New Peer ${socket.id} connected to channel ${event.data.deviceId}`,
            },
          });
        }
      }
      emitMessage(socket, {
        type: res.status === "OK" ? EVENTS.JOIN_SUCCESS : EVENTS.JOIN_FAILED,
        data: { ...res, autoConnect: _autoConnect },
      });
      break;
    case EVENTS.LEAVE_CHANNEL:
      var res = channels.leave(event.data.deviceId, socket.id);
      if (res?.status === "OK") {
        const _channelClients = channels.getClients(event.data.deviceId);
        if (_channelClients) {
          Array.from(_channelClients).forEach((peerId) => {
            const _peer = wss.getSocketById(peerId);
            emitMessage(_peer, {
              type: EVENTS.PEER_DISCONNECTED,
              data: {
                status: "OK",
                msg: `Peer ${socket.id} left channel ${event.data.deviceId}`,
              },
            });
          });
        }
      }
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
        const remoteSocket = wss.getSocketById(res);
        emitMessage(remoteSocket, event);
      }
      break;

    default:
      console.log(`Event Type ${event.type} is not supported`);
  }
};
