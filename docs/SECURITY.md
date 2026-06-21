# Auditoría de seguridad — Probator

Probator ejecuta **código no confiable de estudiantes**. Este documento resume el
modelo de amenaza, lo que ya está mitigado por Piston, los huecos a cerrar, y una
lista de funciones/APIs peligrosas por lenguaje para una capa de defensa en
profundidad.

> **Principio rector:** el control de seguridad REAL es el sandbox del SO (Piston:
> namespaces, cgroups, sin red, FS aislado, usuario sin privilegios). La lista de
> funciones baneadas en el código fuente es **defensa en profundidad** — es
> evitable (reflexión, concatenación de strings, encoding, asm/syscalls en
> compilados). Sirve para rechazar abuso obvio/accidental y dar errores claros, no
> como frontera.

---

## 1. Qué ya garantiza Piston (verificado en el código de Piston)

Piston corre cada ejecución con **`isolate`** (sandbox de IOI) + **cgroup v2**:

- **Red: BLOQUEADA por defecto** (`PISTON_DISABLE_NETWORKING=true`). El job vive en
  un namespace de red aislado (solo loopback). ✔
- **Namespaces + chroot por job**: PID/mount/IPC/user namespaces, chroot a un box
  por ejecución, CWD en `/box/submission`, se destruye al terminar. ✔
- **Usuario sin privilegios**: uid/gid dedicado del rango 1001–1500, nunca root. ✔
- **Solo monta** el runtime del lenguaje y `/etc:noexec`; el resto del FS del host
  no es visible. ✔
- **Fork bombs**: limitadas por `--processes` (cgroup pids, default 64). ✔
- **Flood de salida**: corta con SIGABRT al superar `output_max_size`. ✔
- **CPU/wall-clock**: `--time` y `--wall-time` aplicados. ✔

### Verificación empírica (corrida contra el Piston en producción)
- Red a `1.1.1.1:53` → **`Network is unreachable`** ✔ (bloqueada).
- `open("/etc/passwd")`, `write ./x`, `write /tmp/x`, `ls /`, `os.system("id")` →
  **funcionan pero dentro del box efímero sin privilegios** (uid 60316; rootfs
  mínima `etc/piston/usr/tmp/proc/lib`; sin secretos de la app; se destruye al
  terminar). No es fuga del host. `os.system` confirma que se pueden lanzar
  procesos (contenido por el límite de procesos).
- **El contenedor Piston NO tiene ninguna var `PISTON_*`** → corre con TODOS los
  defaults → **memoria sin tope** y `output_max_size`=1024 bytes. Confirma 🔴 #1 y 🟠 #2.

## 2. Huecos a cerrar (HARDENING) — prioridad

| # | Hueco | Fix |
|---|-------|-----|
| 🔴 1 | **Memoria sin tope**: `PISTON_RUN_MEMORY_LIMIT`/`COMPILE_MEMORY_LIMIT` default `-1`. El validador NO clampa límites por-request cuando el global es ≤0 → se podría pedir memoria arbitraria y tumbar el host. | Setear globales positivos: `PISTON_RUN_MEMORY_LIMIT=268435456` (256MB), `PISTON_COMPILE_MEMORY_LIMIT=536870912` (512MB) |
| 🟠 2 | **`output_max_size` default 1024 bytes** (muy bajo para problemas con salida grande; también no truncar de más) | `PISTON_OUTPUT_MAX_SIZE=65536` (o 1MB) |
| 🟠 3 | **`/api/v2/packages` SIN autenticación** (instala paquetes ejecutando scripts). Hoy Piston está en `127.0.0.1`/red interna, no expuesto — pero la app solo necesita `GET /runtimes` y `POST /execute`. | No exponer packages/connect; idealmente reverse-proxy con allowlist de esas 2 rutas. Instalar lenguajes out-of-band (ya se hace). |
| 🟡 4 | Límites de procesos/archivos por defecto altos | `PISTON_MAX_PROCESS_COUNT=64`, `PISTON_MAX_OPEN_FILES=256`, `PISTON_MAX_FILE_SIZE=5000000`, `PISTON_MAX_CONCURRENT_JOBS=8` |

> Probator ya arma el request de `/execute` en el servidor (el estudiante no pasa
> límites directamente) y clampa `run_timeout` a 3000ms. Aun así, los globales de
> memoria deben setearse como techo duro.

## 3. Riesgo residual (honesto)
- **Escape de contenedor privilegiado / kernel**: el motor corre código nativo en
  un contenedor `--privileged` (isolate lo necesita). Un 0-day de kernel/isolate o
  una mala config podría escapar al host. Por eso la recomendación es **Piston en un
  host/VPS dedicado y desechable** (pendiente del roadmap). Hoy comparte box con
  n8n/otros → un escape sería de alto impacto.
