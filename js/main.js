/*
 * main.js — 상태 관리 + 컨트롤 바인딩 + 미리보기 갱신
 */

var state = {
  // 배경
  bgColor: '#fffaf0',
  bgTransparent: false,
  // 내지 (무지/라인/점선/도트/격자/크로스 통합)
  paper: 'lined',
  gridCols: 1,
  gridRows: 2,
  gridColRatio1: 0.5,
  gridColRatio2: 0.667,
  gridRowRatio1: 0.16,
  gridRowRatio2: 0.667,
  gridCell0: 'date',
  gridCell1: 'lined',
  gridCell2: 'lined',
  gridCell3: 'lined',
  gridCell4: 'lined',
  gridCell5: 'lined',
  gridCell6: 'lined',
  gridCell7: 'lined',
  gridCell8: 'lined',
  gridMerges: '',
  areaStyles: '{}',
  regionTop: 'date',
  regionMain: 'lined',
  regionSide: 'checklist',
  regionBottom: 'halfRule',
  regionTopRatio: 0.16,
  regionBottomRatio: 0.15,
  regionSplitRatio: 0.57,
  regionTopSplitRatio: 0.5,
  paperSpacing: 42,
  paperWidth: 1.5,
  paperColor: '#d5c5b2',
  paperOpacity: 0.7,
  // 여백 (%)
  marginTop: 6,
  marginBottom: 6,
  marginLeft: 6,
  marginRight: 6,
  // 외곽
  punchHoles: true,
  edgeStyle: 'paper',
  borderWidth: 1.5, // 0 = 외곽선 없음
  cornerRadius: 30,
  borderColor: '#8b7868',
  // 왜곡 (손그림 효과 — 내지·외곽선·펀칭 공통)
  cartoonAmp: 0, // 0 = 반듯
  cartoonSeed: 0,
  // 그림자
  shadowOn: true,
  shadowBlur: 12,
  shadowOffset: 5,
  shadowOpacity: 0.2,
  // 내보내기
  exportWidth: 1600
};

/* 프리셋 로드 시 누락 필드를 채울 기본값 (이후 버전에서 필드가 늘어나도 안전) */
var DEFAULTS = Object.assign({}, state);

/* 처음부터 완성도 있는 결과를 주는 추천 조합. 세부 컨트롤로 이어서 조정할 수 있다. */
var RECIPES = {
  cream: {
    bgColor: '#fffaf0', paper: 'lined', gridCols: 1, gridRows: 2,
    gridRowRatio1: 0.16, gridCell0: 'date', gridCell1: 'lined', gridMerges: '', areaStyles: '{}',
    regionTop: 'date', regionMain: 'lined', regionSide: 'checklist', regionBottom: 'halfRule',
    regionTopRatio: 0.16, regionBottomRatio: 0.15, regionSplitRatio: 0.57, regionTopSplitRatio: 0.5,
    paperSpacing: 42, paperWidth: 1.5,
    paperColor: '#d5c5b2', paperOpacity: 0.7, punchHoles: true,
    edgeStyle: 'paper',
    borderWidth: 1.5, cornerRadius: 30, borderColor: '#8b7868',
    cartoonAmp: 0, cartoonSeed: 0, shadowOn: true,
    shadowBlur: 12, shadowOffset: 5, shadowOpacity: 0.2
  },
  sage: {
    bgColor: '#f5f6ed', paper: 'dots', gridCols: 2, gridRows: 3,
    gridRowRatio1: 0.14, gridRowRatio2: 0.82, gridColRatio1: 0.58,
    gridCell0: 'date', gridCell1: 'halfRule', gridCell2: 'dots',
    gridCell3: 'dots', gridCell4: 'checklist', gridCell5: 'checklist', gridMerges: '', areaStyles: '{}',
    regionTop: 'date', regionMain: 'dots', regionSide: 'halfRule', regionBottom: 'checklist',
    regionTopRatio: 0.14, regionBottomRatio: 0.15, regionSplitRatio: 0.57, regionTopSplitRatio: 0.5,
    paperSpacing: 34, paperWidth: 1.5,
    paperColor: '#89977d', paperOpacity: 0.6, punchHoles: true,
    edgeStyle: 'paper',
    borderWidth: 1, cornerRadius: 22, borderColor: '#78816f',
    cartoonAmp: 0, cartoonSeed: 11, shadowOn: true,
    shadowBlur: 14, shadowOffset: 5, shadowOpacity: 0.2
  },
  pink: {
    bgColor: '#fff5f3', paper: 'grid', gridCols: 2, gridRows: 1,
    gridColRatio1: 0.57, gridCell0: 'grid', gridCell1: 'checklist', gridMerges: '', areaStyles: '{}',
    regionTop: 'date', regionMain: 'grid', regionSide: 'checklist', regionBottom: 'halfRule',
    regionTopRatio: 0.16, regionBottomRatio: 0.15, regionSplitRatio: 0.57, regionTopSplitRatio: 0.5,
    paperSpacing: 44, paperWidth: 1,
    paperColor: '#dbaaaa', paperOpacity: 0.55, punchHoles: true,
    edgeStyle: 'uniform',
    borderWidth: 1.5, cornerRadius: 42, borderColor: '#b77d79',
    cartoonAmp: 0, cartoonSeed: 23, shadowOn: true,
    shadowBlur: 13, shadowOffset: 5, shadowOpacity: 0.2
  },
  sketch: {
    bgColor: '#f5f1e9', paper: 'dashed', gridCols: 1, gridRows: 1,
    gridCell0: 'dashed', gridMerges: '', areaStyles: '{}',
    regionTop: 'date', regionMain: 'dashed', regionSide: 'checklist', regionBottom: 'boldRule',
    regionTopRatio: 0.16, regionBottomRatio: 0.15, regionSplitRatio: 0.57, regionTopSplitRatio: 0.5,
    paperSpacing: 46, paperWidth: 1.5,
    paperColor: '#6f6a63', paperOpacity: 0.7, punchHoles: false,
    edgeStyle: 'uniform',
    borderWidth: 2, cornerRadius: 16, borderColor: '#625e58',
    cartoonAmp: 1.2, cartoonSeed: 37, shadowOn: true,
    shadowBlur: 10, shadowOffset: 4, shadowOpacity: 0.2
  }
};

