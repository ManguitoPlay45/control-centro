/* ==========================================================
   CONTROL DEL CENTRO - app.js

   IDEA GENERAL (lo mas importante de entender):
     1. Todos los datos viven en un objeto llamado S.
     2. render() dibuja la pantalla a partir de S.
     3. Cuando el usuario hace algo, se cambia S, se guarda
        con save() y se vuelve a dibujar con render().
   Nunca se edita la pantalla directamente: se cambian los datos.
   ========================================================== */


/* ==========================================================
   1. AYUDAS BASICAS
   ========================================================== */

// Nombres con los que se guardan cosas en el navegador (localStorage).
// IMPORTANTE: no cambies KEY o perderas los datos actuales.
const KEY = 'cic_v1';                          // equipos y cobros
const KEY_VER_INGRESOS = 'cic_ver_ingresos';   // si los ingresos se ven u ocultan
const KEY_RESPALDO = 'cic_ultimo_respaldo';    // fecha del ultimo respaldo descargado

// Atajo para buscar un elemento del HTML: $('#stats')
const $ = (selector) => document.querySelector(selector);

// Convierte un numero a dinero: 1500 -> "RD$ 1,500"
function money(n) {
  return 'RD$ ' + (Math.round(n * 100) / 100).toLocaleString('es-DO');
}

