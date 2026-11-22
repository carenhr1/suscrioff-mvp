# SuscriOFF

Avisa cuándo termina la prueba gratuita de una suscripción (Spotify Premium, YouTube Premium, etc.) para evitar cobros por olvido, con el enlace de cancelación a mano.

## Estado actual

Aplicación completa de cuatro pantallas: inicio con gasto en riesgo y próximos vencimientos, alta de pruebas mediante escaneo de texto con regex y campos editables, detalle con cuenta regresiva e interruptor de aviso, y confirmación del recordatorio con enlace de plantilla a Google Calendar. Todo se guarda en `localStorage` y se usa una paleta monocromática azul marino.

## Cómo abrirlo

Abre `index.html` en el navegador o levant un servidor local con `python3 -m http.server 8000` y entra en `http://localhost:8000`. No hay dependencias ni build.

## Archivos

- `index.html` — estructura de la interfaz.
- `styles.css` — estilos: azul marino `#12295E` y esquinas cuadradas (radio máx. 2px).
- `app.js` — modelo, navegación, localStorage, cálculos y carga única de datos de ejemplo.
- [`docs/README-detallado.md`](docs/README-detallado.md) — alcance y decisiones del MVP.

## Reglas del MVP

- HTML, CSS y JavaScript puros; sin frameworks ni build.
- Datos guardados en `localStorage`; solo datos ficticios (Ley 1581 de 2012).
- Sin pagos y sin cancelación automática.
- Esquinas rectas y color principal `#0F2A5F`.
