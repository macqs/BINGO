// Hangul decomposition tables
var CHOSEONG       = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
var JUNGSEONG      = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
var JONGSEONG      = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
var VERTICAL_VOWELS= ["ㅗ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ"];

// ─────────────────────────────────────────────────────────────────
// 전역 상태
var SIZE         = 5;
var boardEl      = document.getElementById('board');
var boardWrapper = document.getElementById('boardWrapper');
var keywords     = JSON.parse(localStorage.getItem('bingo_keywords')) ||
                   new Array(SIZE*SIZE).fill('');
var quizData     = JSON.parse(localStorage.getItem('bingo_quizData')) ||
                   new Array(SIZE*SIZE).fill(null).map(function(){
                     return { high:{ sentences: [], movementIndex: 0 }, mid:{ words: [] } };
                   });
var cellStates   = JSON.parse(localStorage.getItem('bingo_colors')) ||
                   new Array(SIZE*SIZE).fill('');
var showKeywords = false;
var curIdx       = null;
var dragged      = null;

// ─────────────────────────────────────────────────────────────────
// 마이그레이션: 이전 high.q/a 구조를 sentences로 변환
quizData.forEach(function(entry){
  if(entry.high && !Array.isArray(entry.high.sentences) && entry.high.q !== undefined){
    entry.high.sentences = [ entry.high.q||'', entry.high.a||'' ];
    entry.high.movementIndex = 0;
    delete entry.high.q;
    delete entry.high.a;
  }
  if(!entry.mid || !Array.isArray(entry.mid.words)){
    entry.mid = { words: [] };
  }
});
localStorage.setItem('bingo_quizData', JSON.stringify(quizData));

// ─────────────────────────────────────────────────────────────────
// 한글 분해 헬퍼
function decomposeHangul(s){
  var code = s.charCodeAt(0) - 0xAC00;
  var i0   = Math.floor(code / (21*28));
  var i1   = Math.floor((code % (21*28)) / 28);
  var i2   = code % 28;
  return {
    initial:    CHOSEONG[i0],
    medial:     JUNGSEONG[i1],
    final:      JONGSEONG[i2],
    medialChar: JUNGSEONG[i1],
    finalIndex: i2
  };
}

// ─────────────────────────────────────────────────────────────────
// 보드 셀 생성 & 렌더
function createCell(idx){
  var cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.index = idx;
  if(idx===12){
    cell.classList.add('middle');
    cell.innerHTML = '<span style="font-size:30px;">다모여</span>';
  } else {
    cell.textContent = showKeywords ? keywords[idx] : '';
    if(cellStates[idx]) cell.classList.add(cellStates[idx]);
    cell.addEventListener('click', function(e){ onCellClick(e, idx); });
  }
  return cell;
}
function renderBoard(){
  boardEl.innerHTML = '';
  for(var i=0;i<SIZE*SIZE;i++){
    boardEl.appendChild(createCell(i));
  }
  updateStrikes();
}

