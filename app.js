/*
 * SuscriOFF — datos, cálculos y navegación de la app (HTML, CSS y JS puros).
 * Todo se guarda en localStorage; no hay backend, pagos ni envío de datos.
 */

'use strict';

const STORAGE_KEY = 'suscrioff.pruebas.v1';
const AVISOS_KEY = 'suscrioff.avisos.v1';
const DIAS_ANTES = 2;
const HORA_AVISO = '9:00 a. m.';

let pruebas = [];
let avisos = [];
let pruebaActualId = null;
let avisoActualId = null;

/* Servicios reconocidos al escanear texto (nombre canónico y enlace ficticio). */
const SERVICIOS_CONOCIDOS = [
  { patron: /spotify/i, nombre: 'Spotify Premium', enlace: 'https://spotify.example/cancelar' },
  { patron: /youtube/i, nombre: 'YouTube Premium', enlace: 'https://youtube.example/cancelar' },
  { patron: /amazon|prime video/i, nombre: 'Amazon Prime', enlace: 'https://amazon.example/cancelar' },
  { patron: /netflix/i, nombre: 'Netflix', enlace: 'https://netflix.example/cancelar' },
  { patron: /disney/i, nombre: 'Disney+', enlace: 'https://disney.example/cancelar' },
  { patron: /apple music|apple tv/i, nombre: 'Apple Music', enlace: 'https://apple.example/cancelar' },
];

const BENEFICIOS_POR_DEFECTO = [
  'Acceso a la prueba gratuita',
  'Sin cargos durante la prueba',
];

/* ---------- Fechas y formatos ---------- */

function fechaDeHoy() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
}

function aISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function deISO(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function sumarDias(iso, cantidad) {
  const fecha = deISO(iso);
  fecha.setDate(fecha.getDate() + cantidad);
  return aISO(fecha);
}

function díasRestantes(iso) {
  const fin = deISO(iso).getTime();
  const hoy = fechaDeHoy().getTime();
  return Math.round((fin - hoy) / 86400000);
}

function formatearFecha(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

function fechaDesdeTexto(texto) {
  const coincidencia = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!coincidencia) return '';
  const [, dia, mes, anio] = coincidencia.map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return '';
  }
  return aISO(fecha);
}

function formatearPeso(valor) {
  const numero = Number(valor) || 0;
  return `$ ${numero.toLocaleString('es-CO')}`;
}

/* ---------- Modelo y persistencia ---------- */

function nuevoId() {
  if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizarPrueba(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new TypeError('La prueba debe ser un objeto.');
  }
  const nombre = typeof datos.servicio === 'string' ? datos.servicio.trim() : '';
  if (!nombre) throw new TypeError('El servicio es obligatorio.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaFin || '')) {
    throw new TypeError('La fecha de fin debe tener formato AAAA-MM-DD.');
  }

  return {
    id: datos.id || nuevoId(),
    servicio: nombre,
    precioMensual: Math.max(0, Math.round(Number(datos.precioMensual) || 0)),
    fechaFin: datos.fechaFin,
    enlaceCancelacion: typeof datos.enlaceCancelacion === 'string' ? datos.enlaceCancelacion.trim() : '',
    beneficios: Array.isArray(datos.beneficios) && datos.beneficios.length
      ? datos.beneficios.filter(Boolean)
      : BENEFICIOS_POR_DEFECTO.slice(),
    estado: datos.estado === 'cancelada' ? 'cancelada' : 'activa',
    avisoActivo: Boolean(datos.avisoActivo),
  };
}

function leerClave(clave) {
  try {
    return localStorage.getItem(clave);
  } catch (error) {
    console.warn('No se pudo leer localStorage.', error);
    return null;
  }
}

function escribirClave(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (error) {
    console.warn('No se pudo guardar en localStorage.', error);
  }
}

function cargarPruebas() {
  const crudo = leerClave(STORAGE_KEY);
  if (crudo === null) return null;
  try {
    const datos = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    return datos.flatMap((item) => {
      try {
        return [normalizarPrueba(item)];
      } catch (error) {
        console.warn('Se ignoró una prueba guardada con datos inválidos.', error);
        return [];
      }
    });
  } catch (error) {
    console.warn('No se pudieron leer las pruebas guardadas.', error);
    return [];
  }
}

function guardarPruebas() {
  escribirClave(STORAGE_KEY, pruebas);
}

function cargarAvisos() {
  const crudo = leerClave(AVISOS_KEY);
  if (!crudo) return [];
  try {
    const datos = JSON.parse(crudo);
    return Array.isArray(datos) ? datos : [];
  } catch (error) {
    console.warn('No se pudieron leer los avisos guardados.', error);
    return [];
  }
}

function guardarAvisos() {
  escribirClave(AVISOS_KEY, avisos);
}

// Primera carga: tres pruebas ficticias con fechas relativas a hoy.
function cargarDatosIniciales() {
  const guardadas = cargarPruebas();
  if (guardadas !== null) {
    pruebas = guardadas;
  } else {
    const hoy = aISO(fechaDeHoy());
    const ejemplo = [
      {
        servicio: 'Spotify Premium',
        precioMensual: 19900,
        fechaFin: sumarDias(hoy, 1),
        enlaceCancelacion: 'https://spotify.example/cancelar',
        beneficios: ['Música sin anuncios', 'Descargas sin conexión'],
      },
      {
        servicio: 'YouTube Premium',
        precioMensual: 24900,
        fechaFin: sumarDias(hoy, 7),
        enlaceCancelacion: 'https://youtube.example/cancelar',
        beneficios: ['Videos sin anuncios', 'Funciona en segundo plano'],
      },
      {
        servicio: 'Amazon Prime',
        precioMensual: 16900,
        fechaFin: sumarDias(hoy, 12),
        enlaceCancelacion: 'https://amazon.example/cancelar',
        beneficios: ['Envíos gratis', 'Prime Video'],
      },
    ];
    pruebas = ejemplo.map(normalizarPrueba);
    guardarPruebas();
  }
  avisos = cargarAvisos();
}

