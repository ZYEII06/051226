// =============================================
//  國劇臉 FaceMesh 面具特效
// =============================================

let capture;
let faceMesh;
let faces = [];

let maskImages = [];
let maskLoaded = [];
let selectedMask = -1;

// ⚠️ 請將圖片放在與 sketch.js / index.html 相同的資料夾
// 若圖片在子資料夾，請在路徑前加上資料夾名稱，例如 'images/mask1_red.png'
const MASK_FILES = [
  '1778567916145_4379901.png',
  '1778567916146_4379902.png',
  '1778567916146_mask1_red.png',
  '1778567916146_mask2_blue.png',
  '1778567916146_mask3_gold.png',
  '1778567916146_mask4_white.png'
];

const MASK_LABELS = ['紅黑臉', '紫花臉', '紅面具', '藍面具', '金面具', '白面具'];
const MASK_COLORS = ['#c0392b', '#8e44ad', '#e74c3c', '#2980b9', '#f39c12', '#bdc3c7'];

const BTN_SIZE = 70;
const BTN_MARGIN = 12;

function preload() {
  faceMesh = ml5.faceMesh({ maxFaces: 1, refineLandmarks: true, flipped: true });

  for (let i = 0; i < MASK_FILES.length; i++) {
    maskLoaded.push(false);
    maskImages.push(null);
    (function(idx) {
      loadImage(
        MASK_FILES[idx],
        function(img) {
          maskImages[idx] = img;
          maskLoaded[idx] = true;
        },
        function(err) {
          console.warn('無法載入面具:', MASK_FILES[idx]);
          maskImages[idx] = null;
          maskLoaded[idx] = false;
        }
      );
    })(i);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  capture = createCapture(VIDEO);
  capture.size(width * 0.5, height * 0.5);
  capture.hide();
  faceMesh.detectStart(capture, gotFaces);
  imageMode(CORNER);
}

function gotFaces(results) {
  faces = results;
}

function getVideoRect() {
  let vidW = width * 0.5;
  let vidH = height * 0.5;
  let vidX = (width - vidW) / 2;
  let topSpace = 150;
  let vidY = topSpace + (height - topSpace - vidH) / 2;
  if (vidY < topSpace) vidY = topSpace;
  return { x: vidX, y: vidY, w: vidW, h: vidH };
}

function pt(kp, idx, vr) {
  let cx = vr.x + (kp[idx].x / capture.width) * vr.w;
  let cy = vr.y + (kp[idx].y / capture.height) * vr.h;
  return { x: cx, y: cy };
}

function getFaceBBox(kp, vr) {
  let xs = kp.map(k => vr.x + (k.x / capture.width) * vr.w);
  let ys = kp.map(k => vr.y + (k.y / capture.height) * vr.h);
  return {
    x: Math.min(...xs), y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys)
  };
}

function drawLoop(kp, vr, indices, col, sw) {
  push();
  stroke(col[0], col[1], col[2]);
  strokeWeight(sw);
  noFill();
  for (let i = 0; i < indices.length - 1; i++) {
    let a = pt(kp, indices[i], vr);
    let b = pt(kp, indices[i + 1], vr);
    line(a.x, a.y, b.x, b.y);
  }
  let first = pt(kp, indices[0], vr);
  let last  = pt(kp, indices[indices.length - 1], vr);
  line(last.x, last.y, first.x, first.y);
  pop();
}

// =============================================
function draw() {
  background('#e7c6ff');
  let vr = getVideoRect();

  // 標題
  push();
  fill(60, 30, 80);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(26);
  textStyle(BOLD);
  text('教科414730670', width / 2, 16);
  pop();

  drawMaskButtons();

  // 攝影機畫面
  push();
  translate(vr.x + vr.w, vr.y);
  scale(-1, 1);
  image(capture, 0, 0, vr.w, vr.h);
  pop();

  if (faces.length > 0) {
    let face = faces[0];
    let kp = face.keypoints;

    const faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
    ];

    // 臉外填 fdf0d5
    push();
    fill('#fdf0d5');
    noStroke();
    rect(vr.x, vr.y, vr.w, vr.h);
    pop();

    // clip 顯示臉部攝影機畫面
    push();
    drawingContext.save();
    drawingContext.beginPath();
    let p0 = pt(kp, faceOvalIndices[0], vr);
    drawingContext.moveTo(p0.x, p0.y);
    for (let i = 1; i < faceOvalIndices.length; i++) {
      let p = pt(kp, faceOvalIndices[i], vr);
      drawingContext.lineTo(p.x, p.y);
    }
    drawingContext.closePath();
    drawingContext.clip();
    translate(vr.x + vr.w, vr.y);
    scale(-1, 1);
    image(capture, 0, 0, vr.w, vr.h);
    drawingContext.restore();
    pop();

    // 面具疊加
    if (selectedMask >= 0 && maskImages[selectedMask]) {
      let bbox = getFaceBBox(kp, vr);
      let padX    = bbox.w * 0.20;
      let padYTop = bbox.h * 0.28;
      let padYBot = bbox.h * 0.08;
      push();
      tint(255, 215);
      image(maskImages[selectedMask],
        bbox.x - padX,
        bbox.y - padYTop,
        bbox.w + padX * 2,
        bbox.h + padYTop + padYBot
      );
      pop();
    }

    // 無面具時顯示線條
    if (selectedMask < 0) {
      const outerLip = [409,270,269,267,0,37,39,40,185,61,146,91,181,84,17,314,405,321,375,291];
      const innerLip = [76,77,90,180,85,16,315,404,320,307,306,408,304,303,302,11,72,73,74,184];
      const reOuter  = [226,247,30,29,27,28,56,190,243,112,26,22,23,24,110,25];
      const reInner  = [33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7];
      const leOuter  = [446,467,260,259,257,258,286,414,463,341,256,252,253,254,339,255];
      const leInner  = [263,466,388,387,386,385,384,398,362,382,381,380,374,373,390,249];

      drawLoop(kp, vr, outerLip, [255,0,0], 1);
      drawLoop(kp, vr, innerLip, [255,0,0], 1);
      drawLoop(kp, vr, reOuter,  [50,50,60], 15);
      drawLoop(kp, vr, reInner,  [50,50,60], 15);
      drawLoop(kp, vr, leOuter,  [50,50,60], 15);
      drawLoop(kp, vr, leInner,  [50,50,60], 15);
      drawLoop(kp, vr, faceOvalIndices, [0,220,255], 2);
    }
  }
}

