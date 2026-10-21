# Control del centro

Aplicacion web sencilla y gratuita para administrar un centro de internet o de juegos: controla el tiempo de alquiler de PCs y consolas, cobra por tiempo o por monto y lleva el total de ingresos por dia, semana y mes.

**Usala aqui:** https://manguitoplay45.github.io/control-centro/

No necesitas instalar nada ni crear una cuenta. Funciona desde el navegador de una PC, tablet o celular.

## Que puede hacer

- Una tarjeta por equipo (PC, PS4, PS5, Xbox, etc.) con su cronometro en cuenta regresiva y su estado: libre, en uso, en pausa o tiempo terminado.
- Alarma y aviso visual cuando se acaba el tiempo.
- Cobro por monto con regla de tres: si la tarifa es 100 por hora y el cliente da 80, la app calcula 48 minutos.
- Botones rapidos de 30 minutos (mitad del precio) y 1 hora.
- Agregar tiempo a un equipo que ya esta en uso, pausar, reanudar y finalizar.
- Tarifa propia por equipo, editable en cualquier momento (solo afecta a los cobros nuevos).
- Agregar equipos nuevos, cambiarles el nombre y quitarlos, todo desde la pagina.
- Ingresos de hoy, de la semana (desde el lunes) y del mes, en total y por equipo.
- Historial de los ultimos cobros, con opcion de anular uno si hubo un error.
- Boton para mostrar u ocultar la seccion de ingresos.
- Respaldo: descarga todos tus datos en un archivo y cargalos cuando quieras.

## Como se usa

1. Abre la pagina. La primera vez veras cuatro equipos de ejemplo.
2. Escribe un monto en la tarjeta de un equipo y pulsa **Cobrar**, o usa los botones **30 min** y **1 hora**.
3. Cuando el tiempo termine, suena una alarma y la tarjeta parpadea en rojo. Pulsa **Liberar** para dejar el equipo libre.
4. Para cambiar el nombre de un equipo, haz clic sobre su nombre y escribe. Para cambiar la tarifa, edita el numero junto a "RD$".
5. Usa **+ Agregar equipo** para crear uno nuevo y **Quitar equipo** para eliminarlo. Los cobros de un equipo quitado se conservan en los totales.

## Importante: donde se guardan tus datos

Tus datos se guardan **solo en tu navegador, en el equipo que estas usando**. No se envian a ningun servidor y nadie mas puede verlos, ni siquiera quien creo la pagina.

Esto significa que:

- Si borras los datos de navegacion, o desinstalas el navegador, **pierdes tu historial**.
- Si abres la pagina en otro navegador o en otro equipo, veras datos distintos.
- El modo incognito no guarda nada.
- Nadie puede recuperar tus datos por ti.

**Descarga un respaldo de vez en cuando** con el boton "Descargar respaldo", y guardalo en un lugar seguro. Para restaurarlo o pasarlo a otro equipo, usa "Cargar respaldo".

Recomendacion: usa siempre el mismo navegador y el mismo equipo como "caja" del negocio.

## Limitaciones

- No hay cuentas ni sincronizacion entre dispositivos.
- Los cronometros siguen correctos aunque cierres la pestana, pero la alarma solo suena con la pagina abierta. En celular o tablet, manten la pantalla encendida.
- No bloquea ni apaga los equipos: es un control manual para el encargado.

## Usarla sin internet

Descarga los tres archivos (`index.html`, `estilos.css` y `app.js`), guardalos en la misma carpeta y abre `index.html` con doble clic. Los datos tambien se guardan en ese navegador.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de la pagina |
| `estilos.css` | Colores y diseno |
| `app.js` | Logica de la aplicacion |

El codigo esta comentado para que puedas leerlo y modificarlo.

## Aviso

Es un proyecto personal y gratuito, ofrecido tal como esta, sin garantias. Verifica que los totales coincidan con tu caja y manten respaldos de tus datos.