function pruebasActivas() {
  return pruebas.filter((prueba) => prueba.estado === 'activa');
}

function buscarPrueba(id) {
  return pruebas.find((prueba) => prueba.id === id) || null;
}

function totalEnRiesgo() {
  return pruebasActivas().reduce((total, prueba) => total + prueba.precioMensual, 0);
}

/* ---------- Navegación ---------- */

const PANTALLAS = ['inicio', 'nueva', 'detalle', 'confirmacion', 'calendario'];

function mostrarPantalla(nombre) {
  if (!PANTALLAS.includes(nombre)) return;
  PANTALLAS.forEach((id) => {
    const section = document.getElementById(`screen-${id}`);
    if (section) section.hidden = id !== nombre;
  });
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.destino === nombre);
  });
  window.scrollTo(0, 0);
}

/* ---------- Pantalla 1: Inicio ---------- */

function etiquetaVencimiento(días) {
  if (días === 1) return { texto: 'Termina mañana', clase: 'tag--urgente' };
  if (días === 0) return { texto: 'Termina hoy', clase: 'tag--urgente' };
  if (días < 0) return { texto: 'Vencida', clase: 'tag--vencida' };
  return { texto: `Termina en ${días} días`, clase: '' };
}

function crearTarjeta(prueba) {
  const li = document.createElement('li');
  li.className = 'trial-card';

  const principal = document.createElement('button');
  principal.type = 'button';
  principal.className = 'trial-card__main';
  principal.dataset.abrir = prueba.id;
  principal.setAttribute('aria-label', `Ver detalles de ${prueba.servicio}`);

  const avatar = document.createElement('span');
  avatar.className = 'trial-card__avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = prueba.servicio.trim().charAt(0).toUpperCase();

  const info = document.createElement('span');
  info.className = 'trial-card__info';
  const nombre = document.createElement('span');
  nombre.className = 'trial-card__name';
  nombre.textContent = prueba.servicio;
  const precio = document.createElement('span');
  precio.className = 'trial-card__price';
  precio.textContent = `${formatearPeso(prueba.precioMensual)}/mes`;
  info.append(nombre, precio);
  principal.append(avatar, info);

  const pie = document.createElement('div');
  pie.className = 'trial-card__footer';
  const etiqueta = etiquetaVencimiento(díasRestantes(prueba.fechaFin));
  const tag = document.createElement('span');
  tag.className = `tag ${etiqueta.clase}`.trim();
  tag.textContent = etiqueta.texto;

  const ver = document.createElement('button');
  ver.type = 'button';
  ver.className = 'button button--secondary button--small';
  ver.dataset.abrir = prueba.id;
  ver.textContent = 'Ver';
  pie.append(tag, ver);

  li.append(principal, pie);
  return li;
}

function renderizarInicio() {
  const activas = pruebasActivas();
  document.getElementById('gasto-total').textContent = `${formatearPeso(totalEnRiesgo())} COP`;
  document.getElementById('gasto-count').textContent =
    `${activas.length} ${activas.length === 1 ? 'prueba gratuita activa' : 'pruebas gratuitas activas'}`;

  const lista = document.getElementById('lista-pruebas');
  lista.replaceChildren();

  if (activas.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'empty-state';
    vacio.textContent = 'No tienes pruebas activas. Agrega una para llevar el control.';
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'button button--wide';
    boton.dataset.destino = 'nueva';
    boton.textContent = 'Agregar prueba';
    vacio.append(document.createElement('br'), boton);
    lista.append(vacio);
    return;
  }

  // Orden por proximidad: primero la que vence antes.
  activas
    .slice()
    .sort((a, b) => a.fechaFin.localeCompare(b.fechaFin))
    .forEach((prueba) => lista.append(crearTarjeta(prueba)));
}

/* ---------- Calendario: avisos creados ---------- */

function renderizarCalendario() {
  const lista = document.getElementById('lista-avisos');
  if (!lista) return;
  lista.replaceChildren();
  if (avisos.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'empty-state';
    vacio.textContent = 'Todavía no hay avisos creados.';
    lista.append(vacio);
    return;
  }
  avisos.slice().reverse().forEach((aviso) => {
    const li = document.createElement('li');
    const fecha = document.createElement('strong');
    fecha.textContent = `${formatearFecha(aviso.fechaAviso)} · ${aviso.servicio}`;
    const detalle = document.createElement('div');
    detalle.textContent = `Aviso para cancelar antes del ${formatearFecha(aviso.fechaFin)}`;
    li.append(fecha, detalle);
    lista.append(li);
  });
}

/* ---------- Eventos y arranque ---------- */

function abrirDetalle(id) {
  const prueba = buscarPrueba(id);
  if (!prueba) return;
  pruebaActualId = id;
  mostrarPantalla('detalle');
}

function iniciar() {
  cargarDatosIniciales();
  renderizarInicio();
  renderizarCalendario();

  document.getElementById('btn-agregar').addEventListener('click', () => mostrarPantalla('nueva'));

  document.addEventListener('click', (evento) => {
    const destino = evento.target.closest('[data-destino]');
    if (destino) {
      mostrarPantalla(destino.dataset.destino);
      return;
    }
    const abrir = evento.target.closest('[data-abrir]');
    if (abrir) abrirDetalle(abrir.dataset.abrir);
  });
}

document.addEventListener('DOMContentLoaded', iniciar);
