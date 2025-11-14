// src/routes/api.js
import express from 'express';

// Coerção booleana previsível
const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

// now() separado p/ facilitar mock em testes
const defaultNow = () =>
  new Date().toISOString().replace('T', ' ').slice(0, 19);

/**
 * db: { state: { todos: [], seq: 1 }, save: () => void }
 * now: função para timestamp (mockável)
 */
export function createApi({ db, now = defaultNow } = {}) {
  if (!db || !db.state || typeof db.save !== 'function') {
    throw new Error('createApi requer um objeto db { state, save }');
  }

  const api = express.Router();

  api.get('/todos', (_req, res) => {
    const list = db.state.todos
      .slice()
      .sort((a, b) => b.id - a.id)
      .map((x) => ({ ...x, done: !!x.done }));
    res.json(list);
  });

  api.get('/todos/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const t = db.state.todos.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: 'Registro não encontrado' });

    return res.json({ ...t, done: !!t.done });
  });

  api.post('/todos', (req, res) => {
    const rawTitle = req.body?.title;
    if (rawTitle == null) {
      return res.status(400).json({ error: 'Campo "title" é obrigatório' });
    }

    const title = String(rawTitle).trim();
    if (!title) {
      return res.status(400).json({ error: 'Campo "title" é obrigatório' });
    }

    const done = toBool(req.body?.done);
    const id = db.state.seq++;
    const created = { id, title, done, created_at: now() };
    db.state.todos.push(created);

    try {
      db.save();
    } catch {
      return res.status(500).json({ error: 'Falha ao persistir dados' });
    }

    return res.status(201).json({ ...created, done: !!created.done });
  });

  api.put('/todos/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const idx = db.state.todos.findIndex((x) => x.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Registro não encontrado' });

    const fields = {};
    if (req.body?.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) return res.status(400).json({ error: 'Campo "title" não pode ser vazio' });
      fields.title = title;
    }
    if (req.body?.done !== undefined) {
      fields.done = toBool(req.body.done);
    }
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    db.state.todos[idx] = { ...db.state.todos[idx], ...fields };

    try {
      db.save();
    } catch {
      return res.status(500).json({ error: 'Falha ao persistir dados' });
    }

    return res.json({ ...db.state.todos[idx], done: !!db.state.todos[idx].done });
  });

  api.delete('/todos/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const before = db.state.todos.length;
    db.state.todos = db.state.todos.filter((x) => x.id !== id);
    if (db.state.todos.length === before) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    try {
      db.save();
    } catch {
      return res.status(500).json({ error: 'Falha ao persistir dados' });
    }

    return res.status(204).end();
  });

  // health simples aqui (fica testável sem boot do servidor)
  api.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  return api;
}
