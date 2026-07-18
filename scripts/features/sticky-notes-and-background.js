  // ---------------- display settings: desktop background ----------------
  // ---------------- custom fonts (uploaded by the user) ----------------
  function registerCustomFont(fontEntry){
    try{
      var face = new FontFace(fontEntry.name, 'url(' + fontEntry.dataUrl + ')');
      return face.load().then(function(loaded){
        document.fonts.add(loaded);
      }).catch(function(){});
    } catch(e){ return Promise.resolve(); }
  }

  // ---------------- sticky notes ----------------
  var STICKY_COLORS = ['#fff9a3','#ffd6a5','#b5ead7','#c9b1ff','#ffc8dd','#bde0fe'];

  function saveStickyNotes(){ saveState(); }

  function renderAllStickyNotes(){
    var layer = document.getElementById('sticky-layer');
    if(!layer) return;
    layer.innerHTML = '';
    (state.stickyNotes || []).forEach(function(note){ mountStickyNote(note); });
  }

  function mountStickyNote(note){
    var layer = document.getElementById('sticky-layer');
    if(!layer) return;
    var el = document.createElement('div');
    el.className = 'sticky';
    el.style.left = (note.x || 40) + 'px';
    el.style.top = (note.y || 60) + 'px';
    el.style.width = (note.w || 180) + 'px';
    el.style.height = (note.h || 160) + 'px';
    el.style.background = note.color || '#fff9a3';
    el.style.zIndex = (zCounter += 10); // always spawn above windows
    el.setAttribute('data-sid', note.id);

    var bar = document.createElement('div');
    bar.className = 'sticky-bar';
    bar.style.background = shadeColor(note.color || '#fff9a3', -18);

    var titleSpacer = document.createElement('span');
    titleSpacer.className = 'sticky-bar-title';

    var colorBtn = document.createElement('button');
    colorBtn.className = 'sticky-color-btn';
    colorBtn.style.background = note.color || '#fff9a3';
    colorBtn.title = 'Change color';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'sticky-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Delete note';

    bar.appendChild(titleSpacer);
    bar.appendChild(colorBtn);
    bar.appendChild(closeBtn);

    var body = document.createElement('textarea');
    body.className = 'sticky-body';
    body.value = note.text || '';
    body.placeholder = 'Type a note\u2026';

    var resizeHandle = document.createElement('div');
    resizeHandle.className = 'sticky-resize-handle';

    el.appendChild(bar);
    el.appendChild(body);
    el.appendChild(resizeHandle);
    layer.appendChild(el);

    // touch resize via handle
    resizeHandle.addEventListener('touchstart', function(e){
      e.stopPropagation();
      var t = e.touches[0];
      var startX = t.clientX, startY = t.clientY;
      var startW = el.offsetWidth, startH = el.offsetHeight;
      function onMove(ev){
        var tt = ev.touches[0];
        var newW = Math.max(140, startW + (tt.clientX - startX));
        var newH = Math.max(100, startH + (tt.clientY - startY));
        el.style.width = newW + 'px';
        el.style.height = newH + 'px';
      }
      function onEnd(){
        note.w = el.offsetWidth; note.h = el.offsetHeight;
        saveStickyNotes();
        resizeHandle.removeEventListener('touchmove', onMove);
        resizeHandle.removeEventListener('touchend', onEnd);
      }
      resizeHandle.addEventListener('touchmove', onMove, { passive:false });
      resizeHandle.addEventListener('touchend', onEnd);
    }, { passive:true });

    // bring to front on any interaction
    el.addEventListener('mousedown', function(){ el.style.zIndex = ++zCounter; });
    el.addEventListener('touchstart', function(){ el.style.zIndex = ++zCounter; }, { passive:true });

    // drag via title bar
    makeStickyDraggable(el, bar, note);

    // resize observer to save dimensions
    var resizeTimer;
    var ro = new ResizeObserver(function(){
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function(){
        note.w = el.offsetWidth; note.h = el.offsetHeight;
        saveStickyNotes();
      }, 400);
    });
    ro.observe(el);

    // text changes
    var textTimer;
    body.addEventListener('input', function(){
      clearTimeout(textTimer);
      textTimer = setTimeout(function(){
        note.text = body.value;
        saveStickyNotes();
      }, 600);
    });

    // color picker
    colorBtn.addEventListener('click', function(e){
      e.stopPropagation();
      showStickyColorPicker(el, note, colorBtn, bar);
    });

    // delete
    closeBtn.addEventListener('click', function(){
      ro.disconnect();
      el.remove();
      var noteLabel=(note.text||'').trim().split(/\n/)[0].slice(0,48)||'Sticky Note';
      moveToTrash('sticky',noteLabel,note,{});
      state.stickyNotes = state.stickyNotes.filter(function(n){ return n.id !== note.id; });
      saveStickyNotes();
    });
  }

  function shadeColor(hex, pct){
    // lighten/darken a hex color by pct (-100..100)
    var n = parseInt(hex.replace('#',''), 16);
    var r = Math.min(255, Math.max(0, (n>>16) + pct));
    var g = Math.min(255, Math.max(0, ((n>>8)&0xff) + pct));
    var b = Math.min(255, Math.max(0, (n&0xff) + pct));
    return '#' + [r,g,b].map(function(x){ return ('0'+x.toString(16)).slice(-2); }).join('');
  }

  function makeStickyDraggable(el, handle, note){
    var startX, startY, startL, startT, dragging = false;
    function onStart(cx, cy){
      dragging = true;
      startX = cx; startY = cy;
      startL = el.offsetLeft; startT = el.offsetTop;
      el.style.zIndex = ++zCounter;
    }
    function onMove(cx, cy){
      if(!dragging) return;
      var nx = startL + (cx - startX);
      var ny = startT + (cy - startY);
      var maxX = window.innerWidth - el.offsetWidth;
      var maxY = window.innerHeight - TASKBAR_H - el.offsetHeight;
      nx = Math.max(0, Math.min(nx, maxX));
      ny = Math.max(0, Math.min(ny, maxY));
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
    }
    function onEnd(){
      if(!dragging) return;
      dragging = false;
      note.x = el.offsetLeft; note.y = el.offsetTop;
      saveStickyNotes();
    }
    handle.addEventListener('mousedown', function(e){
      if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      e.preventDefault(); onStart(e.clientX, e.clientY);
      document.addEventListener('mousemove', onMouse);
      document.addEventListener('mouseup', onMouseUp);
    });
    function onMouse(e){ onMove(e.clientX, e.clientY); }
    function onMouseUp(){ onEnd(); document.removeEventListener('mousemove', onMouse); document.removeEventListener('mouseup', onMouseUp); }
    handle.addEventListener('touchstart', function(e){
      if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      var t = e.touches[0]; onStart(t.clientX, t.clientY);
    }, { passive:true });
    handle.addEventListener('touchmove', function(e){
      var t = e.touches[0]; onMove(t.clientX, t.clientY); e.preventDefault();
    }, { passive:false });
    handle.addEventListener('touchend', onEnd);
  }

  var activeStickyPicker = null;
  function showStickyColorPicker(el, note, colorBtn, bar){
    if(activeStickyPicker){ activeStickyPicker.remove(); activeStickyPicker = null; }
    var picker = document.createElement('div');
    picker.style.cssText = 'position:fixed;z-index:999999;display:flex;gap:6px;background:#fff;border:1px solid #aaa;border-radius:8px;padding:7px;box-shadow:0 2px 10px rgba(0,0,0,.3);';
    STICKY_COLORS.forEach(function(c){
      var swatch = document.createElement('div');
      swatch.style.cssText = 'width:22px;height:22px;border-radius:50%;background:'+c+';border:2px solid rgba(0,0,0,'+(note.color===c?'.6':'.18')+';cursor:pointer;';
      swatch.addEventListener('click', function(){
        note.color = c;
        el.style.background = c;
        bar.style.background = shadeColor(c, -18);
        colorBtn.style.background = c;
        saveStickyNotes();
        picker.remove(); activeStickyPicker = null;
      });
      picker.appendChild(swatch);
    });
    var rect = colorBtn.getBoundingClientRect();
    picker.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    picker.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(picker);
    activeStickyPicker = picker;
    setTimeout(function(){
      document.addEventListener('click', function dismiss(e){
        if(!picker.contains(e.target)){ picker.remove(); activeStickyPicker = null; document.removeEventListener('click', dismiss); }
      });
    }, 0);
  }

  var stickySpawnCounter = 0;
  function nextStickySpawnPos(w, h){
    // cascade each new note diagonally so they don't stack on top of each other;
    // wrap back to the start once the cascade would run off-screen
    var step = 28;
    var baseX = 50, baseY = 50;
    var maxSteps = Math.max(1, Math.floor((Math.max(window.innerWidth - baseX - w, 0)) / step));
    var idx = stickySpawnCounter % (maxSteps || 1);
    stickySpawnCounter++;
    var rawX = baseX + idx * step;
    var rawY = baseY + idx * step;
    // clampToViewport keeps the note fully on-screen and above the taskbar
    return clampToViewport(rawX, rawY, w, h);
  }

  function createStickyNote(){
    var w = 180, h = 160;
    var pos = nextStickySpawnPos(w, h);
    var note = {
      id: uid(),
      title: '',
      text: '',
      color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
      x: pos.x,
      y: pos.y,
      w: w, h: h
    };
    state.stickyNotes = state.stickyNotes || [];
    state.stickyNotes.push(note);
    saveStickyNotes();
    mountStickyNote(note);
    trackDtdUsage('sticky_note_created');
  }

  function applyBackground(){
    var desktop = document.getElementById('desktop');
    if(state.background && state.background.image){
      desktop.style.background = 'center / cover no-repeat url("' + state.background.image + '")';
    } else if(state.background && state.background.gradient){
      desktop.style.background = state.background.gradient;
    } else if(state.background && state.background.color){
      desktop.style.background = state.background.color;
    } else {
      desktop.style.background = 'center / cover no-repeat url("' + DEFAULT_BG_B64 + '")';
    }
  }

