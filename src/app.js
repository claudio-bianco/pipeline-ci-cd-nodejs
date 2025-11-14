import 'newrelic'; // deve ser o primeiro import (instrumentação)
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';

import { createApi } from './routes/api.js';
import { createFileDB } from './db/file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Config ----------
const PORT = process.env.PORT || 3000;

const ALLOW_ORIGINS = new Set(
  (process.env.ALLOW_ORIGINS || '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

const CORS_METHODS = Object.freeze(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
const CORS_ALLOWED_HEADERS = Object.freeze(['Content-Type', 'Authorization']);

const DEFAULT_DB_FILE = path.join(__dirname, 'db.json');

const DB_FILE = process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : DEFAULT_DB_FILE;

// permite sobrescrever via env nos testes, sem tocar a pasta real do projeto
const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : path.join(__dirname, 'public');

// ---------- App ----------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// versão da API
let pkg = { version: '0.0.0' };
try {
  const rawPkg = fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8');
  pkg = JSON.parse(rawPkg);
} catch (e) {
  console.warn('Não foi possível ler o package.json:', e.message);
}

app.get('/api/version', (_req, res) => {
  res.json({ version: pkg.version });
});

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOW_ORIGINS.has('*') || ALLOW_ORIGINS.has(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    methods: CORS_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
  })
);

// ---------- Banco ----------
const db = createFileDB(DB_FILE);

// ---------- Rotas ----------
app.use('/api', createApi({ db }));

// ---------- Static ----------
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
}

export default app;

if (process.argv[1] === __filename) {
  app.listen(PORT, () => console.log(`Servidor ON: http://localhost:${PORT}`));
}
