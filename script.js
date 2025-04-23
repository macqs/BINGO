// Hangul decomposition tables
var CHOSEONG       = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
var JUNGSEONG      = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
var JONGSEONG      = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
var VERTICAL_VOWELS= ["ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ"];

// ─────────────────────────────────────────────────────────────────
// 전역 상태
var SIZE         = 5;
var boardEl      = document.getElementById('board');
var boardWrapper = document.getElementById('boardWrapper');
var keywords     = JSON.parse(localStorage.getItem('bingo_keywords')) ||
                   new Array(SIZE*SIZE).fill('');
var quizData     = JSON.parse(localStorage.getItem('bingo_quizData')) ||
                   new Array(SIZE*SIZE).fill(null).map(function(){
                     return { 
                       high:{ sentences: [], movementIndex: 0 }, 
                       mid: { words: [] }, 
                       low: { syllables: [] } 
                     };
                   });

// ─────────────────────────────────────────────────────────────────
// 보드 생성 / 초기 렌더링
function createCell(idx) {
  var cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.index = idx;
  if (idx === 12) {
    cell.classList.add('middle');
    cell.innerHTML = '<span style="font-size:24px;">남대구</span>';
  } else {
    cell.textContent = keywords[idx] || '';
    if (quizData[idx].marked) {
      cell.classList.add(quizData[idx].marked);
    }
    cell.addEventListener('click', function(e) {
      toggleCellColor(e, idx);
    });
  }
  return cell;
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (var i = 0; i < SIZE*SIZE; i++) {
    boardEl.appendChild(createCell(i));
  }
}
renderBoard();

// ─────────────────────────────────────────────────────────────────
// 셀 색상 토글
function toggleCellColor(e, idx) {
  var cell = e.currentTarget;
  if (cell.classList.contains('blue')) {
    cell.classList.remove('blue');
    quizData[idx].marked = null;
  } else {
    cell.classList.add('blue');
    quizData[idx].marked = 'blue';
  }
  saveQuizData();
  drawStrikes();
}

// ─────────────────────────────────────────────────────────────────
// 빙고 선 그리기
function drawStrikes() {
  // 기존 스트라이크 제거
  boardWrapper.querySelectorAll('.strike').forEach(function(s){ s.remove(); });

  var gridSize = boardEl.clientWidth + 6; // gap 포함
  var marks = quizData.map(q => q.marked === 'blue' ? 1 : 0);

  var lines = [];
  // 가로 검사
  for (var r = 0; r < SIZE; r++) {
    if (marks.slice(r*SIZE, r*SIZE+SIZE).every(Boolean)) {
      lines.push({ x: 0, y: r*SIZE, w: SIZE*gridSize, h: 1 });
    }
  }
  // 세로 검사
  for (var c = 0; c < SIZE; c++) {
    var col = [];
    for (var r = 0; r < SIZE; r++) col.push(marks[r*SIZE+c]);
    if (col.every(Boolean)) {
      lines.push({ x: c*gridSize, y: 0, w: 1, h: SIZE*gridSize });
    }
  }
  // 대각선 검사
  var diag1 = [], diag2 = [];
  for (var i = 0; i < SIZE; i++) {
    diag1.push(marks[i*SIZE + i]);
    diag2.push(marks[i*SIZE + (SIZE-1-i)]);
  }
  if (diag1.every(Boolean)) lines.push({ x: 0, y: 0, w: SIZE*gridSize, h: 1, rot:45 });
  if (diag2.every(Boolean)) lines.push({ x: gridSize*(SIZE-1), y: 0, w: SIZE*gridSize, h: 1, rot:-45 });

  // 스트라이크 그리기
  lines.forEach(function(line) {
    var s = document.createElement('div');
    s.className = 'strike';
    s.style.left = line.x + 'px';
    s.style.top  = line.y + 'px';
    s.style.width  = line.w + 'px';
    s.style.height = '4px';
    if (line.rot) s.style.transform = 'rotate(' + line.rot + 'deg)';
    boardWrapper.appendChild(s);
  });
}
drawStrikes();

