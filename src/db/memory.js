export function createMemoryDB(initial = { todos: [], seq: 1 }) {
  // clona para evitar efeitos colaterais
  const state = JSON.parse(JSON.stringify(initial));
  return {
    state,
    save: () => { /* no-op nos testes */ },
  };
}