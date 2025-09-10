# Trabalho Prático de Computação Gráfica: Canvas Interativo

Este projeto é uma aplicação web interativa para visualização de algoritmos de computação gráfica, desenvolvida com HTML, CSS e JavaScript puro. A ferramenta utiliza um Canvas HTML5 para desenhar em um plano cartesiano com pixels visíveis, permitindo ao usuário testar e visualizar diversos algoritmos fundamentais da área.

![Preview da Aplicação](https://i.imgur.com/link_para_sua_imagem.png)
*(Dica: Tire um print da sua aplicação funcionando e substitua o link acima para ter uma preview visual aqui!)*

## 🚀 Funcionalidades Implementadas

O projeto está organizado em módulos que cobrem diferentes áreas da computação gráfica. Abaixo estão as principais funcionalidades disponíveis.

### 1. Rasterização de Primitivas
-   **Reta (Algoritmo de Bresenham):** Desenha uma linha entre dois pontos (clicando e arrastando no canvas ou inserindo coordenadas) utilizando o algoritmo otimizado de Bresenham, que opera apenas com cálculos inteiros.
-   **Círculo (Algoritmo do Ponto Médio):** Gera um círculo rasterizado a partir de um ponto central e um raio.
-   **Elipse:** Desenha uma elipse a partir de um centro e dos raios horizontal (Rx) e vertical (Ry).
-   **Curva de Bézier (Cúbica):** Renderiza uma curva de Bézier cúbica com base em quatro pontos de controle. A curva é amostrada e os segmentos de reta resultantes são desenhados com Bresenham.
-   **Polilinha/Polígono:** Permite ao usuário criar polígonos clicando sequencialmente no canvas para adicionar vértices. É possível finalizar e fechar o polígono para uso em outras operações.

### 2. Preenchimento de Áreas
-   **Flood Fill (Preenchimento por Semente):** Preenche uma área delimitada por uma cor de fronteira. O algoritmo é implementado de forma iterativa (usando uma pilha) para evitar estouro de recursão em áreas grandes.
-   **Scanline (Preenchimento por Varredura):** Preenche um polígono (o último desenhado) de forma eficiente, varrendo o mesmo linha por linha e preenchendo os pixels entre as interseções das arestas.

### 3. Recorte (Clipping)
-   **Recorte de Reta (Cohen-Sutherland):** Recorta um segmento de reta que está parcial ou totalmente fora de uma janela de recorte retangular definida pelo usuário.
-   **Recorte de Polígono (Sutherland-Hodgman):** Recorta um polígono contra uma janela de recorte retangular, gerando um novo polígono com os vértices resultantes.

### 4. Transformações Geométricas 2D
-   **Translação:** Move um polígono para uma nova posição no plano cartesiano.
-   **Rotação:** Gira um polígono em torno de um ponto pivô definido pelo usuário.
-   **Escala:** Redimensiona um polígono a partir de um ponto fixo, com fatores de escala independentes para os eixos X e Y.

### 5. Projeções 3D
-   **Visualização de Objetos 3D:** Renderiza as arestas de objetos 3D pré-definidos (cubo e pirâmide) ou customizados (via JSON) em um espaço 2D.
-   **Tipos de Projeção:**
    -   **Ortográfica:** Projeção paralela que descarta a coordenada Z.
    -   **Perspectiva:** Simula profundidade, fazendo objetos mais distantes parecerem menores.
    -   **Cavalier e Cabinet:** Projeções oblíquas que mostram profundidade de forma mais estilizada.

## 🛠️ Como Usar a Aplicação

1.  **Pré-requisitos:** Você só precisa de um navegador de internet moderno (Google Chrome, Firefox, Edge, etc.).
2.  **Execução:**
    -   Clone ou baixe este repositório.
    -   Certifique-se de que os arquivos `index.html`, `style.css` e `script.js` estejam na mesma pasta.
    -   Abra o arquivo `index.html` no seu navegador.

### Navegando pela Interface
-   **Abas (Tabs):** No painel esquerdo, selecione a aba correspondente ao algoritmo ou funcionalidade que deseja utilizar (ex: "Bresenham", "Transformações").
-   **Controles:** Cada aba exibirá um conjunto de controles específicos. Preencha os campos (coordenadas, raios, etc.) e clique nos botões para executar as ações.
-   **Canvas Interativo:**
    -   Para algoritmos como **Bresenham (Reta)** e **Polilinha**, você pode clicar diretamente no canvas para definir pontos.
    -   Use a **roda do mouse (scroll)** sobre o canvas para dar zoom (aumentar ou diminuir o tamanho do pixel).
    -   Os botões **"Limpar"**, **"Resetar"** e **"Exportar PNG"** na parte inferior do painel esquerdo permitem gerenciar a área de desenho.

## 🏗️ Estrutura do Código

O código-fonte foi mantido em três arquivos separados para melhor organização:

-   **`index.html`:** Estrutura a página web, contendo o elemento canvas e os painéis da interface.
-   **`style.css`:** Define toda a aparência da aplicação, incluindo o layout, cores e responsividade para telas menores.
-   **`script.js`:** Contém toda a lógica da aplicação. O código está organizado em objetos que funcionam como "módulos", separando as responsabilidades:
    -   **`state`:** Objeto global que armazena o estado atual da aplicação (tamanho do pixel, formas desenhadas, etc.).
    -   **Funções de Desenho:** Funções base para desenhar no canvas, como `drawPixel`, `drawGrid` e `redrawAll`.
    -   **Módulos de Algoritmos:** Objetos como `Bresenham`, `Circle`, `Bezier`, `Clip`, etc., que encapsulam a lógica de cada algoritmo.
    -   **Lógica da UI:** Funções que gerenciam a criação das abas, controles e a captura de eventos do mouse no canvas.

---
_Projeto desenvolvido como parte da disciplina de Computação Gráfica._
_Seu Nome/Usuário do GitHub - 2024_