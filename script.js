/*
  Trabalho Prático de Computação Gráfica - Canvas Interativo

  Recursos implementados:
  - Grade cartesiana centrada no meio do canvas com pixels (quadrados) visíveis.
  - Ferramentas de Rasterização: Reta (Bresenham), Círculo (Ponto Médio), Elipse, Curva de Bézier e Polilinhas.
  - Preenchimento: Flood Fill (iterativo) e Scanline.
  - Recorte: Recorte de Linha (Cohen-Sutherland) e de Polígono (Sutherland-Hodgman).
  - Transformações 2D: Translação, Rotação e Escala com ponto de referência.
  - Projeções 3D: Ortográfica, Perspectiva, Cavalier e Cabinet.
*/

// --- CONFIGURAÇÃO INICIAL DO CANVAS ---
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
let width = canvas.width, height = canvas.height;

// --- ESTADO GLOBAL DA APLICAÇÃO ---
// Objeto que armazena todas as variáveis importantes que controlam o estado da aplicação.
const state = {
  pixelSize: 10,      // pixels por unidade do mundo (controla o tamanho do quadrado)
  showGrid: true,
  originX: Math.floor(width/2),
  originY: Math.floor(height/2),
  drawingColor: '#06b6d4',
  bgColor: '#071226',
  gridColor: 'rgba(255,255,255,0.03)',
  axisColor: 'rgba(255,255,255,0.08)',
  pixelOutline: 'rgba(255,255,255,0.02)',
  currentTab: 'bresenham',
  mouseDown: false,
  points: [],
  tempPoly: [],       // armazena vértices do polígono sendo desenhado
  shapes: []          // armazena todas as formas desenhadas (para transformações e redesenho)
};

// --- FUNÇÕES UTILITÁRIAS DE COORDENADAS ---

// Converte coordenadas do nosso "mundo" (plano cartesiano) para coordenadas da tela (canvas).
function worldToScreen(wx, wy){
  const x = state.originX + wx * state.pixelSize;
  const y = state.originY - wy * state.pixelSize; // O eixo Y é invertido no canvas
  return {x: Math.round(x), y: Math.round(y)};
}
// Converte coordenadas da tela (canvas) de volta para as do nosso "mundo".
function screenToWorld(sx, sy){
  const wx = (sx - state.originX) / state.pixelSize;
  const wy = (state.originY - sy) / state.pixelSize;
  return {x: wx, y: wy};
}


// --- FUNÇÕES DE DESENHO E RENDERIZAÇÃO ---

// Função principal para desenhar um "pixel" (na forma de um quadrado) no nosso mundo.
function drawPixel(wx, wy, color){
  const p = worldToScreen(wx, wy);
  const s = state.pixelSize;
  ctx.fillStyle = color || state.drawingColor;
  // Desenha um quadrado preenchido centrado na coordenada do mundo.
  ctx.fillRect(p.x - s/2 + 0.5, p.y - s/2 + 0.5, s, s);
  ctx.strokeStyle = state.pixelOutline;
  ctx.strokeRect(p.x - s/2 + 0.5, p.y - s/2 + 0.5, s, s);
}

// Limpa o canvas e desenha a grade novamente.
function clearCanvas(){
  ctx.clearRect(0,0,width,height);
  drawGrid();
}

// Desenha o fundo, a grade de pixels e os eixos X e Y.
function drawGrid(){
  ctx.fillStyle = state.bgColor;
  ctx.fillRect(0,0,width,height);

  if(!state.showGrid) return;

  const s = state.pixelSize;
  // Desenha as linhas da grade vertical e horizontal
  ctx.lineWidth = 1;
  for(let gx = state.originX % s; gx < width; gx += s){
    ctx.beginPath();ctx.moveTo(gx+0.5,0);ctx.lineTo(gx+0.5,height);ctx.strokeStyle = state.gridColor;ctx.stroke();
  }
  for(let gy = state.originY % s; gy < height; gy += s){
    ctx.beginPath();ctx.moveTo(0,gy+0.5);ctx.lineTo(width,gy+0.5);ctx.strokeStyle = state.gridColor;ctx.stroke();
  }
  // Desenha os eixos principais (X e Y) com uma cor mais forte.
  ctx.beginPath();ctx.moveTo(state.originX+0.5,0);ctx.lineTo(state.originX+0.5,height);ctx.strokeStyle=state.axisColor;ctx.lineWidth=1.6;ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,state.originY+0.5);ctx.lineTo(width,state.originY+0.5);ctx.strokeStyle=state.axisColor;ctx.lineWidth=1.6;ctx.stroke();
}

// Redesenha todas as formas que estão armazenadas no array `state.shapes`.
function redrawAll(){
  clearCanvas();
  // Legenda da origem
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('(0,0)', state.originX+6, state.originY-6);
  // Itera sobre todas as formas e as desenha de acordo com seu tipo.
  for(const s of state.shapes){
    if(s.type === 'pixels' || s.type === 'line'){
      for(const p of s.data) drawPixel(p.x,p.y,s.color);
    } else if(s.type === 'poly'){
      const polyPixels = Polyline.createPixels(s.data, true); // true para polígono fechado
      for(const p of polyPixels) drawPixel(p.x, p.y, s.color);
    }
  }
}

