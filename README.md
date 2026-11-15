# Simulador de ahorro y apalancamiento

Herramienta de simulación financiera que compara **tres escenarios** de ahorro en un número variable de cuentas remuneradas configurables, con aportaciones propias y un préstamo.

Aplicación web estática para PC o móvil, **sin servidor ni servicios externos** (Vite + TypeScript + Tailwind en desarrollo; el resultado es HTML, CSS y JS estáticos). El motor financiero es independiente de la interfaz.

## Desarrollo y despliegue

Requisitos: Node.js 22 o superior.

```sh
npm install
npm run dev        # servidor local con recarga automática (logger en debug)
npm test           # pruebas (Vitest)
npm run lint       # ESLint + TSDoc
npm run build      # genera dist/ (logger en warn)
```

**Despliegue:** al hacer push a `main`, `.github/workflows/deploy.yml` ejecuta tipos, lint, tests y build, y publica `dist/` en GitHub Pages. Una sola vez, en el repositorio: _Settings → Pages → Source: GitHub Actions_.

## Escenarios

| Escenario                   | Capital inicial |            Préstamo | Aporte periódico                | Aporte puntual         |
| --------------------------- | --------------: | ------------------: | ------------------------------- | ---------------------- |
| A · Solo ahorro             |        25.000 € |                   — | No                              | No                     |
| B · Ahorro con aportaciones |        25.000 € |                   — | Configurable; día 1 de cada mes | Configurable; día 1    |
| C · Ahorro financiado       |        25.000 € | 50.000 € al 6 % TIN | **Igual que B**; día 1          | **Igual que B**; día 1 |

Cada cuenta remunerada configurada se aplica de forma independiente a A, B y C; el número de cuentas es variable.

- **A · Ahorro inicial:** el capital inicial genera intereses, sin aportaciones posteriores.
- **B · Ahorro con aportaciones:** suma aportaciones periódicas y puntuales al capital inicial.
- **C · Ahorro con préstamo:** repite las aportaciones de B, añade un préstamo y descuenta sus cuotas del saldo. El préstamo no es una aportación personal.
- **C − B** aísla el efecto atribuible a la financiación. El saldo final no equivale necesariamente al beneficio neto (que descuenta capital inicial y aportaciones propias), y una diferencia positiva de saldo no implica por sí sola que el apalancamiento sea rentable.

| Modalidad      | TIN por defecto | Devengo | Ingreso neto            | Retención por defecto |
| -------------- | --------------: | ------- | ----------------------- | --------------------: |
| Cuenta mensual |             3 % | Diario  | Día 1 del mes siguiente |                  19 % |
| Cuenta diaria  |          2,59 % | Diario  | Día siguiente           |                  19 % |

Todos los parámetros son editables dentro de sus límites:

| Dato                                   | Mínimo |        Máximo |   Botones ± |
| -------------------------------------- | -----: | ------------: | ----------: |
| Capital inicial                        |    0 € | **200.000 €** |       100 € |
| Importe del préstamo                   |    0 € | **200.000 €** |       100 € |
| Aportación periódica compartida B/C    |    0 € |  **50.000 €** |       100 € |
| Cada aportación puntual compartida B/C |    0 € |  **50.000 €** |       100 € |
| TIN de las cuentas y el préstamo       |    0 % |         100 % | 0,01 puntos |
| Plazo del préstamo                     |  1 mes |     120 meses |       1 mes |

Los límites se aplican a los deslizadores y botones, a la escritura o pegado de valores en los campos. Un importe superior al permitido se corrige al máximo. El plazo (N) se puede configurar **de 1 a 120 meses**. **B y C comparten exactamente las mismas aportaciones periódicas y puntuales**, sin ningún ajuste independiente en C. Por defecto ingresan 500 €/mes y no hay aportaciones puntuales. A no recibe aportaciones adicionales.

## Modelo financiero: convención 30/360

La simulación usa meses artificiales de **30 días** y año de **360 días**, sin meses reales ni bisiestos. Los días se denominan `Mes 1, día 1` ... `Mes N, día 30`.

- **Día 1 del Mes 1:** ingresa capital inicial en A/B y, además, préstamo en C.
- **Día 1 de Meses 1 a N:** aportaciones periódicas y puntuales opcionales B/C; cuentan ya para el devengo de ese día.
- **Cuenta diaria:** el interés neto del día se abona ese mismo día y genera intereses desde el día siguiente.
- **Cuenta mensual:** el interés neto del mes se abona el día 30 y cuenta para el saldo desde el día 1 siguiente.
- **Día 30 de Meses 1 a N:** se cobra la cuota del préstamo de C (sistema francés, tipo periódico TIN/12), después del devengo de ese día.
- **Día 30 del Mes N:** se cierra la simulación tras la última cuota.

