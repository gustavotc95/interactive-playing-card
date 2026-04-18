(function () {
  const cw = document.getElementById('cw');
  const ci = document.getElementById('ci');
  let faceUp = true;
  let dragging = false;
  let moved = false;
  let startX = 0, startY = 0;
  const s = { tx: 0, ty: 0, tilt: 0, scale: 1 };
  const THRESHOLD = 5;

  function apply() {
    cw.style.transform =
      'translate(' + s.tx + 'px,' + s.ty + 'px) rotate(' + s.tilt + 'deg) scale(' + s.scale + ')';
  }

  function applyFlip() {
    ci.style.transform = 'rotateY(' + (faceUp ? 0 : 180) + 'deg)';
  }

  cw.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    try { cw.setPointerCapture(e.pointerId); } catch (_) {}
    cw.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
    cw.style.cursor = 'grabbing';
    s.scale = 1.08;
    apply();
  });

  cw.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved) {
      if (Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD) {
        moved = true;
        cw.style.transition = 'none';
      } else {
        return;
      }
    }
    s.tx = dx;
    s.ty = dy;
    s.tilt = Math.max(-12, Math.min(12, dx / 18));
    apply();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    cw.style.cursor = 'grab';
    cw.style.transition = 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)';
    if (!moved) {
      faceUp = !faceUp;
      applyFlip();
    }
    s.tx = 0; s.ty = 0; s.tilt = 0; s.scale = 1;
    apply();
  }

  cw.addEventListener('pointerup', endDrag);
  cw.addEventListener('pointercancel', endDrag);
})();