// ─────────────────────────────────────────────────────────────────
// 셀 클릭 핸들러 (Shift+클릭 포함)
function onCellClick(e, idx){
  var r = e.currentTarget.getBoundingClientRect();
  var x = e.clientX - r.left, y = e.clientY - r.top;
  var row = y < r.height/3 ? 0 : y < 2*r.height/3 ? 1 : 2;
  var col = x < r.width/2     ? 0 : 1;
  var zone = row===0 ? (col===0?1:2)
           : row===1 ? (col===0?5:6)
                    : (col===0?3:4);

  // Shift+클릭으로 고난이도 편집
  if(e.shiftKey && zone===1){
    var s1 = prompt('문장 가 입력', quizData[idx].high.sentences[0]||'');
    if(s1===null) return;
    var s2 = prompt('문장 나 입력', quizData[idx].high.sentences[1]||'');
    if(s2===null) return;
    var mv = prompt('"어찌하다"에 해당하는 문장은 가(1) 또는 나(2)?','1');
    quizData[idx].high = {
      sentences: [s1.trim(), s2.trim()],
      movementIndex: (mv==='2')?1:0
    };
    localStorage.setItem('bingo_quizData', JSON.stringify(quizData));
    alert('고난이도 문장 저장 완료');
    return;
  }
  // Shift+클릭으로 중난이도 단어 편집
  if(e.shiftKey && zone===2){
    var list = prompt('중난이도 단어 쉼표 구분 입력', quizData[idx].mid.words.join(',')||'');
    if(list===null) return;
    quizData[idx].mid.words = list.split(/\s*,\s*/).filter(Boolean);
    localStorage.setItem('bingo_quizData', JSON.stringify(quizData));
    alert('중난이도 단어 저장 완료');
    return;
  }

  // 일반 클릭: 퀴즈 열기 or 색상 토글
  if     (zone===1) openQuiz(idx,'high');
  else if(zone===2) openQuiz(idx,'mid');
  else if(zone===5||zone===6) openQuiz(idx,'low');
  else if(zone===3) toggleColor(idx,'blue');
  else if(zone===4) toggleColor(idx,'red');
}

// ─────────────────────────────────────────────────────────────────
// 색상 토글
function toggleColor(idx, color){
  cellStates[idx] = (cellStates[idx]===color)?'':color;
  localStorage.setItem('bingo_colors', JSON.stringify(cellStates));
  renderBoard();
}

// ─────────────────────────────────────────────────────────────────
// 빙고선(스트라이크) 계산 & 그리기
function updateStrikes(){
  document.querySelectorAll('.strike').forEach(el=>el.remove());
  var lines = [];
  for(var i=0;i<5;i++){
    var row=[], col=[];
    for(var j=0;j<5;j++){
      row.push(i*5+j);
      col.push(j*5+i);
    }
    lines.push(row,col);
  }
  lines.push([0,6,12,18,24],[4,8,12,16,20]);
  lines.forEach(arr=>{
    var cells = arr.map(i=>boardEl.children[i]);
    var diag = arr.includes(12), need = diag?4:5;
    var bc = cells.filter((c,i)=>!(diag&&i===2)&&c.classList.contains('blue')).length;
    var rc = cells.filter((c,i)=>!(diag&&i===2)&&c.classList.contains('red')).length;
    if(bc===need||rc===need) drawStrike(arr);
  });
}
function drawStrike(arr){
  var f  = boardEl.children[arr[0]].getBoundingClientRect();
  var l  = boardEl.children[arr[arr.length-1]].getBoundingClientRect();
  var wr = boardWrapper.getBoundingClientRect();
  var x1 = f.left+f.width/2 - wr.left, y1 = f.top+f.height/2 - wr.top;
  var x2 = l.left+l.width/2 - wr.left, y2 = l.top+l.height/2 - wr.top;
  var dx = x2-x1, dy = y2-y1, len=Math.hypot(dx,dy);
  var ang = Math.atan2(dy,dx)*180/Math.PI;
  var line = document.createElement('div');
  line.className='strike';
  Object.assign(line.style,{
    width:len+'px', left:x1+'px', top:y1+'px',
    transform:'rotate('+ang+'deg)'
  });
  boardWrapper.appendChild(line);
}

// ─────────────────────────────────────────────────────────────────
// 퀴즈 모달 열기
var quizModal = document.getElementById('quizModal');
var sections = {
  high: document.getElementById('high-level'),
  mid:  document.getElementById('mid-level'),
  low:  document.getElementById('low-level')
};

