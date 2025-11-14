# testes
npm install
npm run dev       # inicia o servidor com hot reload
npm test          # roda testes unitários isolados (usa createMemoryDB)
npm run test:cov  # gera cobertura

# validar a execução mesmo sem testes
npm run test:cov -- --passWithNoTests

# Verifique se o arquivo é JSON válido
npm pkg get name


# Criar
curl -X POST http://localhost:3000/api/todos -H "Content-Type: application/json" -d '{"title":"Tarefa 1"}'

# Listar
curl -X GET http://localhost:3000/api/todos

# Buscar
curl -X GET http://localhost:3000/api/todos/1

# Atualizar
curl -X PUT http://localhost:3000/api/todos/1 -H "Content-Type: application/json" -d '{"done":true}'

# Deletar
curl -X DELETE http://localhost:3000/api/todos/1

# Health
curl -X GET http://localhost:3000/api/health

# Formatar automaticamente as respostas JSON
curl -s http://localhost:3000/api/todos | jq


npm run lint

# Rodar com autocorreção
npm run lint:fix

# Bloquear warnings em CI
npm run lint:strict
