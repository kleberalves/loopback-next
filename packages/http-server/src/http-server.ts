// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/http-server
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {ServerRequest, ServerResponse, createServer, Server} from 'http';

export type HttpRequestHandler = (
  req: ServerRequest,
  res: ServerResponse,
) => void;

export type HttpOptions = {
  port: number;
  host: string | undefined;
};

export namespace HttpEndpoint {
  let httpPort: number;
  let httpHost: string;
  let httpServer: Server;

  export function create(options: HttpOptions, handler: HttpRequestHandler) {
    httpServer = createServer(handler);
    return httpServer;
  }

  export function start(): Promise<void> {
    httpServer.listen(httpPort, httpHost);
    return new Promise<void>((resolve, reject) => {
      httpServer.once('listening', () => {
        resolve();
      });
      httpServer.once('error', reject);
    });
  }

  export function stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      httpServer.close((err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