- **Piston no tiene authn/authz**: toda la protección es de capa de red.
- **DoS por agregación**: muchos envíos legítimos pesados saturan CPU/RAM.

---

## 4. Blocklist por lenguaje (defensa en profundidad)

Aplicar sobre el código ENVIADO antes de mandarlo a Piston. **Siempre permitido:**
leer stdin / escribir stdout (`input()`, `sys.stdin`, `Scanner(System.in)`,
`cin`, `Console.In`, `STDIN`, etc.).

### Tier prioritario (los que sintetizan cualquier otro ataque — banear sí o sí)
- **Python**: `subprocess`, `os.system`, `os.popen`, `os.exec`, `os.fork`, `socket`, `__subclasses__`, `__builtins__`, `__globals__`, `ctypes`, `pty`, `eval`/`exec`/`compile`/`__import__`
- **Ruby**: backticks `` ` ``, `%x`, `system`, `exec`, `spawn`, `fork`, `IO.popen`, `Open3`, `ObjectSpace`, `Kernel`, `send`/`__send__`, `eval`, `Fiddle`, `TCPSocket`, `Net::`
- **JS/TS (Node)**: `child_process`, `eval`, `new Function`, `.constructor.constructor`, `vm`, `require`/`import` con argumento NO literal, `process.binding`/`dlopen`, `fetch`/`net`/`http`/`https`/`dns`/`dgram`/`tls`/`worker_threads`/`cluster`, `fs`, `process.env`
- **Java**: `Runtime`, `ProcessBuilder`, `System.exit`, `java.io.File`, `java.nio.file`, `java.net`, `loadLibrary`, `System.load`, `setAccessible`, `java.lang.reflect`, `Class.forName`, `sun.misc.Unsafe`, `MethodHandles`, `ClassLoader`
- **C#**: `Process`, `ProcessStartInfo`, `Environment.Exit`, `System.IO`, `System.Net`, `DllImport`, `System.Reflection`, `Activator`, `unsafe`, `Marshal`, `AppDomain`, `Assembly.Load`
- **C/C++**: `system`, `popen`, `exec*`, `fork`/`vfork`/`clone`, `socket`/`connect`, `__asm__`/`asm`, `syscall`, `ptrace` (+ `std::system`, `<fstream>`/`std::filesystem` → flag)
- **Go**: `"os/exec"`, `os.StartProcess`, `syscall.Exec`/`ForkExec`, import `"syscall"`, import `"unsafe"`, `import "C"` (cgo), `"net"`/`"net/http"` — **mejor aún: compilar con `CGO_ENABLED=0`**
- **Rust**: `std::process::Command`, `std::net::`, `libc`, `asm!`/`global_asm!`, `extern "C"` (`unsafe` → flag, no ban: rompe I/O rápido legítimo)

### Reglas de matching (evitar falsos positivos)
- Usar **AST o regex con límites de palabra**, no substring (`eval` ≠ `medieval`; `fs` ≠ `prefs`; `Process` ≠ `processData`).
- Quitar comentarios y strings antes de matchear; normalizar espacios (`Class . forName`).
- En TS, matchear sobre el **JS transpilado** también.
- **NO banear** genéricos como `System.` (Java/C#), `import sys` (Python, se necesita para stdin), `require` (Ruby, rompe `require 'set'/'json'`), `unsafe` (Rust). Banear el sub-token específico.

### Nuance de stdin
- **Node**: `fs.readFileSync(0)` usa `fs`. Recomendación: **inyectar stdin** en el harness (ya lo hacemos: el harness lee la entrada y llama a la función) → se puede banear `fs` completo sin falsos positivos. Para modo stdio en JS, documentar `process.stdin`/readline como vía soportada.
- Como Probator usa harness generado, **el estudiante en modo función nunca necesita tocar I/O** → el blocklist puede ser agresivo ahí.

---

## 5. Implementación recomendada en Probator
1. **Hardening de Piston** (env vars de la tabla §2) — **lo más importante y barato**. Aplicar al servicio piston en el compose/Dokploy.
2. **Módulo blocklist** (`src/lib/server/judge/blocklist.ts`): por `langKey`, lista de patrones; función `scan(lang, source)` → `{blocked, matches[]}`. Llamar en `/api/submit` antes de `grade()`; si bloquea, devolver 422 con qué se detectó (mensaje educativo).
3. Mantener Piston solo en red interna (ya está); no exponer `/packages`.
4. **Roadmap**: mover Piston a VPS dedicado (única mitigación real del escape de contenedor).

> Re-confirmar contra `GET /api/v2/runtimes` y el código de Piston tras cada
> upgrade de versión.