var previewEl = document.getElementById('preview');
var previewGuidesVisible = true;
var activeRegionKey = 'gridCell0';
var activeRegionLabel = '1행 1열';
var activeRegionMerge = null;
var cellSelection = null;
var presetDrawerEl = document.getElementById('presetBar');

function setPresetDrawerOpen(open) {
  presetDrawerEl.classList.toggle('open', open);
  document.getElementById('togglePresetDrawerBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
}

document.getElementById('togglePresetDrawerBtn').addEventListener('click', function () {
  setPresetDrawerOpen(!presetDrawerEl.classList.contains('open'));
});
document.getElementById('closePresetDrawerBtn').addEventListener('click', function () {
  setPresetDrawerOpen(false);
  document.getElementById('togglePresetDrawerBtn').focus();
});

function updatePreview() {
  cellSelection = null;
  document.getElementById('cellSelectionBar').hidden = true;
  previewEl.innerHTML = buildPageSvg(state);
  renderPreviewHandles();
  // 투명 배경일 때 미리보기 뒤에 체커보드를 깔아 투명 영역을 표시
  previewEl.classList.toggle('transparent-bg', !!state.bgTransparent);
}

function refreshPreviewSvg() {
  var currentSvg = previewEl.querySelector('svg');
  if (currentSvg) currentSvg.outerHTML = buildPageSvg(state);
  else previewEl.insertAdjacentHTML('afterbegin', buildPageSvg(state));
}

function previewLayoutGeometry() {
  var m = contentMargins(state);
  var x1 = m.left, x2 = PAGE_W - m.right;
  var y1 = m.top, y2 = PAGE_H - m.bottom;
  var w = x2 - x1, h = y2 - y1;
  var gap = Math.max(18, Math.min(28, state.paperSpacing * 0.58));
  var sc = 1, tx = 0, ty = 0;
  if (state.shadowOn) {
    var sh = shadowParams(state);
    var pad = 2 * sh.blur + sh.offset;
    sc = (PAGE_W - 2 * pad) / PAGE_W;
    tx = (PAGE_W * (1 - sc)) / 2;
    ty = (PAGE_H * (1 - sc)) / 2;
  }
  return {
    x1: x1, x2: x2, y1: y1, y2: y2, w: w, h: h, gap: gap,
    sc: sc, tx: tx, ty: ty
  };
}

function previewPercentX(x, g) { return ((g.tx + g.sc * x) / PAGE_W) * 100; }
function previewPercentY(y, g) { return ((g.ty + g.sc * y) / PAGE_H) * 100; }

function gridCuts(axis) {
  var count = Number(state[axis === 'col' ? 'gridCols' : 'gridRows']);
  var first = Number(state[axis === 'col' ? 'gridColRatio1' : 'gridRowRatio1']);
  var second = Number(state[axis === 'col' ? 'gridColRatio2' : 'gridRowRatio2']);
  return count === 3 ? [0, first, second, 1] : count === 2 ? [0, first, 1] : [0, 1];
}

function clampGridRatio(key, value) {
  var isFirst = /Ratio1$/.test(key);
  var otherKey = key.replace(isFirst ? '1' : '2', isFirst ? '2' : '1');
  var count = Number(state[key.indexOf('Col') >= 0 ? 'gridCols' : 'gridRows']);
  var min = isFirst ? 0.12 : 0.24;
  var max = isFirst ? 0.76 : 0.88;
  if (count === 3) {
    if (isFirst) max = Number(state[otherKey]) - 0.1;
    else min = Number(state[otherKey]) + 0.1;
  }
  return Math.max(min, Math.min(max, value));
}

function setHandlePosition(handle, key, g) {
  if (!handle) return;
  var value = Number(state[key]);
  var vertical = key.indexOf('Col') >= 0;
  if (vertical) {
    var usableW = g.w - g.gap * (Number(state.gridCols) - 1);
    var boundaryIndex = /2$/.test(key) ? 2 : 1;
    var x = g.x1 + usableW * value + g.gap * (boundaryIndex - 0.5);
    handle.style.left = previewPercentX(x, g) + '%';
    handle.style.top = previewPercentY(g.y1, g) + '%';
    handle.style.height = previewPercentY(g.y2, g) - previewPercentY(g.y1, g) + '%';
  } else {
    var usableH = g.h - g.gap * (Number(state.gridRows) - 1);
    var rowBoundary = /2$/.test(key) ? 2 : 1;
    var y = g.y1 + usableH * value + g.gap * (rowBoundary - 0.5);
    handle.style.left = previewPercentX(g.x1, g) + '%';
    handle.style.top = previewPercentY(y, g) + '%';
    handle.style.width = previewPercentX(g.x2, g) - previewPercentX(g.x1, g) + '%';
  }
}

function updateRatioFromPointer(key, clientX, clientY) {
  var rect = previewEl.getBoundingClientRect();
  var g = previewLayoutGeometry();
  var svgX = (((clientX - rect.left) / rect.width) * PAGE_W - g.tx) / g.sc;
  var svgY = (((clientY - rect.top) / rect.height) * PAGE_H - g.ty) / g.sc;
  var vertical = key.indexOf('Col') >= 0;
  var count = Number(state[vertical ? 'gridCols' : 'gridRows']);
  var boundaryIndex = /2$/.test(key) ? 2 : 1;
  var usable = (vertical ? g.w : g.h) - g.gap * (count - 1);
  var coordinate = vertical ? svgX - g.x1 : svgY - g.y1;
  var value = (coordinate - g.gap * (boundaryIndex - 0.5)) / usable;
  state[key] = Number(clampGridRatio(key, value).toFixed(3));
  refreshPreviewSvg();
  setHandlePosition(document.querySelector('.region-handle[data-key="' + key + '"]'), key, g);
  syncRecipeSelection();
}

function createRegionHandle(key, orientation, label) {
  var handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'region-handle ' + orientation;
  handle.dataset.key = key;
  handle.setAttribute('aria-label', label);
  handle.title = label;
  handle.addEventListener('pointerdown', function (event) {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('dragging');
    updateRatioFromPointer(key, event.clientX, event.clientY);
  });
  handle.addEventListener('pointermove', function (event) {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    updateRatioFromPointer(key, event.clientX, event.clientY);
  });
  function stopDrag(event) {
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    handle.classList.remove('dragging');
  }
  handle.addEventListener('pointerup', stopDrag);
  handle.addEventListener('pointercancel', stopDrag);
  handle.addEventListener('keydown', function (event) {
    var direction = orientation === 'horizontal'
      ? (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0)
      : (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0);
    if (!direction) return;
    event.preventDefault();
    state[key] = Number(clampGridRatio(key, Number(state[key]) + direction * 0.01).toFixed(3));
    refreshPreviewSvg();
    setHandlePosition(handle, key, previewLayoutGeometry());
    syncRecipeSelection();
  });
  previewEl.appendChild(handle);
  setHandlePosition(handle, key, previewLayoutGeometry());
}

function currentGridMerges() {
  return parseGridMerges(state.gridMerges, Number(state.gridRows), Number(state.gridCols));
}

function saveGridMerges(merges) {
  state.gridMerges = JSON.stringify(merges.map(function (m) { return m.cells.slice().sort(); }));
}

function updateCellSelectionUi() {
  var bar = document.getElementById('cellSelectionBar');
  if (!cellSelection || !cellSelection.dragged) {
    bar.hidden = true;
    previewEl.querySelectorAll('.region-hotspot').forEach(function (el) { el.classList.remove('selecting'); });
    return;
  }
  var selected = Object.keys(cellSelection.cells).map(Number);
  var count = selected.length;
  previewEl.querySelectorAll('.region-hotspot').forEach(function (el) {
    var cells = el.dataset.cells.split(',').map(Number);
    el.classList.toggle('selecting', cells.some(function (i) { return selected.indexOf(i) >= 0; }));
  });
  document.getElementById('cellSelectionMeta').textContent = count + '개 셀 선택';
  bar.hidden = count < 2;
}

function clearCellSelection() {
  cellSelection = null;
  updateCellSelectionUi();
}

function createRegionHotspot(key, label, x1, y1, x2, y2, g, cells) {
  var hotspot = document.createElement('button');
  hotspot.type = 'button';
  hotspot.className = 'region-hotspot';
  hotspot.dataset.regionKey = key;
  hotspot.dataset.cells = cells.join(',');
  hotspot.classList.toggle('active', key === activeRegionKey);
  hotspot.classList.toggle('merged', cells.length > 1);
  hotspot.setAttribute('aria-label', label + ' 영역 선택');
  hotspot.title = label + ' 영역 선택';
  hotspot.style.left = previewPercentX(x1, g) + '%';
  hotspot.style.top = previewPercentY(y1, g) + '%';
  hotspot.style.width = previewPercentX(x2, g) - previewPercentX(x1, g) + '%';
  hotspot.style.height = previewPercentY(y2, g) - previewPercentY(y1, g) + '%';
  hotspot.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    var startX = event.clientX, startY = event.clientY;
    var selectedCells = {};
    cells.forEach(function (i) { selectedCells[i] = true; });
    cellSelection = { cells: selectedCells, sourceKey: key, dragged: false };
    function move(moveEvent) {
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 6) cellSelection.dragged = true;
      var target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      var over = target && target.closest('.region-hotspot');
      if (!over || !previewEl.contains(over)) return;
      over.dataset.cells.split(',').map(Number).forEach(function (i) { cellSelection.cells[i] = true; });
      updateCellSelectionUi();
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!cellSelection.dragged) {
        cellSelection = null;
        selectActiveRegion(key, label, cells);
      } else {
        updateCellSelectionUi();
      }
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  hotspot.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectActiveRegion(key, label, cells);
    }
  });
  previewEl.appendChild(hotspot);
}

