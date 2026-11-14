# Simulador de ahorro y apalancamiento · 6 escenarios

Aplicación web estática para PC o móvil, **sin servidor, sin dependencias npm y sin servicios externos**. Mantiene HTML, CSS y JavaScript separados, con un motor financiero independiente de la interfaz.

## Cómo abrirlo

1. Descomprime `simulador-ahorro-apalancamiento-6-escenarios.zip`.
2. Abre `simulador-ahorro-apalancamiento/index.html` en Chrome, Edge, Firefox o Safari.
3. Modifica los importes o el plazo y consulta las seis simulaciones. Las cifras se recalculan automáticamente.

**Nota para iPhone:** las vistas previas de Archivos pueden no ejecutar los scripts. Si necesitas utilizarlo desde Safari, publica la carpeta como sitio estático en GitHub Pages, GitLab Pages u otro alojamiento web. En PC se puede abrir directamente por `file://`.

## Escenarios

| Escenario | Capital inicial | Préstamo | Aporte periódico | Aporte puntual |
|---|---:|---:|---|---|
| A · Solo ahorro | 25.000 € | — | No | No |
| B · Ahorro con aportaciones | 25.000 € | — | Configurable; día 1 de cada mes | Configurable; día 1 |
| C · Ahorro financiado | 25.000 € | 50.000 € al 6 % TIN | **Igual que B**; día 1 | **Igual que B**; día 1 |

Ambos productos de cuenta se aplican de forma independiente a A, B y C: **3 × 2 = 6 simulaciones**.

| Modalidad | TIN por defecto | Devengo | Ingreso neto | Retención por defecto |
|---|---:|---|---|---:|
| Cuenta mensual | 3 % | Diario | Día 1 del mes siguiente | 19 % |
| Cuenta diaria | 2,59 % | Diario | Día siguiente | 19 % |

Todos los parámetros son editables dentro de sus límites:

| Dato | Mínimo | Máximo | Botones ± |
|---|---:|---:|---:|
| Capital inicial | 0 € | **200.000 €** | 100 € |
| Importe del préstamo | 0 € | **200.000 €** | 100 € |
| Aportación periódica compartida B/C | 0 € | **50.000 €** | 100 € |
| Cada aportación puntual compartida B/C | 0 € | **50.000 €** | 100 € |
| TIN de las cuentas y el préstamo | 0 % | 100 % | 0,01 puntos |
| Plazo del préstamo | 1 mes | 120 meses | 1 mes |

Los límites se aplican a los deslizadores y botones, a la escritura o pegado de valores en los campos, y a la validación de escenarios importados desde JSON. Un importe superior al permitido se corrige al máximo desde la interfaz y se rechaza en una importación JSON. El plazo (N) se puede configurar **de 1 a 120 meses**. **B y C comparten exactamente las mismas aportaciones periódicas y puntuales**, sin ningún ajuste independiente en C. Por defecto ingresan 500 €/mes y no hay aportaciones puntuales. A no recibe aportaciones adicionales.

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
- **Agregación:** `js/core/agrupacion.js` solo suma el registro diario `dias` que devuelve el motor; no recalcula. Flujos (aportes, intereses, retención, cuota) = suma del período; saldo inicial = saldo al empezar; deuda y saldo final = valores al cerrar.
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

## Estructura del proyecto

```text
simulador-ahorro-apalancamiento/
├── index.html                   # Interfaz y estructura semántica
├── css/
│   ├── base.css                 # Tipografía, tokens de diseño, normalización
│   ├── componentes.css          # Formulario, matriz, tarjetas, tabla, gráfico
│   └── responsive.css           # Diseño móvil y estilos de impresión
├── js/
│   ├── core/
│   │   ├── estado.js            # Valores por defecto, validación y formato
│   │   ├── calculos.js          # Motor puro, secuencia diaria, amortización, umbrales
│   │   └── agrupacion.js        # Agrupación temporal del detalle (suma el registro diario)
│   ├── ui/
│   │   ├── controles.js         # Controles, inputs, aportaciones mes a mes
│   │   ├── resultados.js        # Renderizado de seis resultados, detalle comparativo, comparativas
│   │   └── grafico.js           # Gráfica Canvas interactiva
│   ├── services/
│   │   └── archivos.js          # CSV del detalle, JSON y escenarios locales
│   └── inicio.js                # Inicialización de módulos
├── tests/
│   └── calculos.test.cjs        # Pruebas de regresión del motor financiero
└── README.md
```

Los archivos JS usan el espacio compartido `window.Simulador`, mediante scripts clásicos cargados con `defer` y rutas relativas; por tanto, se ejecutan sin backend y sin bundler.

## Compatibilidad con versiones anteriores

Al importar un JSON de la versión anterior que incluya `periodicaC` y `puntualesC` independientes, **se ignoran esos dos campos**. El escenario C siempre usa `periodicaB` y `puntualesB`. Se conserva la clave de almacenamiento local existente para permitir cargar escenarios guardados en la versión anterior, aplicando automáticamente la nueva regla al cargarlos.

## Guardar, importar y exportar

- **CSV del detalle:** replica la tabla «Detalle financiero comparativo» (modalidad y agrupación elegidas): tres filas A/B/C por período más tres filas de total / cierre.
- **JSON:** configuración completa, incluidos los importes puntuales por mes.
- **Escenarios guardados:** usa `localStorage` del navegador. Si el almacenamiento local no está permitido (por ejemplo, `file://` bajo algunos navegadores), se recomienda usar Exportar JSON.
- **Imprimir / PDF:** botón que abre el diálogo de impresión del navegador.

## Pruebas automáticas

Opcionalmente, con **Node.js 18+** desde la carpeta raíz del proyecto:

```sh
node --test tests/calculos.test.cjs
```

Las pruebas incluyen la consistencia de la agrupación (seis niveles × ambas cuentas × ambos calendarios), límites de importación, sincronización B/C, 30/360, abono mensual el día 30, devengo y reinversión diaria, aportaciones día 1, cuota del día 30, cierre tras N cuotas, retención, aportaciones y conciliación de patrimonio.

## Límites de precisión y alcance

El modelo usa una retención fija (19 % por defecto), TIN constantes, remuneración de todo saldo positivo, y un préstamo sin gastos adicionales. El saldo negativo no genera intereses a favor del cliente. **No equivale necesariamente al contrato real de las entidades**, al cálculo de la TAE ni a la cuota fiscal definitiva en el IRPF.
