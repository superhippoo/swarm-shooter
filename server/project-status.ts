import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function sendJson(response: ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  response.writeHead(statusCode, JSON_HEADERS);
  response.end(JSON.stringify(body));
}

function requestPath(request: IncomingMessage): string | null {
  try {
    return new URL(request.url ?? '/', 'http://localhost').pathname;
  } catch {
    return null;
  }
}

function middleware(statusFilePath: string): Connect.NextHandleFunction {
  return async (request: IncomingMessage, response: ServerResponse, next: Connect.NextFunction) => {
    const pathname = requestPath(request);
    if (pathname !== '/api/status' && pathname !== '/api/health') {
      next();
      return;
    }

    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      sendJson(response, 405, { error: 'GET 요청만 지원합니다.' });
      return;
    }

    if (pathname === '/api/health') {
      sendJson(response, 200, {
        ok: true,
        status: 'ok',
        service: 'SWARM//ZERO local development',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const source = await readFile(statusFilePath, 'utf8');
      const status: unknown = JSON.parse(source);
      if (status === null || typeof status !== 'object' || Array.isArray(status)) {
        throw new Error('Status root must be an object.');
      }

      response.writeHead(200, JSON_HEADERS);
      response.end(source);
    } catch {
      sendJson(response, 503, {
        ok: false,
        error: 'project-status.json을 읽거나 해석할 수 없습니다.',
      });
    }
  };
}

export function projectStatusPlugin(): Plugin {
  return {
    name: 'project-status',
    configureServer(server) {
      server.middlewares.use(middleware(resolve(server.config.root, 'project-status.json')));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(resolve(server.config.root, 'project-status.json')));
    },
  };
}
