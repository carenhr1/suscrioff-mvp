/*
 * SuscriOFF — datos, cálculos y navegación de la app (HTML, CSS y JS puros).
 * Todo se guarda en localStorage; no hay backend, pagos ni envío de datos.
 */

'use strict';

const STORAGE_KEY = 'suscrioff.pruebas.v1';
const AVISOS_KEY = 'suscrioff.avisos.v1';
const DIAS_ANTES = 2;
const HORA_AVISO = '9:00 a. m';

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
  // Al volver al inicio se refresca el resumen por si cambió una prueba.
  if (nombre === 'inicio') renderizarInicio();
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

/* ---------- Pantalla 2: escaneo y formulario ---------- */

// Extrae fecha, precio, enlace y servicio con expresiones regulares sencillas.
function detectarDatos(texto) {
  const resultado = { servicio: '', fechaFin: '', precioMensual: 0, enlaceCancelacion: '' };

  const fechaTexto = /(\d{2}\/\d{2}\/\d{4})/.exec(texto);
  if (fechaTexto) resultado.fechaFin = fechaDesdeTexto(fechaTexto[1]);

  const precioTexto = /\$\s*([\d.,]+)/.exec(texto);
  if (precioTexto) {
    resultado.precioMensual = Number(precioTexto[1].replace(/\./g, '').replace(',', '.')) || 0;
  }

  const urls = texto.match(/(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?/gi) || [];
  const deCancelacion = urls.find((url) => /cancel/i.test(url));
  if (deCancelacion) {
    resultado.enlaceCancelacion = deCancelacion.replace(/[.,;)]+$/, '');
  }

  const conocido = SERVICIOS_CONOCIDOS.find((servicio) => servicio.patron.test(texto));
  if (conocido) {
    resultado.servicio = conocido.nombre;
    if (!resultado.enlaceCancelacion) resultado.enlaceCancelacion = conocido.enlace;
  }

  return resultado;
}

function camposFormulario() {
  return {
    texto: document.getElementById('texto-escaneo'),
    servicio: document.getElementById('campo-servicio'),
    fecha: document.getElementById('campo-fecha'),
    precio: document.getElementById('campo-precio'),
    enlace: document.getElementById('campo-enlace'),
    mensaje: document.getElementById('mensaje-escaneo'),
    error: document.getElementById('error-formulario'),
  };
}

function habilitarCampos(habilitados, enfocar) {
  const campos = camposFormulario();
  [campos.servicio, campos.fecha, campos.precio, campos.enlace].forEach((campo) => {
    campo.disabled = !habilitados;
  });
  if (enfocar && habilitados) campos.servicio.focus();
}

function escanearTexto() {
  const campos = camposFormulario();
  const detectado = detectarDatos(campos.texto.value);

  campos.servicio.value = detectado.servicio;
  campos.fecha.value = detectado.fechaFin ? formatearFecha(detectado.fechaFin) : '';
  campos.precio.value = detectado.precioMensual
    ? `${formatearPeso(detectado.precioMensual)} COP / mes`
    : '';
  campos.enlace.value = detectado.enlaceCancelacion;
  campos.error.hidden = true;

  const sinDatos = !detectado.servicio && !detectado.fechaFin && !detectado.precioMensual;
  campos.mensaje.hidden = !sinDatos;
  campos.mensaje.textContent = sinDatos
    ? 'No pudimos detectar los datos, complétalos manualmente'
    : '';
  if (sinDatos) habilitarCampos(true, true);
}

function precioDesdeCampo(valor) {
  const numero = /[\d.,]+/.exec(valor || '');
  if (!numero) return 0;
  return Number(numero[0].replace(/\./g, '').replace(',', '.')) || 0;
}

