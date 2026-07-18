  // Generic draft log, usable by any rich-text compose box (IM entries, new messages,
  // status edits, blog posts). `key` is a buddyId or a fixed scope like '__blog__'.
  function saveDraftFor(key, html, recipient){
    if(!html || !stripHtmlTags(html).trim()) return false;
    state.drafts[key] = state.drafts[key] || [];
    var draft = { id: uid(), html: html, ts: Date.now() };
    if(recipient) draft.recipient = recipient;
    state.drafts[key].push(draft);
    saveState();
    return true;
  }

  function openDraftsListWindowFor(key, scopeLabel, onLoad, impliedRecipient){
    function buildRows(){
      var list = (state.drafts[key] || []).slice().sort(function(a,b){ return b.ts - a.ts; });
      if(!list.length) return '<div class="bl-empty">No saved drafts yet.</div>';
      return list.map(function(d){
        var preview = stripHtmlTags(d.html).trim();
        if(preview.length > 80) preview = preview.slice(0, 80) + '\u2026';
        var recipient = impliedRecipient || d.recipient || null;
        var recipientHtml = recipient ? '<div class="draft-recipient">To: ' + escapeHtml(recipient) + '</div>' : '';
        return '<div class="status-log-row" data-draft-id="'+escapeHtml(d.id)+'">' +
          '<div class="slr-ts">' + fmtDayDivider(d.ts) + ' &middot; ' + fmtTime(d.ts) +
            '<span class="sl-actions"><span class="sl-edit" title="Load">&#9998;</span><span class="sl-del" title="Delete">&#10005;</span></span>' +
          '</div>' +
          recipientHtml +
          '<div class="sl-status-label">' + (escapeHtml(preview) || '<i>(empty)</i>') + '</div>' +
        '</div>';
      }).join('');
    }
    createWindow({
      title: 'Drafts' + (scopeLabel ? ' \u2014 ' + scopeLabel : ''),
      extraClass: 'help-win',
      bodyHtml: '<div class="win-body" id="drafts-body-wrap">' + buildRows() + '</div>',
      type: 'drafts',
      onMount: function(dEl, dId){
        function wireDraftActions(){
          dEl.querySelectorAll('.sl-edit').forEach(function(btn){
            btn.onclick = function(){
              var row = btn.closest('[data-draft-id]');
              var draftId = row && row.getAttribute('data-draft-id');
              var draft = (state.drafts[key] || []).find(function(d){ return d.id === draftId; });
              if(!draft) return;
              onLoad(draft.html);
              closeWindow(dId);
            };
          });
          dEl.querySelectorAll('.sl-del').forEach(function(btn){
            btn.onclick = function(){
              var row = btn.closest('[data-draft-id]');
              var draftId = row && row.getAttribute('data-draft-id');
              appConfirm('Delete this saved draft?', function(confirmed){
                if(!confirmed) return;
                state.drafts[key] = (state.drafts[key] || []).filter(function(d){ return d.id !== draftId; });
                saveState();
                dEl.querySelector('#drafts-body-wrap').innerHTML = buildRows();
                wireDraftActions();
              });
            };
          });
        }
        wireDraftActions();
      }
    });
  }

  // ================= ALL DRAFTS WINDOW (grouped by type: status, blog, messages) =================
  function openAllDraftsWindow(){
    function rowsFor(key, impliedRecipient){
      var list = (state.drafts[key] || []).slice().sort(function(a,b){ return b.ts - a.ts; });
      return list.map(function(d){
        var preview = stripHtmlTags(d.html).trim();
        if(preview.length > 70) preview = preview.slice(0, 70) + '\u2026';
        var recipient = impliedRecipient || d.recipient || null;
        var recipientHtml = recipient ? '<div class="draft-recipient">To: ' + escapeHtml(recipient) + '</div>' : '';
        return '<div class="status-log-row" data-draft-key="'+escapeHtml(key)+'" data-draft-id="'+escapeHtml(d.id)+'">' +
          '<div class="slr-ts">' + fmtDayDivider(d.ts) + ' &middot; ' + fmtTime(d.ts) +
            '<span class="sl-actions"><span class="sl-edit" title="Load">&#9998;</span><span class="sl-del" title="Delete">&#10005;</span></span>' +
          '</div>' +
          recipientHtml +
          '<div class="sl-status-label">' + (escapeHtml(preview) || '<i>(empty)</i>') + '</div>' +
        '</div>';
      }).join('');
    }
    function sectionHeader(label){
      return '<div style="font-weight:bold;padding:6px 8px 2px;border-bottom:1px solid #ccc;margin-top:6px;">' + escapeHtml(label) + '</div>';
    }
    function subHeader(label){
      return '<div style="font-size:11px;color:#555;padding:4px 8px 0;">' + escapeHtml(label) + '</div>';
    }
    function buildBody(){
      var blogRows = rowsFor('__blog__');
      var msgHtml = '';
      var nmRows = rowsFor('__newmessage__');
      if(nmRows) msgHtml += subHeader('New Message') + nmRows;
      state.buddies.forEach(function(b){
        var rows = rowsFor(b.id, b.name);
        if(rows) msgHtml += subHeader(b.name) + rows;
      });
      var html = '';
      html += sectionHeader('Posts') + (blogRows || '<div class="bl-empty">No post drafts.</div>');
      html += sectionHeader('Messages') + (msgHtml || '<div class="bl-empty">No message drafts.</div>');
      return html;
    }
    createWindow({
      title: 'Drafts',
      extraClass: 'help-win',
      bodyHtml: '<div class="win-body" id="alldrafts-body-wrap">' + buildBody() + '</div>',
      type: 'alldrafts',
      onMount: function(el, id){
        function wireActions(){
          el.querySelectorAll('.sl-edit').forEach(function(btn){
            btn.onclick = function(){
              var row = btn.closest('[data-draft-id]');
              var key = row && row.getAttribute('data-draft-key');
              var draftId = row && row.getAttribute('data-draft-id');
              var draft = (state.drafts[key] || []).find(function(d){ return d.id === draftId; });
              if(!draft) return;
              closeWindow(id);
              if(key === '__blog__'){
                openBlogPostEditor(null, null, draft.html);
              } else if(key === '__newmessage__'){
                openNewMessageWindow();
                var composeEl = document.getElementById('nm-body');
                if(composeEl) composeEl.innerHTML = draft.html;
              } else {
                openIMWindow(key);
                var input = document.getElementById('input-'+key);
                if(input) input.innerHTML = draft.html;
              }
            };
          });
          el.querySelectorAll('.sl-del').forEach(function(btn){
            btn.onclick = function(){
              var row = btn.closest('[data-draft-id]');
              var key = row && row.getAttribute('data-draft-key');
              var draftId = row && row.getAttribute('data-draft-id');
              appConfirm('Delete this saved draft?', function(confirmed){
                if(!confirmed) return;
                state.drafts[key] = (state.drafts[key] || []).filter(function(d){ return d.id !== draftId; });
                saveState();
                el.querySelector('#alldrafts-body-wrap').innerHTML = buildBody();
                wireActions();
              });
            };
          });
        }
        wireActions();
      }
    });
  }

