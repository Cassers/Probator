# Probator

Juez online open-source para cursos de algoritmia. Los estudiantes suben código
en **C, C++, Java o Python**, se ejecuta contra casos de prueba en un sandbox
aislado, y obtienen un veredicto: **Accepted / Wrong Answer / Time Limit
Exceeded / Compilation Error**.

> _Probator_ (latín): "el que examina/prueba".

## Arquitectura

```
SvelteKit (frontend + API)            Postgres                 Piston (Docker)
 ├─ Editor CodeMirror                  ├─ problems              motor de ejecución
 ├─ Lista de problemas                 ├─ test_cases            aislada (cgroup v2)
 └─ POST /api/submit ───────────────►  └─ submissions  ──HTTP─► corre el código;
        compara stdout vs esperado                              Probator compara
        graba veredicto                                          la salida
```

- **App** (este repo): SvelteKit + Drizzle ORM. Licencia MIT.
- **Motor**: [Piston](https://github.com/engineer-man/piston) self-hosted. Ejecuta
  el código; **Probator** compara la salida (Piston no compara). Ver
  `docs/ENGINE.md` (incluye por qué Piston y no Judge0).

## Desarrollo local

Requisitos: Node 20+, **pnpm** (nunca npm), Postgres 16/17, y un Piston accesible.

```bash
pnpm install
cp .env.example .env          # ajusta DATABASE_URL y PISTON_URL
pnpm db:push                  # crea las tablas
pnpm db:seed                  # carga 3 problemas de ejemplo
pnpm dev
```

App en http://localhost:5173.

## Levantar el motor (Piston)

```bash
cd deploy/piston
docker compose up -d
./install-languages.sh               # python 3.12, gcc 10.2 (c/c++), java 15.0.2
curl http://127.0.0.1:2000/api/v2/runtimes
```

Luego apunta `PISTON_URL` en `.env` a esa instancia. Ver `docs/ENGINE.md`.

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
Piston
