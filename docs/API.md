# Probator REST API (v1)

API para crear ejercicios, enviar soluciones y consultar resultados/códigos
programáticamente (p. ej. desde Discamus Academy).

## Autenticación
Cada consumidor es una **app** con su propia **key** (`pk_…`). Se crea en el panel
admin (`/admin/apps`) y se muestra una sola vez. Envíala en cada request:

```
Authorization: Bearer pk_xxxxxxxx
```
(o `x-api-key: pk_xxxxxxxx`). Sin key válida → `401`.

**Propiedad:** una app solo puede **editar/borrar los ejercicios que ella creó**
(403 en caso contrario). Leer y enviar soluciones está permitido para cualquier
app válida.

Base URL: `https://probator.progitator.com/api/v1`

## Ejercicios

### `GET /problems`
Lista todos los ejercicios. `mine: true` indica los de tu app.

### `GET /problems/{slug}`
Detalle: enunciado, modo, firma, lenguajes soportados, casos de ejemplo.

### `POST /problems`  ·  crea/actualiza (tuyo)
```json
{
  "slug": "suma", "title": "Suma", "statement": "...",
  "difficulty": "easy", "mode": "function",
  "timeLimitMs": 2000, "memoryLimitKb": 128000,
  "cases": [{ "stdin": "2 3\n", "expectedOutput": "5\n", "isSample": true }],
  "templates": { "python": { "starter": "...", "harness": "...{{USER_CODE}}..." } },
  "signature": { "functionName": "suma", "params": [{"name":"a","type":"int"}], "returnType": "int" }
}
```
`mode: "stdio"` no necesita `templates`/`signature`. Responde `201 { ok, slug }`.

### `PUT /problems/{slug}` · actualiza (solo dueño) · `DELETE /problems/{slug}` · borra (solo dueño)

## Enviar soluciones

### `POST /submit`
```json
{ "slug": "suma", "language": "python", "source": "def suma(a,b): return a+b",
  "discordId": "123", "username": "ana" }
```
`discordId` (opcional) atribuye el envío a ese estudiante. Responde el veredicto:
```json
{ "submissionId": 42, "verdict": "Accepted", "passedCount": 4, "totalCount": 4,
  "runtimeMs": 35, "cases": [...] }
```
Lenguajes: `python, c, cpp, java, javascript, typescript, go, rust, csharp, ruby`.

## Resultados / códigos (por tiempo)

### `GET /submissions`
Más recientes primero. Query: `problem=<slug>`, `discordId=<id>`,
`since=<ISO8601>`, `limit=<≤200>`, `includeCode=true`.
```
GET /submissions?problem=suma&discordId=123&limit=20&includeCode=true
```

### `GET /submissions/{id}`
Un envío con su **código fuente** completo.

## Ejemplo (curl)
```bash
KEY=pk_xxx
curl -H "Authorization: Bearer $KEY" https://probator.progitator.com/api/v1/problems
curl -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"slug":"suma","language":"python","source":"def suma(a,b): return a+b","discordId":"123"}' \
  https://probator.progitator.com/api/v1/submit
curl -H "Authorization: Bearer $KEY" "https://probator.progitator.com/api/v1/submissions?discordId=123&includeCode=true"
```
