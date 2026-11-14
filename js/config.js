/* Configuración centralizada: único sitio donde se editan valores predeterminados, límites y constantes.
 * Se carga antes que el resto de módulos (browser: window.SimuladorConfig; tests: contexto VM). */
(function (global) {
  'use strict';
  const f = Object.freeze;
  global.SimuladorConfig = f({
    // Campos numéricos del formulario: valor inicial, rango del campo y del deslizador, paso.
    campos: f({
      capital: { valor: 25000, min: 0, max: 200000, step: 100, rangeMax: 200000 },
      prestamo: { valor: 50000, min: 0, max: 200000, step: 100, rangeMax: 200000 },
      tinPrestamo: { valor: 6, min: 0, max: 100, step: 0.01, rangeMax: 15 },
      meses: { valor: 12, min: 1, max: 120, step: 1, rangeMax: 120 },
      retencion: { valor: 19, min: 0, max: 100, step: 0.5, rangeMax: 100 },
      periodicaB: { valor: 500, min: 0, max: 50000, step: 100, rangeMax: 50000 },
    }),
    // Aportaciones puntuales (una por mes, compartidas por B y C).
    puntual: f({ max: 50000, step: 100 }),
    // Cuentas remuneradas. calculo: diario|mensual|anual; metodo (solo si calculo != diario): medio|cierre;
    // ingreso: diario|mensual|anual (nunca más frecuente que el cálculo). Los ids son estables ([A-Za-z0-9_]).
    cuentas: f({
      max: 6,
      maxLength: 30,
      tin: f({ min: 0, max: 100, step: 0.01, rangeMax: 15, valor: 2 }),
      lista: f([
        f({
          id: 'mensual',
          nombre: '',
          tin: 2.5,
          calculo: 'diario',
          metodo: 'medio',
          ingreso: 'mensual',
        }),
        f({
          id: 'diario',
          nombre: '',
          tin: 1.15,
          calculo: 'diario',
          metodo: 'medio',
          ingreso: 'diario',
        }),
      ]),
    }),
    // Calendario 30/360 y real. El mes de inicio real va del año actual hasta el actual + aniosAdelante (por defecto: mes actual).
    calendario: f({
      diasMes: 30,
      diasAnio: 360,
      diasAnioReal: 365,
      diasAnioBisiesto: 366,
      mesesAnio: 12,
      aniosAdelante: 5,
      modo: 'real', // '30360' | 'real' (modo de cálculo por defecto)
      mesInicio: null, // 1–12; null = mes actual
      anioInicio: null, // año actual … actual + aniosAdelante; null = año actual
      mesesCorto: f([
        'ene',
        'feb',
        'mar',
        'abr',
        'may',
        'jun',
        'jul',
        'ago',
        'sep',
        'oct',
        'nov',
        'dic',
      ]),
      mesesLargo: f([
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ]),
    }),
    // Búsqueda binaria del TIN máximo rentable.
    umbral: f({ min: 0, max: 50, iteraciones: 50, tolerancia: 0.005 }),
    // Redondeo y formato numérico. cero: por debajo se muestra/considera 0 (también el saldo negativo tolerado).
    formato: f({
      locale: 'es-ES',
      moneda: 'EUR',
      decimales: 2,
      decimalesPct: 3,
      decimalesPctCorto: 2,
      cero: 0.005,
      compactoDecimales: 1,
    }),
    // Agrupación del detalle: último día de la 1ª quincena y meses por bloque.
    agrupacion: f({ diaQuincena: 15, mesesBloque: f({ trimestre: 3, semestre: 6, anio: 12 }) }),
    // Interfaz: temporizaciones, columnas de la rejilla de meses, cabecera compacta (histéresis en px) y textos cortos.
    ui: f({
      debounceMs: 40,
      descargaMs: 1200,
      columnasMes: 6,
      nombreCortoStrip: 8,
      cabeceraCompactaY: 70,
      cabeceraExpandeY: 10,
    }),
    // Gráfico de patrimonio: color por cuenta (tono) y escenario (luminosidad), trazos y márgenes.
    grafico: f({
      tonos: f([168, 215, 35, 340, 270, 95]),
      saturacion: 62,
      luz: f({ A: 30, B: 44, C: 58 }),
      trazo: f({ diario: f([7, 5]), mensual: f([]), anual: f([2, 4]) }),
      guia: f([4, 4]),
      grosor: 2.7,
      radioPunto: 4.3,
      ratioMax: 2,
      anchoMovil: 520,
      minLado: 20,
      margen: f({ izqMovil: 52, izq: 74, der: 13, arriba: 15, abajo: 35 }),
      divisionesY: 4,
      etiquetasX: f({ movil: 6, normal: 12 }),
      holguraInf: 0.15,
      holguraSup: 0.12,
      spanMin: 1000,
      colores: f({
        texto: '#788aa0',
        textoX: '#8190a5',
        rejilla: '#e8edf4',
        guia: '#aebdce',
        punto: 'white',
        interesNeto: '#058775',
        interesPrestamo: '#ac711f',
      }),
    }),
  });
})(window);