function undoLastAction() {
  if (state.shapes.length > 0) {
    state.shapes.pop(); // Remove o último elemento do array
    redrawAll();      // Redesenha o canvas com as formas restantes
  } else {
    console.log("Nada para desfazer.");
  }
}

// ===============================================
// --- MÓDULOS DE ALGORITMOS DE COMPUTAÇÃO GRÁFICA ---
// ===============================================

/**
 * Algoritmo de Bresenham para Rasterização de Retas.
 * Lógica: Utiliza apenas aritmética inteira e um "termo de erro" para determinar qual
 * pixel subsequente está mais próximo da linha ideal. A cada passo no eixo dominante
 * (X ou Y), o termo de erro é atualizado para decidir se o outro eixo também deve
 * ser incrementado, tornando o algoritmo muito eficiente.
 */
const Bresenham = {
  line: function(x0,y0,x1,y1){
    const points = [];
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, e2;
    let x = x0, y = y0;
    while(true){
      points.push({x, y});
      if(x === x1 && y === y1) break;
      e2 = 2*err;
      if(e2 >= dy){ err += dy; x += sx; }
      if(e2 <= dx){ err += dx; y += sy; }
    }
    return points;
  }
};

/**
 * Algoritmo do Ponto Médio para Rasterização de Círculos.
 * Lógica: Otimizado para calcular os pixels de apenas um octante (1/8 do círculo)
 * e depois espelhar esses pontos para os outros 7 octantes por simetria. Usa um
 * parâmetro de decisão para escolher eficientemente entre dois pixels candidatos
 * a cada passo, com base em qual deles está mais próximo do círculo ideal.
 */
const Circle = {
  raster: function(cx, cy, r){
    const pts = [];
    let x = 0, y = Math.round(r), d = 1 - Math.round(r);
    while(x <= y){
      // Adiciona os 8 pontos simétricos
      const candidates = [
        {x: cx + x, y: cy + y}, {x: cx + y, y: cy + x},
        {x: cx - x, y: cy + y}, {x: cx - y, y: cy + x},
        {x: cx + x, y: cy - y}, {x: cx + y, y: cy - x},
        {x: cx - x, y: cy - y}, {x: cx - y, y: cy - x}
      ];
      for(const c of candidates) pts.push(c);
      if(d < 0){ d += 2*x + 3; }
      else{ d += 2*(x - y) + 5; y--; }
      x++;
    }
    // Remove duplicados para um desenho mais limpo
    const uniq = {}; const out = [];
    for(const p of pts){ const k = p.x+','+p.y; if(!uniq[k]){uniq[k]=1; out.push(p);} }
    return out;
  }
};

/**
 * Módulo para Curvas de Bézier Cúbicas.
 * Lógica: A curva é gerada calculando uma série de pontos (amostras) ao longo dela
 * usando a fórmula polinomial de Bézier. Em seguida, esses pontos de amostra
 * são conectados com o algoritmo de Bresenham para formar a curva rasterizada na tela.
 */
const Bezier = {
  cubicSamples: function(p0,p1,p2,p3,steps=100){
    const pts = [];
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const x = Math.pow(1-t,3)*p0.x + 3*t*Math.pow(1-t,2)*p1.x + 3*Math.pow(t,2)*(1-t)*p2.x + Math.pow(t,3)*p3.x;
      const y = Math.pow(1-t,3)*p0.y + 3*t*Math.pow(1-t,2)*p1.y + 3*Math.pow(t,2)*(1-t)*p2.y + Math.pow(t,3)*p3.y;
      pts.push({x: Math.round(x), y: Math.round(y)});
    }
    return pts;
  },
  rasterize: function(p0,p1,p2,p3){
    const samp = Bezier.cubicSamples(p0,p1,p2,p3,120);
    let out = [];
    for(let i=0;i<samp.length-1;i++){
      out = out.concat(Bresenham.line(samp[i].x,samp[i].y,samp[i+1].x,samp[i+1].y));
    }
    // Remove duplicados
    const uniq = {}; const res = [];
    for(const p of out){ const k=p.x+','+p.y; if(!uniq[k]){uniq[k]=1; res.push(p);} }
    return res;
  }
};

/**
 * Módulo para manipulação de Polilinhas e Polígonos.
 * Lógica: Contém funções para criar a sequência de pixels que formam as arestas
 * de um polígono a partir de seus vértices, utilizando Bresenham para cada aresta.
 */
