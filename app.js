/*
 * SuscriOFF — modelo de datos y persistencia local de suscripciones.
 *
 * Responsabilidades:
 * - Normalizar/validar el modelo de una suscripción.
 * - Guardar y cargar las suscripciones en localStorage (solo datos ficticios).
 * - Calcular días restantes hasta la fecha de fin.
 * - Sumar el gasto mensual en riesgo de las pruebas activas.
 * - Cargar las suscripciones de ejemplo solo la primera vez que se abre la app.
 */

'use strict';

const STORAGE_KEY = 'suscrioff.suscripciones.v1';

const ESTADOS = Object.freeze({
  ACTIVA: 'activa',
  CANCELADA: 'cancelada',
});

/*
 * Modelo de una suscripción:
 * {
 *   servicio: string,          // Ej. "Spotify Premium"
 *   precioMensual: number,     // Valor en COP
 *   fechaFin: string,          // AAAA-MM-DD
 *   enlaceCancelacion: string, // URL ficticia para cancelar
 *   beneficios: string[],      // Lista de beneficios de la prueba
 *   estado: 'activa' | 'cancelada'
 * }
 */

const SUSCRIPCIONES_EJEMPLO = [
  {
    servicio: 'Spotify Premium',
    precioMensual: 16900,
    fechaFin: '2026-11-24',
    enlaceCancelacion: 'https://spotify.example/cancelar',
    beneficios: ['Música sin anuncios', 'Descargas sin conexión', 'Calidad de audio alta'],
    estado: ESTADOS.ACTIVA,
  },
  {
    servicio: 'YouTube Premium',
    precioMensual: 21900,
    fechaFin: '2026-11-28',
    enlaceCancelacion: 'https://youtube.example/cancelar',
    beneficios: ['Videos sin anuncios', 'YouTube Music incluido', 'Descargas offline'],
    estado: ESTADOS.ACTIVA,
  },
  {
    servicio: 'Amazon Prime',
    precioMensual: 17900,
    fechaFin: '2026-12-05',
    enlaceCancelacion: 'https://amazon.example/cancelar',
    beneficios: ['Envíos gratis', 'Prime Video', 'Ofertas exclusivas'],
    estado: ESTADOS.ACTIVA,
  },
];

/* ---------- Validación y modelo ---------- */

function textoObligatorio(valor, nombreCampo) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new TypeError(`${nombreCampo} debe ser un texto no vacío.`);
  }
  return valor.trim();
}

function precioValido(valor) {
  const precio = Number(valor);
  if (!Number.isFinite(precio) || precio < 0) {
    throw new TypeError('precioMensual debe ser un número mayor o igual a cero.');
  }
  return Math.round(precio * 100) / 100;
}

function fechaFinValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new TypeError('fechaFin debe tener el formato AAAA-MM-DD.');
  }

  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const esFechaReal =
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia;

  if (!esFechaReal) {
    throw new TypeError('fechaFin no es una fecha válida.');
  }
  return valor;
}

function beneficiosValidos(valor) {
  if (!Array.isArray(valor)) {
    throw new TypeError('beneficios debe ser una lista de textos.');
  }
  return valor
    .filter((beneficio) => typeof beneficio === 'string' && beneficio.trim() !== '')
    .map((beneficio) => beneficio.trim());
}

function estadoValido(valor) {
  if (!Object.values(ESTADOS).includes(valor)) {
    throw new TypeError(`estado debe ser "${ESTADOS.ACTIVA}" o "${ESTADOS.CANCELADA}".`);
  }
  return valor;
}

function normalizarSuscripcion(datos) {
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new TypeError('La suscripción debe ser un objeto.');
  }

  return {
    servicio: textoObligatorio(datos.servicio, 'servicio'),
    precioMensual: precioValido(datos.precioMensual),
    fechaFin: fechaFinValida(datos.fechaFin),
    enlaceCancelacion: textoObligatorio(datos.enlaceCancelacion, 'enlaceCancelacion'),
    beneficios: beneficiosValidos(datos.beneficios === undefined ? [] : datos.beneficios),
    estado: estadoValido(datos.estado),
  };
}

function crearSuscripcion(datos) {
  return normalizarSuscripcion(datos);
}

/* ---------- Persistencia en localStorage ---------- */

function leerAlmacen() {
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('No se pudo acceder a localStorage.', error);
    return null;
  }
}

function guardarSuscripciones(suscripciones) {
  if (!Array.isArray(suscripciones)) {
    throw new TypeError('guardarSuscripciones espera una lista de suscripciones.');
  }

  const normalizadas = suscripciones.map(normalizarSuscripcion);
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizadas));
    return true;
  } catch (error) {
    console.warn('No se pudieron guardar las suscripciones.', error);
    return false;
  }
}

