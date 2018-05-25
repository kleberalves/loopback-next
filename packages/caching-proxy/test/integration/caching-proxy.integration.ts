// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: test-proxy
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import * as http from 'http';
import {AddressInfo} from 'net';
import * as pEvent from 'p-event';
import * as path from 'path';
import * as makeRequest from 'request-promise-native';
import * as rimrafCb from 'rimraf';
import * as util from 'util';
import {CachingProxy} from '../../src/caching-proxy';

const CACHE_DIR = path.join(__dirname, '.cache');

// tslint:disable:await-promise
const rimraf = util.promisify(rimrafCb);
describe('TestProxy', () => {
  let stubServerUrl: string;
  before(givenStubServer);
  after(stopStubServer);

  let proxy: CachingProxy;
  beforeEach(givenRunningProxy);
  afterEach(stopProxy);

  it('provides "url" property', () => {
    expect(proxy.url).to.match(/^http:\/\/127.0.0.1:\d+$/);
  });

  it('proxies HTTP requests', async () => {
    const result = await makeRequest({
      uri: 'http://example.com',
      proxy: proxy.url,
      resolveWithFullResponse: true,
    });

    expect(result.statusCode).to.equal(200);
    expect(result.body).to.containEql('example');
  });

  it('proxies HTTPs requests (no tunneling)', async () => {
    const result = await makeRequest({
      uri: 'https://example.com',
      proxy: proxy.url,
      tunnel: false,
      resolveWithFullResponse: true,
    });

    expect(result.statusCode).to.equal(200);
    expect(result.body).to.containEql('example');
  });

  it('rejects CONNECT requests (HTTPS tunneling)', async () => {
    const resultPromise = makeRequest({
      uri: 'https://example.com',
      proxy: proxy.url,
      tunnel: true,
      simple: false,
      resolveWithFullResponse: true,
    });

    await expect(resultPromise).to.be.rejectedWith(
      /tunneling socket.*statusCode=501/,
    );
  });

  it('forwards request/response headers', async () => {
    givenServerDumpsRequests();

    const result = await makeRequest({
      uri: stubServerUrl,
      json: true,
      headers: {'x-client': 'test'},
      proxy: proxy.url,
      resolveWithFullResponse: true,
    });

    expect(result.headers).to.containEql({
      'x-server': 'dumping-server',
    });
    expect(result.body.headers).to.containDeep({
      'x-client': 'test',
    });
  });

  it.only('caches responses', async () => {
    let counter = 1;
    stubHandler = function(req, res) {
      res.writeHead(201, {'x-counter': counter++});
      res.end(JSON.stringify({counter: counter++}));
    };

    const opts = {
      uri: stubServerUrl,
      json: true,
      proxy: proxy.url,
      resolveWithFullResponse: true,
    };

    const result1 = await makeRequest(opts);
    const result2 = await makeRequest(opts);

    expect(result1.statusCode).equal(201);

    expect(result1.statusCode).equal(result2.statusCode);
    expect(result1.body).deepEqual(result2.body);
    expect(result1.headers).deepEqual(result2.headers);
  });

  async function givenRunningProxy() {
    await rimraf(CACHE_DIR);
    proxy = new CachingProxy({cachePath: CACHE_DIR});
    await proxy.start();
  }

  async function stopProxy() {
    await proxy.stop();
  }

  let stubServer: http.Server | undefined,
    stubHandler:
      | ((request: http.ServerRequest, response: http.ServerResponse) => void)
      | undefined;
  async function givenStubServer() {
    stubHandler = undefined;
    stubServer = http.createServer(function handleRequest(req, res) {
      if (stubHandler) {
        try {
          stubHandler(req, res);
        } catch (err) {
          res.end(500);
          process.nextTick(() => {
            throw err;
          });
        }
      } else {
        res.writeHead(501);
        res.end();
      }
    });
    stubServer.listen(0);
    await pEvent(stubServer, 'listening');
    const address = stubServer.address() as AddressInfo;
    stubServerUrl = `http://127.0.0.1:${address.port}`;
  }

  async function stopStubServer() {
    if (!stubServer) return;
    stubServer.close();
    await pEvent(stubServer, 'close');
    stubServer = undefined;
  }

  function givenServerDumpsRequests() {
    stubHandler = function dumpRequest(req, res) {
      res.writeHead(200, {
        'x-server': 'dumping-server',
      });
      res.write(
        JSON.stringify({
          method: req.method,
          url: req.url,
          headers: req.headers,
        }),
      );
      res.end();
    };
  }
});
