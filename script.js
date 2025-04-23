// Hangul decomposition tables
var CHOSEONG = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
var JUNGSEONG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
var JONGSEONG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
var VERTICAL_VOWELS = ["ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ"];

// Quiz data and board state
var SIZE = 5;
var boardEl = document.getElementById('board');
var boardWrapper = document.getElementById('boardWrapper');
var keywords = JSON.parse(localStorage.getItem('bingo_keywords')) || new Array(SIZE*SIZE).fill('');
var quizData = JSON.parse(localStorage.getItem('bingo_quizData')) || new Array(SIZE*SIZE).fill(null).map(function(){ return { high: { sentences: [], movementIndex: 0 }, mid: { words: [] } }; });
var cellStates = JSON.parse(localStorage.getItem('bingo_colors')) || new Array(SIZE*SIZE).fill('');
var showKeywords = false;
var curIdx = null;
var dragged = null;

// Hangul decomposition helper
function decomposeHangul(s) {
  var code = s.charCodeAt(0) - 0xAC00;
  var initialIndex = Math.floor(code / (21 * 28));
  var medialIndex = Math.floor((code % (21 * 28)) / 28);
  var finalIndex = code % 28;
  return {
    initial: CHOSEONG[initialIndex],
    medial: JUNGSEONG[medialIndex],
    final: JONGSEONG[finalIndex],
    medialChar: JUNGSEONG[medialIndex],
    finalIndex: finalIndex
  };
}

// Create a cell of the bingo board
function createCell(idx) {
  var cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.index = idx;
  if (idx === 12) {
    cell.className += ' middle';
    cell.textContent = '✳';
  } else {
    cell.textContent = showKeywords ? keywords[idx] : '';
    if (cellStates[idx]) cell.classList.add(cellStates[idx]);
    cell.addEventListener('click', function(e) { onCellClick(e, idx); });
  }
  return cell;
}

// Render entire board and strikes
function renderBoard() {
  boardEl.innerHTML = '';
  for (var i = 0; i < SIZE * SIZE; i++) {
    boardEl.appendChild(createCell(i));
  }
  updateStrikes();
}

// Handle cell clicks including Shift+click for editing
function onCellClick(e, idx) {
  var rect = e.currentTarget.getBoundingClientRect();
  var x = e.clientX - rect.left, y = e.clientY - rect.top;
  var row = (y < rect.height/3) ? 0 : (y < 2 * rect.height/3 ? 1 : 2);
  var col = (x < rect.width/2) ? 0 : 1;
  var zone = (row === 0) ? (col === 0 ? 1 : 2)
             : (row === 1) ? (col === 0 ? 5 : 6)
             : (col === 0 ? 3 : 4);

  // Shift+click: 고난이도 질문 편집
  if (e.shiftKey && zone === 1) {
    var g = prompt('문장 가 입력', quizData[idx].high.sentences[0] || '');
    if (g === null) return;
    var n = prompt('문장 나 입력', quizData[idx].high.sentences[1] || '');
    if (n === null) return;
    var moveChoice = prompt('"어찌하다"에 해당하는 문장은 가(1) 또는 나(2)를 입력하세요', '1');
    var mi = (moveChoice === '2') ? 1 : 0;
    quizData[idx].high = { sentences: [g, n], movementIndex: mi };
    localStorage.setItem('bingo_quizData', JSON.stringify(quizData));
    alert('고난이도 문장 및 정답 매핑 저장 완료');
    return;
  }
  // Shift+click: 중난이도 단어 입력
  if (e.shiftKey && zone === 2) {
    var list = prompt('중난이도 단어 쉼표로 구분 입력', quizData[idx].mid.words.join(',') || '');
    if (list === null) return;
    quizData[idx].mid.words = list.split(/\s*,\s*/).filter(Boolean);
    localStorage.setItem('bingo_quizData', JSON.stringify(quizData));
    alert('중난이도 단어 저장 완료');
    return;
  }
  // 일반 동작: 퀴즈 열기 or 색상 토글
  if      (zone === 1) openQuiz(idx, 'high');
  else if (zone === 2) openQuiz(idx, 'mid');
  else if (zone === 5 || zone === 6) openQuiz(idx, 'low');
  else if (zone === 3) toggleColor(idx, 'blue');
  else if (zone === 4) toggleColor(idx, 'red');
}

