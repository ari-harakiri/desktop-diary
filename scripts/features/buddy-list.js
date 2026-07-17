  // ================= BUDDY LIST =================
  function positionCompanionOverBuddyList(){
    var icon = document.getElementById('desktop-companion');
    var bl = document.getElementById('buddylist-win');
    var toolbar = bl && bl.querySelector('.bl-toolbar');
    if(!icon||!bl||!toolbar) return;
    if(state.desktopIconPositions && state.desktopIconPositions[icon.id]) return;
    var blRect = bl.getBoundingClientRect();
    var tbRect = toolbar.getBoundingClientRect();
    var iw = icon.offsetWidth || 110, ih = icon.offsetHeight || 120;
    var left = blRect.left + (blRect.width - iw) / 2;
    var top = tbRect.top - ih + 16;
    left = Math.max(0, Math.min(left, window.innerWidth - iw));
    top = Math.max(0, Math.min(top, window.innerHeight - TASKBAR_H - ih));
    icon.style.left = Math.round(left) + 'px';
    icon.style.top = Math.round(top) + 'px';
    icon.style.right = 'auto';
    icon.style.bottom = 'auto';
    icon.classList.add('over-buddy-list');
  }
  function showBuddyList(){
    var bl = document.getElementById('buddylist-win');
    bl.style.display = 'flex';
    document.getElementById('desktop-search').style.display = 'none';
    var w = bl.offsetWidth || 168;
    var h = bl.offsetHeight || 380;
    // Older builds saved the list's temporary resize-clamped position as if
    // the user had dragged it there. That is what made it reopen centered.
    // Only honor positions explicitly marked by a real Buddy List drag.
    var savedPosition = state.buddyListPosition&&state.buddyListPosition.userPlaced
      ? state.buddyListPosition
      : null;
    var startingPosition = savedPosition
      ? clampToViewport(
          Number.isFinite(Number(savedPosition.right)) ? window.innerWidth-w-Number(savedPosition.right) : Number(savedPosition.x),
          Number(savedPosition.y),
          w,
          h
        )
      : clampToViewport(window.innerWidth - w - 16, 16, w, h);
    bl.style.left = Math.round(startingPosition.x) + 'px';
    bl.style.top = Math.round(startingPosition.y) + 'px';
    if(savedPosition){
      savedPosition.x = startingPosition.x;
      savedPosition.y = startingPosition.y;
      savedPosition.right = Math.max(0,window.innerWidth-startingPosition.x-w);
    }
    positionCompanionOverBuddyList();
    document.getElementById('bl-title-text').textContent = state.account.screenName;
    document.getElementById('bl-me-name').textContent = state.account.screenName;
    refreshMyStatus();
    refreshProfilePic();
    renderBuddyList();
    fitSearchBarWidth();
    var rec = registerBuddyListWindow();
    focusWindow(rec.id);
  }

  function fitSearchBarWidth(){
    var search = document.getElementById('desktop-search');
    if(!search) return;
    search.style.maxWidth = '';
  }
  function keepBuddyListOnScreen(){
    var bl = document.getElementById('buddylist-win');
    if(!bl || bl.style.display === 'none' || !bl.style.left) return;
    var savedPosition=state.buddyListPosition;
    var wasUserPlaced=!!(savedPosition&&savedPosition.userPlaced);
    var desiredX=wasUserPlaced&&Number.isFinite(Number(savedPosition.right))
      ? window.innerWidth-bl.offsetWidth-Number(savedPosition.right)
      : window.innerWidth-bl.offsetWidth-16;
    var desiredY=wasUserPlaced?bl.offsetTop:16;
    var position = clampToViewport(desiredX, desiredY, bl.offsetWidth, bl.offsetHeight);
    bl.style.left = Math.round(position.x) + 'px';
    bl.style.top = Math.round(position.y) + 'px';
    state.buddyListPosition = {
      x:position.x,
      y:position.y,
      right:Math.max(0,window.innerWidth-position.x-bl.offsetWidth),
      userPlaced:wasUserPlaced
    };
  }
  window.addEventListener('resize', function(){ fitSearchBarWidth(); keepBuddyListOnScreen(); });
  window.addEventListener('orientationchange', function(){ setTimeout(fitSearchBarWidth, 150); });

  function refreshProfilePic(){
    var img = document.getElementById('bl-me-pic');
    var ph = document.getElementById('bl-me-pic-ph');
    if(state.profile && state.profile.pic){
      img.src = state.profile.pic;
      img.style.display = 'block';
      ph.style.display = 'none';
    } else {
      img.style.display = 'none';
      ph.style.display = 'flex';
    }
  }

  var buddyListWinRecord = null;
  function registerBuddyListWindow(){
    if(buddyListWinRecord) return buddyListWinRecord;
    var blWin = document.getElementById('buddylist-win');
    var rec = { id: 'buddylist-win', type: 'buddylist', el: blWin, buddyId: null, onClose: null, maximized: false, prevRect: null, minimized: false, tbEl: null };
    openWindows.push(rec);
    addTaskbarItem(rec, 'Buddy List');
    blWin.addEventListener('mousedown', function(){ focusWindow(rec.id); });
    blWin.addEventListener('touchstart', function(){ focusWindow(rec.id); }, { passive: true });
    makeDraggable(blWin, blWin.querySelector('.titlebar'), function(){
      state.buddyListPosition = {
        x:blWin.offsetLeft,
        y:blWin.offsetTop,
        right:Math.max(0,window.innerWidth-blWin.offsetLeft-blWin.offsetWidth),
        userPlaced:true
      };
      saveState();
    });
    document.getElementById('bl-min').addEventListener('click', function(e){
      e.stopPropagation();
      minimizeWindow(rec);
    });
    document.getElementById('bl-me-pic').addEventListener('click', openViewProfileWindow);
    document.getElementById('bl-me-pic-ph').addEventListener('click', openEditProfileWindow);
    buddyListWinRecord = rec;
    return rec;
  }

  function refreshMyStatus(){
    var sub = document.getElementById('bl-me-sub');
    if(state.status && state.status.html){
      sub.innerHTML = state.status.html;
    } else if(state.status && state.status.label){
      sub.textContent = state.status.label;
    } else {
      sub.textContent = 'Online';
    }
  }

  function renderBuddyList(){
    var listEl = document.getElementById('bl-list');
    listEl.innerHTML = '';
    if(!state.buddies.length){
      listEl.innerHTML = '<div class="bl-empty">No buddy lists yet.<br>Add a list to start writing.</div>';
      return;
    }
    var order = { online: 0, away: 1, idle: 2 };
    state.groups.forEach(function(g){
      var groupBuddies = state.buddies.filter(function(b){ return (b.groupId || 'default') === g.id; });
      var onlineCount = groupBuddies.filter(function(b){ return statusFor(b.id) === 'online'; }).length;

      var header = document.createElement('div');
      header.className = 'bl-group-header';
      header.innerHTML = '<span class="bl-group-title"><span class="bl-group-arrow">'+(g.collapsed?'▸':'▾')+'</span>'+escapeHtml(g.name)+' ('+onlineCount+'/'+groupBuddies.length+')</span><span class="bl-group-rename">Rename</span>';
      header.addEventListener('click',function(){g.collapsed=!g.collapsed;saveState();renderBuddyList();});
      header.querySelector('.bl-group-rename').addEventListener('click',function(e){e.stopPropagation();appTextPrompt('Rename category',g.name,function(newName){if(newName===null)return;newName=newName.trim();if(!newName)return;g.name=newName;saveState();renderBuddyList();});});
      listEl.appendChild(header);

      if(g.collapsed) return;

      if(!groupBuddies.length){
        var empty = document.createElement('div');
        empty.className = 'bl-empty';
        empty.style.padding = '6px 8px';
        empty.textContent = 'No buddies here yet.';
        listEl.appendChild(empty);
        return;
      }

      var sorted = groupBuddies.slice().sort(function(a,b){
        var sa = statusFor(a.id), sb = statusFor(b.id);
        if(order[sa] !== order[sb]) return order[sa]-order[sb];
        return a.name.localeCompare(b.name);
      });
      sorted.forEach(function(b){
        var st = statusFor(b.id);
        var ts = lastEntryTs(b.id);
        var row = document.createElement('div');
        row.className = 'bl-row';
        row.innerHTML =
          '<span class="dot ' + st + '"></span>' +
          '<span class="bl-name-wrap">' +
            '<span class="bl-name">' + escapeHtml(b.name) + '</span>' +
            '<span class="bl-sub">' + (ts ? relTime(ts) : 'new buddy') + '</span>' +
          '</span>';
        row.addEventListener('click', function(){ openIMWindow(b.id); });
        listEl.appendChild(row);
      });
    });
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, function(c){
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  // conservative sanitizer for rich-text entries: only bold/italic/underline/line-break
  // and color/background-color styling on spans survive; everything else is unwrapped or dropped.
  function sanitizeHTML(html){
    var container = document.createElement('div');
    container.innerHTML = html;
    var allowed = { B:1, I:1, U:1, SPAN:1, BR:1, DIV:1, FONT:1, IMG:1, AUDIO:1 };
    (function clean(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(child){
        if(child.nodeType === 1){
          var tag = child.tagName;
          if(!allowed[tag]){
            while(child.firstChild) node.insertBefore(child.firstChild, child);
            node.removeChild(child);
            return;
          }
          if(tag === 'IMG'){
            var src = child.getAttribute('src') || '';
            var chosenWidth = child.style ? child.style.width : '';
            while(child.attributes && child.attributes.length){ child.removeAttribute(child.attributes[0].name); }
            if(/^data:image\//.test(src)){
              child.setAttribute('src', src);
              var imgStyle = 'max-width:100%;border-radius:4px;';
              if(/^\d+px$/.test(chosenWidth)) imgStyle += 'width:' + chosenWidth + ';';
              child.setAttribute('style', imgStyle);
            } else {
              node.removeChild(child);
              return;
            }
            return; // no children to clean
          }
          if(tag === 'AUDIO'){
            var asrc = child.getAttribute('src') || '';
            while(child.attributes && child.attributes.length){ child.removeAttribute(child.attributes[0].name); }
            if(/^data:audio\//.test(asrc)){
              child.setAttribute('src', asrc);
              child.setAttribute('controls', '');
              child.setAttribute('style', 'max-width:100%;');
            } else {
              node.removeChild(child);
              return;
            }
            return; // no children to clean
          }
          var keepStyle = '';
          if(tag === 'SPAN' && child.style){
            var color = child.style.color, bg = child.style.backgroundColor;
            if(color) keepStyle += 'color:' + color + ';';
            if(bg) keepStyle += 'background-color:' + bg + ';';
          }
          var keepSize = (tag === 'FONT') ? child.getAttribute('size') : null;
          var keepFace = (tag === 'FONT') ? child.getAttribute('face') : null;
          while(child.attributes && child.attributes.length){
            child.removeAttribute(child.attributes[0].name);
          }
          if(keepStyle) child.setAttribute('style', keepStyle);
          if(keepSize) child.setAttribute('size', keepSize);
          if(keepFace) child.setAttribute('face', keepFace);
          clean(child);
        } else if(child.nodeType !== 3){
          node.removeChild(child);
        }
      });
    })(container);
    return container.innerHTML;
  }

  document.getElementById('bl-close').addEventListener('click', signOff);
  document.getElementById('menu-signoff').addEventListener('click', signOff);
  document.getElementById('bl-addbuddy-btn').addEventListener('click', openBuddiesWindow);
  document.getElementById('menu-buddies').addEventListener('click', openBuddiesWindow);
  document.getElementById('menu-categories').addEventListener('click', openCategoriesWindow);
  document.getElementById('menu-alldrafts').addEventListener('click', openAllDraftsWindow);
  document.getElementById('bl-sendim-btn').addEventListener('click', function(){ openNewMessageWindow(); });
  document.getElementById('menu-logs').addEventListener('click', function(){ openLogsWindow('status'); });
  document.getElementById('menu-cloudsync').addEventListener('click', openCloudSyncWindow);
  document.getElementById('menu-account').addEventListener('click', openAccountSettingsWindow);
  document.getElementById('menu-admin').addEventListener('click', openAdminWindow);
  document.getElementById('menu-editprofile').addEventListener('click', openEditProfileWindow);
  document.getElementById('menu-viewprofile').addEventListener('click', openViewProfileWindow);
  document.getElementById('menu-viewdiary').addEventListener('click', openDiaryEntriesWindow);
  document.getElementById('menu-friendrequests').addEventListener('click', openFriendRequestsWindow);
  document.getElementById('bl-status-edit').addEventListener('click', openSetStatusWindow);
  document.getElementById('bl-status-clear').addEventListener('click', function(){
    if(!state.status||( !state.status.label && !state.status.mood))return;
    state.status={label:'',html:'',ts:Date.now(),mood:''};saveState();syncDtdPublicProfile().catch(function(){});refreshMyStatus();
    var profileWindow=openWindows.find(function(w){return w.type==='viewprofile';});if(profileWindow&&profileWindow.el&&profileWindow.el._refreshProfile)profileWindow.el._refreshProfile();
  });

  function signOff(){
    setActiveSession(false);
    dtdUsageSessionTracked=false;
    setSupabaseSession(null);
    setAdminMenuVisible(false);
    stopDesktopMailWatch();
    stopPenPalNotificationWatch();
    playDoorSlam();
    openWindows.slice().forEach(function(w){ if(w.id !== 'buddylist-win') closeWindow(w.id); });
    if(buddyListWinRecord){
      if(buddyListWinRecord.tbEl) buddyListWinRecord.tbEl.remove();
      openWindows = openWindows.filter(function(w){ return w.id !== 'buddylist-win'; });
      buddyListWinRecord = null;
    }
    document.getElementById('buddylist-win').style.display = 'none';
    document.getElementById('desktop-search').style.display = 'none';
    document.getElementById('desktop-search-results').style.display = 'none';
    document.getElementById('desktop-search-input').value = '';
    document.getElementById('tb-search-toggle').setAttribute('aria-expanded','false');
    var layer = document.getElementById('sticky-layer');
    if(layer) layer.innerHTML = '';
    // Preserve only what the sign-on screen needs, then wipe all user data from memory
    var prevEmail = state.account && state.account.email;
    var prevName  = state.account && state.account.screenName;
    var prevSavePw = state.savePassword;
    var prevAuto   = state.autoLogin;
    var hadCloudUser = !!cloudUser;
    state = makeFreshState();
    if(prevEmail){
      state.account = { email: prevEmail, screenName: prevName };
      state.savePassword = !!prevSavePw;
      state.autoLogin    = !!prevAuto;
    }
    activeStorageKey = STORAGE_KEY; // reset to generic key; sign-in will re-scope
    function doSignoff(){ setTimeout(function(){ showSignon(); }, 900); }
    // Never let a hung or failed network call strand the user with the buddy
    // list gone and no sign-on screen — always finish within a few seconds.
    function withTimeout(getPromise, ms){
      return new Promise(function(resolve){
        var done = false;
        var timer = setTimeout(function(){ if(!done){ done = true; resolve(); } }, ms);
        var p;
        try { p = getPromise(); } catch(e){ p = Promise.reject(e); }
        Promise.resolve(p).then(
          function(){ if(!done){ done = true; clearTimeout(timer); resolve(); } },
          function(){ if(!done){ done = true; clearTimeout(timer); resolve(); } }
        );
      });
    }
    if(hadCloudUser){
      // Flush any unsaved diary data to the cloud, then ALWAYS fully sign out
      // of the Google/Firebase session too — otherwise the next local profile
      // signed into on this same device/browser inherits this person's cloud
      // sync (their diary data can leak into a different account).
      withTimeout(function(){ return pushToCloud(); }, 4000)
        .then(function(){ return withTimeout(function(){ return signOutCloud(); }, 4000); })
        .then(doSignoff);
    } else {
      doSignoff();
    }
  }

