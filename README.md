# Probator

Juez online open-source para cursos de algoritmia. Los estudiantes suben código
en **C, C++, Java o Python**, se ejecuta contra casos de prueba en un sandbox
aislado, y obtienen un veredicto: **Accepted / Wrong Answer / Time Limit
Exceeded / Compilation Error**.

> _Probator_ (latín): "el que examina/prueba".

## Arquitectura

```
SvelteKit (frontend + API)            Postgres                 Judge0 CE (Docker)
 ├─ Editor CodeMirror                  ├─ problems              motor de ejecución
 ├─ Lista de problemas                 ├─ test_cases            aislada (isolate)
 └─ POST /api/submit ───────────────►  └─ submissions  ──HTTP─► corre + compara
        graba veredicto                                          stdout vs esperado
```

- **App** (este repo): SvelteKit + Drizzle ORM. Licencia MIT.
- **Motor**: [Judge0 CE](https://github.com/judge0/judge0) self-hosted (GPLv3,
  aislado tras su API HTTP — no afecta la licencia de este código).

## Desarrollo local

Requisitos: Node 20+, **pnpm** (nunca npm), Postgres 16/17, y un Judge0 accesible.

```bash
pnpm install
cp .env.example .env          # ajusta DATABASE_URL y JUDGE0_URL
pnpm db:push                  # crea las tablas
pnpm db:seed                  # carga 3 problemas de ejemplo
pnpm dev
```

App en http://localhost:5173.

## Levantar Judge0 (OVH / Docker)

```bash
cd deploy/judge0
cp judge0.conf.example judge0.conf   # pon REDIS_PASSWORD y POSTGRES_PASSWORD
docker compose up -d db redis
docker compose up -d
curl http://localhost:2358/languages # debe responder JSON
```

Luego apunta `JUDGE0_URL` en `.env` a esa instancia. Ver `docs/JUDGE0.md` para
los detalles de cgroups/kernel.

## Modelo de datos

| Tabla         | Para qué                                              |
| ------------- | ---------------------------------------------------- |
| `problems`    | enunciado (markdown), dificultad, límites tiempo/mem |
| `test_cases`  | stdin → stdout esperado; `is_sample` = visible       |
| `submissions` | cada intento con veredicto y conteo de casos         |

## Roadmap

- [ ] Autenticación de estudiantes (integración con Discamus)
- [ ] Historial de envíos por usuario
- [ ] Panel de administración para crear problemas/casos desde la UI
- [ ] Feedback de IA sobre enfoque/complejidad (opcional)

## Stack

SvelteKit 2 · Svelte 5 · Drizzle ORM · Postgres · CodeMirror 6 · Tailwind 4 ·
Judge0 CE