// Toggle cell color for bingo
function toggleColor(idx, color) {
  cellStates[idx] = (cellStates[idx] === color) ? '' : color;
  localStorage.setItem('bingo_colors', JSON.stringify(cellStates));
  renderBoard();
}

// Draw strike lines when bingo achieved
function updateStrikes() {
  document.querySelectorAll('.strike').forEach(function(el) { el.remove(); });
  var lines = [];
  // rows & cols
  for (var i = 0; i < 5; i++) {
    var rowArr = [], colArr = [];
    for (var j = 0; j < 5; j++) {
      rowArr.push(i * 5 + j);
      colArr.push(j * 5 + i);
    }
    lines.push(rowArr, colArr);
  }
  // diagonals
  lines.push([0,6,12,18,24], [4,8,12,16,20]);

  lines.forEach(function(arr) {
    var cells = arr.map(i => boardEl.children[i]);
    var diag  = arr.includes(12);
    var need  = diag ? 4 : 5;
    var bc = cells.filter((c,i) => !(diag && i===2) && c.classList.contains('blue')).length;
    var rc = cells.filter((c,i) => !(diag && i===2) && c.classList.contains('red')).length;
    if (bc === need || rc === need) drawStrike(arr);
  });
}

// Helper to draw a line between first and last cell
function drawStrike(arr) {
  var f = boardEl.children[arr[0]].getBoundingClientRect();
  var l = boardEl.children[arr[arr.length-1]].getBoundingClientRect();
  var wr = boardWrapper.getBoundingClientRect();
  var x1 = f.left + f.width/2 - wr.left;
  var y1 = f.top  + f.height/2 - wr.top;
  var x2 = l.left + l.width/2 - wr.left;
  var y2 = l.top  + l.height/2 - wr.top;
  var dx = x2 - x1, dy = y2 - y1;
  var len = Math.hypot(dx, dy);
  var ang = Math.atan2(dy, dx) * 180 / Math.PI;
  var line = document.createElement('div');
  line.className = 'strike';
  Object.assign(line.style, {
    width:  len + 'px',
    left:   x1 + 'px',
    top:    y1 + 'px',
    transform: 'rotate(' + ang + 'deg)'
  });
  boardWrapper.appendChild(line);
}

// Quiz modal elements
var quizModal = document.getElementById('quizModal');
var sections  = {
  high: document.getElementById('high-level'),
  mid:  document.getElementById('mid-level'),
  low:  document.getElementById('low-level')
};

