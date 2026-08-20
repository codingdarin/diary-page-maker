/*
 * render.js — 순수 렌더 모듈 (DOM 접근 없음)
 * buildPageSvg(settings)가 완전한 <svg> 문자열을 반환한다.
 * 미리보기와 PNG 내보내기가 이 함수 하나를 공유한다.
 */

var PAGE_W = 800;
var PAGE_H = 1000; // 4:5 비율 고정

function roundedRectPath(x, y, w, h, r) {
  var maxR = Math.min(w, h) / 2;
  r = Math.max(0, Math.min(r, maxR));
  return (
    'M' + (x + r) + ' ' + y +
    'H' + (x + w - r) +
    'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) +
    'V' + (y + h - r) +
    'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) +
    'H' + (x + r) +
    'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) +
    'V' + (y + r) +
    'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y +
    'Z'
  );
}

/* 시드 고정 PRNG — Math.random() 금지 (렌더마다 결과가 같아야 미리보기=출력) */
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- 왜곡(손그림) 공통 파라미터 ----
 * cartoonAmp: 진폭 배율 (0=반듯 — 왜곡 없음, ~3=크게 구불)
 * cartoonSeed: 패턴 변형 (시드 오프셋)
 * 설정이 없는 구버전 프리셋에도 안전한 기본값을 준다. */
function jitterAmpScale(s) {
  return s.cartoonAmp == null ? 1 : s.cartoonAmp;
}
function jitterSeedOffset(s) {
  return (s.cartoonSeed == null ? 0 : s.cartoonSeed) * 7919;
}
function isDistorted(s) {
  return jitterAmpScale(s) > 0;
}

/* 손그림 직선 — 저주파 노이즈로 흔든 path. horizontal=true면 c가 y(수평선), 아니면 c가 x(수직선) */
function cartoonSegPath(p1, p2, c, horizontal, lineIndex, s) {
  var rng = mulberry32(777 + lineIndex * 101 + jitterSeedOffset(s));
  var amp = 1.8 * jitterAmpScale(s);
  var step = 16;
  var n = Math.max(3, Math.round((p2 - p1) / step));
  var M = Math.max(3, Math.round(n / 5));
  var ctrl = [];
  for (var k = 0; k <= M; k++) ctrl.push(rng() * 2 - 1);

  var d = [];
  for (var i = 0; i <= n; i++) {
    var t = i / n;
    var u = t * M;
    var k0 = Math.min(M - 1, Math.floor(u));
    var f = u - k0;
    var g = (1 - Math.cos(f * Math.PI)) / 2;
    var off = amp * (ctrl[k0] * (1 - g) + ctrl[k0 + 1] * g);
    var a = p1 + (p2 - p1) * t;
    var x = horizontal ? a : c + off;
    var y = horizontal ? c + off : a;
    d.push((i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1));
  }
  return d.join('');
}

/* ---- 내지 콘텐츠 마진 ----
 * %를 논리 px로 변환. 6공 모드는 홀을 피하는 최소 왼쪽 여백 보장 */
var PUNCH_MIN_LEFT = 96;

function contentMargins(s) {
  var left = (PAGE_W * s.marginLeft) / 100;
  if (s.punchHoles) left = Math.max(left, PUNCH_MIN_LEFT);
  return {
    top: (PAGE_H * s.marginTop) / 100,
    bottom: (PAGE_H * s.marginBottom) / 100,
    left: left,
    right: (PAGE_W * s.marginRight) / 100
  };
}

