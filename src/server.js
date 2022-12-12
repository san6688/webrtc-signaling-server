import { wsServer } from "./app.js";

const port = process.env.PORT || 8888;
wsServer.listen(port);
console.log("wss server listening on port " + port);
