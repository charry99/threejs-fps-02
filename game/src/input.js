export function createInput(canvas) {
  const keys = new Set();
  const input = { mouseX: 0, mouseY: 0, primary: false, secondary: false, pointerLocked: false };
  const onKeyDown = event => { keys.add(event.code); };
  const onKeyUp = event => { keys.delete(event.code); };
  const onMouseDown = event => { if (event.button === 0) input.primary = true; if (event.button === 2) input.secondary = true; };
  const onMouseUp = event => { if (event.button === 0) input.primary = false; if (event.button === 2) input.secondary = false; };
  const onMouseMove = event => { input.mouseX += event.movementX || 0; input.mouseY += event.movementY || 0; };
  const onLockChange = () => { input.pointerLocked = document.pointerLockElement === canvas; };
  const preventMenu = event => event.preventDefault();
  let attached = false;
  return {
    attach() {
      if (attached) return;
      attached = true;
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('pointerlockchange', onLockChange);
      canvas.addEventListener('contextmenu', preventMenu);
    },
    held(code) { return keys.has(code); },
    readMouse() { const movement = [input.mouseX, input.mouseY]; input.mouseX = 0; input.mouseY = 0; return movement; },
    requestPointerLock() { if (!input.pointerLocked) return canvas.requestPointerLock?.(); },
    get pointerLocked() { return input.pointerLocked; },
    get primary() { return input.primary; },
    get secondary() { return input.secondary; },
  };
}