/* 지정한 사각 영역 안에 패턴을 그린다. 구조형 페이지가 서로 다른 영역에서 재사용한다. */
function renderPaperMarks(s, type, x1, y1, x2, y2, seedOffset) {
  if (!type || type === 'plain') return '';
  if (x2 - x1 < 4 || y2 - y1 < 4) return '';
  seedOffset = seedOffset || 0;
  var sp = s.paperSpacing;
  var distorted = isDistorted(s);
  var out = [];
  var idx, x, y;

  if (type === 'lined' || type === 'dashed') {
    var dParts = [];
    idx = 0;
    for (y = y1 + sp; y <= y2; y += sp) {
      dParts.push(distorted
        ? cartoonSegPath(x1, x2, y, true, idx + seedOffset, s)
        : 'M' + x1 + ' ' + y.toFixed(1) + 'L' + x2 + ' ' + y.toFixed(1));
      idx++;
    }
    var dash = type === 'dashed' ? ' stroke-dasharray="2 12"' : '';
    out.push('<path d="' + dParts.join('') + '" fill="none" stroke="' + s.paperColor +
      '" stroke-width="' + s.paperWidth + '" stroke-linecap="round"' + dash + '/>');
  } else if (type === 'grid') {
    var gParts = [];
    idx = 0;
    for (y = y1 + sp; y <= y2; y += sp) {
      gParts.push(distorted
        ? cartoonSegPath(x1, x2, y, true, idx + seedOffset, s)
        : 'M' + x1 + ' ' + y.toFixed(1) + 'L' + x2 + ' ' + y.toFixed(1));
      idx++;
    }
    idx = 1000; // 수직선은 시드 대역을 분리해 수평선과 모양이 겹치지 않게
    for (x = x1 + sp; x <= x2; x += sp) {
      gParts.push(distorted
        ? cartoonSegPath(y1, y2, x, false, idx + seedOffset, s)
        : 'M' + x.toFixed(1) + ' ' + y1 + 'L' + x.toFixed(1) + ' ' + y2);
      idx++;
    }
    out.push('<path d="' + gParts.join('') + '" fill="none" stroke="' + s.paperColor +
      '" stroke-width="' + s.paperWidth + '"/>');
  } else if (type === 'dots') {
    var r = s.paperWidth * 1.5;
    var rng = mulberry32(4242 + seedOffset + jitterSeedOffset(s));
    var amp = 1.5 * jitterAmpScale(s);
    for (y = y1 + sp / 2; y <= y2; y += sp) {
      for (x = x1 + sp / 2; x <= x2; x += sp) {
        var cx = x, cy = y, rr = r;
        if (distorted) {
          cx += (rng() * 2 - 1) * amp;
          cy += (rng() * 2 - 1) * amp;
          rr = r * (1 + (rng() * 2 - 1) * 0.25 * jitterAmpScale(s));
        }
        out.push('<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) +
          '" r="' + Math.max(0.4, rr).toFixed(2) + '" fill="' + s.paperColor + '"/>');
      }
    }
  } else if (type === 'cross') {
    var arm = 5;
    var rng2 = mulberry32(6161 + seedOffset + jitterSeedOffset(s));
    var amp2 = 1.5 * jitterAmpScale(s);
    var cParts = [];
    for (y = y1 + sp / 2; y <= y2; y += sp) {
      for (x = x1 + sp / 2; x <= x2; x += sp) {
        var px = x, py = y;
        if (distorted) {
          px += (rng2() * 2 - 1) * amp2;
          py += (rng2() * 2 - 1) * amp2;
        }
        cParts.push(
          'M' + (px - arm).toFixed(1) + ' ' + py.toFixed(1) + 'H' + (px + arm).toFixed(1) +
          'M' + px.toFixed(1) + ' ' + (py - arm).toFixed(1) + 'V' + (py + arm).toFixed(1)
        );
      }
    }
    out.push('<path d="' + cParts.join('') + '" fill="none" stroke="' + s.paperColor +
      '" stroke-width="' + s.paperWidth + '" stroke-linecap="round"/>');
  }

  return '<g opacity="' + s.paperOpacity + '">' + out.join('') + '</g>';
}

function templateRule(x1, y1, x2, y2, s, opacity, dash) {
  return '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' +
    y2.toFixed(1) + '" fill="none" stroke="' + s.paperColor + '" stroke-width="' +
    Math.max(1, s.paperWidth * 0.72) + '" stroke-linecap="round" opacity="' + opacity +
    '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
}

