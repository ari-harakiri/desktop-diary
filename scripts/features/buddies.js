  // ================= BUDDIES WINDOW (add + edit combined) =================
  function openBuddiesWindow(){
    var buddyOptions = state.buddies.map(function(b){ return '<option value="'+escapeHtml(b.id)+'">'+escapeHtml(b.name)+'</option>'; }).join('');
    var body =
      '<div class="win-body nm-body">' +
        '<div class="nm-row"><label>Buddy:</label><select id="bw-select"><option value="__new__">+ Add New Buddy</option>'+buddyOptions+'</select></div>' +
        '<div class="nm-row"><label>Name:</label><input type="text" id="bw-name" placeholder="Name"></div>' +
        '<div class="nm-row"><label>Category:</label><select id="bw-group">'+groupOptionsHtml()+'<option value="__new__">+ New Category</option></select></div>' +
        '<div class="nm-row" id="bw-newgroup-row" style="display:none;"><label>New:</label><input type="text" id="bw-newgroup-name" placeholder="Category name"></div>' +
        '<div class="nm-row" id="bw-group-manage-row"><label></label><div style="display:flex;gap:6px;">' +
          '<button class="btn" id="bw-group-rename" style="font-size:11px;padding:3px 8px;">Rename Category</button>' +
          '<button class="btn" id="bw-group-delete" style="font-size:11px;padding:3px 8px;color:#c0392b;border-color:#c0392b;">Delete Category</button>' +
        '</div></div>' +
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
        var select = el.querySelector('#bw-select');
        var nameInput = el.querySelector('#bw-name');
        var groupSelect = el.querySelector('#bw-group');
        var newGroupRow = el.querySelector('#bw-newgroup-row');
        var deleteBtn = el.querySelector('#bw-delete');
        var saveBtn = el.querySelector('#bw-save');
        var groupRenameBtn = el.querySelector('#bw-group-rename');
        var groupDeleteBtn = el.querySelector('#bw-group-delete');
        function updateGroupButtons(){
          var isNew = groupSelect.value === '__new__';
          var isDefault = groupSelect.value === 'default';
          groupRenameBtn.style.display = isNew ? 'none' : '';
          groupDeleteBtn.style.display = (isNew || isDefault) ? 'none' : '';
        }
        function loadCurrent(){
          newGroupRow.style.display = 'none';
          if(select.value === '__new__'){
            nameInput.value = '';
            groupSelect.value = 'default';
            deleteBtn.style.display = 'none';
            saveBtn.textContent = 'Add Buddy';
          } else {
            var b = state.buddies.find(function(x){ return x.id === select.value; });
            if(b){ nameInput.value = b.name; groupSelect.value = b.groupId || 'default'; }
            deleteBtn.style.display = '';
            saveBtn.textContent = 'Save';
          }
          updateGroupButtons();
        }
        loadCurrent();
        select.addEventListener('change', loadCurrent);
        groupSelect.addEventListener('change', function(){
          newGroupRow.style.display = (groupSelect.value === '__new__') ? 'flex' : 'none';
          updateGroupButtons();
        });
        groupRenameBtn.addEventListener('click', function(){
          var group = state.groups.find(function(g){ return g.id === groupSelect.value; });
          if(!group) return;
          appTextPrompt('Rename category', group.name, function(newName){
            if(newName === null) return;
            newName = newName.trim();
            if(!newName) return;
            group.name = newName;
            saveState();
            renderBuddyList();
            var opt = groupSelect.querySelector('option[value="'+group.id+'"]');
            if(opt) opt.textContent = newName;
          });
        });
        groupDeleteBtn.addEventListener('click', function(){
          var group = state.groups.find(function(g){ return g.id === groupSelect.value; });
          if(!group) return;
          appConfirm('Delete category "' + group.name + '"? Its buddies will move to "Buddy Lists".', function(confirmed){
            if(!confirmed) return;
            state.buddies.forEach(function(b){
              if(b.groupId === group.id) b.groupId = 'default';
            });
            state.groups = state.groups.filter(function(g){ return g.id !== group.id; });
            saveState();
            renderBuddyList();
            var opt = groupSelect.querySelector('option[value="'+group.id+'"]');
            if(opt) opt.remove();
            loadCurrent();
          });
        });
        nameInput.focus();
        function submit(){
          var name = nameInput.value.trim();
          if(!name) return;
          var groupId = groupSelect.value;
          if(groupId === '__new__'){
            var newName = el.querySelector('#bw-newgroup-name').value.trim();
            if(!newName){ el.querySelector('#bw-newgroup-name').focus(); return; }
            var newGroup = { id: uid(), name: newName };
            state.groups.push(newGroup);
            groupId = newGroup.id;
          }
          if(select.value === '__new__'){
            ensureBuddy(name, groupId);
          } else {
            var b = state.buddies.find(function(x){ return x.id === select.value; });
            if(b){ b.name = name; b.groupId = groupId; }
          }
          saveState();
          renderBuddyList();
          closeWindow(id);
        }
        saveBtn.addEventListener('click', submit);
        nameInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') submit(); });
        deleteBtn.addEventListener('click', function(){
          if(select.value === '__new__') return;
          var b = state.buddies.find(function(x){ return x.id === select.value; });
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

