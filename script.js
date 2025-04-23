// Hangul decomposition tables
var CHOSEONG = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
var JUNGSEONG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
var JONGSEONG  = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
var VERTICAL_VOWELS = ["ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ"];

function decomposeHangul(s) {
  var code         = s.charCodeAt(0) - 0xAC00;
  var initialIndex = Math.floor(code / (21 * 28));
  var medialIndex  = Math.floor((code % (21 * 28)) / 28);
  var finalIndex   = code % 28;
  return {
    initial:    CHOSEONG[initialIndex],
    medial:     JUNGSEONG[medialIndex],
    final:      JONGSEONG[finalIndex],
    medialChar: JUNGSEONG[medialIndex],
    finalIndex: finalIndex
  };
}

var SIZE         = 5;
var boardEl      = document.getElementById('board');
var boardWrapper = document.getElementById('boardWrapper');
var keywords     = JSON.parse(localStorage.getItem('bingo_keywords')) || new Array(SIZE*SIZE).fill('');
var quizData     = JSON.parse(localStorage.getItem('bingo_quizData')) || new Array(SIZE*SIZE).fill(null).map(function(){ return { high:{}, mid:{ words: [] } }; });
var cellStates   = JSON.parse(localStorage.getItem('bingo_colors'))   || new Array(SIZE*SIZE).fill('');
var showKeywords = false;
var curIdx       = null;

// 헬퍼: 셀 생성
function createCell(idx) {
  var cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.index = idx;
  if (idx === 12) {
    cell.className += ' middle';
    cell.textContent = '✳';
  } else {
    cell.textContent = showKeywords ? keywords[idx] : '';
    if (cellStates[idx]) {
      cell.classList.add(cellStates[idx]);
    }
    cell.addEventListener('click', function(e){ onCellClick(e, idx); });
  }
  return cell;
}

// 보드 렌더링
function renderBoard() {
  boardEl.innerHTML = '';
  for (var i = 0; i < SIZE*SIZE; i++) {
    boardEl.appendChild(createCell(i));
  }
  updateStrikes();
}

// 클릭 핸들러
function onCellClick(e, idx) {
  var rect = e.currentTarget.getBoundingClientRect();
  var x = e.clientX - rect.left, y = e.clientY - rect.top;
  var row = (y < rect.height/3) ? 0 : (y < 2*rect.height/3 ? 1 : 2);
  var col = (x < rect.width/2) ? 0 : 1;
  var zone = row===0 ? (col===0?1:2) : row===1 ? (col===0?5:6) : (col===0?3:4);

  // Shift+클릭으로 문제/정답 편집
  if (e.shiftKey) {
    if (zone === 1) {
      var q = prompt('고난이도 문제 입력', quizData[idx].high.q || '');
      if (q === null) return;
      var a = prompt('고난이도 정답 입력', quizData[idx].high.a || '');
      if (a === null) return;
      quizData[idx].high = { q: q, a: a };
    }
    else if (zone === 2) {
      var list = prompt('중난이도 단어 쉼표 구분', quizData[idx].mid.words.join(',') || '');
      if (list === null) return;
      quizData[idx].mid.words = list.split(/\s*,\s*/).filter(Boolean);
    }
    else {
      return;
    }
    localStorage.setItem('bingo_quizData', JSON.stringify(quizData));
    alert('저장 완료');
    return;
  }

  // 일반 클릭 동작
  if      (zone === 1) openQuiz(idx, 'high');
  else if (zone === 2) openQuiz(idx, 'mid');
  else if (zone === 5 || zone === 6) openQuiz(idx, 'low');
  else if (zone === 3) toggleColor(idx, 'blue');
  else if (zone === 4) toggleColor(idx, 'red');
}

// 색상 토글
function toggleColor(idx, color) {
  cellStates[idx] = (cellStates[idx] === color) ? '' : color;
  localStorage.setItem('bingo_colors', JSON.stringify(cellStates));
  renderBoard();
}

// 빙고 선 그리기
function updateStrikes() {
  document.querySelectorAll('.strike').forEach(function(el){ el.remove(); });
  var lines = [];

  // 가로, 세로 줄 생성 (이중 함수 없이 for-loop 사용)
  for (var i = 0; i < 5; i++) {
    var rowArr = [], colArr = [];
    for (var j = 0; j < 5; j++) {
      rowArr.push(i * 5 + j);
      colArr.push(j * 5 + i);
    }
    lines.push(rowArr);
    lines.push(colArr);
  }

  // 대각선
  lines.push([0,6,12,18,24], [4,8,12,16,20]);

  // 스트라이크 그리기
  lines.forEach(function(arr) {
    var cells = arr.map(function(i){ return boardEl.children[i]; });
    var diag  = (arr.indexOf(12) !== -1);
    var need  = diag ? 4 : 5;
    var bc = cells.filter(function(c,i){ return !(diag && i===2) && c.classList.contains('blue'); }).length;
    var rc = cells.filter(function(c,i){ return !(diag && i===2) && c.classList.contains('red'); }).length;
    if (bc === need || rc === need) drawStrike(arr);
  });
}

