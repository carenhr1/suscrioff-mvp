# SuscriOFF

> Recuerda cuándo terminan tus pruebas gratuitas y ten el enlace de cancelación a mano, antes de que te cobren.

SuscriOFF es una herramienta pensada para resolver un problema muy concreto: las pruebas gratuitas de servicios por suscripción que empiezan con buenas intenciones y terminan en un cargo inesperado porque nadie recordó la fecha de corte.

Este repositorio contiene la **primera versión funcional (MVP)** del producto.

## ¿Qué hace el MVP?

El MVP se centra en dos funciones básicas:

1. **Registro y recordatorio del fin de la prueba gratuita**
   - El usuario guarda el servicio, la fecha de inicio de la prueba y la duración (o directamente la fecha de fin).
   - SuscriOFF calcula cuándo termina el periodo gratuito y avisa con antelación para que el usuario pueda decidir si cancela o continúa.

2. **Enlace de cancelación centralizado**
   - Junto a cada suscripción se guarda el enlace directo a la página de cancelación del servicio.
   - Cuando llega el recordatorio, el usuario tiene el enlace a mano y no tiene que buscarlo entre correos o ajustes de la web.

En resumen: **un lugar donde anotar tus pruebas gratuitas, saber cuándo acaban y cancelar sin fricción.**

## Alcance del MVP

### Incluido

- Alta, edición y eliminación de pruebas gratuitas (nombre del servicio y fecha de fin).
- Cálculo y visualización de los días restantes hasta el final de la prueba.
- Recordatorios automáticos antes de la fecha de corte.
- Almacenamiento del enlace de cancelación de cada servicio y acceso rápido al mismo.
- Una interfaz sencilla que prioriza la claridad sobre la configuración.

### No incluido (por ahora)

- Gestión de suscripciones de pago recurrentes ni facturación.
- Cancelación automática: SuscriOFF recuerda y facilita el enlace, pero **no cancela por ti** ni interactúa con las webs de los proveedores.
- Sincronización con correo, calendarios o tarjetas bancarias.
- Pagos, cuentas de usuario avanzadas, equipos ni permisos.
- Aplicaciones móviles nativas; el MVP se diseña para funcionar primero en la web.

Estas exclusiones son deliberadas: el objetivo del MVP es validar que el recordatorio + el enlace de cancelación resuelven el problema, antes de ampliar funcionalidades.

## Estructura del proyecto

```text
suscrioff-mvp/
├── README.md   # Descripción, alcance y punto de entrada al proyecto
├── src/        # Código fuente de la aplicación
└── docs/       # Documentación del producto y decisiones técnicas
```

- **`src/`**: contiene la implementación del MVP.
- **`docs/`**: contiene documentación complementaria (requisitos, decisiones de diseño, guías de uso, etc.).

> Estado actual: el proyecto está en fase inicial. Esta estructura es la base sobre la que se construirá el MVP.

## Principios del MVP

- **Simple antes que completo:** una sola pantalla debería ser suficiente para ver qué pruebas están por caducar.
- **Sin fricción:** añadir una prueba y su enlace de cancelación debe llevar segundos.
- **El usuario decide:** avisamos y damos el enlace; la cancelación siempre la ejecuta el usuario.

## Documentación

La documentación adicional del proyecto se encuentra en [`docs/`](docs/).
