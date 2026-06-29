(function() {
    let misPosts = [];
    let nodosVisuales = [];
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
            let todos = data;
            misPosts = todos.filter(post => 
                post.categorias.some(cat => cat.toLowerCase() === 'revista')
            );

            if (misPosts.length === 0) {
                console.warn("⚠️ No se encontraron posts con 'Revista'.");
                datosCargados = true;
                return;
            }

            let setCategorias = new Set();
            for (let p of misPosts) {
                for (let cat of p.categorias) {
                    setCategorias.add(cat);
                }
            }
            categoriasUnicas = Array.from(setCategorias).sort();

            for (let i = 0; i < categoriasUnicas.length; i++) {
                let hue = map(i, 0, categoriasUnicas.length, 0, 360);
                categoriaColor[categoriasUnicas[i]] = color(hue, 80, 100);
            }

            datosCargados = true;
            console.log(`✅ Solo Revista: ${misPosts.length} posts, ${categoriasUnicas.length} categorías.`);
            if (typeof iniciarLayout === 'function') {
                iniciarLayout();
            }
        } else {
            console.error("❌ El JSON no es un array válido:", data);
        }
    }

    function setup() {
        let container = document.getElementById('revista-container');
        console.log('📐 revista-container:', container.offsetWidth, container.offsetHeight);
        
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
            console.warn('⏳ Contenedor revista sin tamaño, reintentando...');
            setTimeout(() => {
                let w = container.offsetWidth || 800;
                let h = container.offsetHeight || 600;
                createCanvas(w, h).parent('revista-container');
                iniciarLayout();
                textFont(font);
                windowResized();
            }, 100);
            return;
        }

        let w = container.offsetWidth;
        let h = container.offsetHeight;
        createCanvas(w, h).parent('revista-container');
        iniciarLayout();
        textFont(font);
        windowResized();
    }

    function iniciarLayout() {
        if (!Array.isArray(misPosts) || misPosts.length === 0) {
            console.error("❌ misPosts no es un array válido o está vacío.");
            return;
        }

        let fechas = misPosts.map(p => new Date(p.fecha).getTime());
        let minFecha = Math.min(...fechas);
        let maxFecha = Math.max(...fechas);

        let margenIzq = MARGEN_IZQUIERDO;
        let margenDer = MARGEN_BORDE;
        let margenSup = MARGEN_BORDE;
        let margenInf = MARGEN_BORDE + 30;

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
                    post: post,
                    categoria: cat,
                    x: x,
                    y: y,
                    velX: 0,
                    velY: 0
                });
            }
        }

        actualizarConexiones();
        console.log(`✅ Layout revista: ${nodosVisuales.length} nodos visuales, ${conexionesActivas.length} conexiones.`);
    }

    function draw() {
        background(20);
        if (!datosCargados) {
            fill(255);
            textAlign(CENTER);
            text("Cargando datos...", width / 2, height / 2);
            return;
        }
        if (misPosts.length === 0) {
            fill(255);
            textAlign(CENTER);
            text("No se encontraron posts de revista.", width / 2, height / 2);
            return;
        }

        // --- Líneas horizontales y etiquetas ---
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

        // --- Escala temporal ---
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

        // --- Tooltip ---
        tooltipPost = null;
        let minDist = RADIO_DETECCION;
        for (let nodo of nodosVisuales) {
            let d = dist(mouseX, mouseY, nodo.x, nodo.y);
            if (d < minDist) {
                minDist = d;
                tooltipPost = nodo;
            }
        }

        // --- Nodos ---
        noStroke();
        for (let nodo of nodosVisuales) {
            let esRevista = nodo.post.categorias.some(cat => {
                let c = cat.toLowerCase();
                return c.includes('revista') || c.includes('número') || c.includes('editorial');
            });
            let radio = esRevista ? 16 : 6;

            let col = categoriaColor[nodo.categoria] || color(255);
            fill(col);
            ellipse(nodo.x, nodo.y, radio * 2, radio * 2);

            if (esRevista) {
                noFill();
                stroke(255, 100);
                strokeWeight(1);
                ellipse(nodo.x, nodo.y, (radio + 4) * 2, (radio + 4) * 2);
            }
        }

        // --- Tooltip texto ---
        if (tooltipPost) {
            let titulo = tooltipPost.post.titulo || "Sin título";
            let categorias = tooltipPost.post.categorias.join(", ");
            let fecha = tooltipPost.post.fecha || "Sin fecha";
            let texto = titulo + "\n" + categorias + "\n" + fecha;

            textSize(12);
            textAlign(LEFT, TOP);
            let ancho = textWidth(titulo) + 50;
            let lineas = texto.split('\n');
            let alto = lineas.length * 16 + 12;

            let tx = mouseX + 15;
            let ty = mouseY + 15;
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

    function actualizarConexiones() {
        conexionesActivas = [];
        let n = nodosVisuales.length;
        let contador = new Array(n).fill(0);

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n && contador[i] < MAX_CONEXIONES_POR_NODO; j++) {
                if (nodosVisuales[i].categoria !== nodosVisuales[j].categoria) continue;
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
        let container = document.getElementById('revista-container');
        if (container) {
            let w = container.offsetWidth || 800;
            let h = container.offsetHeight || 600;
            resizeCanvas(w, h);
            if (datosCargados) iniciarLayout();
        }
    }

    window.preload = preload;
    window.setup = setup;
    window.draw = draw;
    window.windowResized = windowResized;
})();