function renderRegionElement(s, type, x1, y1, x2, y2, seedOffset) {
  type = type || 'blank';
  if (type === 'blank') return '';
  if (['lined', 'dashed', 'dots', 'grid', 'cross', 'plain'].indexOf(type) >= 0) {
    return renderPaperMarks(s, type, x1, y1, x2, y2, seedOffset);
  }

  var w = x2 - x1;
  var h = y2 - y1;
  var out = [];
  var ink = s.paperColor;

  if (type === 'date') {
    var baseline = y2 - Math.max(10, Math.min(20, h * 0.14));
    out.push('<text x="' + x1.toFixed(1) + '" y="' + (y1 + Math.min(34, h * 0.34)).toFixed(1) +
      '" fill="' + ink + '" font-family="Georgia,serif" font-size="' + Math.max(13, Math.min(20, h * 0.18)).toFixed(1) +
      '" font-weight="700" letter-spacing="2.5">DATE</text>');
    out.push('<text x="' + (x2 - Math.min(205, w * 0.42)).toFixed(1) + '" y="' +
      (y1 + Math.min(34, h * 0.34)).toFixed(1) + '" fill="' + ink +
      '" font-family="Georgia,serif" font-size="' + Math.max(12, Math.min(17, h * 0.16)).toFixed(1) +
      '" letter-spacing="4">20   .   .</text>');
    out.push('<path d="M' + x1.toFixed(1) + ' ' + baseline.toFixed(1) + 'H' + x2.toFixed(1) +
      '" stroke="' + ink + '" stroke-width="' + Math.max(4, s.paperWidth * 2.8) +
      '" stroke-linecap="butt"/>');
  } else if (type === 'boldRule' || type === 'halfRule') {
    var ruleWidth = type === 'halfRule' ? w * 0.5 : w;
    var ruleY = y1 + h * 0.5;
    out.push('<path d="M' + x1.toFixed(1) + ' ' + ruleY.toFixed(1) + 'H' +
      (x1 + ruleWidth).toFixed(1) + '" stroke="' + ink + '" stroke-width="' +
      Math.max(5, s.paperWidth * 3.2) + '" stroke-linecap="butt"/>');
    out.push('<path d="M' + x1.toFixed(1) + ' ' + (ruleY + 13).toFixed(1) + 'H' +
      (x1 + Math.min(ruleWidth, w * 0.28)).toFixed(1) + '" stroke="' + ink +
      '" stroke-width="' + Math.max(1, s.paperWidth * 0.65) + '" opacity="0.5"/>');
  } else if (type === 'checklist') {
    var rowGap = Math.max(38, Math.min(64, s.paperSpacing * 1.25));
    for (var rowY = y1 + 16; rowY <= y2 - 12; rowY += rowGap) {
      out.push('<rect x="' + x1.toFixed(1) + '" y="' + (rowY - 8).toFixed(1) +
        '" width="16" height="16" fill="none" stroke="' + ink + '" stroke-width="' +
        Math.max(1, s.paperWidth * 0.72) + '"/>');
      var writingLineY = rowY + 21;
      out.push(templateRule(x1 + 28, writingLineY, x2, writingLineY, s, 0.56));
    }
  }

  return '<g opacity="' + s.paperOpacity + '">' + out.join('') + '</g>';
}

function regionRatio(value, fallback, min, max) {
  var n = Number(value);
  if (!isFinite(n)) n = fallback;
  return Math.max(min, Math.min(max, n));
}

function parseGridMerges(value, rows, cols) {
  if (!value) return [];
  try {
    var groups = JSON.parse(value);
    if (Array.isArray(groups)) {
      return groups.map(function (cells) {
        return { cells: cells.map(Number).filter(function (i) { return i >= 0 && i < rows * cols; }) };
      }).filter(function (g) { return g.cells.length > 1; });
    }
  } catch (e) {}
  return String(value).split(';').map(function (part) {
    var v = part.split(',').map(Number);
    var cells = [];
    for (var r = v[0]; r < v[0] + v[2]; r++) {
      for (var c = v[1]; c < v[1] + v[3]; c++) cells.push(r * cols + c);
    }
    return { cells: cells };
  }).filter(function (m) {
    return m.cells.length > 1 && m.cells.every(function (i) { return i >= 0 && i < rows * cols; });
  });
}