function renderRegionHotspots() {
  var g = previewLayoutGeometry();
  var cols = Number(state.gridCols), rows = Number(state.gridRows);
  var colCuts = gridCuts('col'), rowCuts = gridCuts('row');
  var usableW = g.w - g.gap * (cols - 1);
  var usableH = g.h - g.gap * (rows - 1);
  var merges = currentGridMerges();
  var renderedGroups = {};
  for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
      var index = row * cols + col;
      var groupIndex = merges.findIndex(function (m) { return m.cells.indexOf(index) >= 0; });
      if (groupIndex >= 0 && renderedGroups[groupIndex]) continue;
      var cells = groupIndex >= 0 ? merges[groupIndex].cells : [index];
      if (groupIndex >= 0) renderedGroups[groupIndex] = true;
      cells.forEach(function (cellIndex) {
        var rr = Math.floor(cellIndex / cols), cc = cellIndex % cols;
        createRegionHotspot('gridCell' + cells[0], (row + 1) + '행 영역',
          g.x1 + usableW * colCuts[cc] + g.gap * cc,
          g.y1 + usableH * rowCuts[rr] + g.gap * rr,
          g.x1 + usableW * colCuts[cc + 1] + g.gap * cc,
          g.y1 + usableH * rowCuts[rr + 1] + g.gap * rr, g, cells);
      });
    }
  }
}

function createPreviewElementButton() {
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'preview-element-fab';
  button.setAttribute('aria-label', activeRegionLabel + ' 요소 변경');
  button.title = activeRegionLabel + ' 요소 변경';
  button.innerHTML = '<span aria-hidden="true">✎</span><strong>요소</strong>';
  button.addEventListener('click', openActiveRegionElementDialog);
  previewEl.appendChild(button);
}

function renderPreviewHandles() {
  if (!previewGuidesVisible) {
    document.getElementById('previewCaption').textContent = '가이드를 켜면 영역을 직접 편집할 수 있어요';
    return;
  }
  document.getElementById('previewCaption').textContent =
    '칸 클릭은 영역 선택 · 여러 칸 드래그는 셀 병합';
  renderRegionHotspots();
  createPreviewElementButton();
  if (Number(state.gridCols) >= 2) createRegionHandle('gridColRatio1', 'vertical', '첫 번째 세로 분할 조절');
  if (Number(state.gridCols) === 3) createRegionHandle('gridColRatio2', 'vertical', '두 번째 세로 분할 조절');
  if (Number(state.gridRows) >= 2) createRegionHandle('gridRowRatio1', 'horizontal', '첫 번째 가로 분할 조절');
  if (Number(state.gridRows) === 3) createRegionHandle('gridRowRatio2', 'horizontal', '두 번째 가로 분할 조절');
}

