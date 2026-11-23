const paper = document.getElementById('paper');
const stage = document.getElementById('stage');
const art   = document.getElementById('art');
const hint  = document.getElementById('hint');
const turb  = document.getElementById('turb');
const light = document.getElementById('light');
const blackout = document.getElementById('blackout');
const message = document.getElementById('message');
const boomEl = document.getElementById('boom');
const rueda = document.getElementById('rueda');
const modal = document.getElementById('modal');
const modalCard = document.getElementById('modalCard');
const modalTitulo = document.getElementById('modalTitulo');
const modalTexto = document.getElementById('modalTexto');
const cuadrosEl = document.getElementById('cuadros');

// ---------- Formas: bolita irregular <-> hoja rectangular (16 puntos cada una) ----------
const mult = [1, .8, 1.1, .85, 1.05, .8, 1.1, .9, 1, .82, 1.12, .86, 1.05, .8, 1.1, .88];
const ballPoints = mult.map((m, i) => {
  const a = (-135 + i * 22.5) * Math.PI / 180;
  const x = (50 + 26 * m * Math.cos(a)).toFixed(1);
  const y = (50 + 35 * m * Math.sin(a)).toFixed(1);
  return `${x}% ${y}%`;
});
const BALL  = `polygon(${ballPoints.join(',')})`;
const SHEET = 'polygon(0 0,25% 0,50% 0,75% 0,100% 0,100% 25%,100% 50%,100% 75%,100% 100%,75% 100%,50% 100%,25% 100%,0 100%,0 75%,0 50%,0 25%)';

// ---------- Nivel de arrugas: 1 = muy arrugado, 0 = casi liso ----------
function crumple(t) {
  turb.setAttribute('baseFrequency', (0.013 + 0.025 * t).toFixed(4));
  light.setAttribute('surfaceScale', (1.6 + 10.4 * t).toFixed(2));
}

function tween(from, to, ms, done) {
  const start = performance.now();
  function step(now) {
    const p = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - p, 3); // ease-out
    crumple(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
    else if (done) done();
  }
  requestAnimationFrame(step);
}

// ---------- Abrir / cerrar ----------
let opened = false;
let busy = false;

paper.style.clipPath = BALL;
crumple(1);

function abrir() {
  stage.classList.remove('idle');
  hint.style.opacity = 0;
  paper.classList.add('flat');
  paper.style.clipPath = SHEET;
  tween(1, 0, 1500, () => {
    paper.classList.add('done');
    art.classList.add('go');          // empieza a escribirse el Te Amo
    opened = true;

    // El corazón es lo último que se dibuja: cuando termina, aparece el texto
    // y recién ahí se permite volver a tocar.
    let habilitado = false;
    const habilitar = () => {
      if (habilitado) return;
      habilitado = true;
      hint.textContent = 'vuelve a tocar';
      hint.style.opacity = 1;
      busy = false;
    };
    art.querySelector('.heart').addEventListener('animationend', habilitar, { once: true });
    setTimeout(habilitar, 5600);      // respaldo por si el navegador no dispara animationend
  });
}

function oscurecer() {
  hint.style.opacity = 0;
  blackout.classList.add('on');      // todo se va a negro, sin nada
  // busy se queda en true: ya no hay más toques
  setTimeout(mostrarMensaje, 3800);  // 2.5s de apagado + un silencio dramático
}

// ---------- Mensaje dramático ----------
// EDITA AQUÍ tu texto. Cada línea aparece letra por letra y luego se desvanece.
// Al final aparece de golpe el mensaje final.
const MENSAJE = [
  { texto: '¿Crees que únicamente haría esto para ti?...', pausa: 2200 },
  { texto: 'Ñoñoñoño, no es así',                          pausa: 2400 },
  { texto: 'Así que, esto no es lo único que hice para ti, muejejejeje...',        pausa: 2400 }
];

// Mensaje final: aparece de golpe, se queda un rato y desaparece de golpe
const MENSAJE_FINAL = 'Intentaré no hacer mis tarjetas así de dramáticas, jejejej perdón :P';
const MS_FINAL = 2500;   // cuánto tiempo se queda para que se lea
const MS_POR_LETRA = 35;   // más bajo = más rápido

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function crearLinea(texto) {
  const p = document.createElement('p');
  p.className = 'line';
  let n = 0;
  texto.split(' ').forEach((palabra, i, todas) => {
    const w = document.createElement('span');
    w.className = 'palabra';
    for (const ch of palabra) {
      const s = document.createElement('span');
      s.className = 'letter';
      s.textContent = ch;
      s.style.animationDelay = (n++ * MS_POR_LETRA) + 'ms';
      w.append(s);
    }
    p.append(w);
    if (i < todas.length - 1) { p.append(' '); n++; }
  });
  return { p, duracion: n * MS_POR_LETRA + 800 };
}

async function mostrarMensaje() {
  for (const { texto, pausa } of MENSAJE) {
    const { p, duracion } = crearLinea(texto);
    message.append(p);
    await dormir(duracion + pausa);
    p.classList.add('out');           // se desvanece antes de la siguiente
    await dormir(1500);
    p.remove();
    await dormir(700);                // un respiro en la oscuridad
  }
  await mensajeFinal();
  await dormir(900);                  // un instante de oscuridad...
  await boom();                       // ...y BOOM
}

async function mensajeFinal() {
  const p = document.createElement('p');
  p.className = 'line final';
  p.textContent = MENSAJE_FINAL;

  message.append(p);                  // aparece de golpe
  await dormir(MS_FINAL);
  p.remove();                         // y desaparece de golpe
}

// ---------- BOOM + 3 cuadros ----------
// EDITA AQUÍ los 3 cuadros: título y lo que dice al abrirlos.
// bloqueado: true -> se desbloquea cuando abran todos los demás.
// corazon: true   -> el título se muestra dentro de un corazón que late.
// carta: true     -> al abrirlo se ve grande, con letra de carta.
// pantalla: true  -> al tocarlo, el cuadro se expande hasta ocupar toda la pantalla.
// galeria: true   -> (con pantalla) escribe "La sorpresa essss:" y luego muestra el menú de 40 tarjetas.
const CUADROS = [
  { titulo: '¡¡¡Felices 6 meses de hablarnoooos!!! 🎉💗', carta: true, texto:
      'Pues no sé cómo iniciar, pero quiero que sepas que me has hecho demasiado feliz estos meses que nos hemos hablado (contando los que llevamos de novios).\n\n' +
      'Y pues, ¿cómo no recordar aquella llamada que duró más de 3 horas? En donde nos hablamos, hablamos sobre nosotros, bromeamos y contamos historias. Desde ese día, con dudas, quise seguir hablándote para ver qué pasaba. ' +
      'Aunque cometí algunos errores a mediados de lo que nos hablamos, no me rendí y pedí perdón y seguí contigo, porque no me iba a rendir, porque sabía que contigo iba a ser diferente y especial. Y mírame, aún sigo hablando contigo, y no me arrepiento de nada, de seguir hablándote.\n\n' +
      'Durante todos estos 6 meses, te he conocido mejor y me doy cuenta de que eres una mujer tan fascinante, tan perfecta y tan única. Aprendí cosas que no sabía de ti, cuando iniciábamos a hablarnos (como saber el nombre de tu mamá JSJSJSJSJSJS). Y la verdad, quiero seguir conociéndote más, seguir sabiendo más de ti, saber cómo amarte y quererte, saber protegerte y, sobre todo, seguir enamorándome de ti.\n\n' +
      'Y tú también has sabido sobre mí, y me has hecho sentir especial, me has hecho sentir que soy importante para ti, y eso me hace sentir muy feliz. De verdad, gracias por quedarte conmigo, seguir amándome, seguir siendo tu novio, seguir al lado tuyo.\n\n' +
      'Y la verdad, deseo que lo de nosotros, tan único, no cambie, que sigamos así, que sigamos siendo felices, que sigamos amándonos y, sobre todo, que sigamos juntos. Quiero que lo de nosotros dure, que lleguemos lejos. Y que nuestro amor no se apague.\n\n' +
      'Y recuerda que para mí no existe nadie más: tú eres la niña de mis ojos, la única que quiero y amo, eres la persona más maravillosa y perfecta. Yo nunca te abandonaré, y siempre, siempre estaré a tu lado, apoyándote y ayudándote.\n\n' +
      'TE AMOOOOO DEMASIADO MI PRINCESA BELLA GUAPA PRECIOSA HERMOSA FASCINANTE ÚNICA PERFECTA MARAVILLOSA TIQUITA BONITA 😽💖💖💖💖💖' },
  { titulo: 'Te amo',    corazon: true, pantalla: true },
  { titulo: 'Sorpresa', bloqueado: true, pantalla: true, galeria: true }
];
const TEXTO_BOOM = '¡BOOOOOOOOM!';   // el texto de la explosión de caricatura

// Estrella de explosión estilo cómic: picos irregulares, rojo + amarillo + texto
function estrella(cx, cy, puntas, rExt, rInt, jitter) {
  const pts = [];
  for (let i = 0; i < puntas * 2; i++) {
    const ang = (i * Math.PI) / puntas;
    const r = (i % 2 === 0 ? rExt : rInt) + (Math.random() - 0.5) * jitter;
    pts.push((cx + r * Math.cos(ang)).toFixed(1) + ',' + (cy + r * Math.sin(ang)).toFixed(1));
  }
  return pts.join(' ');
}

function crearEstallido() {
  return `
    <svg class="comic" viewBox="0 0 400 400" aria-hidden="true">
      <polygon class="burst-out" points="${estrella(200, 200, 14, 195, 120, 26)}"/>
      <polygon class="burst-in"  points="${estrella(200, 200, 12, 150, 98, 18)}"/>
      <text x="200" y="238" text-anchor="middle" textLength="330" lengthAdjust="spacingAndGlyphs" transform="rotate(-7 200 200)">${TEXTO_BOOM}</text>
    </svg>`;
}

