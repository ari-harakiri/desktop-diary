  // ================= NEW MESSAGE WINDOW =================
  function openNewMessageWindow(prefillName){
    var buddyOptions = state.buddies.map(function(b){ return '<option value="'+escapeHtml(b.id)+'">'+escapeHtml(b.name)+'</option>'; }).join('');
    var prefillMatch = prefillName ? findBuddyByName(prefillName) : null;
    var body =
      '<div class="win-body nm-body">' +
        '<div class="nm-row"><label>To:</label><select id="nm-to-select">' +
          '<option value="">Choose a buddy</option>' + buddyOptions +
          '<option value="__new__">+ New Buddy</option>' +
        '</select></div>' +
        '<div class="nm-row" id="nm-newbuddy-row" style="display:none;"><label>New:</label><input type="text" id="nm-to-new" placeholder="Name" value="'+(prefillName && !prefillMatch ? escapeHtml(prefillName) : '')+'"></div>' +
        richComposeHtml('nm-body', '') +
        '<div class="im-action-row" style="justify-content:flex-start;">' +
          '<button class="action-btn" title="Insert photo" id="nm-photo-btn">'+iconSVG('photo')+'<span>Photo</span></button>' +
          '<button class="action-btn" title="Record a voice note" id="nm-voice-btn">'+iconSVG('mic')+'<span>Voice</span></button>' +
        '</div>' +
        '<div class="pct-key" style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span><span class="nm-ins-ts" style="cursor:pointer;text-decoration:underline;">%t = time</span> &nbsp; <span class="nm-ins-date" style="cursor:pointer;text-decoration:underline;">%d = date</span></span>' +
          '<span class="draft-save-link" style="color:#0850d0;text-decoration:underline;cursor:pointer;">Save Draft</span>' +
        '</div>' +
        '<div class="nm-send-row"><button class="btn" id="nm-send">Send</button></div>' +
      '</div>';

    createWindow({
      title: 'Send Message',
      extraClass: 'nm-win',
      bodyHtml: body,
      type: 'newmsg',
      onMount: function(el, id){
        wireRichToolbar(el, 'nm-body');
        var composeEl = el.querySelector('#nm-body');
        composeEl.focus();
        var toSelect = el.querySelector('#nm-to-select');
        var newRow = el.querySelector('#nm-newbuddy-row');
        var newInput = el.querySelector('#nm-to-new');

        if(prefillMatch){
          toSelect.value = prefillMatch.id;
        } else if(prefillName){
          toSelect.value = '__new__';
          newRow.style.display = 'flex';
        }
        toSelect.addEventListener('change', function(){
          newRow.style.display = (toSelect.value === '__new__') ? 'flex' : 'none';
        });

        el.querySelector('#nm-photo-btn').addEventListener('click', function(){ composeEl._insertPhoto && composeEl._insertPhoto(); });
        el.querySelector('#nm-voice-btn').addEventListener('click', function(){ startVoiceRecording(composeEl, el.querySelector('#nm-voice-btn')); });
        el.querySelector('.nm-ins-ts').addEventListener('click', function(){ appendPlainText(composeEl, (isRichEmpty(composeEl)?'':' ') + fmtTime(Date.now()) + ' '); });
        el.querySelector('.nm-ins-date').addEventListener('click', function(){ appendPlainText(composeEl, (isRichEmpty(composeEl)?'':' ') + fmtDateShort(Date.now()) + ' '); });
        el.querySelector('#nm-send').addEventListener('click', function(){
          var buddy = null;
          if(toSelect.value === '__new__'){
            var newName = newInput.value.trim();
            if(!newName){ newInput.focus(); return; }
            buddy = ensureBuddy(newName);
          } else if(toSelect.value){
            buddy = state.buddies.find(function(b){ return b.id === toSelect.value; });
          }
          if(!buddy){ toSelect.focus(); return; }
          if(isRichEmpty(composeEl)) { composeEl.focus(); return; }
          var html = sanitizeHTML(composeEl.innerHTML);
          state.entries[buddy.id] = state.entries[buddy.id] || [];
          state.entries[buddy.id].push({ id: uid(), html: html, ts: Date.now(), kind: 'entry', author: state.account.screenName });
          saveState();
          playDing();
          renderBuddyList();
          closeWindow(id);
          openIMWindow(buddy.id);
        });

        el.querySelector('.draft-save-link').addEventListener('click', function(){
          if(isRichEmpty(composeEl)){ openInfoWindow('Nothing to save \u2014 the compose box is empty.'); return; }
          var recipientName = null;
          if(toSelect.value === '__new__'){
            recipientName = newInput.value.trim() || null;
          } else if(toSelect.value){
            var b = state.buddies.find(function(x){ return x.id === toSelect.value; });
            recipientName = b ? b.name : null;
          }
          saveDraftFor('__newmessage__', sanitizeHTML(composeEl.innerHTML), recipientName);
          openInfoWindow('Draft saved. Find it later under Edit \u2192 Drafts on the Buddy List.');
        });
      }
    });
  }

  function openCategoriesWindow(){
    var existing=openWindows.find(function(w){return w.type==='categories';});if(existing){focusWindow(existing.id);return;}
    function bodyHtml(){return '<div class="win-body nm-body"><div style="font-size:11px;color:#666;margin-bottom:9px">Organize your Buddy List categories.</div><div id="category-list">'+state.groups.map(function(g){var count=state.buddies.filter(function(b){return (b.groupId||'default')===g.id;}).length;return '<div data-category-id="'+escapeHtml(g.id)+'" style="display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid #ddd"><b style="flex:1">'+escapeHtml(g.name)+'</b><span style="font-size:9px;color:#777">'+count+' buddies</span><button class="btn category-rename">Rename</button>'+(g.id==='default'?'':'<button class="btn category-delete" style="color:#b3261e">Delete</button>')+'</div>';}).join('')+'</div><div class="nm-send-row" style="margin-top:10px"><button class="btn" id="category-add">+ New Category</button></div></div>';}
    createWindow({title:'Categories',extraClass:'setup-win',bodyHtml:bodyHtml(),type:'categories',onMount:function(el){
      function render(){var body=el.querySelector('.win-body');if(body)body.outerHTML=bodyHtml();wire();}
      function wire(){
        el.querySelector('#category-add').onclick=function(){appTextPrompt('New category','',function(name){if(name===null)return;name=name.trim();if(!name)return;state.groups.push({id:uid(),name:name});saveState();renderBuddyList();render();});};
        el.querySelectorAll('[data-category-id]').forEach(function(row){var group=state.groups.find(function(g){return g.id===row.dataset.categoryId;});if(!group)return;row.querySelector('.category-rename').onclick=function(){appTextPrompt('Rename category',group.name,function(name){if(name===null)return;name=name.trim();if(!name)return;group.name=name;saveState();renderBuddyList();render();});};var del=row.querySelector('.category-delete');if(del)del.onclick=function(){var fallback=state.groups.find(function(g){return g.id==='default';});appConfirm('Delete category "'+group.name+'"? Its buddies will move to "'+(fallback?fallback.name:'Buddy Lists')+'".',function(ok){if(!ok)return;state.buddies.forEach(function(b){if(b.groupId===group.id)b.groupId='default';});state.groups=state.groups.filter(function(g){return g.id!==group.id;});saveState();renderBuddyList();render();});};});
      }
      wire();
    }});
  }