function drawStrike(arr) {
  var f  = boardEl.children[arr[0]].getBoundingClientRect();
  var l  = boardEl.children[arr[arr.length-1]].getBoundingClientRect();
  var wr = boardWrapper.getBoundingClientRect();
  var x1 = f.left + f.width/2 - wr.left;
  var y1 = f.top  + f.height/2 - wr.top;
  var x2 = l.left + l.width/2 - wr.left;
  var y2 = l.top  + l.height/2 - wr.top;
  var dx  = x2 - x1, dy = y2 - y1;
  var len = Math.hypot(dx, dy);
  var ang = Math.atan2(dy, dx) * 180 / Math.PI;
  var line = document.createElement('div');
  line.className = 'strike';
  Object.assign(line.style, {
    width:     len + 'px',
    left:      x1 + 'px',
    top:       y1 + 'px',
    transform: 'rotate(' + ang + 'deg)'
  });
  boardWrapper.appendChild(line);
}

// 퀴즈 모달
var quizModal = document.getElementById('quizModal');
var sections  = {
  high: document.getElementById('high-level'),
  mid:  document.getElementById('mid-level'),
  low:  document.getElementById('low-level')
};

function openQuiz(idx, level) {
  curIdx = idx;
  var itemsEl = document.getElementById(
    level==='high' ? 'high-items' :
    level==='mid'  ? 'mid-items'  :
                     'low-items'
  );
  itemsEl.innerHTML = '';

  if (level === 'high') {
    ['o','x'].forEach(function(m){
      var txt = quizData[idx].high.q || (m==='o' ? '정답 문장' : '오답 문장');
      var div = document.createElement('div');
      div.className     = 'item';
      div.draggable     = true;
      div.dataset.match = m;
      div.textContent   = txt;
      itemsEl.appendChild(div);
    });
  }
  else if (level === 'mid') {
    quizData[idx].mid.words.forEach(function(w){
      var div = document.createElement('div');
      div.className      = 'item';
      div.draggable      = true;
      div.dataset.word   = w;
      div.textContent    = w;
      itemsEl.appendChild(div);
    });
  }
  else {
    var syll   = keywords[idx] || '가';
    var jamo   = decomposeHangul(syll);
    var isVert = VERTICAL_VOWELS.indexOf(jamo.medialChar) !== -1;
    var di     = (jamo.finalIndex < JONGSEONG.length-1) ? jamo.finalIndex+1 : jamo.finalIndex-1;
    var distractor = JONGSEONG[di];
    var options    = [jamo.final, distractor].sort(function(){ return Math.random() - 0.5; });

    var lowTarget = document.getElementById('low-target');
    lowTarget.innerHTML = '';

    var sylDiv = document.createElement('div');
    sylDiv.className = 'low-syllable ' + (isVert ? 'vertical' : 'horizontal');
    sylDiv.innerHTML =
      '<div class="initial">' + jamo.initial    + '</div>' +
      '<div class="medial">'  + jamo.medialChar + '</div>' +
      '<div class="dropzone final" data-final="' + jamo.final + '"></div>';
    lowTarget.appendChild(sylDiv);

    options.forEach(function(ch){
      var div = document.createElement('div');
      div.className    = 'item';
      div.draggable    = true;
      div.dataset.char = ch;
      div.textContent  = ch;
      itemsEl.appendChild(div);
    });
  }

  Object.keys(sections).forEach(function(key){
    sections[key].classList.remove('active');
  });
  sections[level].classList.add('active');
  quizModal.classList.add('show');
}

document.getElementById('closeQuizBtn').onclick = function(){
  quizModal.classList.remove('show');
  Object.keys(sections).forEach(function(key){
    sections[key].classList.remove('active');
  });
};

// 드래그 앤 드롭 핸들러
var dragged = null;
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
  var zone = e.target.closest('.dropzone.final');
  if (zone) {
    e.preventDefault();
    zone.classList.add('over');
  }
});
document.addEventListener('dragleave', function(e){
  var zone = e.target.closest('.dropzone.final');
  if (zone) {
    zone.classList.remove('over');
  }
});
document.addEventListener('drop', function(e){
  e.preventDefault();
  if (!dragged) return;
  var zone = e.target.closest('.dropzone.final');
  if (zone) {
    if (dragged.dataset.char === zone.dataset.final) {
      zone.textContent = dragged.textContent;
      zone.classList.add('correct');
    } else {
      zone.style.background = '#ffcdd2';
      setTimeout(function(){ zone.style.background = '#eaeaea'; }, 500);
    }
  }
  dragged = null;
});

// 키워드/토글/리셋
document.getElementById('setKeywords').onclick = function(){
  var inp = prompt('키워드 25개 쉼표/공백 구분', keywords.join(','));
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

// 초기 렌더
renderBoard();
