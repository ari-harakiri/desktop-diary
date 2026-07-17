  // ================= GENERIC WINDOW SYSTEM =================
  var TASKBAR_H = 34;

  function clampToViewport(x, y, w, h){
    var maxX = Math.max(0, window.innerWidth - w);
    var maxY = Math.max(0, window.innerHeight - TASKBAR_H - h);
    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
  }

  function constructionBar(label){
    return '<div class="dtd-construction"><span>'+escapeHtml(label||'UNDER CONSTRUCTION')+'</span></div>';
  }

  function createWindow(opts){
    // opts: title, bodyHtml, onMount(el), onClose(), extraClass, type, buddyId,
    //       initialLeft/initialTop (optional desktop opening position)
    var id = uid();
    var el = document.createElement('div');
    el.className = 'win ' + (opts.extraClass || '');
    el.style.visibility = 'hidden';
    el.style.zIndex = ++zCounter;

    var bodyHtml=opts.bodyHtml||'',hasOwnConstruction=/dtd-construction/.test(bodyHtml),constructionHtml=(opts.constructionBar===false||hasOwnConstruction)?'':constructionBar();
    el.innerHTML =
      '<div class="titlebar">' +
        '<span class="t-title">' + mascotSVG(15) + '<span>' + escapeHtml(opts.title) + '</span></span>' +
        '<span class="t-btns"><button class="win-btn min-btn" title="Minimize">&#8211;</button><button class="win-btn max-btn" title="Maximize">&#9723;</button><button class="win-btn close-btn">X</button></span>' +
      '</div>' +
      (opts.menuHtml || '') +
      constructionHtml +
      bodyHtml;

    document.getElementById('windows-layer').appendChild(el);

    // position after layout so we know the real (CSS-driven) size
    var w = el.offsetWidth, h = el.offsetHeight;
    var pos;
    if(isMobile()){
      // Most small-screen windows are centered. A window that provides an
      // explicit opening position (currently DtD Post Mail) needs to keep it:
      // this aligns its titlebar with the mailbox flag and lets the pigeon
      // perch on that same edge instead of drifting upward with centering.
      var mobileX=Number.isFinite(opts.initialLeft)?opts.initialLeft:(window.innerWidth-w)/2;
      var mobileY=Number.isFinite(opts.initialTop)?opts.initialTop:(window.innerHeight-TASKBAR_H-h)/2;
      pos = clampToViewport(mobileX, mobileY, w, h);
    } else {
      winCounter++;
      var offset = (winCounter % 8) * 22;
      var initialX=Number.isFinite(opts.initialLeft)?opts.initialLeft:40+offset;
      var initialY=Number.isFinite(opts.initialTop)?opts.initialTop:40+offset;
      pos = clampToViewport(initialX, initialY, w, h);
    }
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.style.visibility = 'visible';

    var record = { id: id, el: el, type: opts.type, buddyId: opts.buddyId, onClose: opts.onClose, maximized: false, prevRect: null, minimized: false };
    openWindows.push(record);
    addTaskbarItem(record, opts.title);

    el.querySelector('.close-btn').addEventListener('click', function(){ closeWindow(id); });
    el.querySelector('.min-btn').addEventListener('click', function(e){
      e.stopPropagation();
      minimizeWindow(record);
    });
    el.querySelector('.max-btn').addEventListener('click', function(e){
      e.stopPropagation();
      toggleMaximize(record);
    });
    el.addEventListener('mousedown', function(){ focusWindow(id); });
    el.addEventListener('touchstart', function(){ focusWindow(id); }, { passive: true });
    makeDraggable(el, el.querySelector('.titlebar'));
    focusWindow(id);

    if(opts.onMount) opts.onMount(el, id);
    return { id: id, el: el };
  }

  function toggleMaximize(rec){
    var el = rec.el;
    var btn = el.querySelector('.max-btn');
    if(!rec.maximized){
      rec.prevRect = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      el.style.left = '4px';
      el.style.top = '4px';
      el.style.width = 'calc(100% - 8px)';
      el.style.height = 'calc(100% - ' + (TASKBAR_H + 8) + 'px)';
      rec.maximized = true;
      if(btn) btn.title = 'Restore';
    } else {
      el.style.left = rec.prevRect.left;
      el.style.top = rec.prevRect.top;
      el.style.width = rec.prevRect.width;
      el.style.height = rec.prevRect.height;
      rec.maximized = false;
      if(btn) btn.title = 'Maximize';
    }
    focusWindow(rec.id);
  }

  function closeWindow(id){
    var rec = openWindows.find(function(w){ return w.id === id; });
    if(!rec) return;
    if(rec.dtdDeliveryTimer) clearInterval(rec.dtdDeliveryTimer);
    if(rec.onClose){ try{ rec.onClose(); }catch(e){} }
    rec.el.remove();
    if(rec.tbEl) rec.tbEl.remove();
    openWindows = openWindows.filter(function(w){ return w.id !== id; });
    if(activeWindowId === id) activeWindowId = null;
    showDesktopHidden = showDesktopHidden.filter(function(wid){ return wid !== id; });
  }

  function minimizeWindow(rec){
    if(!rec || rec.minimized) return;
    rec.el.style.display = 'none';
    rec.minimized = true;
    if(rec.tbEl){ rec.tbEl.classList.remove('active'); rec.tbEl.classList.add('minimized'); }
    if(activeWindowId === rec.id) activeWindowId = null;
  }

  function focusWindow(id){
    var rec = openWindows.find(function(w){ return w.id === id; });
    if(!rec) return;
    if(rec.minimized){
      rec.el.style.display = '';
      rec.minimized = false;
      if(rec.tbEl) rec.tbEl.classList.remove('minimized');
    }
    activeWindowId = id;
    openWindows.forEach(function(w){
      w.el.style.zIndex = (w.id === id) ? (++zCounter) : w.el.style.zIndex;
    });
    document.querySelectorAll('.tb-item').forEach(function(t){ t.classList.remove('active'); });
    if(rec.tbEl) rec.tbEl.classList.add('active');
  }

  function addTaskbarItem(rec, label){
    var tb = document.getElementById('tb-items');
    var item = document.createElement('div');
    item.className = 'tb-item';
    item.textContent = label;
    item.addEventListener('click', function(){
      if(!rec.minimized && activeWindowId === rec.id){
        minimizeWindow(rec);
      } else {
        focusWindow(rec.id);
      }
    });
    tb.appendChild(item);
    rec.tbEl = item;
  }

  // Minimizes every open window (classic "Show Desktop"); pressing it again
  // restores only the windows that this action minimized, leaving windows the
  // user had already minimized by hand untouched.
  function showDesktop(){
    if(showDesktopHidden.length){
      var ids = showDesktopHidden.slice();
      showDesktopHidden = [];
      ids.forEach(function(wid){
        var rec = openWindows.find(function(w){ return w.id === wid; });
        if(rec && rec.minimized) focusWindow(rec.id);
      });
    } else {
      var hidden = [];
      openWindows.forEach(function(rec){
        if(!rec.minimized){
          minimizeWindow(rec);
          hidden.push(rec.id);
        }
      });
      showDesktopHidden = hidden;
    }
  }

  function makeDraggable(winEl, handleEl, onDragEnd){
    var dragging = false, offX = 0, offY = 0;

    function moveTo(clientX, clientY){
      var x = clientX - offX, y = clientY - offY;
      var clamped = clampToViewport(x, y, winEl.offsetWidth, winEl.offsetHeight);
      winEl.style.left = clamped.x + 'px';
      winEl.style.top = clamped.y + 'px';
    }

    // mouse (desktop / trackpad)
    handleEl.addEventListener('mousedown', function(e){
      if(e.target.closest && e.target.closest('button')) return;
      dragging = true;
      offX = e.clientX - winEl.offsetLeft;
      offY = e.clientY - winEl.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e){
      if(!dragging) return;
      moveTo(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', function(){
      if(!dragging) return;
      dragging = false;
      if(onDragEnd) onDragEnd();
    });

    // touch (mobile)
    handleEl.addEventListener('touchstart', function(e){
      if(e.target.closest && e.target.closest('button')) return;
      var t = e.touches[0];
      dragging = true;
      offX = t.clientX - winEl.offsetLeft;
      offY = t.clientY - winEl.offsetTop;
    }, { passive: true });
    handleEl.addEventListener('touchmove', function(e){
      if(!dragging) return;
      var t = e.touches[0];
      moveTo(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });
    handleEl.addEventListener('touchend', function(){
      if(!dragging) return;
      dragging = false;
      if(onDragEnd) onDragEnd();
    });
  }

