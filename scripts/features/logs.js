  // ================= LOGS WINDOW (Status Log + Mood Log combined, tabbed) =================
  function openLogsWindow(initialTab){
    var body =
      '<div class="win-body" id="logs-body-wrap" style="padding:0;">' +
        '<div class="logs-tabs" style="display:flex;gap:4px;padding:6px 8px;border-bottom:1px solid #ccc;">' +
          '<button class="btn logs-tab-btn" data-tab="status" style="flex:1;">Status Log</button>' +
          '<button class="btn logs-tab-btn" data-tab="mood" style="flex:1;">Mood Log</button>' +
        '</div>' +
        '<div id="logs-content"></div>' +
      '</div>';
    createWindow({
      title: 'Log',
      extraClass: 'help-win',
      bodyHtml: body,
      type: 'logs',
      onMount: function(el, id){
        var contentEl = el.querySelector('#logs-content');
        var tabBtns = el.querySelectorAll('.logs-tab-btn');
        function wireStatusActions(){
          contentEl.querySelectorAll('.sl-del').forEach(function(btn){
            btn.onclick = function(){
              var row = btn.closest('.status-log-row');
              var slid = row && row.getAttribute('data-slid');
              if(!slid) return;
              appConfirm('Delete this status entry?', function(ok){
                if(!ok) return;
                var entry = state.statusLog.find(function(e){ return e.id === slid; });
                if(entry && entry.moodLogId){
                  state.moodLog = state.moodLog.filter(function(m){ return m.id !== entry.moodLogId; });
                }
                state.statusLog = state.statusLog.filter(function(e){ return e.id !== slid; });
                saveState();
                contentEl.innerHTML = renderStatusLogBody();
                wireStatusActions();
              });
            };
          });
          contentEl.querySelectorAll('.sl-edit').forEach(function(btn){
            btn.onclick = function(){
              var row = btn.closest('.status-log-row');
              var slid = row && row.getAttribute('data-slid');
              var entry = state.statusLog.find(function(e){ return e.id === slid; });
              if(!entry) return;
              openEditStatusEntryWindow(entry, function(){
                contentEl.innerHTML = renderStatusLogBody();
                wireStatusActions();
              });
            };
          });
        }
        function wireMoodActions(){
          contentEl.querySelectorAll('.mood-dot[data-mood-id]').forEach(function(dot){
            dot.onclick = function(){
              var mid = dot.getAttribute('data-mood-id');
              if(!mid) return;
              appConfirm('Delete this mood entry?', function(ok){
                if(!ok) return;
                state.moodLog = (state.moodLog || []).filter(function(m){ return m.id !== mid; });
                saveState();
                contentEl.innerHTML = renderMoodLogBody();
                wireMoodActions();
              });
            };
          });
        }
        function showTab(tab){
          tabBtns.forEach(function(b){
            var active = b.getAttribute('data-tab') === tab;
            b.style.background = active ? '#316ac5' : '';
            b.style.color = active ? '#fff' : '';
          });
          if(tab === 'mood'){
            contentEl.innerHTML = renderMoodLogBody();
            wireMoodActions();
          } else {
            contentEl.innerHTML = renderStatusLogBody();
            wireStatusActions();
          }
        }
        tabBtns.forEach(function(b){
          b.addEventListener('click', function(){ showTab(b.getAttribute('data-tab')); });
        });
        showTab(initialTab || 'status');
      }
    });
  }

  function openEditStatusEntryWindow(entry, onSave, initialHtml){
    var isNewEntry = !entry;
    entry = entry || { id: uid(), label: '', html: '', ts: Date.now(), author: state.account.screenName };
    if(isNewEntry && initialHtml) entry.html = initialHtml;
    var composeId = 'sl-edit-compose-' + uid();
    var body =
      '<div class="win-body nm-body">' +
        '<div class="nm-row"><label>Status:</label><input type="text" id="sl-edit-label" value="'+escapeHtml(entry.label||'')+'"></div>' +
        richComposeHtml(composeId, 'Tell me more... (toolbar above: bold/italic/underline, fonts, text color & highlight)') +
        '<div class="nm-send-row"><button class="btn" id="sl-edit-save">Save</button></div>' +
        '<div class="draft-links"><span class="draft-save-link">Save Draft</span> &nbsp;|&nbsp; <span class="draft-view-link">Drafts</span></div>' +
      '</div>';
    createWindow({
      title: isNewEntry ? 'New Status Entry' : 'Edit Status',
      extraClass: 'status-win',
      bodyHtml: body,
      type: 'editstatus',
      onMount: function(el, id){
        wireRichToolbar(el, composeId);
        var compose = el.querySelector('#'+composeId);
        if(entry.html) compose.innerHTML = entry.html;
        el.querySelector('#sl-edit-save').addEventListener('click', function(){
          entry.label = el.querySelector('#sl-edit-label').value.trim();
          entry.html = isRichEmpty(compose) ? '' : sanitizeHTML(compose.innerHTML);
          if(isNewEntry){
            state.statusLog = state.statusLog || [];
            state.statusLog.push(entry);
            isNewEntry = false;
          }
          saveState();
          refreshMyStatus();
          if(onSave) onSave();
          closeWindow(id);
        });
        el.querySelector('.draft-save-link').addEventListener('click', function(){
          if(isRichEmpty(compose)){ openInfoWindow('Nothing to save \u2014 the compose box is empty.'); return; }
          saveDraftFor('__status__', sanitizeHTML(compose.innerHTML));
          openInfoWindow('Draft saved.');
        });
        el.querySelector('.draft-view-link').addEventListener('click', function(){
          openDraftsListWindowFor('__status__', 'Status', function(html){
            compose.innerHTML = html;
            compose.focus();
          });
        });
      }
    });
  }

  function openManageMoodsWindow(){
    function buildBody(){
      var allMoods = Object.keys(MOOD_COLORS).concat(state.customMoods || []);
      var rows = allMoods.map(function(m){
        var isBuiltin = !!MOOD_COLORS[m];
        var color = moodColor(m);
        return '<div class="mood-manage-row" data-mood="'+escapeHtml(m)+'">' +
          '<input type="color" class="mm-color" value="'+color+'" title="Color for '+escapeHtml(m)+'">' +
          '<span class="mm-name">'+escapeHtml(m)+'</span>' +
          (!isBuiltin ? '<button class="mm-del" title="Delete">&times;</button>' : '<span style="width:20px;"></span>') +
        '</div>';
      }).join('');
      return '<div class="win-body nm-body" style="overflow-y:auto;">' + rows +
        '<div style="font-size:10px;color:#888;margin-top:8px;">Color changes apply to all moods including built-in ones.</div>' +
        '</div>';
    }
    createWindow({
      title: 'Manage Moods',
      extraClass: 'addbuddy-win',
      bodyHtml: buildBody(),
      type: 'managemoods',
      onMount: function(el, id){
        el.querySelectorAll('.mm-color').forEach(function(inp){
          inp.addEventListener('input', function(){
            var mood = inp.closest('.mood-manage-row').getAttribute('data-mood');
            state.customMoodColors[mood] = inp.value;
            saveState();
          });
        });
        el.querySelectorAll('.mm-del').forEach(function(btn){
          btn.addEventListener('click', function(){
            var mood = btn.closest('.mood-manage-row').getAttribute('data-mood');
            state.customMoods = state.customMoods.filter(function(m){ return m !== mood; });
            delete state.customMoodColors[mood];
            saveState();
            btn.closest('.mood-manage-row').remove();
          });
        });
      }
    });
  }

