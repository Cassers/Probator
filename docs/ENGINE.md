# Motor de ejecución — Piston

Probator usa **[Piston](https://github.com/engineer-man/piston)** para ejecutar
el código de los estudiantes en un sandbox aislado. Probator solo le habla por
HTTP (`POST /api/v2/execute`).

## Por qué Piston y no Judge0

El plan original era Judge0, pero **Judge0 1.13.x (isolate 1.x) requiere cgroup
v1**, y el servidor (Ubuntu 25.04 / systemd 257) es **cgroup v2 únicamente** —
systemd 256+ eliminó el soporte de cgroup v1, así que el workaround de GRUB
(`systemd.unified_cgroup_hierarchy=0`) ya no funciona. Piston **requiere cgroup
v2**, justo lo que tiene el host. Detalle: ver memoria
`judge0-incompatible-systemd257-cgroupv2`.

Diferencia clave: Piston es un ejecutor puro — **no compara la salida**. Probator
compara `stdout` contra el esperado en `src/lib/server/judge/grade.ts`
(normalizando espacios al final de línea y saltos finales).

## Despliegue

```bash
cd deploy/piston
docker compose up -d
./install-languages.sh          # python 3.12, gcc 10.2 (c/c++), java 15.0.2
curl http://127.0.0.1:2000/api/v2/runtimes
```

Apunta `PISTON_URL` del `.env` de Probator a esa instancia.

## Seguridad

- Bindeado a **`127.0.0.1`** — no exponer el puerto 2000 a internet.
- Corre `--privileged` (Piston gestiona su propio sandbox cgroup v2).
- Límites de tiempo/memoria por ejecución se pasan desde el problema
  (`time_limit_ms`, `memory_limit_kb`) en cada request.

## Runtimes y versiones

Las versiones en `src/lib/judge/languages.ts` deben coincidir con las instaladas
(`GET /api/v2/runtimes`). Actualmente:

| Lenguaje | Piston language | version |
| -------- | --------------- | ------- |
| Python 3 | `python`        | 3.12.0  |
| C++      | `c++`           | 10.2.0  |
| C        | `c`             | 10.2.0  |
| Java     | `java`          | 15.0.2  |

## Veredictos (cómo se mapean)

- `compile.code != 0` → **Compilation Error** (se reporta una vez, no corre el resto).
- `run.signal == SIGKILL` → **Time Limit Exceeded** (Piston mata por timeout/memoria).
- `run.code != 0` → **Runtime Error**.
- `stdout` normalizado == esperado → **Accepted**, si no **Wrong Answer**.
