import fs from 'node:fs';
import path from 'node:path';

function ensureDirFor(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function createFileDB(dbFile) {
  const TMP_FILE = `${dbFile}.tmp`;

  function loadDB() {
    try {
      ensureDirFor(dbFile);
      if (!fs.existsSync(dbFile)) {
        const initial = { todos: [], seq: 1 };
        fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2));
        return initial;
      }
      const raw = fs.readFileSync(dbFile, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      // Retorna estrutura segura se quebrar
      console.error('Falha ao ler db.json:', e.message);
      return { todos: [], seq: 1 };
    }
  }

  function saveDB(state) {
    ensureDirFor(dbFile);
    const data = JSON.stringify(state, null, 2);
    fs.writeFileSync(TMP_FILE, data);
    fs.renameSync(TMP_FILE, dbFile);
  }

  // estado residente em memória + função de persistência
  const state = loadDB();

  return {
    state,                         // objeto mutável (todos, seq)
    save: () => saveDB(state),     // persiste o snapshot atual
  };
}