async function boom() {
  boomEl.innerHTML = crearEstallido();
  rueda.classList.add('on');          // el fondo se vuelve la rueda de colores
  boomEl.classList.add('go');
  document.body.classList.add('shake');

  // los cuadros aparecen uno tras otro
  await dormir(900);
  CUADROS.forEach(crearCuadro);
}

// Candado en SVG: el arco y dos mitades del cuerpo (con una grieta en zigzag) para poder romperlo
const CANDADO_SVG =
  '<span class="candado"><svg viewBox="0 0 40 48" aria-hidden="true">' +
  '<path class="sh" d="M11 23V15a9 9 0 0 1 18 0v8"/>' +
  '<path class="bl" d="M9 22H20L17 28L21 33L17 39L20 46H9a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4z"/>' +
  '<path class="br" d="M20 22H31a4 4 0 0 1 4 4V42a4 4 0 0 1-4 4H20L17 39L21 33L17 28Z"/>' +
  '</svg></span>';

function crearCuadro(c, i) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cuadro c' + (i + 1) + (c.bloqueado ? ' locked' : '');
  b.style.animationDelay = (i * 220) + 'ms';

  const cara = document.createElement('span');
  cara.className = 'cara';
  const icono = document.createElement('span');
  icono.className = 'icono';
  if (c.bloqueado) icono.innerHTML = CANDADO_SVG;
  const titulo = document.createElement('span');
  titulo.className = 'titulo';
  titulo.textContent = c.titulo;
  const visto = document.createElement('span');
  visto.className = 'visto';
  visto.textContent = '✓';
  if (c.corazon) {
    const cor = document.createElement('span');
    cor.className = 'corazon';
    cor.innerHTML = '<svg viewBox="0 0 32 29" aria-hidden="true"><path d="M16 27.5C16 27.5 2 18.3 2 9.6 2 5.2 5.4 2 9.4 2c2.9 0 5.2 1.6 6.6 4C17.4 3.6 19.7 2 22.6 2 26.6 2 30 5.2 30 9.6 30 18.3 16 27.5 16 27.5z"/></svg>';
    cor.append(titulo);
    cara.append(icono, cor, visto);
  } else {
    cara.append(icono, titulo, visto);
  }
  if (c.bloqueado) {
    const nota = document.createElement('span');
    nota.className = 'nota';
    nota.textContent = 'primero abre los otros';
    cara.append(nota);
  }
  b.append(cara);

  c.el = b;
  b.addEventListener('click', () => abrirCuadro(c));
  cuadrosEl.append(b);
  void b.offsetWidth;
  b.classList.add('in');
}

function abrirCuadro(c) {
  if (c.el.classList.contains('rompiendo')) return;   // se está rompiendo el candado
  const cara = c.el.querySelector('.cara');
  if (c.el.classList.contains('locked')) {      // bloqueado: se sacude
    cara.classList.remove('no');
    void cara.offsetWidth;
    cara.classList.add('no');
    return;
  }
  if (c.pantalla) {
    if (c.galeria) { c.visto = true; c.el.classList.add('visitado'); }
    abrirPantalla(c);   // en los cuadros con texto, "visto" se marca al terminar de escribirse
    return;
  }
  c.visto = true;
  c.el.classList.add('visitado');
  modalCard.classList.toggle('carta', !!c.carta);
  modalCard.scrollTop = 0;
  modalTitulo.textContent = c.titulo;
  modalTexto.textContent = c.texto;
  modal.classList.add('on');
  modal.setAttribute('aria-hidden', 'false');
}

function cerrarModal() {
  modal.classList.remove('on');
  modal.setAttribute('aria-hidden', 'true');
  revisarDesbloqueo();
}

function revisarDesbloqueo() {
  const faltan = CUADROS.some((c) => !c.bloqueado && !c.visto);
  if (faltan) return;
  CUADROS.forEach((c) => { if (c.bloqueado) desbloquear(c); });
}

// Se rompe el candado, el cuadro empieza a palpitar y lanza rayitos
function desbloquear(c) {
  const el = c.el;
  if (!el.classList.contains('locked') || el.classList.contains('rompiendo')) return;
  el.classList.add('rompiendo');
  const cara = el.querySelector('.cara');
  const icono = el.querySelector('.icono');
  const candado = icono.querySelector('.candado');

  candado.classList.add('rompe');                       // 1) tiembla...

  for (let i = 0; i < 10; i++) {                        // ...y salen trocitos dorados
    const t = document.createElement('span');
    t.className = 'trozo';
    const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 40;
    t.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
    t.style.setProperty('--dy', (Math.sin(ang) * dist - 10).toFixed(0) + 'px');
    t.style.setProperty('--g', (Math.random() * 540 - 270).toFixed(0) + 'deg');
    icono.append(t);
  }

  setTimeout(() => {                                    // 2) se rompe: se quita el gris y la nota
    el.classList.add('sin-gris');
    const nota = el.querySelector('.nota');
    if (nota) nota.remove();
  }, 600);

  setTimeout(() => {                                    // 3) aparece el regalo, palpita y lanza rayos
    icono.innerHTML = '<span class="regalo">🎁</span>';
    el.classList.remove('locked', 'rompiendo');
    cara.classList.add('palpita');
    lanzarRayos(el);
  }, 1500);
}

function lanzarRayos(el) {
  const rayos = document.createElement('div');
  rayos.className = 'rayos';
  const r0 = el.offsetWidth * 0.72;                     // empiezan justo fuera del cuadro
  for (let i = 0; i < 18; i++) {
    const r = document.createElement('span');
    r.className = 'rayo';
    r.style.setProperty('--a', (i * 20 + Math.random() * 10).toFixed(0) + 'deg');
    r.style.setProperty('--r0', r0.toFixed(0) + 'px');
    r.style.setProperty('--d', (Math.random() * 1.2).toFixed(2) + 's');
    r.style.setProperty('--t', (1.1 + Math.random() * 0.7).toFixed(2) + 's');
    rayos.append(r);
  }
  el.append(rayos);
}

document.getElementById('cerrar').addEventListener('click', cerrarModal);
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || logro.enCurso) return;
  if (tarjetaAbierta) cerrarTarjeta();
  else if (pantalla) cerrarPantalla();
  else cerrarModal();
});

// ---------- Cuadro que se expande a pantalla completa (como abrir una app) ----------
let pantalla = null;   // { c, papel, rot } mientras esté abierta

// Texto que se escribe sobre el fondo blanco (misma animación letra por letra).
const MENSAJES_PANTALLA = [
  { texto: 'Si te acuerdas, te dije en una llamada, que había algo que quería hacer en nuestro chat de WhatsApp. Pero no podía hacerlo por tiempo.', pausa: 3000 },
  { texto: 'Pues lo que quería hacer, era esto:', pausa: 1500 },
  { texto: 'Decirte “Te amo” 100 veces', pausa: 2200 },
  { texto: 'Peroooooooooooooooooo', pausa: 2200 },
  { texto: 'en 100 idiomas diferentes', pausa: 2200 }
];

// Lo que se escribe cuando termina la lista. La última línea se queda en pantalla.
const FINAL_PANTALLA = [
  { texto: 'Pues, esto era lo que quería hacer en nuestro chat', pausa: 2800 },
  { texto: 'Creo que seré el primero que te pueda decir 100 veces te amo en diferentes idiomas', pausa: 1800 }
];

// La cita del final. Pega aquí el fragmento de la canción que quieras.
const CITA = {
  texto: '... \nNo encuentro las palabras \nNi versos, rima o prosa \nQuizá con una rosa te lo pueda decir',
  autor: 'Luis Miguel',
  cancion: 'Sabes Una Cosa'
};