function areaSettings(s, key) {
  var styles = {};
  try { styles = JSON.parse(s.areaStyles || '{}'); } catch (e) {}
  var local = styles[key] || {};
  return Object.assign({}, s, local);
}

/* ---- 격자 페이지 구성 ---- */
function renderPaper(s) {
  var m = contentMargins(s);
  var x1 = m.left, x2 = PAGE_W - m.right;
  var y1 = m.top, y2 = PAGE_H - m.bottom;
  if (x2 - x1 < 4 || y2 - y1 < 4) return '';

  var w = x2 - x1;
  var h = y2 - y1;
  var gap = Math.max(18, Math.min(28, s.paperSpacing * 0.58));
  var content = [];
  var cols = Math.max(1, Math.min(3, Number(s.gridCols) || 1));
  var rows = Math.max(1, Math.min(3, Number(s.gridRows) || 1));
  var usableW = w - gap * (cols - 1);
  var usableH = h - gap * (rows - 1);
  var colCuts = cols === 3
    ? [0, regionRatio(s.gridColRatio1, 0.333, 0.16, 0.68), regionRatio(s.gridColRatio2, 0.667, 0.32, 0.84), 1]
    : cols === 2 ? [0, regionRatio(s.gridColRatio1, 0.5, 0.2, 0.8), 1] : [0, 1];
  var rowCuts = rows === 3
    ? [0, regionRatio(s.gridRowRatio1, 0.333, 0.12, 0.7), regionRatio(s.gridRowRatio2, 0.667, 0.3, 0.88), 1]
    : rows === 2 ? [0, regionRatio(s.gridRowRatio1, 0.5, 0.12, 0.88), 1] : [0, 1];
  if (cols === 3 && colCuts[2] < colCuts[1] + 0.12) colCuts[2] = colCuts[1] + 0.12;
  if (rows === 3 && rowCuts[2] < rowCuts[1] + 0.1) rowCuts[2] = rowCuts[1] + 0.1;
  var merges = parseGridMerges(s.gridMerges, rows, cols);
  var renderedGroups = {};
  for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
      var cellIndex = row * cols + col;
      var groupIndex = merges.findIndex(function (m) { return m.cells.indexOf(cellIndex) >= 0; });
      if (groupIndex >= 0 && renderedGroups[groupIndex]) continue;
      var cells = groupIndex >= 0 ? merges[groupIndex].cells : [cellIndex];
      if (groupIndex >= 0) renderedGroups[groupIndex] = true;
      var cellRows = cells.map(function (i) { return Math.floor(i / cols); });
      var cellCols = cells.map(function (i) { return i % cols; });
      var minRow = Math.min.apply(null, cellRows), maxRow = Math.max.apply(null, cellRows);
      var minCol = Math.min.apply(null, cellCols), maxCol = Math.max.apply(null, cellCols);
      var cellX1 = x1 + usableW * colCuts[minCol] + gap * minCol;
      var cellX2 = x1 + usableW * colCuts[maxCol + 1] + gap * maxCol;
      var cellY1 = y1 + usableH * rowCuts[minRow] + gap * minRow;
      var cellY2 = y1 + usableH * rowCuts[maxRow + 1] + gap * maxRow;
      var cellKey = 'gridCell' + cellIndex;
      var localSettings = areaSettings(s, cellKey);
      var padding = Math.max(0, Math.min(40, Number(localSettings.areaPadding) || 0,
        (cellX2 - cellX1) / 2 - 1, (cellY2 - cellY1) / 2 - 1));
      var rendered = renderRegionElement(localSettings, s[cellKey] || s.paper || 'lined',
        cellX1 + padding, cellY1 + padding, cellX2 - padding, cellY2 - padding, 100 + cellIndex * 100);
      if (cells.length > 1) {
        var clipId = 'area-clip-' + cellIndex;
        var rects = cells.map(function (i) {
          var rr = Math.floor(i / cols), cc = i % cols;
          var rx1 = x1 + usableW * colCuts[cc] + gap * cc;
          var rx2 = x1 + usableW * colCuts[cc + 1] + gap * cc;
          var ry1 = y1 + usableH * rowCuts[rr] + gap * rr;
          var ry2 = y1 + usableH * rowCuts[rr + 1] + gap * rr;
          if (cells.indexOf(i + 1) >= 0 && cc + 1 < cols) rx2 += gap;
          if (cells.indexOf(i + cols) >= 0 && rr + 1 < rows) ry2 += gap;
          return '<rect x="' + rx1 + '" y="' + ry1 + '" width="' + (rx2 - rx1) + '" height="' + (ry2 - ry1) + '"/>';
        }).join('');
        content.push('<defs><clipPath id="' + clipId + '">' + rects + '</clipPath></defs><g clip-path="url(#' + clipId + ')">' + rendered + '</g>');
      } else content.push(rendered);
    }
  }
  return '<g class="page-layout-grid">' + content.join('') + '</g>';
}

