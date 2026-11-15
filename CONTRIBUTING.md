# Contribuir a Renta o Resta

Esta guía define el flujo de desarrollo, validación y liberación. La arquitectura y convenciones de código se mantienen en [CLAUDE.md](CLAUDE.md); los comandos y el estado real de CI/CD están resumidos en [README.md](README.md).

## Preparación y pruebas locales

Usar Node.js 22.12.0 o superior y el lockfile del repositorio:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Estos cuatro controles de calidad deben pasar antes de integrar y promover. Para revisar formato, usar `npm run format:check`; los documentos modificados deben respetar Prettier. No incorporar reformateos ajenos al cambio.

Para la revisión funcional, ejecutar `npm run dev` o `npm run preview` después de generar el build. Revisar las funcionalidades afectadas en escritorio y móvil, teclado, CSV e impresión cuando corresponda. Para cambios financieros, añadir pruebas de regresión significativas y comprobar sincronización B/C, aportaciones, cuotas, redondeos y conciliación de patrimonio.

Registrar en el PR comandos, resultados, commit probado y comprobaciones manuales. Una prueba local no sustituye a CI ni acredita un despliegue remoto.

## Ramas y recorrido del cambio

```text
itg → feature/<descripcion> → PR a itg → PR a dev → PR de release a main → tag vX.Y.Z
```

- `feature/*` nace de `itg` actualizado y contiene un cambio acotado, incluidas correcciones o documentación.
- `itg` integra cambios revisados y validados localmente. Probar también el resultado combinado antes de promoverlo.
- `dev` recibe promociones de `itg` para validar un candidato completo. Su despliegue de desarrollo está pendiente; mientras tanto, validar localmente el commit candidato.
- `main` recibe exclusivamente releases estables desde `dev`. No admite funcionalidades aisladas, candidatos incompletos ni pushes directos.

Las ramas `itg` y `dev` se crearon desde el mismo commit de `main`. La configuración de sus controles sigue pendiente.

Para iniciar un desarrollo desde `itg`:

```sh
git fetch origin
git switch itg
git pull --ff-only origin itg
git switch -c feature/descripcion
```

Actualizar la rama de trabajo con `itg`, resolver conflictos y repetir controles antes de fusionar. No reescribir el historial compartido de `itg`, `dev` o `main`. Se puede usar squash para PR de funcionalidades; para promociones entre ramas permanentes, conservar la ascendencia mediante merge commits. No borrar las ramas permanentes al cerrar PR.

## Controles de PR

Cada PR debe explicar problema, alcance, pruebas y riesgos, actualizar documentación y añadir una entrada en `Sin publicar` del changelog si corresponde.

| PR | Condiciones de aceptación |
| --- | --- |
| `feature/* → itg` | Cambio acotado, pruebas locales, revisión y conflictos resueltos. |
| `itg → dev` | Conjunto integrado estable, controles repetidos sobre el resultado y alcance del candidato identificado. |
| `dev → main` | Candidato validado, versión final y changelog preparados, aprobación explícita del mantenedor y controles de release. |

Configurar como objetivo protecciones para exigir PR, conversaciones resueltas, comprobaciones CI satisfactorias sobre el resultado que se fusionará y bloqueo de force-push y borrado. Exigir al menos una aprobación independiente cuando haya otro mantenedor; en trabajo individual, registrar la revisión y decisión del responsable sin fingir una revisión independiente. Cualquier cambio tras una aprobación o validación requiere repetir los controles afectados.

**Estos requisitos son la política de trabajo; no están garantizados por el workflow actual.** La CI de PR para destinos `itg`, `dev` y `main` está pendiente. Debe ejecutar instalación reproducible, tipos, lint, tests y build, sin desplegar desde PR. Configurar checks obligatorios solo cuando existan y se ejecuten en todos los PR correspondientes. Las restricciones sobre la rama de origen y las versiones también requieren automatización adicional; escribirlas aquí no las hace cumplir en GitHub.

## Validación en dev

Promover mediante PR un conjunto de cambios listo para validarse. Registrar el SHA candidato y congelar nuevas promociones a `dev` mientras se valida la release; `itg` puede continuar recibiendo trabajo posterior.

Si aparece un defecto, corregirlo desde `itg` mediante una rama de trabajo y repetir el recorrido. Si `itg` ya contiene trabajo posterior no apto para la release, detener la promoción y reorganizar el alcance antes de continuar; no arrastrar ese trabajo ni parchear `dev` directamente.

