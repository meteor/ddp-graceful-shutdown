// DDPGracefulShutdown is a class which tracks open connections in a DDP server
// and shuts them down gradually when SIGTERM is received. Docker-base hosting
// environments typically send SIGTERM to processes, wait a grace period, and
// then send the un-ignorable SIGKILL. DDPGracefulShutdown allows you to detect
// SIGTERM and close connections over the whole grace period to ease load on new
// processes.
class DDPGracefulShutdown {
  // gracePeriodMillis and server are required. Typically, server is set to
  // Meteor.server. On Galaxy, a good value for gracePeriodMillis is 1000 *
  // process.env.METEOR_SIGTERM_GRACE_PERIOD_SECONDS.
  constructor({gracePeriodMillis, server}) {
    this.gracePeriodMillis = gracePeriodMillis;
    this.connections = new Map;
    server.onConnection((conn) => {
      this.connections.set(conn.id, conn);
      conn.onClose(() => {
        this.connections.delete(conn.id);
      });
    });
  }

  // Sets up a SIGTERM handler to call closeConnections with logging. You should
  // either call this function or arrange for closeConnections to be called in
  // some other way.
  installSIGTERMHandler() {
    process.on('SIGTERM', () => {
      this.closeConnections({log: true});
    });
  }

  // closeConnections calculates an interval for closing connections and starts
  // doing so. It is intended to be called when SIGTERM is received;
  // installSIGTERMHandler arranges for this to happen. If log is specified (the
  // default if this is called from the default SIGTERM handler) it will log one
  // line to stdout as well.
  closeConnections({log} = {}) {
    if (log) {
      console.log(`Got SIGTERM; will close ${ this.connections.size } connection(s) in ${ this.gracePeriodMillis }ms`);
    }
    let delay, batchSize;
    if (this.gracePeriodMillis >= this.connections.size) {
      delay = this.gracePeriodMillis / this.connections.size;
      batchSize = 1;
    } else {
      delay = 1;
      batchSize = this.connections.size  / this.gracePeriodMillis;
    }
    this.closeOneBatchAndScheduleNext(delay, batchSize);
  }
  // Internal function which closes one batch of arbitrarily chosen connections
  // and waits to close the next one.
  //
  // conn.close needs to be called from within a Fiber, so this arranges to get
  // the code in a Fiber by calling it from meteor-promise's queue.
  closeOneBatchAndScheduleNext(delay, batchSize) {
    Promise.resolve().then(() => {
      let closed = 0;
      while (this.connections.size > 0 && closed < batchSize) {
        this.closeOneConnection();
        closed++;
      }
      if (this.connections.size > 0) {
        setTimeout(() => this.closeOneBatchAndScheduleNext(delay, batchSize), delay);
      }
    });
  }

  closeOneConnection() {
    Promise.resolve().then(() => {
      const {done, value} = this.connections.entries().next();
      if (done) {
        return;
      }
      const [id, conn] = value;
      this.connections.delete(id);
      conn.close();
    });
  }
}

exports.DDPGracefulShutdown = DDPGracefulShutdown;