function selectActiveRegion(key, label, cells) {
  activeRegionKey = key;
  activeRegionLabel = label;
  syncActiveAreaEditor(label);
  activeRegionMerge = cells && cells.length > 1 ? cells : null;
  previewEl.querySelectorAll('.region-hotspot').forEach(function (hotspot) {
    hotspot.classList.toggle('active', hotspot.dataset.regionKey === key);
  });
  var elementButton = previewEl.querySelector('.preview-element-fab');
  if (elementButton) {
    elementButton.setAttribute('aria-label', label + ' 요소 변경');
    elementButton.title = label + ' 요소 변경';
  }
}

function openActiveRegionElementDialog() {
  document.getElementById('regionDialogTitle').textContent = activeRegionLabel + ' 요소 고르기';
  document.querySelectorAll('[data-region-element]').forEach(function (button) {
    button.classList.toggle('active', button.dataset.regionElement === state[activeRegionKey]);
  });
  document.getElementById('unmergeRegionBtn').hidden = !activeRegionMerge;
  document.getElementById('regionElementDialog').showModal();
}

document.getElementById('changeAreaElementBtn').addEventListener('click', openActiveRegionElementDialog);

function togglePreviewGuides() {
  previewGuidesVisible = !previewGuidesVisible;
  var button = document.getElementById('togglePreviewGuidesBtn');
  button.setAttribute('aria-pressed', previewGuidesVisible ? 'true' : 'false');
  button.textContent = previewGuidesVisible ? '가이드 숨기기 · Q' : '가이드 보기 · Q';
  updatePreview();
}

document.getElementById('togglePreviewGuidesBtn').addEventListener('click', togglePreviewGuides);

document.addEventListener('keydown', function (event) {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.toLowerCase() !== 'q' || document.querySelector('dialog[open]')) return;
  var target = event.target;
  if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return;
  event.preventDefault();
  togglePreviewGuides();
});

document.getElementById('closeRegionDialogBtn').addEventListener('click', function () {
  document.getElementById('regionElementDialog').close();
});

document.getElementById('mergeCellsBtn').addEventListener('click', function () {
  if (!cellSelection) return;
  var selected = Object.keys(cellSelection.cells).map(Number);
  var merges = currentGridMerges();
  var absorbed = [];
  merges = merges.filter(function (m) {
    var hit = m.cells.some(function (i) { return selected.indexOf(i) >= 0; });
    if (hit) absorbed = absorbed.concat(m.cells);
    return !hit;
  });
  selected = Array.from(new Set(selected.concat(absorbed))).sort(function (a, b) { return a - b; });
  var newKey = 'gridCell' + selected[0];
  if (cellSelection.sourceKey !== newKey) {
    state[newKey] = state[cellSelection.sourceKey];
    var styles = readAreaStyles();
    if (styles[cellSelection.sourceKey]) {
      styles[newKey] = Object.assign({}, styles[cellSelection.sourceKey]);
      state.areaStyles = JSON.stringify(styles);
    }
  }
  merges.push({ cells: selected });
  saveGridMerges(merges);
  clearCellSelection();
  syncRecipeSelection();
  updatePreview();
});

document.getElementById('cancelCellSelectionBtn').addEventListener('click', clearCellSelection);

document.getElementById('unmergeRegionBtn').addEventListener('click', function () {
  if (!activeRegionMerge) return;
  saveGridMerges(currentGridMerges().filter(function (m) {
    return m.cells.join(',') !== activeRegionMerge.join(',');
  }));
  activeRegionMerge = null;
  document.getElementById('regionElementDialog').close();
  syncRecipeSelection();
  updatePreview();
});

document.getElementById('regionElementDialog').addEventListener('click', function (event) {
  if (event.target === this) this.close();
});

document.querySelectorAll('[data-region-element]').forEach(function (button) {
  button.addEventListener('click', function () {
    if (!activeRegionKey) return;
    state[activeRegionKey] = button.dataset.regionElement;
    var select = document.getElementById(activeRegionKey);
    if (select) select.value = state[activeRegionKey];
    document.getElementById('regionElementDialog').close();
    syncRecipeSelection();
    updatePreview();
  });
});

/* 컨트롤 바인딩 헬퍼: input#id 값 변경 → state[key] 갱신 → 미리보기 재렌더 */
function bindInput(id, key, isNumber) {
  var el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', function () {
    state[key] = isNumber ? Number(el.value) : el.value;
    updatePreview();
  });
}

/* 라디오 그룹 바인딩: name 그룹 변경 → state[key] 갱신 */
function bindRadio(name, key) {
  var els = document.querySelectorAll('input[name="' + name + '"]');
  els.forEach(function (el) {
    el.addEventListener('change', function () {
      if (el.checked) {
        state[key] = el.value;
        updatePreview();
      }
    });
  });
}

/* 슬라이더 현재값 표시 */
function bindValueLabel(id) {
  var el = document.getElementById(id);
  var label = document.getElementById(id + 'Value');
  if (!el || !label) return;
  el.addEventListener('input', function () { label.textContent = el.value; });
}

bindInput('bgColor', 'bgColor');
document.getElementById('bgTransparent').addEventListener('change', function () {
  state.bgTransparent = this.checked;
  updatePreview();
});

bindRadio('paper', 'paper');
bindRadio('edgeStyle', 'edgeStyle');
['gridCols', 'gridRows'].forEach(function (name) {
  document.querySelectorAll('input[name="' + name + '"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      state[name] = Number(input.value);
      saveGridMerges(currentGridMerges());
      updatePreview();
    });
  });
});
function readAreaStyles() {
  try { return JSON.parse(state.areaStyles || '{}'); } catch (e) { return {}; }
}

function activeAreaStyle() {
  var styles = readAreaStyles();
  return Object.assign({
    paperSpacing: state.paperSpacing,
    paperWidth: state.paperWidth,
    paperColor: state.paperColor,
    paperOpacity: state.paperOpacity,
    areaPadding: 0
  }, styles[activeRegionKey] || {});
}

function writeActiveAreaStyle(field, value) {
  var styles = readAreaStyles();
  styles[activeRegionKey] = Object.assign({}, activeAreaStyle());
  styles[activeRegionKey][field] = value;
  state.areaStyles = JSON.stringify(styles);
}