const Polyline = {
  createPixels: function(vertices, closed = false) {
    if (vertices.length < 2) return vertices;
    let allPixels = [];
    for (let i = 0; i < vertices.length - 1; i++) {
      allPixels.push(...Bresenham.line(vertices[i].x, vertices[i].y, vertices[i + 1].x, vertices[i + 1].y));
    }
    if (closed && vertices.length > 1) {
      allPixels.push(...Bresenham.line(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y, vertices[0].x, vertices[0].y));
    }
    // Remove duplicados para evitar sobreposição
    const uniquePixels = []; const seen = new Set();
    for (const p of allPixels) {
      const key = `${p.x},${p.y}`;
      if (!seen.has(key)) { seen.add(key); uniquePixels.push(p); }
    }
    return uniquePixels;
  },
  finalizeAndClosePolygon: function() {
    if (state.tempPoly.length >= 3) {
      state.shapes.push({ type: 'poly', data: state.tempPoly.slice(), color: state.drawingColor });
      state.tempPoly = [];
      redrawAll();
    }
  }
};

/**
 * Algoritmo Flood Fill (Preenchimento por Semente) Iterativo.
 * Lógica: A partir de um ponto inicial ("semente"), preenche uma área até encontrar
 * pixels de fronteira. Usa uma pilha (implementação iterativa) para evitar estouro
 * de recursão, adicionando os vizinhos de um pixel à pilha para serem processados.
 */
function floodFill(startX, startY, color) {
  const boundaryPixels = new Set();
  for (const shape of state.shapes) {
    let pixels = [];
    if (shape.type === 'line' || shape.type === 'pixels') pixels = shape.data;
    else if (shape.type === 'poly') pixels = Polyline.createPixels(shape.data, true);
    for (const p of pixels) boundaryPixels.add(`${p.x},${p.y}`);
  }

  if (boundaryPixels.has(`${startX},${startY}`)) return;

  const stack = [{ x: startX, y: startY }];
  const pixelsToFill = [];
  const visited = new Set();
  visited.add(`${startX},${startY}`);

  while (stack.length > 0) {
    const p = stack.pop();
    pixelsToFill.push(p);
    const neighbors = [ { x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }];
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (!visited.has(key) && !boundaryPixels.has(key)) {
        visited.add(key);
        stack.push(n);
      }
    }
  }
  
  if (pixelsToFill.length > 0) {
      state.shapes.push({ type: 'pixels', data: pixelsToFill, color: color || state.drawingColor });
      redrawAll();
  }
}

/**
 * Algoritmo de Preenchimento Scanline para Polígonos.
 * Lógica: Opera varrendo o polígono horizontalmente, linha por linha (scanline).
 * Para cada linha, ele encontra as interseções com as arestas do polígono, ordena-as
 * por X e preenche os pixels entre os pares de interseções (1º-2º, 3º-4º, etc.).
 */
function scanlineFill(polygon, color){
  let minY = Infinity, maxY = -Infinity;
  for(const v of polygon){ if(v.y<minY)minY=v.y; if(v.y>maxY)maxY=v.y; }
  const filled = [];
  for(let y = Math.ceil(minY); y<=Math.floor(maxY); y++){
    const inter = [];
    for(let i=0;i<polygon.length;i++){
      const a = polygon[i], b = polygon[(i+1)%polygon.length];
      if((a.y <= y && b.y > y) || (b.y <= y && a.y > y)){
        const x = a.x + (y - a.y)*(b.x - a.x)/(b.y - a.y);
        inter.push(x);
      }
    }
    inter.sort((a,b)=>a-b);
    for(let i=0;i<inter.length;i+=2){
      const xStart = Math.ceil(inter[i]); const xEnd = Math.floor(inter[i+1]||inter[i]);
      for(let x=xStart;x<=xEnd;x++) filled.push({x,y});
    }
  }
  state.shapes.push({type:'pixels', data:filled, color:color||state.drawingColor});
  redrawAll();
}

/**
 * Módulo de Recorte (Clipping) de Linha Cohen-Sutherland.
 * Lógica: Determina se uma linha está dentro de uma janela de recorte. Cada
 * extremidade da linha recebe um "outcode" de 4 bits que identifica sua posição
 * (cima, baixo, esquerda, direita). Isso permite aceitar trivialmente linhas
 * internas, rejeitar trivialmente linhas externas e, para as demais, calcular
 * o ponto de interseção com a janela para recortá-la.
 */