// Open quiz modal based on level
function openQuiz(idx, level) {
  curIdx = idx;
  if (level === 'high') {
    var itemsEl  = document.getElementById('high-items');
    var targetEl = document.getElementById('high-target');
    itemsEl.innerHTML  = '';
    targetEl.innerHTML = '';
    var h = quizData[idx].high;
    var labels = { movement: '어찌하다(움직임의 말)', state: '어떠하다(상태나 성질의 말)' };
    // draggable sentences
    h.sentences.forEach(function(txt, i) {
      var cat = (i === h.movementIndex) ? 'movement' : 'state';
      var div = document.createElement('div');
      div.className = 'item';
      div.draggable = true;
      div.dataset.cat = cat;
      div.textContent = txt;
      itemsEl.appendChild(div);
    });
    // droppables
    ['movement','state'].sort(function(){ return Math.random() - 0.5; }).forEach(function(cat) {
      var dz = document.createElement('div');
      dz.className = 'dropzone final';
      dz.dataset.cat = cat;
      dz.textContent = labels[cat];
      targetEl.appendChild(dz);
    });
  } else if (level === 'mid') {
    var itemsEl  = document.getElementById('mid-items');
    var targetEl = document.getElementById('mid-target');
    itemsEl.innerHTML  = '';
    targetEl.innerHTML = '';
    quizData[idx].mid.words.forEach(function(w) {
      var div = document.createElement('div');
      div.className    = 'item';
      div.draggable    = true;
      div.dataset.word = w;
      div.textContent  = w;
      itemsEl.appendChild(div);
    });
    quizData[idx].mid.words.forEach(function(_, i) {
      var slot = document.createElement('div');
      slot.className = 'dropzone slot';
      slot.dataset.slot = i;
      targetEl.appendChild(slot);
    });
  } else {
    var itemsEl   = document.getElementById('low-items');
    var lowTarget = document.getElementById('low-target');
    itemsEl.innerHTML   = '';
    lowTarget.innerHTML = '';
    var syll = keywords[idx] || '가';
    var jamo = decomposeHangul(syll);
    var isVert = VERTICAL_VOWELS.indexOf(jamo.medialChar) !== -1;
    var di = (jamo.finalIndex < JONGSEONG.length - 1) ? jamo.finalIndex + 1 : jamo.finalIndex - 1;
    var distractor = JONGSEONG[di];
    var options = [jamo.final, distractor].sort(function(){ return Math.random() - 0.5; });
    var sylDiv = document.createElement('div');
    sylDiv.className = 'low-syllable ' + (isVert ? 'vertical' : 'horizontal');
    sylDiv.innerHTML =
      '<div class="initial">' + jamo.initial + '</div>' +
      '<div class="medial">' + jamo.medialChar + '</div>' +
      '<div class="dropzone final" data-final="' + jamo.final + '"></div>';
    lowTarget.appendChild(sylDiv);
    options.forEach(function(ch) {
      var div = document.createElement('div');
      div.className    = 'item';
      div.draggable    = true;
      div.dataset.char = ch;
      div.textContent  = ch;
      itemsEl.appendChild(div);
    });
  }
  Object.keys(sections).forEach(function(key){ sections[key].classList.remove('active'); });
  sections[level].classList.add('active');
  quizModal.classList.add('show');
}

// Close button
document.getElementById('closeQuizBtn').onclick = function(){ quizModal.classList.remove('show'); };

// Drag & Drop handling
document.addEventListener('dragstart', function(e){
  if (e.target.classList.contains('item')) {
    dragged = e.target;
    setTimeout(function(){ e.target.style.visibility = 'hidden'; }, 0);
  }
});
document.addEventListener('dragend', function(e){
  if (e.target.classList.contains('item')) {
    e.target.style.visibility = 'visible';
  }
});
document.addEventListener('dragover', function(e){
  var zone = e.target.closest('.dropzone.final, .dropzone.slot');
  if (zone) {
    e.preventDefault();
    zone.classList.add('over');
  }
});
document.addEventListener('dragleave', function(e){
  var zone = e.target.closest('.dropzone.final, .dropzone.slot');
  if (zone) zone.classList.remove('over');
});
document.addEventListener('drop', function(e){
  e.preventDefault();
  if (!dragged) return;
  var zone = e.target.closest('.dropzone.final, .dropzone.slot');
  if (zone) {
    if (zone.dataset.cat) {
      // High-level
      if (dragged.dataset.cat === zone.dataset.cat) {
        zone.textContent = 'O';
        zone.classList.add('correct');
        dragged.remove();
      } else {
        zone.style.background = '#ffcdd2';
        setTimeout(function(){ zone.style.background = '#eaeaea'; }, 500);
      }
    } else if (zone.classList.contains('slot') && dragged.dataset.word) {
      // Mid-level
      zone.textContent = dragged.textContent;
    } else if (zone.dataset.final && dragged.dataset.char) {
      // Low-level
      if (dragged.dataset.char === zone.dataset.final) {
        zone.textContent = dragged.textContent;
        zone.classList.add('correct');
      } else {
        zone.style.background = '#ffcdd2';
        setTimeout(function(){ zone.style.background = '#eaeaea'; }, 500);
      }
    }
    zone.classList.remove('over');
  }
  dragged = null;
});

