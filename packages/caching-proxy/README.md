# @loopback/caching-proxy

A caching HTTP proxy for integration tests.

**NOT SUITABLE FOR PRODUCTION USE!**

## Overview

Testing applications connecting to backend REST/SOAP services can be difficult:
The backend service may be slow, apply rate limiting, etc. Integration tests
become too slow in such case, which makes test-first development impractical.

This can be addressed by setting up a snapshot-based mock server or using
a caching HTTP client, but both of these solutions come with severe
disadvantages:

 - When using a snapshot-based mock server, we must ensure that snapshots
   are up-to-date with the actual backend implementation.

 - Caching at HTTP-client side requires non-trivial changes of the application
   code.

A filesystem-backed caching HTTP proxy offers a neat solution that combines
caching and snapshots:

 - The first request is forwarded to the actual backend and the response
   is stored as a snapshot.
 - Subsequent requests are served by the proxy using the cached snaphost.
 - Snapshot older than a configured time are discarded and the first next
   request will fetch the real response from the backend.

## Installation

```sh
npm install --save-dev  @loopback/caching-proxy
```

## Basic use

Import the module at the top of your test file.

```ts
import {CachingProxy} from '@loopback/caching-proxy';
```

Create a proxy instance during test-suite setup
(typically in Mocha's `before` hook):

```ts
const proxy = new CachingProxy({
  // port where to listen
  port: 0,
  // directory where to store recorded snapshots
  cachePath: path.resolve(__dirname, '.proxy-cache'),
  // how often to re-validate snapshots (in milliseconds)
  ttl: 24*60*60*1000,
});
await proxy.start();
```

In your tests, configure the client library to use the caching proxy.
Below is an example configuration for
[request](https://www.npmjs.com/package/request):

```ts
request = request.defaults({
  proxy: proxy.url,
  // Disable tunneling of HTTP requests - this is required!
  tunnel: false
});
```

Finally, stop the proxy when the test suite is done
(typically in Mocha's `after` hook):

```ts
await proxy.stop();
```

## API Documentation

See the auto-generated documentation at
[loopback.io](http://apidocs.loopback.io/@loopback%2fdocs/caching-proxy.html)

## Contributions

- [Guidelines](https://github.com/strongloop/loopback-next/blob/master/docs/CONTRIBUTING.md)
- [Join the team](https://github.com/strongloop/loopback-next/issues/110)

## Tests

Run `npm test` from the root folder.

## Contributors

See
[all contributors](https://github.com/strongloop/loopback-next/graphs/contributors).

## License

MIT
