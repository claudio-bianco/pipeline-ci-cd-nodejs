import express from 'express';
import request from 'supertest';
import { createApi } from '../src/routes/api.js';
import { createMemoryDB } from '../src/db/memory.js';

const FIXED_NOW = '2025-11-01 12:34:56';

function buildApp({ initial = { todos: [], seq: 1 }, saveThrows = false } = {}) {
  const db = createMemoryDB(initial);
  if (saveThrows) {
    db.save = () => { throw new Error('persist failed'); };
  }
  const app = express();
  app.use(express.json());
  app.use('/api', createApi({ db, now: () => FIXED_NOW }));
  return { app, db };
}

describe('createApi validação de parâmetros', () => {
  it('lança erro quando db não é fornecido', () => {
    expect(() => createApi()).toThrow(/requer um objeto db/i);
  });

  it('lança erro quando db não tem save()', () => {
    const invalidDb = { state: { todos: [], seq: 1 } };
    expect(() => createApi({ db: invalidDb })).toThrow(/requer um objeto db/i);
  });
});

describe('defaultNow sem injeção', () => {
  it('usa o timestamp padrão quando now() não é injetado', async () => {
    const db = createMemoryDB({ todos: [], seq: 1 });
    const app = express();
    app.use(express.json());
    app.use('/api', createApi({ db })); // sem now

    const res = await request(app).post('/api/todos').send({ title: 'com-default-now' }).expect(201);
    // Formato esperado: 'YYYY-MM-DD HH:MM:SS'
    expect(res.body.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe('coerção de done para false', () => {
  it('aceita "false", "0", 0, false como false', async () => {
    const db = createMemoryDB({ todos: [], seq: 1 });
    const app = express();
    app.use(express.json());
    app.use('/api', createApi({ db, now: () => '2025-11-01 12:34:56' }));

    const falsyValues = ['false', '0', 0, false];
    for (const v of falsyValues) {
      const res = await request(app).post('/api/todos').send({ title: `falsy-${String(v)}`, done: v }).expect(201);
      expect(res.body.done).toBe(false);
    }
  });
});

describe('createMemoryDB default initial', () => {
  it('cria estado padrão quando initial é omitido', () => {
    const db = createMemoryDB(); // sem parâmetro
    expect(db).toHaveProperty('state');
    expect(db.state).toMatchObject({ todos: [], seq: 1 });
    expect(() => db.save()).not.toThrow(); // no-op
  });
});

describe('API /api', () => {
  describe('GET /api/health', () => {
    it('retorna ok: true e time', async () => {
      const { app } = buildApp();
      const res = await request(app).get('/api/health').expect(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(typeof res.body.time).toBe('string');
    });
  });

  describe('GET /api/todos', () => {
    it('lista vazia inicialmente', async () => {
      const { app } = buildApp();
      const res = await request(app).get('/api/todos').expect(200);
      expect(res.body).toEqual([]);
    });

    it('ordena por id desc e força done boolean', async () => {
      const { app } = buildApp();
      await request(app).post('/api/todos').send({ title: 'A' }).expect(201);
      await request(app).post('/api/todos').send({ title: 'B', done: '1' }).expect(201);

      const res = await request(app).get('/api/todos').expect(200);
      expect(res.body.map(x => x.id)).toEqual([2, 1]);            // desc
      expect(res.body[0]).toMatchObject({ id: 2, title: 'B', done: true });
      expect(res.body[1]).toMatchObject({ id: 1, title: 'A', done: false });
    });
  });

  describe('GET /api/todos/:id', () => {
    it('400 para id inválido', async () => {
      const { app } = buildApp();
      await request(app).get('/api/todos/abc').expect(400);
    });

    it('404 se não encontrado', async () => {
      const { app } = buildApp();
      await request(app).get('/api/todos/1').expect(404);
    });

    it('200 e retorna todo com done boolean', async () => {
      const { app } = buildApp({ initial: { todos: [{ id: 7, title: 'X', done: 0, created_at: FIXED_NOW }], seq: 8 } });
      const res = await request(app).get('/api/todos/7').expect(200);
      expect(res.body).toMatchObject({ id: 7, title: 'X', done: false });
    });
  });

  describe('POST /api/todos', () => {
    it('400 quando title ausente', async () => {
      const { app } = buildApp();
      await request(app).post('/api/todos').send({}).expect(400);
    });

    it('400 quando title vazio após trim', async () => {
      const { app } = buildApp();
      await request(app).post('/api/todos').send({ title: '   ' }).expect(400);
    });

    it('201 cria com defaults e created_at determinístico', async () => {
      const { app } = buildApp();
      const res = await request(app).post('/api/todos').send({ title: 'Primeiro' }).expect(201);
      expect(res.body).toMatchObject({ id: 1, title: 'Primeiro', done: false, created_at: FIXED_NOW });
    });

    it('coerção booleana do campo done ("true"|"1"|1|true)', async () => {
      const valuesTrue = ['true', '1', 1, true];
      const { app } = buildApp();
      for (const v of valuesTrue) {
        const r = await request(app).post('/api/todos').send({ title: `t-${String(v)}`, done: v }).expect(201);
        expect(r.body.done).toBe(true);
      }
    });

    it('500 quando persistência falha', async () => {
      const { app } = buildApp({ saveThrows: true });
      await request(app).post('/api/todos').send({ title: 'X' }).expect(500);
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('400 para id inválido', async () => {
      const { app } = buildApp();
      await request(app).put('/api/todos/abc').send({ title: 'A' }).expect(400);
    });

    it('404 quando não existe', async () => {
      const { app } = buildApp();
      await request(app).put('/api/todos/999').send({ title: 'A' }).expect(404);
    });

    it('400 quando payload não contém campos atualizáveis', async () => {
      const { app } = buildApp({ initial: { todos: [{ id: 1, title: 'A', done: false, created_at: FIXED_NOW }], seq: 2 } });
      await request(app).put('/api/todos/1').send({}).expect(400);
    });

    it('400 quando title vira vazio após trim', async () => {
      const { app } = buildApp({ initial: { todos: [{ id: 1, title: 'A', done: false, created_at: FIXED_NOW }], seq: 2 } });
      await request(app).put('/api/todos/1').send({ title: '   ' }).expect(400);
    });

    it('200 atualiza title e done', async () => {
      const { app } = buildApp({ initial: { todos: [{ id: 1, title: 'A', done: false, created_at: FIXED_NOW }], seq: 2 } });
      const res = await request(app).put('/api/todos/1').send({ title: 'B', done: 'true' }).expect(200);
      expect(res.body).toMatchObject({ id: 1, title: 'B', done: true });
    });

    it('500 quando persistência falha', async () => {
      const { app, db } = buildApp({ initial: { todos: [{ id: 1, title: 'A', done: false, created_at: FIXED_NOW }], seq: 2 } });
      db.save = () => { throw new Error('persist failed'); };
      await request(app).put('/api/todos/1').send({ title: 'B' }).expect(500);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('400 para id inválido', async () => {
      const { app } = buildApp();
      await request(app).delete('/api/todos/xyz').expect(400);
    });

    it('404 quando não existe', async () => {
      const { app } = buildApp();
      await request(app).delete('/api/todos/7').expect(404);
    });

    it('204 quando remove com sucesso', async () => {
      const { app } = buildApp({ initial: { todos: [{ id: 1, title: 'A', done: false, created_at: FIXED_NOW }], seq: 2 } });
      await request(app).delete('/api/todos/1').expect(204);
      // confirmando que sumiu
      await request(app).get('/api/todos/1').expect(404);
    });

    it('500 quando persistência falha', async () => {
      const { app, db } = buildApp({ initial: { todos: [{ id: 1, title: 'A', done: false, created_at: FIXED_NOW }], seq: 2 } });
      db.save = () => { throw new Error('persist failed'); };
      await request(app).delete('/api/todos/1').expect(500);
    });
  });
});