function openQuiz(idx, level){
  curIdx = idx;
  if(level==='high'){
    var itemsEl  = document.getElementById('high-items');
    var targetEl = document.getElementById('high-target');
    itemsEl.innerHTML=''; targetEl.innerHTML='';
    var h = quizData[idx].high;
    var labels = { movement:'어찌하다', state:'어떠하다' };
    h.sentences.forEach((txt,i)=>{
      var cat = (i===h.movementIndex)?'movement':'state';
      var d = document.createElement('div');
      d.className='item'; d.draggable=true;
      d.dataset.cat=cat; d.textContent=txt;
      itemsEl.appendChild(d);
    });
    ['movement','state'].sort(()=>Math.random()-0.5).forEach(cat=>{
      var dz=document.createElement('div');
      dz.className='dropzone final'; dz.dataset.cat=cat;
      dz.textContent=labels[cat];
      targetEl.appendChild(dz);
    });
  }
  else if(level==='mid'){
    var itemsEl  = document.getElementById('mid-items');
    var targetEl = document.getElementById('mid-target');
    itemsEl.innerHTML=''; targetEl.innerHTML='';
    quizData[idx].mid.words.forEach(w=>{
      var d=document.createElement('div');
      d.className='item'; d.draggable=true;
      d.dataset.word=w; d.textContent=w;
      itemsEl.appendChild(d);
    });
    quizData[idx].mid.words.forEach((_,i)=>{
      var s=document.createElement('div');
      s.className='dropzone slot'; s.dataset.slot=i;
      targetEl.appendChild(s);
    });
  }
  else {
    var itemsEl   = document.getElementById('low-items');
    var lowTarget = document.getElementById('low-target');
    itemsEl.innerHTML=''; lowTarget.innerHTML='';
    var syll = keywords[idx]||'가', jamo = decomposeHangul(syll);
    var isV = VERTICAL_VOWELS.includes(jamo.medialChar);
    var di = (jamo.finalIndex < JONGSEONG.length-1)? jamo.finalIndex+1 : jamo.finalIndex-1;
    var distractor = JONGSEONG[di];
    [jamo.final, distractor].sort(()=>Math.random()-0.5).forEach(ch=>{
      var d=document.createElement('div');
      d.className='item'; d.draggable=true;
      d.dataset.char=ch; d.textContent=ch;
      itemsEl.appendChild(d);
    });
    var sylDiv=document.createElement('div');
    sylDiv.className='low-syllable '+(isV?'vertical':'horizontal');
    sylDiv.innerHTML =
      '<div class="initial">'+jamo.initial+'</div>' +
      '<div class="medial">'+jamo.medialChar+'</div>' +
      '<div class="dropzone final" data-final="'+jamo.final+'"></div>';
    lowTarget.appendChild(sylDiv);
  }
  Object.values(sections).forEach(s=>s.classList.remove('active'));
  sections[level].classList.add('active');
  quizModal.classList.add('show');
}
document.getElementById('closeQuizBtn').onclick = function(){
  quizModal.classList.remove('show');
};

// ─────────────────────────────────────────────────────────────────
// HTML5 Drag&Drop 이벤트
document.addEventListener('dragstart',function(e){
  if(e.target.classList.contains('item')){
    dragged = e.target;
    setTimeout(()=>e.target.style.visibility='hidden',0);
  }
});
document.addEventListener('dragend',function(e){
  if(e.target.classList.contains('item')){
    e.target.style.visibility='visible';
  }
});
document.addEventListener('dragover',function(e){
  var z = e.target.closest('.dropzone.final, .dropzone.slot');
  if(z){ e.preventDefault(); z.classList.add('over'); }
});
document.addEventListener('dragleave',function(e){
  var z = e.target.closest('.dropzone.final, .dropzone.slot');
  if(z) z.classList.remove('over');
});
document.addEventListener('drop',function(e){
  e.preventDefault();
  if(!dragged) return;
  var z = e.target.closest('.dropzone.final, .dropzone.slot');
  if(z){
    // 고난이도
    if(z.dataset.cat){
      if(dragged.dataset.cat===z.dataset.cat){
        z.textContent='O'; z.classList.add('correct'); dragged.remove();
      } else {
        z.style.background='#ffcdd2';
        setTimeout(()=>z.style.background='#eaeaea',500);
      }
    }
    // 중난이도
    else if(z.classList.contains('slot')&&dragged.dataset.word){
      z.textContent=dragged.textContent;
    }
    // 하난이도
    else if(z.dataset.final&&dragged.dataset.char){
      if(dragged.dataset.char===z.dataset.final){
        z.textContent=dragged.textContent; z.classList.add('correct');
      } else {
        z.style.background='#ffcdd2';
        setTimeout(()=>z.style.background='#eaeaea',500);
      }
    }
    z.classList.remove('over');
  }
  dragged = null;
});

