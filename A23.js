
// Initialize game with new grid size
function initGame() {
  NUM_ROWS = parseInt(document.getElementById('numRows').value);
  NUM_COLS = parseInt(document.getElementById('numCols').value);
  
  // Reset game state
  positions = {};
  gridEdges = {};
  homeA = [0, 0];
  homeB = [NUM_ROWS - 1, NUM_COLS - 1];
  playerPos = { A: homeA, B: homeB };
  turn = Math.random() < 0.5 ? 'A' : 'B';
  gameOver = false;
  winner = null;
  
  // Reset display
  winnerDisplay.style.display = 'none';
  
  // Update BASE_SIZE based on new dimensions
  BASE_SIZE = Math.min((WIDTH - 40) / NUM_COLS, (HEIGHT - 200) / NUM_ROWS);
  MAP_WIDTH = BASE_SIZE * NUM_COLS;
  MAP_HEIGHT = BASE_SIZE * NUM_ROWS;
  
  // Recalculate positions
  const cellSpacingX = MAP_WIDTH / (NUM_COLS + 1);
  const cellSpacingY = MAP_HEIGHT / (NUM_ROWS + 1);
  for (let i = 0; i < NUM_ROWS; i++) {
    for (let j = 0; j < NUM_COLS; j++) {
      positions[`${i},${j}`] = {
        x: Math.floor((j + 1) * cellSpacingX),
        y: Math.floor((i + 1) * cellSpacingY)
      };
    }
  }
  
  // Reset camera position
  offsetX = WIDTH / 2 - MAP_WIDTH * zoom / 2;
  offsetY = HEIGHT / 2 - MAP_HEIGHT * zoom / 2;
  
  generateEdges();
}

// Add event listener for start button
document.getElementById('startGame').addEventListener('click', () => {
  initGame();
});



const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const winnerDisplay = document.getElementById('winner');

// Game state
let NUM_ROWS = 2;
let NUM_COLS = 2;

// Constants
let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;
let BASE_SIZE = Math.min((WIDTH - 40) / NUM_COLS, (HEIGHT - 200) / NUM_ROWS);
let MAP_WIDTH = BASE_SIZE * NUM_COLS;
let MAP_HEIGHT = BASE_SIZE * NUM_ROWS;
const COLORS = {
  BG: 'rgb(8,2,24)',
  NODE: 'rgb(225,225,225)',
  EDGE: 'rgb(0,100,0)',
  USED_A: 'rgb(38,160,207)',
  USED_B: 'rgb(251,191,20)',
  A: 'rgb(18,140,187)',
  B: 'rgb(231,171,0)'
};

const CIRCLE_RADIUS = 5;
let scoreA = 0;
let scoreB = 0;

let positions = {};
let gridEdges = {};
let homeA = [0, 0];
let homeB = [NUM_ROWS - 1, NUM_COLS - 1];
let playerPos = { A: homeA, B: homeB };
let turn = 'A';
let gameOver = false;
let winner = null;

// Pan & zoom
let offsetX = 0;
let offsetY = 0;
let zoom = 1.0;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
let dragging = false;
let lastMousePos = { x: 0, y: 0 };

// Calculate grid positions
const cellSpacingX = MAP_WIDTH / (NUM_COLS + 1);
const cellSpacingY = MAP_HEIGHT / (NUM_ROWS + 1);
for (let i = 0; i < NUM_ROWS; i++) {
  for (let j = 0; j < NUM_COLS; j++) {
    positions[`${i},${j}`] = {
      x: Math.floor((j + 1) * cellSpacingX),
      y: Math.floor((i + 1) * cellSpacingY)
    };
  }
}

// Neighbor offsets
const neighborOffsets = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// Initialize canvas
function initCanvas() {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  generateEdges();
}

