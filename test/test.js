/* eslint-env mocha */

import assert from "assert";
import EventEmitter from "events";
import { DDPGracefulShutdown } from "../src";

class Connection extends EventEmitter {
  constructor({ id }) {
    super();
    this.id = id;
  }
  onClose(f) {
    this.on("close", f);
  }
  close() {
    this.emit("close");
  }
}

class Server extends EventEmitter {
  onConnection(f) {
    this.on("connection", f);
  }
}

describe("DDPGracefulShutdown", () => {
  it("should close connections gracefully", done => {
    const server = new Server();
    const gracePeriodMillis = 2;
    const connectionCount = 10;
    const dgs = new DDPGracefulShutdown({ server, gracePeriodMillis });

    // Add some connections to remove gracefully.
    let closed = 0;
    for (let i = 0; i < connectionCount; i++) {
      const c = new Connection({ id: "a" + i });
      c.once("close", () => {
        closed++;
      });
      server.emit("connection", c);
    }

    // Add some more connections and remove them immediately.
    for (let i = 0; i < connectionCount; i++) {
      const c = new Connection({ id: "b" + i });
      server.emit("connection", c);
      c.close();
    }

    dgs.closeConnections();

    // By the end of the grace period, we should have closed all the
    // connections. Add a little bit of wiggle room to make sure that they all
    // close and that we don't accidentally close the b connections too.
    setTimeout(() => {
      assert.equal(closed, connectionCount);
      done();
    }, gracePeriodMillis * 1.5);
  });
});
