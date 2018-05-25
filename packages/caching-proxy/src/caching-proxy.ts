// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: test-proxy
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import * as debugFactory from 'debug';
import {
  OutgoingHttpHeaders,
  Server as HttpServer,
  ServerRequest,
  ServerResponse,
  createServer,
} from 'http';
import {AddressInfo} from 'net';
import * as pEvent from 'p-event';
import * as makeRequest from 'request-promise-native';

const cacache = require('cacache');

const debug = debugFactory('loopback:caching-proxy');

export interface ProxyOptions {
  /**
   * Directory where to keep the cached snapshots.
   */
  cachePath: string;

  /**
   * How long to keep snapshots before making a new request to the backend.
   * The value is in milliseconds.
   *
   * Default: one day
   */
  ttl?: number;

  /**
   * The port where the HTTP proxy should listen at.
   * Default: 0 (let the system pick a free port)
   */
  port?: number;
}

const DEFAULT_OPTIONS = {
  port: 0,
  ttl: 24 * 60 * 60 * 1000,
};

interface CachedMetadata {
  statusCode: number;
  headers: OutgoingHttpHeaders;
}

/**
 * The HTTP proxy implementation.
 */
export class CachingProxy {
  private _options: Required<ProxyOptions>;
  private _server?: HttpServer;

  /**
   * URL where the proxy is listening on.
   * Provide this value to your HTTP client as the proxy configuration.
   */
  public url: string;

  constructor(options: ProxyOptions) {
    this._options = Object.assign({}, DEFAULT_OPTIONS, options);
    if (!this._options.cachePath) {
      throw new Error('Required option missing: "cachePath"');
    }
    this.url = 'http://proxy-not-running';
    this._server = undefined;
  }

  /**
   * Start listening.
   */
  async start() {
    this._server = createServer(
      (request: ServerRequest, response: ServerResponse) => {
        this._handle(request, response);
      },
    );

    this._server.on('connect', (req, socket) => {
      socket.write('HTTP/1.1 501 Not Implemented\r\n\r\n');
      socket.destroy();
    });

    this._server.listen(this._options.port);
    await pEvent(this._server, 'listening');

    const address = this._server.address() as AddressInfo;
    this.url = `http://127.0.0.1:${address.port}`;
  }

  /**
   * Stop listening.
   */
  async stop() {
    if (!this._server) return;

    this.url = 'http://proxy-not-running';
    const server = this._server;
    this._server = undefined;

    server.close();
    await pEvent(server, 'close');
  }

  private _handle(request: ServerRequest, response: ServerResponse) {
    try {
      this._handleAsync(request, response).catch(onerror);
    } catch (err) {
      onerror(err);
    }

    function onerror(error: Error) {
      console.log('Cannot proxy %s %s.', request.method, request.url, error);
      response.statusCode = 500;
      response.end();
    }
  }

  private async _handleAsync(request: ServerRequest, response: ServerResponse) {
    debug(
      'INCOMING REQUEST %s %s',
      request.method,
      request.url,
      request.headers,
    );

    const cacheKey = this._getCacheKey(request);

    try {
      const entry = await cacache.get(this._options.cachePath, cacheKey);
      debug('Sending cached response for %s', cacheKey);
      this._sendCachedEntry(entry.data, entry.metadata, response);
    } catch (error) {
      debug('Cache miss for %s', cacheKey);
      if (error.code !== 'ENOENT') {
        console.warn('Cannot load cached entry.', error);
      }
      await this._forwardRequest(request, response);
    }
  }

  private _getCacheKey(request: ServerRequest): string {
    // TODO(bajtos) consider adding selected/all headers to the key
    return `${request.method} ${request.url}`;
  }

  private _sendCachedEntry(
    data: Buffer,
    metadata: CachedMetadata,
    response: ServerResponse,
  ) {
    response.writeHead(metadata.statusCode, metadata.headers);
    response.end(data);
  }

  private async _forwardRequest(
    clientRequest: ServerRequest,
    clientResponse: ServerResponse,
  ) {
    // tslint:disable-next-line:await-promise
    const backendResponse = await makeRequest({
      resolveWithFullResponse: true,
      simple: false,

      method: clientRequest.method,
      uri: clientRequest.url!,
      headers: clientRequest.headers,
      // FIXME(bajtos) upload request body (e.g. for POST requests)
    });

    debug(
      'GOT RESPONSE FOR %s %s -> %s',
      clientRequest.method,
      clientRequest.url,
      backendResponse.statusCode,
      backendResponse.headers,
    );

    const metadata: CachedMetadata = {
      statusCode: backendResponse.statusCode,
      headers: backendResponse.headers,
    };

    // Ideally, we should pipe the backend response to both
    // client response and cachache.put.stream.
    //   r.pipe(clientResponse);
    //   r.pipe(cacache.put.stream(...))
    // To do so, we would have to defer .end() call on the client
    // response until the content is stored in the cache,
    // which is rather complex and involved.
    // Without that synchronization, the client can start sending
    // follow-up requests that won't be served from the cache as
    // the cache has not been updated yet.
    // Since this proxy is for testing only, buffering the entire
    // response body is acceptable.

    await cacache.put(
      this._options.cachePath,
      this._getCacheKey(clientRequest),
      backendResponse.body,
      {metadata},
    );

    clientResponse.writeHead(
      backendResponse.statusCode,
      backendResponse.headers,
    );
    clientResponse.end(backendResponse.body);
  }
}
