  function openDiaryEntriesWindow(){
    trackDtdUsage('diary_opened');
    var existing=openWindows.find(function(w){return w.type==='diaryentries';});if(existing){focusWindow(existing.id);return;}
    function refreshProfile(){var p=openWindows.find(function(w){return w.type==='viewprofile';});if(p&&p.el&&p.el._refreshProfile)p.el._refreshProfile();}
    function buildEntriesBody(){
      var entries=(state.blogPosts||[]).slice().sort(function(a,b){return b.ts-a.ts;});
      var rows=entries.length?entries.map(function(entry){return '<article class="blog-post" data-entry-id="'+escapeHtml(entry.id)+'"><div class="blog-post-header"><div><div class="blog-post-title">'+escapeHtml(entry.title||'Untitled')+'</div><div class="blog-post-date">'+fmtDayDivider(entry.ts)+' · <b style="color:'+(entry.shared?'#257a35':'#777')+'">'+(entry.shared?'Shared on Profile':'Private')+'</b></div></div></div><div class="blog-post-body">'+(entry.html||'')+'</div><div style="display:flex;justify-content:flex-end;gap:6px;margin-top:10px"><button class="btn de-share">'+(entry.shared?'Remove from Profile':'Share to Profile')+'</button><button class="btn de-edit">Edit</button><button class="btn de-delete">Delete</button></div></article>';}).join(''):'<div class="vp-empty">No private diary entries yet. Use New Entry on your profile to write one.</div>';
      return '<div class="win-body vp-body"><div style="padding:12px;border-bottom:1px solid #ccc;background:#f5f5f5"><b>Private Diary Entries</b><div style="font-size:10px;color:#666;margin-top:3px">Entries remain private unless you choose Share to Profile.</div></div><div class="blog-posts-list">'+rows+'</div></div>';
    }
    createWindow({title:'Diary Entries',extraClass:'profile-win',bodyHtml:buildEntriesBody(),type:'diaryentries',onMount:function(el){
      function render(){var body=el.querySelector('.win-body');if(body)body.outerHTML=buildEntriesBody();wire();}
      el._refreshDiaryEntries=render;
      function wire(){
        el.querySelectorAll('[data-entry-id]').forEach(function(row){var entry=(state.blogPosts||[]).find(function(p){return p.id===row.dataset.entryId;});if(!entry)return;
          row.querySelector('.de-share').onclick=function(){entry.shared=!entry.shared;saveState();syncDtdPublicEntry(entry).catch(function(){});refreshProfile();render();};
          row.querySelector('.de-edit').onclick=function(){openBlogPostEditor(entry,function(){saveState();syncDtdPublicEntry(entry).catch(function(){});refreshProfile();render();});};
          row.querySelector('.de-delete').onclick=function(){appConfirm('Move this diary entry to Trash? You can recover it for seven days.',function(ok){if(!ok)return;moveToTrash('diaryPost',entry.title||'Untitled',entry,{});var removed=entry;state.blogPosts=(state.blogPosts||[]).filter(function(p){return p.id!==entry.id;});removed.shared=false;saveState();syncDtdPublicEntry(removed).catch(function(){});refreshProfile();render();});};
        });
      }
      wire();
    }});
  }