const Clip = {
  INSIDE:0, LEFT:1, RIGHT:2, BOTTOM:4, TOP:8,
  computeOutCode: function(x,y,xmin,xmax,ymin,ymax){
    let code = 0;
    if(x < xmin) code |= this.LEFT; else if(x > xmax) code |= this.RIGHT;
    if(y < ymin) code |= this.BOTTOM; else if(y > ymax) code |= this.TOP;
    return code;
  },
  cohenSutherland: function(x0,y0,x1,y1, xmin,xmax,ymin,ymax){
    let out0 = this.computeOutCode(x0,y0,xmin,xmax,ymin,ymax);
    let out1 = this.computeOutCode(x1,y1,xmin,xmax,ymin,ymax);
    let accept = false;
    while(true){
      if(!(out0 | out1)){ accept=true; break; }
      else if(out0 & out1){ break; }
      else{
        let x=0,y=0; let out = out0?out0:out1;
        if(out & this.TOP){ x = x0 + (x1-x0)*(ymax - y0)/(y1 - y0); y = ymax; }
        else if(out & this.BOTTOM){ x = x0 + (x1-x0)*(ymin - y0)/(y1 - y0); y = ymin; }
        else if(out & this.RIGHT){ y = y0 + (y1-y0)*(xmax - x0)/(x1 - x0); x = xmax; }
        else if(out & this.LEFT){ y = y0 + (y1-y0)*(xmin - x0)/(x1 - x0); x = xmin; }
        if(out === out0){ x0 = x; y0 = y; out0 = this.computeOutCode(x0,y0,xmin,xmax,ymin,ymax); }
        else{ x1 = x; y1 = y; out1 = this.computeOutCode(x1,y1,xmin,xmax,ymin,ymax); }
      }
    }
    if(accept) return {x0:Math.round(x0), y0:Math.round(y0), x1:Math.round(x1), y1:Math.round(y1)};
    return null;
  }
};

/**
 * Algoritmo de Recorte de Polígono Sutherland-Hodgman.
 * Lógica: Recorta um polígono contra cada uma das quatro arestas da janela de
 * recorte sequencialmente (ex: contra a borda esquerda, depois a direita, etc.).
 * O polígono resultante de um recorte de aresta é usado como entrada para o
 * recorte da próxima aresta, resultando no polígono final.
 */
function clipPolygon(polygon, xmin,xmax,ymin,ymax){
  function clipEdge(poly, edge){
    const out = [];
    for(let i=0;i<poly.length;i++){
      const A = poly[i], B = poly[(i+1)%poly.length];
      const insideA = edge(A), insideB = edge(B);
      if(insideA && insideB) out.push(B);
      else if(insideA && !insideB){ const ip = intersect(A,B,edge); if(ip) out.push(ip); }
      else if(!insideA && insideB){ const ip = intersect(A,B,edge); if(ip) out.push(ip); out.push(B); }
    }
    return out;
  }
  function intersect(A,B,edge){
    const dx = B.x-A.x, dy = B.y-A.y; if(dx===0 && dy===0) return null;
    if(edge===insideLeft){ const x=xmin; const t=(x-A.x)/dx; return {x:x, y:A.y+t*dy}; }
    if(edge===insideRight){ const x=xmax; const t=(x-A.x)/dx; return {x:x, y:A.y+t*dy}; }
    if(edge===insideBottom){ const y=ymin; const t=(y-A.y)/dy; return {x:A.x+t*dx,y:y}; }
    if(edge===insideTop){ const y=ymax; const t=(y-A.y)/dy; return {x:A.x+t*dx,y:y}; }
  }
  function insideLeft(p){ return p.x >= xmin; }
  function insideRight(p){ return p.x <= xmax; }
  function insideBottom(p){ return p.y >= ymin; }
  function insideTop(p){ return p.y <= ymax; }

  let output = clipEdge(clipEdge(clipEdge(clipEdge(polygon.slice(), insideLeft), insideRight), insideBottom), insideTop);
  return output.map(p=>({x:Math.round(p.x), y:Math.round(p.y)}));
}

// --- MÓDULOS DE TRANSFORMAÇÕES E PROJEÇÕES ---

// Funções para transformações geométricas 2D em polígonos.
function translatePolygon(poly, dx, dy){ return poly.map(p=>({x:p.x+dx, y:p.y+dy})); }
function scalePolygon(poly, sx, sy, fixed){ return poly.map(p=>({x: Math.round(fixed.x + (p.x-fixed.x)*sx), y: Math.round(fixed.y + (p.y-fixed.y)*sy)})); }
function rotatePolygon(poly, angleDeg, pivot){
  const a = angleDeg * Math.PI/180; const ca = Math.cos(a), sa = Math.sin(a);
  return poly.map(p=>{
    const vx = p.x - pivot.x, vy = p.y - pivot.y;
    return {x: Math.round(pivot.x + vx*ca - vy*sa), y: Math.round(pivot.y + vx*sa + vy*ca)};
  });
}

// Objetos 3D pré-definidos.
const Shapes3D = {
  get: (name, s = 2) => {
    const shapes = {
      cube: { vertices: [ {x:-s,y:-s,z:-s},{x:s,y:-s,z:-s},{x:s,y:s,z:-s},{x:-s,y:s,z:-s}, {x:-s,y:-s,z:s},{x:s,y:-s,z:s},{x:s,y:s,z:s},{x:-s,y:s,z:s} ], edges: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]] },
      pyramid: { vertices: [ {x:-s,y:-s,z:-s},{x:s,y:-s,z:-s},{x:s,y:-s,z:s},{x:-s,y:-s,z:s}, {x:0,y:s,z:0} ], edges: [[0,1],[1,2],[2,3],[3,0], [0,4],[1,4],[2,4],[3,4]] }
    };
    return shapes[name];
  }
};

