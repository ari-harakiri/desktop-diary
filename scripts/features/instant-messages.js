  function openIMWindow(buddyId){
    var existing = openWindows.find(function(w){ return w.type === 'im' && w.buddyId === buddyId; });
    if(existing){ focusWindow(existing.id); return; }
    var buddy = state.buddies.find(function(b){ return b.id === buddyId; });
    if(!buddy) return;

    var menu =
      '<div class="menubar">' +
        '<div class="m-item">File<div class="m-drop">' +
          '<div class="mi-search">Search&hellip;</div>' +
          '<div class="mi-export">Export</div>' +
          '<div class="mi-rename-list">Rename Buddy List</div>' +
          '<div class="mi-delete-list" style="color:#b3261e">Delete Buddy List</div>' +
          '<div class="mi-close">Close</div>' +
        '</div></div>' +
        '<div class="m-item">View<div class="m-drop">' +
          '<div class="mi-filter-photo">Photos</div>' +
          '<div class="mi-filter-voice">Voice Notes</div>' +
          '<div class="mi-filter-prompt">Writing Prompts</div>' +
        '</div></div>' +
        '<div class="m-item">Edit<div class="m-drop">' +
          '<div class="mi-clear">Clear Draft</div>' +
          '<div class="mi-editdraft">Drafts</div>' +
          '<div class="mi-ts">Timestamp (%t)</div>' +
          '<div class="mi-date">Date (%d)</div>' +
        '</div></div>' +
      '</div>';

    var inputId = 'input-'+buddyId;
    var body =
      '<div class="im-stats" id="stats-'+buddyId+'"></div>' +
      '<div class="im-log" id="log-'+buddyId+'"></div>' +
      '<div class="editing-banner" id="editbanner-'+buddyId+'" style="display:none;">Editing &mdash; <span class="edit-cancel">Cancel</span> &nbsp; <label class="lock-toggle"><input type="checkbox" id="edit-lock-'+buddyId+'"> 🔒 Private</label></div>' +
      '<div class="im-compose-row">' +
        richComposeHtml(inputId, '') +
      '</div>' +
      '<div class="im-action-row">' +
        '<button class="action-btn" title="Send a writing prompt" id="prompt-'+buddyId+'">'+iconSVG('bulb')+'<span>Prompt</span></button>' +
        '<button class="action-btn" title="Insert photo" id="photo-'+buddyId+'">'+iconSVG('photo')+'<span>Photo</span></button>' +
        '<button class="action-btn" title="Record a voice note" id="voice-'+buddyId+'">'+iconSVG('mic')+'<span>Voice</span></button>' +
        '<button class="send-btn-gold" id="send-'+buddyId+'">'+iconSVG('send')+'<span id="send-label-'+buddyId+'">Send</span></button>' +
      '</div>' +
      '<div class="draft-links" style="text-align:right;padding-right:8px;"><span class="draft-save-link-'+buddyId+'">Save Draft</span></div>' +
      '<div class="pct-key">%t = time &nbsp; %d = date</div>';

    createWindow({
      title: buddy.name,
      extraClass: 'im-win',
      menuHtml: menu,
      bodyHtml: body,
      type: 'im',
      buddyId: buddyId,
      onMount: function(el, id){
        renderLog(buddyId);
        renderStats(buddyId);
        el._refreshLog=function(){renderLog(buddyId);renderStats(buddyId);};
        var input = el.querySelector('#'+inputId);
        wireRichToolbar(el, inputId);
        input.focus();

        var editingEntryId = null;
        var banner = el.querySelector('#editbanner-'+buddyId);
        var sendLabel = el.querySelector('#send-label-'+buddyId);
        var logEl = el.querySelector('#log-'+buddyId);

        var lockCheckbox = el.querySelector('#edit-lock-'+buddyId);
        function startEdit(entry){
          editingEntryId = entry.id;
          input.innerHTML = entry.html !== undefined ? entry.html : escapeHtml(entry.text || '');
          if(lockCheckbox) lockCheckbox.checked = !!entry.locked;
          input.focus();
          banner.style.display = 'block';
          sendLabel.textContent = 'Save';
        }
        function cancelEdit(){
          editingEntryId = null;
          input.innerHTML = '';
          banner.style.display = 'none';
          sendLabel.textContent = 'Send';
          if(lockCheckbox) lockCheckbox.checked = false;
        }
        banner.querySelector('.edit-cancel').addEventListener('click', cancelEdit);

        logEl.addEventListener('click', function(e){
          // passcode-gated reveal for locked content
          if(e.target.classList.contains('locked-content')){
            if(e.target.classList.contains('revealed')){
              e.target.classList.remove('revealed');
              return;
            }
            var targetEl = e.target;
            appPasscodePrompt(function(ok){
              if(ok) targetEl.classList.add('revealed');
            });
            return;
          }
          var actionEl = e.target.closest('.entry-action');
          if(!actionEl) return;
          var entryEl = actionEl.closest('.im-entry');
          var entryId = entryEl && entryEl.getAttribute('data-entry-id');
          if(!entryId) return;
          var list = state.entries[buddyId] || [];
          var entry = list.find(function(x){ return x.id === entryId; });
          if(!entry) return;
          var action = actionEl.getAttribute('data-action');
          if(action === 'edit'){
            runIfUnlocked(entry, function(){ startEdit(entry); });
          } else if(action === 'delete'){
            runIfUnlocked(entry, function(){
              appConfirm('Move this entry to Trash? You can recover it for seven days.', function(confirmed){
                if(!confirmed) return;
                var entryLabel=stripHtmlTags(entry.html!==undefined?entry.html:(entry.text||'')).trim().slice(0,55)||'Diary Entry';
                moveToTrash('buddyEntry',entryLabel,entry,{buddyId:buddyId});
                state.entries[buddyId] = list.filter(function(x){ return x.id !== entryId; });
                if(editingEntryId === entryId) cancelEdit();
                saveState();
                renderLog(buddyId);
                renderStats(buddyId);
                renderBuddyList();
              });
            });
          }
        });

        function handleSendOrSave(){
          if(isRichEmpty(input)) return;
          var html = sanitizeHTML(input.innerHTML);
          if(editingEntryId){
            var list = state.entries[buddyId] || [];
            var entry = list.find(function(x){ return x.id === editingEntryId; });
            if(entry){
              entry.html = html;
              entry.editedAt = Date.now();
              entry.locked = lockCheckbox ? lockCheckbox.checked : false;
              if(entry.kind === 'prompt') entry.kind = 'entry';
              delete entry.text;
            }
            cancelEdit();
            saveState();
            renderLog(buddyId);
            renderStats(buddyId);
            renderBuddyList();
            playDing();
          } else {
            sendFromIM(buddyId);
          }
        }

        el.querySelector('#send-'+buddyId).addEventListener('click', handleSendOrSave);
        input.addEventListener('keydown', function(e){
          if(e.key === 'Enter' && !e.shiftKey && !isMobile()){
            e.preventDefault();
            handleSendOrSave();
          }
        });

        el.querySelector('#prompt-'+buddyId).addEventListener('click', function(){
          insertPromptMessage(buddyId);
        });
        el.querySelector('#photo-'+buddyId).addEventListener('click', function(){
          input._insertPhoto && input._insertPhoto();
        });
        el.querySelector('#voice-'+buddyId).addEventListener('click', function(){
          startVoiceRecording(input, el.querySelector('#voice-'+buddyId));
        });

        el.querySelector('.mi-close').addEventListener('click', function(){ closeWindow(id); });

        el.querySelector('.mi-search').addEventListener('click', function(){
          appTextPrompt('Search this conversation (blank to clear)', searchQueryByBuddy[buddyId] || '', function(q){
            if(q === null) return;
            searchQueryByBuddy[buddyId] = q.trim();
            renderLog(buddyId);
          });
        });
        el.querySelector('.mi-export').addEventListener('click', function(){
          exportConversation(buddyId, buddy.name);
        });
        el.querySelector('.mi-rename-list').addEventListener('click', function(){
          appTextPrompt('Rename buddy list', buddy.name, function(nextName){
            if(nextName === null) return;
            nextName = nextName.trim();
            if(!nextName || nextName === buddy.name) return;
            buddy.name = nextName;
            saveState();
            renderBuddyList();
            var titleText = el.querySelector('.t-title span:last-child');
            if(titleText) titleText.textContent = nextName;
            var record = openWindows.find(function(w){ return w.id === id; });
            if(record && record.tbSetLabel) record.tbSetLabel(nextName);
          });
        });
        el.querySelector('.mi-delete-list').addEventListener('click', function(){
          confirmDeleteBuddyList(buddy, function(){
            moveToTrash('buddy',buddy.name,{buddy:buddy,entries:(state.entries[buddyId]||[]),drafts:(state.drafts[buddyId]||[])},{});
            state.buddies = state.buddies.filter(function(item){ return item.id !== buddyId; });
            delete state.entries[buddyId];
            delete state.drafts[buddyId];
            delete logFilterByBuddy[buddyId];
            delete searchQueryByBuddy[buddyId];
            saveState();
            renderBuddyList();
            closeWindow(id);
          });
        });

        el.querySelector('.mi-filter-photo').addEventListener('click', function(){ toggleFilterForBuddy(buddyId, 'photo', el); });
        el.querySelector('.mi-filter-voice').addEventListener('click', function(){ toggleFilterForBuddy(buddyId, 'voice', el); });
        el.querySelector('.mi-filter-prompt').addEventListener('click', function(){ toggleFilterForBuddy(buddyId, 'prompt', el); });

        el.querySelector('.mi-editdraft').addEventListener('click', function(){
          openDraftsListWindowFor(buddyId, buddy.name, function(html){
            if(editingEntryId) cancelEdit();
            input.innerHTML = html;
            input.focus();
          }, buddy.name);
        });
        el.querySelector('.mi-clear').addEventListener('click', function(){ cancelEdit(); });
        el.querySelector('.mi-ts').addEventListener('click', function(){ appendPlainText(input, (isRichEmpty(input)?'':' ') + fmtTime(Date.now()) + ' '); });
        el.querySelector('.mi-date').addEventListener('click', function(){ appendPlainText(input, (isRichEmpty(input)?'':' ') + fmtDateShort(Date.now()) + ' '); });

        el.querySelector('.draft-save-link-'+buddyId).addEventListener('click', function(){
          if(isRichEmpty(input)){ openInfoWindow('Nothing to save \u2014 the compose box is empty.'); return; }
          saveDraftFor(buddyId, sanitizeHTML(input.innerHTML));
          openInfoWindow('Draft saved. Use View \u2192 Drafts to see everything you\'ve saved.');
        });

        refreshLogMenuLabels(buddyId, el);
      }
    });
  }

  function renderStats(buddyId){
    var el = document.getElementById('stats-'+buddyId);
    if(!el) return;
    var count = (state.entries[buddyId] || []).filter(function(e){ return e.kind !== 'prompt'; }).length;
    el.textContent = count + (count === 1 ? ' entry' : ' entries') + ' so far';
  }

  function refreshLogMenuLabels(buddyId, el){
    if(!el) return;
    var filter = logFilterByBuddy[buddyId] || null;
    ['photo','voice','prompt'].forEach(function(type){
      var item = el.querySelector('.mi-filter-'+type);
      if(item) item.classList.toggle('mi-active', filter === type);
    });
  }

  function toggleFilterForBuddy(buddyId, type, el){
    logFilterByBuddy[buddyId] = (logFilterByBuddy[buddyId] === type) ? null : type;
    refreshLogMenuLabels(buddyId, el);
    renderLog(buddyId);
  }

  function stripHtmlTags(html){
    var div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent || '';
  }
