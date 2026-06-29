let misPosts = [];           // Datos originales de los posts
let nodosVisuales = [];      // Nodos dibujados: uno por (post, categoría)
let conexionesActivas = [];
let datosCargados = false;

let MARGEN_BORDE = 60;
let MARGEN_IZQUIERDO = 240;
let RADIO_DETECCION = 20;
let MAX_CONEXIONES_POR_NODO = 10;
let DISTANCIA_MAXIMA_CONEXION = 100;

let categoriaColor = {};
let categoriasUnicas = [];
let tooltipPost = null;

let font;

function preload() {
    misPosts = loadJSON("data/contenidos.json", datosCargadosCallback);
    font = loadFont('../fonts/PixelifySans-Medium.ttf');
}

function datosCargadosCallback(data) {
    if (Array.isArray(data) && data.length > 0) {
        misPosts = data;

        // 1. Recolectar TODAS las categorías (de cualquier posición)
        let setCategorias = new Set();
        for (let p of misPosts) {
            for (let cat of p.categorias) {
                setCategorias.add(cat);
            }
        }
        categoriasUnicas = Array.from(setCategorias).sort();

        // 2. Asignar color a cada categoría
        for (let i = 0; i < categoriasUnicas.length; i++) {
            let hue = map(i, 0, categoriasUnicas.length, 0, 360);
            categoriaColor[categoriasUnicas[i]] = color(hue, 80, 100);
        }

        datosCargados = true;
        console.log(`✅ Datos: ${misPosts.length} posts, ${categoriasUnicas.length} categorías.`);
        if (typeof iniciarLayout === 'function') {
            iniciarLayout();
        }
    } else {
        console.error("❌ El JSON no es un array válido:", data);
    }
}

function setup() {
      let container = document.getElementById('linea-tiempo');
      
  let w = container.clientWidth;
  let h = container.clientHeight;
  let canvas = createCanvas(w, h);
  canvas.parent('linea-tiempo');
    iniciarLayout();
    textFont(font);
    
}

function iniciarLayout() {
    if (!Array.isArray(misPosts) || misPosts.length === 0) {
        console.error("❌ misPosts no es un array válido.");
        return;
    }

    let fechas = misPosts.map(p => new Date(p.fecha).getTime());
    let minFecha = Math.min(...fechas);
    let maxFecha = Math.max(...fechas);

    let margenIzq = MARGEN_IZQUIERDO;
    let margenDer = MARGEN_BORDE;
    let margenSup = MARGEN_BORDE;
    let margenInf = MARGEN_BORDE + 30;

    // Crear nodos visuales: uno por (post, categoría)
    nodosVisuales = [];
    for (let post of misPosts) {
        let t = (new Date(post.fecha).getTime() - minFecha) / (maxFecha - minFecha || 1);
        let x = t * (width - margenIzq - margenDer) + margenIzq;

        for (let cat of post.categorias) {
            let idx = categoriasUnicas.indexOf(cat);
            let altoDisponible = height - margenSup - margenInf;
            let filaAlto = (altoDisponible - 5) / categoriasUnicas.length;
            let y = margenSup + idx * filaAlto + filaAlto / 2;

            nodosVisuales.push({
                post: post,          // referencia al post original
                categoria: cat,
                x: x,
                y: y,
                velX: 0,
                velY: 0
            });
        }
    }

    actualizarConexiones();
    console.log(`✅ Layout: ${nodosVisuales.length} nodos visuales, ${conexionesActivas.length} conexiones.`);
}