function syncActiveAreaEditor(label) {
  var style = activeAreaStyle();
  ['paperSpacing', 'paperWidth', 'paperColor', 'paperOpacity', 'areaPadding'].forEach(function (id) {
    document.getElementById(id).value = style[id];
    var value = document.getElementById(id + 'Value');
    if (value) value.textContent = style[id];
  });
  if (label) document.getElementById('activeAreaLabel').textContent = label;
}

['paperSpacing', 'paperWidth', 'paperOpacity', 'areaPadding'].forEach(function (id) {
  document.getElementById(id).addEventListener('input', function () {
    writeActiveAreaStyle(id, Number(this.value));
    document.getElementById(id + 'Value').textContent = this.value;
    updatePreview();
  });
});
document.getElementById('paperColor').addEventListener('input', function () {
  writeActiveAreaStyle('paperColor', this.value);
  updatePreview();
});

/* ---- 여백 UI: 전체 슬라이더 하나 + '방향별로 다르게' 펼침 ---- */
var MARGIN_KEYS = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'];
var marginAllEl = document.getElementById('marginAll');
var marginCustomEl = document.getElementById('marginCustom');
var marginGridEl = document.getElementById('marginGrid');

marginAllEl.addEventListener('input', function () {
  var v = Number(marginAllEl.value);
  MARGIN_KEYS.forEach(function (k) { state[k] = v; });
  document.getElementById('marginAllValue').textContent = marginAllEl.value;
  MARGIN_KEYS.forEach(function (k) { document.getElementById(k).value = v; });
  updatePreview();
});

marginCustomEl.addEventListener('change', function () {
  if (marginCustomEl.checked) {
    marginGridEl.hidden = false;
    MARGIN_KEYS.forEach(function (k) { document.getElementById(k).value = state[k]; });
  } else {
    // 개별 모드 해제 → 전체 슬라이더 값으로 통일
    var v = Number(marginAllEl.value);
    MARGIN_KEYS.forEach(function (k) { state[k] = v; });
    marginGridEl.hidden = true;
    updatePreview();
  }
  marginAllEl.disabled = marginCustomEl.checked;
});

MARGIN_KEYS.forEach(function (k) {
  var el = document.getElementById(k);
  el.addEventListener('input', function () {
    var v = Number(el.value);
    if (isNaN(v)) return;
    state[k] = Math.min(25, Math.max(0, v));
    updatePreview();
  });
});

/* 여백 컨트롤을 state에 맞춰 동기화 (프리셋 로드 시) */
function syncMarginControls() {
  var eq = state.marginTop === state.marginBottom &&
           state.marginTop === state.marginLeft &&
           state.marginTop === state.marginRight;
  marginCustomEl.checked = !eq;
  marginGridEl.hidden = eq;
  marginAllEl.disabled = !eq;
  marginAllEl.value = state.marginTop;
  document.getElementById('marginAllValue').textContent = marginAllEl.value;
  MARGIN_KEYS.forEach(function (k) { document.getElementById(k).value = state[k]; });
}

document.getElementById('punchHoles').addEventListener('change', function () {
  state.punchHoles = this.checked;
  updatePreview();
});
bindInput('borderWidth', 'borderWidth', true);
bindValueLabel('borderWidth');
bindInput('cornerRadius', 'cornerRadius', true);
bindValueLabel('cornerRadius');
bindInput('borderColor', 'borderColor');

bindInput('cartoonAmp', 'cartoonAmp', true);
bindValueLabel('cartoonAmp');
bindInput('cartoonSeed', 'cartoonSeed', true);
bindValueLabel('cartoonSeed');

document.getElementById('shadowOn').addEventListener('change', function () {
  state.shadowOn = this.checked;
  updatePreview();
});
['shadowBlur', 'shadowOffset', 'shadowOpacity'].forEach(function (id) {
  bindInput(id, id, true);
  bindValueLabel(id);
});

/* ---- PNG 내보내기 ----
 * 미리보기와 동일한 buildPageSvg 출력을 캔버스에 래스터화한다.
 * 캔버스를 배경으로 채우지 않으므로 모서리 밖·6공 홀의 투명이 그대로 유지된다. */
var REGION_NAMES = {
  blank: '무지', date: '날짜', lined: '라인', dashed: '점선', dots: '도트',
  grid: '격자', cross: '크로스', checklist: '체크리스트',
  boldRule: '굵은선', halfRule: '반폭선'
};
function exportFileName(s) {
  var parts = [];
  if (s.punchHoles) parts.push('펀칭');
  if (s.borderWidth > 0) parts.push(s.cartoonAmp > 0 ? '카툰선' : '기본선');
  parts.push((s.gridCols || 1) + 'x' + (s.gridRows || 1));
  parts.push(REGION_NAMES[s.gridCell0] || s.gridCell0 || '무지');
  return parts.join('_') + '.png';
}

/* 설정 하나를 PNG로 래스터화해 다운로드 — 현재 상태 내보내기와 프리셋 일괄 내보내기가 공유 */
function rasterizePng(settings, filename, done) {
  var svgText = buildPageSvg(settings);
  var svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  var url = URL.createObjectURL(svgBlob);
  var img = new Image();
  img.onload = function () {
    var w = settings.exportWidth;
    var h = Math.round((w * PAGE_H) / PAGE_W);
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    canvas.toBlob(function (pngBlob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(pngBlob);
      a.download = filename;
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      if (done) done();
    }, 'image/png');
  };
  img.onerror = function () {
    URL.revokeObjectURL(url);
    if (done) done();
  };
  img.src = url;
}

function exportPng() {
  rasterizePng(state, exportFileName(state));
}

document.getElementById('exportWidth').addEventListener('change', function () {
  state.exportWidth = Number(this.value);
});
document.getElementById('exportBtn').addEventListener('click', exportPng);

/* ---- 프리셋 (localStorage) ---- */
var PRESET_KEY = 'diaryPageMaker.presets';

function readPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESET_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function writePresets(presets) {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
    return true;
  } catch (e) {
    alert('프리셋 저장에 실패했습니다: ' + e.message);
    return false;
  }
}