// LISTA DE "TE AMO": [idioma, frase]  (100 idiomas distintos)
const IDIOMAS = [
  ["Inglés", "I love you very much"],
  ["Francés", "Je t’aime très fort"],
  ["Italiano", "Ti amo tanto"],
  ["Portugués", "Eu te amo muito"],
  ["Alemán", "Ich liebe dich sehr"],
  ["Neerlandés", "Ik hou heel veel van je"],
  ["Catalán", "T’estimo molt"],
  ["Gallego", "Quérote moito"],
  ["Euskera", "Asko maite zaitut"],
  ["Rumano", "Te iubesc mult"],
  ["Sueco", "Jag älskar dig så mycket"],
  ["Noruego", "Jeg elsker deg så mye"],
  ["Danés", "Jeg elsker dig så meget"],
  ["Islandés", "Ég elska þig mjög mikið"],
  ["Finés", "Rakastan sinua kovasti"],
  ["Estonio", "Ma armastan sind väga"],
  ["Letón", "Es tevi ļoti mīlu"],
  ["Lituano", "Aš tave labai myliu"],
  ["Polaco", "Bardzo cię kocham"],
  ["Checo", "Moc tě miluji"],
  ["Eslovaco", "Veľmi ťa milujem"],
  ["Húngaro", "Nagyon szeretlek"],
  ["Croata", "Jako te volim"],
  ["Serbio", "Много те волим"],
  ["Esloveno", "Zelo te imam rad"],
  ["Macedonio", "Многу те сакам"],
  ["Búlgaro", "Обичам те много"],
  ["Albanés", "Të dua shumë"],
  ["Griego", "Σ'αγαπώ πολύ"],
  ["Turco", "Seni çok seviyorum"],
  ["Ruso", "Я тебя очень люблю"],
  ["Ucraniano", "Я тебе дуже люблю"],
  ["Bielorruso", "Я цябе вельмі кахаю"],
  ["Irlandés", "Tá grá mór agam duit"],
  ["Galés", "Rwy’n dy garu di’n fawr"],
  ["Gaélico escocés", "Tha gaol mòr agam ort"],
  ["Maltés", "Inħobbok ħafna"],
  ["Luxemburgués", "Ech hunn dech immens gär"],
  ["Afrikáans", "Ek is baie lief vir jou"],
  ["Latín", "Te valde amo"],
  ["Esperanto", "Mi amas vin multe"],
  ["Árabe", "أحبك كثيرًا"],
  ["Hebreo", "אני אוהב אותך מאוד"],
  ["Persa", "خیلی دوستت دارم"],
  ["Urdu", "میں تم سے بہت پیار کرتا ہوں"],
  ["Hindi", "मैं तुमसे बहुत प्यार करता हूँ"],
  ["Bengalí", "আমি তোমাকে অনেক ভালোবাসি"],
  ["Panyabí", "ਮੈਂ ਤੈਨੂੰ ਬਹੁਤ ਪਿਆਰ ਕਰਦਾ ਹਾਂ"],
  ["Guyaratí", "હું તને ખૂબ પ્રેમ કરું છું"],
  ["Maratí", "मी तुझ्यावर खूप प्रेम करतो"],
  ["Tamil", "நான் உன்னை மிகவும் காதலிக்கிறேன்"],
  ["Telugu", "నేను నిన్ను చాలా ప్రేమిస్తున్నాను"],
  ["Canarés", "ನಾನು ನಿನ್ನನ್ನು ತುಂಬಾ ಪ್ರೀತಿಸುತ್ತೇನೆ"],
  ["Malayalam", "ഞാൻ നിന്നെ വളരെ സ്നേഹിക്കുന്നു"],
  ["Nepalí", "म तिमीलाई धेरै माया गर्छु"],
  ["Cingalés", "මම ඔයාට ගොඩක් ආදරෙයි"],
  ["Chino mandarín", "我非常爱你"],
  ["Cantonés", "我好愛你"],
  ["Japonés", "とても愛してる"],
  ["Coreano", "너를 많이 사랑해"],
  ["Tailandés", "ผมรักเธอมาก"],
  ["Vietnamita", "Anh yêu em rất nhiều"],
  ["Indonesio", "Aku sangat mencintaimu"],
  ["Malayo", "Saya sangat cintakan awak"],
  ["Tagalo", "Mahal na mahal kita"],
  ["Javanés", "Aku tresna banget karo kowe"],
  ["Sundanés", "Abdi bogoh pisan ka anjeun"],
  ["Jemer", "ខ្ញុំស្រលាញ់អ្នកខ្លាំងណាស់"],
  ["Lao", "ຂ້ອຍຮັກເຈົ້າຫຼາຍ"],
  ["Birmano", "ကျွန်တော် မင်းကို အရမ်းချစ်တယ်"],
  ["Mongol", "Би чамд маш их хайртай"],
  ["Kazajo", "Мен сені өте жақсы көремін"],
  ["Uzbeko", "Seni juda yaxshi koʻraman"],
  ["Azerí", "Səni çox sevirəm"],
  ["Georgiano", "ძალიან მიყვარხარ"],
  ["Armenio", "Ես քեզ շատ եմ սիրում"],
  ["Pastún", "زه تا ته ډیر مینه لرم"],
  ["Kurdo", "Ez te pir hez dikim"],
  ["Suajili", "Nakupenda sana"],
  ["Zulú", "Ngiyakuthanda kakhulu"],
  ["Xhosa", "Ndiyakuthanda kakhulu"],
  ["Yoruba", "Mo nifẹ rẹ gan-an"],
  ["Igbo", "Hụrụ m gị n’anya nke ukwuu"],
  ["Hausa", "Ina son ki sosai"],
  ["Amhárico", "በጣም እወድሻለሁ"],
  ["Somalí", "Aad baan kuu jeclahay"],
  ["Malgache", "Tiako be ianao"],
  ["Shona", "Ndinokuda zvikuru"],
  ["Sesotho", "Ke o rata haholo"],
  ["Maorí", "Aroha nui ki a koe"],
  ["Hawaiano", "Aloha nui au iā ʻoe"],
  ["Samoano", "Ou te alofa tele ia te oe"],
  ["Tongano", "ʻOku ou ʻofa lahi atu kiate koe"],
  ["Fiyiano", "Au domoni iko vakalevu"],
  ["Tahitiano", "Ua here rahi vau ia oe"],
  ["Criollo haitiano", "Mwen renmen w anpil"],
  ["Quechua", "Anchata munayki"],
  ["Guaraní", "Che rohayhu ete"],
  ["Náhuatl", "Cenca nimitztlazohtla"],
  ["Maya yucateco", "Hach tin yaabiltech"]
];
const VEL_LISTA = 200;   // velocidad normal en píxeles por segundo (el botón la dobla)

async function mostrarLineas(papel, lineas, quedarUltima, activa) {
  for (let i = 0; i < lineas.length; i++) {
    if (!activa()) return;
    const { texto, pausa = 0 } = lineas[i];
    const { p, duracion } = crearLinea(texto);
    papel.append(p);
    await dormir(duracion + pausa);
    if (!activa()) return;
    if (quedarUltima && i === lineas.length - 1) return;   // la última se queda
    p.classList.add('out');
    await dormir(1500);
    p.remove();
    await dormir(700);
  }
}

// La lista de "Te amo" baja sola, como los créditos de una película.
function desplazarLista(papel, activa) {
  return new Promise((resolve) => {
    const caja = document.createElement('div');
    caja.className = 'lista';
    const pista = document.createElement('div');
    pista.className = 'pista';
    IDIOMAS.forEach(([idioma, frase, pron]) => {
      const it = document.createElement('div');
      it.className = 'idioma';
      const lin = document.createElement('span');          // "Francés: Je t'aime beaucoup"
      lin.className = 'linea';
      if (idioma) {
        const n = document.createElement('span'); n.className = 'nombre'; n.textContent = idioma + ':';
        lin.append(n, ' ');
      }
      const f = document.createElement('span'); f.className = 'frase'; f.textContent = frase; f.dir = 'auto';
      lin.append(f);
      it.append(lin);
      if (pron) { const r = document.createElement('span'); r.className = 'pron'; r.textContent = pron; it.append(r); }
      pista.append(it);
    });
    caja.append(pista);

    const cont = document.createElement('div');
    cont.className = 'contador';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vel';
    btn.textContent = 'x1';
    let vel = 1;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      vel = vel === 1 ? 2 : 1;
      btn.textContent = 'x' + vel;
      btn.classList.toggle('x2', vel === 2);
    });
    papel.append(caja, cont, btn);

    const alto = caja.clientHeight;
    const total = pista.offsetHeight;
    const itemH = pista.firstElementChild.offsetHeight;
    let y = alto;                                   // empieza por debajo de la pantalla
    let antes = performance.now();

    function limpiar() {
      caja.remove(); cont.remove(); btn.remove();
      resolve();
    }
    function paso(ahora) {
      if (!activa()) { limpiar(); return; }
      const dt = Math.min(0.1, (ahora - antes) / 1000);
      antes = ahora;
      y -= VEL_LISTA * vel * dt;
      pista.style.transform = `translateY(${y}px)`;

      const idx = Math.floor((alto / 2 - y) / itemH);
      cont.textContent = idx >= 0 ? `${Math.min(idx + 1, IDIOMAS.length)} / ${IDIOMAS.length}` : '';

      if (y <= -total) {                            // ya pasó el último
        caja.classList.add('sale'); cont.remove(); btn.remove();
        setTimeout(limpiar, 800);
        return;
      }
      requestAnimationFrame(paso);
    }
    pista.style.transform = `translateY(${y}px)`;
    requestAnimationFrame(paso);
  });
}

// ---------- Corazón hecho con las 100 frases ----------
const COLORES_CORAZON = ['#d4203e', '#e0405c', '#b8152f', '#cc2f4b'];
const U_MAX = 1.14, V_MAX = 1.235, V_RANGO = 2.235;   // medidas de la curva del corazón

function dentroCorazon(u, v) {
  const a = u * u + v * v - 1;
  return a * a * a - u * u * v * v * v <= 0;
}

// tramos [x1, x2] (en px) de una fila que están dentro del corazón
function tramosFila(y, W, H) {
  const v = V_MAX - (y / H) * V_RANGO;
  const res = [];
  let ini = null;
  for (let u = -1.2; u <= 1.2; u += 0.004) {
    const dentro = dentroCorazon(u, v);
    if (dentro && ini === null) ini = u;
    if (!dentro && ini !== null) { res.push([ini, u]); ini = null; }
  }
  if (ini !== null) res.push([ini, 1.2]);
  const k = (W / 2) / U_MAX;
  return res.map(([a, b]) => [W / 2 + a * k, W / 2 + b * k]);
}

function interseccion(A, B) {
  const r = [];
  for (const [a1, a2] of A) for (const [b1, b2] of B) {
    const s = Math.max(a1, b1), e = Math.min(a2, b2);
    if (e - s > 0) r.push([s, e]);
  }
  return r;
}

function segmentosFila(r, rh, W, H) {
  const y0 = r * rh;
  let seg = tramosFila(y0 + rh * 0.1, W, H);
  seg = interseccion(seg, tramosFila(y0 + rh * 0.5, W, H));
  seg = interseccion(seg, tramosFila(y0 + rh * 0.9, W, H));
  return seg.map(([a, b]) => [a + 3, b - 3]);
}

