const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const COLS = 64;
const ROWS = 32;
const SCALE = 15;

canvas.width = COLS * SCALE;
canvas.height = ROWS * SCALE;

/* **************************************************************** */
/* **************************************************************** */

/* Architecture */
let memory = new Uint8Array(4096);
let V = new Uint8Array(16);

let I = 0;
let PC = 0x200;

let stack = [];
let sp = 0;

let delayTimer = 0;
let soundTimer = 0;

let paused = false;
const speed = 10;

/* **************************************************************** */
/* **************************************************************** */

/* Display */

let display = new Array(COLS * ROWS);
for (let i = 0; i < COLS * ROWS; i++) display[i] = 0;

function setPixel(x, y) {
  if (x > COLS) x -= COLS;
  else if (x < 0) x += COLS;
  if (y > ROWS) y -= ROWS;
  else if (y < 0) y += ROWS;

  display[x + y * COLS] ^= 1;
  return display[x + y * COLS] != 1;
}

function clear() {
  display = new Array(COLS * ROWS);
  for (let i = 0; i < COLS * ROWS; i++) display[i] = 0;
}

function paint() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < COLS * ROWS; i++) {
    let x = (i % COLS) * SCALE;
    let y = Math.floor(i / COLS) * SCALE;

    if (display[i] == 1) {
      ctx.fillStyle = "#FFF";
      ctx.fillRect(x, y, SCALE, SCALE);
    }
  }
}

/* **************************************************************** */
/* **************************************************************** */

/* Sound */

const audioCtx = new window.AudioContext();
let oscillator = null;
const FREQ = 440;

function Sound() {
  audioCtx.resume();

  window.addEventListener("click", function () {
    audioCtx.resume();
  });
}

function play() {
  if (audioCtx && !oscillator) {
    oscillator = audioCtx.createOscillator();
    oscillator.frequency.setValueAtTime(FREQ, audioCtx.currentTime);
    oscillator.type = "square";
    oscillator.connect(audioCtx.destination);
    oscillator.start();
  }
}

function stop() {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }
}

/* **************************************************************** */
/* **************************************************************** */

/* Keyboard */

const KEYMAP = {
  49: 0x1, // 1 1
  50: 0x2, // 2 2
  51: 0x3, // 3 3
  52: 0xc, // 4 C
  81: 0x4, // Q 4
  87: 0x5, // W 5
  69: 0x6, // E 6
  82: 0xd, // R D
  65: 0x7, // A 7
  83: 0x8, // S 8
  68: 0x9, // D 9
  70: 0xe, // F E
  90: 0xa, // Z A
  88: 0x0, // X 0
  67: 0xb, // C B
  86: 0xf, // V F
};

let keysPressed = [];
let onNextKeyPress = null;

function isKeyPressed(keyCode) {
  return keysPressed[keyCode];
}

function onKeyDown(event) {
  let key = KEYMAP[event.which || event.keyCode];
  keysPressed[key] = true;
  //   console.log(`keysPressed[${key}]: ${keysPressed[key]}`);

  if (onNextKeyPress !== null && key) {
    onNextKeyPress(parseInt(key));
    onNextKeyPress = null;
  }
}

function onKeyUp(event) {
  let key = KEYMAP[event.which || event.keyCode];
  //   console.log(`key down: ${key}`);
  keysPressed[key] = false;
}

/* **************************************************************** */
/* **************************************************************** */

function loadTomemory(program) {
  // prettier-ignore
  const hexSprites = [
      0xf0, 0x90, 0x90, 0x90, 0xf0, // 0
      0x20, 0x60, 0x20, 0x20, 0x70, // 1
      0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
      0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
      0x90, 0x90, 0xF0, 0x10, 0x10, // 4
      0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
      0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
      0xF0, 0x10, 0x20, 0x40, 0x40, // 7
      0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
      0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
      0xF0, 0x90, 0xF0, 0x90, 0x90, // A
      0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
      0xF0, 0x80, 0x80, 0x80, 0xF0, // C
      0xE0, 0x90, 0x90, 0x90, 0xE0, // D
      0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
      0xF0, 0x80, 0xF0, 0x80, 0x80,  // F
  ];

  for (let i = 0; i < program.length; i++) {
    memory[i] = hexSprites[i];
  }

  for (let i = 0; i < program.length; i++) {
    memory[0x200 + i] = program[i];
  }
  //   console.log(memory);
}

