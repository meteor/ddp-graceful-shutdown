# [@meteorjs/ddp-graceful-shutdown](https://www.npmjs.com/package/@meteorjs/ddp-graceful-shutdown)

[![Build Status](https://travis-ci.org/meteor/ddp-graceful-shutdown.svg?branch=master)](https://travis-ci.org/meteor/ddp-graceful-shutdown)

This npm package is designed for use with [Meteor](https://www.meteor.com/) apps
running on platforms such as Galaxy which send SIGTERM signals and wait a grace
period before killing processes.

To use on Galaxy:

``` javascript
import {DDPGracefulShutdown} from '@meteorjs/ddp-graceful-shutdown';
import {Meteor} from 'meteor/meteor';

new DDPGracefulShutdown({
  gracePeriodMillis: 1000 * process.env.METEOR_SIGTERM_GRACE_PERIOD_SECONDS,
  server: Meteor.server,
}).installSIGTERMHandler();
```

This registers a SIGTERM handler which will call
`ddpGracefulShutdown.closeConnections({log: true})`. To trigger on a different
signal, disable logging, or only trigger after some other clean up, just call
that method yourself from an appropriate handler.

You should call this from top level code as soon as possible; this means that it
will run before the Meteor `webapp` package starts listening. If it is created
after connections already exist, they will not be tracked.

This should work on all recent Meteor releases --- the `onConnection` API it
relies on was introduced in 0.7.0, and it is transpiled to ES5 on npm.