### Orden de procesamiento de cada día

1. Día 1: añadir aportaciones periódicas y puntuales.
2. Devengar el interés del día con el saldo resultante.
3. Abonar el interés neto (diaria: cada día; mensual: día 30).
4. Día 30: cobrar la cuota del préstamo (solo C).

Interés bruto devengado por día:

```text
interés diario bruto = max(0, saldo de la cuenta) × (TIN anual / 100) / 360
```

Cada liquidación aplica `interés bruto redondeado a céntimos`, `retención redondeada a céntimos` y el `neto = bruto - retención`. En la modalidad diaria se redondea diariamente; en la mensual se acumula el interés con precisión y se redondea al cierre del mes. Las reglas exactas de cada banco pueden variar ligeramente.

En B y C se registran las aportaciones propias en las mismas fechas. En C el banco cobra del saldo la **cuota íntegra** (capital + intereses) cada mes, y por tanto reduce los intereses que la cuenta genera a partir de ese momento.

## Detalle financiero comparativo

Una única tabla sustituye al antiguo «Detalle mensual» y a los «Movimientos día a día». Cada período muestra tres subfilas (A, B y C, con los colores del gráfico) y termina con tres filas de **Total / cierre**.

- **Columnas (orden fijo):** Período, Escenario, Saldo inicial, Aportes, Interés neto, Retención, Interés bruto, Cuota préstamo, Deuda pendiente, Saldo final, Patrimonio.
- **Agrupación:** Día, Quincena (días 1–15 y 16–fin de mes), Mes (por defecto), Trimestre, Semestre y Año. Trimestres, semestres y años se cuentan desde el inicio de la simulación.
- **Agregación:** `AgrupadorDetalle` solo suma el registro diario `dias` que devuelve el motor; no recalcula. Flujos (aportes, intereses, retención, cuota) = suma del período; saldo inicial = saldo al empezar; deuda y saldo final = valores al cerrar.
- **Intereses:** son los **abonados** en el período, así que sus sumas coinciden con los totales del motor. En la cuenta mensual, una agrupación inferior a un mes muestra 0 hasta el día de abono.
- **Patrimonio:** `saldo final + interés neto devengado pendiente de abono − deuda pendiente`. Al cierre de mes (o en la cuenta diaria) no hay interés pendiente y coincide con el patrimonio del motor.
- **Aportes:** periódicos y puntuales; el préstamo de C figura en su saldo inicial, no como aporte.
- Con agrupación por día y plazos largos la tabla tiene miles de filas.

## Cómo leer los resultados

- **Saldo disponible:** dinero efectivamente ingresado en la cuenta al cierre.
- **Patrimonio final:** `saldo disponible − deuda pendiente`.
- **Interés bruto total:** importe bruto abonado.
- **Retención total:** retención practicada.
- **Beneficio neto:** `patrimonio final − capital inicial propio − aportaciones propias`.
- **Comparativa C − B:** representa **exclusivamente el efecto del préstamo**, porque B y C tienen idénticas aportaciones y fechas.
- **Resultado atribuible al préstamo:** es exactamente **C − B**. B actúa como control sin financiación y C añade únicamente el préstamo y sus cuotas.
- **TIN máximo rentable:** el TIN del préstamo al que C iguala su control sin préstamo. Solo se muestra si se puede evaluar sin descubierto.

Si alguna cuota deja la cuenta en negativo, el simulador avisa de un **descubierto**. Las cifras se pueden consultar como estimaciones, pero no representan una operación bancariamente viable sin otra fuente de liquidez. No se incluyen intereses de descubierto, comisiones, seguros ni penalizaciones.

## Aportaciones en el panel de configuración

La sección **Aportaciones · B y C** del panel izquierdo reúne, por este orden, las aportaciones periódicas (día 1 de cada mes), el botón **Configurar aportaciones puntuales** y el editor plegable de puntuales. Ambas se aplican exactamente igual a B y C; A no recibe ninguna.

- El editor empieza **plegado**. El botón (`aria-expanded`/`aria-controls`, con chevron) lo despliega con una transición breve; plegarlo no borra ni recalcula nada, y el contenido plegado no es enfocable con teclado.
- Resumen: meses con aportación y total dentro del plazo simulado, actualizados al instante.
- Calendario por años con el importe en cada mes (verde = hay aportación). Al seleccionar un mes se edita su importe; un importe de 0 € elimina la aportación.
- **Añadir por rango:** desde el mes seleccionado hasta «Aplicar hasta», cada X meses; «Sumar» acumula y «Establecer» sustituye.
- Límites (importe por mes, botones ±, escritura, pegado) y paso de 100 € definidos en `src/config/Configuracion.ts`.
- Las aportaciones puntuales se ingresan el **día 1** del mes, igual que las periódicas. No se modifica ninguna fórmula del motor.
- La antigua sección «Aportaciones puntuales» situada bajo la tabla de detalle ya no existe.