// ─────────────────────────────────────────────────────────────────
// 로컬 저장
function saveKeywords() {
  localStorage.setItem('bingo_keywords', JSON.stringify(keywords));
}
function saveQuizData() {
  localStorage.setItem('bingo_quizData', JSON.stringify(quizData));
}

// ─────────────────────────────────────────────────────────────────
// CSV / Excel 업로드
document.getElementById('fileInput').addEventListener('change', function(e){
  var f = e.target.files[0];
  var reader = new FileReader();
  reader.onload = function(evt) {
    var data = new Uint8Array(evt.target.result);
    var wb = XLSX.read(data, {type:'array'});
    var ws = wb.Sheets[wb.SheetNames[0]];
    var arr = XLSX.utils.sheet_to_json(ws, {header:1});
    // 첫 행은 헤더로 가정: index, keyword, high_s1, high_s2, mid_words, low_syl1,2,3
    for (var i = 1; i < arr.length; i++) {
      var row = arr[i];
      if (row[1]) {
        keywords[i-1] = row[1];
        quizData[i-1].high.sentences = [row[2], row[3]];
        quizData[i-1].mid.words = String(row[4]).split(',').map(s=>s.trim());
        quizData[i-1].low.syllables = [row[5], row[6], row[7]];
      }
    }
    saveKeywords();
    saveQuizData();
    renderBoard();
  };
  reader.readAsArrayBuffer(f);
});