/* ---- 6공 펀칭 ---- */
var HOLE_X = 46;
var HOLE_R = 13;
var HOLE_YS = [208, 270, 332, 668, 730, 792]; // 3개×2그룹, 그룹 중심 y=270/730

/* ---- 왜곡 외곽선(손그림 페이지 형태) ---- */

/* 라운드 사각형 둘레를 일정 간격으로 샘플링 — 각 점의 바깥 법선 포함 */
function perimeterPoints(x, y, w, h, r, step) {
  var pts = [];
  function line(x1, y1, x2, y2, nx, ny) {
    var len = Math.hypot(x2 - x1, y2 - y1);
    var n = Math.max(1, Math.round(len / step));
    for (var i = 0; i < n; i++) {
      var t = i / n;
      pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, nx: nx, ny: ny });
    }
  }
  function arc(cx, cy, a0, a1) {
    var len = Math.max(0.01, r) * (a1 - a0);
    var n = Math.max(2, Math.round(len / step));
    for (var i = 0; i < n; i++) {
      var a = a0 + (a1 - a0) * (i / n);
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
    }
  }
  var PI = Math.PI;
  line(x + r, y, x + w - r, y, 0, -1);
  arc(x + w - r, y + r, -PI / 2, 0);
  line(x + w, y + r, x + w, y + h - r, 1, 0);
  arc(x + w - r, y + h - r, 0, PI / 2);
  line(x + w - r, y + h, x + r, y + h, 0, 1);
  arc(x + r, y + h - r, PI / 2, PI);
  line(x, y + h - r, x, y + r, -1, 0);
  arc(x + r, y + r, PI, 1.5 * PI);
  return pts;
}

/* 저주파 노이즈로 둘레를 법선 방향으로 흔든 닫힌 path — 손그림 느낌 */
function cartoonBorderPath(s) {
  var amp = Math.min(4, 1.2 + s.borderWidth * 0.4) * jitterAmpScale(s);
  var inset = s.borderWidth / 2 + amp;
  var maxR = Math.min(PAGE_W, PAGE_H) / 2 - inset;
  var r = Math.max(0, Math.min(s.cornerRadius, maxR));
  var pts = perimeterPoints(inset, inset, PAGE_W - 2 * inset, PAGE_H - 2 * inset, r, 7);

  var rng = mulberry32(20260702 + jitterSeedOffset(s));
  var M = 28;
  var ctrl = [];
  for (var k = 0; k < M; k++) ctrl.push(rng() * 2 - 1);

  var d = [];
  for (var i = 0; i < pts.length; i++) {
    var u = (i / pts.length) * M;
    var k0 = Math.floor(u) % M;
    var k1 = (k0 + 1) % M;
    var f = u - Math.floor(u);
    var g = (1 - Math.cos(f * Math.PI)) / 2; // 코사인 보간 — 부드러운 흔들림
    var off = amp * (ctrl[k0] * (1 - g) + ctrl[k1] * g);
    var p = pts[i];
    d.push((i === 0 ? 'M' : 'L') + (p.x + p.nx * off).toFixed(1) + ' ' + (p.y + p.ny * off).toFixed(1));
  }
  return d.join('') + 'Z';
}