var selectedPreset = null; // 목록에서 선택된 프리셋 이름
var batchChecked = {};     // 일괄 내보내기 체크 상태 (이름 → bool)
var dragSelection = null;  // { pointerId, desired, visited } — 드래그 일괄 선택 상태

function updatePresetSelectionUi(names) {
  names = names || Object.keys(readPresets());
  var selectedCount = names.filter(function (n) { return !!batchChecked[n]; }).length;
  var allSelected = names.length > 0 && selectedCount === names.length;
  var selectAllBtn = document.getElementById('selectAllPresetsBtn');
  selectAllBtn.disabled = names.length === 0;
  selectAllBtn.textContent = allSelected ? '전체 해제' : '전체 선택';
  selectAllBtn.setAttribute('aria-pressed', allSelected ? 'true' : 'false');
  document.getElementById('presetSelectionMeta').textContent = selectedCount + '개 선택';
  var deleteBtn = document.getElementById('deletePresetBtn');
  deleteBtn.disabled = selectedCount === 0 || !!editingPreset;
  deleteBtn.textContent = selectedCount > 0 ? '선택 삭제 (' + selectedCount + ')' : '선택 삭제';
}

function setBatchChecked(name, checked) {
  batchChecked[name] = checked;
  if (checked) {
    selectedPreset = name;
  } else if (selectedPreset === name) {
    selectedPreset = null;
  }
  var rows = document.querySelectorAll('#presetItems li[data-preset]');
  rows.forEach(function (row) {
    var rowName = row.dataset.preset;
    row.classList.toggle('selected', rowName === selectedPreset);
    row.classList.toggle('batch-selected', !!batchChecked[rowName]);
    row.setAttribute('aria-current', rowName === selectedPreset ? 'true' : 'false');
    if (rowName === name) {
      var checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = checked;
    }
  });
  updatePresetSelectionUi();
}

function refreshPresetList(selectName) {
  if (selectName) {
    selectedPreset = selectName;
    batchChecked[selectName] = true;
  }
  var ul = document.getElementById('presetItems');
  var names = Object.keys(readPresets());
  if (selectedPreset && names.indexOf(selectedPreset) < 0) selectedPreset = null;
  if (selectedPreset) batchChecked[selectedPreset] = true;
  ul.innerHTML = '';
  if (names.length === 0) {
    var empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = '저장된 프리셋 없음';
    ul.appendChild(empty);
    updatePresetSelectionUi(names);
    return;
  }
  names.forEach(function (n) {
    var li = document.createElement('li');
    li.dataset.preset = n;
    if (n === selectedPreset) li.className = 'selected';
    li.setAttribute('aria-current', n === selectedPreset ? 'true' : 'false');
    li.classList.toggle('batch-selected', !!batchChecked[n]);
    var dragHandle = document.createElement('button');
    dragHandle.type = 'button';
    dragHandle.className = 'preset-drag-handle';
    dragHandle.textContent = '⠿';
    dragHandle.title = '끌어서 일괄 선택';
    dragHandle.setAttribute('aria-label', n + '부터 드래그 선택');
    dragHandle.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.detail === 0) setBatchChecked(n, !batchChecked[n]);
    });
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!batchChecked[n];
    cb.title = '일괄 내보내기 대상';
    cb.addEventListener('change', function () {
      setBatchChecked(n, cb.checked);
    });
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-name';
    btn.textContent = n;
    btn.title = n;
    btn.addEventListener('click', function () {
      if (editingPreset) return; // 편집 중에는 선택 변경 잠금
      setBatchChecked(n, true);
    });
    li.appendChild(dragHandle);
    li.appendChild(cb);
    li.appendChild(btn);
    ul.appendChild(li);
  });
  updatePresetSelectionUi(names);
}

document.getElementById('selectAllPresetsBtn').addEventListener('click', function () {
  var names = Object.keys(readPresets());
  var shouldSelect = names.some(function (n) { return !batchChecked[n]; });
  names.forEach(function (n) { batchChecked[n] = shouldSelect; });
  if (shouldSelect && !selectedPreset && names.length) selectedPreset = names[0];
  if (!shouldSelect) selectedPreset = null;
  refreshPresetList();
});

document.getElementById('presetItems').addEventListener('pointerdown', function (event) {
  var handle = event.target.closest('.preset-drag-handle');
  var row = handle && handle.closest('li[data-preset]');
  if (!row || event.button !== 0) return;
  event.preventDefault();
  var desired = !batchChecked[row.dataset.preset];
  dragSelection = { pointerId: event.pointerId, desired: desired, visited: {} };
  this.classList.add('drag-selecting');
  this.setPointerCapture(event.pointerId);
  dragSelection.visited[row.dataset.preset] = true;
  setBatchChecked(row.dataset.preset, desired);
});

document.getElementById('presetItems').addEventListener('pointermove', function (event) {
  if (!dragSelection || event.pointerId !== dragSelection.pointerId) return;
  var bounds = this.getBoundingClientRect();
  if (event.clientY < bounds.top + 18) this.scrollTop -= 8;
  if (event.clientY > bounds.bottom - 18) this.scrollTop += 8;
  var target = document.elementFromPoint(event.clientX, event.clientY);
  var row = target && target.closest('#presetItems li[data-preset]');
  if (!row || dragSelection.visited[row.dataset.preset]) return;
  dragSelection.visited[row.dataset.preset] = true;
  setBatchChecked(row.dataset.preset, dragSelection.desired);
});

function endPresetDrag(event) {
  if (!dragSelection || event.pointerId !== dragSelection.pointerId) return;
  document.getElementById('presetItems').classList.remove('drag-selecting');
  dragSelection = null;
}

document.getElementById('presetItems').addEventListener('pointerup', endPresetDrag);
document.getElementById('presetItems').addEventListener('pointercancel', endPresetDrag);