// Funções para projeção de pontos 3D para um espaço 2D.
function projectOrthographic(points){ return points.map(p=>({x:Math.round(p.x), y:Math.round(p.y)})); }
function projectPerspective(points, cameraZ=5){ return points.map(p => { const z = p.z + cameraZ; const f = cameraZ / (z||0.0001); return {x: Math.round(p.x * f), y: Math.round(p.y * f)}; }); }
function projectCavalier(points, angleDeg = 45) { const angleRad = angleDeg * Math.PI / 180; const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad); return points.map(p => ({ x: Math.round(p.x + p.z * cosA), y: Math.round(p.y + p.z * sinA) })); }
function projectCabinet(points, angleDeg = 45) { const angleRad = angleDeg * Math.PI / 180; const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad); return points.map(p => ({ x: Math.round(p.x + 0.5 * p.z * cosA), y: Math.round(p.y + 0.5 * p.z * sinA) })); }


// ===============================================
// --- LÓGICA DA INTERFACE DO USUÁRIO (UI) ---
// ===============================================
const tabs = [
  {id:'bresenham', label:'Bresenham (Reta)'}, {id:'circle', label:'Círculo'}, {id:'bezier', label:'Bezier'},
  {id:'poly', label:'Polilinha'}, {id:'fill', label:'Preenchimento'}, {id:'clip', label:'Recorte'},
  {id:'transform', label:'Transformações'}, {id:'projection', label:'Projeções'}, {id:'ellipse', label:'Elipse'}
];
const tabList = document.getElementById('tabList');
const controls = document.getElementById('controls');

// Cria as abas de funcionalidades dinamicamente.
function createTabs(){
  tabs.forEach(t => {
    const el = document.createElement('div'); el.className='tab'; el.innerText=t.label; el.dataset.id=t.id;
    el.onclick = ()=>{ setTab(t.id); document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); el.classList.add('active'); };
    tabList.appendChild(el);
  });
  document.querySelector('.tab').classList.add('active');
}

// Define a aba ativa e renderiza os controles correspondentes.
function setTab(id){
  state.currentTab = id;
  renderControls();
}

// Função central que decide quais controles de UI devem ser exibidos com base na aba ativa.
function renderControls(){
  controls.innerHTML='';
  const renderMap = { bresenham: renderBresenhamControls, circle: renderCircleControls, bezier: renderBezierControls,
    poly: renderPolyControls, fill: renderFillControls, clip: renderClipControls, transform: renderTransformControls,
    projection: renderProjectionControls, ellipse: renderEllipseControls };
  if(renderMap[state.currentTab]) renderMap[state.currentTab]();
}

// Função auxiliar para criar uma linha de controle (label + input) na UI.
function addRow(labelText, element){
  const row=document.createElement('div');row.className='control-row';
  const lbl=document.createElement('label');lbl.innerText=labelText;
  row.appendChild(lbl); row.appendChild(element); controls.appendChild(row);
  return row;
}

// --- Funções que renderizam os controles para cada aba específica ---