/* 손그림 원 — 반지름을 저주파 노이즈로 흔든 닫힌 path (왜곡 모드 펀칭 홀용) */
function cartoonCirclePath(cx, cy, r, seed, s) {
  var rng = mulberry32(seed + jitterSeedOffset(s));
  var M = 6;
  var ctrl = [];
  for (var k = 0; k < M; k++) ctrl.push(rng() * 2 - 1);
  var n = 24;
  var amp = 1.3 * jitterAmpScale(s);
  var d = [];
  for (var i = 0; i < n; i++) {
    var t = i / n;
    var u = t * M;
    var k0 = Math.floor(u) % M;
    var k1 = (k0 + 1) % M;
    var f = u - Math.floor(u);
    var g = (1 - Math.cos(f * Math.PI)) / 2;
    var rr = r + amp * (ctrl[k0] * (1 - g) + ctrl[k1] * g);
    var a = t * 2 * Math.PI;
    d.push((i === 0 ? 'M' : 'L') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1));
  }
  return d.join('') + 'Z';
}

/* 페이지 형태 — 왜곡이 켜져 있으면 배경지 자체가 흔들리는 path를 따른다 (선 밖으로 배경이 안 삐져나옴) */
function pageShapePath(s) {
  if (isDistorted(s)) return cartoonBorderPath(s);
  return roundedRectPath(0, 0, PAGE_W, PAGE_H, s.cornerRadius);
}

/* 종이 단면 — 진한 장식선 하나 대신 위쪽 반사광 + 아래로 짙어지는 얇은 단면을 겹친다.
 * borderWidth는 선 굵기보다 단면의 존재감을 조절하는 값으로 해석한다. */
function paperEdgeOverlay(s, uid) {
  if (s.borderWidth <= 0) return '';
  var inset = s.borderWidth / 2;
  var maxR = Math.min(PAGE_W, PAGE_H) / 2;
  var r = Math.max(0, Math.min(s.cornerRadius, maxR) - inset);
  var d = roundedRectPath(inset, inset, PAGE_W - 2 * inset, PAGE_H - 2 * inset, r);
  if (s.edgeStyle === 'uniform') {
    return '<path d="' + d + '" fill="none" stroke="' + s.borderColor + '" stroke-width="' +
      Math.max(0.8, s.borderWidth) + '" stroke-linejoin="round" opacity="0.62"/>';
  }
  var highlightInset = inset + Math.max(0.45, s.borderWidth * 0.2);
  var highlightR = Math.max(0, Math.min(s.cornerRadius, maxR) - highlightInset);
  var highlightD = roundedRectPath(
    highlightInset,
    highlightInset,
    PAGE_W - 2 * highlightInset,
    PAGE_H - 2 * highlightInset,
    highlightR
  );
  return '<path d="' + d + '" fill="none" stroke="url(#paperEdge-' + uid + ')" stroke-width="' +
    Math.max(0.8, s.borderWidth) + '" stroke-linejoin="round"/>' +
    '<path d="' + highlightD + '" fill="none" stroke="#fff" stroke-width="' +
    Math.min(1.1, Math.max(0.45, s.borderWidth * 0.35)) + '" opacity="0.58"/>';
}