/* 프리셋 로드 후 모든 컨트롤 UI를 state에 맞춘다 */
function syncControls() {
  ['bgColor', 'borderColor'].forEach(function (id) {
    document.getElementById(id).value = state[id];
  });
  ['borderWidth', 'cornerRadius',
   'cartoonAmp', 'cartoonSeed', 'shadowBlur', 'shadowOffset', 'shadowOpacity'].forEach(function (id) {
    var el = document.getElementById(id);
    el.value = state[id];
    var label = document.getElementById(id + 'Value');
    if (label) label.textContent = el.value;
  });
  var paperEl = document.querySelector('input[name="paper"][value="' + state.paper + '"]');
  if (paperEl) paperEl.checked = true;
  ['gridCols', 'gridRows'].forEach(function (name) {
    var el = document.querySelector('input[name="' + name + '"][value="' + state[name] + '"]');
    if (el) el.checked = true;
  });
  var edgeStyleEl = document.querySelector('input[name="edgeStyle"][value="' + state.edgeStyle + '"]');
  if (edgeStyleEl) edgeStyleEl.checked = true;
  syncMarginControls();
  document.getElementById('bgTransparent').checked = !!state.bgTransparent;
  document.getElementById('punchHoles').checked = state.punchHoles;
  document.getElementById('shadowOn').checked = state.shadowOn;
  document.getElementById('exportWidth').value = state.exportWidth;
  syncActiveAreaEditor();
}

function recipeMatches(recipe) {
  return Object.keys(recipe).every(function (key) { return state[key] === recipe[key]; });
}

