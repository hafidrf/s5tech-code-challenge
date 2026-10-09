import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import cors from 'cors';
import type { Db } from './db.js';
import {
  createSwap,
  deleteSwap,
  getSwapById,
  listSwaps,
  updateSwap,
} from './repository.js';
import {
  parseCreateSwap,
  parseId,
  parseListFilters,
  parseUpdateSwap,
  ValidationError,
} from './validation.js';
import type { ApiErrorBody } from './types.js';

/** Wraps sync handlers so thrown errors reach the error middleware. */
const wrap =
  (fn: (req: Request, res: Response) => void): RequestHandler =>
  (req, res, next) => {
    try {
      fn(req, res);
    } catch (err) {
      next(err);
    }
  };

export function createApp(db: Db): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // POST /api/swaps: create a swap record
  app.post(
    '/api/swaps',
    wrap((req, res) => {
      const input = parseCreateSwap(req.body);
      res.status(201).json(createSwap(db, input));
    }),
  );

  // GET /api/swaps?from=&to=&created_after=&created_before=&limit=&offset=
  app.get(
    '/api/swaps',
    wrap((req, res) => {
      const filters = parseListFilters(req.query as Record<string, unknown>);
      const { data, total } = listSwaps(db, filters);
      res.json({ data, meta: { total, limit: filters.limit, offset: filters.offset } });
    }),
  );

  // GET /api/swaps/:id
  app.get(
    '/api/swaps/:id',
    wrap((req, res) => {
      const id = parseId(String(req.params.id));
      const swap = getSwapById(db, id);
      if (!swap) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: `Swap ${id} not found` } });
        return;
      }
      res.json(swap);
    }),
  );

  // PATCH /api/swaps/:id: partial update
  app.patch(
    '/api/swaps/:id',
    wrap((req, res) => {
      const id = parseId(String(req.params.id));
      const patch = parseUpdateSwap(req.body);
      const updated = updateSwap(db, id, patch);
      if (!updated) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: `Swap ${id} not found` } });
        return;
      }
      res.json(updated);
    }),
  );

  // DELETE /api/swaps/:id
  app.delete(
    '/api/swaps/:id',
    wrap((req, res) => {
      const id = parseId(String(req.params.id));
      if (!deleteSwap(db, id)) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: `Swap ${id} not found` } });
        return;
      }
      res.status(204).end();
    }),
  );

  // 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API route' } });
  });

  // Centralised error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      const body: ApiErrorBody = {
        error: { code: 'VALIDATION_ERROR', message: err.message, details: err.details },
      };
      res.status(400).json(body);
      return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' },
      });
      return;
    }
    if (err instanceof Error && err.message === 'from_token and to_token must differ') {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
      return;
    }
    // Unknown error: log internally, never leak the stack to the client.
    console.error('[unhandled]', err);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  return app;
}