function guardarNuevaPrueba() {
  const campos = camposFormulario();
  const servicio = campos.servicio.value.trim();
  const fechaFin = fechaDesdeTexto(campos.fecha.value);
  const errores = [];

  if (!servicio) errores.push('Escribe el servicio.');
  if (!fechaFin) errores.push('Escribe una fecha de fin válida (dd/mm/aaaa).');

  if (errores.length) {
    campos.error.textContent = errores.join('\n');
    campos.error.hidden = false;
    return;
  }

  let enlace = campos.enlace.value.trim();
  if (enlace && !/^https?:\/\//i.test(enlace)) enlace = `https://${enlace}`;

  const prueba = normalizarPrueba({
    servicio,
    fechaFin,
    precioMensual: precioDesdeCampo(campos.precio.value),
    enlaceCancelacion: enlace,
  });
  pruebas.push(prueba);
  guardarPruebas();

  campos.texto.value = '';
  [campos.servicio, campos.fecha, campos.precio, campos.enlace].forEach((campo) => {
    campo.value = '';
    campo.disabled = true;
  });
  campos.error.hidden = true;
  campos.mensaje.hidden = true;
  abrirDetalle(prueba.id);
}

/* ---------- Pantalla 3: detalle ---------- */

function fechaAviso(prueba) {
  return sumarDias(prueba.fechaFin, -DIAS_ANTES);
}

function renderizarDetalle() {
  const prueba = buscarPrueba(pruebaActualId);
  if (!prueba) return;

  document.getElementById('titulo-detalle').textContent = prueba.servicio;
  const dias = díasRestantes(prueba.fechaFin);
  document.getElementById('dias-quedan').textContent =
    dias < 0 ? 'Vencida' : dias === 0 ? 'Hoy' : `${dias} ${dias === 1 ? 'día' : 'días'}`;
  document.getElementById('fecha-fin-detalle').textContent =
    `Fin de la prueba: ${formatearFecha(prueba.fechaFin)}`;
  document.getElementById('fecha-aviso-detalle').textContent =
    `en Google Calendar (${formatearFecha(fechaAviso(prueba))})`;

  const beneficios = document.getElementById('beneficios-detalle');
  beneficios.replaceChildren();
  const lista = prueba.beneficios.concat(
    `Después: ${formatearPeso(prueba.precioMensual)} al mes`,
  );
  lista.forEach((texto) => {
    const li = document.createElement('li');
    li.textContent = texto;
    beneficios.append(li);
  });

  document.getElementById('toggle-aviso').setAttribute('aria-checked', String(prueba.avisoActivo));

  const botonCancelar = document.getElementById('btn-cancelar-ahora');
  const mensaje = document.getElementById('mensaje-detalle');
  botonCancelar.disabled = !prueba.enlaceCancelacion;
  mensaje.hidden = Boolean(prueba.enlaceCancelacion);
  mensaje.textContent = 'Esta prueba no tiene enlace de cancelación.';
}

function alternarAviso() {
  const prueba = buscarPrueba(pruebaActualId);
  if (!prueba) return;
  prueba.avisoActivo = !prueba.avisoActivo;
  guardarPruebas();
  document.getElementById('toggle-aviso').setAttribute('aria-checked', String(prueba.avisoActivo));
  document.getElementById('mensaje-detalle').hidden = true;
}

function abrirEnlaceCancelacion() {
  const prueba = buscarPrueba(pruebaActualId);
  if (!prueba || !prueba.enlaceCancelacion) return;
  const enlace = document.createElement('a');
  enlace.href = prueba.enlaceCancelacion;
  enlace.target = '_blank';
  enlace.rel = 'noopener';
  enlace.click();
}

function marcarCancelada() {
  const prueba = buscarPrueba(pruebaActualId);
  if (!prueba) return;
  prueba.estado = 'cancelada';
  guardarPruebas();
  renderizarInicio();
  mostrarPantalla('inicio');
}

function guardarAviso() {
  const prueba = buscarPrueba(pruebaActualId);
  if (!prueba) return;
  if (!prueba.avisoActivo) {
    const mensaje = document.getElementById('mensaje-detalle');
    mensaje.textContent = 'Activa el aviso para guardarlo.';
    mensaje.hidden = false;
    return;
  }

  const aviso = {
    id: nuevoId(),
    pruebaId: prueba.id,
    servicio: prueba.servicio,
    fechaFin: prueba.fechaFin,
    fechaAviso: fechaAviso(prueba),
  };
  avisos = avisos.filter((item) => item.pruebaId !== prueba.id);
  avisos.push(aviso);
  guardarAvisos();
  renderizarCalendario();
  avisoActualId = aviso.id;
  renderizarConfirmacion();
  mostrarPantalla('confirmacion');
}

/* ---------- Pantalla 4: recordatorio creado ---------- */

function buscarAviso(id) {
  return avisos.find((aviso) => aviso.id === id) || null;
}

// Google Calendar espera fechas tipo 20261125T090000 en hora local.
function fechaHoraGoogle(iso, hora, minuto) {
  const fecha = iso.replace(/-/g, '');
  return `${fecha}T${String(hora).padStart(2, '0')}${String(minuto).padStart(2, '0')}00`;
}

function renderizarConfirmacion() {
  const aviso = buscarAviso(avisoActualId);
  if (!aviso) return;
  const prueba = buscarPrueba(aviso.pruebaId);

  document.getElementById('confirm-fecha').textContent =
    `Te avisaremos el ${formatearFecha(aviso.fechaAviso)} a las ${HORA_AVISO}.`;
  document.getElementById('event-servicio').textContent =
    `${aviso.servicio} · ${formatearFecha(aviso.fechaFin)}`;
  document.getElementById('event-nombre').textContent =
    `Evento: "Cancelar ${aviso.servicio}"`;

  const inicio = fechaHoraGoogle(aviso.fechaAviso, 9, 0);
  const fin = fechaHoraGoogle(aviso.fechaAviso, 9, 30);
  let detalles = `Cancela ${aviso.servicio} antes del ${formatearFecha(aviso.fechaFin)}.`;
  if (prueba && prueba.enlaceCancelacion) {
    detalles += ` Enlace de cancelación: ${prueba.enlaceCancelacion}`;
  }

  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Cancelar ${aviso.servicio}`,
    dates: `${inicio}/${fin}`,
    details: detalles,
  });
  document.getElementById('btn-calendar').href =
    `https://calendar.google.com/calendar/render?${parametros.toString()}`;
}

/* ---------- Eventos y arranque ---------- */

function abrirDetalle(id) {
  const prueba = buscarPrueba(id);
  if (!prueba) return;
  pruebaActualId = id;
  renderizarDetalle();
  mostrarPantalla('detalle');
}

function iniciar() {
  cargarDatosIniciales();
  renderizarInicio();
  renderizarCalendario();

  document.getElementById('btn-agregar').addEventListener('click', () => mostrarPantalla('nueva'));
  document.getElementById('btn-escanear').addEventListener('click', escanearTexto);
  document.getElementById('btn-editar').addEventListener('click', () => habilitarCampos(true, true));
  document.getElementById('btn-guardar').addEventListener('click', guardarNuevaPrueba);
  document.getElementById('formulario-nueva').addEventListener('submit', (evento) => evento.preventDefault());
  document.getElementById('toggle-aviso').addEventListener('click', alternarAviso);
  document.getElementById('btn-guardar-aviso').addEventListener('click', guardarAviso);
  document.getElementById('btn-cancelar-ahora').addEventListener('click', abrirEnlaceCancelacion);
  document.getElementById('btn-marcar-cancelada').addEventListener('click', marcarCancelada);

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