// ─────────────────────────────────────────────────────────────────
// 데이터 다운로드
document.getElementById('downloadData').addEventListener('click', function(){
  var csv = ['index,keyword,high_s1,high_s2,mid_words,low_s1,low_s2,low_s3'];
  for (var i = 0; i < SIZE*SIZE; i++) {
    var kd = keywords[i] || '';
    var hd = quizData[i].high.sentences;
    var md = quizData[i].mid.words.join(',');
    var ld = quizData[i].low.syllables.join(',');
    csv.push([i+1, kd, hd[0]||'', hd[1]||'', md, ld].join(','));
  }
  var blob = new Blob([csv.join('\n')], {type:'text/csv'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'bingo_data.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// ─────────────────────────────────────────────────────────────────
// 퀴즈 모달 처리
var quizModal    = document.getElementById('quizModal');
var closeQuizBtn = document.getElementById('closeQuizBtn');

function openQuiz(idx, level) {
  // 모든 섹션 숨기기
  document.querySelectorAll('.quiz-section').forEach(function(s){
    s.classList.remove('active');
  });
  // 선택 섹션 보이기
  document.getElementById(level+'-level').classList.add('active');
  // 데이터 채우기
  if (level === 'high') loadHighLevelQuiz(idx);
  if (level === 'mid')  loadMidLevelQuiz(idx);
  if (level === 'low')  loadLowLevelQuiz(idx);
  // 모달 보이기
  quizModal.classList.add('show');
}

closeQuizBtn.addEventListener('click', function(){
  quizModal.classList.remove('show');
});

// 보드 셀 클릭 → 퀴즈 열기
boardEl.addEventListener('dblclick', function(e){
  var idx = +e.target.dataset.index;
  if (!isNaN(idx)) {
    openQuiz(idx, 'mid');
  }
});

// ─────────────────────────────────────────────────────────────────
// 고난이도 퀴즈 로드
function loadHighLevelQuiz(idx) {
  var section = document.getElementById('high-level');
  var items   = section.querySelector('#high-items');
  var targets = section.querySelector('#high-target');
  items.innerHTML   = '';
  targets.innerHTML = '';
  var data = quizData[idx].high.sentences; // [s1, s2]
  // ... 고난이도 처리 생략 ...
}

// ─────────────────────────────────────────────────────────────────
// 중간난이도 퀴즈 로드
function loadMidLevelQuiz(idx) {
  var section = document.getElementById('mid-level');
  var items   = section.querySelector('#mid-items');
  var target  = section.querySelector('#mid-target');
  items.innerHTML = '';
  // mid.words 배열에서 드래그 아이템 생성
  quizData[idx].mid.words.forEach(function(word){
    var div = document.createElement('div');
    div.className = 'item';
    div.textContent = word;
    div.draggable = true;
    div.addEventListener('dragstart', onDragStart);
    items.appendChild(div);
  });
  // 슬롯 초기화
  Array.from(target.querySelectorAll('.slot')).forEach(function(slot){
    slot.innerHTML = '';
  });
}

// ─────────────────────────────────────────────────────────────────
// 하난이도 퀴즈 로드
function loadLowLevelQuiz(idx) {
  var section = document.getElementById('low-level');
  var items   = section.querySelector('#low-items');
  var target  = section.querySelector('#low-target');
  items.innerHTML = '';
  target.innerHTML = '';
  // ... 하난이도 처리 생략 ...
}

// ─────────────────────────────────────────────────────────────────
// Drag & Drop 이벤트 핸들러
var draggedItem, originParent;
function onDragStart(e) {
  draggedItem  = e.target;
  originParent = draggedItem.parentNode;
  e.dataTransfer.setData('text/plain', draggedItem.textContent);
}
function onDragOver(e) {
  e.preventDefault();
  if (e.currentTarget.classList.contains('dropzone')) {
    e.currentTarget.classList.add('over');
  }
}
function onDragLeave(e) {
  if (e.currentTarget.classList.contains('dropzone')) {
    e.currentTarget.classList.remove('over');
  }
}
function onDrop(e) {
  e.preventDefault();
  var text = e.dataTransfer.getData('text/plain');
  e.currentTarget.classList.remove('over');
  e.currentTarget.textContent = text;
  // 정답 체크 로직 추가 가능
}
function onDragEnd(e) {
  // 드래그 종료 시점 처리
}

// 슬롯들에 이벤트 연결
document.addEventListener('dragover', function(e){
  if (e.target.classList.contains('dropzone')) return onDragOver(e);
});
document.addEventListener('dragleave', function(e){
  if (e.target.classList.contains('dropzone')) return onDragLeave(e);
});
document.addEventListener('drop', function(e){
  if (e.target.classList.contains('dropzone')) return onDrop(e);
});

// ─────────────────────────────────────────────────────────────────
// 터치 지원 Drag & Drop (모바일)
(function(){
  var touchState = {};
  function onTouchStart(e) {
    var t = e.touches[0];
    draggedItem = e.currentTarget;
    originParent = draggedItem.parentNode;
    touchState.clone = draggedItem.cloneNode(true);
    touchState.offsetX = t.clientX - draggedItem.getBoundingClientRect().left;
    touchState.offsetY = t.clientY - draggedItem.getBoundingClientRect().top;
    touchState.clone.classList.add('dragging');
    document.body.appendChild(touchState.clone);
    e.preventDefault();
  }
  function onTouchMove(e) {
    var t = e.touches[0];
    touchState.clone.style.left=(t.clientX-touchState.offsetX)+'px';
    touchState.clone.style.top =(t.clientY-touchState.offsetY)+'px';
  }
  function onTouchEnd(e) {
    var drop = document.elementFromPoint(
      touchState.clone.getBoundingClientRect().left + touchState.offsetX,
      touchState.clone.getBoundingClientRect().top + touchState.offsetY
    );
    if (drop && drop.classList.contains('dropzone')) {
      drop.textContent = draggedItem.textContent;
    }
    touchState.clone.remove();
  }
  function enableTouch(){
    document.querySelectorAll('.item').forEach(function(it){
      it.addEventListener('touchstart',onTouchStart,{passive:false});
      it.addEventListener('touchmove', onTouchMove,{passive:false});
      it.addEventListener('touchend',  onTouchEnd,{passive:false});
    });
  }
  var orig = openQuiz;
  openQuiz = function(i,l){ orig(i,l); enableTouch(); };
  enableTouch();
})();
