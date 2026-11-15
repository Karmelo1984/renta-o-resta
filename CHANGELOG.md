# Registro de cambios

Los cambios relevantes se documentan en castellano, agrupados por versión y con la más reciente primero. El procedimiento de liberación está en [CONTRIBUTING.md](CONTRIBUTING.md).

## Política del registro

- `Sin publicar` reúne cambios pendientes; su presencia no acredita una release ni un despliegue.
- Cada release estable tendrá una sección `[X.Y.Z] - AAAA-MM-DD`, correspondiente al tag `vX.Y.Z` del commit final aprobado de `main` y a la versión de los metadatos.
- Usar las categorías Añadido, Cambiado, Corregido, Obsoleto, Eliminado y Seguridad cuando correspondan; omitir categorías vacías. Describir consecuencias para el usuario, especialmente cambios en resultados financieros o formatos.
- Al liberar, mover solo las entradas incluidas en el candidato validado y conservar las pendientes. Añadir enlaces al tag o comparación cuando existan.
- No inventar versiones, fechas o hitos históricos. El valor actual `1.0.0` de `package.json` no demuestra por sí solo que se haya publicado `v1.0.0`. Este registro comienza con la documentación del flujo, sin reconstruir releases anteriores no verificadas.

## Sin publicar

### Añadido

- Guía de contribución con controles de PR, pruebas locales y procedimiento manual de releases estables SemVer con tags y changelog.
- Registro de cambios y reglas para mantener las notas de cada versión.

### Cambiado

- Documentación del flujo `feature/* → itg → dev → main`, con integración local en `itg`, validación del candidato en `dev` y promoción controlada de releases a `main`.
- README: requisitos de Node.js e instalación reproducible, y distinción entre el workflow de Pages existente y los controles y despliegue de desarrollo pendientes.

Las ramas permanentes `itg` y `dev` ya están creadas. Las protecciones, la CI de PR, el despliegue de desarrollo y la automatización de releases siguen pendientes.