function renderBresenhamControls(){
  const x0=document.createElement('input'); x0.type='number';x0.value=-5; addRow('X0', x0);
  const y0=document.createElement('input'); y0.type='number';y0.value=-2; addRow('Y0', y0);
  const x1=document.createElement('input'); x1.type='number';x1.value=8; addRow('X1', x1);
  const y1=document.createElement('input'); y1.type='number';y1.value=5; addRow('Y1', y1);
  const btn=document.createElement('button'); btn.innerText='Desenhar Reta'; btn.className='primary'; btn.onclick=()=>{
    const p=Bresenham.line(parseInt(x0.value),parseInt(y0.value),parseInt(x1.value),parseInt(y1.value));
    state.shapes.push({type:'line', data:p, color:state.drawingColor}); redrawAll();
  }; controls.appendChild(btn);
}
function renderCircleControls(){
  const cx=document.createElement('input'); cx.type='number';cx.value=0; addRow('Centro X', cx);
  const cy=document.createElement('input'); cy.type='number';cy.value=0; addRow('Centro Y', cy);
  const r=document.createElement('input'); r.type='number';r.value=10; addRow('Raio', r);
  const btn=document.createElement('button'); btn.innerText='Desenhar Círculo'; btn.className='primary'; btn.onclick=()=>{
    const pts=Circle.raster(parseInt(cx.value),parseInt(cy.value),parseInt(r.value));
    state.shapes.push({type:'pixels', data:pts, color:state.drawingColor}); redrawAll();
  }; controls.appendChild(btn);
}
function renderBezierControls(){
  const p0x=document.createElement('input'); p0x.type='number';p0x.value=-8; addRow('P0 X', p0x);
  const p0y=document.createElement('input'); p0y.type='number';p0y.value=-2; addRow('P0 Y', p0y);
  const p1x=document.createElement('input'); p1x.type='number';p1x.value=-2; addRow('P1 X', p1x);
  const p1y=document.createElement('input'); p1y.type='number';p1y.value=8; addRow('P1 Y', p1y);
  const p2x=document.createElement('input'); p2x.type='number';p2x.value=4; addRow('P2 X', p2x);
  const p2y=document.createElement('input'); p2y.type='number';p2y.value=-8; addRow('P2 Y', p2y);
  const p3x=document.createElement('input'); p3x.type='number';p3x.value=10; addRow('P3 X', p3x);
  const p3y=document.createElement('input'); p3y.type='number';p3y.value=4; addRow('P3 Y', p3y);
  const btn=document.createElement('button'); btn.className='primary'; btn.innerText='Desenhar Bezier'; btn.onclick=()=>{
    const p0={x:parseInt(p0x.value),y:parseInt(p0y.value)}, p1={x:parseInt(p1x.value),y:parseInt(p1y.value)}, p2={x:parseInt(p2x.value),y:parseInt(p2y.value)}, p3={x:parseInt(p3x.value),y:parseInt(p3y.value)};
    const pts=Bezier.rasterize(p0,p1,p2,p3); state.shapes.push({type:'line', data:pts, color:state.drawingColor}); redrawAll();
  }; controls.appendChild(btn);
}
function renderPolyControls(){
  const hint=document.createElement('div'); hint.style.cssText='color:var(--muted);font-size:13px;'; hint.innerText='Clique no canvas para adicionar vértices; pressione "Terminar Polígono".'; controls.appendChild(hint);
  const btnFinish=document.createElement('button'); btnFinish.innerText='Terminar Polígono'; btnFinish.onclick=Polyline.finalizeAndClosePolygon;
  const btnClear=document.createElement('button'); btnClear.innerText='Limpar Vértices'; btnClear.onclick=()=>{state.tempPoly=[];redrawAll();};
  controls.appendChild(btnFinish); controls.appendChild(btnClear);
}
function renderFillControls(){
  const hint=document.createElement('div'); hint.style.cssText='color:var(--muted);font-size:13px;'; hint.innerText='Preenchimento por semente (flood fill) ou varredura de polígono.'; controls.appendChild(hint);
  const seedBtn=document.createElement('button'); seedBtn.innerText='Ativar Semente (clique canvas)'; seedBtn.onclick=()=>{ state.mode='seed'; alert('Clique no canvas para iniciar preenchimento por semente'); };
  const scanBtn=document.createElement('button'); scanBtn.innerText='Preencher Polígono (scanline)'; scanBtn.onclick=()=>{
    const polyShape=state.shapes.slice().reverse().find(s=>s.type==='poly');
    if(!polyShape){ alert('Nenhum polígono encontrado. Desenhe um polígono primeiro.'); return; }
    scanlineFill(polyShape.data, state.drawingColor);
  }; controls.appendChild(seedBtn); controls.appendChild(scanBtn);
}
function renderClipControls(){
  const xmin=document.createElement('input'); xmin.type='number';xmin.value=-6; addRow('Xmin',xmin);
  const ymin=document.createElement('input'); ymin.type='number';ymin.value=-4; addRow('Ymin',ymin);
  const xmax=document.createElement('input'); xmax.type='number';xmax.value=6; addRow('Xmax',xmax);
  const ymax=document.createElement('input'); ymax.type='number';ymax.value=4; addRow('Ymax',ymax);
  const btnLine=document.createElement('button'); btnLine.innerText='Recortar Última Reta'; btnLine.onclick=()=>{
    const shape=state.shapes.slice().reverse().find(s=>s.type==='line'); if(!shape){alert('Nenhuma reta encontrada');return;}
    const seg={x0:shape.data[0].x,y0:shape.data[0].y,x1:shape.data[shape.data.length-1].x,y1:shape.data[shape.data.length-1].y};
    const res=Clip.cohenSutherland(seg.x0,seg.y0,seg.x1,seg.y1,parseInt(xmin.value),parseInt(xmax.value),parseInt(ymin.value),parseInt(ymax.value));
    if(res){const pts=Bresenham.line(res.x0,res.y0,res.x1,res.y1); state.shapes.push({type:'line',data:pts,color:'#f97316'}); redrawAll();} else alert('Linha totalmente fora da janela');
  }; controls.appendChild(btnLine);
  const btnPoly=document.createElement('button'); btnPoly.innerText='Recortar Último Polígono'; btnPoly.onclick=()=>{
    const poly=state.shapes.slice().reverse().find(s=>s.type==='poly'); if(!poly){alert('Nenhum polígono encontrado');return;}
    const clipped=clipPolygon(poly.data,parseInt(xmin.value),parseInt(xmax.value),parseInt(ymin.value),parseInt(ymax.value));
    if(clipped.length) state.shapes.push({type:'poly',data:clipped,color:'#f97316'}); redrawAll();
  }; controls.appendChild(btnPoly);
}
function renderTransformControls(){
  const dx=document.createElement('input');dx.type='number';dx.value=2; addRow('Translação dx', dx);
  const dy=document.createElement('input');dy.type='number';dy.value=2; addRow('Translação dy', dy);
  const btnT=document.createElement('button'); btnT.innerText='Aplicar Translação'; btnT.onclick=()=>{
    const poly=state.shapes.slice().reverse().find(s=>s.type==='poly'); if(!poly){alert('Nenhum polígono encontrado para transformar.');return;}
    const translated=translatePolygon(poly.data, parseInt(dx.value), parseInt(dy.value)); state.shapes.push({type:'poly',data:translated,color:'#34d399'}); redrawAll();
  }; controls.appendChild(btnT);
  controls.appendChild(document.createElement('hr'));
  const pivotX = document.createElement('input'); pivotX.type = 'number'; pivotX.value = 0; addRow('Pivô/Ponto Fixo X', pivotX);
  const pivotY = document.createElement('input'); pivotY.type = 'number'; pivotY.value = 0; addRow('Pivô/Ponto Fixo Y', pivotY);
  const ang=document.createElement('input');ang.type='number';ang.value=45; addRow('Rotação (graus)', ang);
  const btnR=document.createElement('button');btnR.innerText='Rotacionar Polígono'; btnR.onclick=()=>{
    const poly=state.shapes.slice().reverse().find(s=>s.type==='poly'); if(!poly){alert('Nenhum polígono encontrado para transformar.');return;}
    const pivot = { x: parseInt(pivotX.value), y: parseInt(pivotY.value) };
    const rotated=rotatePolygon(poly.data, parseInt(ang.value), pivot); state.shapes.push({type:'poly',data:rotated,color:'#60a5fa'}); redrawAll();
  }; controls.appendChild(btnR);
  const sx=document.createElement('input');sx.type='number';sx.step='0.1';sx.value=1.5; addRow('Escala X', sx);
  const sy=document.createElement('input');sy.type='number';sy.step='0.1';sy.value=1.5; addRow('Escala Y', sy);
  const btnS=document.createElement('button');btnS.innerText='Escalar Polígono'; btnS.onclick=()=>{
    const poly=state.shapes.slice().reverse().find(s=>s.type==='poly'); if(!poly){alert('Nenhum polígono encontrado para transformar.');return;}
    const fixedPoint = { x: parseInt(pivotX.value), y: parseInt(pivotY.value) };
    const scaled=scalePolygon(poly.data, parseFloat(sx.value), parseFloat(sy.value), fixedPoint); state.shapes.push({type:'poly',data:scaled,color:'#f472b6'}); redrawAll();
  }; controls.appendChild(btnS);
}
function renderProjectionControls(){
  const objectSelect = document.createElement('select'); ['cube', 'pyramid'].forEach(name => { const opt = document.createElement('option'); opt.value = name; opt.text = name.charAt(0).toUpperCase() + name.slice(1); objectSelect.appendChild(opt); }); addRow('Objeto 3D', objectSelect);
  const projSelect = document.createElement('select'); [ {val: 'orthographic', text: 'Ortográfica'}, {val: 'perspective', text: 'Perspectiva'}, {val: 'cavalier', text: 'Cavalier'}, {val: 'cabinet', text: 'Cabinet'} ].forEach(p => { const opt = document.createElement('option'); opt.value = p.val; opt.text = p.text; projSelect.appendChild(opt); }); addRow('Projeção', projSelect);
  const hint=document.createElement('div'); hint.style.cssText='color:var(--muted);font-size:13px;margin-top:12px'; hint.innerText='Ou, adicione coordenadas customizadas (JSON):'; controls.appendChild(hint);
  const verticesInput = document.createElement('textarea'); verticesInput.rows = 3; verticesInput.placeholder = '[{"x":-2,"y":-2,"z":-2}, ...]'; addRow('Vértices', verticesInput);
  const edgesInput = document.createElement('textarea'); edgesInput.rows = 3; edgesInput.placeholder = '[[0,1], [1,2], ...]'; addRow('Arestas', edgesInput);
  const drawBtn = document.createElement('button'); drawBtn.className = 'primary'; drawBtn.innerText = 'Desenhar Projeção';
  drawBtn.onclick = () => {
    let vertices, edges;
    try { if(verticesInput.value.trim() && edgesInput.value.trim()){ vertices = JSON.parse(verticesInput.value); edges = JSON.parse(edgesInput.value); } } catch (e) { alert('Erro no formato JSON das coordenadas customizadas.'); return; }
    if (!vertices || !edges) { const shape = Shapes3D.get(objectSelect.value, 4); vertices = shape.vertices; edges = shape.edges; }
    let projected;
    switch (projSelect.value) {
      case 'perspective': projected = projectPerspective(vertices, 10); break;
      case 'cavalier':    projected = projectCavalier(vertices); break;
      case 'cabinet':     projected = projectCabinet(vertices); break;
      default:            projected = projectOrthographic(vertices);
    }
    for (const edge of edges) {
      const a = projected[edge[0]], b = projected[edge[1]];
      if (a && b) { const pts = Bresenham.line(a.x, a.y, b.x, b.y); state.shapes.push({ type: 'line', data: pts, color: '#a78bfa' }); }
    }
    redrawAll();
  }; controls.appendChild(drawBtn);
}
function renderEllipseControls(){
  const cx=document.createElement('input');cx.type='number';cx.value=0; addRow('Centro X',cx);
  const cy=document.createElement('input');cy.type='number';cy.value=0; addRow('Centro Y',cy);
  const rx=document.createElement('input');rx.type='number';rx.value=8; addRow('Raio X',rx);
  const ry=document.createElement('input');ry.type='number';ry.value=4; addRow('Raio Y',ry);
  const btn=document.createElement('button');btn.innerText='Desenhar Elipse';btn.className='primary';btn.onclick=()=>{
    const a=parseInt(rx.value), b=parseInt(ry.value), xc=parseInt(cx.value), yc=parseInt(cy.value);
    const pts=[];
    for(let t=0;t<360;t+=1){ const rad=t*Math.PI/180; const x=Math.round(xc+a*Math.cos(rad)); const y=Math.round(yc+b*Math.sin(rad)); pts.push({x,y}); }
    let out=[]; for(let i=0;i<pts.length;i++){ out.push(...Bresenham.line(pts[i].x,pts[i].y,pts[(i+1)%pts.length].x,pts[(i+1)%pts.length].y)); }
    state.shapes.push({type:'pixels',data:out,color:state.drawingColor}); redrawAll();
  }; controls.appendChild(btn);
}