function parseOpcode(opcode) {
  PC += 2;

  let X = (opcode & 0x0f00) >> 8;
  let Y = (opcode & 0x00f0) >> 4;
  let N = opcode & 0x000f;
  let NNN = opcode & 0x0fff;
  let kk = opcode & 0x00ff;

  switch (opcode & 0xf000) {
    case 0x0000:
      switch (opcode & 0xff) {
        case 0xe0:
          clear();
          break;
        case 0xee:
          PC = stack[sp];
          sp--;
          break;
      }
      break;
    case 0x1000:
      PC = NNN;
      break;
    case 0x2000:
      sp++;
      stack[sp] = PC;
      PC = NNN;
      break;
    case 0x3000:
      if (V[X] === kk) {
        PC += 2;
      }
      break;
    case 0x4000:
      if (V[X] != kk) PC += 2;
      break;
    case 0x5000:
      if (V[X] === V[Y]) PC += 2;
      break;
    case 0x6000:
      V[X] = kk;
      break;
    case 0x7000:
      V[X] += kk;
      break;
    case 0x8000:
      switch (opcode & 0xf) {
        case 0x0:
          V[X] = V[Y];
          break;
        case 0x1:
          V[X] = V[X] | V[Y];
          break;
        case 0x2:
          V[X] = V[X] & V[Y];
          break;
        case 0x3:
          V[X] = V[X] ^ V[Y];
          break;
        case 0x4:
          let sum = V[X] + V[Y];

          V[0xf] = 0;

          if (sum > 0xff) V[0xf] = 1;

          V[X] = sum;
          break;
        case 0x5:
          V[0xf] = 0;

          if (V[X] > V[Y]) V[0xf] = 1;

          V[X] = V[X] - V[Y];
          break;
        case 0x6:
          V[0xf] = V[X] & 0x1;
          V[X] = V[X] >> 1;
          break;
        case 0x7:
          V[0xf] = 0;

          if (V[Y] > V[X]) V[0xf] = 1;

          V[X] = V[Y] - V[X];
          break;
        case 0xe:
          V[0xf] = V[X] & 0x80;
          V[X] = V[X] << 1;
          break;
        default:
          throw new Error("SHOULDN'T GET HERE at 0x8000");
      }
      break;
    case 0x9000:
      if (V[X] != V[Y]) PC += 2;
      break;
    case 0xa000:
      I = NNN;
      break;
    case 0xb000:
      PC = V[0x0] + NNN;
      break;
    case 0xc000:
      let rand = Math.floor(Math.random() * 0xff);
      V[X] = rand & kk;
      break;
    case 0xd000:
      let w = 8;

      V[0xf] = 0;

      for (let i = 0; i < N; i++) {
        let sprite = memory[I + i];
        // console.log(`N: ${N}`);
        // console.log(`sprite: ${sprite}`);

        for (let j = 0; j < w; j++) {
          if ((sprite & 0x80) > 0) {
            if (setPixel(V[X] + j, V[Y] + i)) {
              V[0xf] = 1;
            }
          }
          sprite <<= 1;
        }
      }
      break;
    case 0xe000:
      switch (opcode & 0xff) {
        case 0x9e:
          if (isKeyPressed(V[X])) PC += 2;
          break;
        case 0xa1:
          if (!isKeyPressed(V[X])) PC += 2;
          break;
        default:
          throw new Error("SHOULDN'T GET HERE at 0xE000");
      }
      break;
    case 0xf000:
      switch (opcode & 0xff) {
        case 0x07:
          V[X] = delayTimer;
          break;
        case 0x0a:
          paused = true;

          let nextKeyPress = (key) => {
            V[X] = key;
            paused = false;
          };
          onNextKeyPress = nextKeyPress; // TODO: Probably a problem
          break;
        case 0x15:
          delayTimer = V[X];
          break;
        case 0x18:
          soundTimer = V[X];
          break;
        case 0x1e:
          I += V[X];
          break;
        case 0x29:
          I = V[X] * 5;
          break;
        case 0x33:
          memory[I] = parseInt(V[X] / 100);
          memory[I + 1] = parseInt((V[X] % 100) / 10);
          memory[I + 2] = parseInt(V[X] % 10);
          break;
        case 0x55:
          for (let ri = 0; ri < X; ri++) {
            memory[I + ri] = V[ri];
          }
          break;
        case 0x65:
          for (let ri = 0; ri < X; ri++) {
            V[ri] = memory[I + ri];
          }
          break;
        default:
          throw new Error("SHOULDN'T GET HERE at 0xF000");
      }
      break;
    default:
      throw new Error("BAD OPCODE");
  }
}

function updateTimers() {
  if (delayTimer > 0) delayTimer -= 1;

  if (soundTimer > 0) soundTimer -= 1;
}

function chip8Loop() {
  for (let i = 0; i < speed; i++) {
    if (!paused) {
      let opcode = (memory[PC] << 8) | memory[PC + 1];
      //   console.log(opcode.toString(16));
      parseOpcode(opcode);
    }
  }

  if (!paused) updateTimers();

  Sound();
  paint();
}

/* **************************************************************** */
/* **************************************************************** */

/* Main Function */

const FPS = 1000 / 60;
let startTime, now, then, elapsed;

function loop() {
  now = Date.now();
  elapsed = now - then;
  if (elapsed > FPS) {
    chip8Loop();
  }

  requestAnimationFrame(loop);
}

async function load(romName) {
  let res = await fetch(`${romName}`);

  if (res.status === 200) {
    let gameBuffer = await res.arrayBuffer();
    const program = new Uint8Array(gameBuffer);

    then = Date.now();
    startTime = then;

    window.addEventListener("keydown", onKeyDown, false);
    window.addEventListener("keyup", onKeyUp, false);
    loadTomemory(program);

    loop();
  }
}

// load("SPACE-INVADER");
load("pong.rom");
