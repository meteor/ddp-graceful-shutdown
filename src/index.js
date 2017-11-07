// DDPGracefulShutdown is a class which tracks open connections in a DDP server
// and shuts them down gradually when SIGTERM is received. Docker-base hosting
// environments typically send SIGTERM to processes, wait a grace period, and
// then send the un-ignorable SIGKILL. DDPGracefulShutdown allows you to detect
// SIGTERM and close connections over the whole grace period to ease load on new
// processes.
class DDPGracefulShutdown {
  // gracePeriodMillis and server are required. Typically, server is set to
  // Meteor.server. On Galaxy, a good value for gracePeriodMillis is 1000 *
  // process.env.METEOR_SIGTERM_GRACE_PERIOD_SECONDS. If installSIGTERMHandler
  // is set to false, you are responsibile for calling this.closeConnections
  // yourself (perhaps without the log argument).
  constructor({gracePeriodMillis, server, installSIGTERMHandler = true}) {
    this.gracePeriodMillis = gracePeriodMillis;
    this.connections = new Map;
    server.onConnection((conn) => {
      this.connections.set(conn.id, conn);
      conn.onClose(() => {
        this.connections.delete(conn.id);
      });
    });
    if (installSIGTERMHandler) {
      process.on('SIGTERM', () => {
        this.closeConnections({log: true});
      });
    }
  }

  // closeConnections is called when SIGTERM is received (unless you configure
  // this class with installSIGTERMHandler: false). It calculates an interval
  // for closing connections and starts doing so. If log is specified (the
  // default if this is called from the default SIGTERM handler) it will log one
  // line to stdout as well.
  closeConnections({log} = {}) {
    if (log) {
      console.log(`Got SIGTERM; will close ${ this.connections.size } connection(s) in ${ this.gracePeriodMillis }ms`);
    }
    const delay = this.gracePeriodMillis / this.connections.size;
    this.closeOneConnectionAndScheduleNext(delay);
  }
  // Internal function which closes an arbitrary connection and waits to close
  // the next one.
  //
  // conn.close needs to be called from within a Fiber, so this arranges to get
  // the code in a Fiber by calling it from meteor-promise's queue.
  closeOneConnectionAndScheduleNext(delay) {
    Promise.resolve().then(() => {
      const {done, value} = this.connections.entries().next();
      if (done) {
        return;
      }
      const [id, conn] = value;
      this.connections.delete(id);
      conn.close();
      if (this.connections.size > 0) {
        setTimeout(() => this.closeOneConnectionAndScheduleNext(delay), delay);
      }
    });
  }
}

exports.DDPGracefulShutdown = DDPGracefulShutdown;
