# SuscriOFF

Avisa cuándo termina la prueba gratuita de una suscripción (Spotify Premium, YouTube Premium, etc.) para evitar cobros por olvido, con el enlace de cancelación a mano.

## Estado actual

Maquetación inicial: HTML, CSS y JavaScript sin lógica todavía. El formulario y las listas son solo estructura; no guardan ni calculan nada.

## Cómo abrirlo

Abre `index.html` en el navegador. No hay dependencias, build ni servidor obligatorio.

## Archivos

- `index.html` — estructura de la interfaz.
- `styles.css` — estilos: azul marino `#0F2A5F` y esquinas rectas.
- `app.js` — punto de entrada; sin funciones por ahora.
- [`docs/README-detallado.md`](docs/README-detallado.md) — alcance y decisiones del MVP.

## Reglas del MVP

- HTML, CSS y JavaScript puros; sin frameworks ni build.
- Datos guardados en `localStorage`; solo datos ficticios (Ley 1581 de 2012).
- Sin pagos y sin cancelación automática.
- Esquinas rectas y color principal `#0F2A5F`.
