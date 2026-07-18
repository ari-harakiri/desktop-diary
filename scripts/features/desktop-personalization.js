  // ---------------- display settings: windows, taskbar, and buttons ----------------
  var CLASSIC_THEME = {
    title1:'#3d95ff', title2:'#0058e6', title3:'#0850d0', title4:'#1a63d8',
    taskbar1:'#2f7ee0', taskbar2:'#1a4fc4', taskbar3:'#0d3aa8', taskbarBorder:'#5ba3f5',
    item1:'#5ea0f0', item2:'#2f6fd8', itemBorder:'#0d3aa8',
    itemActive1:'#1a4fc4', itemActive2:'#0d3aa8',
    clock1:'#1a4fc4', clock2:'#0d3aa8', clockBorder:'#0a2e85',
    start1:'#7ed957', start2:'#3a9d23', start3:'#237014', startBorder:'#1f5e10'
  };
  var THEME_PRESET_BASE = { navy:'#173f70', silver:'#8a8f99', olive:'#6b7d3d', purple:'#7a4fd1', red:'#ff1493', black:'#242424', yellow:'#ffe600', white:'#e8e8e8', deepgreen:'#145214' };
  var THEME_PRESET_LABELS = { classic:'Classic Blue', navy:'Navy Blue', silver:'Silver', olive:'Olive Green', purple:'Royal Purple', red:'Hot Pink', black:'Black', yellow:'Bright Yellow', white:'White', deepgreen:'Deep Green', rainbow:'Rainbow' };
  // Reference spectrum used to build the Rainbow theme — red through purple.
  var RAINBOW_SPECTRUM = [[0,'#ff0000'],[16,'#ff8c00'],[33,'#ffe600'],[50,'#22cc55'],[66,'#00cfff'],[83,'#3355ff'],[100,'#a020f0']];

  function hexToRgb(hex){
    hex = (hex || '#000000').replace('#','');
    if(hex.length === 3) hex = hex.split('').map(function(c){ return c+c; }).join('');
    var num = parseInt(hex, 16) || 0;
    return { r:(num>>16)&255, g:(num>>8)&255, b:num&255 };
  }
  function rgbToHex(r,g,b){
    return '#' + [r,g,b].map(function(v){
      v = Math.max(0, Math.min(255, Math.round(v)));
      var s = v.toString(16);
      return s.length === 1 ? '0'+s : s;
    }).join('');
  }
  function mixHex(hex, target, amt){
    var a = hexToRgb(hex), b = hexToRgb(target);
    return rgbToHex(a.r+(b.r-a.r)*amt, a.g+(b.g-a.g)*amt, a.b+(b.b-a.b)*amt);
  }
  function lightenHex(hex, amt){ return mixHex(hex, '#ffffff', amt); }
  function darkenHex(hex, amt){ return mixHex(hex, '#000000', amt); }

  // Picks black or white text depending on how light/dark a background color is,
  // so light presets (White, Bright Yellow) don't end up with invisible white text.
  function readableTextColor(hex){
    var c = hexToRgb(hex);
    var luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    return luminance > 0.6 ? '#222222' : '#ffffff';
  }

  // Reads the color at any percentage along a list of [position, color] anchor stops.
  function sampleStops(anchors, pct){
    for(var i = 0; i < anchors.length - 1; i++){
      var a = anchors[i], b = anchors[i+1];
      if(pct >= a[0] && pct <= b[0]){
        var t = (b[0] === a[0]) ? 0 : (pct - a[0]) / (b[0] - a[0]);
        return mixHex(a[1], b[1], t);
      }
    }
    return anchors[anchors.length - 1][1];
  }

  // Builds a full coordinated palette (titlebar/taskbar/items/clock/Start button) from one accent color.
  function deriveThemeFromColor(base){
    var d = darkenHex(base, 0.12);
    return {
      title1: lightenHex(base, 0.35), title2: base, title3: d, title4: lightenHex(d, 0.12),
      taskbar1: lightenHex(base, 0.05), taskbar2: darkenHex(base, 0.18), taskbar3: darkenHex(base, 0.35), taskbarBorder: lightenHex(base, 0.25),
      item1: lightenHex(base, 0.2), item2: darkenHex(base, 0.12), itemBorder: darkenHex(base, 0.35),
      itemActive1: darkenHex(base, 0.18), itemActive2: darkenHex(base, 0.38),
      clock1: darkenHex(base, 0.18), clock2: darkenHex(base, 0.38), clockBorder: darkenHex(base, 0.45),
      start1: lightenHex(base, 0.35), start2: base, start3: darkenHex(base, 0.15), startBorder: darkenHex(base, 0.35)
    };
  }

  function deriveFlatThemeFromColor(base){
    var border = darkenHex(base, 0.3);
    return {
      title1:base, title2:base, title3:base, title4:base,
      taskbar1:base, taskbar2:base, taskbar3:base, taskbarBorder:border,
      item1:base, item2:base, itemBorder:border,
      itemActive1:base, itemActive2:base,
      clock1:base, clock2:base, clockBorder:border,
      start1:base, start2:base, start3:base, startBorder:border
    };
  }

  // Builds title/taskbar/item stops from up to 3 gradient colors, and lets Start/Clock/Calendar/Font
  // each be picked independently rather than all being derived from one accent color.
  function buildCustomPalette(theme){
    var colors = (theme.customColors && theme.customColors.length) ? theme.customColors : ['#3d95ff'];
    var anchors;
    if(colors.length === 1) anchors = [[0,colors[0]],[100,colors[0]]];
    else if(colors.length === 2) anchors = [[0,colors[0]],[100,colors[1]]];
    else anchors = [[0,colors[0]],[50,colors[1]],[100,colors[2]]];

    var startBase = theme.startColor || '#7ed957';
    var clockBase = theme.clockColor || '#1a4fc4';

    return {
      title1: sampleStops(anchors,0), title2: sampleStops(anchors,45), title3: sampleStops(anchors,55), title4: sampleStops(anchors,100),
      taskbar1: sampleStops(anchors,0), taskbar2: sampleStops(anchors,50), taskbar3: sampleStops(anchors,100),
      taskbarBorder: lightenHex(sampleStops(anchors,50), 0.3),
      item1: sampleStops(anchors,15), item2: sampleStops(anchors,65), itemBorder: darkenHex(sampleStops(anchors,65), 0.3),
      itemActive1: sampleStops(anchors,55), itemActive2: sampleStops(anchors,95),
      clock1: clockBase, clock2: darkenHex(clockBase, 0.25), clockBorder: darkenHex(clockBase, 0.45),
      start1: lightenHex(startBase, 0.35), start2: startBase, start3: darkenHex(startBase, 0.15), startBorder: darkenHex(startBase, 0.35),
      calDays: (theme.calDaysColors && theme.calDaysColors[0]) || '#8f8b7a',
      fontColor: theme.fontColor || '#ffffff'
    };
  }

  function resolveThemePalette(theme){
    var preset = (theme && theme.preset) || 'classic';
    if(preset === 'classic') return CLASSIC_THEME;
    var base = THEME_PRESET_BASE[preset];
    if(preset === 'yellow') return deriveFlatThemeFromColor(base);
    return base ? deriveThemeFromColor(base) : CLASSIC_THEME;
  }

  // Turns any 4-anchor titlebar gradient (0/45/55/100%) into the 7 evenly-spaced stops the
  // CSS now expects — resampling the *same* gradient at more points, so Classic (and every
  // derived preset) renders pixel-identical to before, just expressed with more stops.
  function expandTitleStops(p, angle){
    var anchors = [[0,p.title1],[45,p.title2],[55,p.title3],[100,p.title4]];
    var positions = [0,16,33,50,66,83,100];
    var vals = positions.map(function(pos){ return sampleStops(anchors, pos); });
    return { t1:vals[0], t2:vals[1], t3:vals[2], t4:vals[3], t5:vals[4], t6:vals[5], t7:vals[6], angle: angle || '180deg' };
  }

  function applyTheme(){
    var preset = (state.theme && state.theme.preset) || 'classic';
    var root = document.documentElement.style;
    var isRainbow = preset === 'rainbow';
    var isCustom = preset === 'custom' || preset.indexOf('custom-') === 0;
    document.body.classList.toggle('theme-rainbow', isRainbow);
    var p = (isRainbow || isCustom) ? null : resolveThemePalette(state.theme);
    var title, taskbarAngle, taskbar1, taskbar2, taskbar3, taskbarBorder,
        item1, item2, itemBorder, itemActive1, itemActive2, clock1, clock2, clockBorder,
        start1, start2, start3, startBorder, calDays, fontColor;

    if(isRainbow){
      title = { t1:sampleStops(RAINBOW_SPECTRUM,0), t2:sampleStops(RAINBOW_SPECTRUM,16), t3:sampleStops(RAINBOW_SPECTRUM,33),
        t4:sampleStops(RAINBOW_SPECTRUM,50), t5:sampleStops(RAINBOW_SPECTRUM,66), t6:sampleStops(RAINBOW_SPECTRUM,83),
        t7:sampleStops(RAINBOW_SPECTRUM,100), angle:'90deg' };
      taskbarAngle = '90deg';
      taskbar1 = sampleStops(RAINBOW_SPECTRUM, 15); taskbar2 = sampleStops(RAINBOW_SPECTRUM, 50); taskbar3 = sampleStops(RAINBOW_SPECTRUM, 85);
      taskbarBorder = lightenHex(sampleStops(RAINBOW_SPECTRUM, 50), 0.3);
      item1 = sampleStops(RAINBOW_SPECTRUM, 25); item2 = sampleStops(RAINBOW_SPECTRUM, 45); itemBorder = darkenHex(item2, 0.3);
      itemActive1 = sampleStops(RAINBOW_SPECTRUM, 45); itemActive2 = sampleStops(RAINBOW_SPECTRUM, 65);
      clock1 = sampleStops(RAINBOW_SPECTRUM, 60); clock2 = sampleStops(RAINBOW_SPECTRUM, 78); clockBorder = darkenHex(clock2, 0.3);
      // Keep the rainbow desktop playful without making every control rainbow.
      // Its regular buttons are pinkish-purple, while Start stays classic green.
      start1 = '#7ed957'; start2 = '#3a9d23'; start3 = '#237014'; startBorder = '#1f5e10';
      calDays = '#888888'; // overridden per-cell inline in JS anyway (rainbow theme forces gray weekday cells)
      fontColor = '#ffffff';
    } else if(isCustom){
      var ct = state.theme || {};
      var cp = buildCustomPalette(ct);
      var dirAngle = (ct.gradientDirection === 'horizontal') ? '90deg' : '180deg';
      if(ct.accentRainbow){
        title = { t1:sampleStops(RAINBOW_SPECTRUM,0), t2:sampleStops(RAINBOW_SPECTRUM,16), t3:sampleStops(RAINBOW_SPECTRUM,33),
          t4:sampleStops(RAINBOW_SPECTRUM,50), t5:sampleStops(RAINBOW_SPECTRUM,66), t6:sampleStops(RAINBOW_SPECTRUM,83),
          t7:sampleStops(RAINBOW_SPECTRUM,100), angle:'90deg' };
        taskbarAngle = '90deg';
        taskbar1 = sampleStops(RAINBOW_SPECTRUM, 15); taskbar2 = sampleStops(RAINBOW_SPECTRUM, 50); taskbar3 = sampleStops(RAINBOW_SPECTRUM, 85);
        taskbarBorder = lightenHex(sampleStops(RAINBOW_SPECTRUM, 50), 0.3);
        item1 = sampleStops(RAINBOW_SPECTRUM, 25); item2 = sampleStops(RAINBOW_SPECTRUM, 45); itemBorder = darkenHex(item2, 0.3);
        itemActive1 = sampleStops(RAINBOW_SPECTRUM, 45); itemActive2 = sampleStops(RAINBOW_SPECTRUM, 65);
      } else {
        title = expandTitleStops(cp, dirAngle);
        taskbarAngle = dirAngle;
        taskbar1 = cp.taskbar1; taskbar2 = cp.taskbar2; taskbar3 = cp.taskbar3; taskbarBorder = cp.taskbarBorder;
        item1 = cp.item1; item2 = cp.item2; itemBorder = cp.itemBorder;
        itemActive1 = cp.itemActive1; itemActive2 = cp.itemActive2;
      }
      if(ct.startRainbow){
        start1 = sampleStops(RAINBOW_SPECTRUM, 10); start2 = sampleStops(RAINBOW_SPECTRUM, 50); start3 = sampleStops(RAINBOW_SPECTRUM, 90); startBorder = darkenHex(start2, 0.35);
      } else {
        start1 = cp.start1; start2 = cp.start2; start3 = cp.start3; startBorder = cp.startBorder;
      }
      if(ct.clockRainbow){
        clock1 = sampleStops(RAINBOW_SPECTRUM, 30); clock2 = sampleStops(RAINBOW_SPECTRUM, 70); clockBorder = darkenHex(clock2, 0.3);
      } else {
        clock1 = cp.clock1; clock2 = cp.clock2; clockBorder = cp.clockBorder;
      }
      calDays = cp.calDays; fontColor = cp.fontColor;
    } else {
      var dirAngle2 = (state.theme && state.theme.gradientDirection === 'horizontal') ? '90deg' : '180deg';
      title = expandTitleStops(p, dirAngle2);
      taskbarAngle = dirAngle2;
      taskbar1 = p.taskbar1; taskbar2 = p.taskbar2; taskbar3 = p.taskbar3; taskbarBorder = p.taskbarBorder;
      item1 = p.item1; item2 = p.item2; itemBorder = p.itemBorder;
      itemActive1 = p.itemActive1; itemActive2 = p.itemActive2;
      clock1 = p.clock1; clock2 = p.clock2; clockBorder = p.clockBorder;
      start1 = p.start1; start2 = p.start2; start3 = p.start3; startBorder = p.startBorder;
      calDays = p.start2; // a flat approximation of the old Start-button-matching gradient
      fontColor = readableTextColor(p.title2);
    }

    root.setProperty('--th-title-1', title.t1);
    root.setProperty('--th-title-2', title.t2);
    root.setProperty('--th-title-3', title.t3);
    root.setProperty('--th-title-4', title.t4);
    root.setProperty('--th-title-5', title.t5);
    root.setProperty('--th-title-6', title.t6);
    root.setProperty('--th-title-7', title.t7);
    root.setProperty('--th-title-angle', title.angle);
    root.setProperty('--th-taskbar-angle', taskbarAngle);
    root.setProperty('--th-taskbar-1', taskbar1);
    root.setProperty('--th-taskbar-2', taskbar2);
    root.setProperty('--th-taskbar-3', taskbar3);
    root.setProperty('--th-taskbar-border', taskbarBorder);
    root.setProperty('--th-item-1', item1);
    root.setProperty('--th-item-2', item2);
    root.setProperty('--th-item-border', itemBorder);
    root.setProperty('--th-item-active-1', itemActive1);
    root.setProperty('--th-item-active-2', itemActive2);
    root.setProperty('--th-clock-1', clock1);
    root.setProperty('--th-clock-2', clock2);
    root.setProperty('--th-clock-border', clockBorder);
    root.setProperty('--th-start-1', start1);
    root.setProperty('--th-start-2', start2);
    root.setProperty('--th-start-3', start3);
    root.setProperty('--th-start-border', startBorder);
    var buttonBase = isRainbow ? '#b007ab' : (isCustom ? (state.theme.buttonColor||state.theme.startColor||'#9cc6f0') : start2);
    var button1 = lightenHex(buttonBase,.35), button2 = buttonBase, button3 = darkenHex(buttonBase,.15), buttonBorder = darkenHex(buttonBase,.35);
    root.setProperty('--th-button-1', button1);
    root.setProperty('--th-button-2', button2);
    root.setProperty('--th-button-3', button3);
    root.setProperty('--th-button-border', buttonBorder);
    root.setProperty('--th-button-text', readableTextColor(button2));
    var rainbowButtons = isCustom && state.theme && state.theme.buttonRainbow;
    var rainbowStart = isCustom && state.theme && state.theme.startRainbow;
    var classicButtons = preset === 'classic' && !isCustom;
    var presetButtonBg = 'linear-gradient(180deg,'+button1+','+button2+' 55%,'+button3+')';
    var presetButtonActiveBg = 'linear-gradient(180deg,'+button3+','+button2+')';
    root.setProperty('--th-button-bg', rainbowButtons ? 'linear-gradient(180deg,#ff4d4d,#ff9d3d,#ffe13d,#3ddc84,#3b82f6,#a855f7)' : (classicButtons ? 'linear-gradient(180deg,#fefefe,#e5f0fb 45%,#bcd8f6 55%,#9cc6f0)' : presetButtonBg));
    root.setProperty('--th-button-active-bg', rainbowButtons ? 'linear-gradient(180deg,#d93b3b,#d9822f,#d9bd2f,#2fb86b,#306bd0,#8744c5)' : (classicButtons ? 'linear-gradient(180deg,#9cc6f0,#bcd8f6)' : presetButtonActiveBg));
    if(classicButtons){root.setProperty('--th-button-border','#003c9c');root.setProperty('--th-button-text','#12336b');}
    root.setProperty('--th-start-bg', rainbowStart ? 'linear-gradient(90deg,#ff4d4d,#ff9d3d,#ffe13d,#3ddc84,#3b82f6,#a855f7)' : 'linear-gradient(180deg,'+start1+','+start2+' 55%,'+start3+')');
    root.setProperty('--th-start-text', rainbowStart ? '#ffffff' : readableTextColor(start2));
    root.setProperty('--th-cal-days', calDays);
    root.setProperty('--th-font-color', fontColor);
    var calPopup = document.getElementById('calendar-popup');
    if(calPopup && calPopup.classList.contains('open')) renderCalendarPopup();
  }

  // Gives non-button controls the same click, Enter, and Space behavior.
  function bindAccessibleAction(element, action){
    element.addEventListener('click', action);
    element.addEventListener('keydown', function(e){
      if(e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      action(e);
    });
  }

  // Desktop icons can be rearranged with mouse, pen, or touch. A short tap still
  // opens the icon; only a real drag suppresses its click action.
  function initializeDesktopIconDragging(){
    var icons=Array.prototype.slice.call(document.querySelectorAll('.desktop-icon'));
    function boundsFor(icon,x,y){
      var maxX=Math.max(0,window.innerWidth-icon.offsetWidth);
      var maxY=Math.max(0,window.innerHeight-TASKBAR_H-icon.offsetHeight);
      return {x:Math.max(0,Math.min(x,maxX)),y:Math.max(0,Math.min(y,maxY))};
    }
    function place(icon,x,y){
      var p=boundsFor(icon,x,y);
      icon.style.left=Math.round(p.x)+'px';
      icon.style.top=Math.round(p.y)+'px';
      icon.style.right='auto';
      icon.style.bottom='auto';
      return p;
    }
    function overlapsBuddyList(icon){
      if(icon.id!=='desktop-companion')return false;
      var buddy=document.getElementById('buddylist-win');
      if(!buddy||buddy.style.display==='none')return false;
      var a=icon.getBoundingClientRect(),b=buddy.getBoundingClientRect();
      return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    }
    icons.forEach(function(icon){
      var saved=state.desktopIconPositions[icon.id];
      if(saved&&Number.isFinite(Number(saved.x))&&Number.isFinite(Number(saved.y))) place(icon,Number(saved.x),Number(saved.y));
      if(icon.id==='desktop-companion'&&saved&&saved.overBuddyList)icon.classList.add('over-buddy-list');
      var drag=null,suppressClickUntil=0;
      icon.addEventListener('dragstart',function(e){e.preventDefault();});
      function moveDrag(e){
        if(!drag||e.pointerId!==drag.pointerId)return;
        var dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
        if(!drag.moved&&Math.hypot(dx,dy)<5)return;
        drag.moved=true;
        e.preventDefault();
        icon.classList.add('dragging');
        place(icon,drag.left+dx,drag.top+dy);
      }
      function stopTracking(){
        document.removeEventListener('pointermove',moveDrag);
        document.removeEventListener('pointerup',finishDrag);
        document.removeEventListener('pointercancel',finishDrag);
      }
      function finishDrag(e){
        if(!drag||(e.pointerId!==undefined&&e.pointerId!==drag.pointerId))return;
        var moved=drag.moved;
        drag=null;
        stopTracking();
        icon.classList.remove('dragging');
        if(!moved)return;
        suppressClickUntil=Date.now()+450;
        var perched=overlapsBuddyList(icon);
        if(icon.id==='desktop-companion')icon.classList.toggle('over-buddy-list',perched);
        state.desktopIconPositions[icon.id]={x:icon.offsetLeft,y:icon.offsetTop,overBuddyList:perched};
        saveState();
      }
      icon.addEventListener('pointerdown',function(e){
        if(e.button!==undefined&&e.button!==0)return;
        if(icon.id==='desktop-companion'&&window.isKobaExclusiveMotionActive&&window.isKobaExclusiveMotionActive()){
          e.preventDefault();
          return;
        }
        if(icon.id==='desktop-companion'){
          if(window.endKobaPlayBallPose)window.endKobaPlayBallPose();
          if(window.cancelKobaTransientMotion)window.cancelKobaTransientMotion();
          else if(window.stopKobaRoaming)window.stopKobaRoaming();
          icon.classList.remove('sleeping','waking','digging','burying','interacting','actions-open','happy','treat','bone','feed','roaming-go-sleep');
        }
        stopTracking();
        var rect=icon.getBoundingClientRect();
        drag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,left:rect.left,top:rect.top,moved:false};
        if(icon.setPointerCapture)try{icon.setPointerCapture(e.pointerId);}catch(_){ }
        document.addEventListener('pointermove',moveDrag,{passive:false});
        document.addEventListener('pointerup',finishDrag);
        document.addEventListener('pointercancel',finishDrag);
      });
      icon.addEventListener('click',function(e){if(Date.now()>=suppressClickUntil)return;e.preventDefault();e.stopImmediatePropagation();},true);
    });
    window.addEventListener('resize',function(){
      icons.forEach(function(icon){
        var saved=state.desktopIconPositions[icon.id];
        if(!saved)return;
        var p=place(icon,Number(saved.x)||0,Number(saved.y)||0);
        saved.x=p.x;saved.y=p.y;
      });
    });
  }

  document.getElementById('tb-start').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.toggle('open');
  });
  document.addEventListener('click', function(e){
    var menu = document.getElementById('start-menu');
    if(menu.classList.contains('open') && !menu.contains(e.target) && !e.target.closest('#tb-start')){
      menu.classList.remove('open');
    }
  });

  document.getElementById('sm-stickynote').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    createStickyNote();
  });
  document.getElementById('sm-display').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    openEditDisplayWindow();
  });
  document.getElementById('sm-paint').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    openPaintWindow();
  });
  document.getElementById('sm-arinet').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    openAriNetWindow();
  });
  document.getElementById('sm-txtmail').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    openDtdPostWindow();
  });
  bindAccessibleAction(document.getElementById('dtd-mailbox-icon'), function(e){
    e.stopPropagation();
    openDtdPostWindow();
  });
  bindAccessibleAction(document.getElementById('trash-desktop-icon'), function(e){e.stopPropagation();openTrashWindow();});
  bindAccessibleAction(document.getElementById('arinet-desktop-icon'), function(e){e.stopPropagation();openAriNetWindow();});
  document.getElementById('sm-showdesktop').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    showDesktop();
  });
  document.getElementById('sm-scrapbook').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    openScrapbookWindow();
  });
  document.getElementById('sm-sudoku').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    openSudokuWindow();
  });
  document.getElementById('sm-signoff').addEventListener('click', function(e){
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    signOff();
  });

  function openEditDisplayWindow(){
    var existing=openWindows.find(function(w){return w.type==='editdisplay';});
    if(existing){focusWindow(existing.id);return;}
    var original={background:JSON.parse(JSON.stringify(state.background||{})),theme:JSON.parse(JSON.stringify(state.theme||{})),presets:JSON.parse(JSON.stringify(state.customThemePresets||[]))};
    var finished=false;
    var BG_COLORS=['#3a6ea5','#1a3a5c','#2d7dd2','#0d3aa8','#5c3d99','#8e24aa','#ff1493','#e57373','#f06292','#e91e63','#ff7043','#f4a261','#fdd835','#aed581','#43a047','#1b5e20','#00838f','#00acc1','#ffffff','#e0e0e0','#9e9e9e','#616161','#333333','#000000'];
    var BG_GRADIENTS=[['#ff9a56','#ff6363'],['#2193b0','#6dd5ed'],['#654ea3','#eaafc8'],['#134e5e','#71b280'],['#0f2027','#2c5364'],['#ff9a9e','#a18cd1']];
    var DAYS=['S','M','T','W','T','F','S'];
    var bg=state.background||{};
    var t=state.theme||{};
    var tcols=(t.customColors&&t.customColors.length?t.customColors:['#3d95ff']).slice();
    while(tcols.length<3)tcols.push(tcols.length===1?'#0058e6':'#1a63d8');
    var cal=(t.calDaysColors&&t.calDaysColors.length===7?t.calDaysColors:['#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a']).slice();
    var swatches=BG_COLORS.map(function(c){return '<button class="display-swatch" data-bg-color="'+c+'" title="'+c+'" style="background:'+c+'"></button>';}).join('');
    var gradients=BG_GRADIENTS.map(function(g){return '<button class="display-swatch" data-bg-from="'+g[0]+'" data-bg-to="'+g[1]+'" title="Gradient" style="width:48px;background:linear-gradient(135deg,'+g[0]+','+g[1]+')"></button>';}).join('');
    var dayColors=DAYS.map(function(d,i){return '<label>'+d+'<input class="display-day-color" data-day="'+i+'" type="color" value="'+cal[i]+'"></label>';}).join('');
    var body='<div class="win-body"><div class="display-shell">'+
      '<div class="display-tabs"><button class="display-tab active" data-display-tab="desktop">Background<small>Wallpaper &amp; colors</small></button><button class="display-tab" data-display-tab="theme">Windows &amp; taskbar<small>Theme &amp; interface</small></button></div>'+
      '<div class="display-main">'+
      '<div class="display-panels">'+
        '<div class="display-panel active" data-display-panel="desktop"><div class="display-grid">'+
          '<div class="display-card wide"><div class="display-card-title">Choose a background</div><div class="display-card-help">Start with a color, blend two colors, or use one of your photos.</div><div class="display-mode-picker"><button class="btn display-bg-mode" data-mode="solid">Solid color</button><button class="btn display-bg-mode" data-mode="gradient">Gradient</button><button class="btn display-bg-mode" data-mode="photo">Photo</button></div></div>'+
          '<div class="display-card wide display-bg-settings" data-bg-settings="solid" id="display-solid-card"><div class="display-card-title">Pick a color</div><div class="display-swatches">'+swatches+'<input class="display-color" id="display-bg-custom" type="color" value="'+(bg.color||'#3a6ea5')+'" title="Custom background color"></div></div>'+
          '<div class="display-card wide display-bg-settings" data-bg-settings="gradient" id="display-gradient-card"><div class="display-card-title">Build a gradient</div><div class="display-swatches" style="margin-bottom:7px">'+gradients+'</div><div class="display-row"><label>First color</label><input class="display-color" id="display-grad-from" type="color" value="'+(bg.gradientFrom||'#ff9a56')+'"></div><div class="display-row"><label>Second color</label><input class="display-color" id="display-grad-to" type="color" value="'+(bg.gradientTo||'#ff6363')+'"></div><div class="display-row"><label>Direction</label><select id="display-bg-direction"><option value="135deg">Diagonal</option><option value="180deg">Vertical</option><option value="90deg">Horizontal</option></select></div></div>'+
          '<div class="display-card wide display-bg-settings" data-bg-settings="photo"><div class="display-card-title">Use a photo</div><div class="display-card-help">Photos are resized for DesktopDiary and stay with this device.</div><div class="display-row"><button class="btn" id="display-photo-upload">Choose Photo…</button><button class="btn" id="display-photo-clear">Remove</button><span id="display-photo-status" style="color:#777">'+(bg.image?'Photo selected':'No photo selected')+'</span></div></div>'+
        '</div></div>'+
        '<div class="display-panel" data-display-panel="theme">'+
          '<div class="display-card wide"><div class="display-card-title">Start with a theme</div><div class="display-card-help">Choose a preset, then personalize any detail below.</div><div class="display-swatches" id="display-theme-presets"></div></div>'+
          '<details class="display-disclosure" open><summary>Window colors</summary><div class="display-disclosure-body"><div class="display-mode-picker" style="grid-template-columns:1fr 1fr;margin-bottom:7px"><button class="btn display-color-mode" data-color-mode="solid">Solid</button><button class="btn display-color-mode" data-color-mode="gradient">Gradient</button></div><div class="display-row"><label>Primary color</label><input class="display-color display-theme-color" data-key="c1" type="color" value="'+tcols[0]+'"></div><div class="display-row display-gradient-option display-c2"><label>Secondary color</label><input class="display-color display-theme-color" data-key="c2" type="color" value="'+tcols[1]+'"></div><div class="display-row display-gradient-option display-direction"><label>Blend direction</label><select id="display-theme-direction"><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></div><label class="display-row"><span style="flex:1">Rainbow windows</span><input id="display-accent-rainbow" type="checkbox" '+(t.accentRainbow?'checked':'')+'></label></div></details>'+
          '<details class="display-disclosure"><summary>Buttons, clock &amp; text</summary><div class="display-disclosure-body"><div class="display-row"><label>Button color</label><input class="display-color display-theme-color" data-key="button" type="color" value="'+(t.buttonColor||'#9cc6f0')+'"></div><div class="display-row"><label>Start button</label><input class="display-color display-theme-color" data-key="start" type="color" value="'+(t.startColor||'#7ed957')+'"></div><div class="display-row"><label>Clock</label><input class="display-color display-theme-color" data-key="clock" type="color" value="'+(t.clockColor||'#1a4fc4')+'"></div><div class="display-row"><label>Text</label><input class="display-color display-theme-color" data-key="font" type="color" value="'+(t.fontColor||'#ffffff')+'"></div><label class="display-row"><span style="flex:1">Rainbow buttons</span><input id="display-button-rainbow" type="checkbox" '+(t.buttonRainbow?'checked':'')+'></label><label class="display-row"><span style="flex:1">Rainbow Start button</span><input id="display-start-rainbow" type="checkbox" '+(t.startRainbow?'checked':'')+'></label><label class="display-row"><span style="flex:1">Rainbow clock</span><input id="display-clock-rainbow" type="checkbox" '+(t.clockRainbow?'checked':'')+'></label></div></details>'+
          '<details class="display-disclosure"><summary>Calendar colors</summary><div class="display-disclosure-body"><div class="display-row"><label>All days</label><input class="display-color" id="display-all-days-color" type="color" value="'+cal[0]+'"></div><div class="display-day-colors">'+dayColors+'</div><button class="btn" id="display-calendar-rainbow" style="margin-top:7px">Make days rainbow</button></div></details>'+
          '<div style="display:flex;justify-content:flex-end;margin-top:7px"><button class="btn" id="display-save-preset">Save current theme…</button></div>'+
        '</div>'+
      '</div>'+
      '</div>'+
      '<div class="display-actions"><button class="btn" id="display-defaults">Restore Defaults</button><div class="display-actions-right"><button class="btn" id="display-cancel">Cancel</button><button class="btn display-primary" id="display-apply">Apply</button></div></div>'+
    '</div></div>';
    var created=createWindow({title:'Personalize',extraClass:'displayedit-win',bodyHtml:body,type:'editdisplay',onClose:function(){if(!finished){state.background=original.background;state.theme=original.theme;state.customThemePresets=original.presets;applyBackground();applyTheme();}},onMount:function(el,id){
      var vals={c1:tcols[0],c2:tcols[1],c3:tcols[2],button:t.buttonColor||'#9cc6f0',start:t.startColor||'#7ed957',clock:t.clockColor||'#1a4fc4',font:t.fontColor||'#ffffff'};
      function showTab(name){el.querySelectorAll('.display-tab').forEach(function(b){b.classList.toggle('active',b.dataset.displayTab===name);});el.querySelectorAll('.display-panel').forEach(function(p){p.classList.toggle('active',p.dataset.displayPanel===name);});}
      el.querySelectorAll('.display-tab').forEach(function(b){b.onclick=function(){showTab(b.dataset.displayTab);};});
      function setBgMode(mode){el.querySelectorAll('.display-bg-mode').forEach(function(b){b.classList.toggle('display-primary',b.dataset.mode===mode);});el.querySelectorAll('[data-bg-settings]').forEach(function(section){section.classList.toggle('active',section.dataset.bgSettings===mode);});}
      function solid(c){state.background={color:c,image:'',gradient:''};applyBackground();setBgMode('solid');el.querySelector('#display-photo-status').textContent='No photo selected';}
      function gradient(){var a=el.querySelector('#display-grad-from').value,b=el.querySelector('#display-grad-to').value,d=el.querySelector('#display-bg-direction').value;state.background={color:'',image:'',gradient:'linear-gradient('+d+','+a+','+b+')',gradientFrom:a,gradientTo:b,gradientDirection:d};applyBackground();setBgMode('gradient');el.querySelector('#display-photo-status').textContent='No photo selected';}
      el.querySelectorAll('[data-bg-color]').forEach(function(b){b.onclick=function(){el.querySelector('#display-bg-custom').value=b.dataset.bgColor;solid(b.dataset.bgColor);};});
      el.querySelector('#display-bg-custom').oninput=function(e){solid(e.target.value);};
      el.querySelectorAll('[data-bg-from]').forEach(function(b){b.onclick=function(){el.querySelector('#display-grad-from').value=b.dataset.bgFrom;el.querySelector('#display-grad-to').value=b.dataset.bgTo;gradient();};});
      ['#display-grad-from','#display-grad-to','#display-bg-direction'].forEach(function(s){el.querySelector(s).oninput=gradient;});
      el.querySelectorAll('.display-bg-mode').forEach(function(b){b.onclick=function(){if(b.dataset.mode==='solid')solid(el.querySelector('#display-bg-custom').value);if(b.dataset.mode==='gradient')gradient();if(b.dataset.mode==='photo'){if(state.background.image){applyBackground();setBgMode('photo');}else el.querySelector('#display-photo-upload').click();}};});
      el.querySelector('#display-photo-upload').onclick=function(){var input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=function(){var file=input.files&&input.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){var img=new Image();img.onload=function(){var max=1600,w=img.width,h=img.height;if(w>max||h>max){if(w>=h){h=Math.round(h*max/w);w=max;}else{w=Math.round(w*max/h);h=max;}}var c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);state.background={color:'',gradient:'',image:c.toDataURL('image/jpeg',.82)};applyBackground();setBgMode('photo');el.querySelector('#display-photo-status').textContent=file.name;};img.src=ev.target.result;};reader.readAsDataURL(file);};input.click();};
      el.querySelector('#display-photo-clear').onclick=function(){solid('#3a6ea5');};
      var themeColorMode=(t.customColors||[]).length>=2?'gradient':'solid';
      function customTheme(){var cols=themeColorMode==='gradient'?[vals.c1,vals.c2]:[vals.c1];state.theme={preset:'custom',customColors:cols,buttonColor:vals.button,startColor:vals.start,clockColor:vals.clock,calDaysColors:cal.slice(),fontColor:vals.font,accentRainbow:el.querySelector('#display-accent-rainbow').checked,buttonRainbow:el.querySelector('#display-button-rainbow').checked,startRainbow:el.querySelector('#display-start-rainbow').checked,clockRainbow:el.querySelector('#display-clock-rainbow').checked,gradientDirection:el.querySelector('#display-theme-direction').value};applyTheme();renderPresets();}
      function setThemeColorMode(mode,apply){themeColorMode=mode;el.querySelectorAll('.display-color-mode').forEach(function(b){b.classList.toggle('display-primary',b.dataset.colorMode===mode);});var enabled=mode==='gradient';el.querySelectorAll('.display-gradient-option').forEach(function(row){row.classList.toggle('disabled',!enabled);row.querySelectorAll('input,select').forEach(function(control){control.disabled=!enabled;});});if(apply){if(mode==='gradient'&&state.theme.preset!=='custom'&&state.theme.preset.indexOf('custom-')!==0)el.querySelector('#display-theme-direction').value='horizontal';el.querySelector('#display-accent-rainbow').checked=false;customTheme();}}
      el.querySelectorAll('.display-theme-color').forEach(function(i){i.oninput=function(){vals[i.dataset.key]=i.value;if(i.dataset.key==='c1'||i.dataset.key==='c2')el.querySelector('#display-accent-rainbow').checked=false;customTheme();};});
      el.querySelectorAll('.display-color-mode').forEach(function(b){b.onclick=function(){setThemeColorMode(b.dataset.colorMode,true);};});
      ['#display-theme-direction','#display-accent-rainbow','#display-button-rainbow','#display-start-rainbow','#display-clock-rainbow'].forEach(function(s){el.querySelector(s).onchange=customTheme;});
      el.querySelector('#display-theme-direction').value=t.gradientDirection||'horizontal';
      el.querySelector('#display-all-days-color').oninput=function(e){cal=[e.target.value,e.target.value,e.target.value,e.target.value,e.target.value,e.target.value,e.target.value];el.querySelectorAll('.display-day-color').forEach(function(i){i.value=e.target.value;});customTheme();};
      el.querySelectorAll('.display-day-color').forEach(function(i){i.oninput=function(){cal[+i.dataset.day]=i.value;if(cal.every(function(c){return c===cal[0];}))el.querySelector('#display-all-days-color').value=cal[0];customTheme();};});
      el.querySelector('#display-calendar-rainbow').onclick=function(){var currentPreset=state.theme.preset||'classic';if(currentPreset!=='custom'&&currentPreset.indexOf('custom-')!==0&&currentPreset!=='rainbow'){el.querySelector('#display-accent-rainbow').checked=false;el.querySelector('#display-button-rainbow').checked=false;el.querySelector('#display-start-rainbow').checked=false;el.querySelector('#display-clock-rainbow').checked=false;}cal=['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#5b2c9d','#9b59b6'];el.querySelectorAll('.display-day-color').forEach(function(i){i.value=cal[+i.dataset.day];});customTheme();};
      function presetSample(key){if(key==='classic')return CLASSIC_THEME.title2;if(key==='rainbow')return 'linear-gradient(135deg,#ff4d4d,#ff9d3d,#3ddc84,#3b82f6,#a855f7)';return THEME_PRESET_BASE[key];}
      function syncThemeControls(theme,presetKey){var colors=(theme.customColors||[]).slice();if(presetKey==='classic')colors=['#0058e6'];else if(THEME_PRESET_BASE[presetKey])colors=[THEME_PRESET_BASE[presetKey]];if(!colors.length)colors=['#3d95ff'];vals.c1=colors[0];vals.c2=colors[1]||lightenHex(colors[0],.3);var palette=presetKey&&presetKey!=='rainbow'?resolveThemePalette({preset:presetKey}):null;vals.button=presetKey==='classic'?'#9cc6f0':(presetKey==='rainbow'?'#b007ab':(palette?palette.start2:(theme.buttonColor||'#9cc6f0')));vals.start=presetKey==='rainbow'?'#3a9d23':(palette?palette.start2:(theme.startColor||'#7ed957'));el.querySelector('[data-key="c1"]').value=vals.c1;el.querySelector('[data-key="c2"]').value=vals.c2;el.querySelector('[data-key="button"]').value=vals.button;el.querySelector('[data-key="start"]').value=vals.start;el.querySelector('#display-theme-direction').value=theme.gradientDirection||'horizontal';el.querySelector('#display-accent-rainbow').checked=presetKey==='rainbow'||(!presetKey&&!!theme.accentRainbow);el.querySelector('#display-button-rainbow').checked=!presetKey&&!!theme.buttonRainbow;el.querySelector('#display-start-rainbow').checked=!presetKey&&!!theme.startRainbow;el.querySelector('#display-clock-rainbow').checked=presetKey==='rainbow'||(!presetKey&&!!theme.clockRainbow);setThemeColorMode(colors.length>1?'gradient':'solid',false);}
      function renderPresets(){var box=el.querySelector('#display-theme-presets');var built=Object.keys(THEME_PRESET_LABELS).map(function(key){return '<div class="display-preset-wrap"><button class="display-theme-preset'+(state.theme.preset===key?' active':'')+'" data-built-preset="'+key+'" title="'+escapeHtml(THEME_PRESET_LABELS[key])+'" style="background:'+presetSample(key)+'"></button><span class="display-theme-name">'+escapeHtml(THEME_PRESET_LABELS[key])+'</span></div>';}).join('');var custom=(state.customThemePresets||[]).map(function(p){var cs=p.theme.customColors||['#3d95ff'];var sample=cs.length>1?'linear-gradient(135deg,'+cs.join(',')+')':cs[0];return '<div class="display-preset-wrap"><button class="display-theme-preset'+(state.theme.preset==='custom-'+p.id?' active':'')+'" data-custom-preset="'+p.id+'" title="'+escapeHtml(p.name)+'" style="background:'+sample+'"></button><button class="display-preset-delete" data-delete-preset="'+p.id+'" title="Delete">×</button><span class="display-theme-name">'+escapeHtml(p.name)+'</span></div>';}).join('');box.innerHTML=built+custom;box.querySelectorAll('[data-built-preset]').forEach(function(b){b.onclick=function(){var key=b.dataset.builtPreset;state.theme=Object.assign({},state.theme,{preset:key,gradientDirection:'vertical',accentRainbow:key==='rainbow',buttonColor:key==='rainbow'?'#b007ab':state.theme.buttonColor,startColor:key==='rainbow'?'#3a9d23':state.theme.startColor,buttonRainbow:false,startRainbow:false,clockRainbow:key==='rainbow'});syncThemeControls(state.theme,key);applyTheme();renderPresets();};});box.querySelectorAll('[data-custom-preset]').forEach(function(b){b.onclick=function(){var p=(state.customThemePresets||[]).find(function(x){return x.id===b.dataset.customPreset;});if(p){state.theme=Object.assign({},JSON.parse(JSON.stringify(p.theme)),{preset:'custom-'+p.id});syncThemeControls(state.theme);applyTheme();renderPresets();}};});box.querySelectorAll('[data-delete-preset]').forEach(function(b){b.onclick=function(){state.customThemePresets=(state.customThemePresets||[]).filter(function(p){return p.id!==b.dataset.deletePreset;});renderPresets();};});}
      el.querySelector('#display-save-preset').onclick=function(){appTextPrompt('Name this display theme:','',function(name){if(!name||!name.trim())return;var savedTheme=JSON.parse(JSON.stringify(state.theme));delete savedTheme.preset;state.customThemePresets=state.customThemePresets||[];state.customThemePresets.push({id:uid(),name:name.trim(),theme:savedTheme});renderPresets();});};
      el.querySelector('#display-defaults').onclick=function(){state.background={color:'',image:'',gradient:''};state.theme={preset:'classic',customColors:['#3d95ff'],buttonColor:'#9cc6f0',startColor:'#7ed957',buttonRainbow:false,startRainbow:false,clockColor:'#1a4fc4',clockRainbow:false,calDaysColors:['#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a'],fontColor:'#ffffff',gradientDirection:'vertical'};syncThemeControls(state.theme,'classic');applyBackground();applyTheme();renderPresets();setBgMode('photo');el.querySelector('#display-photo-status').textContent='Built-in wallpaper';};
      el.querySelector('#display-cancel').onclick=function(){state.background=original.background;state.theme=original.theme;state.customThemePresets=original.presets;applyBackground();applyTheme();finished=true;closeWindow(id);};
      el.querySelector('#display-apply').onclick=function(){finished=true;saveState();closeWindow(id);};
      if(t.preset&&t.preset!=='custom'&&t.preset.indexOf('custom-')!==0)syncThemeControls(t,t.preset);else setThemeColorMode(themeColorMode,false);renderPresets();setBgMode(bg.image?'photo':(bg.gradient?'gradient':'solid'));
    }});
  }