// --- INICIALIZAÇÃO E EVENTOS GLOBAIS ---

// Inicializa a UI criando as abas e renderizando os primeiros controles.
createTabs();
renderControls();

// Adiciona os listeners de eventos do mouse ao canvas.
canvas.addEventListener('mousedown', (e)=>{
  state.mouseDown=true; const r=canvas.getBoundingClientRect(); const sx=e.clientX-r.left; const sy=e.clientY-r.top; const w=screenToWorld(sx,sy);
  if(state.currentTab==='poly'){
    state.tempPoly.push({x:Math.round(w.x), y:Math.round(w.y)});
  } else if(state.currentTab==='fill' && state.mode==='seed'){
    floodFill(Math.round(w.x), Math.round(w.y), '#ef4444'); state.mode=null;
  } else if(state.currentTab==='bresenham'){
    state.points=[{x:Math.round(w.x),y:Math.round(w.y)}];
  }
});
canvas.addEventListener('mouseup', (e)=>{
  state.mouseDown=false; const r=canvas.getBoundingClientRect(); const sx=e.clientX-r.left; const sy=e.clientY-r.top; const w=screenToWorld(sx,sy);
  if(state.currentTab==='bresenham' && state.points.length===1){
    state.points.push({x:Math.round(w.x),y:Math.round(w.y)});
    const pts=Bresenham.line(state.points[0].x,state.points[0].y,state.points[1].x,state.points[1].y);
    state.shapes.push({type:'line',data:pts,color:state.drawingColor}); state.points=[]; redrawAll();
  }
});
canvas.addEventListener('mousemove',(e)=>{ if(!state.mouseDown) return; /* Uma pré-visualização do desenho pode ser implementada aqui */ });