function syncRecipeSelection() {
  document.querySelectorAll('.recipe-card').forEach(function (button) {
    var selected = recipeMatches(RECIPES[button.dataset.recipe]);
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

document.querySelectorAll('.recipe-card').forEach(function (button) {
  button.addEventListener('click', function () {
    state = Object.assign({}, state, RECIPES[button.dataset.recipe]);
    state.gridMerges = '';
    state.areaStyles = '{}';
    syncControls();
    syncRecipeSelection();
    updatePreview();
  });
});

document.getElementById('controls').addEventListener('input', function (event) {
  if (!event.target.closest('.recipe-card')) window.setTimeout(syncRecipeSelection, 0);
});

document.getElementById('savePresetBtn').addEventListener('click', function () {
  var name = document.getElementById('presetName').value.trim();
  if (!name) {
    alert('프리셋 이름을 입력하세요.');
    return;
  }
  var presets = readPresets();
  presets[name] = Object.assign({}, state);
  if (writePresets(presets)) refreshPresetList(name);
});

/* ---- 프리셋 편집 모드 ----
 * 모달 없이 2단 사이드바의 컨트롤을 그대로 사용해 프리셋을 수정한다.
 * 편집 진입 시 현재 작업 상태를 백업 → 프리셋 값을 state에 로드 →
 * 슬라이더 조절(라이브 미리보기) → '수정 저장'으로 프리셋에 반영, '취소'는 백업 복원. */
var editingPreset = null; // 편집 중인 프리셋의 원래 이름
var editBackup = null;    // 편집 진입 전 작업 상태

function setPresetButtonsDisabled(dis) {
  ['savePresetBtn', 'loadPresetBtn', 'editPresetBtn', 'deletePresetBtn', 'batchExportBtn', 'selectAllPresetsBtn']
    .forEach(function (id) { document.getElementById(id).disabled = dis; });
}

function enterEditMode(name) {
  var presets = readPresets();
  if (!presets[name]) return;
  editingPreset = name;
  editBackup = Object.assign({}, state);
  state = Object.assign({}, DEFAULTS, migratePreset(presets[name]));
  syncControls();
  updatePreview();
  document.getElementById('presetName').value = name; // 이름도 여기서 수정 가능
  document.getElementById('editBannerText').textContent =
    '"' + name + '" 편집 중 — 아래 컨트롤로 조절하세요. 이름 변경은 프리셋 이름칸에서.';
  document.getElementById('editBanner').hidden = false;
  setPresetButtonsDisabled(true);
}

function exitEditMode(restoreBackup) {
  if (restoreBackup && editBackup) {
    state = editBackup;
    syncControls();
    updatePreview();
  }
  editingPreset = null;
  editBackup = null;
  document.getElementById('presetName').value = '';
  document.getElementById('editBanner').hidden = true;
  setPresetButtonsDisabled(false);
}

document.getElementById('editPresetBtn').addEventListener('click', function () {
  if (!selectedPreset) {
    alert('편집할 프리셋을 목록에서 선택하세요.');
    return;
  }
  enterEditMode(selectedPreset);
});

document.getElementById('editSaveBtn').addEventListener('click', function () {
  if (!editingPreset) return;
  var newName = document.getElementById('presetName').value.trim() || editingPreset;
  var presets = readPresets();
  if (newName !== editingPreset) {
    if (presets[newName] &&
        !confirm('"' + newName + '" 프리셋이 이미 있습니다. 덮어쓸까요?')) {
      return;
    }
    delete presets[editingPreset];
    delete batchChecked[editingPreset];
  }
  presets[newName] = Object.assign({}, state);
  if (writePresets(presets)) {
    selectedPreset = newName;
    exitEditMode(false); // 수정한 값을 현재 작업 상태로 유지
    refreshPresetList();
  }
});

document.getElementById('editCancelBtn').addEventListener('click', function () {
  exitEditMode(true);
});

/* ---- 체크한 프리셋 일괄 PNG 내보내기 (순차 다운로드) ---- */
document.getElementById('batchExportBtn').addEventListener('click', function () {
  var presets = readPresets();
  var names = Object.keys(presets).filter(function (n) { return batchChecked[n]; });
  if (names.length === 0) {
    alert('일괄 내보내기할 프리셋을 체크하세요.');
    return;
  }
  var i = 0;
  (function next() {
    if (i >= names.length) return;
    var nm = names[i++];
    var s = Object.assign({}, DEFAULTS, migratePreset(presets[nm]));
    rasterizePng(s, nm + '.png', function () { setTimeout(next, 400); });
  })();
});

/* 구버전 프리셋 호환 — 로드 시점에 새 모델로 변환
 * v1: frameStyle(punch6/cartoon/plain/none) → punchHoles + borderStyle
 * v2: pattern/ruling/lineStyle/borderStyle → paper 통합 + 왜곡(cartoonAmp) 전역화
 * v3: 고정 영역 콘텐츠 → 영역별 요소 선택
 * v4: 이름 붙은 레이아웃 → 1~3행 × 1~3열 격자 */
function migratePreset(p) {
  if (p.frameStyle && p.punchHoles === undefined && p.borderStyle === undefined) {
    var map = {
      punch6: { punchHoles: true, borderStyle: 'plain' },
      cartoon: { punchHoles: false, borderStyle: 'cartoon' },
      plain: { punchHoles: false, borderStyle: 'plain' },
      none: { punchHoles: false, borderStyle: 'none' }
    };
    p = Object.assign({}, p, map[p.frameStyle] || map.none);
  }
  if (p.paper === undefined && (p.ruling !== undefined || p.pattern !== undefined)) {
    var q = Object.assign({}, p);
    var ruled = p.ruling === 'lined' || p.ruling === 'dashed';
    // 내지(라인)와 배경 패턴이 둘 다 있던 프리셋은 내지 우선 (중첩 조합은 새 모델에 없음)
    q.paper = ruled ? p.ruling : (p.pattern && p.pattern !== 'none' ? p.pattern : 'plain');
    q.paperSpacing = ruled
      ? (p.lineSpacing != null ? p.lineSpacing : 36)
      : (p.patternSpacing != null ? p.patternSpacing : 40);
    q.paperWidth = p.lineWidth != null ? p.lineWidth : 2;
    q.paperColor = ruled ? (p.lineColor || '#d8c9b8') : (p.patternColor || '#e8d9c8');
    q.paperOpacity = !ruled && q.paper !== 'plain' && p.patternOpacity != null ? p.patternOpacity : 1;
    var wasCartoon = p.lineStyle === 'cartoon' || p.borderStyle === 'cartoon';
    q.cartoonAmp = wasCartoon ? (p.cartoonAmp != null ? p.cartoonAmp : 1) : 0;
    if (p.borderStyle === 'none') q.borderWidth = 0;
    p = q;
  }
  if (p.regionMain === undefined) p.regionMain = p.paper || DEFAULTS.regionMain;
  if (p.regionTop === undefined) p.regionTop = 'date';
  if (p.regionSide === undefined) p.regionSide = p.layout === 'sections' ? 'halfRule' : 'checklist';
  if (p.regionBottom === undefined) p.regionBottom = 'halfRule';
  if (p.gridCols === undefined || p.gridRows === undefined) {
    p = Object.assign({}, p);
    if (p.layout === 'split') {
      p.gridCols = 2; p.gridRows = 1; p.gridColRatio1 = p.regionSplitRatio || 0.57;
      p.gridCell0 = p.regionMain; p.gridCell1 = p.regionSide;
    } else if (p.layout === 'sections') {
      p.gridCols = 2; p.gridRows = 3;
      p.gridColRatio1 = p.regionTopSplitRatio || 0.5;
      p.gridRowRatio1 = p.regionTopRatio || 0.14;
      p.gridRowRatio2 = 1 - (p.regionBottomRatio || 0.15);
      p.gridCell0 = p.regionTop; p.gridCell1 = p.regionSide;
      p.gridCell2 = p.regionMain; p.gridCell3 = p.regionMain;
      p.gridCell4 = p.regionBottom; p.gridCell5 = p.regionBottom;
    } else if (p.layout === 'title') {
      p.gridCols = 1; p.gridRows = 2; p.gridRowRatio1 = p.regionTopRatio || 0.16;
      p.gridCell0 = p.regionTop; p.gridCell1 = p.regionMain;
    } else {
      p.gridCols = 1; p.gridRows = 1; p.gridCell0 = p.regionMain;
    }
  }
  return p;
}

document.getElementById('loadPresetBtn').addEventListener('click', function () {
  var presets = readPresets();
  if (!selectedPreset || !presets[selectedPreset]) {
    alert('불러올 프리셋을 목록에서 선택하세요.');
    return;
  }
  state = Object.assign({}, DEFAULTS, migratePreset(presets[selectedPreset]));
  syncControls();
  updatePreview();
});

document.getElementById('deletePresetBtn').addEventListener('click', function () {
  var presets = readPresets();
  var names = Object.keys(presets).filter(function (name) { return !!batchChecked[name]; });
  if (names.length === 0) {
    alert('삭제할 프리셋을 체크하세요.');
    return;
  }
  var previewNames = names.slice(0, 5).join(', ') + (names.length > 5 ? ' 외 ' + (names.length - 5) + '개' : '');
  if (!confirm('체크한 프리셋 ' + names.length + '개를 삭제할까요?\n' + previewNames)) return;
  names.forEach(function (name) {
    delete presets[name];
    delete batchChecked[name];
  });
  selectedPreset = null;
  if (writePresets(presets)) refreshPresetList();
});

/* ---- 프리셋 JSON 백업/복원 ---- */
document.getElementById('exportJsonBtn').addEventListener('click', function () {
  var presets = readPresets();
  if (Object.keys(presets).length === 0) {
    alert('내보낼 프리셋이 없습니다.');
    return;
  }
  var blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'diary-presets.json';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
});

document.getElementById('importJsonBtn').addEventListener('click', function () {
  document.getElementById('importJsonFile').click();
});

document.getElementById('importJsonFile').addEventListener('change', function () {
  var file = this.files[0];
  this.value = ''; // 같은 파일을 다시 선택해도 change가 뜨게
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    var incoming;
    try {
      incoming = JSON.parse(reader.result);
    } catch (e) {
      alert('JSON을 읽을 수 없습니다: ' + e.message);
      return;
    }
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      alert('프리셋 JSON 형식이 아닙니다.');
      return;
    }
    var names = Object.keys(incoming).filter(function (n) {
      return incoming[n] && typeof incoming[n] === 'object' && !Array.isArray(incoming[n]);
    });
    if (names.length === 0) {
      alert('가져올 프리셋이 없습니다.');
      return;
    }
    var presets = readPresets();
    var dups = names.filter(function (n) { return presets[n]; });
    if (dups.length &&
        !confirm('기존 프리셋을 덮어씁니다: ' + dups.join(', ') + '\n계속할까요?')) {
      return;
    }
    names.forEach(function (n) { presets[n] = incoming[n]; }); // 구모델이어도 로드 시 마이그레이션됨
    if (writePresets(presets)) {
      refreshPresetList();
      alert(names.length + '개 프리셋을 가져왔습니다.');
    }
  };
  reader.readAsText(file);
});

refreshPresetList();
syncRecipeSelection();
updatePreview();
