# [@meteorjs/ddp-graceful-shutdown](https://www.npmjs.com/package/@meteorjs/ddp-graceful-shutdown)

[![Build Status](https://travis-ci.org/meteor/meteor-ddp-graceful-shutdown.svg?branch=master)](https://travis-ci.org/meteor/meteor-ddp-graceful-shutdown)

This npm package is designed for use with [Meteor](https://www.meteor.com/) apps
running on platforms such as Galaxy which send SIGTERM signals and wait a grace
period before killing processes.

To use on Galaxy:

``` javascript
import {DDPGracefulShutdown} from '@meteorjs/ddp-graceful-shutdown';
import {Meteor} from 'meteor/meteor';

new DDPGracefulShutdown({
  gracePeriodMillis: 1000 * process.METEOR_SIGTERM_GRACE_PERIOD_SECONDS,
  server: Meteor.server,
});
```

This registers a SIGTERM handler which will call
`ddpGracefulShutdown.closeConnections({log: true})`. To trigger on a different
signal, disable logging, or only trigger after some other clean up, just call
that method yourself from an appropriate handler.
