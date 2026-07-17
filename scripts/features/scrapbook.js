  // ================= SCRAPBOOK =================
  function scrapbookDate(ts){ return new Date(ts||Date.now()).toLocaleString(undefined,{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}); }

  function buildScrapbookHtml(snapshot){
    var made=Date.now(), owner=(snapshot.account&&snapshot.account.screenName)||'DesktopDiary', cards=[];
    (snapshot.buddies||[]).forEach(function(b){(snapshot.entries&&snapshot.entries[b.id]||[]).forEach(function(e){cards.push({type:e.kind==='prompt'?'Prompt':'Diary entry',title:b.name,html:sanitizeHTML(e.html||e.text||''),ts:e.ts||made});});});
    (snapshot.blogPosts||[]).forEach(function(p){cards.push({type:'Diary post',title:p.title||'Untitled post',html:sanitizeHTML(p.html||''),ts:p.ts||made});});
    cards.sort(function(a,b){return b.ts-a.ts;});
    var cardHtml=cards.map(function(c){var search=(c.title+' '+stripHtmlTags(c.html)).toLowerCase();return '<article class="memory" data-search="'+escapeHtml(search)+'"><div class="memory-head"><div><small>'+escapeHtml(c.type)+'</small><h2>'+escapeHtml(c.title)+'</h2></div><time>'+escapeHtml(scrapbookDate(c.ts))+'</time></div><div class="memory-body">'+c.html+'</div></article>';}).join('')||'<div class="empty">Your scrapbook is ready for its first memory.</div>';
    var moods=(snapshot.moodLog||[]).slice().sort(function(a,b){return b.ts-a.ts;}).map(function(m){return '<li><b>'+escapeHtml(m.mood||'Mood')+'</b><span>'+escapeHtml(scrapbookDate(m.ts))+'</span></li>';}).join('')||'<li>No moods yet.</li>';
    var statuses=(snapshot.statusLog||[]).slice().sort(function(a,b){return b.ts-a.ts;}).map(function(s){return '<li><div><b>'+escapeHtml(s.label||'Status')+'</b><div>'+sanitizeHTML(s.html||'')+'</div></div><span>'+escapeHtml(scrapbookDate(s.ts))+'</span></li>';}).join('')||'<li>No statuses yet.</li>';
    var portrait=snapshot.profile&&snapshot.profile.pic?'<img class="portrait" src="'+snapshot.profile.pic+'" alt="Profile picture">':'<div class="portrait flower">DD</div>';
    var archive=JSON.stringify({format:'desktopdiary-scrapbook',version:1,createdAt:made,state:snapshot}).replace(/</g,'\\u003c');
    var css='*{box-sizing:border-box}body{margin:0;color:#3c2f35;font:15px/1.55 Georgia,serif;background:#eadfd7;background-image:radial-gradient(#cdb8ad 1px,transparent 1px);background-size:18px 18px}header{text-align:center;padding:46px 18px 34px;background:linear-gradient(135deg,#fff9f2,#f4d7e3);border-bottom:1px solid #cdaab8}.portrait{width:105px;height:105px;object-fit:cover;border:7px solid #fff;border-radius:18px;box-shadow:0 4px 15px #7555}.flower{display:flex;align-items:center;justify-content:center;margin:auto;background:#e9b5c9;font-size:42px}h1{font-size:clamp(32px,7vw,56px);line-height:1;margin:13px 0 4px}.sub{color:#7c6971}.stats{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}.stats span{padding:5px 11px;border:1px solid #ddbdc9;border-radius:99px;background:#fff9}.search{position:sticky;top:0;z-index:2;padding:9px;background:#fffaf5ee;border-bottom:1px solid #dacac3}.search input{display:block;width:min(680px,94%);margin:auto;padding:10px 14px;border:1px solid #bfaab2;border-radius:99px;font:14px Arial}.layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(220px,1fr);gap:20px;width:min(1050px,94%);margin:25px auto}.memory,.side section{background:#fffdf8;border:1px solid #ded0c8;border-radius:12px;padding:18px;margin-bottom:16px;box-shadow:0 4px 14px #60404010}.memory-head{display:flex;justify-content:space-between;gap:12px;padding-bottom:9px;margin-bottom:12px;border-bottom:1px dashed #ddcec7}.memory h2{margin:2px 0 0;font-size:20px}.memory small{font:700 10px Arial;text-transform:uppercase;letter-spacing:.12em;color:#b84f78}time,.side li span{font-size:11px;color:#806e76}.memory-body{overflow-wrap:anywhere}.memory-body img{max-width:100%;height:auto;border-radius:8px}.memory-body audio{width:100%}.side h2{font-size:17px;margin:0 0 7px}.side ul{list-style:none;margin:0;padding:0}.side li{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid #eadfd8}.side li:first-child{border-top:0}.empty,#none{text-align:center;padding:30px;color:#806e76}#none{display:none}footer{text-align:center;padding:28px;color:#78666e;font-size:12px}@media(max-width:720px){.layout{grid-template-columns:1fr}.memory-head{display:block}}@media print{body{background:#fff}.search{display:none}.layout{display:block;width:100%}.memory{box-shadow:none;break-inside:avoid}}';
    css+='body{color:#20242a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#f1f3f5;background-image:none}header{padding:36px 18px 28px;background:#e9ecef;border-color:#c7ccd1}.portrait{width:88px;height:88px;border:1px solid #aeb5bc;border-radius:6px;box-shadow:none}.flower{background:#d8dde2;color:#39424c;font:700 22px Arial}.sub,time,.side li span{color:#68717b}.stats span{border:1px solid #c4cbd2;border-radius:4px;background:#f8f9fa}.search{background:#f8f9faee;border-color:#cbd1d6}.search input{border-color:#9da6af;border-radius:4px}.memory,.side section{background:#fff;border-color:#cbd1d6;border-radius:6px;box-shadow:0 1px 3px #00000010}.memory-head{border-bottom:1px solid #d7dce0}.memory small{color:#315c86}.memory-body img{border-radius:3px}.side li{border-color:#e0e4e7}.empty,#none,footer{color:#68717b}';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(owner)+'’s Scrapbook</title><style>'+css+'</style></head><body><header>'+portrait+'<h1>'+escapeHtml(owner)+'’s Scrapbook</h1><div class="sub">DesktopDiary archive · '+escapeHtml(scrapbookDate(made))+'</div><div class="stats"><span>'+cards.length+' memories</span><span>'+(snapshot.buddies||[]).length+' buddies</span><span>'+(snapshot.moodLog||[]).length+' moods</span></div></header><div class="search"><input id="q" type="search" placeholder="Search your scrapbook…"></div><main class="layout"><div><div id="none">No memories match that search.</div><div id="memories">'+cardHtml+'</div></div><aside class="side"><section><h2>Mood history</h2><ul>'+moods+'</ul></section><section><h2>Status history</h2><ul>'+statuses+'</ul></section></aside></main><footer>This scrapbook includes a complete DesktopDiary restore copy. Keep it somewhere safe.</footer><script id="desktopdiary-scrapbook-data" type="application/json">'+archive+'<\\/script><script>(function(){var q=document.getElementById("q"),a=[].slice.call(document.querySelectorAll(".memory")),n=document.getElementById("none");q.oninput=function(){var s=q.value.toLowerCase().trim(),c=0;a.forEach(function(x){var ok=!s||x.getAttribute("data-search").indexOf(s)>-1;x.style.display=ok?"block":"none";if(ok)c++});n.style.display=c?"none":"block"}})();<\\/script></body></html>';
  }

  function decorateScrapbookHtml(html,snapshot){
    var design=snapshot.scrapbook||{},presets={computer:{color:'#f1f3f5',line:'#cbd1d6'},paper:{color:'#efe4cf',line:'#d6c6a6'},blue:{color:'#dcecf6',line:'#aec8d9'},yellow:{color:'#fff27a',line:'#dbc943'}},background=presets[design.backgroundPreset]||{color:/^#[0-9a-f]{6}$/i.test(design.backgroundColor||'')?design.backgroundColor:'#f1f3f5',line:'#00000022'};
    var borders={simple:'1px solid #9da6af',double:'4px double #77818b',dashed:'2px dashed #89939d',bold:'3px solid #59636d'},bookBorder=borders[design.border]||borders.simple;
    var fonts={system:'-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',arial:'Arial,sans-serif',georgia:'Georgia,serif',courier:'"Courier New",monospace',trebuchet:'"Trebuchet MS",Arial,sans-serif',verdana:'Verdana,Arial,sans-serif',times:'"Times New Roman",serif'},bodyFont=fonts[design.fontFamily]||fonts.system,headingFont=fonts[design.headingFont]||fonts.system,fontSize={small:'13px',medium:'15px',large:'18px'}[design.fontSize]||'15px';
    var stickers=(design.stickers||[]).map(function(sticker){return '<span>'+escapeHtml(sticker)+'</span>';}).join('');
    var notes=(design.notes||[]).map(function(note){return '<article class="scrapbook-note">'+escapeHtml(note.text||'').replace(/\n/g,'<br>')+'</article>';}).join('');
    var css=':root{--book-bg:'+background.color+';--book-line:'+background.line+';--book-border:'+bookBorder+';--book-font:'+bodyFont+';--book-heading-font:'+headingFont+'}body{background-color:var(--book-bg);font-family:var(--book-font);font-size:'+fontSize+'}h1,h2,.memory small,.stats{font-family:var(--book-heading-font)}body.sb-dots{background-image:radial-gradient(var(--book-line) 1px,transparent 1px);background-size:18px 18px}body.sb-grid{background-image:linear-gradient(var(--book-line) 1px,transparent 1px),linear-gradient(90deg,var(--book-line) 1px,transparent 1px);background-size:24px 24px}.memory,.side section,.scrapbook-note{border:var(--book-border)}header{border-bottom:var(--book-border)}.scrapbook-stickers{display:flex;justify-content:center;gap:11px;flex-wrap:wrap;min-height:8px;margin:15px auto 0;font-size:28px}.scrapbook-notes{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:13px;width:min(1050px,94%);margin:22px auto 0}.scrapbook-note{padding:17px;background:#fff7a8;box-shadow:3px 4px 0 #00000012;overflow-wrap:anywhere}@media print{.scrapbook-note{break-inside:avoid}}';
    var patternClass=design.backgroundPattern==='dots'?'sb-dots':design.backgroundPattern==='grid'?'sb-grid':'';
    html=html.replace('</style>',css+'</style>').replace('<body>','<body class="'+patternClass+'">');
    if(stickers)html=html.replace('</header>','<div class="scrapbook-stickers">'+stickers+'</div></header>');
    if(notes)html=html.replace('<main class="layout">','<section class="scrapbook-notes">'+notes+'</section><main class="layout">');
    return html;
  }

  function downloadScrapbook(snapshot,suffix){
    var copy=JSON.parse(JSON.stringify(snapshot)),blob=new Blob([decorateScrapbookHtml(buildScrapbookHtml(copy),copy)],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='DesktopDiary-Scrapbook-'+new Date().toISOString().slice(0,10)+(suffix?'-'+suffix:'')+'.html';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},3000);
  }

  function previewScrapbook(snapshot){
    var copy=JSON.parse(JSON.stringify(snapshot)),blob=new Blob([decorateScrapbookHtml(buildScrapbookHtml(copy),copy)],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),preview=window.open(url,'_blank');
    if(!preview){URL.revokeObjectURL(url);openInfoWindow('DesktopDiary could not open the preview. Please allow pop-up windows and try again.');return;}
    setTimeout(function(){URL.revokeObjectURL(url);},60000);
  }

  function restoreFromScrapbookFile(file){
    if(!file)return;var reader=new FileReader();
    reader.onload=function(e){try{var doc=new DOMParser().parseFromString(String(e.target.result),'text/html'),data=doc.getElementById('desktopdiary-scrapbook-data');if(!data)throw new Error('This file has no DesktopDiary restore data.');var book=JSON.parse(data.textContent||'');if(!book||book.format!=='desktopdiary-scrapbook'||book.version!==1||!book.state)throw new Error('This scrapbook format is not supported.');appConfirm('Restore this scrapbook? A safety scrapbook of your current diary will download first, then the scrapbook will replace the current contents.',function(ok){if(!ok)return;downloadScrapbook(state,'before-restore');state=book.state;normalizeState();saveState().then(function(){setTimeout(function(){location.reload();},350);});});}catch(err){openInfoWindow('Could not restore this scrapbook: '+(err&&err.message?err.message:String(err)));}};
    reader.onerror=function(){openInfoWindow('DesktopDiary could not read that scrapbook.');};reader.readAsText(file);
  }

  function openScrapbookWindow(){
    var existing=openWindows.find(function(w){return w.type==='scrapbook';});if(existing){focusWindow(existing.id);return;}
    var stickerChoices=['⭐','❤️','🌼','📷','✉️','💾','🖥️','📌','🐶','🌈'];
    var body='<div class="win-body"><div class="scrapbook-editor"><div class="scrapbook-editor-main"><div class="scrapbook-controls"><fieldset><legend>Page</legend><label class="scrapbook-control-row"><span>Background</span><select id="scrapbook-bg"><option value="computer">Computer Gray</option><option value="paper">Warm Paper</option><option value="blue">Blue Paper</option><option value="yellow">Bright Yellow</option><option value="custom">Custom Color</option></select></label><label class="scrapbook-control-row"><span>Custom</span><input id="scrapbook-color" type="color"></label><label class="scrapbook-control-row"><span>Pattern</span><select id="scrapbook-pattern"><option value="none">None</option><option value="dots">Dots</option><option value="grid">Grid</option></select></label><label class="scrapbook-control-row"><span>Border</span><select id="scrapbook-border"><option value="simple">Simple</option><option value="double">Double</option><option value="dashed">Dashed</option><option value="bold">Bold</option></select></label></fieldset><fieldset><legend>Stickers</legend><div class="scrapbook-sticker-palette">'+stickerChoices.map(function(sticker){return '<button class="btn scrapbook-sticker-choice" data-sticker="'+escapeHtml(sticker)+'" title="Add or remove '+escapeHtml(sticker)+'">'+escapeHtml(sticker)+'</button>';}).join('')+'</div></fieldset><fieldset><legend>Notes</legend><textarea id="scrapbook-note" maxlength="500" placeholder="Write a note for the top of your scrapbook…"></textarea><button class="btn" id="scrapbook-add-note" style="margin-top:6px">Add Note</button><div class="scrapbook-note-list" id="scrapbook-note-list"></div></fieldset></div><div class="scrapbook-preview-pane"><div class="scrapbook-page-mini" id="scrapbook-page-mini"><div class="scrapbook-mini-header"><div class="scrapbook-mini-title"></div><div>DesktopDiary Scrapbook</div><div class="scrapbook-mini-stickers"></div></div><div class="scrapbook-mini-notes"></div><div class="scrapbook-mini-card"><b>Diary entry</b><hr>Memories, photos, drawings, and posts appear here.</div><div class="scrapbook-mini-card"><b>Mood &amp; status history</b></div></div></div></div><div class="scrapbook-editor-actions"><button class="btn" id="scrapbook-restore">Restore…</button><span><button class="btn" id="scrapbook-preview">Full Preview</button><button class="btn" id="scrapbook-create">Save Scrapbook…</button></span><input id="scrapbook-file" type="file" accept=".html,text/html" hidden></div></div></div>';
    var fontEditor='<fieldset><legend>Fonts</legend><label class="scrapbook-control-row"><span>Text</span><select id="scrapbook-font"><option value="system">System</option><option value="arial">Arial</option><option value="georgia">Georgia</option><option value="courier">Courier New</option><option value="trebuchet">Trebuchet</option><option value="verdana">Verdana</option><option value="times">Times New Roman</option></select></label><label class="scrapbook-control-row"><span>Headings</span><select id="scrapbook-heading-font"><option value="system">System</option><option value="arial">Arial</option><option value="georgia">Georgia</option><option value="courier">Courier New</option><option value="trebuchet">Trebuchet</option><option value="verdana">Verdana</option><option value="times">Times New Roman</option></select></label><label class="scrapbook-control-row"><span>Text Size</span><select id="scrapbook-font-size"><option value="small">Small</option><option value="medium">Standard</option><option value="large">Large</option></select></label></fieldset>';
    body=body.replace('</fieldset><fieldset><legend>Stickers</legend>', '</fieldset>'+fontEditor+'<fieldset><legend>Stickers</legend>');
    createWindow({title:'Scrapbook Editor',extraClass:'scrapbook-editor-win',bodyHtml:body,type:'scrapbook',onMount:function(el){
      var working=JSON.parse(JSON.stringify(state.scrapbook)),fi=el.querySelector('#scrapbook-file'),bg=el.querySelector('#scrapbook-bg'),color=el.querySelector('#scrapbook-color'),pattern=el.querySelector('#scrapbook-pattern'),border=el.querySelector('#scrapbook-border'),noteInput=el.querySelector('#scrapbook-note'),mini=el.querySelector('#scrapbook-page-mini');
      var bodyFont=el.querySelector('#scrapbook-font'),headingFont=el.querySelector('#scrapbook-heading-font'),fontSize=el.querySelector('#scrapbook-font-size');
      function backgroundInfo(){var presets={computer:['#f1f3f5','#cbd1d6'],paper:['#efe4cf','#d6c6a6'],blue:['#dcecf6','#aec8d9'],yellow:['#fff27a','#dbc943']};return presets[working.backgroundPreset]||[working.backgroundColor,'#00000022'];}
      function borderCss(){return {simple:'1px solid #9da6af',double:'4px double #77818b',dashed:'2px dashed #89939d',bold:'3px solid #59636d'}[working.border]||'1px solid #9da6af';}
      function fontCss(key){return {system:'-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',arial:'Arial,sans-serif',georgia:'Georgia,serif',courier:'"Courier New",monospace',trebuchet:'"Trebuchet MS",Arial,sans-serif',verdana:'Verdana,Arial,sans-serif',times:'"Times New Roman",serif'}[key]||'Arial,sans-serif';}
      function saveDesign(){state.scrapbook=JSON.parse(JSON.stringify(working));saveState();render();}
      function renderNotes(){var list=el.querySelector('#scrapbook-note-list');list.innerHTML=working.notes.map(function(note){return '<div class="scrapbook-note-row"><span>'+escapeHtml(note.text)+'</span><button class="btn" data-remove-note="'+escapeHtml(note.id)+'" title="Remove note">×</button></div>';}).join('');list.querySelectorAll('[data-remove-note]').forEach(function(button){button.onclick=function(){working.notes=working.notes.filter(function(note){return note.id!==button.dataset.removeNote;});saveDesign();};});}
      function render(){var info=backgroundInfo();bg.value=working.backgroundPreset;color.value=working.backgroundColor;pattern.value=working.backgroundPattern;border.value=working.border;bodyFont.value=working.fontFamily;headingFont.value=working.headingFont;fontSize.value=working.fontSize;color.disabled=working.backgroundPreset!=='custom';mini.style.setProperty('--sb-bg',info[0]);mini.style.setProperty('--sb-line',info[1]);mini.style.setProperty('--sb-border',borderCss());mini.style.setProperty('--sb-font',fontCss(working.fontFamily));mini.style.setProperty('--sb-heading-font',fontCss(working.headingFont));mini.style.setProperty('--sb-font-size',{small:'9px',medium:'10px',large:'12px'}[working.fontSize]||'10px');mini.classList.toggle('dots',working.backgroundPattern==='dots');mini.classList.toggle('grid',working.backgroundPattern==='grid');mini.querySelector('.scrapbook-mini-title').textContent=((state.account&&state.account.screenName)||'DesktopDiary')+'’s Scrapbook';mini.querySelector('.scrapbook-mini-stickers').textContent=working.stickers.join(' ');mini.querySelector('.scrapbook-mini-notes').innerHTML=working.notes.slice(0,4).map(function(note){return '<div class="scrapbook-mini-note">'+escapeHtml(note.text)+'</div>';}).join('');el.querySelectorAll('[data-sticker]').forEach(function(button){button.classList.toggle('selected',working.stickers.indexOf(button.dataset.sticker)>-1);});renderNotes();}
      bg.onchange=function(){working.backgroundPreset=bg.value;saveDesign();};color.oninput=function(){working.backgroundColor=color.value;working.backgroundPreset='custom';saveDesign();};pattern.onchange=function(){working.backgroundPattern=pattern.value;saveDesign();};border.onchange=function(){working.border=border.value;saveDesign();};bodyFont.onchange=function(){working.fontFamily=bodyFont.value;saveDesign();};headingFont.onchange=function(){working.headingFont=headingFont.value;saveDesign();};fontSize.onchange=function(){working.fontSize=fontSize.value;saveDesign();};
      el.querySelectorAll('[data-sticker]').forEach(function(button){button.onclick=function(){var sticker=button.dataset.sticker,index=working.stickers.indexOf(sticker);if(index>-1)working.stickers.splice(index,1);else if(working.stickers.length<12)working.stickers.push(sticker);saveDesign();};});
      el.querySelector('#scrapbook-add-note').onclick=function(){var text=noteInput.value.trim();if(!text)return;if(working.notes.length>=20){openInfoWindow('A scrapbook can hold up to 20 notes.');return;}working.notes.push({id:uid(),text:text.slice(0,500)});noteInput.value='';saveDesign();};
      noteInput.onkeydown=function(e){if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();el.querySelector('#scrapbook-add-note').click();}};
      el.querySelector('#scrapbook-preview').onclick=function(){previewScrapbook(state);};el.querySelector('#scrapbook-create').onclick=function(){downloadScrapbook(state);};el.querySelector('#scrapbook-restore').onclick=function(){fi.click();};fi.onchange=function(){restoreFromScrapbookFile(fi.files&&fi.files[0]);fi.value='';};render();
    }});
  }

  function exportConversation(buddyId, buddyName){
    var fullList = state.entries[buddyId] || [];
    var lockedCount = fullList.filter(function(e){ return e.locked; }).length;

    function proceed(includeLocked){
      var list = fullList.filter(function(e){ return includeLocked || !e.locked; });
      if(!list.length){ openInfoWindow('Nothing to export yet.'); return; }
      generateConversationPDF(list, buddyName);
    }

    if(lockedCount > 0){
      appConfirm('This conversation has ' + lockedCount + ' locked ' + (lockedCount === 1 ? 'entry' : 'entries') + '. Include ' + (lockedCount === 1 ? 'it' : 'them') + ' in the export?', function(includeYes){
        if(includeYes){
          appPasscodePrompt(function(ok){ proceed(!!ok); });
        } else {
          proceed(false);
        }
      });
    } else {
      proceed(false);
    }
  }

  function generateConversationPDF(list, buddyName){
    var entriesHtml = list.map(function(e){
      var sender = e.kind === 'prompt' ? 'Prompt' : (e.author || state.account.screenName);
      var content = (e.html !== undefined) ? e.html : escapeHtml(e.text || '');
      return '<div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #ddd;">' +
        '<div style="font-size:11px;color:#666;margin-bottom:4px;"><b>' + escapeHtml(sender) + '</b> &middot; ' + fmtDayDivider(e.ts) + ' ' + fmtTime(e.ts) + '</div>' +
        '<div style="font-size:14px;line-height:1.5;">' + content + '</div>' +
      '</div>';
    }).join('');

    var printHtml =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(buddyName) + ' Export</title>' +
      '<style>' +
        'body{font-family:Georgia,serif;padding:24px;color:#222;}' +
        'h1{font-size:20px;margin:0 0 2px;}' +
        '.meta{font-size:11px;color:#888;margin-bottom:20px;}' +
        'img{max-width:100%;}' +
        '@media print{ body{padding:0;} }' +
      '</style>' +
      '</head><body>' +
        '<h1>' + escapeHtml(buddyName) + '</h1>' +
        '<div class="meta">Exported ' + escapeHtml(new Date().toLocaleString()) + '</div>' +
        entriesHtml +
      '</body></html>';

    var iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    var doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printHtml);
    doc.close();

    function cleanup(){ if(iframe.parentNode) iframe.parentNode.removeChild(iframe); }
    iframe.onload = function(){
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
    try{ iframe.contentWindow.addEventListener('afterprint', cleanup); }catch(e){}
    setTimeout(cleanup, 60000);
  }

  function renderLog(buddyId){
    var el = document.getElementById('log-'+buddyId);
    if(!el) return;
    var fullList = state.entries[buddyId] || [];
    var typeFilter = logFilterByBuddy[buddyId] || null;
    var query = searchQueryByBuddy[buddyId] || '';
    var list = fullList.filter(function(e){
      if(!entryMatchesTypeFilter(e, typeFilter)) return false;
      if(!entryMatchesSearch(e, query)) return false;
      return true;
    });
    var html = '';
    var lastDay = null;
    list.forEach(function(entry){
      var divider = fmtDayDivider(entry.ts);
      if(divider !== lastDay){
        html += '<div class="im-day-divider">&mdash; ' + divider + ' &mdash;</div>';
        lastDay = divider;
      }
      var isPrompt = entry.kind === 'prompt';
      var sender = isPrompt ? 'Prompt' : escapeHtml(entry.author || state.account.screenName);
      var content = (entry.html !== undefined) ? entry.html : escapeHtml(entry.text || '');
      var statusTag = entry.statusLabel !== undefined
        ? ('<span class="status-tag">Status' + (entry.statusLabel ? ': ' + escapeHtml(entry.statusLabel) : '') + '</span><br>')
        : '';
      var txtStyle = entry.bg ? (' style="background:' + escapeHtml(entry.bg) + '; padding:4px 6px; border-radius:4px;"') : '';
      html += '<div class="im-entry' + (isPrompt ? ' prompt-entry' : '') + '" data-entry-id="' + entry.id + '">' +
                '<span class="who' + (isPrompt ? ' prompt-who' : '') + '">' + sender + '</span> ' +
                '<span class="ts">(' + fmtTime(entry.ts) + '):</span> ' +
                '<span class="entry-actions">' +
                  '<span class="entry-action" data-action="edit">' + iconSVG('pencil') + '</span>' +
                  '<span class="entry-action" data-action="delete">' + iconSVG('trash') + '</span>' +
                '</span>' +
                (entry.locked
                  ? '<div class="txt locked-content"' + txtStyle + '>' + statusTag + content + '</div>'
                  : '<div class="txt"' + txtStyle + '>' + statusTag + content + '</div>') +
              '</div>';
    });
    if(!list.length){
      html = '<div class="im-day-divider">No entries yet &mdash; write the first one below.</div>';
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  function sendFromIM(buddyId){
    var input = document.getElementById('input-'+buddyId);
    if(!input) return;
    if(isRichEmpty(input)) return;
    var html = sanitizeHTML(input.innerHTML);
    var entry = { id: uid(), html: html, ts: Date.now(), kind: 'entry', author: state.account.screenName };
    state.entries[buddyId] = state.entries[buddyId] || [];
    state.entries[buddyId].push(entry);
    saveState();
    input.innerHTML = '';
    renderLog(buddyId);
    renderStats(buddyId);
    renderBuddyList();
    playDing();
  }

  function insertPromptMessage(buddyId){
    var p = WRITING_PROMPTS[Math.floor(Math.random()*WRITING_PROMPTS.length)];
    state.entries[buddyId] = state.entries[buddyId] || [];
    state.entries[buddyId].push({ id: uid(), html: escapeHtml(p), ts: Date.now(), kind: 'prompt', author: state.account.screenName });
    saveState();
    renderLog(buddyId);
    renderStats(buddyId);
  }

