# CLAUDE.md

Guía de trabajo del proyecto. Seguirla siempre.

## Proyecto

**Renta o Resta** (repositorio `renta-o-resta`), simulador de ahorro y apalancamiento: web estática (sin backend) en **Vite + TypeScript + Tailwind v4**, sin framework (DOM vanilla en TS). Se desarrolla en local con HMR y se despliega a GitHub Pages desde `main` mediante GitHub Actions (`.github/workflows/deploy.yml`). Todavía no hay remoto; el repositorio está en fase de desarrollo.

## Comandos

- `npm run dev`: servidor con recarga automática (logger en `debug`).
- `npm run build`: `tsc --noEmit` + `vite build` → `dist/` (logger en `warn`).
- `npm run typecheck`, `npm run lint`, `npm run format`, `npm test`.
- Antes de dar algo por terminado deben pasar `typecheck`, `lint`, `test` y `build`.
- Pages sirve en subruta: `VITE_BASE_PATH` (`/<repo>/`) lo fija el workflow; en local es `/`.

## Multiplataforma y ficheros de configuración

- Debe funcionar igual en Windows, Linux y macOS: finales de línea **LF** (`.gitattributes` con `eol=lf` y Prettier `endOfLine: "lf"`); no usar rutas ni scripts específicos de un SO.
- `.gitignore`: dependencias, `dist/`, caches, `.env*` (salvo `.env.example`), logs, basura de SO/IDE y `.claude/settings.local.json`. De `.vscode/` solo se versionan `extensions.json` y `settings.json`.
- `.prettierignore`: `node_modules`, `dist`, `coverage`, lockfiles y ficheros generados.
- `.prettierrc.json`: comillas simples, `printWidth` 100, `trailingComma: all`, plugin de Tailwind (`./src/styles/main.css`).
- Al añadir carpetas o herramientas nuevas que generen artefactos, actualizar `.gitignore` y `.prettierignore`.

## Programación orientada a objetos

- Se prioriza el uso de **clases**. Lógica sin estado → clase con métodos `static` (permitido por ESLint); con colaboradores → clase con inyección por constructor.
- **Una clase, un fichero. Una interfaz, un fichero. Igual para enums, DTOs y `type`.** El nombre del fichero es el del tipo (`CuentaDto.ts`, `Logger.ts`). Sin barrels `index.ts`.
- Jerarquía por contexto: no más de unas pocas decenas de ficheros por carpeta; si crece, se agrupa en subdirectorios.
- Modificadores de acceso explícitos (`public`/`private`) y tipos de retorno explícitos.

## Arquitectura (`src/`)

- `config/`: `Configuracion.ts` (`CONFIG`, único sitio de valores por defecto, límites y constantes) y `modelo/` (interfaces de la configuración, agrupadas en `simulacion/` e `interfaz/`).
- `core/` — **cálculo** (equivalente a backend). Sin DOM ni `window`.
  - `dto/`: DTOs y tipos por contexto (`calendario`, `cuenta`, `escenario`, `estado`, `resultado`, `agrupacion`).
  - `calculo/`: `simulacion/` (motor `SimuladorFinanciero`), `detalle/` (`AgrupadorDetalle`), `calendario/`, `comun/`.
  - `log/`: `Logger`.
- `ui/` — **representación** (frontend). Nunca contiene lógica financiera; la pide a `core/`.
  - `app/` (composición y estado), `base/` (Dom, Html, Formateador), `componentes/` (`plantillas/` reutilizables y `comportamiento/`), `secciones/` (HTML de cada parte de la página), `controladores/` (eventos), `presentadores/` (pintan resultados), `graficos/` (Canvas).
- `services/`: entrada/salida (descarga y CSV). Sin cálculo ni render.
- `styles/`: Tailwind (`tema.css` con tokens `@theme`, `base.css`, `componentes/*.css`, `impresion.css`).
- `tests/`: refleja la estructura de `src/`; `soporte/` contiene utilidades de prueba.

Regla de dependencias: `ui` → `core`/`services`/`config`; `core` no importa de `ui`.

## Tailwind y componentes

- Tokens (colores, radios, sombras) en `@theme`; se usan como utilidades (`bg-fondo`, `text-tenue`, `rounded-tarjeta`).
- Los elementos repetidos son **componentes de estilo** (`@layer components` con `@apply`: `.boton`, `.campo`, `.tarjeta`, `.aviso`, `.segmentado`…) y **plantillas TS** en `ui/componentes/plantillas/` (`CampoNumerico`, `Selector`, `ControlSegmentado`, `Boton`, `Aviso`, `Icono`). No duplicar markup ni estilos: se extrae.
- Los casos puntuales de maquetación pueden usar utilidades directamente en la plantilla.

## Logger

- `core/log/Logger`: único punto que escribe en consola (`no-console` activo fuera de él).
- Nivel global: `debug` en desarrollo y `warn` en producción (`import.meta.env.DEV`).
- La capa de cálculo traza cada simulación (inicio, cierre de mes, resultado, umbral). Las búsquedas internas (bisección) no se trazan para no inundar la consola.
- Los tests lo silencian (`tests/setup.ts`).

## Tipado

- `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. **Prohibido `any`** (`no-explicit-any` es error); usar `unknown` y estrechar.
- DTOs específicos para cada entrada/salida; nada de `object`, `Function` o `Record<string, unknown>` genéricos.
- Evitar aserciones de tipo (`as`); acceso al DOM tipado con `Dom.porId(id, HTMLInputElement)`. Las pocas existentes estrechan claves de `Object.keys`/`dataset`.

## Documentación y calidad

- Todo lo exportado lleva **TSDoc** (`@param`, `@returns`, `@throws`); validado por `eslint-plugin-tsdoc`.
- ESLint `strictTypeChecked` + `max-classes-per-file: 1`; Prettier (con `prettier-plugin-tailwindcss`).
- Nombres de dominio en español (`calculos`, `agrupacion`, `puntualesB`…); mantener el idioma.
- La migración conserva el comportamiento: los tests del motor deben seguir pasando sin cambios de valores.
