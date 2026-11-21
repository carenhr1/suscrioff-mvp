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

// Texto corto de vencimiento que se muestra en cada fila de la lista.
function etiquetaVencimiento(dias) {
  if (dias === 1) return 'Termina mañana';
  if (dias === 0) return 'Termina hoy';
  if (dias < 0) return `Terminó hace ${Math.abs(dias)} días`;
  return `Termina en ${dias} días`;
}

function renderizarSuscripciones(suscripciones) {
  const resumen = document.querySelector('.summary');
  const lista = document.querySelector('.trial-list');
  if (!resumen || !lista) return;

  const activas = suscripciones.filter((suscripcion) => suscripcion.estado === ESTADOS.ACTIVA);
  const total = gastoMensualEnRiesgo(suscripciones);
  const plural = activas.length === 1 ? 'prueba activa' : 'pruebas activas';

  resumen.replaceChildren(
    crearElemento('p', 'Gasto mensual en riesgo', 'summary__label'),
    crearElemento('p', formatearCOP(total), 'summary__amount'),
    crearElemento('p', `${activas.length} ${plural}`, 'summary__count'),
  );

  lista.replaceChildren();
  if (activas.length === 0) {
    lista.append(crearElemento('li', 'No hay pruebas activas registradas.', 'empty-state'));
    return;
  }

  // Las fechas AAAA-MM-DD se ordenan correctamente como texto.
  const ordenadas = activas.slice().sort((a, b) => a.fechaFin.localeCompare(b.fechaFin));

  ordenadas.forEach((suscripcion, indice) => {
    const item = crearElemento('li', undefined, 'trial-row');

    const info = crearElemento('div', undefined, 'trial-row__info');
    info.append(
      crearElemento('h3', suscripcion.servicio, 'trial-row__service'),
      crearElemento('p', `${formatearCOP(suscripcion.precioMensual)}/mes`, 'trial-row__price'),
      crearElemento('span', etiquetaVencimiento(diasRestantes(suscripcion)), 'trial-row__label'),
    );

    const detallesId = `detalles-prueba-${indice}`;
    const ver = crearElemento('button', 'Ver', 'button button--ver');
    ver.type = 'button';
    ver.setAttribute('aria-label', `Ver detalles de ${suscripcion.servicio}`);
    ver.setAttribute('aria-expanded', 'false');
    ver.setAttribute('aria-controls', detallesId);

    const detalles = crearElemento('div', undefined, 'trial-row__details');
    detalles.id = detallesId;
    detalles.hidden = true;

    const beneficios = crearElemento('ul', undefined, 'trial-row__benefits');
    suscripcion.beneficios.forEach((beneficio) => {
      beneficios.append(crearElemento('li', beneficio));
    });

    const enlace = crearElemento('a', 'Enlace de cancelación', 'trial-row__link');
    enlace.href = suscripcion.enlaceCancelacion;
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';

    detalles.append(
      crearElemento('p', `Fecha de fin: ${suscripcion.fechaFin}`, 'trial-row__meta'),
      beneficios,
      enlace,
    );

    ver.addEventListener('click', () => {
      const abierto = ver.getAttribute('aria-expanded') === 'true';
      ver.setAttribute('aria-expanded', String(!abierto));
      detalles.hidden = abierto;
    });

    item.append(info, ver, detalles);
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