// Reparte las frases en filas siguiendo la forma del corazón
function armarCorazon(anchos100, fs, W, H) {
  const n = anchos100.length;
  const rh = fs * 1.42;
  const filas = Math.floor(H / rh);
  const gapMin = fs * 0.55;
  const palabras = [];
  let k = 0;
  for (let r = 0; r < filas; r++) {
    for (const [x1, x2] of segmentosFila(r, rh, W, H)) {
      const L = x2 - x1;
      if (L < fs * 2.5) continue;
      const fila = [];
      let suma = 0, anchoPalabras = 0;
      while (fila.length < 60) {
        const w = anchos100[k % n] * fs / 100;
        if (suma + (fila.length ? gapMin : 0) + w > L) break;
        suma += (fila.length ? gapMin : 0) + w;
        anchoPalabras += w;
        fila.push({ i: k % n, w });
        k++;
      }
      if (!fila.length) continue;
      let gap = fila.length > 1 ? (L - anchoPalabras) / (fila.length - 1) : 0;
      gap = Math.min(gap, fs * 2.5);
      const total = anchoPalabras + gap * (fila.length - 1);
      let x = x1 + (L - total) / 2;
      for (const f of fila) {
        palabras.push({ i: f.i, x, y: r * rh, rh });
        x += f.w + gap;
      }
    }
  }
  return { palabras, total: k };
}

async function corazonDePalabras(papel, activa) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const frases = IDIOMAS.map((x) => x[1]);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = '700 100px "Playfair Display", Georgia, serif';
  const anchos100 = frases.map((t) => ctx.measureText(t).width);

  const W = Math.min(innerWidth * 0.96, (innerHeight * 0.9) / 0.981, 820);
  const H = W * 0.981;

  // la letra más grande con la que caben las 100 frases
  let lo = 5, hi = 30;
  for (let it = 0; it < 18; it++) {
    const mid = (lo + hi) / 2;
    if (armarCorazon(anchos100, mid, W, H).total >= frases.length) lo = mid; else hi = mid;
  }
  const fs = lo;
  const { palabras } = armarCorazon(anchos100, fs, W, H);

  const top = (innerHeight - H) / 2;
  const cp = document.createElement('div');
  cp.className = 'cp';
  cp.style.cssText = `left:${(innerWidth - W) / 2}px;top:${top}px;width:${W}px;height:${H}px;`;
  const dentro = document.createElement('div');
  dentro.className = 'cp-in';
  palabras.forEach((p) => {
    const s = document.createElement('span');
    s.className = 'pal';
    s.textContent = frases[p.i];
    s.dir = 'auto';
    s.style.cssText = `left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;font-size:${fs.toFixed(2)}px;line-height:${p.rh.toFixed(1)}px;` +
                      `color:${COLORES_CORAZON[(p.i * 7) % COLORES_CORAZON.length]};animation-delay:${Math.round(Math.random() * 2600)}ms;`;
    dentro.append(s);
  });
  cp.append(dentro);
  papel.append(cp);
  void cp.offsetWidth;
  cp.classList.add('forma');
  return { cp, W, H, top };
}

function crearCita() {
  const f = document.createElement('figure');
  f.className = 'cita';
  const q = document.createElement('blockquote');
  q.textContent = CITA.texto;
  const c = document.createElement('figcaption');
  c.textContent = `— ${CITA.autor}, “${CITA.cancion}”`;
  f.append(q, c);
  return f;
}

async function escribirEnPantalla(papel) {
  const activa = () => pantalla && pantalla.papel === papel && !pantalla.cerrando;
  await mostrarLineas(papel, MENSAJES_PANTALLA, false, activa);
  if (!activa()) return;
  await desplazarLista(papel, activa);
  if (!activa()) return;
  await dormir(700);

  // 1) "Pues esto era lo que quería hacer"
  await mostrarLineas(papel, FINAL_PANTALLA.slice(0, 1), false, activa);
  if (!activa()) return;
  await dormir(400);

  // 2) el corazón se arma con las 100 frases
  const { cp, H, top } = await corazonDePalabras(papel, activa);
  await dormir(2600 + 700 + 3800);
  if (!activa()) return;

  // 3) el corazón sube y deja un espacio pequeño abajo para el mensaje
  const sf = Math.min(0.92, (innerHeight * 0.68) / H);
  cp.style.transform = `translateY(${14 - top}px) scale(${sf})`;
  const abajo = 14 + H * sf + 12;
  const cierre = document.createElement('div');
  cierre.className = 'cierre';
  cierre.style.top = abajo + 'px';
  papel.append(cierre);
  await dormir(1100);
  if (!activa()) return;

  // 4) el texto final y la cita
  await mostrarLineas(cierre, FINAL_PANTALLA.slice(1), true, activa);
  if (!activa()) return;
  await dormir(500);
  cierre.append(crearCita());
  await dormir(1200);
  if (activa()) {
    pantalla.lista = true;             // ya se puede tocar para volver
    pantalla.c.visto = true;           // recién ahora cuenta como visto (desbloquea la sorpresa)
    pantalla.c.el.classList.add('visitado');
  }
}

function abrirPantalla(c) {
  if (pantalla) return;
  const el = c.el;
  const rot = getComputedStyle(el).getPropertyValue('--rot').trim() || '0deg';
  const cor = el.querySelector('.corazon') || (c.galeria ? el.querySelector('.regalo') : null);
  const hr = cor ? cor.getBoundingClientRect() : null;

  // 1) el papel del cuadro, justo encima del cuadro original
  const papel = document.createElement('div');
  papel.className = 'pantalla';
  papel.style.left = el.offsetLeft + 'px';
  papel.style.top = el.offsetTop + 'px';
  papel.style.width = el.offsetWidth + 'px';
  papel.style.height = el.offsetHeight + 'px';
  papel.style.transform = `rotate(${rot})`;
  // Fondo blanco vacío: toca la pantalla (o Esc) para volver
  papel.addEventListener('click', () => {
    if (pantalla && pantalla.lista) cerrarPantalla();   // solo cuando ya terminó de escribirse
  });
  document.body.append(papel);

  // 2) una copia del corazón, que se agranda hasta desaparecer
  let clon = null, dx = 0, dy = 0, s = 1;
  if (hr) {
    clon = cor.cloneNode(true);
    clon.classList.add('corazon-clon');
    clon.style.left = hr.left + 'px';
    clon.style.top = hr.top + 'px';
    if (c.galeria) {                      // el regalo es un emoji: se copia su tamaño de letra
      clon.style.fontSize = getComputedStyle(cor).fontSize;
      clon.style.lineHeight = '1';
    } else {
      clon.style.width = hr.width + 'px';
    }
    document.body.append(clon);
    dx = innerWidth / 2 - (hr.left + hr.width / 2);
    dy = innerHeight / 2 - (hr.top + hr.height / 2);
    s = (Math.max(innerWidth, innerHeight) * 2.2) / hr.width;
  }

  el.style.visibility = 'hidden';     // el original se esconde; el papel toma su lugar
  void papel.offsetWidth;             // fija el punto de partida

  // 3) ¡a pantalla completa!
  papel.style.left = '0px';
  papel.style.top = '0px';
  papel.style.width = '100%';
  papel.style.height = '100%';
  papel.style.transform = 'rotate(0deg)';
  papel.classList.add('full');
  if (clon) {
    clon.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    clon.style.opacity = '0';
    setTimeout(() => clon.remove(), 1300);
  }
  setTimeout(() => {
    papel.classList.add('listo');
    if (c.galeria) introGaleria(papel); else escribirEnPantalla(papel);
  }, 800);
  pantalla = { c, papel, rot };
}

function cerrarPantalla() {
  if (!pantalla || pantalla.cerrando || logro.enCurso) return;
  pantalla.cerrando = true;
  pantalla.papel.querySelectorAll('.line, .cp, .cierre, .galeria').forEach((l) => l.classList.add('out'));
  const { c, papel, rot } = pantalla;
  const el = c.el;
  papel.classList.remove('listo');
  setTimeout(() => {                  // se encoge de vuelta al cuadro
    papel.classList.remove('full');
    papel.style.left = el.offsetLeft + 'px';
    papel.style.top = el.offsetTop + 'px';
    papel.style.width = el.offsetWidth + 'px';
    papel.style.height = el.offsetHeight + 'px';
    papel.style.transform = `rotate(${rot})`;
    setTimeout(() => {
      papel.remove();
      el.style.visibility = '';
      pantalla = null;
      revisarDesbloqueo();
    }, 750);
  }, 350);
}


// ---------- Galería de 40 tarjetas (como portadas de álbum) ----------

const TEXTO_INTRO_GALERIA = 'La sorpresa essss:';   // aparece grande, letra por letra, antes del menú
const GALERIA_TITULO = 'Las razones de cada canción que te he dedicado';

// ---- El "logro": las últimas tarjetas empiezan bloqueadas ----
// Cuando terminan de aparecer todos los cuadros, la pantalla se va a negro (sin tocar nada),
// salen estos textos, vuelven los cuadros, bajan hasta las últimas tarjetas y se desbloquean.
const TARJETAS_BLOQUEADAS = 2;    // cuántas tarjetas del final empiezan bloqueadas (0 = sin logro)
const LOGRO_ESPERA = 1500;        // ms que se quedan los cuadros a la vista antes de que empiece el logro
const LOGRO_TITULO = 'Acabas de desbloquear un nuevo logro (Baja)';
const LOGRO_TEXTO  = 'El logro: Has desbloqueado 2 canciones, que únicamente tenía guardadas para alguien tan especial, que tanto amo y que me ha cambiado muchas cosas de mí...';
const LOGRO_FINAL  = 'Ya puedes escucharlas porque ya las agregué a la playlist de canciones que te he dedicado';

