  // ================= STATUS WINDOWS =================
  // ---- mood colors must be declared before openSetStatusWindow which references them ----
  var MOOD_COLORS = {
    Happy: '#f4c542', Sad: '#4a6fa5', Tired: '#8a8a8a', Excited: '#ff7f2a',
    Anxious: '#a259c4', Angry: '#e0472e', Calm: '#4caf82', Stressed: '#c2185b'
  };
  function moodColor(mood){
    if(state.customMoodColors && state.customMoodColors[mood]) return state.customMoodColors[mood];
    return MOOD_COLORS[mood] || '#5a8fd6';
  }

  function openSetStatusWindow(){
    var buddyOptions = state.buddies.map(function(b){ return '<option value="'+escapeHtml(b.id)+'">'+escapeHtml(b.name)+'</option>'; }).join('');

    function allMoodNames(){
      return ['Happy','Sad','Tired','Excited','Anxious','Angry','Calm','Stressed'].concat(state.customMoods||[]);
    }
    function buildPresetOptions(){
      return '<option value="">— pick a preset —</option>' +
        allMoodNames().map(function(m){ return '<option value="'+escapeHtml(m)+'">'+escapeHtml(m)+'</option>'; }).join('') +
        '<option value="__manage__">⚙ Manage Moods</option>';
    }

    var body =
      '<div class="win-body nm-body">' +
        '<div class="nm-row"><label>Status:</label><input type="text" id="status-label" placeholder="e.g. Feeling good" value="'+(state.status&&state.status.label?escapeHtml(state.status.label):'')+'"></div>' +
        '<div class="nm-row" style="align-items:center;gap:6px;">' +
          '<label>Mood:</label>' +
          '<span id="mood-indicator" class="mood-dot" style="background:#ddd;flex-shrink:0;"></span>' +
          '<input type="text" id="mood-text" placeholder="Type a mood..." style="flex:1;min-width:0;">' +
          '<input type="color" id="mood-color" value="#5a8fd6" title="Mood color" style="width:32px;height:28px;border:1px solid #aaa;border-radius:4px;padding:0;cursor:pointer;flex-shrink:0;">' +
        '</div>' +
        '<div class="nm-row"><label></label><select id="mood-preset" style="flex:1;font-size:11px;">'+buildPresetOptions()+'</select></div>' +
        '<div class="nm-row"><label>Buddy:</label><select id="status-buddy-select"><option value="">— None —</option>'+buddyOptions+'<option value="__new__">+ New Buddy</option></select></div>' +
        '<div class="nm-row" id="status-newbuddy-row" style="display:none;"><label>New:</label><input type="text" id="status-buddy-new" placeholder="Name"></div>' +
        '<div class="nm-send-row" style="gap:6px;margin-top:10px;">' +
          '<button class="btn" id="status-clear">Clear Status</button>' +
          '<button class="btn" id="status-save">Set Status</button>' +
        '</div>' +
      '</div>';

    createWindow({
      title: 'Set Status',
      extraClass: 'status-win',
      bodyHtml: body,
      type: 'setstatus',
      onMount: function(el, id){
        var labelInput = el.querySelector('#status-label');
        var moodText = el.querySelector('#mood-text');
        var moodColorInput = el.querySelector('#mood-color');
        var moodIndicator = el.querySelector('#mood-indicator');
        var moodPreset = el.querySelector('#mood-preset');
        var buddySelect = el.querySelector('#status-buddy-select');
        var newRow = el.querySelector('#status-newbuddy-row');
        var newInput = el.querySelector('#status-buddy-new');

        function updateIndicator(mood, color){
          var c = color || (mood ? moodColor(mood) : '#ddd');
          moodIndicator.style.background = c;
        }

        // pre-fill current mood
        if(state.status && state.status.mood){
          moodText.value = state.status.mood;
          var savedColor = (state.customMoodColors && state.customMoodColors[state.status.mood]) || MOOD_COLORS[state.status.mood] || '#5a8fd6';
          moodColorInput.value = savedColor;
          updateIndicator(state.status.mood, savedColor);
        }
        labelInput.focus();

        // live color preview as user types mood name or changes color
        moodText.addEventListener('input', function(){
          var m = moodText.value.trim();
          var c = (state.customMoodColors&&state.customMoodColors[m]) || MOOD_COLORS[m] || moodColorInput.value;
          moodColorInput.value = c;
          updateIndicator(m, c);
        });
        moodColorInput.addEventListener('input', function(){
          updateIndicator(moodText.value.trim(), moodColorInput.value);
        });

        // preset picker — fills the text field and sets color, no logging yet
        moodPreset.addEventListener('change', function(){
          var val = moodPreset.value;
          if(val === '__manage__'){
            moodPreset.value = '';
            openManageMoodsWindow();
            return;
          }
          if(val){
            moodText.value = val;
            var c = (state.customMoodColors&&state.customMoodColors[val]) || MOOD_COLORS[val] || '#5a8fd6';
            moodColorInput.value = c;
            updateIndicator(val, c);
            if(!labelInput.value.trim()) labelInput.value = val;
          }
          moodPreset.value = ''; // reset so same item can be re-picked
        });

        buddySelect.addEventListener('change', function(){
          newRow.style.display = (buddySelect.value === '__new__') ? 'flex' : 'none';
        });

        function applyStatus(label, closeAfter){
          var currentMood = moodText.value.trim();
          var currentColor = moodColorInput.value;
          var previousMood = (state.status && state.status.mood) || '';
          // save custom mood color if it's a new mood or color changed
          if(currentMood){
            if(!state.customMoods.includes(currentMood) && !MOOD_COLORS[currentMood]){
              state.customMoods.push(currentMood);
            }
            state.customMoodColors[currentMood] = currentColor;
          }
          state.status = { label: label, html: '', ts: Date.now(), mood: currentMood };
          var newMoodLogId = null;
          // only add a Mood Log entry when the mood actually changed from what it was before —
          // re-saving a status with the same mood (e.g. just editing the label) shouldn't log again
          if(currentMood && currentMood !== previousMood){
            newMoodLogId = uid();
            state.moodLog.push({ id: newMoodLogId, mood: currentMood, ts: Date.now(), author: state.account.screenName });
          }
          if(label || currentMood){
            state.statusLog.push({ id: uid(), label: label, html: '', ts: Date.now(), author: state.account.screenName, mood: currentMood, moodLogId: newMoodLogId });
          }
          var taggedBuddy = null;
          if(buddySelect.value === '__new__'){
            var newName = newInput.value.trim();
            if(newName) taggedBuddy = ensureBuddy(newName);
          } else if(buddySelect.value){
            taggedBuddy = state.buddies.find(function(b){ return b.id === buddySelect.value; });
          }
          if(taggedBuddy && label){
            state.entries[taggedBuddy.id] = state.entries[taggedBuddy.id] || [];
            state.entries[taggedBuddy.id].push({ id: uid(), html: label, ts: Date.now(), kind: 'entry', statusLabel: label, author: state.account.screenName });
            renderLog(taggedBuddy.id);
            renderStats(taggedBuddy.id);
          }
          saveState();
          syncDtdPublicProfile().catch(function(){});
          refreshMyStatus();
          renderBuddyList();
          var profileWindow=openWindows.find(function(w){return w.type==='viewprofile';});if(profileWindow&&profileWindow.el&&profileWindow.el._refreshProfile)profileWindow.el._refreshProfile();
          if(closeAfter) closeWindow(id);
        }

        el.querySelector('#status-save').addEventListener('click', function(){ applyStatus(labelInput.value.trim(), true); });
        labelInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') applyStatus(labelInput.value.trim(), true); });
        el.querySelector('#status-clear').addEventListener('click', function(){
          // clearing is not "setting a mood" — wipe the status directly without touching Mood Log/Status Log
          state.status = { label: '', html: '', ts: Date.now(), mood: '' };
          saveState();
          syncDtdPublicProfile().catch(function(){});
          refreshMyStatus();
          renderBuddyList();
          var profileWindow=openWindows.find(function(w){return w.type==='viewprofile';});if(profileWindow&&profileWindow.el&&profileWindow.el._refreshProfile)profileWindow.el._refreshProfile();
          labelInput.value = ''; moodText.value = ''; moodColorInput.value = '#5a8fd6';
          updateIndicator('', '#ddd'); moodPreset.value = '';
          buddySelect.value = ''; newRow.style.display = 'none';
          labelInput.focus();
        });
      }
    });
  }

  function renderStatusLogBody(){
    var log = state.statusLog.slice().reverse();
    if(!log.length) return '<div class="bl-empty">No status changes yet.</div>';
    return log.map(function(entry){
      var name = escapeHtml(entry.author || (state.account && state.account.screenName) || '');
      var moodDot = entry.mood ? '<span class="mood-dot" style="background:'+moodColor(entry.mood)+';margin-right:4px;vertical-align:middle;"></span>' : '';
      var moodLine = entry.mood ? '<div class="slr-text">' + moodDot + name + ' is <b>' + escapeHtml(entry.mood) + '</b></div>' : '';
      var statusText = entry.label ? '<div class="sl-status-label">' + escapeHtml(entry.label) + '</div>' : '';
      var richBody = (entry.html && entry.html !== entry.label) ? '<div class="sl-body">' + entry.html + '</div>' : '';
      var entryId = entry.id || '';
      return '<div class="status-log-row" data-slid="'+escapeHtml(entryId)+'">' +
        '<div class="slr-ts">' + fmtDayDivider(entry.ts) + ' &middot; ' + fmtTime(entry.ts) +
          (entryId ? '<span class="sl-actions"><span class="sl-edit">✎</span><span class="sl-del">✕</span></span>' : '') +
        '</div>' +
        moodLine +
        statusText +
        richBody +
      '</div>';
    }).join('');
  }

  function renderMoodLogBody(){
    var log = state.moodLog || [];
    if(!log.length) return '<div class="bl-empty">No moods logged yet. Pick one from Set Status to start tracking.</div>';

    // -- frequency counts --
    var counts = {};
    log.forEach(function(e){ counts[e.mood] = (counts[e.mood] || 0) + 1; });
    var sortedMoods = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; });
    var total = log.length;
    var topMood = sortedMoods[0];

    // -- donut chart via SVG --
    var cx = 54, cy = 54, r = 40, strokeW = 18;
    var circumference = 2 * Math.PI * r;
    var offset = 0;
    var donutSegments = sortedMoods.map(function(m){
      var pct = counts[m] / total;
      var dash = pct * circumference;
      var seg = '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+moodColor(m)+'" stroke-width="'+strokeW+'" stroke-dasharray="'+dash+' '+(circumference-dash)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 '+cx+' '+cy+')" style="transition:stroke-dasharray 0.6s;"><title>'+escapeHtml(m)+': '+Math.round(pct*100)+'%</title></circle>';
      offset += dash;
      return seg;
    }).join('');
    var donutSvg = '<svg width="108" height="108" viewBox="0 0 108 108">'+donutSegments+
      '<text x="54" y="50" text-anchor="middle" font-size="11" fill="#555">Top</text>'+
      '<text x="54" y="63" text-anchor="middle" font-size="12" font-weight="bold" fill="'+moodColor(topMood)+'">'+escapeHtml(topMood)+'</text>'+
    '</svg>';

    // -- bar chart --
    var maxCount = counts[sortedMoods[0]];
    var barsHtml = sortedMoods.map(function(m){
      var pct = Math.round((counts[m]/maxCount)*100);
      var emoji = {Happy:'😊',Sad:'😢',Tired:'😴',Excited:'🤩',Anxious:'😬',Angry:'😤',Calm:'😌',Stressed:'😰'}[m] || '●';
      return '<div class="mood-bar-row">' +
        '<span class="mood-bar-label" title="'+escapeHtml(m)+'">'+emoji+' '+escapeHtml(m)+'</span>' +
        '<span class="mood-bar-track"><span class="mood-bar-fill" style="width:'+pct+'%;background:'+moodColor(m)+';border-radius:4px;"></span></span>' +
        '<span class="mood-bar-count">'+counts[m]+'</span>' +
      '</div>';
    }).join('');

    // -- current streak --
    var streak = 0, streakMood = '', lastDate = '';
    log.slice().reverse().forEach(function(e){
      var d = fmtDayDivider(e.ts);
      if(!lastDate){ lastDate = d; streakMood = e.mood; streak = 1; }
      else if(e.mood === streakMood){ streak++; }
      else { return; }
    });
    var streakHtml = '<div class="mood-streak">🔥 Current streak: <b>'+streak+'</b> entries of <b style="color:'+moodColor(streakMood)+'">'+escapeHtml(streakMood)+'</b></div>';

    // -- recent 30 dots timeline (newest right) --
    var recent30 = log.slice(-30);
    var dotsHtml = recent30.map(function(e){
      return '<span class="mood-dot mood-dot-lg" data-mood-id="'+escapeHtml(e.id)+'" style="background:'+moodColor(e.mood)+';cursor:pointer;" title="'+escapeHtml(e.mood)+' · '+fmtDayDivider(e.ts)+' · tap to delete"></span>';
    }).join('');

    return '<div style="padding:10px;">' +
        '<div class="mood-section-title">Your Most Common Mood</div>' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">' +
          donutSvg +
          '<div class="mood-bars" style="flex:1;">' + barsHtml + '</div>' +
        '</div>' +
        streakHtml +
        '<div class="mood-section-title" style="margin-top:10px;">Recent Journey (last 30)</div>' +
        '<div class="mood-timeline" style="gap:4px;">' + dotsHtml + '</div>' +
        '<div style="font-size:10px;color:#aaa;margin-top:4px;">← older &nbsp; newer →</div>' +
      '</div>';
  }