/* 외곽 마크업: [defs에 넣을 마스크, 콘텐츠 그룹의 mask 속성, 위에 얹을 외곽선] */
function frameParts(s, uid, pagePath) {
  var defs = '', maskAttr = '', overlay = '';
  var distorted = isDistorted(s);

  if (s.borderWidth > 0 && s.edgeStyle !== 'uniform') {
    defs +=
      '<linearGradient id="paperEdge-' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + s.borderColor + '" stop-opacity="0.12"/>' +
      '<stop offset="0.58" stop-color="' + s.borderColor + '" stop-opacity="0.24"/>' +
      '<stop offset="1" stop-color="' + s.borderColor + '" stop-opacity="0.56"/>' +
      '</linearGradient>';
  }

  // 6공 펀칭 — 외곽선·왜곡과 독립적으로 켜고 끌 수 있다
  // 왜곡 모드에서는 홀 컷아웃·링도 손그림 원으로 그려 톤을 맞춘다
  if (s.punchHoles) {
    var holes = HOLE_YS.map(function (y, i) {
      return distorted
        ? '<path d="' + cartoonCirclePath(HOLE_X, y, HOLE_R, 500 + i * 37, s) + '" fill="#000"/>'
        : '<circle cx="' + HOLE_X + '" cy="' + y + '" r="' + HOLE_R + '" fill="#000"/>';
    }).join('');
    defs =
      '<mask id="pageMask-' + uid + '">' +
      '<path d="' + pagePath + '" fill="#fff"/>' + holes +
      '</mask>';
    maskAttr = ' mask="url(#pageMask-' + uid + ')"';

    // 펀칭 홀 주위 링 — 컷아웃과 같은 시드로 흔들어 홀 윤곽을 핏하게 평행으로 감싼다
    var ringW = distorted ? Math.min(3.5, Math.max(1.5, s.borderWidth * 0.6)) : 1.5;
    var ringOpacity = distorted ? 0.8 : 0.55;
    overlay += HOLE_YS.map(function (y, i) {
      var ringShape = distorted
        ? '<path d="' + cartoonCirclePath(HOLE_X, y, HOLE_R + ringW / 2, 500 + i * 37, s) + '"'
        : '<circle cx="' + HOLE_X + '" cy="' + y + '" r="' + (HOLE_R + 1) + '"';
      return ringShape + ' fill="none" stroke="' + s.borderColor + '" stroke-width="' + ringW +
        '" stroke-linejoin="round" opacity="' + ringOpacity + '"/>';
    }).join('');
  }

  // 외곽선 — 두께 0이면 없음
  if (s.borderWidth > 0) {
    if (distorted) {
      // 배경과 동일한 지터 path를 한 번만 그려 중복선·어긋남을 막는다.
      var edgeStroke = s.edgeStyle === 'uniform' ? s.borderColor : 'url(#paperEdge-' + uid + ')';
      var edgeOpacity = s.edgeStyle === 'uniform' ? ' opacity="0.62"' : '';
      overlay += '<path d="' + pagePath + '" fill="none" stroke="' + edgeStroke +
        '" stroke-width="' + s.borderWidth + '" stroke-linejoin="round" stroke-linecap="round"' +
        edgeOpacity + '/>';
    } else {
      overlay += paperEdgeOverlay(s, uid);
    }
  }

  return { defs: defs, maskAttr: maskAttr, overlay: overlay };
}

/* 그림자 파라미터 — 설정이 없는 구버전 프리셋에도 안전한 기본값 */
function shadowParams(s) {
  return {
    blur: s.shadowBlur == null ? 10 : s.shadowBlur,
    offset: s.shadowOffset == null ? 6 : s.shadowOffset,
    opacity: s.shadowOpacity == null ? 0.3 : s.shadowOpacity
  };
}

/* 같은 문서에 SVG가 여러 개 있어도 defs id가 충돌하지 않도록 호출마다 고유 접미사 부여 */
var svgUid = 0;