const TARJETAS = [
  { titulo: 'Mi Bello Angel - Natanel Cano', color: '#08244B', texto: 'Yo te dedico esta cancion, porque contigo, he sentido cosas que no habia sentido con alguien mas. Tambien porque tu llegaste sin saberlo, llegaste cuando estaba saliendo de un momento tormentoso de mi vida, tu llegaste a calmar todo y volver a sentir la paz que no pude haber sentido. Tu llegaste a cambiar mis actitudes y mi forma de pensar, tal vez no eran tan malas, pero estaban equivocadas, cambiaste mi forma de amar a una persona y de cuidarla, cambiaste muchas cosas que no podria decirte al 100. Pero unicamente se, que llegaste a mi vida, y la mejoraste.' },
  { titulo: 'Dame Tu Querer - Raulin Rodriguez', color: '#63687A', texto: 'La dedico, porque cuando emepeze a hablarte y conocerte:vi a una mujer que estaba dañada por varios factores que no me gustaria mencionar, aunque sabia que no quería hacer daño, yo quise protegerte y no herirte mas.. Porque vi una gran mujer que por culpa de otros estaba tapada, pero yo intente y quise quitar esa manta para que resaltara esa gran mujer que tu eres, y lo logre. Aparte que menciona uno de los factores que mas me hipnotizan y me vuelven tontito, esos ojos verdes tan bonitos que llevas, que me dejan ciego por tanta belleza. Y pues, que mas que decirte que yo quiero para protegerte y darte todo el amor que tu mereces y hacerte sentir amada y querida por alguien.' },
  { titulo: '2+2 - Omar Camacho ft. Victor Mendivil', color: '#0D1E33', texto: 'Aunque la cancion de 2+2 contiene momentos inapropiados o momentos que son de fiestas. Pues, con algunas partes, tu me has robado el corazon, contigo he hecho varias cosas que han sido primera vez y que no sabia como hacerlas, pero contigo he podido hacerlo y saber como es hacerlo con la que mas amo. Saber que ya hay una "chaparrita" a la que he estado extrañando y que me ha enamorado muy fuertemente. Y pues, no puedo decirte mas por el tono de la cancion, pero contigo quiero pasarla para siempre y experimentar experencias o crear nuevos recuerdos contigo.' },
  { titulo: 'Anhelo - Adolescent’s Orchesta', color: '#C5A644', texto: 'Anhelo ha sido una de las canciones que mas he deseado dedicar. Pues, con esta, la dedico porque no he podido ver a una persona tan perfecta, alguien tan espectacular y maravillosa en este mundo, saber que tu existes es como decir que vi a un unicornio, es muy unico. Tambien quiero que tu seas la que siempre me acompañe en toda mi vida y que siempre se sienta segura y amada conmigo. Saber que tu existes, me hace querer siempre estar a tu lado. Y saber, que tu has iluminado mi camino y mi corazon... y no quiero que ese brillo se apague.' },
  { titulo: 'RUFF - Kapo', color: '#9C4E1B', texto: 'RUFF, ha sido una de las pocas de mis gustos que han podido no tocar temas subidos de tono. Pero yo quiero que aca veas desde una perspectiva desde la primera vez que te vi. Porque yo me quede sorprendido que alguien, asi como tu, quisite estar conmigo. Aunque, aun con miedo, acepte hablarte y seguir conociendote. \nEn unas partes, menciona cosas que puede sonar como contradictorias al mensaje bonito, pero quiero que sepas que esos fueron mis temores que tuve al inicio de hablarte. Pero veme, aun sigo contigo, sin los mismos temores que tuve al inicio. Y no quiero que vuelva a sentir eso porque, ahora, ya estoy con la mujer que yo deseaba y queria que me tocara. Tal vez este no tenga muchas cosas, por ser la cancion repetitiva y sin mencionar mas cosas, pero todo eso siento por ti.' },
  { titulo: 'Tu Eres - Frankie Ruiz', color: '#8A8E99', texto: 'Esta no habla con palabras vulgares, pero, hay una/s parte que tiene doble sentido. Asi que tomare partes que no son asi. \nBueno, te la dedico porque menciona que tu me has tenido muy enamorado, siento tu, me has flechado bastante. Contigo no he visto algo malo al que puedo decir "no gracias", sino, ha sido lo que me han estado enamorado. Con esos ojos tan bellos que me dicen mas que mil palabras, con esa carita tan hermosa como su forma de ser. Contigo he sentido ese flechazo que no quiero que se salga la flecha de mi corazon' },
  { titulo: 'ANGEL - Grupo Frontera ft. Romeo Santos', color: '#C6A476', texto: 'Te dedico esta, porque contigo ha parecido muy irreal que puedeas existir. Osea, como alguien asi como tu puede existir???, tu tienes ese algo que me gusta, que me hace enamorar y hacer quedarme para toda la vida. Contigo no habra mayor prueba de que pueda demostrar el amor que te tengo. Cuando fuimos novios, no crei que alguien podria amarme de tal manera, me quede en shock cuando vi como eres de amorosa. Y algo, no tan importante, lo fisico, que tu tienes esa forma tan perfecta, tienes las facciones mas hermosas y tan perfectas que son increibles de que alguien pueda ser asi. Y, aunque no sabia si alguien podria ser asi, tu ya estabas para mi, aunque no sabria quien era.' },
  { titulo: 'Deseandote - Frankie Ruiz', color: '#8A8E99', texto: 'La dedico, porque, fuiste y eres un deseo que yo quise para tener en la vida, fuiste tan perfecta para mis ojos que yo queria que tu fueras mia, y sabria que habria sido un error irme. Contigo. aun sigo queriendo que algun dias los 2 estemos juntos sin nadie que nos impida estar pegados como chicles, poder siempre estar juntos y no separados por un celular. Yo sabiendo que sali de un fracaso amoroso y tu tambien por lo mismos, aun asi quisimos conocernos y no volver a ser un fracaso, y miranos, seguimos aun y queriendonos bastante.' },
  { titulo: 'Chica Ideal - Sebastian Yatra ft. Guaynaa', color: '#67B3CC', texto: 'Te la dedico, porque tu has sido la mujer que yo siempre quise haber tenido. Tu has tenido varias cosas que me han enamorado y hacer que me siga quedando aun mas. Tu fuiste esa chispa que tuve para volver a confiar en el amor, fuiste la unica que me ha querido. Aunque en un inicio, tuvimos problemas, supe que lo ibamos a pasar y de que no nos aurrinaria, y eso sucede, hemos seguido aun. Contigo, siempre seras a la que siempre quere y amare durante toda la vida.' },
  { titulo: 'Te Quiero Amor - Pedro Conga', color: '#9C6E19', texto: 'Te la dedico, porque, tu has sido una de las personas a las que he querido nunca dejar de hablar o sentir nuevas cosas. Tu has hecho varias cosas que me has atrapado y que ahora parecen que tu eres la dueña de varias cosas. Contigo han sido varios días que siempre pienso en ti, que te amo y que te extraño. Como dice la cancion: Te quiero Amor y espero siempre dart el amor que te mereces y que nunca dejes de ser la niña de mis ojos.' },
  { titulo: 'Darte un Beso - Prince Royce', color: '#38414D', texto: 'Omitiendo algunas partes de la cancion. Te la dedico porque contigo yo podría hacer todo para poder demostrar el amor tan inmenso que te tengo, que haría un sinfin de cosas para poder estar contigo o poder al menos estar a tu lado. Que por ti podría hacer por ti, para hacerte feliz y hacerte sentir tan especial, como lo eres tú. Poder hacer varias cosas para que no te sientas sola o para que sientas que siempre vas a estar acompañada de alguien que siempre se sentirá orgullosa por todo lo que tu hagas.' },
  { titulo: 'Esta Cobardía - David Zagan', color: '#5A585E', texto: 'La dedico, porque muchas veces, me da una timidez de poder demostrarte el amor que te tengo. Porque siendo alguien tu perfecto, necesitaría varias cosas para poder si apenas llegar a un 1% de lo que tu eres. Puede ser que yo no demuestro muchas emociones, pero de verdad, yo siento varias cosas cuando me muestras cariño o que tú me ves com alguien especial, porque veo que alguien me demuestra un afecto. Puedes verme normal, pero cuando estoy a tu lado, siento varias emociones a la vez, pero se que la principal es enamoramiento y hacerme feliz, por estar con la mujer que más amo y el ser más perfecto del universo.' },
  { titulo: 'OHNANA - Kapo', color: '#6B855E', texto: 'Te dedico OHNANA. Porque al recordar en donde nos conocimos, me hace sentir un momento bonito, porque aun puedo recordar cuando nos vimos en el colegio, y puede apreciar esa hermosa mujer (que sin saberlo) se convertiría en la mujer de mis ojos y la de mi corazón. Me desviaré, pero mientras nos conocíamos más y llego el momento de ser novios, aun puedo recordar esa carita tan hermosa que me dijo "Si quiero ser tu novia" y sentir una felicidad. Y ahora, estar construyendo algo tan bonito, que quiero que llegue muy lejos. Y también apreciar una relación tan sana y bonita que ahora es raro verlo.' },
  { titulo: 'Casi un Hechizo - Jerry Rivera', color: '#6B5EA6', texto: 'Como dice el titulo, te la dedico porque contigo fue un hechizo que cuando te ví por primera vez. Para mí, tu eres una persona tan bonita, maravillosa, única y fascinante. Contigo puedo sentir una paz que no puedo sentir con alguien más, cada día mis ojos se deslumbran al poder ver que tu me escribes o cuando me mandas una fota, porque mis ojos están viendo una perfección de mujer. Sentir, con mis brazos, tu cuerpo cuando te abrazo o cuando nos agarramos la mano, conmigo me da una felicidad porque puedo sentir un contacto físico tan bello con alguien tan importante, como tu te volviste a mi vida.' },
  { titulo: 'ILY - Kapo ft. Myke Towers', color: '#9B8691', texto: 'Aunque ILY, aun siendo de Kapo, hay partes que son subidas de tono por el estilo de Myke Towers. Pero con el significado que tiene para mi la canción. Esque contigo quiero pasar toda la vida, juntos, pudiendo disfrutar varias experiencias contigo y poder estar felices los 2. Tambien sentir una química única que siento contigo y siempre estar a tu lado, aunque ya te hubiera visto. Sentir varías experencias, es como probar un nuevo plato de comida, se siente maravilloso y tan bueno, que no quisiera parar de probarla. Y tal vez, en un futuro poder estar juntos y poder hacer cosas que siempre hemos querido hacer juntos.' },
  { titulo: 'Busca Por Dentro - Grupo Niche', color: '#2B0505', texto: 'Pues con esta cancion, te la dedico. Porque se que puedo tener defectos, que no soy tal vez alguien tan especial o que soy muy desmadrozo. Pero, contigo, tú has podido ver mi forma de ser amoroso con otra persona, has sido alguien que puede ver todas mis formas porque con otra gente no he sido así. Puede ser que no tenga demasiadas cosas o demasiado que dar, pero muchas veces intento darte cosas para poder darte una parte del amor tan inmenso que te tengo, no tendré cosas de lujo o valor para poder dártelo, pero intento darte todo lo que tenga al alcanze. Aun tengo miedos, pero por ti, puedos superarlo y poder salir adelante y que esos miedos ya no vuelva y estar feliz contigo. Asi que, tal vez no sea tan perfecto, pero puedo darte lo que yo puedo hacer. ' },
  { titulo: 'Hecha pa Mi - Grupo Frontera', color: '#B49B85', texto: 'Pues, con esta es una de las canciones con las que más me identifico y te dedico. Ya que contigo, siento que tu estabas lista para mi, y yo para ti. Puede ser que no nos hayamos topado, pero creo que el mundo sabia en que momento hacerlo. La verdad, me siento muy afortunado de haberte encontrado y poder haber coincidido contigo. Cuando nos volvimos novios, sabia pude saber que el amor verdadero está contigo y con nadie más. Por ti podría cambiar todo lo que tu quieras para poder hacerte sentir cómoda y que tampoco me cansaría de ti que siempre estaré a tu lado apoyándote y amándote.' },
  { titulo: 'Hechizo de Luna - Edgar Joel ft. Antony Colon', color: '#2B6E6E', texto: 'La dedico, porque contigo pude sentir un gran aprecio y amor que pude sentir a primera vista. Cuando avanzábamos y me demostrabas más amor, tenía una sensación de encontrar por primera vez con un amor que parecía mágico, casi sobrenatural. Contigo he sentido esa magia que me faltaba, contigo pude sentir intensidad de este amor y esa novedad de ese amor que me transformó completamente mi vida. A pesar de que los sueños que he tenido contigo, son cortos o que terminan en un momento tan bonito, no me preocupo tanto porque recuerdo que, tú: eres real y que puedo hablarte.' },
  { titulo: 'POR SUS BESOS - Tito Double P', color: '#363132', texto: 'Aunque la canción tiene tema sobre alguien que perdió a su pareja y la extraña, con algunas partes de la cancion (específicamente el coro). La dedico porque, tu tienes varias razones por las que estoy tan enamorado de ti, cada cosa que puedo mencionar aparte de esas, me enamoran cada día más y me hacen quererte demasiado. Y en un momento, menciona algo que me pasaba muy seguido, me sentía solo cuando era el 14 de febrero, pero ahora se que con alguien podre estar el 14 de febrero durante mucho tiempo.' },
  { titulo: 'Contigo - Los Panchos', color: '#B7AA96', texto: 'Con esta cancion, sonara raro, pero me salen lágrimas por lo bonito que suena y la letra. Y la dedico, porque siento un profundo agradecimiento y empiezo a recordar momentos contigo, muchas veces destacando momentos felices vividos contigo. Y pues, que mas decirte, que contigo, puedo llegar a un futuro a casarme contigo y poder demostrarte sobre el gran amor que siento contigo y tan profundo que siento por ti. Y que contigo, has tenido un impacto positivo y transformador en mi vida.' },
  { titulo: 'Volare - Danny Ocean', color: '#2B2B2B', texto: 'Esta sabía que te la dedicaría a ley, porque contigo siento un inmenso amor y deseo que puede superar a las distancias que estemos. Tambien poder estar cerca contigo, de compartir momentos íntimos (pero sin cosas morbosas) y poder disfrutar de la compañía mutua que siento cuando estoy contigo, y, aunque no estemos en físico, no puede impediré que se se mantenga vivo el amor y aprecio que te tengo. Y pues, que contigo, podría superar el idioma y poder incluirme en culturas por poder amarte y estar contigo.' },
  { titulo: 'Piel Canela - Los Panchos', color: '#2B3B54', texto: 'Con esta cancion, aunque no me deja a llegar a sacar lágrimas, aun puedo sentir esa emotiva melodía. La dedico, porque aun recalco sobre la profunda admiración y amor que te tengo. Puede ser que pueda perder varias cosas, que me quede sin algo valioso, pero perderte a ti, me dolería bastante, preferiría perder todo a no perder ese amor tan bello que te tengo y tu me tienes. Y que tu siempre seas mi amor y mi amada que dure para toda la vida y que cualquier otra maravilla del mundo, se quedaría corta contigo.' },
  { titulo: '¿Qué Te Parece? - Grupo Frontera ft. Oscar Maydon', color: '#2B4666', texto: 'Con esta cancion, siendo colaboración con Oscar Maydon, hay más partes que puedo dedicarte. La dedico, porque cuando empezé a pensar en una vida contigo (y tu también)  yo te podría proponer un futuro juntos lleno de experiencias y promesas, que mi amor puede ser capaz de superar cualquier obstáculo. Y que contigo,  puedo ir a lugares exóticos y crear recuedos que sean inolvidables, pasando más allá de lo material, también quisiera tener momentos compartidas y estar dispuestos a hacer sacrificios para que tu puedas estar feliz y siempre contenta. Con está cancion quiero que veas que, contigo, todo lo puedo intentar y dártelo.' },
  { titulo: '¿Hasta Donde Te Quiero? - La Rondalla de Saltillo', color: '#E3E6E8', texto: 'La dedico, porque te digo el amor incondicional y sin límites que tengo contigo. Y también el gran sentimiento que siento de sentirme amado con alguien asi como tu. Yo siempre he estado en contra de la idea de que el amor pueda a llegar a ser medido o restringido por la distancia o el tiempo, conmigo, yo quiero que que el amor verdadero es eterno y que siempre está conmigo. Y que me siento insuficiente para adorarte a ti.' },
  { titulo: 'Salma Hayek - Luiz R. Conriquez ft. Grupo Frontera', color: '#9B8E7C', texto: 'Aunque, siendo Luiz R. Conriquez, Grupo Frontera siento que le bajó un poco de tono a la cancion que comúnmente hace Luiz R. Conriquez. Pero, con algunas partes te la dedico porque, la cancion compara (aunque no compararía en mi caso) a Salma Hayek, una actriz  con un atractivo universal. Pues tu conmigo, para mi tu eres la persona tan hermosa que ningún cuadro o actriz pueda compararte, y ni llegarte a los talones. Y pues, contigo solamente puedo decirte que está cancion describe la belleza que tienes.' },
  { titulo: 'Solo Me Faltabas Tu - La Maquinaria Norteña', color: '#B6C7D1', texto: 'Pues, te la dedico. Porque, contigo, puede encontrar a la mujer exacta que ahora da el sentido y plenitud a mi vida. Se qye puede haber pasado por momentos difíciles o de soledad, ahora, no me arrepiento de nada esa gran espera de haberte llegado a conocer. Y también se que tu has sido diferentes a las demás y que te hace tan hermosa por única y millones de cosas más.' },
  { titulo: 'Crayola - Danny Ocean', color: '#6E9C96', texto: 'Te la dedico, porque es una cancion que describe algo, que tu me llenas de una emoción intensa que parece infantil y que me haces sentir loquillo. Tambien por la emoción pura que siento cuando estoy profundamente enamorado de ti. Que me has transformando mi realidad en una obra de arte como la crayola JSJSJSJSJS. Y que, pues, que contigo me siento como en una obra de arte, porque ahora siento una gran diversidad de colores, luego de haber sentido una escala de grises.' },
  { titulo: 'Eres Ese Algo - La Maquinaria Norteña', color: '#E3DFDA', texto: 'Pues, sabiendo que tenias ese deseo que te la dedicara, pues te la dedico JSJSJSJS. Porque, aunque por el cambio de ritmo que tiene, la letra es la mas importante. Porque siento una conexión inexplicable que sentí cuando te conocí, yo se que tienes algo que no se que puedo decir, pero que que nadie más posee. Aparte de sentir atración física, yo siento admiración profunda por la forma de ser que tú eres. Antes sentia que vida estaba bien y que era vale madres, pero con tu llegada, me demostraste que era justo la pieza que faltaba para darme ese sentido, calma y felicidad a mis días aburridos' },
  { titulo: 'UWAIE - Kapo', color: '#C5BDB0', texto: 'Fun fact: es  una de las primeras canciones famosas de Kapo y unas de las cuales me gustó su estilo. Bueno, te le dedico, porque frobeat cálido y relajado, declaró el amor honesto y sin filtros que siento contigo. Tu, has sido un refugio emocional y una fuente constante de alegría de cada día. Muchas veces siento vulnerabilidad y esa entrega contigo, ya que la cancion expresa lo mucho que me tu gusta la compañía, y que prometo la lealtad, cariño genuino y estar ahí en todo momento, celebrando lo bonito que se siente quererte de verdad y sin fingir.' },
  { titulo: 'Amor Platónico - Los Tigres del Norte', color: '#9C8D79', texto: 'Esta cancion, te la dedico porque, contigo puedo describir ese enamoramiento tan profundo que siento contigo, que parece que no está a mi alcance, por la distancia o por el tiempo, siento que no te doy todo el amor que siento por ti. Contigo siento que ando soñando despierto, porque contigo siento la esperanza persistente de que algún día la vida nos junte para siempre y que podamos llegar a estar juntos y demostrarte todo mi amor sin estar en un celular.' },
  { titulo: 'QUÉDATE BEBÉ - Grupo Frontera', color: '#5C2434', texto: 'Fun Fact: Esta cancion yo la eschuché mucho, por es dolida. Asi que usare partes de la cancion, que son dolidas, para representar los miedos que tengo. \Te la dedico por parecer súplica directa, por tener unas vulnerabilidades muy sentimentales, porque tu eres la persona que tanto amo que no quisera que se aleje. Mucha parte, es ese miedo de perder a alguien que me ha hecho sentirme amado. Siento que sin tu presencia todo pierde color y sentido y vuelve a estar "bien" y sin colores. Y eso no quisera que nos pasara.' },
  { titulo: 'El Contagio - Los Tigres del Norte', color: '#3A3842', texto: 'Aunque parezca de broma. Esta te la dedico, porque contigo siento como ese "enfermedad" de haberme enamorado total contigo. Haberme "contagiado" del amor, la sonrisa y la forma de ser de ti, ha sido una enfermedad tan bonita y tan preciosa JSJSJSJJS. Pues, algo mas serio, tu amor se metió tan profundo en mi sistema y mi mente, que ya no tiene remedio ( y que ni quiero curarme), porque vivir así enamorado tanto de ti, es lo mejor que me ha pasado.' },
  { titulo: 'Ojitos Lindos - Bad Bunny ft. Bomba Estéreo', color: '#E67E66', texto: 'Con Bad Bunny, fue la unica que siento que no toca temas fuertes, pero hay partes que no usare. Pero la dedico, porque contigo miré a la persona correcta. Pues, es un ejemplo que, después de haber pasado por decepciones, estrés o momentos oscuros, basta con verte o ver esos ojos tan hermosos, me hacen sentir que todo está bien. Tambien quisiera poder sanar heridas que tuviste en un pasado y de desconectarse del mundo para que así veas, que te amo demasiado y de que tu eres la persona que mas amo en este mundo.' },
  { titulo: 'TU TU TU - Clave Especial', color: '#9B725B', texto: 'Con esta, si no puedo dedicarte varias partes, pero me quedare con el significado que le di yo para ti JSJSJSJSJ. Pues la dedico porque contigo senti esa química instantánea y la atracción hacia ti que robás todas las miradas donde sea que vaya. Contigo me siento bien porque siento una conexión única que tengo contigo (sabiendo que nos gustamos). Y dejo en claro, entre tanta gente, tú eres la única que realmente llamas toda mi atención.' },
  { titulo: 'Una Lady Como Tú - Manuel Turizo', color: '#2E4452', texto: 'Aunque, en una parte menciona algo que no quiero hacer contigo. Te la dedico porque dice sobre algo tan espectacular, que, como a una mujer como tu, destacas tu esencia, tu elegancia y tu autenticidad, diferenciandote por completo de todas las mujeres. Contigo siento interés respetuoso, que yo no busco algo pasajero, sino quiero demostrar que estoy dispuesto a esforzarme y darte el lugar especial que mereces para llenar tu corazon de amor.' },
  { titulo: 'Por Esos Ojos - Fuerza Regida', color: '#E60A00', texto: 'Pues, esta de Fuerza Regida me pashe, porque con unas lineas puedo dedicarte porque luego todo es de fiestas y mas cosas nada que ver. Pero te la dedico (con las partes necesarias) porque tu tienes mi absoluta mirada hacia ti, alguien tan especial. Tambien porque unos ojos me cautivan tanto que me haces perder la cabeza JSJSJSJSJ y estar dispuesto a hacer cualquier locura mia o detalle con tal de verte feliz y para que veas mi amor.' },
  { titulo: 'Alístate - Victor Mendivil ft. Anuel AA', color: '#6E5438', texto: 'Me sorprende que esta canción de Victor Mendivil puidera dedicarterla, pero obivamente hay partes que tiene temas subidos de tono. Pero te la dedico porque contigo siento esa complicidad de estar contigo, sin importar el lugar. Yo quiero dejes atrás el estrés, los problemas y las opiniones de los demás, enfocandome únicamente en pasar un momento inolvidable y exclusivo entre nostros los 2, y olvidando a esos lamebichos que mal te trataron anteriormente.' },
  { titulo: 'Vámonos - Victor Mendivil', color: '#6E5438', texto: 'Aun me soprende que esta no sea tan mal hablada o con temas de tono, SIENDO VICTOR MENDIVIL. Pero te la dedico, porque tengo esa iniciativa de irse a una salida contigo, alejándose del ruido o de cualquier obstáculo que se nos pueda atravesar. Tambien dice sobre esa seguridad y ganas de compartir un tiempo a solas contigo, dejando claro el interés de llevar esa conexión que tanto amo y aprecio que tienes conmigo.' },
  { titulo: 'Sabes Una Cosa - Luis Miguel', color: '#B8BCC0', texto: 'Pues esta, te la dedico. Porque te digo directamente, honestamente y profundamente los sentimientos que siento por ti. La dedico porque, ahora, es ese momento en el que ya no hay rodeos ni dudas y simplemente quieres demostrarte que mi amor nunca tendrá palabras, y que otra persona nunca sera mejor que tu. Porque tu, te has volvido lo más importante que me ha pasado en mi vida, lo mucho que significas para mi y lo que provoca en este mundo al que solo quiero que seamos tu y yo.' },
  { titulo: 'this is what falling in love feels like - JVKE', color: '#B89B2E', texto: 'Esta te le dedico porque: \nCuando hablo de enamorarme de una forma real e intensa, describo en esta cancion el punto exacto en el que ese amor que te tengo, deja de ser una simple ilusión pasajera y se convierte en una experiencia que me transforma por dentro. Contigo, siento esa sorpresa de darme cuenta de que alguien (tu) llegó para cambiarme por completo, como mi forma de ver el mundo, haciendo que los días ordinarios se sientan distintos, se sientan con más color y con más emociones que a veces ni siquiera puedo decirte en palabras comunes. \nPrecisamente, por eso esta cancion es el TOP 1 para las canciones que unicamente dedicaria 1 vez en la vida, porque, contigo he sentido el amor más grande de vida vida: porque no solo se trató de que me gustaste o de pasar un buen rato, sino sentirme lleno en un sentimiento profundo que me desarma y me ilumina al mismo tiempo. Con esta cancion, puedo decirte, que tú presencia volvió especial lo cotidiano, que despertó en mi emociones inolvidables y que amarte, ha marcado un antes y un después que no se borrará fácilmente.' }
];

