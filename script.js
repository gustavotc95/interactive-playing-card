(function () {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const MIN_HAND = 1;
  const MAX_HAND = 10;
  const DEFAULT_HAND = 5;
  const DRAG_THRESHOLD = 5;
  const CARD_W = 120;
  const CARD_H = 170;

  const hand = document.getElementById('hand');
  const dropZone = document.getElementById('drop-zone');
  const handCountEl = document.getElementById('hand-count');
  const btnPlus = document.getElementById('btn-plus');
  const btnMinus = document.getElementById('btn-minus');
  const btnReset = document.getElementById('btn-reset');

  const state = {
    hand: [],
    table: [],
    nextId: 1,
    topZ: 100,
  };

  function randomCard() {
    const value = VALUES[Math.floor(Math.random() * VALUES.length)];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return { id: state.nextId++, value, suit, faceUp: true };
  }

  function isRed(suit) {
    return suit === '♥' || suit === '♦';
  }

  function createCardEl(card) {
    const color = isRed(card.suit) ? '#B8000F' : '#1A1A1A';
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = card.id;
    el.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front">
          <svg viewBox="0 0 120 170" width="120" height="170">
            <rect x="0" y="0" width="120" height="170" rx="10" ry="10" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="1"/>
            <text x="12" y="26" font-size="20" font-weight="bold" fill="${color}" font-family="Georgia, serif">${card.value}</text>
            <text x="12" y="44" font-size="16" fill="${color}">${card.suit}</text>
            <text x="60" y="108" font-size="60" fill="${color}" text-anchor="middle">${card.suit}</text>
            <g transform="rotate(180 60 85)">
              <text x="12" y="26" font-size="20" font-weight="bold" fill="${color}" font-family="Georgia, serif">${card.value}</text>
              <text x="12" y="44" font-size="16" fill="${color}">${card.suit}</text>
            </g>
          </svg>
        </div>
        <div class="card-face card-back">
          <svg viewBox="0 0 120 170" width="120" height="170">
            <defs>
              <pattern id="dp-${card.id}" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                <path d="M7 1 L13 7 L7 13 L1 7 Z" fill="#8B1A1A"/>
                <path d="M7 4 L10 7 L7 10 L4 7 Z" fill="#D4AF37" opacity="0.35"/>
              </pattern>
            </defs>
            <rect x="0" y="0" width="120" height="170" rx="10" ry="10" fill="#6B0F0F"/>
            <rect x="6" y="6" width="108" height="158" rx="6" ry="6" fill="url(#dp-${card.id})"/>
            <rect x="6" y="6" width="108" height="158" rx="6" ry="6" fill="none" stroke="#D4AF37" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
    `;
    card.el = el;
    card.inner = el.querySelector('.card-inner');
    attachDrag(card);
    return el;
  }

  function applyFlip(card) {
    card.inner.style.transform = 'rotateY(' + (card.faceUp ? 0 : 180) + 'deg)';
  }

  function layoutHand() {
    const n = state.hand.length;
    const maxSpread = 55;
    const spread = Math.min(maxSpread, 9 * n);
    const step = n > 1 ? spread / (n - 1) : 0;
    const start = -spread / 2;
    const handW = hand.clientWidth || 680;
    const centerLeft = handW / 2 - CARD_W / 2;

    state.hand.forEach((card, i) => {
      const angle = n > 1 ? start + step * i : 0;
      card.el.style.transformOrigin = '50% 380px';
      card.el.style.left = centerLeft + 'px';
      card.el.style.top = 'auto';
      card.el.style.bottom = '0px';
      card.el.style.transform = 'rotate(' + angle + 'deg)';
      card.el.style.zIndex = 10 + i;
    });
  }

  function updateControls() {
    handCountEl.textContent = state.hand.length;
    btnMinus.disabled = state.hand.length <= MIN_HAND;
    btnPlus.disabled = state.hand.length >= MAX_HAND;
  }

  function addCardToHand() {
    if (state.hand.length >= MAX_HAND) return;
    const c = randomCard();
    const el = createCardEl(c);
    hand.appendChild(el);
    applyFlip(c);
    state.hand.push(c);
    layoutHand();
    updateControls();
  }

  function removeLastFromHand() {
    if (state.hand.length <= MIN_HAND) return;
    const c = state.hand.pop();
    c.el.remove();
    layoutHand();
    updateControls();
  }

  function newHand() {
    const n = state.hand.length + state.table.length || DEFAULT_HAND;
    const target = Math.max(MIN_HAND, Math.min(MAX_HAND, n));
    state.table.forEach((c) => c.el.remove());
    state.table = [];
    state.hand.forEach((c) => c.el.remove());
    state.hand = [];
    for (let i = 0; i < target; i++) addCardToHand();
  }

  function isOverDropZone(x, y) {
    const r = dropZone.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function moveToTable(card, clientX, clientY) {
    const hi = state.hand.indexOf(card);
    if (hi !== -1) state.hand.splice(hi, 1);
    const ti = state.table.indexOf(card);
    if (ti !== -1) state.table.splice(ti, 1);

    const r = dropZone.getBoundingClientRect();
    let x = clientX - r.left - CARD_W / 2;
    let y = clientY - r.top - CARD_H / 2;
    x = Math.max(0, Math.min(r.width - CARD_W, x));
    y = Math.max(0, Math.min(r.height - CARD_H, y));

    dropZone.appendChild(card.el);
    card.el.style.transformOrigin = '50% 50%';
    card.el.style.left = x + 'px';
    card.el.style.top = y + 'px';
    card.el.style.bottom = 'auto';
    card.el.style.transform = 'rotate(0deg)';
    card.el.style.zIndex = ++state.topZ;
    state.table.push(card);
    layoutHand();
    updateControls();
  }

  function returnToHand(card) {
    const ti = state.table.indexOf(card);
    if (ti !== -1) state.table.splice(ti, 1);
    if (state.hand.indexOf(card) === -1) {
      hand.appendChild(card.el);
      state.hand.push(card);
    }
    card.el.style.top = 'auto';
    card.el.style.bottom = '0px';
    layoutHand();
    updateControls();
  }

  function attachDrag(card) {
    const el = card.el;
    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0;
    let baseTransform = '';

    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      baseTransform = el.style.transform || '';
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.style.zIndex = ++state.topZ;
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        moved = true;
        el.classList.add('dragging');
      }
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) ' + baseTransform;
      dropZone.classList.toggle('over', isOverDropZone(e.clientX, e.clientY));
    });

    function end(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      dropZone.classList.remove('over');

      if (!moved) {
        card.faceUp = !card.faceUp;
        applyFlip(card);
        return;
      }

      const over = isOverDropZone(e.clientX, e.clientY);
      const inHand = state.hand.indexOf(card) !== -1;
      const inTable = state.table.indexOf(card) !== -1;

      if (over) {
        moveToTable(card, e.clientX, e.clientY);
      } else if (inHand) {
        layoutHand();
      } else if (inTable) {
        returnToHand(card);
      }
    }

    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  btnPlus.addEventListener('click', addCardToHand);
  btnMinus.addEventListener('click', removeLastFromHand);
  btnReset.addEventListener('click', newHand);

  for (let i = 0; i < DEFAULT_HAND; i++) addCardToHand();
  window.addEventListener('resize', layoutHand);
})();
