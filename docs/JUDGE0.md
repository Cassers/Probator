# Judge0 — notas de despliegue

Judge0 CE es el motor que ejecuta el código de los estudiantes en un sandbox
aislado (`isolate`). Probator solo le habla por HTTP.

## Requisitos del host (OVH)

`isolate` necesita control de cgroups. En kernels modernos suele hacer falta
habilitar memory cgroups y swap accounting en la línea de arranque del kernel:

```
cgroup_enable=memory swapaccount=1 systemd.unified_cgroup_hierarchy=0
```

(GRUB: `GRUB_CMDLINE_LINUX`, luego `update-grub` y reiniciar.)

Los contenedores `server` y `workers` corren `privileged: true` por esta razón.

## Puesta en marcha

```bash
cd deploy/judge0
cp judge0.conf.example judge0.conf
# edita judge0.conf: POSTGRES_PASSWORD, REDIS_PASSWORD (y AUTH_TOKEN si quieres)

docker compose up -d db redis     # deja que inicialicen ~10s
docker compose up -d              # server + workers
curl http://localhost:2358/languages
```

## Seguridad

- **No expongas** el puerto 2358 a internet abierto. Ponlo detrás de un reverse
  proxy / red interna, o activa auth (`AUTH_TOKEN` en `judge0.conf` +
  `JUDGE0_AUTH_TOKEN` en el `.env` de Probator).
- `ALLOW_ENABLE_NETWORK=false` impide que el código enviado acceda a la red.
- Mantén límites de CPU/memoria/wall-time conservadores en `judge0.conf`.

## IDs de lenguaje

Probator mapea lenguajes a IDs de Judge0 en
`src/lib/judge/languages.ts` (Python 71, C++ 54, C 50, Java 62). Si cambias de
versión de Judge0, verifica con `GET /languages` y ajusta esos IDs.

## Despliegue con Dokploy

En Dokploy crea un servicio tipo **Docker Compose** apuntando a
`deploy/judge0/docker-compose.yml`. Sube `judge0.conf` como archivo de entorno
(no lo commitees: está en `.gitignore`).
```
