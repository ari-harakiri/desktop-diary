  // ================= BUDDIES WINDOW (add + edit combined) =================
  function openBuddiesWindow(){
    var buddyOptions = state.buddies.map(function(b){ return '<option value="'+escapeHtml(b.name)+'"></option>'; }).join('');
    var body =
      '<div class="win-body nm-body">' +
        '<div class="nm-row"><label>Name:</label><input type="text" id="bw-name" list="bw-saved-buddies" placeholder="Type or choose..."><datalist id="bw-saved-buddies">'+buddyOptions+'</datalist></div>' +
        '<div class="nm-row"><label>Category:</label><select id="bw-group">'+groupOptionsHtml()+'</select></div>' +
        '<div class="nm-send-row" style="gap:8px;">' +
          '<button class="btn" id="bw-delete" style="color:#c0392b;border-color:#c0392b;">Delete Buddy</button>' +
          '<button class="btn" id="bw-save">Add Buddy</button>' +
        '</div>' +
      '</div>';
    createWindow({
      title: 'Buddy Lists',
      extraClass: 'addbuddy-win',
      bodyHtml: body,
      type: 'buddies',
      onMount: function(el, id){
        var nameInput = el.querySelector('#bw-name');
        var groupSelect = el.querySelector('#bw-group');
        var deleteBtn = el.querySelector('#bw-delete');
        var saveBtn = el.querySelector('#bw-save');
        var currentBuddyId = null;
        function buddyNamed(name){
          var normalized = String(name || '').trim().toLowerCase();
          if(!normalized) return null;
          return state.buddies.find(function(b){ return String(b.name || '').trim().toLowerCase() === normalized; }) || null;
        }
        function loadBuddy(b){
          currentBuddyId = b ? b.id : null;
          if(b){
            nameInput.value = b.name;
            groupSelect.value = b.groupId || 'default';
          } else {
            groupSelect.value = 'default';
          }
          deleteBtn.style.display = b ? '' : 'none';
          saveBtn.textContent = b ? 'Save' : 'Add Buddy';
        }
        loadBuddy(null);
        nameInput.addEventListener('input', function(){
          var name = nameInput.value.trim();
          if(!name){ loadBuddy(null); nameInput.value = ''; return; }
          var match = buddyNamed(name);
          if(match && match.id !== currentBuddyId){ loadBuddy(match); return; }
          var current = currentBuddyId && state.buddies.find(function(b){ return b.id === currentBuddyId; });
          deleteBtn.style.display = current ? '' : 'none';
          saveBtn.textContent = current ? 'Save' : 'Add Buddy';
        });
        nameInput.focus();
        function submit(){
          var name = nameInput.value.trim();
          if(!name) return;
          var groupId = groupSelect.value;
          var b = currentBuddyId && state.buddies.find(function(x){ return x.id === currentBuddyId; });
          if(!b) b = buddyNamed(name);
          if(b){ b.name = name; b.groupId = groupId; }
          else ensureBuddy(name, groupId);
          saveState();
          renderBuddyList();
          closeWindow(id);
        }
        saveBtn.addEventListener('click', submit);
        nameInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') submit(); });
        deleteBtn.addEventListener('click', function(){
          var b = currentBuddyId && state.buddies.find(function(x){ return x.id === currentBuddyId; });
          if(!b) return;
          appConfirm('Move "' + b.name + '" and their diary to Trash? You can recover them for seven days.', function(confirmed){
            if(!confirmed) return;
            moveToTrash('buddy',b.name,{buddy:b,entries:(state.entries[b.id]||[]),drafts:(state.drafts[b.id]||[])},{});
            state.buddies = state.buddies.filter(function(x){ return x.id !== b.id; });
            delete state.entries[b.id];
            delete state.drafts[b.id];
            delete logFilterByBuddy[b.id];
            delete searchQueryByBuddy[b.id];
            var openW = openWindows.find(function(w){ return w.type === 'im' && w.buddyId === b.id; });
            if(openW) closeWindow(openW.id);
            saveState(); renderBuddyList(); closeWindow(id);
          });
        });
      }
    });
  }
