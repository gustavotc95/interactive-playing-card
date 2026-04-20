(function () {
  const SUITS = ["♠", "♥", "♦", "♣"];
  const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  // Tabela da rede: entrada(3) | 5 camadas ocultas(5) | saída(4)
  const COL_SIZES = [3, 5, 5, 5, 5, 5, 4];
  const COLS = COL_SIZES.length;
  const MAX_ROWS = Math.max(...COL_SIZES);
  const HAND_SIZE = 5;
  const FLIPS_PER_PLAYER = 5; // jogadas por partida: entrada + 3 ocultas + saída
  const PLAYERS = 2; // 2+ no futuro

  const PIP_POSITIONS = {
    "2":  [[60, 55], [60, 115]],
    "3":  [[60, 55], [60, 85], [60, 115]],
    "4":  [[38, 55], [82, 55], [38, 115], [82, 115]],
    "5":  [[38, 55], [82, 55], [60, 85], [38, 115], [82, 115]],
    "6":  [[38, 55], [82, 55], [38, 85], [82, 85], [38, 115], [82, 115]],
    "7":  [[38, 55], [82, 55], [60, 70], [38, 85], [82, 85], [38, 115], [82, 115]],
    "8":  [[38, 55], [82, 55], [60, 70], [38, 85], [82, 85], [60, 100], [38, 115], [82, 115]],
    "9":  [[38, 52], [82, 52], [38, 72], [82, 72], [60, 85], [38, 98], [82, 98], [38, 118], [82, 118]],
    "10": [[38, 52], [82, 52], [60, 62], [38, 72], [82, 72], [38, 98], [82, 98], [60, 108], [38, 118], [82, 118]],
  };
  const PIP_SIZE = { "2":36,"3":36,"4":28,"5":28,"6":26,"7":24,"8":24,"9":22,"10":22 };

  let nextId = 1;

  const state = {
    deck: [],
    burned: [],
    board: [],        // board[col] = array de { card, owner | null } (owner = 'p1' | 'p2' se já reivindicado)
    p1: { hand: [], network: [], lastCol: -1, plays: 0 },
    p2: { hand: [], network: [], lastCol: -1, plays: 0 },
    turn: "p1",
    gameOver: false,
  };

  /* ---------- DECK ---------- */
  function buildDeck() {
    const d = [];
    for (const s of SUITS) for (const v of VALUES) {
      d.push({ id: nextId++, value: v, suit: s });
    }
    // Fisher-Yates
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  function cardValue(c) {
    if (c.value === "A") return 11;
    if (c.value === "J" || c.value === "Q" || c.value === "K") return 0;
    return parseInt(c.value, 10);
  }

  function isFigure(v) { return v === "J" || v === "Q" || v === "K"; }

  // Retorna { base: n, bonus: n, pairs: [{v, count, bonus}, ...] }
  function scoreBreakdown(network) {
    const base = network.reduce((a, n) => a + cardValue(n.card), 0);
    const counts = {};
    network.forEach((n) => {
      const v = n.card.value;
      if (isFigure(v)) counts[v] = (counts[v] || 0) + 1;
    });
    const pairs = [];
    let bonus = 0;
    for (const v of Object.keys(counts)) {
      const c = counts[v];
      if (c >= 2) {
        const pairCount = Math.floor(c / 2);
        const b = pairCount * 10;
        bonus += b;
        pairs.push({ v, count: c, bonus: b });
      }
    }
    return { base, bonus, total: base + bonus, pairs };
  }

  // Para desempate: A=14, K=13, Q=12, J=11, demais = face
  function cardRank(c) {
    if (c.value === "A") return 14;
    if (c.value === "K") return 13;
    if (c.value === "Q") return 12;
    if (c.value === "J") return 11;
    return parseInt(c.value, 10);
  }

  function isRed(s) { return s === "♥" || s === "♦"; }

  /* ---------- SVG ---------- */
  function buildCenter(card, color) {
    const v = card.value, s = card.suit;
    if (v === "A")
      return `<text x="60" y="85" font-size="64" fill="${color}" text-anchor="middle" dominant-baseline="central">${s}</text>`;
    if (v === "J" || v === "Q" || v === "K")
      return `<text x="60" y="80" font-size="52" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif">${v}</text>
              <text x="60" y="120" font-size="24" fill="${color}" text-anchor="middle" dominant-baseline="central">${s}</text>`;
    const pips = PIP_POSITIONS[v], size = PIP_SIZE[v];
    return pips.map(([x, y]) => {
      const rot = y > 85 ? ` transform="rotate(180 ${x} ${y})"` : "";
      return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="middle" dominant-baseline="central"${rot}>${s}</text>`;
    }).join("");
  }

  function faceSVG(card) {
    const color = isRed(card.suit) ? "#B8000F" : "#1A1A1A";
    const corner = card.value === "10" ? 16 : 20;
    return `<svg viewBox="0 0 120 170" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="120" height="170" rx="10" ry="10" fill="#fff" stroke="#bbb" stroke-width="1"/>
      <text x="12" y="26" font-size="${corner}" font-weight="bold" fill="${color}" font-family="Georgia, serif">${card.value}</text>
      <text x="12" y="44" font-size="16" fill="${color}">${card.suit}</text>
      ${buildCenter(card, color)}
      <g transform="rotate(180 60 85)">
        <text x="12" y="26" font-size="${corner}" font-weight="bold" fill="${color}" font-family="Georgia, serif">${card.value}</text>
        <text x="12" y="44" font-size="16" fill="${color}">${card.suit}</text>
      </g>
    </svg>`;
  }

  function backSVG(id) {
    return `<svg viewBox="0 0 120 170" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="bp-${id}" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="#8B1A1A"/>
          <path d="M6 4 L8 6 L6 8 L4 6 Z" fill="#D4AF37" opacity="0.35"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width="120" height="170" rx="10" ry="10" fill="#6B0F0F"/>
      <rect x="5" y="5" width="110" height="160" rx="5" ry="5" fill="url(#bp-${id})"/>
      <rect x="5" y="5" width="110" height="160" rx="5" ry="5" fill="none" stroke="#D4AF37" stroke-width="1.3"/>
    </svg>`;
  }

  function makeCardEl(card, faceUp, extraClass = "") {
    const el = document.createElement("div");
    el.className = "card" + (extraClass ? " " + extraClass : "");
    el.dataset.id = card.id;
    el.innerHTML = faceUp ? faceSVG(card) : backSVG(card.id);
    return el;
  }

  /* ---------- DOM ---------- */
  const p1Hand = document.getElementById("p1-hand");
  const p2Hand = document.getElementById("p2-hand");
  const p1SumEl = document.getElementById("p1-sum");
  const p2SumEl = document.getElementById("p2-sum");
  const gridEl = document.getElementById("grid");
  const connEl = document.getElementById("connections");
  const limboEl = document.getElementById("limbo-stack");
  const turnMsg = document.getElementById("turn-msg");
  const winnerEl = document.getElementById("winner");
  const btnReset = document.getElementById("btn-reset");

  /* ---------- INIT ---------- */
  function init() {
    state.deck = buildDeck();
    state.burned = [];
    state.board = [];
    state.p1 = { hand: [], network: [], lastCol: -1, plays: 0 };
    state.p2 = { hand: [], network: [], lastCol: -1, plays: 0 };
    state.turn = "p1";
    state.gameOver = false;
    winnerEl.classList.add("hidden");
    winnerEl.classList.remove("celebrating", "mourning");
    if (confettiLayer) { confettiLayer.remove(); confettiLayer = null; }
    if (defeatLayer) { defeatLayer.remove(); defeatLayer = null; }
    const boardEl = document.querySelector(".board");
    if (boardEl) boardEl.classList.remove("defeat-shake");

    // Distribui 32 cartas na mesa
    for (let c = 0; c < COLS; c++) {
      const col = [];
      for (let r = 0; r < COL_SIZES[c]; r++) col.push({ card: state.deck.pop(), owner: null });
      state.board.push(col);
    }
    // 5 cartas pra cada jogador
    for (let i = 0; i < HAND_SIZE; i++) {
      state.p1.hand.push(state.deck.pop());
      state.p2.hand.push(state.deck.pop());
    }
    // Queima 10 (resto do deck)
    state.burned = state.deck.splice(0, state.deck.length);

    renderAll();
    updateTurnMsg();
  }

  /* ---------- RENDER ---------- */
  function renderAll() {
    renderHand("p1");
    renderHand("p2");
    renderGrid();
    renderBurned();
    renderSums();
    renderConnections();
  }

  function renderHand(who) {
    const host = who === "p1" ? p1Hand : p2Hand;
    host.innerHTML = "";
    const player = state[who];
    player.hand.forEach((c) => {
      const faceUp = who === "p1";
      const el = makeCardEl(c, faceUp, "hand-card disabled");
      host.appendChild(el);
    });
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    for (let c = 0; c < COLS; c++) {
      const colEl = document.createElement("div");
      colEl.className = "col";
      if (c === 0) colEl.classList.add("col-entry");
      if (c === COLS - 1) colEl.classList.add("col-output");
      colEl.dataset.col = c;
      state.board[c].forEach((slot, r) => {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.col = c;
        cell.dataset.row = r;
        const ownerClass = slot.owner ? ` ${slot.owner}-played` : "";
        const faceUp = !!slot.owner;
        const cardEl = makeCardEl(slot.card, faceUp, "placed" + ownerClass);
        cell.appendChild(cardEl);
        if (state.turn === "p1" && !state.gameOver && !slot.owner && isValidPlay("p1", c, r)) {
          cell.classList.add("flippable");
          cell.addEventListener("click", () => flipCard("p1", c, r));
        }
        colEl.appendChild(cell);
      });
      gridEl.appendChild(colEl);
    }
  }

  function renderBurned() {
    limboEl.innerHTML = "";
    state.burned.forEach((c) => limboEl.appendChild(makeCardEl(c, false)));
  }

  function renderSums() {
    p1SumEl.innerHTML = formatSum(state.p1.network);
    p2SumEl.innerHTML = formatSum(state.p2.network);
  }

  function formatSum(network) {
    if (network.length === 0) return "SOMA DA REDE = 0";
    const bd = scoreBreakdown(network);
    const parts = network.map((n) => cardValue(n.card));
    const pairStrs = bd.pairs.map((p) => `(par ${p.v}=${p.bonus})`);
    const all = [...parts, ...pairStrs].join("+");
    return `SOMA DA REDE = ${all}=${bd.total}`;
  }

  function sumOf(who) {
    return scoreBreakdown(state[who].network).total;
  }

  function renderConnections() {
    const rect = gridEl.getBoundingClientRect();
    connEl.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    connEl.style.width = rect.width + "px";
    connEl.style.height = rect.height + "px";
    connEl.innerHTML = "";

    const draw = (network, color) => {
      for (let i = 1; i < network.length; i++) {
        const a = cellCenter(network[i - 1].row, network[i - 1].col, rect);
        const b = cellCenter(network[i].row, network[i].col, rect);
        if (!a || !b) continue;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
        line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "2.5");
        line.setAttribute("stroke-linecap", "round");
        connEl.appendChild(line);
      }
    };
    draw(state.p1.network, "#ffffff");
    draw(state.p2.network, "#F5C518");
  }

  function cellCenter(row, col, rect) {
    const colEl = gridEl.children[col];
    if (!colEl) return null;
    const cell = colEl.children[row];
    if (!cell) return null;
    const c = cell.getBoundingClientRect();
    return { x: c.left - rect.left + c.width / 2, y: c.top - rect.top + c.height / 2 };
  }

  /* ---------- TURNOS / REGRAS ---------- */
  // Regras de progressão:
  // - primeira jogada deve ser na coluna 0 (entrada)
  // - jogadas seguintes devem estar em coluna estritamente maior que a anterior
  // - última jogada (5ª) deve ser na coluna 6 (saída)
  // - jogador tem 5 plays totais; precisa distribuir em cols 0 e 6 + 3 hidden entre [1..5]
  function validNextCols(player) {
    const plays = player.plays;
    const remaining = FLIPS_PER_PLAYER - plays;
    const last = player.lastCol;
    const cols = [];
    for (let c = last + 1; c < COLS; c++) {
      if (remaining === 1) {
        if (c === COLS - 1) cols.push(c);
      } else {
        if (c < COLS - 1 && c <= COLS - remaining) cols.push(c);
      }
    }
    return cols;
  }

  function updateTurnMsg() {
    if (state.gameOver) { turnMsg.textContent = "Partida encerrada"; return; }
    if (state.turn === "p1") {
      const cols = validNextCols(state.p1).map((c) => c + 1);
      turnMsg.innerHTML = `Sua vez — jogue em uma das colunas <b>${cols.join(", ")}</b>`;
    } else {
      turnMsg.textContent = "Vez do NPC (Player 2)...";
    }
  }

  function isValidPlay(who, col, row) {
    const player = state[who];
    const cols = validNextCols(player);
    if (!cols.includes(col)) return false;
    const slot = state.board[col][row];
    if (!slot || slot.owner) return false;
    return true;
  }

  // Vira um neurônio da mesa, reivindicando-o para a rede do jogador
  function flipCard(who, col, row) {
    const player = state[who];
    if (!isValidPlay(who, col, row)) return false;
    const slot = state.board[col][row];
    slot.owner = who;
    player.network.push({ card: slot.card, row, col });
    player.lastCol = col;
    player.plays += 1;

    const p1Done = state.p1.plays >= FLIPS_PER_PLAYER;
    const p2Done = state.p2.plays >= FLIPS_PER_PLAYER;
    if (p1Done && p2Done) state.gameOver = true;
    else if (state.turn === "p1" && !p2Done) state.turn = "p2";
    else if (state.turn === "p2" && !p1Done) state.turn = "p1";

    renderAll();
    updateTurnMsg();

    if (state.gameOver) { setTimeout(showWinner, 250); return true; }
    if (state.turn === "p2") setTimeout(npcMove, 700);
    return true;
  }

  function npcMove() {
    if (state.gameOver || state.turn !== "p2") return;
    const player = state.p2;
    const cols = validNextCols(player);
    if (cols.length === 0) { state.gameOver = true; renderAll(); return; }
    const col = cols[Math.floor(Math.random() * cols.length)];
    const freeRows = [];
    for (let r = 0; r < COL_SIZES[col]; r++) if (!state.board[col][r].owner) freeRows.push(r);
    const row = freeRows[Math.floor(Math.random() * freeRows.length)];
    flipCard("p2", col, row);
  }

  function showWinner() {
    const s1 = sumOf("p1"), s2 = sumOf("p2");
    winnerEl.classList.remove("hidden", "p1", "p2", "tie", "celebrating", "mourning");
    let winner;
    if (s1 !== s2) winner = s1 > s2 ? "p1" : "p2";
    else winner = tiebreak();
    if (winner === "p1") {
      winnerEl.textContent = "★ PLAYER 1 WINS ★";
      winnerEl.classList.add("p1", "celebrating");
      launchConfetti("p1");
    } else {
      winnerEl.textContent = "✖ PLAYER 2 WINS ✖";
      winnerEl.classList.add("p2", "mourning");
      launchDefeat();
    }
  }

  /* ---------- FESTA ---------- */
  let confettiLayer = null;
  function launchConfetti(who) {
    if (confettiLayer) confettiLayer.remove();
    confettiLayer = document.createElement("div");
    confettiLayer.className = "confetti-layer";
    document.body.appendChild(confettiLayer);

    const palette = who === "p1"
      ? ["#ffffff", "#F5B7C1", "#F5C518", "#9ED1FF", "#B6F5B7"]
      : ["#F5C518", "#FF8C42", "#E53935", "#ffffff", "#9B59B6"];

    const total = 140;
    for (let i = 0; i < total; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      const left = Math.random() * 100;
      const size = 6 + Math.random() * 10;
      const h = size * (1 + Math.random() * 0.8);
      const duration = 2.2 + Math.random() * 2.2;
      const delay = Math.random() * 0.8;
      const rot = Math.floor(Math.random() * 360);
      p.style.left = left + "vw";
      p.style.width = size + "px";
      p.style.height = h + "px";
      p.style.background = palette[Math.floor(Math.random() * palette.length)];
      p.style.animationDuration = duration + "s";
      p.style.animationDelay = delay + "s";
      p.style.transform = `rotate(${rot}deg)`;
      confettiLayer.appendChild(p);
    }

    setTimeout(() => {
      if (confettiLayer) { confettiLayer.remove(); confettiLayer = null; }
    }, 5500);
  }

  let defeatLayer = null;
  function launchDefeat() {
    if (defeatLayer) defeatLayer.remove();
    defeatLayer = document.createElement("div");
    defeatLayer.className = "defeat-layer";
    document.body.appendChild(defeatLayer);

    // cinzas caindo
    const total = 70;
    for (let i = 0; i < total; i++) {
      const p = document.createElement("div");
      p.className = "defeat-ash";
      const left = Math.random() * 100;
      const size = 3 + Math.random() * 5;
      const dur = 4 + Math.random() * 4;
      const delay = Math.random() * 2;
      const dx = (Math.random() - 0.5) * 120;
      p.style.left = left + "vw";
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.animationDuration = dur + "s";
      p.style.animationDelay = delay + "s";
      p.style.setProperty("--dx", dx + "px");
      defeatLayer.appendChild(p);
    }

    const boardEl = document.querySelector(".board");
    if (boardEl) {
      boardEl.classList.remove("defeat-shake");
      void boardEl.offsetWidth;
      boardEl.classList.add("defeat-shake");
      setTimeout(() => boardEl.classList.remove("defeat-shake"), 700);
    }
  }

  // Desempate: maior carta individual da rede; depois soma de ranks; depois aleatório.
  function tiebreak() {
    const maxRank = (who) => Math.max(...state[who].network.map((n) => cardRank(n.card)));
    const m1 = maxRank("p1"), m2 = maxRank("p2");
    if (m1 !== m2) return m1 > m2 ? "p1" : "p2";
    const sumRank = (who) => state[who].network.reduce((a, n) => a + cardRank(n.card), 0);
    const r1 = sumRank("p1"), r2 = sumRank("p2");
    if (r1 !== r2) return r1 > r2 ? "p1" : "p2";
    return Math.random() < 0.5 ? "p1" : "p2";
  }

  window.addEventListener("resize", renderConnections);
  btnReset.addEventListener("click", init);

  const rotateDismissBtn = document.getElementById("rotate-dismiss");
  if (rotateDismissBtn) {
    rotateDismissBtn.addEventListener("click", () => {
      document.body.classList.add("rotate-dismissed");
    });
  }

  init();
})();