function buildPageSvg(s) {
  var uid = ++svgUid;
  var pagePath = pageShapePath(s);

  var parts = [];
  parts.push(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + PAGE_W + ' ' + PAGE_H + '">'
  );

  var frame = frameParts(s, uid, pagePath);

  var shadowDef = '';
  if (s.shadowOn) {
    var sh = shadowParams(s);
    var contactOpacity = Math.min(0.42, sh.opacity * 1.35);
    var ambientOpacity = Math.min(0.28, sh.opacity * 0.72);
    var floorOpacity = Math.min(0.16, sh.opacity * 0.36);
    shadowDef =
      '<filter id="pageShadow-' + uid + '" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="' + Math.max(0.8, sh.blur * 0.12).toFixed(2) +
      '" result="contactBlur"/>' +
      '<feOffset in="contactBlur" dx="' + Math.max(0.8, sh.offset * 0.28).toFixed(2) +
      '" dy="' + Math.max(1.3, sh.offset * 0.48).toFixed(2) + '" result="contactOffset"/>' +
      '<feFlood flood-color="#49372c" flood-opacity="' + contactOpacity.toFixed(3) + '" result="contactColor"/>' +
      '<feComposite in="contactColor" in2="contactOffset" operator="in" result="contactShadow"/>' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="' + Math.max(2, sh.blur * 0.72).toFixed(2) +
      '" result="ambientBlur"/>' +
      '<feOffset in="ambientBlur" dx="' + (sh.offset * 0.75).toFixed(2) +
      '" dy="' + (sh.offset * 1.05).toFixed(2) + '" result="ambientOffset"/>' +
      '<feFlood flood-color="#5d493c" flood-opacity="' + ambientOpacity.toFixed(3) + '" result="ambientColor"/>' +
      '<feComposite in="ambientColor" in2="ambientOffset" operator="in" result="ambientShadow"/>' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="' + Math.max(4, sh.blur * 1.35).toFixed(2) +
      '" result="floorBlur"/>' +
      '<feOffset in="floorBlur" dx="' + (sh.offset * 0.35).toFixed(2) +
      '" dy="' + (sh.offset * 1.5).toFixed(2) + '" result="floorOffset"/>' +
      '<feFlood flood-color="#6d5848" flood-opacity="' + floorOpacity.toFixed(3) + '" result="floorColor"/>' +
      '<feComposite in="floorColor" in2="floorOffset" operator="in" result="floorShadow"/>' +
      '<feMerge><feMergeNode in="floorShadow"/><feMergeNode in="ambientShadow"/>' +
      '<feMergeNode in="contactShadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  }

  var surfaceDef =
    '<linearGradient id="paperSurface-' + uid + '" x1="0" y1="0" x2="0.9" y2="1">' +
    '<stop offset="0" stop-color="#fff" stop-opacity="0.32"/>' +
    '<stop offset="0.45" stop-color="#fff" stop-opacity="0.04"/>' +
    '<stop offset="1" stop-color="#8f7868" stop-opacity="0.055"/>' +
    '</linearGradient>';

  // 페이지 형태 클립 — 곡률이 커져도 내용물이 밖으로 새지 않게
  parts.push(
    '<defs><clipPath id="pageClip-' + uid + '"><path d="' + pagePath + '"/></clipPath>' +
    frame.defs + surfaceDef + shadowDef + '</defs>'
  );

  // 콘텐츠(배경+내지 마킹) — 6공 모드에서는 mask로 홀을 투명하게 뚫는다
  // 투명 배경이면 배경 fill을 생략 — 내지 마킹·외곽선만 남는다 (그림자도 그 알파에서만 생김)
  var content = [];
  if (!s.bgTransparent) {
    content.push('<path d="' + pagePath + '" fill="' + s.bgColor + '"/>');
    content.push('<path d="' + pagePath + '" fill="url(#paperSurface-' + uid + ')"/>');
  }
  content.push('<g clip-path="url(#pageClip-' + uid + ')">' + renderPaper(s) + '</g>');

  // 페이지 전체(콘텐츠+외곽선+펀칭 링)를 한 그룹으로 — 그림자는 이 그룹의 알파에서 생성
  // (마스크로 뚫린 펀칭 홀에는 그림자도 뚫려 실제 종이처럼 보인다)
  var body = '<g' + frame.maskAttr + '>' + content.join('') + '</g>' + frame.overlay;

  if (s.shadowOn) {
    // 그림자가 캔버스 밖으로 잘리지 않도록 페이지를 축소해 중앙 배치
    var sh2 = shadowParams(s);
    var pad = 2 * sh2.blur + sh2.offset;
    var sc = (PAGE_W - 2 * pad) / PAGE_W;
    var tx = (PAGE_W * (1 - sc)) / 2;
    var ty = (PAGE_H * (1 - sc)) / 2;
    parts.push(
      '<g transform="translate(' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ') scale(' + sc.toFixed(4) + ')"' +
      ' filter="url(#pageShadow-' + uid + ')">' + body + '</g>'
    );
  } else {
    parts.push(body);
  }

  parts.push('</svg>');
  return parts.join('');
}