// Adiciona os listeners para os botões de controle principais.
document.getElementById('clearBtn').onclick = ()=>{ state.shapes=[]; state.tempPoly=[]; redrawAll(); };
document.getElementById('resetView').onclick = ()=>{ state.pixelSize=10; state.originX=Math.floor(width/2); state.originY=Math.floor(height/2); document.getElementById('scaleLabel').innerText=state.pixelSize; redrawAll(); };
document.getElementById('exportPng').onclick = ()=>{ const link=document.createElement('a'); link.href=canvas.toDataURL('image/png'); link.download='canvas_cg.png'; link.click(); };
document.getElementById('undoBtn').onclick = undoLastAction;
canvas.addEventListener('wheel', (e)=>{ e.preventDefault(); const delta=e.deltaY>0?-1:1; state.pixelSize=Math.max(4, Math.min(28, state.pixelSize+delta)); document.getElementById('scaleLabel').innerText=state.pixelSize; redrawAll(); });
window.addEventListener('keydown', (e) => {
  // Verifica se a tecla Ctrl e a tecla 'z' foram pressionadas
  if (e.ctrlKey && e.key.toLowerCase() === 'z') {
    e.preventDefault(); // Impede a ação padrão do navegador (como desfazer texto em um input)
    undoLastAction();
  }
});

// Desenho inicial e início do loop de renderização.
redrawAll();

(function renderLoop(){
  // Primeiro, redesenha todas as formas estáveis.
  redrawAll(); 

  // Em seguida, desenha elementos temporários por cima, como a polilinha que está sendo criada.
  if (state.tempPoly.length > 0) {
    const tempPixels = Polyline.createPixels(state.tempPoly, false); // false para linha aberta
    for (const p of tempPixels) {
      drawPixel(p.x, p.y, '#fb7185'); // Usa uma cor distinta para a pré-visualização
    }
  }
  
  requestAnimationFrame(renderLoop);
})();