// ---- de aquí para abajo ya no tienes que tocar nada ----


const COLOR_BASE = 'linear-gradient(135deg, #f2bdcd, #d26c93)';

function leerColor(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

// 1 color -> degradado (de más claro a más oscuro)
function hacerDegradado(hex) {
  const rgb = leerColor(hex);
  if (!rgb) return COLOR_BASE;
  const mez = (c, destino, p) => Math.round(c + (destino - c) * p);
  const claro  = `rgb(${rgb.map((c) => mez(c, 255, .35)).join(', ')})`;
  const oscuro = `rgb(${rgb.map((c) => mez(c, 0, .25)).join(', ')})`;
  return `linear-gradient(135deg, ${claro}, ${oscuro})`;
}

// ¿el color es tan claro que la letra blanca no se leería? (entonces se usa letra oscura)
function esClaro(hex, umbral = 0.62) {
  const rgb = leerColor(hex);
  if (!rgb) return false;
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 > umbral;
}

// "Canción - Artista"  ->  ['Canción', 'Artista']
function partirTitulo(titulo) {
  const i = titulo.indexOf(' - ');
  return i < 0 ? [titulo, ''] : [titulo.slice(0, i), titulo.slice(i + 3)];
}

// Los textos de abajo de la portada: la canción y, más chiquito, el artista
function crearTextosDisco(titulo) {
  const [cancion, artista] = partirTitulo(titulo);
  const bajo = document.createElement('span');
  bajo.className = 'bajo';
  const nom = document.createElement('span');
  nom.className = 'nom';
  nom.textContent = cancion;
  bajo.append(nom);
  if (artista) {
    const art = document.createElement('span');
    art.className = 'art';
    art.textContent = artista;
    bajo.append(art);
  }
  return bajo;
}

let tarjetaAbierta = null;
let logro = { iniciado: false, enCurso: false, hecho: false };   // estado del logro de las últimas tarjetas

const esBloqueada = (i, total) => TARJETAS_BLOQUEADAS > 0 && !logro.hecho && i >= total - TARJETAS_BLOQUEADAS;

// Texto grande sobre el fondo blanco; se desvanece y entonces aparece el menú de tarjetas
async function introGaleria(papel) {
  const activa = () => pantalla && pantalla.papel === papel && !pantalla.cerrando;
  const { p, duracion } = crearLinea(TEXTO_INTRO_GALERIA);
  p.classList.add('grande');
  papel.append(p);
  await dormir(duracion + 1800);        // se escribe y se queda un momento
  if (!activa()) return;
  p.classList.add('out');
  await dormir(1500);
  p.remove();
  await dormir(500);                    // un respiro antes del menú
  if (!activa()) return;
  mostrarGaleria(papel);
}

function mostrarGaleria(papel) {
  const g = document.createElement('div');
  g.className = 'galeria';

  const cab = document.createElement('div');
  cab.className = 'gal-cab';
  const volver = document.createElement('button');
  volver.type = 'button';
  volver.className = 'gal-volver';
  volver.setAttribute('aria-label', 'Volver');
  volver.textContent = '←';
  volver.addEventListener('click', (e) => { e.stopPropagation(); cerrarPantalla(); });
  const tit = document.createElement('h2');
  tit.className = 'gal-titulo';
  tit.textContent = typeof GALERIA_TITULO !== 'undefined' ? GALERIA_TITULO : 'Sorpresa';
  cab.append(volver, tit);

  const grid = document.createElement('div');
  grid.className = 'gal-grid';
  const lista = typeof TARJETAS !== 'undefined' ? TARJETAS : [];
  if (!lista.length) console.error('La lista TARJETAS está vacía: revisa el bloque const TARJETAS en script.js');
  lista.forEach((t, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'disco' + (esClaro(t.color) ? ' claro' : '');
    d.style.setProperty('--g', hacerDegradado(t.color));
    d.style.animationDelay = (i * 35) + 'ms';
    const num = document.createElement('span'); num.className = 'num'; num.textContent = String(i + 1).padStart(2, '0');
    const ok  = document.createElement('span'); ok.className = 'visto'; ok.textContent = '✓';
    d.append(num, crearTextosDisco(t.titulo || ''), ok);
    if (esBloqueada(i, lista.length)) {                 // candado encima, y se sacude si la tocan
      d.classList.add('bloqueado');
      const ic = document.createElement('span');
      ic.className = 'icono';
      ic.innerHTML = CANDADO_SVG;
      d.append(ic);
    } else if (logro.hecho && TARJETAS_BLOQUEADAS > 0 && i >= lista.length - TARJETAS_BLOQUEADAS) {
      d.classList.add('brillo');                        // ya desbloqueadas: se quedan con brillo
    }
    d.addEventListener('click', (e) => {
      e.stopPropagation();
      if (d.classList.contains('bloqueado')) {
        d.classList.remove('no');
        void d.offsetWidth;
        d.classList.add('no');
        return;
      }
      abrirTarjeta(t, d, papel);
    });
    grid.append(d);
  });

  g.append(cab, grid);
  papel.append(g);
  void g.offsetWidth;
  g.classList.add('on');
  programarLogro(papel);
}

// El cuadrito se agranda y aparece el texto
function abrirTarjeta(t, d, papel) {
  if (tarjetaAbierta) return;
  const pr = papel.getBoundingClientRect();
  const r = d.getBoundingClientRect();
  const origen = { left: r.left - pr.left, top: r.top - pr.top, width: r.width, height: r.height };
  const poner = (el, o) => {
    el.style.left = o.left + 'px'; el.style.top = o.top + 'px';
    el.style.width = o.width + 'px'; el.style.height = o.height + 'px';
  };
  const g = d.style.getPropertyValue('--g');
  const [cancion, artista] = partirTitulo(t.titulo || '');

  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.addEventListener('click', (e) => { e.stopPropagation(); cerrarTarjeta(); });

  const el = document.createElement('div');
  el.className = 'tarjeta';
  el.style.setProperty('--g', g);
  // Al expandirse conserva el color de su portada; con colores medio claros usa letra oscura para que se lea
  if (esClaro(t.color, 0.5)) el.classList.add('claro');
  poner(el, origen);

  const portada = document.createElement('div');           // lo que se ve cuando aún es un cuadrito
  portada.className = 'portada' + (d.classList.contains('claro') ? ' claro' : '');
  const pnum = document.createElement('span');
  pnum.className = 'num';
  pnum.textContent = d.querySelector('.num').textContent;
  portada.append(pnum, crearTextosDisco(t.titulo || ''));

  const cont = document.createElement('div');
  cont.className = 'tar-contenido';
  const h = document.createElement('h2');
  h.textContent = cancion;
  cont.append(h);
  if (artista) {
    const art = document.createElement('div');
    art.className = 'tar-art';
    art.textContent = artista;
    cont.append(art);
  }
  const cuerpo = document.createElement('div'); cuerpo.className = 'tar-cuerpo';
  cuerpo.textContent = t.texto || '';
  const pie = document.createElement('div'); pie.className = 'tar-pie';
  const cerrar = document.createElement('button');
  cerrar.type = 'button'; cerrar.className = 'cerrar'; cerrar.textContent = 'Cerrar';
  cerrar.addEventListener('click', (e) => { e.stopPropagation(); cerrarTarjeta(); });
  pie.append(cerrar);
  cont.append(cuerpo, pie);

  el.append(portada, cont);
  el.addEventListener('click', (e) => { e.stopPropagation(); });
  papel.append(velo, el);
  d.style.visibility = 'hidden';
  void el.offsetWidth;

  const W = Math.min(innerWidth - 24, 640), H = Math.min(innerHeight - 24, 780);
  poner(el, { left: (innerWidth - W) / 2, top: (innerHeight - H) / 2, width: W, height: H });
  el.classList.add('abierta');
  velo.classList.add('on');
  setTimeout(() => el.classList.add('listo'), 450);

  t.visto = true;
  d.classList.add('visitado');
  tarjetaAbierta = { el, velo, d, origen, poner };
}

function cerrarTarjeta() {
  if (!tarjetaAbierta || tarjetaAbierta.cerrando) return;
  tarjetaAbierta.cerrando = true;
  const { el, velo, d, origen, poner } = tarjetaAbierta;
  el.classList.remove('listo');
  setTimeout(() => {
    el.classList.remove('abierta');
    velo.classList.remove('on');
    poner(el, origen);
    setTimeout(() => {
      el.remove(); velo.remove();
      d.style.visibility = '';
      tarjetaAbierta = null;
    }, 650);
  }, 250);
}

// ---------- El logro: empieza solo cuando ya aparecieron todos los cuadros ----------
function programarLogro(papel) {
  if (logro.iniciado || logro.hecho || TARJETAS_BLOQUEADAS < 1) return;
  const activa = () => pantalla && pantalla.papel === papel && !pantalla.cerrando;
  const intentar = () => {
    if (logro.iniciado || logro.hecho || !activa()) return;   // si salió de la galería, se reintenta cuando vuelva
    if (tarjetaAbierta) { setTimeout(intentar, 500); return; } // si justo abrió una tarjeta, espera a que la cierre
    logro.iniciado = true;
    secuenciaLogro(papel);
  };
  setTimeout(intentar, LOGRO_ESPERA);
}

// Escribe una línea (letra por letra) dentro de la capa, la deja un momento y la desvanece
async function decirEnCapa(capa, texto, pausa, clase) {
  const { p, duracion } = crearLinea(texto);
  if (clase) p.classList.add(clase);
  capa.append(p);
  await dormir(duracion + pausa);
  p.classList.add('out');
  await dormir(1500);
  p.remove();
  await dormir(700);
}

// Se rompe el candado de una tarjeta y se queda con brillo
function desbloquearDisco(d) {
  const icono = d.querySelector('.icono');
  const candado = icono && icono.querySelector('.candado');
  if (candado) candado.classList.add('rompe');          // tiembla y se rompe
  if (icono) {
    for (let i = 0; i < 10; i++) {                      // trocitos dorados
      const t = document.createElement('span');
      t.className = 'trozo';
      const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 40;
      t.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
      t.style.setProperty('--dy', (Math.sin(ang) * dist - 10).toFixed(0) + 'px');
      t.style.setProperty('--g', (Math.random() * 540 - 270).toFixed(0) + 'deg');
      icono.append(t);
    }
  }
  setTimeout(() => d.classList.remove('bloqueado'), 600);                       // se quita el gris
  setTimeout(() => { if (icono) icono.remove(); d.classList.add('brillo'); }, 1500);   // y brilla
}

async function secuenciaLogro(papel) {
  logro.enCurso = true;
  const capa = document.createElement('div');           // tapa todo y bloquea los toques mientras pasa
  capa.className = 'logro';
  papel.append(capa);
  void capa.offsetWidth;

  // 1) todo se va a negro
  capa.classList.add('negro');
  await dormir(1800);
  await decirEnCapa(capa, LOGRO_TITULO, 2200, 'grande');
  await dormir(2600);                                   // (nada): un silencio en la oscuridad
  await decirEnCapa(capa, LOGRO_TEXTO, 3200);
  await dormir(500);

  // 2) otra vez los cuadritos: bajan hasta las últimas tarjetas
  capa.classList.remove('negro');
  await dormir(1400);
  const galeria = papel.querySelector('.galeria');
  if (galeria) galeria.scrollTo({ top: galeria.scrollHeight, behavior: 'smooth' });
  await dormir(2200);

  // 3) se desbloquean (el candado se rompe y quedan con brillo)
  logro.hecho = true;
  const bloq = Array.from(papel.querySelectorAll('.disco.bloqueado'));
  bloq.forEach(desbloquearDisco);                       // las dos al mismo tiempo
  await dormir(1800 + 1200);

  // 4) la pantalla se pone blanca un rato y sale el mensaje final
  capa.classList.add('blanco');
  await dormir(1700);
  await decirEnCapa(capa, LOGRO_FINAL, 3600);

  // 5) y vuelven los cuadros
  capa.classList.remove('blanco');
  await dormir(1500);
  capa.remove();
  logro.enCurso = false;
}

// ---------- Toque en el papel ----------
function toggle() {
  if (busy) return;
  busy = true;
  opened ? oscurecer() : abrir();
}

paper.addEventListener('click', toggle);
paper.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
});