// Generate edges
function generateEdges() {
  // Helper function to generate all possible edges
  function getAllEdges() {
    const edges = [];
    for (let i = 0; i < NUM_ROWS; i++) {
      for (let j = 0; j < NUM_COLS; j++) {
        for (const [dx, dy] of neighborOffsets) {
          const ni = i + dx;
          const nj = j + dy;
          if (0 <= ni && ni < NUM_ROWS && 0 <= nj && nj < NUM_COLS && 
             (dx > 0 || (dx === 0 && dy > 0))) {
            edges.push(`${i},${j}-${ni},${nj}`);
          }
        }
      }
    }
    return edges;
  }

  // Generate spanning tree
  function generateSpanningTree() {
    const visited = new Set();
    const treeEdges = new Set();
    const nodes = [];
    for (let i = 0; i < NUM_ROWS; i++) {
      for (let j = 0; j < NUM_COLS; j++) {
        nodes.push([i, j]);
      }
    }
    
    const stack = [nodes[0]];
    visited.add(nodes[0].join(','));
    
    while (stack.length > 0) {
      const u = stack[stack.length - 1];
      const neighbors = [];
      
      for (const [dx, dy] of neighborOffsets) {
        const ni = u[0] + dx;
        const nj = u[1] + dy;
        if (0 <= ni && ni < NUM_ROWS && 0 <= nj && nj < NUM_COLS && 
            !visited.has(`${ni},${nj}`)) {
          neighbors.push([ni, nj]);
        }
      }
      
      if (neighbors.length > 0) {
        const v = neighbors[Math.floor(Math.random() * neighbors.length)];
        const edge = `${u[0]},${u[1]}-${v[0]},${v[1]}`;
        treeEdges.add(edge);
        visited.add(v.join(','));
        stack.push(v);
      } else {
        stack.pop();
      }
    }
    
    return treeEdges;
  }

  // Reset edges
  gridEdges = {};
  
  // Get spanning tree edges
  const treeEdges = generateSpanningTree();
  for (const edge of treeEdges) {
    gridEdges[edge] = 0;
  }
  
  // Add additional random edges
  const allEdges = getAllEdges();
  for (const edge of allEdges) {
    if (!gridEdges[edge] && Math.random() < 0.3) {
      gridEdges[edge] = 0;
    }
  }
}

// Get valid moves
function getValidMoves(player) {
  const pos = playerPos[player];
  const moves = [];
  for (const [dx, dy] of neighborOffsets) {
    const ni = pos[0] + dx;
    const nj = pos[1] + dy;
    if (0 <= ni && ni < NUM_ROWS && 0 <= nj && nj < NUM_COLS) {
      const edge = `${pos[0]},${pos[1]}-${ni},${nj}`;
      const reverseEdge = `${ni},${nj}-${pos[0]},${pos[1]}`;
      if ((edge in gridEdges && gridEdges[edge] === 0) || 
          (reverseEdge in gridEdges && gridEdges[reverseEdge] === 0)) {
        moves.push([ni, nj]);
      }
    }
  }
  return moves;
}

// Draw game
function draw() {
  // Clear canvas
  ctx.fillStyle = COLORS.BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Apply transform
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);

  // Draw edges
  for (const [edge, state] of Object.entries(gridEdges)) {
    const [from, to] = edge.split('-');
    const [fromI, fromJ] = from.split(',').map(Number);
    const [toI, toJ] = to.split(',').map(Number);
    
    ctx.beginPath();
    ctx.moveTo(positions[from].x, positions[from].y);
    ctx.lineTo(positions[to].x, positions[to].y);
    ctx.strokeStyle = state === 0 ? COLORS.EDGE : 
                     state === 1 ? COLORS.USED_A : COLORS.USED_B;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Draw nodes
  for (const pos of Object.values(positions)) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.NODE;
    ctx.fill();
  }

  // Draw players
  const posA = positions[playerPos.A.join(',')];
  const posB = positions[playerPos.B.join(',')];
  
  ctx.beginPath();
  ctx.arc(posA.x, posA.y, CIRCLE_RADIUS + 5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.A;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(posB.x, posB.y, CIRCLE_RADIUS + 5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.B;
  ctx.fill();

  ctx.restore();

  // Update info
  info.textContent = `Zoom: ${zoom.toFixed(2)} | ver 1.3 | Turn: Player ${turn}`;

  // Show winner
  if (gameOver) {
    winnerDisplay.style.display = 'block';
    winnerDisplay.textContent = `Player ${winner} wins!`;
  }

  requestAnimationFrame(draw);
}

// Handle input
function handleInput(clientX, clientY) {
  if (!gameOver && clientX !== undefined && clientY !== undefined) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offsetX) / zoom;
    const y = (clientY - rect.top - offsetY) / zoom;

    // Find clicked node
    for (const [node, pos] of Object.entries(positions)) {
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist < CIRCLE_RADIUS * 1.5) {
        const [i, j] = node.split(',').map(Number);
        const validMoves = getValidMoves(turn);
        if (validMoves.some(move => move[0] === i && move[1] === j)) {
          // Make move
          const oldPos = playerPos[turn];
          const edge = `${oldPos[0]},${oldPos[1]}-${i},${j}`;
          const reverseEdge = `${i},${j}-${oldPos[0]},${oldPos[1]}`;
          
          if (edge in gridEdges) {
            gridEdges[edge] = turn === 'A' ? 1 : 2;
          } else {
            gridEdges[reverseEdge] = turn === 'A' ? 1 : 2;
          }
          
          playerPos[turn] = [i, j];

          // Check win conditions
          if ((turn === 'A' && i === homeB[0] && j === homeB[1]) ||
              (turn === 'B' && i === homeA[0] && j === homeA[1]) ||
              (playerPos.A[0] === playerPos.B[0] && playerPos.A[1] === playerPos.B[1])) {
            winner = turn;
            gameOver = true;
            if (turn === 'A') scoreA++; else scoreB++;
          } else if (getValidMoves(turn).length === 0) {
            winner = turn === 'A' ? 'B' : 'A';
            gameOver = true;
          } else {
            turn = turn === 'A' ? 'B' : 'A';
          }
        }
        break;
      }
    }
  }
}