// Convierte segundos a reloj: 2880 -> "48:00" ; 3900 -> "1:05:00"
function clock(s) {
  s = Math.max(0, Math.ceil(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = String(s % 60).padStart(2, '0');
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + seg;
  return m + ':' + seg;
}

// Fecha y hora legibles a partir de milisegundos
function fechaHora(ms) {
  return new Date(ms).toLocaleString('es-DO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// SEGURIDAD: convierte caracteres especiales de HTML en texto inofensivo.
// Los nombres de equipos los escribe el usuario (o vienen de un archivo de
// respaldo) y se insertan en la pagina con innerHTML. Sin esto, un nombre
// como <img onerror=...> podria ejecutar codigo. Siempre usa esc() con
// cualquier texto que venga del usuario.
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Textos que se muestran segun el estado de cada equipo
const ETIQUETAS = {
  free: 'Libre',
  run: 'En uso',
  pause: 'En pausa',
  over: '¡Tiempo terminado!'
};


/* ==========================================================
   2. DATOS: CARGAR Y GUARDAR
   S.devs = lista de equipos
   S.log  = historial de cobros
   ========================================================== */

function load() {
  // Si ya hay datos guardados en este navegador, se usan esos
  try {
    const guardado = localStorage.getItem(KEY);
    if (guardado) return JSON.parse(guardado);
  } catch (e) {}

  // Primera vez: se crean los equipos iniciales.
  // Formato: [nombre, tarifa por hora]
  const equipos = [
    ['PC', 100],
    ['PS4', 50],
    ['PS5', 100],
    ['Xbox', 100]
  ];

  return {
    devs: equipos.map((e, i) => ({
      id: i + 1,        // numero unico del equipo (nunca se repite)
      name: e[0],       // nombre
      rate: e[1],       // tarifa por hora
      st: 'free',       // estado: free, run, pause u over
      endAt: 0,         // hora exacta en que termina (si esta en uso)
      rem: 0            // segundos que quedan (si esta en pausa)
    })),
    log: []             // historial de cobros, vacio al inicio
  };
}

let S = load();

// Guarda todo S en el navegador. Se llama despues de cada cambio.
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
}

// Busca un equipo por su id
function dev(id) {
  return S.devs.find((d) => d.id == id);
}

// Segundos que le quedan a un equipo.
// No se "cuenta hacia atras": se calcula con la hora real (endAt - ahora),
// por eso el tiempo sigue bien aunque cierres y abras la pagina.
function left(d) {
  if (d.st === 'run') return (d.endAt - Date.now()) / 1000;
  if (d.st === 'pause') return d.rem;
  return 0;
}

// Revisa si ya existe un equipo con ese nombre (sin importar mayusculas).
// idIgnorar sirve al renombrar, para no compararlo consigo mismo.
// Los nombres deben ser unicos porque el historial guarda el NOMBRE.
function nombreExiste(nombre, idIgnorar) {
  const buscado = nombre.trim().toLowerCase();
  return S.devs.some((d) => d.id != idIgnorar && d.name.trim().toLowerCase() === buscado);
}


/* ==========================================================
   3. SONIDO DE ALARMA
   ========================================================== */

let audio;
function beep() {
  try {
    audio = audio || new AudioContext();
    // Tres pitidos, uno cada 0.35 segundos
    [0, 0.35, 0.7].forEach((retraso) => {
      const osc = audio.createOscillator();
      const vol = audio.createGain();
      osc.frequency.value = 880;   // tono (mas alto = mas agudo)
      vol.gain.value = 0.2;        // volumen
      osc.connect(vol);
      vol.connect(audio.destination);
      osc.start(audio.currentTime + retraso);
      osc.stop(audio.currentTime + retraso + 0.2);
    });
  } catch (e) {}
}


/* ==========================================================
   4. COBRAR: AGREGAR TIEMPO A UN EQUIPO
   d      = el equipo
   amount = dinero recibido
   secs   = segundos que se le dan
   ========================================================== */

function add(d, amount, secs) {
  if (!(amount > 0) || !(secs > 0)) return;

  if (d.st === 'run') {
    d.endAt += secs * 1000;                  // ya esta en uso: alarga la hora de fin
  } else if (d.st === 'pause') {
    d.rem += secs;                           // en pausa: suma a lo que queda
  } else {
    d.st = 'run';                            // libre o terminado: arranca desde ahora
    d.endAt = Date.now() + secs * 1000;
  }

  // Anota el cobro en el historial
  S.log.push({
    t: Date.now(),   // fecha y hora
    dev: d.name,     // nombre del equipo (por eso los nombres deben ser unicos)
    amt: amount,     // dinero
    sec: secs        // segundos comprados
  });

  save();
  render();
}


/* ==========================================================
   5. DIBUJAR LAS TARJETAS
   ========================================================== */

function render() {
  // Antes de redibujar, recordamos lo escrito en los campos de monto
  // y cual de ellos tenia el cursor, para no estorbar a quien esta tecleando.
  const escrito = {};
  document.querySelectorAll('[data-amt]').forEach((input) => {
    escrito[input.dataset.amt] = input.value;
  });
  const activo = document.activeElement;
  const idConFoco = activo && activo.dataset ? activo.dataset.amt : undefined;

  if (S.devs.length === 0) {
    $('#devs').innerHTML = '<p class="mut">No hay equipos. Usa el boton "+ Agregar equipo".</p>';
  } else {
    $('#devs').innerHTML = S.devs.map((d) => {
      const textoBoton = (d.st === 'free' || d.st === 'over') ? 'Cobrar' : 'Agregar';

      // Botones de pausa / reanudar / finalizar segun el estado
      let botones = '';
      if (d.st === 'run')   botones += `<button data-act="pause" data-id="${d.id}">Pausar</button>`;
      if (d.st === 'pause') botones += `<button data-act="resume" data-id="${d.id}">Reanudar</button>`;
      if (d.st !== 'free') {
        const textoStop = (d.st === 'over') ? 'Liberar' : 'Finalizar';
        botones += `<button data-act="stop" data-id="${d.id}">${textoStop}</button>`;
      }

      // Cada tarjeta es un bloque de HTML. Notas:
      //  - class="card ${d.st}" : el CSS pinta la franja segun el estado
      //  - data-name / data-rate / data-amt : campos que se leen en los eventos
      //  - data-act / data-id : le dicen al boton que accion hacer y en que equipo
      //  - id="t${d.id}" : el reloj actualiza solo ese texto cada medio segundo
      //  - esc(d.name) : el nombre siempre pasa por esc() por seguridad
      return `
      <div class="card ${d.st}">
        <div class="top">
          <input class="nm" type="text" maxlength="30" value="${esc(d.name)}"
                 data-name="${d.id}" aria-label="Nombre del equipo">
          <label>RD$
            <input type="number" min="1" value="${d.rate}" data-rate="${d.id}"
                   aria-label="Tarifa por hora de ${esc(d.name)}">/hora
          </label>
        </div>

        <div class="time" id="t${d.id}">${clock(left(d))}</div>
        <div class="stl">${ETIQUETAS[d.st]}</div>

        <div class="row">
          <input type="number" min="1" inputmode="decimal" placeholder="Monto recibido"
                 data-amt="${d.id}" value="${esc(escrito[d.id] || '')}">
          <button class="p" data-act="pay" data-id="${d.id}">${textoBoton}</button>
        </div>
        <div class="pv" id="pv${d.id}"></div>

        <div class="row">
          <button data-act="half" data-id="${d.id}">30 min</button>
          <button data-act="hour" data-id="${d.id}">1 hora</button>
        </div>
        <div class="row">${botones}</div>

        <button class="quitar" data-act="remove" data-id="${d.id}">Quitar equipo</button>
      </div>`;
    }).join('');
  }

  // Devolvemos el cursor al campo de monto que lo tenia
  if (idConFoco) {
    const campo = document.querySelector(`[data-amt="${idConFoco}"]`);
    if (campo) campo.focus();
  }

  S.devs.forEach((d) => preview(d.id));
  report();
}

// Muestra "= 48 min" debajo del campo mientras escribes un monto
function preview(id) {
  const input = document.querySelector(`[data-amt="${id}"]`);
  const texto = $('#pv' + id);
  if (!input || !texto) return;

  const monto = parseFloat(input.value);
  const d = dev(id);
  if (monto > 0) {
    // REGLA DE TRES: monto / tarifa = horas ; x 60 = minutos.
    // Se hace x600 y /10 para redondear a un decimal (48.5 min).
    const minutos = Math.round(monto / d.rate * 600) / 10;
    texto.textContent = '= ' + minutos + ' min';
  } else {
    texto.textContent = '';
  }
}


/* ==========================================================
   6. REPORTES DE INGRESOS
   ========================================================== */

function report() {
  const ahora = new Date();
  const DIA = 24 * 60 * 60 * 1000;

  // Inicio de hoy (medianoche)
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  // Inicio de la semana (lunes). Para que empiece el domingo: hoy - ahora.getDay() * DIA
  const semana = hoy - ((ahora.getDay() + 6) % 7) * DIA;
  // Inicio del mes
  const mes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();

  // Suma los cobros desde una fecha (y opcionalmente de un solo equipo)
  function sumar(desde, nombre) {
    return S.log
      .filter((l) => l.t >= desde && (!nombre || l.dev === nombre))
      .reduce((total, l) => total + l.amt, 0);
  }

  // Tres cuadros: hoy, semana y mes
  const periodos = [
    ['Hoy', hoy],
    ['Esta semana (desde el lunes)', semana],
    ['Este mes', mes]
  ];
  $('#stats').innerHTML = periodos.map((p) =>
    `<div class="stat"><span>${p[0]}</span><div>${money(sumar(p[1]))}</div></div>`
  ).join('');

  // Tabla por equipo
  let filas = S.devs.map((d) =>
    `<tr>
       <td>${esc(d.name)}</td>
       <td>${money(sumar(hoy, d.name))}</td>
       <td>${money(sumar(semana, d.name))}</td>
       <td>${money(sumar(mes, d.name))}</td>
     </tr>`
  ).join('');

  // Cobros de equipos que ya fueron quitados: total general menos lo que
  // suman los equipos actuales. Asi la tabla siempre cuadra con los totales.
  const resto = [hoy, semana, mes].map((desde) =>
    sumar(desde) - S.devs.reduce((t, d) => t + sumar(desde, d.name), 0)
  );
  if (resto.some((x) => x > 0.005)) {
    filas += `<tr>
      <td class="mut">Equipos quitados</td>
      ${resto.map((x) => `<td>${money(Math.max(0, x))}</td>`).join('')}
    </tr>`;
  }

  $('#bydev').innerHTML =
    '<tr><th>Equipo</th><th>Hoy</th><th>Semana</th><th>Mes</th></tr>' + filas;

  // Historial: los ultimos 15 cobros, del mas nuevo al mas viejo
  const recientes = S.log.slice(-15).reverse();
  if (recientes.length === 0) {
    $('#hist').innerHTML = '<tr><td class="mut">Aun no hay cobros. Cobra un tiempo para empezar.</td></tr>';
    return;
  }
  $('#hist').innerHTML =
    '<tr><th>Fecha</th><th>Equipo</th><th>Minutos</th><th>Monto</th><th></th></tr>' +
    recientes.map((l) => {
      const fecha = new Date(l.t).toLocaleString('es-DO', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      const minutos = Math.round(l.sec / 6) / 10;
      return `<tr>
        <td>${fecha}</td>
        <td>${esc(l.dev)}</td>
        <td>${minutos}</td>
        <td>${money(l.amt)}</td>
        <td><button data-act="del" data-id="${l.t}" title="Anular este cobro" aria-label="Anular cobro">✕</button></td>
      </tr>`;
    }).join('');
}


/* ==========================================================
   7. RESPALDO: DESCARGAR Y CARGAR
   El respaldo es un archivo .json con una copia de S
   (equipos + historial). Sirve para no perder datos, para
   pasarlos a otro equipo o a otro navegador.
   ========================================================== */

// Muestra cuando fue el ultimo respaldo descargado
function mostrarUltimoRespaldo() {
  let ms = 0;
  try { ms = Number(localStorage.getItem(KEY_RESPALDO)) || 0; } catch (e) {}
  $('#ultimoRespaldo').textContent = ms
    ? 'Ultimo respaldo descargado: ' + fechaHora(ms)
    : 'Aun no has descargado ningun respaldo.';
}

// Descarga S como archivo. Truco: se crea un enlace invisible con el
// contenido del archivo y se hace clic en el por codigo.
function descargarRespaldo() {
  const f = new Date();
  const fecha = f.getFullYear() + '-' +
    String(f.getMonth() + 1).padStart(2, '0') + '-' +
    String(f.getDate()).padStart(2, '0');

  const texto = JSON.stringify(S, null, 2);   // null, 2 = con sangria, legible
  const blob = new Blob([texto], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'respaldo-centro-' + fecha + '.json';   // nombre del archivo
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  try { localStorage.setItem(KEY_RESPALDO, String(Date.now())); } catch (e) {}
  mostrarUltimoRespaldo();
}

// Comprueba que un objeto tenga la forma correcta antes de usarlo.
// NUNCA cargues un archivo sin validarlo: podria estar danado o no ser
// un respaldo, y dejaria la app rota.
function datosValidos(obj) {
  if (!obj || !Array.isArray(obj.devs) || !Array.isArray(obj.log)) return false;

  const estados = ['free', 'run', 'pause', 'over'];
  const equiposOk = obj.devs.every((d) =>
    d && Number.isFinite(d.id) && typeof d.name === 'string' &&
    Number.isFinite(d.rate) && d.rate > 0 && estados.includes(d.st) &&
    Number.isFinite(d.endAt) && Number.isFinite(d.rem)
  );
  const cobrosOk = obj.log.every((l) =>
    l && Number.isFinite(l.t) && typeof l.dev === 'string' &&
    Number.isFinite(l.amt) && Number.isFinite(l.sec)
  );

  // Los ids no pueden repetirse
  const ids = new Set(obj.devs.map((d) => d.id));
  return equiposOk && cobrosOk && ids.size === obj.devs.length;
}

// Lee el archivo elegido y, si es valido, reemplaza los datos actuales
function cargarRespaldo(archivo) {
  const lector = new FileReader();

  lector.onload = () => {
    let obj;
    try {
      obj = JSON.parse(lector.result);
    } catch (e) {
      alert('No se pudo leer el archivo.');
      return;
    }
    if (!datosValidos(obj)) {
      alert('Este archivo no parece un respaldo valido.');
      return;
    }
    if (!confirm('Esto REEMPLAZA todos los datos actuales por los del respaldo. Continuar?')) return;

    S = { devs: obj.devs, log: obj.log };
    save();
    render();
    alert('Respaldo cargado.');
  };

  lector.readAsText(archivo);
}

$('#btnExportar').addEventListener('click', descargarRespaldo);

// El boton "Cargar respaldo" abre el selector de archivos (campo oculto)
$('#btnImportar').addEventListener('click', () => $('#archivoRespaldo').click());
$('#archivoRespaldo').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  if (archivo) cargarRespaldo(archivo);
  e.target.value = '';   // permite elegir el mismo archivo otra vez
});


/* ==========================================================
   8. MOSTRAR / OCULTAR INGRESOS
   ========================================================== */

const panelIngresos = $('#ingresos');
const botonIngresos = $('#toggleIng');

// visible = true (mostrar) o false (ocultar)
function mostrarIngresos(visible) {
  panelIngresos.hidden = !visible;
  botonIngresos.textContent = visible ? 'Ocultar ingresos' : 'Mostrar ingresos';
  // Recuerda la eleccion para la proxima vez que se abra la pagina
  try { localStorage.setItem(KEY_VER_INGRESOS, visible ? '1' : '0'); } catch (e) {}
}

botonIngresos.addEventListener('click', () => mostrarIngresos(panelIngresos.hidden));


/* ==========================================================
   9. AGREGAR EQUIPO
   ========================================================== */

$('#addDev').addEventListener('click', () => {
  const nombre = (prompt('Nombre del equipo:') || '').trim().slice(0, 30);
  if (!nombre) return;                         // si cancelas, no hace nada
  if (nombreExiste(nombre)) {
    alert('Ya existe un equipo con ese nombre.');
    return;
  }

  const tarifa = parseFloat(prompt('Tarifa por hora (RD$):', '100'));
  if (!(tarifa > 0)) return;                   // tarifa invalida: no hace nada

  // El id debe ser unico: el mayor que exista + 1.
  // Math.max(0, ...lista) tambien funciona si la lista esta vacia.
  const nuevoId = Math.max(0, ...S.devs.map((d) => d.id)) + 1;

  S.devs.push({ id: nuevoId, name: nombre, rate: tarifa, st: 'free', endAt: 0, rem: 0 });
  save();
  render();
});


/* ==========================================================
   10. EVENTOS: QUE PASA AL HACER CLIC O ESCRIBIR
   ========================================================== */

// Un solo oyente para todos los botones de las tarjetas y del historial.
// Funciona aunque render() recree los botones, porque escucha en document.
// Cada boton trae data-act (la accion) y data-id (el equipo o el cobro).
document.addEventListener('click', (e) => {
  const boton = e.target.closest('button[data-act]');
  if (!boton) return;

  const accion = boton.dataset.act;

  // Anular un cobro del historial
  if (accion === 'del') {
    S.log = S.log.filter((l) => l.t != boton.dataset.id);
    save();
    report();
    return;
  }

  const d = dev(boton.dataset.id);
  if (!d) return;

  // Quitar un equipo. Sus cobros pasados NO se borran: siguen sumando
  // en los totales y aparecen en la fila "Equipos quitados".
  if (accion === 'remove') {
    const aviso = (d.st === 'free')
      ? 'Quitar "' + d.name + '"? Sus cobros pasados se conservan en los totales.'
      : '"' + d.name + '" tiene tiempo en curso. Quitarlo de todos modos? Sus cobros pasados se conservan en los totales.';
    if (confirm(aviso)) {
      S.devs = S.devs.filter((x) => x.id != d.id);
      save();
      render();
    }
    return;
  }

  if (accion === 'pay') {
    // Cobrar el monto escrito, usando la regla de tres
    const input = document.querySelector(`[data-amt="${d.id}"]`);
    const monto = parseFloat(input.value);
    if (monto > 0) {
      input.value = '';
      add(d, monto, monto / d.rate * 3600);
    }
  }

  if (accion === 'half') add(d, d.rate / 2, 1800);   // media hora = mitad del precio
  if (accion === 'hour') add(d, d.rate, 3600);       // una hora = precio completo

  if (accion === 'pause') {
    d.rem = left(d);        // congela los segundos que quedan
    d.st = 'pause';
    save();
    render();
  }

  if (accion === 'resume') {
    d.endAt = Date.now() + d.rem * 1000;   // nueva hora de fin desde ahora
    d.st = 'run';
    save();
    render();
  }

  if (accion === 'stop') {
    d.st = 'free';
    d.rem = 0;
    d.endAt = 0;
    save();
    render();
  }
});

// Al escribir un monto, actualiza el "= 48 min" en vivo
document.addEventListener('input', (e) => {
  if (e.target.dataset.amt) preview(e.target.dataset.amt);
});

// "change" se dispara cuando terminas de editar un campo
// (al salir del campo o al pulsar Enter).
document.addEventListener('change', (e) => {
  // Cambio de tarifa: solo afecta a los cobros nuevos
  if (e.target.dataset.rate) {
    const nueva = parseFloat(e.target.value);
    if (nueva > 0) {
      dev(e.target.dataset.rate).rate = nueva;
      save();
    }
    render();
  }

  // Cambio de nombre
  if (e.target.dataset.name) {
    const d = dev(e.target.dataset.name);
    const nuevo = e.target.value.trim().slice(0, 30);

    if (!nuevo) {
      alert('El nombre no puede quedar vacio.');
    } else if (nombreExiste(nuevo, d.id)) {
      alert('Ya existe un equipo con ese nombre.');
    } else if (nuevo !== d.name) {
      // El historial guarda el nombre, asi que tambien se actualiza ahi.
      // Si no, los cobros viejos dejarian de aparecer en "Por equipo".
      S.log.forEach((l) => { if (l.dev === d.name) l.dev = nuevo; });
      d.name = nuevo;
      save();
    }
    render();   // si el nombre no era valido, esto restaura el anterior
  }
});


/* ==========================================================
   11. EL RELOJ
   Cada medio segundo actualiza los cronometros y revisa si a
   algun equipo se le acabo el tiempo.
   ========================================================== */

// true si el usuario esta escribiendo en un campo de nombre o tarifa
function editando() {
  const a = document.activeElement;
  return !!(a && a.matches && a.matches('[data-name], [data-rate]'));
}

// Si un tiempo termina mientras alguien edita un nombre, NO se redibuja
// (se perderia lo que esta escribiendo). Se deja pendiente para despues.
let renderPendiente = false;

setInterval(() => {
  let cambio = false;

  S.devs.forEach((d) => {
    if (d.st === 'run' && left(d) <= 0) {
      d.st = 'over';
      cambio = true;
      beep();
    }
    // Solo se cambia el texto del reloj, sin redibujar toda la tarjeta
    const t = $('#t' + d.id);
    if (t) t.textContent = clock(left(d));
  });

  if (cambio) {
    save();
    if (editando()) renderPendiente = true;
    else render();
  }
}, 500);

// Al salir del campo que se estaba editando, se dibuja lo que quedo pendiente
document.addEventListener('focusout', () => {
  setTimeout(() => {
    if (renderPendiente && !editando()) {
      renderPendiente = false;
      render();
    }
  }, 0);
});


/* ==========================================================
   12. ARRANQUE
   ========================================================== */

// Aplica lo que se eligio la ultima vez sobre los ingresos (por defecto se ven)
let verIngresos = true;
try { verIngresos = localStorage.getItem(KEY_VER_INGRESOS) !== '0'; } catch (e) {}
mostrarIngresos(verIngresos);

mostrarUltimoRespaldo();
render();