// ─────────────────────────────────────────────────────────────────
// 버튼: 키워드/토글/리셋/다운로드
document.getElementById('setKeywords').onclick = function(){
  var inp = prompt('키워드 25개 쉼표/공백 구분', keywords.join(','));
  if(!inp) return;
  keywords = inp.split(/[\s,]+/).filter(Boolean).slice(0,25).map(k=>k.charAt(0));
  localStorage.setItem('bingo_keywords', JSON.stringify(keywords));
  renderBoard();
};
document.getElementById('toggleKeywords').onclick = function(){
  showKeywords = !showKeywords;
  renderBoard();
};
document.getElementById('resetColors').onclick = function(){
  if(!confirm('초기화할까요?')) return;
  cellStates = new Array(SIZE*SIZE).fill('');
  localStorage.setItem('bingo_colors', JSON.stringify(cellStates));
  renderBoard();
};
document.getElementById('downloadData').onclick = downloadCSV;

// ─────────────────────────────────────────────────────────────────
// 파일 업로드 (CSV, XLSX)
document.getElementById('fileInput').addEventListener('change', handleFile, false);
function handleFile(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader(), name=file.name.toLowerCase();
  reader.onload = function(evt){
    var rows;
    if(name.endsWith('.csv')){
      rows = parseCSV(evt.target.result);
    } else if(name.endsWith('.xlsx')){
      var bin = new Uint8Array(evt.target.result);
      var wb  = XLSX.read(bin,{type:'array'});
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    } else {
      return alert('CSV 또는 XLSX 파일만 지원합니다.');
    }
    applyData(rows);
  };
  if(name.endsWith('.csv')) reader.readAsText(file,'UTF-8');
  else reader.readAsArrayBuffer(file);
}
// ─── CSV 한 줄(line)→배열(cols) 변환 (큰따옴표+이중 큰따옴표 지원) ───
function parseCSVLine(line) {
  var cols = [];
  var cur  = '';
  var inQ  = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

// ─── 전체 텍스트→[{…},…] 변환 ───
function parseCSV(text) {
  var lines   = text.trim().split(/\r?\n/);
  var headers = parseCSVLine(lines.shift());
  return lines.map(function(line) {
    var vals = parseCSVLine(line);
    var obj  = {};
    headers.forEach(function(h, i) {
      obj[h.trim()] = vals[i] !== undefined ? vals[i] : '';
    });
    return obj;
  });
}

function applyData(rows){
  rows.forEach(function(r){
    var raw = parseInt(r.index,10);
    var idx = isNaN(raw)?-1
            : (raw>=1&&raw<=SIZE*SIZE?raw-1:raw);
    if(idx<0||idx>=SIZE*SIZE) return;
    if(r.keyword) keywords[idx]=r.keyword.charAt(0);
    quizData[idx].high = {
      sentences: [(r.high_s1||'').trim(), (r.high_s2||'').trim()],
      movementIndex: parseInt(r.high_mv,10)===2?1:0
    };
    quizData[idx].mid.words = (r.mid_words||'').split(/\s*,\s*/).filter(Boolean);
  });
  localStorage.setItem('bingo_keywords', JSON.stringify(keywords));
  localStorage.setItem('bingo_quizData', JSON.stringify(quizData));
  renderBoard();
  alert('데이터 업로드 완료!');
}

// ─────────────────────────────────────────────────────────────────
// 데이터 다운로드 (CSV, data URI 방식)
function downloadCSV(){
  var header = ['index','keyword','high_s1','high_s2','high_mv','mid_words'];
  var lines = [header.join(',')];
  for(var i=0;i<SIZE*SIZE;i++){
    var outIdx = i+1;
    var kw     = keywords[i]||'';
    var h      = quizData[i].high||{};
    var sArr   = Array.isArray(h.sentences)?h.sentences:[h.q||'',h.a||''];
    var s1     = (sArr[0]||'').replace(/"/g,'""');
    var s2     = (sArr[1]||'').replace(/"/g,'""');
    var mv     = (h.movementIndex===1?2:1);
    var mw     = ((quizData[i].mid.words||[]).join(',')).replace(/"/g,'""');
    lines.push([outIdx, `"${kw}"`, `"${s1}"`, `"${s2}"`, mv, `"${mw}"`].join(','));
  }
  var csv = lines.join('\n');
  var uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  var a   = document.createElement('a');
  a.href      = uri;
  a.download  = 'bingo_data.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─────────────────────────────────────────────────────────────────
// 초기 렌더
renderBoard();

// ─────────────────────────────────────────────────────────────────
// 터치 기반 Drag&Drop (아이패드 지원)
(function(){
  var touchState={};
  function onTouchStart(e){
    var el=e.currentTarget; e.preventDefault();
    var t=e.touches[0], r=el.getBoundingClientRect();
    touchState.el=el;
    touchState.offsetX=t.clientX-r.left;
    touchState.offsetY=t.clientY-r.top;
    var clone=el.cloneNode(true);
    clone.classList.add('dragging');
    clone.style.width = r.width+'px';
    clone.style.height= r.height+'px';
    document.body.appendChild(clone);
    touchState.clone=clone; moveClone(t);
  }
  function onTouchMove(e){
    if(!touchState.clone) return;
    e.preventDefault(); moveClone(e.touches[0]);
  }
  function onTouchEnd(e){
    if(!touchState.clone) return;
    e.preventDefault();
    var c=touchState.clone;
    var dropX=parseFloat(c.style.left)+touchState.offsetX;
    var dropY=parseFloat(c.style.top)+touchState.offsetY;
    c.remove();
    var z=document.elementFromPoint(dropX,dropY).closest('.dropzone.final, .dropzone.slot');
    if(z){
      var dr=touchState.el;
      if(z.dataset.cat){
        if(dr.dataset.cat===z.dataset.cat){
          z.textContent='O'; z.classList.add('correct');
        } else {
          z.style.background='#ffcdd2';
          setTimeout(()=>z.style.background='#eaeaea',500);
        }
      } else if(z.classList.contains('slot')&&dr.dataset.word){
        z.textContent=dr.textContent;
      } else if(z.dataset.final&&dr.dataset.char){
        if(dr.dataset.char===z.dataset.final){
          z.textContent=dr.textContent; z.classList.add('correct');
        } else {
          z.style.background='#ffcdd2';
          setTimeout(()=>z.style.background='#eaeaea',500);
        }
      }
      z.classList.remove('over');
    }
    touchState={};
  }
  function moveClone(t){
    touchState.clone.style.left=(t.clientX-touchState.offsetX)+'px';
    touchState.clone.style.top =(t.clientY-touchState.offsetY)+'px';
  }
  function enableTouch(){
    document.querySelectorAll('.item').forEach(function(it){
      it.addEventListener('touchstart',onTouchStart,{passive:false});
      it.addEventListener('touchmove', onTouchMove,{passive:false});
      it.addEventListener('touchend',  onTouchEnd,{passive:false});
    });
  }
  var orig=openQuiz;
  openQuiz=function(i,l){ orig(i,l); enableTouch(); };
  enableTouch();
})();