Cuando exista CD de desarrollo, exigir despliegue correcto y comprobaciones funcionales sobre la URL y el SHA publicados. Actualmente este entorno no está implantado: registrar la validación local y esta limitación, sin atribuirle una publicación remota.

## Política de versiones y releases

Usar SemVer para el contrato público del simulador: entradas, salidas, formatos de exportación y comportamiento documentado.

- **MAJOR (X):** cambios incompatibles en ese contrato.
- **MINOR (Y):** nuevas funcionalidades compatibles.
- **PATCH (Z):** correcciones compatibles; explicar las que cambien resultados numéricos.

La rama no determina automáticamente la versión. `main` solo recibe versiones finales `vX.Y.Z`; los candidatos se validan en `dev` sin etiquetarlos como estables. No inferir una release publicada a partir del campo `version` de `package.json`.

### Procedimiento de liberación

1. Elegir el alcance y la siguiente versión a partir de las releases y tags reales. Preparar en una rama desde `itg` la versión de `package.json` y la versión raíz correspondiente de `package-lock.json`, junto con el changelog. No actualizar dependencias accidentalmente.
2. Mover las entradas incluidas de `Sin publicar` a `[X.Y.Z] - AAAA-MM-DD`, usando la fecha prevista de liberación, y dejar una sección abierta para trabajo posterior. Revisar la fecha si se pospone. Fusionar la preparación en `itg`, promover a `dev` y validar de nuevo el candidato final.
3. Abrir PR `dev → main` identificado como `Release vX.Y.Z`. Adjuntar alcance, pruebas, SHA validado y notas. Confirmar que los metadatos y changelog coinciden, que el tag no existe y que no hay cambios sin validar. Cualquier modificación reinicia la validación necesaria.
4. Tras la aprobación del mantenedor, fusionar conservando la ascendencia. Con el workflow actual, **este merge dispara el despliegue de producción por push a main, antes del tag**. No fusionar hasta aceptar la publicación de ese contenido. Revisar el resultado de Actions y comprobar la web publicada.
5. Verificar los controles sobre el commit final de `main` y crear un tag anotado `vX.Y.Z` que apunte exactamente a ese commit; publicar una GitHub Release con las notas de esa versión. Son pasos manuales en el estado actual. No etiquetar el SHA anterior de `dev` si el merge produjo otro commit.
6. Sincronizar el commit final de `main` hacia `dev` y después `itg` mediante PR de sincronización, sin añadir cambios funcionales. Esta excepción al recorrido ascendente conserva historial y metadatos de release. Repetir los controles y resolver conflictos antes del siguiente ciclo.

Los tags publicados son inmutables: no moverlos ni reutilizar versiones. Ante un fallo de despliegue, no anunciar la release como publicada correctamente; investigar y repetir el despliegue del mismo commit o preparar una nueva corrección según el caso. Un revert de producción debe pasar por una nueva release PATCH siguiendo el flujo; no reescribir `main`. Las correcciones urgentes siguen el mismo recorrido y pueden priorizarse, sin omitir controles.

## CI/CD actual y trabajo pendiente

El único workflow revisado, [deploy.yml](.github/workflows/deploy.yml), se activa con push a `main` y ejecución manual, usa Node.js 22 y publica un artefacto Pages tras tipos, lint, tests y build. No tiene trigger de PR o tags, ni validación de versiones, generación de changelog o GitHub Releases. La ejecución manual tampoco restringe explícitamente la rama: por política, usarla solo para republicar un commit estable aprobado de `main`; nunca para simular el entorno `dev`.

Pendiente de una implementación autorizada:

- CI de PR y protecciones descritas arriba.
- CD de `dev` con destino, URL y configuración de rutas separados; comprobar que nunca sustituya producción. El workflow actual comparte el entorno `github-pages` y el grupo de concurrencia `pages`; añadir otra rama al trigger no crea aislamiento.
- Controles de release: origen `dev`, versión, changelog y relación tag/commit. Si se quiere que producción se publique exclusivamente al crear un tag estable, habrá que cambiar el trigger y validar que el tag pertenece a `main`. Hoy no funciona así.
- Restricción de ejecuciones manuales y validación del commit final de cada promoción.

Esta actualización documental no modifica workflows, configuración de GitHub, metadatos de versión ni código de aplicación.