function cargarSuscripciones() {
  const crudo = leerAlmacen();
  if (crudo === null) return [];

  try {
    const datos = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    return datos.flatMap((suscripcion) => {
      try {
        return [normalizarSuscripcion(suscripcion)];
      } catch (error) {
        console.warn('Se ignoró una suscripción guardada con datos inválidos.', error);
        return [];
      }
    });
  } catch (error) {
    console.warn('No se pudieron leer las suscripciones guardadas.', error);
    return [];
  }
}

// Siembra los datos ficticios únicamente cuando aún no existe información guardada.
function cargarSuscripcionesIniciales() {
  if (leerAlmacen() !== null) {
    return cargarSuscripciones();
  }

  guardarSuscripciones(SUSCRIPCIONES_EJEMPLO);
  return SUSCRIPCIONES_EJEMPLO.map(normalizarSuscripcion);
}

/* ---------- Cálculos ---------- */

// Devuelve días enteros: positivos si faltan, 0 si vence hoy, negativos si ya venció.
function diasRestantes(suscripcion, hoy = new Date()) {
  const fechaFin = typeof suscripcion === 'string' ? suscripcion : suscripcion.fechaFin;
  fechaFinValida(fechaFin);

  const fin = Date.parse(`${fechaFin}T00:00:00Z`);
  const inicio = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fin - inicio) / 86400000);
}

// Suma el precio mensual de las pruebas en estado "activa".
function gastoMensualEnRiesgo(suscripciones) {
  if (!Array.isArray(suscripciones)) {
    throw new TypeError('gastoMensualEnRiesgo espera una lista de suscripciones.');
  }

  return suscripciones
    .filter((suscripcion) => suscripcion.estado === ESTADOS.ACTIVA)
    .reduce((total, suscripcion) => total + suscripcion.precioMensual, 0);
}

/* ---------- Vista (estructura existente en index.html) ---------- */

function crearElemento(etiqueta, texto, clase) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function formatearCOP(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

function renderizarSuscripciones(suscripciones) {
  const resumen = document.querySelector('.summary');
  const lista = document.querySelector('.trial-list');
  if (!resumen || !lista) return;

  const activas = suscripciones.filter((suscripcion) => suscripcion.estado === ESTADOS.ACTIVA);
  const total = gastoMensualEnRiesgo(suscripciones);
  const plural = activas.length === 1 ? 'prueba activa' : 'pruebas activas';

  resumen.replaceChildren(
    crearElemento(
      'p',
      `${activas.length} ${plural} · ${formatearCOP(total)} al mes en riesgo`,
    ),
  );

  lista.replaceChildren();
  if (suscripciones.length === 0) {
    lista.append(crearElemento('li', 'No hay suscripciones registradas.', 'empty-state'));
    return;
  }

  suscripciones.forEach((suscripcion) => {
    const item = crearElemento('li', undefined, 'trial-card');
    const cabecera = crearElemento('div', undefined, 'trial-card__head');
    cabecera.append(
      crearElemento('h3', suscripcion.servicio, 'trial-card__title'),
      crearElemento('span', suscripcion.estado, 'trial-card__status'),
    );

    const dias = diasRestantes(suscripcion);
    const vencimiento = dias < 0 ? `venció hace ${Math.abs(dias)} días` : `${dias} días restantes`;
    const detalles = crearElemento(
      'p',
      `${formatearCOP(suscripcion.precioMensual)}/mes · ${vencimiento} · Fin: ${suscripcion.fechaFin}`,
      'trial-card__meta',
    );

    const beneficios = crearElemento('ul', undefined, 'trial-card__benefits');
    suscripcion.beneficios.forEach((beneficio) => {
      beneficios.append(crearElemento('li', beneficio));
    });

    const enlace = crearElemento('a', 'Enlace de cancelación', 'trial-card__link');
    enlace.href = suscripcion.enlaceCancelacion;
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';

    item.append(cabecera, detalles, beneficios, enlace);
    lista.append(item);
  });
}

function iniciar() {
  renderizarSuscripciones(cargarSuscripcionesIniciales());
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', iniciar);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEY,
    ESTADOS,
    SUSCRIPCIONES_EJEMPLO,
    crearSuscripcion,
    guardarSuscripciones,
    cargarSuscripciones,
    cargarSuscripcionesIniciales,
    diasRestantes,
    gastoMensualEnRiesgo,
  };
}