// Mouse events
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    handleInput(e.clientX, e.clientY);
    dragging = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
  }
});

canvas.addEventListener('mouseup', () => {
  dragging = false;
});

canvas.addEventListener('mousemove', (e) => {
  if (dragging && e.clientX && e.clientY) {
    offsetX += e.clientX - lastMousePos.x;
    offsetY += e.clientY - lastMousePos.y;
    lastMousePos = { x: e.clientX, y: e.clientY };
  }
});

// Touch events
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  if (touch) {
    handleInput(touch.clientX, touch.clientY);
    dragging = true;
    lastMousePos = { x: touch.clientX, y: touch.clientY };
  }
});

canvas.addEventListener('touchend', () => {
  dragging = false;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (dragging) {
    const touch = e.touches[0];
    if (touch && touch.clientX && touch.clientY) {
      offsetX += touch.clientX - lastMousePos.x;
      offsetY += touch.clientY - lastMousePos.y;
      lastMousePos = { x: touch.clientX, y: touch.clientY };
    }
  }
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = -Math.sign(e.deltaY) * 0.1;
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
});

// Reset game handler
document.getElementById('resetGame').addEventListener('click', () => {
  scoreA = 0;
  scoreB = 0;
  document.getElementById('scoreA').textContent = '0';
  document.getElementById('scoreB').textContent = '0';
  initGame();
});

// Update score display
function updateScoreDisplay() {
  document.getElementById('scoreA').textContent = scoreA;
  document.getElementById('scoreB').textContent = scoreB;
}

// Check if valid path exists between start points
function hasValidPath() {
  const visited = new Set();
  const queue = [[homeA[0], homeA[1]]];
  visited.add(homeA.join(','));
  
  while (queue.length > 0) {
    const [i, j] = queue.shift();
    if (i === homeB[0] && j === homeB[1]) return true;
    
    const moves = getValidMoves({ A: [i, j] });
    for (const [ni, nj] of moves) {
      const key = [ni, nj].join(',');
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([ni, nj]);
      }
    }
  }
  
  return false;
}

// Start game
initCanvas();
draw();

// Add window resize handler
window.addEventListener('resize', () => {
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;
  let BASE_SIZE = Math.min((WIDTH - 40) / NUM_COLS, (HEIGHT - 200) / NUM_ROWS);
  MAP_WIDTH = BASE_SIZE * NUM_COLS;
  MAP_HEIGHT = BASE_SIZE * NUM_ROWS;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  
  // Recalculate positions
  const cellSpacingX = MAP_WIDTH / (NUM_COLS + 1);
  const cellSpacingY = MAP_HEIGHT / (NUM_ROWS + 1);
  for (let i = 0; i < NUM_ROWS; i++) {
    for (let j = 0; j < NUM_COLS; j++) {
      positions[`${i},${j}`] = {
        x: Math.floor((j + 1) * cellSpacingX),
        y: Math.floor((i + 1) * cellSpacingY)
      };
    }
  }
  
  // Reset camera position
  offsetX = WIDTH / 2 - MAP_WIDTH * zoom / 2;
  offsetY = HEIGHT / 2 - MAP_HEIGHT * zoom / 2;
});

// Add score update to draw function
const originalDraw = draw;
draw = function() {
  originalDraw();
  updateScoreDisplay();
}