function draw() {
    console.log("Categorías totales:", categoriasUnicas.length);
console.log("Nodos visuales:", nodosVisuales.length);
    background(0);
    if (!datosCargados || !Array.isArray(misPosts) || misPosts.length === 0) {
        fill(255);
        textAlign(CENTER);
        text("Cargando datos...", width / 2, height / 2);
        return;
    }

    // --- Líneas horizontales separadoras y etiquetas de categoría ---
    let margenSup = MARGEN_BORDE;
    let margenInf = MARGEN_BORDE + 30;
    let altoDisponible = height - margenSup - margenInf;
    let filaAlto = (altoDisponible - 5) / categoriasUnicas.length;

    stroke(50, 80);
    strokeWeight(2);
    for (let i = 0; i < categoriasUnicas.length; i++) {
        let y = margenSup + i * filaAlto;
        if (i > 0) {
            line(0, y, width, y);
        }
    }
    let yFinal = margenSup + categoriasUnicas.length * filaAlto;
    line(0, yFinal, width, yFinal);

    textSize(11);
    textAlign(LEFT, CENTER);
    for (let i = 0; i < categoriasUnicas.length; i++) {
        let y = margenSup + i * filaAlto + filaAlto / 2;
        let col = categoriaColor[categoriasUnicas[i]] || color(255);
        fill(col);
        noStroke();
        text(categoriasUnicas[i].toUpperCase(), 10, y);
    }

    // --- Escala temporal (años) ---
    let minFecha = Math.min(...misPosts.map(p => new Date(p.fecha).getTime()));
    let maxFecha = Math.max(...misPosts.map(p => new Date(p.fecha).getTime()));
    let rangoAnios = (maxFecha - minFecha) / (1000 * 60 * 60 * 24 * 365.25);
    let step = Math.ceil(rangoAnios / 10);
    let anioInicio = new Date(minFecha).getFullYear();
    let anioFin = new Date(maxFecha).getFullYear();
    let numMarcas = Math.min(10, Math.floor(rangoAnios / step) + 1);
    if (numMarcas < 2) numMarcas = 2;
    step = Math.ceil((anioFin - anioInicio) / (numMarcas - 1));

    let margenIzq = MARGEN_IZQUIERDO;
    fill(150, 150, 150, 100);
    textAlign(CENTER, TOP);
    for (let a = anioInicio; a <= anioFin; a += step) {
        let t = (new Date(a, 0, 1).getTime() - minFecha) / (maxFecha - minFecha || 1);
        let x = t * (width - margenIzq - MARGEN_BORDE) + margenIzq;
        if (x > width - MARGEN_BORDE) break;
        textSize(12);
        stroke(50);
        strokeWeight(1);
        line(x, height - margenInf + 5, x, height - margenInf - height);
        noStroke();
        fill(200);
        text(a, x, height - margenInf + 15);
    }

    // --- Detectar nodo bajo el mouse para tooltip ---
    tooltipPost = null;
    let minDist = RADIO_DETECCION;
    for (let nodo of nodosVisuales) {
        let d = dist(mouseX, mouseY, nodo.x, nodo.y);
        if (d < minDist) {
            minDist = d;
            tooltipPost = nodo;
        }
    }

    // --- Dibujar nodos ---
    noStroke();
    for (let nodo of nodosVisuales) {
        let esRevista = nodo.post.categorias.some(cat => {
            let c = cat.toLowerCase();
            return c.includes('revista') || c.includes('número') || c.includes('editorial');
        });
        let radio = esRevista ? 16 : 5;

        let col = categoriaColor[nodo.categoria] || color(255);
        fill(col);

        if (nodo === tooltipPost) {
            fill(red(col), green(col), blue(col), 220);
            ellipse(nodo.x, nodo.y, (radio + 10) * 2, (radio + 10) * 2);
            fill(col);
        }
            fill(255, 15);
        ellipse(nodo.x, nodo.y, radio * 2, radio * 2);
    }

    // --- Tooltip ---
    if (tooltipPost) {
        let titulo = tooltipPost.post.titulo || "Sin título";
        let categorias = tooltipPost.post.categorias.join(", ");
        let fecha = tooltipPost.post.fecha || "Sin fecha";
        let texto = titulo + "\n" + categorias + "\n" + fecha;

        textSize(12);
        textAlign(LEFT, TOP);

        // dos condiciones, si es mas largo que el titulo, si es mas largo que categorias, todo el resto
        let ancho = textWidth(titulo) + 50;

        let lineas = texto.split('\n');
        let alto = lineas.length * 16 + 12;

        let tx = mouseX + 15;
        let ty = mouseY + 15;

        // tx deberia verse afectado por el condicional de ancho
        if (tx + ancho > width) tx = mouseX - ancho - 15;
        
        if (ty + alto > height) ty = mouseY - alto - 15;

        fill(30, 30, 30, 230);
        noStroke();
        rect(tx, ty, ancho, alto, 5);

        fill(255);
        let yOff = 6;
        for (let i = 0; i < lineas.length; i++) {
            let sub = lineas[i];
            if (i === 0) {
                textStyle(BOLD);
                textSize(12);
            } else {
                textStyle(NORMAL);
                textSize(10);
            }
            text(sub, tx + 8, ty + yOff);
            yOff += (i === 0 ? 16 : 14);
        }
        textStyle(NORMAL);
    }
}

// --- Actualizar conexiones entre nodos de la misma categoría ---
function actualizarConexiones() {
    conexionesActivas = [];
    let n = nodosVisuales.length;
    let contador = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n && contador[i] < MAX_CONEXIONES_POR_NODO; j++) {
            // Solo conectar si son de la misma categoría
            if (nodosVisuales[i].categoria !== nodosVisuales[j].categoria) continue;

            // Calcular distancia en X (temporal)
            let d = abs(nodosVisuales[i].x - nodosVisuales[j].x);
            if (d < DISTANCIA_MAXIMA_CONEXION) {
                conexionesActivas.push({ i, j });
                contador[i]++;
                contador[j]++;
            }
        }
    }
}

function windowResized() {
  let container = document.getElementById('linea-tiempo');
  resizeCanvas(container.clientWidth, container.clientHeight);
  if (typeof iniciarLayout === 'function') iniciarLayout();
}