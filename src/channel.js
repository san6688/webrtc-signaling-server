export class Channel {
  constructor(size) {
    this.private = new Map(); // will be used for peer-peer communication
    this.allowedClients = size;
  }

  open(channelId) {
    if (!this.private.has(channelId)) {
      this.private.set(channelId, new Set());
    } else {
      console.log(`${channelId} - already opened`);
    }
    return {
      status: "OK",
    };
  }

  getClients(channelId) {
    if (this.private.has(channelId)) {
      return this.private.get(channelId);
    } else {
      console.log(`${channelId} - does not exist`);
    }
  }
  join(channelId, socketId) {
    if (!this.private.has(channelId)) {
      this.private.set(channelId, new Set().add(socketId));
      return {
        status: "OK",
      };
    } else if (this.private.get(channelId).size >= this.allowedClients) {
      console.log(`Channel is full`);
      return {
        status: "ERR",
        msg: `Channel ${channelId} allowed client limit reached`,
      };
    } else {
      this.private.set(channelId, this.private.get(channelId).add(socketId));
      return {
        status: "OK",
      };
    }
  }

  leave(channelId, socketId) {
    if (!this.private.has(channelId)) {
      console.log(`Channel ${channelId} does not exist`);
    } else {
      this.private.get(channelId).delete(socketId);
    }
    return {
      status: "OK",
    };
  }

  getRemoteClient(channelId, socketId) {
    if (this.private.has(channelId)) {
      const _remoteClient = Array.from(this.private.get(channelId)).filter(
        (id) => id !== socketId
      );

      return _remoteClient.length === 0 ? null : _remoteClient[0];
    }
    return null;
  }
}