// Controls: keywords & colors
document.getElementById('setKeywords').onclick = function(){
  var inp = prompt('키워드 25개 쉼표/공백 구분 입력', keywords.join(','));
  if (!inp) return;
  var arr = inp.split(/[\s,]+/).filter(Boolean).slice(0,25);
  arr.forEach(function(k,i){ keywords[i] = k.charAt(0); });
  localStorage.setItem('bingo_keywords', JSON.stringify(keywords));
  renderBoard();
};
document.getElementById('toggleKeywords').onclick = function(){
  showKeywords = !showKeywords;
  renderBoard();
};
document.getElementById('resetColors').onclick = function(){
  if (!confirm('초기화할까요?')) return;
  cellStates = new Array(SIZE*SIZE).fill('');
  localStorage.setItem('bingo_colors', JSON.stringify(cellStates));
  renderBoard();
};
// --- 터치 기반 드래그&드롭 지원 로직 ---
(function(){
  let touchState = {};

  function onTouchStart(e) {
    const el = e.currentTarget;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = el.getBoundingClientRect();

    touchState.el = el;
    touchState.offsetX = touch.clientX - rect.left;
    touchState.offsetY = touch.clientY - rect.top;

    // 드래그 중일 clone 생성
    const clone = el.cloneNode(true);
    clone.classList.add('dragging');
    clone.style.width  = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    document.body.appendChild(clone);
    touchState.clone = clone;

    moveClone(touch);
  }

  function onTouchMove(e) {
    if (!touchState.clone) return;
    e.preventDefault();
    moveClone(e.touches[0]);
  }

  function onTouchEnd(e) {
    if (!touchState.clone) return;
    e.preventDefault();

    const clone = touchState.clone;
    // 클론이 가리키는 중앙 위치 계산
    const dropX = parseFloat(clone.style.left) + touchState.offsetX;
    const dropY = parseFloat(clone.style.top)  + touchState.offsetY;

    // Remove clone
    clone.remove();

    // 실제 드롭이벤트 로직 호출
    const dropEl = document.elementFromPoint(dropX, dropY).closest('.dropzone.final');
    if (dropEl) {
      // 기존 drop 핸들러 로직 재활용
      const dragged = touchState.el;
      // 하난이도 받침 문제(dropzone.final) 처리
      if (dragged.dataset.char === dropEl.dataset.final) {
        dropEl.textContent = dragged.textContent;
        dropEl.classList.add('correct');
      } else {
        dropEl.style.background = '#ffcdd2';
        setTimeout(() => dropEl.style.background = '#eaeaea', 500);
      }
    }

    touchState = {};
  }

  function moveClone(touch) {
    const x = touch.clientX - touchState.offsetX;
    const y = touch.clientY - touchState.offsetY;
    touchState.clone.style.left = x + 'px';
    touchState.clone.style.top  = y + 'px';
  }

  // 이벤트 바인딩
  function enableTouchDrag() {
    const items = document.querySelectorAll('.item');
    items.forEach(item => {
      item.addEventListener('touchstart', onTouchStart, { passive: false });
      item.addEventListener('touchmove',  onTouchMove,  { passive: false });
      item.addEventListener('touchend',   onTouchEnd,   { passive: false });
    });
  }

  // 퀴즈 모달이 열릴 때마다 .item이 갱신되므로, openQuiz 안 renderBoard 이후에 호출
  const originalOpenQuiz = openQuiz;
  openQuiz = function(idx, level) {
    originalOpenQuiz(idx, level);
    // 드래그 가능한 아이템에 터치 이벤트 다시 설정
    enableTouchDrag();
  };

  // 초기 렌더 이후에도 터치 지원
  renderBoard();
  enableTouchDrag();
})();