// =============================================
//  按鈕 UI
// =============================================
function drawMaskButtons() {
  let total = MASK_FILES.length + 1;
  let btnY  = 52;
  let totalW = total * (BTN_SIZE + BTN_MARGIN) - BTN_MARGIN;
  let startX = (width - totalW) / 2;

  // 無按鈕
  _drawBtn(startX, btnY, '無', '#555555', -1, selectedMask === -1, null, true);

  for (let i = 0; i < MASK_FILES.length; i++) {
    let bx = startX + (i + 1) * (BTN_SIZE + BTN_MARGIN);
    _drawBtn(bx, btnY, MASK_LABELS[i], MASK_COLORS[i], i, selectedMask === i, maskImages[i], maskLoaded[i]);
  }
}

function _drawBtn(x, y, label, col, idx, isSelected, img, loaded) {
  push();
  if (isSelected) {
    drawingContext.shadowBlur  = 14;
    drawingContext.shadowColor = col;
  }
  fill(isSelected ? col : col + '66');
  stroke(isSelected ? '#fff' : col);
  strokeWeight(isSelected ? 3 : 1.5);
  rectMode(CORNER);
  rect(x, y, BTN_SIZE, BTN_SIZE, 10);
  drawingContext.shadowBlur = 0;

  if (img && loaded) {
    push();
    tint(255, isSelected ? 240 : 160);
    image(img, x + 4, y + 4, BTN_SIZE - 8, BTN_SIZE - 22);
    pop();
  } else if (idx >= 0) {
    // 圖片未載入：顯示提示
    push();
    fill(isSelected ? 255 : 180);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(9);
    text('圖片未\n載入', x + BTN_SIZE / 2, y + BTN_SIZE / 2 - 8);
    pop();
  } else {
    // 無 的 X
    push();
    stroke(isSelected ? 255 : 200);
    strokeWeight(3);
    let cx = x + BTN_SIZE / 2, cy = y + BTN_SIZE / 2 - 8;
    let r = 14;
    line(cx - r, cy - r, cx + r, cy + r);
    line(cx + r, cy - r, cx - r, cy + r);
    pop();
  }

  fill(isSelected ? 255 : 230);
  noStroke();
  textAlign(CENTER, BOTTOM);
  textSize(11);
  textStyle(BOLD);
  text(label, x + BTN_SIZE / 2, y + BTN_SIZE - 2);
  pop();
}

function mousePressed() {
  let total  = MASK_FILES.length + 1;
  let btnY   = 52;
  let totalW = total * (BTN_SIZE + BTN_MARGIN) - BTN_MARGIN;
  let startX = (width - totalW) / 2;

  if (mouseX >= startX && mouseX <= startX + BTN_SIZE &&
      mouseY >= btnY    && mouseY <= btnY + BTN_SIZE) {
    selectedMask = -1;
    return;
  }
  for (let i = 0; i < MASK_FILES.length; i++) {
    let bx = startX + (i + 1) * (BTN_SIZE + BTN_MARGIN);
    if (mouseX >= bx && mouseX <= bx + BTN_SIZE &&
        mouseY >= btnY && mouseY <= btnY + BTN_SIZE) {
      // 僅在圖片成功載入時才切換
      if (maskLoaded[i]) {
        selectedMask = (selectedMask === i) ? -1 : i;
      } else {
        console.warn('此面具圖片尚未載入:', MASK_FILES[i]);
      }
      return;
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (capture) capture.size(width * 0.5, height * 0.5);
}