## Confirmaciones y escenarios del detalle

- **Restablecer** y **Eliminar cuenta** piden confirmación con un modal de la aplicación (`DialogoConfirmacion`), no con el cuadro nativo del navegador. Esc, el fondo y «Cancelar» equivalen a rechazar.
- En **Detalle financiero comparativo** los botones A, B y C muestran u ocultan cada escenario en la tabla y en el CSV. Siempre queda al menos uno activo: el último no se puede desactivar.

## Panel contraído y cabecera

- Al contraer la configuración (`«`) queda una **franja vertical** con el resumen: modo de calendario, capital, préstamo, TIN del préstamo, plazo, el TIN de cada cuenta (con su color), retención, aportación periódica y puntuales (meses y total). Se actualiza con cada cambio y pulsarla expande el panel. En móvil la franja pasa a filas.
- La **cabecera** (icono, etiqueta, título y subtítulo) queda fija arriba y se compacta al desplazarse (más de 70 px; vuelve a expandirse por debajo de 10 px): solo icono y título, en una línea y con puntos suspensivos si no cabe, con borde y sombra. Al imprimir se muestra completa, sin icono y sin posición fija.
- En los resultados, **«Qué se está comparando»** explica A, B y C con texto estático (sin importes). No se imprime.
- El **pie de página** ocupa todo el ancho: indica que son estimaciones sin garantía de rentabilidad y que no incluyen comisiones, seguros, penalizaciones, cambios de tipos ni límites de remuneración, y que la retención puede no coincidir con la tributación definitiva.
- Esta revisión es solo de presentación: los cálculos financieros no se han modificado.

## Estructura del proyecto

```text
├── index.html                    # Shell: <div id="app"> + main.ts
├── src/
│   ├── main.ts                   # Punto de entrada
│   ├── config/                   # CONFIG (valores y límites) y su modelo tipado
│   ├── core/                     # CÁLCULO (sin DOM)
│   │   ├── dto/                  # DTOs y tipos: calendario, cuenta, escenario, estado, resultado, agrupacion
│   │   ├── calculo/              # SimuladorFinanciero, AgrupadorDetalle, calendario, plazo, préstamo
│   │   └── log/                  # Logger (debug en dev, warn en producción)
│   ├── ui/                       # REPRESENTACIÓN
│   │   ├── app/                  # Aplicacion (composición) y estado
│   │   ├── componentes/          # Plantillas reutilizables y comportamientos (colapsable, diálogo, stepper)
│   │   ├── secciones/            # HTML de cada sección de la página
│   │   ├── controladores/        # Eventos del formulario, cuentas, puntuales, panel y detalle
│   │   ├── presentadores/        # Pintan resultados, detalle y franja
│   │   └── graficos/             # Gráficos Canvas
│   ├── services/                 # Exportación CSV y descarga
│   └── styles/                   # Tailwind: tema, base, componentes, impresión
├── tests/                        # Vitest, con la misma estructura que src/
└── .github/workflows/deploy.yml  # Despliegue a GitHub Pages
```

La arquitectura, las convenciones y las reglas de calidad están en `CLAUDE.md`.

## Exportar e imprimir

- **CSV del detalle:** replica la tabla «Detalle financiero comparativo» (modalidad y agrupación elegidas): tres filas A/B/C por período más tres filas de total / cierre.
- **Imprimir / PDF:** botón que abre el diálogo de impresión del navegador.

## Pruebas automáticas

```sh
npm test
```

Vitest ejecuta las pruebas del motor financiero, del logger, de la exportación CSV y de la interfaz (happy-dom). Las pruebas incluyen la consistencia de la agrupación (seis niveles × ambas cuentas × ambos calendarios), sincronización B/C, 30/360, abono mensual el día 30, devengo y reinversión diaria, aportaciones día 1, cuota del día 30, cierre tras N cuotas, retención, aportaciones y conciliación de patrimonio.

## Límites de precisión y alcance

El modelo usa una retención fija (19 % por defecto), TIN constantes, remuneración de todo saldo positivo, y un préstamo sin gastos adicionales. El saldo negativo no genera intereses a favor del cliente. **No equivale necesariamente al contrato real de las entidades**, al cálculo de la TAE ni a la cuota fiscal definitiva en el IRPF.
