  // ---------------- sound ----------------
  function getCtx(){
    if(!window._actx){
      window._actx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return window._actx;
  }
  function playDing(){
    try{
      var ctx = getCtx(); var now = ctx.currentTime;
      [[880,0],[1318.5,0.09]].forEach(function(pair){
        var freq = pair[0], delay = pair[1];
        var osc = ctx.createOscillator(); var gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now+delay);
        gain.gain.exponentialRampToValueAtTime(0.28, now+delay+0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now+delay+0.28);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now+delay); osc.stop(now+delay+0.3);
      });
    }catch(e){}
  }
  function playDoorCreak(){
    try{
      var ctx = getCtx(); var now = ctx.currentTime;
      var osc = ctx.createOscillator(); var gain = ctx.createGain(); var filt = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(230, now+0.5);
      osc.frequency.exponentialRampToValueAtTime(120, now+0.95);
      filt.type = 'bandpass'; filt.frequency.value = 320; filt.Q.value = 6;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now+0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now+1.0);
      osc.connect(filt).connect(gain).connect(ctx.destination);
      osc.start(now); osc.stop(now+1.05);
    }catch(e){}
  }

  function playDoorSlam(){
    try{
      var ctx = getCtx(); var now = ctx.currentTime;
      // low thud — body impact of the door
      var bufSize = ctx.sampleRate * 0.6;
      var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for(var i=0; i<bufSize; i++){ data[i] = (Math.random()*2-1); }
      var noise = ctx.createBufferSource(); noise.buffer = buf;
      var nGain = ctx.createGain();
      var nFilt = ctx.createBiquadFilter();
      nFilt.type = 'lowpass'; nFilt.frequency.value = 140; nFilt.Q.value = 4;
      nGain.gain.setValueAtTime(0.0001, now);
      nGain.gain.linearRampToValueAtTime(0.7, now+0.008);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now+0.55);
      noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(ctx.destination);
      noise.start(now); noise.stop(now+0.6);
      // sharp high click — latch snap
      var click = ctx.createOscillator();
      var cGain = ctx.createGain();
      click.type = 'square'; click.frequency.value = 900;
      cGain.gain.setValueAtTime(0.0001, now);
      cGain.gain.linearRampToValueAtTime(0.35, now+0.004);
      cGain.gain.exponentialRampToValueAtTime(0.0001, now+0.06);
      click.connect(cGain); cGain.connect(ctx.destination);
      click.start(now); click.stop(now+0.07);
      // brief rattle after — frame vibration
      var rattleBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate*0.2), ctx.sampleRate);
      var rd = rattleBuf.getChannelData(0);
      for(var j=0; j<rd.length; j++){ rd[j] = (Math.random()*2-1); }
      var rattle = ctx.createBufferSource(); rattle.buffer = rattleBuf;
      var rGain = ctx.createGain();
      var rFilt = ctx.createBiquadFilter();
      rFilt.type = 'bandpass'; rFilt.frequency.value = 600; rFilt.Q.value = 3;
      rGain.gain.setValueAtTime(0.0001, now+0.04);
      rGain.gain.linearRampToValueAtTime(0.12, now+0.055);
      rGain.gain.exponentialRampToValueAtTime(0.0001, now+0.22);
      rattle.connect(rFilt); rFilt.connect(rGain); rGain.connect(ctx.destination);
      rattle.start(now+0.04); rattle.stop(now+0.25);
    }catch(e){}
  }

  // ---------------- mascot: yellow smiley on a blue square badge ----------------
  var DEFAULT_BG_B64 = 'assets/embedded/default-desktop-background.jpg';
  var SIGNON_ICON_B64 = 'assets/embedded/signon-icon.png';
  var SMILEY_B64 = 'assets/embedded/smiley-mascot.png';
  var DIARY_B64  = 'assets/embedded/diary-icon.jpg';

  function mascotSVG(size){
    size = size || 54;
    return '<img src="'+SMILEY_B64+'" width="'+size+'" height="'+size+'" style="object-fit:contain;image-rendering:auto;vertical-align:middle;">';
  }
  function diarySVG(size){
    size = size || 200;
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">' +
           '<img src="'+DIARY_B64+'" width="'+size+'" height="'+size+'" style="object-fit:contain;image-rendering:auto;border:3px solid var(--th-title-3,#0850d0);border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.35);">' +
           '</div>';
  }
  document.getElementById('mascot-slot').innerHTML = diarySVG(180);
  document.getElementById('mascot-slot-2').innerHTML = mascotSVG(44);
  document.querySelectorAll('.ttl-icon').forEach(function(el){ el.innerHTML = mascotSVG(15); });
  document.getElementById('signon-go-icon').innerHTML = mascotSVG(16);
  document.getElementById('signon-icon-img').src = SIGNON_ICON_B64;

  document.getElementById('signon-close').addEventListener('click', function(){
    document.getElementById('signon-wrap').style.display = 'none';
    document.getElementById('signon-icon').style.display = 'flex';
  });
  bindAccessibleAction(document.getElementById('signon-icon'), function(){
    document.getElementById('signon-icon').style.display = 'none';
    showSignon();
  });

  function iconSVG(name){
    var stroke = 'stroke="#0850d0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    if(name === 'bulb'){
      return '<svg width="15" height="15" viewBox="0 0 24 24" '+stroke+'><path d="M9 18h6M10 22h4M12 2a6 6 0 00-3.5 10.9c.4.3.5.8.5 1.3V15h6v-.8c0-.5.1-1 .5-1.3A6 6 0 0012 2z"/></svg>';
    }
    if(name === 'clock'){
      return '<svg width="15" height="15" viewBox="0 0 24 24" '+stroke+'><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';
    }
    if(name === 'plus'){
      return '<svg width="15" height="15" viewBox="0 0 24 24" '+stroke+'><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M19 8v6M16 11h6"/></svg>';
    }
    if(name === 'send'){
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="#4a2e00"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>';
    }
    if(name === 'photo'){
      return '<svg width="15" height="15" viewBox="0 0 24 24" '+stroke+'><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M4 18l5-5 4 4 3-3 4 4"/></svg>';
    }
    if(name === 'pencil'){
      return '<svg width="13" height="13" viewBox="0 0 24 24" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
    }
    if(name === 'trash'){
      return '<svg width="13" height="13" viewBox="0 0 24 24" stroke="#b00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
    }
    if(name === 'mic'){
      return '<svg width="15" height="15" viewBox="0 0 24 24" '+stroke+'><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v4M8 22h8"/></svg>';
    }
    if(name === 'dropper'){
      return '<svg width="18" height="18" viewBox="0 0 24 24" '+stroke+'><path d="M17 3l4 4-3 3-4-4z"/><path d="M15.5 6.5L5 17l-2 4 4-2L17.5 8.5z"/><path d="M9 13l2 2"/></svg>';
    }
    return '';
  }

  // ---------------- helpers ----------------
  function uid(){ return 'id' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  var TRASH_RETENTION_MS=7*24*60*60*1000;
  function purgeExpiredTrash(){
    if(!Array.isArray(state.trash))state.trash=[];
    var before=state.trash.length;
    state.trash=state.trash.filter(function(item){return item&&item.deletedAt&&Date.now()-item.deletedAt<TRASH_RETENTION_MS;});
    return before!==state.trash.length;
  }
  function refreshTrashIcon(){
    purgeExpiredTrash();
    var badge=document.getElementById('trash-count');if(!badge)return;
    var count=state.trash.length;badge.textContent=count>99?'99+':String(count);badge.style.display=count?'block':'none';
  }
  function moveToTrash(type,label,data,meta){
    purgeExpiredTrash();
    state.trash.unshift({id:uid(),type:type,label:label||'Untitled',deletedAt:Date.now(),data:JSON.parse(JSON.stringify(data)),meta:meta||{}});
    refreshTrashIcon();
    var trashWindow=openWindows&&openWindows.find(function(w){return w.type==='trash';});if(trashWindow&&trashWindow.el&&trashWindow.el._renderTrash)trashWindow.el._renderTrash();
  }
  function refreshRecoveredContent(item){
    refreshTrashIcon();
    if(item.type==='sticky')mountStickyNote(item.data);
    if(item.type==='buddy')renderBuddyList();
    if(item.type==='buddyEntry'){renderBuddyList();var im=openWindows.find(function(w){return w.type==='im'&&w.buddyId===item.meta.buddyId;});if(im&&im.el&&im.el._refreshLog)im.el._refreshLog();}
    if(item.type==='diaryPost'){
      var diary=openWindows.find(function(w){return w.type==='diaryentries';});if(diary&&diary.el&&diary.el._refreshDiaryEntries)diary.el._refreshDiaryEntries();
      var profile=openWindows.find(function(w){return w.type==='viewprofile';});if(profile&&profile.el&&profile.el._refreshProfile)profile.el._refreshProfile();
    }
  }
  function restoreTrashItem(item){
    if(item.type==='sticky'){
      if(!(state.stickyNotes||[]).some(function(n){return n.id===item.data.id;}))state.stickyNotes.push(item.data);
    }else if(item.type==='buddy'){
      var pack=item.data||{},restoredBuddy=pack.buddy;if(!restoredBuddy)return false;
      if(!state.groups.some(function(g){return g.id===restoredBuddy.groupId;}))restoredBuddy.groupId='default';
      if(!state.buddies.some(function(b){return b.id===restoredBuddy.id;}))state.buddies.push(restoredBuddy);
      state.entries[restoredBuddy.id]=Array.isArray(pack.entries)?pack.entries:[];
      state.drafts[restoredBuddy.id]=Array.isArray(pack.drafts)?pack.drafts:[];
    }else if(item.type==='buddyEntry'){
      var buddy=state.buddies.find(function(b){return b.id===item.meta.buddyId;});if(!buddy){openInfoWindow('That diary no longer exists, so this entry cannot be restored.');return false;}
      state.entries[item.meta.buddyId]=state.entries[item.meta.buddyId]||[];
      if(!state.entries[item.meta.buddyId].some(function(e){return e.id===item.data.id;}))state.entries[item.meta.buddyId].push(item.data);
    }else if(item.type==='diaryPost'){
      state.blogPosts=state.blogPosts||[];
      if(!state.blogPosts.some(function(p){return p.id===item.data.id;}))state.blogPosts.push(item.data);
      syncDtdPublicEntry(item.data).catch(function(){});
    }else return false;
    state.trash=state.trash.filter(function(t){return t.id!==item.id;});
    saveState();refreshRecoveredContent(item);return true;
  }
  function trashTypeName(type){return type==='sticky'?'Sticky Note':(type==='buddy'?'Buddy':(type==='buddyEntry'?'Diary Entry':'Private Diary Entry'));}
  function openTrashWindow(){
    var existing=openWindows.find(function(w){return w.type==='trash';});if(existing){focusWindow(existing.id);if(existing.el._renderTrash)existing.el._renderTrash();return;}
    createWindow({title:'Trash',extraClass:'trash-win',bodyHtml:'<div class="win-body" style="padding:0"></div>',type:'trash',onMount:function(el){
      function render(){
        if(purgeExpiredTrash())saveState();refreshTrashIcon();
        var rows=state.trash.length?state.trash.map(function(item){var left=Math.max(1,Math.ceil((TRASH_RETENTION_MS-(Date.now()-item.deletedAt))/(24*60*60*1000))),icon=item.type==='sticky'?'🗒️':(item.type==='buddy'?'👤':(item.type==='buddyEntry'?'📖':'📝'));return '<div class="trash-row" data-trash-id="'+escapeHtml(item.id)+'"><div class="trash-row-icon">'+icon+'</div><div><div class="trash-row-title">'+escapeHtml(item.label)+'</div><div class="trash-row-meta">'+trashTypeName(item.type)+' · '+left+' day'+(left===1?'':'s')+' remaining</div></div><div class="trash-row-actions"><button class="btn trash-restore">Restore</button><button class="btn trash-delete-now" title="Delete permanently">×</button></div></div>';}).join(''):'<div class="vp-empty" style="padding:34px 12px">Trash is empty.</div>';
        el.querySelector('.win-body').innerHTML='<div class="trash-head"><div><b>Recently Deleted</b><small>Items are permanently removed after seven days.</small></div>'+(state.trash.length?'<button class="btn trash-empty">Empty Trash</button>':'')+'</div><div class="trash-list">'+rows+'</div>';
        el.querySelectorAll('[data-trash-id]').forEach(function(row){var item=state.trash.find(function(t){return t.id===row.dataset.trashId;});if(!item)return;row.querySelector('.trash-restore').onclick=function(){if(restoreTrashItem(item))render();};row.querySelector('.trash-delete-now').onclick=function(){appConfirm('Delete this item permanently?',function(ok){if(!ok)return;state.trash=state.trash.filter(function(t){return t.id!==item.id;});saveState();render();});};});
        var empty=el.querySelector('.trash-empty');if(empty)empty.onclick=function(){appConfirm('Permanently delete everything in Trash?',function(ok){if(!ok)return;state.trash=[];saveState();render();});};
      }
      el._renderTrash=render;render();
    }});
  }

  function openSudokuWindow(){
    var existing=openWindows.find(function(w){return w.type==='sudoku';});
    if(existing){focusWindow(existing.id);return;}
    createWindow({
      title:'Sudoku',
      extraClass:'sudoku-win',
      type:'sudoku',
      constructionBar:false,
      bodyHtml:'<div class="sudoku-frame-host"><iframe title="Sudoku game" src="assets/sudoku-game.html" sandbox="allow-scripts allow-same-origin"></iframe></div>',
      onMount:function(el){
        var frame=el.querySelector('iframe');
        frame.addEventListener('load',function(){
          try{
            var doc=frame.contentDocument,winDialog=doc&&doc.getElementById('win-dialog');
            if(!doc||!winDialog)return;
            doc.addEventListener('click',function(event){
              var button=event.target.closest&&event.target.closest('button');
              if(!button)return;
              var action=button.dataset&&button.dataset.action;
              if(button.id==='start-btn'||action==='play-again'||action==='restart')trackDtdUsage('sudoku_started');
            });
            var wasOpen=winDialog.classList.contains('open');
            new MutationObserver(function(){
              var isOpen=winDialog.classList.contains('open');
              if(isOpen&&!wasOpen)trackDtdUsage('sudoku_completed');
              wasOpen=isOpen;
            }).observe(winDialog,{attributes:true,attributeFilter:['class']});
          }catch(e){}
        });
      }
    });
  }


  // Simple in-app info/alert — replaces alert() calls (blocked in some sandboxes).
  function openInfoWindow(message){
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#ece9d8;border:2px solid #0054e3;border-radius:6px;padding:18px 20px;max-width:260px;width:90%;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,.5);';
    box.innerHTML = '<div style="margin-bottom:14px;">'+escapeHtml(message)+'</div>' +
      '<div style="text-align:right;"><button class="btn" id="ai-ok">OK</button></div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    function close(){ document.body.removeChild(overlay); }
    box.querySelector('#ai-ok').addEventListener('click', close);
    overlay.addEventListener('click', function(e){ if(e.target===overlay) close(); });
  }
  // cb(true) fires if confirmed, cb(false) if cancelled.
  function appConfirm(message, cb){
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#ece9d8;border:2px solid #0054e3;border-radius:6px;padding:18px 20px;max-width:280px;width:90%;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,.5);';
    box.innerHTML = '<div style="margin-bottom:14px;">'+escapeHtml(message)+'</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        '<button class="btn" id="ac-cancel">Cancel</button>' +
        '<button class="btn" id="ac-ok" style="background:#c0392b;color:#fff;border-color:#a93226;">Delete</button>' +
      '</div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    function done(result){ document.body.removeChild(overlay); cb(result); }
    box.querySelector('#ac-ok').addEventListener('click', function(){ done(true); });
    box.querySelector('#ac-cancel').addEventListener('click', function(){ done(false); });
    overlay.addEventListener('click', function(e){ if(e.target === overlay) done(false); });
  }
  function confirmDeleteBuddyList(buddy, onDelete){
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#ece9d8;border:2px solid #0054e3;border-radius:6px;padding:18px 20px;max-width:310px;width:90%;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,.5);';
    box.innerHTML = '<div style="margin-bottom:14px;">Move "'+escapeHtml(buddy.name)+'" and this buddy list to Trash? You can recover them for seven days.</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">' +
        '<button class="btn" id="cdbl-cancel">Cancel</button>' +
        '<button class="btn" id="cdbl-export">Export Conversation</button>' +
        '<button class="btn" id="cdbl-delete" style="background:#c0392b;color:#fff;border-color:#a93226;">Delete</button>' +
      '</div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    function close(){ document.body.removeChild(overlay); }
    box.querySelector('#cdbl-cancel').addEventListener('click', close);
    box.querySelector('#cdbl-export').addEventListener('click', function(){ exportConversation(buddy.id, buddy.name); });
    box.querySelector('#cdbl-delete').addEventListener('click', function(){ close(); onDelete(); });
    overlay.addEventListener('click', function(e){ if(e.target === overlay) close(); });
  }
  // Prompts for the account password to reveal a locked entry. cb(true) if correct, cb(false) if cancelled/incorrect-and-gave-up.
  function appPasscodePrompt(cb){
    if(!state.account.password){
      openInfoWindow('Set an account password first in File \u2192 Account Settings.');
      cb(false);
      return;
    }
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#ece9d8;border:2px solid #0054e3;border-radius:6px;padding:18px 20px;max-width:260px;width:90%;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,.5);';
    box.innerHTML = '<div style="margin-bottom:10px;">🔒 Enter your password to view this entry</div>' +
      '<input type="password" id="pc-input" style="width:100%;box-sizing:border-box;padding:4px;margin-bottom:6px;">' +
      '<div id="pc-error" style="color:#c0392b;min-height:14px;margin-bottom:8px;"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        '<button class="btn" id="pc-cancel">Cancel</button>' +
        '<button class="btn" id="pc-ok">Unlock</button>' +
      '</div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    var input = box.querySelector('#pc-input');
    var errEl = box.querySelector('#pc-error');
    function done(result){ document.body.removeChild(overlay); cb(result); }
    function attempt(){
      if(input.value === state.account.password){ done(true); }
      else { errEl.textContent = 'Incorrect password.'; input.value=''; input.focus(); }
    }
    box.querySelector('#pc-ok').addEventListener('click', attempt);
    box.querySelector('#pc-cancel').addEventListener('click', function(){ done(false); });
    input.addEventListener('keydown', function(e){ if(e.key==='Enter') attempt(); });
    overlay.addEventListener('click', function(e){ if(e.target === overlay) done(false); });
    setTimeout(function(){ input.focus(); }, 30);
  }

  // Runs `action` immediately for an unlocked entry, or behind a password check for a locked one.
  function runIfUnlocked(entry, action){
    if(entry.locked){
      appPasscodePrompt(function(ok){ if(ok) action(); });
    } else {
      action();
    }
  }
  // Prompts for a single line of text. cb(value) if confirmed, cb(null) if cancelled.
  function appTextPrompt(message, defaultValue, cb){
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#ece9d8;border:2px solid #0054e3;border-radius:6px;padding:18px 20px;max-width:260px;width:90%;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,.5);';
    box.innerHTML = '<div style="margin-bottom:10px;">'+escapeHtml(message)+'</div>' +
      '<input type="text" id="tp-input" style="width:100%;box-sizing:border-box;padding:4px;margin-bottom:10px;">' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        '<button class="btn" id="tp-cancel">Cancel</button>' +
        '<button class="btn" id="tp-ok">OK</button>' +
      '</div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    var input = box.querySelector('#tp-input');
    input.value = defaultValue || '';
    function done(result){ document.body.removeChild(overlay); cb(result); }
    function submit(){ done(input.value); }
    box.querySelector('#tp-ok').addEventListener('click', submit);
    box.querySelector('#tp-cancel').addEventListener('click', function(){ done(null); });
    input.addEventListener('keydown', function(e){ if(e.key==='Enter') submit(); });
    overlay.addEventListener('click', function(e){ if(e.target === overlay) done(null); });
    setTimeout(function(){ input.focus(); input.select(); }, 30);
  }
  function fmtTime(ts){
    var d = new Date(ts);
    var h = d.getHours(); var m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if(h === 0) h = 12;
    return h + ':' + (m<10?'0':'') + m + ' ' + ampm;
  }
  function fmtDateShort(ts){
    return new Date(ts).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
  }
  function sameDay(a,b){
    var da = new Date(a), db = new Date(b);
    return da.getFullYear()===db.getFullYear() && da.getMonth()===db.getMonth() && da.getDate()===db.getDate();
  }
  function fmtDayDivider(ts){
    var d = new Date(ts);
    var today = new Date();
    if(sameDay(ts, today.getTime())) return 'Today';
    var yest = new Date(today); yest.setDate(today.getDate()-1);
    if(sameDay(ts, yest.getTime())) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  }
  function relTime(ts){
    var diff = Date.now() - ts;
    var mins = Math.floor(diff/60000);
    if(mins < 1) return 'just now';
    if(mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins/60);
    if(hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs/24);
    if(days < 7) return days + 'd ago';
    return new Date(ts).toLocaleDateString(undefined,{month:'short', day:'numeric'});
  }
  function lastEntryTs(buddyId){
    var list = (state.entries[buddyId] || []).filter(function(e){ return e.kind !== 'prompt'; });
    if(!list.length) return null;
    return list[list.length-1].ts;
  }
  function statusFor(buddyId){
    var ts = lastEntryTs(buddyId);
    if(ts === null) return 'idle';
    var days = (Date.now()-ts)/86400000;
    if(days <= 7) return 'online';
    if(days <= 30) return 'away';
    return 'idle';
  }
  function findBuddyByName(name){
    var n = name.trim().toLowerCase();
    for(var i=0;i<state.buddies.length;i++){
      if(state.buddies[i].name.toLowerCase() === n) return state.buddies[i];
    }
    return null;
  }
  function ensureBuddy(name, groupId){
    name = name.trim();
    if(!name) return null;
    var existing = findBuddyByName(name);
    if(existing) return existing;
    var b = { id: uid(), name: name, addedAt: Date.now(), groupId: groupId || 'default' };
    state.buddies.push(b);
    state.entries[b.id] = [];
    return b;
  }
  function groupOptionsHtml(){
    return state.groups.map(function(g){
      return '<option value="'+escapeHtml(g.id)+'">'+escapeHtml(g.name)+'</option>';
    }).join('');
  }

