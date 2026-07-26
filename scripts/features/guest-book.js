  // ================= PROFILE GUEST BOOK =================
  var GUEST_BOOK_PAGE_CAPACITY=16;
  var GUEST_BOOK_UPLOAD_LIMIT=5*1024*1024;
  var GUEST_BOOK_UPLOAD_DATA_LIMIT=320000;

  function guestBookOwnHandle(){
    var online=(state.mail&&state.mail.onlineAddress)||'';
    var local=(state.mail&&state.mail.address)||'';
    return String(online||local||'').trim().toLowerCase().split('@')[0];
  }

  function guestBookStickerFiles(){
    if(typeof DTD_STICKER_FILES!=='undefined'&&Array.isArray(DTD_STICKER_FILES))return DTD_STICKER_FILES.slice();
    var files=[];for(var i=1;i<=495;i++)files.push('stickers/s'+String(i).padStart(2,'0')+'.png');return files;
  }

  function guestBookDate(value){
    var d=new Date(value||Date.now());
    return d.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
  }

  function guestBookGiftLabel(gift){
    if(gift==='flower')return'Left a flower';
    if(gift==='treat')return'Brought your companion a treat';
    if(gift==='mystery')return'Left a mystery present';
    return'';
  }

  function guestBookEntryImage(entry){
    return String(entry.sticker_upload||entry.sticker_source||'stickers/s58.png');
  }

  function guestBookDefaultSettings(){
    return{heading:'Sign My Guest Book',page_color:'#ffffff',font_key:'handwritten',font_color:'#222222',font_size:'large'};
  }

  function guestBookFontStack(key){
    if(key==='comic')return'DiaryComicSans, "Comic Sans MS", cursive';
    if(key==='artsy')return'DiaryEmoji, sans-serif';
    if(key==='minecraft')return'DiaryMinecraft, monospace';
    if(key==='oldenglish')return'DiaryOldEnglish, fantasy';
    if(key==='serif')return'Georgia, "Times New Roman", serif';
    if(key==='sans')return'Arial, Helvetica, sans-serif';
    if(key==='typewriter')return'"Courier New", Courier, monospace';
    return'"Comic Sans MS", "Trebuchet MS", cursive';
  }

  function openGuestBookCustomizer(ownerHandle,current,onSaved){
    var settings=Object.assign(guestBookDefaultSettings(),current||{});
    var body='<div class="win-body gb-customize-body">'+
      '<div class="gb-customize-row"><label class="gb-sign-label" for="gb-heading-input">Guest Book heading</label><input id="gb-heading-input" class="gb-customize-heading" maxlength="48" value="'+escapeHtml(settings.heading)+'"></div>'+
      '<div class="gb-customize-row"><label class="gb-sign-label" for="gb-page-color">Page color</label><input id="gb-page-color" class="gb-color-input" type="color" value="'+escapeHtml(settings.page_color)+'"></div>'+
      '<div class="gb-customize-row"><label class="gb-sign-label" for="gb-font-choice">Font</label><select id="gb-font-choice" class="gb-font-choice">'+
        '<option value="handwritten">Handwritten</option><option value="serif">Classic</option><option value="sans">Simple</option><option value="typewriter">Typewriter</option>'+
        '<option value="comic">Comic Sans</option><option value="artsy">Artsy Cypher</option>'+
        '<option value="minecraft">Minecraft</option><option value="oldenglish">Old English</option>'+
      '</select></div>'+
      '<div class="gb-customize-row"><label class="gb-sign-label" for="gb-font-color">Font color</label><input id="gb-font-color" class="gb-color-input" type="color" value="'+escapeHtml(settings.font_color)+'"></div>'+
      '<div class="gb-customize-row"><span class="gb-sign-label">Font size</span><div class="gb-choice-row gb-heading-size-row">'+
        '<button class="gb-choice" data-heading-size="small">Small</button><button class="gb-choice" data-heading-size="medium">Medium</button><button class="gb-choice" data-heading-size="large">Large</button>'+
      '</div></div>'+
      '<div class="gb-customize-preview"></div><div class="gb-sign-error"></div>'+
      '<div class="gb-sign-actions"><button class="btn gb-customize-cancel">Cancel</button><button class="btn gb-customize-save">Save Page</button></div>'+
    '</div>';
    createWindow({title:'Customize Guest Book',extraClass:'guest-book-customize-win',bodyHtml:body,type:'guestbookcustomize',onMount:function(el,id){
      var heading=el.querySelector('.gb-customize-heading'),pageColor=el.querySelector('#gb-page-color'),font=el.querySelector('.gb-font-choice'),fontColor=el.querySelector('#gb-font-color'),preview=el.querySelector('.gb-customize-preview'),error=el.querySelector('.gb-sign-error'),fontSize=settings.font_size;
      font.value=settings.font_key;
      el.querySelectorAll('[data-heading-size]').forEach(function(button){
        button.classList.toggle('is-selected',button.dataset.headingSize===fontSize);
        button.onclick=function(){fontSize=button.dataset.headingSize;el.querySelectorAll('[data-heading-size]').forEach(function(b){b.classList.toggle('is-selected',b===button);});updatePreview();};
      });
      function updatePreview(){
        preview.textContent=heading.value.trim()||'Sign My Guest Book';
        preview.style.backgroundColor=pageColor.value;
        preview.style.color=fontColor.value;
        preview.style.fontFamily=guestBookFontStack(font.value);
        preview.classList.remove('gb-font-small','gb-font-medium','gb-font-large');
        preview.classList.add('gb-font-'+fontSize);
      }
      [heading,pageColor,font,fontColor].forEach(function(input){input.addEventListener('input',updatePreview);input.addEventListener('change',updatePreview);});
      el.querySelector('.gb-customize-cancel').onclick=function(){closeWindow(id);};
      el.querySelector('.gb-customize-save').onclick=function(){
        var next={heading:(heading.value.trim()||'Sign My Guest Book').slice(0,48),page_color:pageColor.value,font_key:font.value,font_color:fontColor.value,font_size:fontSize};
        error.textContent='Saving…';
        supabaseRpc('save_dtd_guestbook_settings',{
          requested_handle:ownerHandle,
          heading_text:next.heading,
          selected_page_color:next.page_color,
          selected_font_key:next.font_key,
          selected_font_color:next.font_color,
          selected_font_size:next.font_size
        }).then(function(){closeWindow(id);onSaved(next);}).catch(function(err){error.textContent=err.message||'The page could not be saved.';});
      };
      updatePreview();
    }});
  }

  function openGuestBookNote(entry,ownerHandle,onRemoved){
    var gift=guestBookGiftLabel(entry.gift_choice);
    var ownHandle=guestBookOwnHandle(),canRemove=ownHandle&&(ownHandle===ownerHandle||ownHandle===String(entry.signer_handle||'').toLowerCase());
    var body='<div class="win-body gb-note-card">'+
      '<img class="gb-note-stamp" src="'+escapeHtml(guestBookEntryImage(entry))+'" alt="">'+
      '<div class="gb-note-name">'+escapeHtml(entry.signer_display_name||entry.signer_handle||'Guest')+'</div>'+
      '<div class="gb-note-date">'+escapeHtml(guestBookDate(entry.created_at))+'</div>'+
      '<div class="gb-note-message">'+escapeHtml(entry.message_text||((entry.signer_display_name||entry.signer_handle||'Guest')+' was here!'))+'</div>'+
      (gift?'<div class="gb-note-gift">&#127873; '+escapeHtml(gift)+'</div>':'')+
      (canRemove?'<div class="gb-note-actions"><span class="forgot-link gb-note-remove">Remove signing</span></div>':'')+
      '</div>';
    createWindow({title:'Guest Book Note',extraClass:'guest-book-note-win',bodyHtml:body,type:'guestbooknote',onMount:function(el,id){
      var remove=el.querySelector('.gb-note-remove');
      if(remove)remove.onclick=function(){
        appConfirm('Remove this guest-book signing?',function(ok){
          if(!ok)return;
          supabaseRpc('remove_dtd_guestbook_signing',{signing_id:entry.signing_id}).then(function(){closeWindow(id);if(onRemoved)onRemoved();}).catch(function(err){openInfoWindow(err.message);});
        });
      };
    }});
  }

  function guestBookNormalizeRows(rows){
    if(!Array.isArray(rows))return[];
    return rows.filter(function(row){return row&&row.signing_id;}).map(function(row){
      row.page_no=Math.max(1,Number(row.page_no)||1);
      row.sticker_x=Math.max(5,Math.min(95,Number(row.sticker_x)||50));
      row.sticker_y=Math.max(7,Math.min(93,Number(row.sticker_y)||50));
      row.sticker_rotation=Math.max(-180,Math.min(180,Number(row.sticker_rotation)||0));
      row.sticker_size=/^(small|medium|large)$/.test(row.sticker_size)?row.sticker_size:'medium';
      return row;
    });
  }

  function openGuestBookWindow(ownerHandle,displayName,canSign){
    ownerHandle=String(ownerHandle||'').trim().toLowerCase();
    if(!ownerHandle){openInfoWindow('Set up your online DesktopDiary address before opening your Guest Book.');return;}
    var existing=openWindows.find(function(w){return w.type==='guestbook'&&w.dtdHandle===ownerHandle;});
    if(existing){focusWindow(existing.id);return;}
    createWindow({
      title:(displayName||ownerHandle)+'\'s Guest Book',
      extraClass:'guest-book-win',
      bodyHtml:'<div class="win-body"><div class="gb-loading">Opening the Guest Book…</div></div>',
      type:'guestbook',
      onMount:function(el){
        var record=openWindows.find(function(w){return w.el===el;});if(record)record.dtdHandle=ownerHandle;
        var rows=[],visiblePage=1,settings=guestBookDefaultSettings();
        function load(){
          return Promise.all([
            supabaseRpc('get_dtd_guestbook',{requested_handle:ownerHandle}),
            supabaseRpc('get_dtd_guestbook_settings',{requested_handle:ownerHandle}).catch(function(){return guestBookDefaultSettings();})
          ]).then(function(found){
            rows=guestBookNormalizeRows(found[0]);
            settings=Object.assign(guestBookDefaultSettings(),found[1]||{});
            visiblePage=rows.length?Math.max.apply(null,rows.map(function(row){return row.page_no;})):1;
            render();
          }).catch(function(err){
            el.querySelector('.win-body').innerHTML='<div class="gb-shell"><div class="gb-error">'+escapeHtml(err.message||'The Guest Book could not be opened.')+'</div></div>';
          });
        }
        function render(){
          var storedMaxPage=rows.length?Math.max.apply(null,rows.map(function(row){return row.page_no;})):1;
          var maxPage=Math.max(storedMaxPage,visiblePage);
          visiblePage=Math.max(1,Math.min(maxPage,visiblePage));
          var pageRows=rows.filter(function(row){return row.page_no===visiblePage;});
          var stickers=pageRows.map(function(entry){
            var own=String(entry.signer_handle||'').toLowerCase()===guestBookOwnHandle();
            return '<button class="gb-sticker gb-size-'+entry.sticker_size+(own?' is-own':'')+'" data-signing-id="'+escapeHtml(entry.signing_id)+'" style="left:'+entry.sticker_x+'%;top:'+entry.sticker_y+'%;--gb-rotation:'+entry.sticker_rotation+'deg" title="Open '+escapeHtml(entry.signer_display_name||entry.signer_handle||'guest')+'\'s note"><img src="'+escapeHtml(guestBookEntryImage(entry))+'" alt=""></button>';
          }).join('');
          var newest=visiblePage===maxPage;
          var ownBook=ownerHandle===guestBookOwnHandle();
          var pageStyle='background-color:'+escapeHtml(settings.page_color)+';color:'+escapeHtml(settings.font_color)+';font-family:'+escapeHtml(guestBookFontStack(settings.font_key));
          var body='<div class="gb-shell">'+
            '<div class="gb-toolbar"><div class="gb-title">'+escapeHtml(settings.heading||'Sign My Guest Book')+'</div><div class="gb-toolbar-actions">'+
              (ownBook?'<button class="btn gb-customize-button">Customize Page</button>':'')+
              (canSign&&newest?'<button class="btn gb-sign-button">Sign My Guest Book!</button>':'')+
            '</div></div>'+
            '<div class="gb-paper-stack gb-stack-'+Math.min(3,maxPage)+'"><div class="gb-page gb-font-'+escapeHtml(settings.font_size)+'" data-page="'+visiblePage+'" style="'+pageStyle+'"><div class="gb-page-heading">'+escapeHtml(settings.heading||'Sign My Guest Book')+'</div>'+
              (!pageRows.length?'<div class="gb-empty">Be the first E-Buddy to sign this guest book!</div>':'')+stickers+
            '</div></div>'+
            '<div class="gb-page-nav"><button class="btn gb-newer" '+(newest?'disabled':'')+'>&larr; Newer Page</button><span class="gb-page-count">Page '+visiblePage+' of '+maxPage+'</span><button class="btn gb-older" '+(visiblePage<=1?'disabled':'')+'>Older Page &rarr;</button></div>'+
          '</div>';
          el.querySelector('.win-body').outerHTML='<div class="win-body">'+body+'</div>';
          wire();
        }
        function wire(){
          var newer=el.querySelector('.gb-newer'),older=el.querySelector('.gb-older');
          if(newer)newer.onclick=function(){visiblePage++;render();};
          if(older)older.onclick=function(){visiblePage--;render();};
          var sign=el.querySelector('.gb-sign-button');
          if(sign)sign.onclick=function(){openGuestBookSigner(ownerHandle,displayName,function(draft){beginPlacement(draft);});};
          var customize=el.querySelector('.gb-customize-button');
          if(customize)customize.onclick=function(){openGuestBookCustomizer(ownerHandle,settings,function(next){settings=next;render();});};
          el.querySelectorAll('.gb-sticker[data-signing-id]').forEach(function(button){
            button.onclick=function(){var entry=rows.find(function(row){return String(row.signing_id)===button.dataset.signingId;});if(entry)openGuestBookNote(entry,ownerHandle,load);};
          });
        }
        function beginPlacement(draft){
          visiblePage=rows.length?Math.max.apply(null,rows.map(function(row){return row.page_no;})):1;
          var onPage=rows.filter(function(row){return row.page_no===visiblePage;});
          if(onPage.length>=GUEST_BOOK_PAGE_CAPACITY)visiblePage++;
          render();
          var page=el.querySelector('.gb-page');
          if(!page)return;
          var empty=page.querySelector('.gb-empty');if(empty)empty.remove();
          el.querySelectorAll('.gb-sign-button').forEach(function(button){button.disabled=true;});
          attachGuestBookPlacement(page,draft,ownerHandle,function(){
            el.querySelector('.win-body').innerHTML='<div class="gb-loading">Saving your signing…</div>';
            supabaseRpc('sign_dtd_guestbook',{
              requested_owner_handle:ownerHandle,
              note_text:draft.note,
              selected_sticker_source:draft.source||'',
              uploaded_sticker_data:draft.upload||'',
              uploaded_sticker_shape:draft.shape||'',
              selected_sticker_size:draft.size,
              sticker_x_percent:draft.x,
              sticker_y_percent:draft.y,
              sticker_rotation_degrees:draft.rotation,
              selected_gift:draft.gift||''
            }).then(load).catch(function(err){openInfoWindow(err.message);load();});
          },function(){visiblePage=rows.length?Math.max.apply(null,rows.map(function(row){return row.page_no;})):1;render();});
        }
        el._refreshGuestBook=load;
        load();
      }
    });
  }

  function attachGuestBookPlacement(page,draft,ownerHandle,onFinish,onCancel){
    draft.x=50;draft.y=52;draft.rotation=-6;
    var sticker=document.createElement('div');
    sticker.className='gb-sticker gb-draft-sticker gb-size-'+draft.size;
    sticker.style.left=draft.x+'%';sticker.style.top=draft.y+'%';sticker.style.setProperty('--gb-rotation',draft.rotation+'deg');
    sticker.innerHTML='<span class="gb-rotate-handle" title="Drag to rotate">&#8635;</span><img src="'+escapeHtml(draft.upload||draft.source)+'" alt="Your guest-book sticker">';
    page.appendChild(sticker);
    var panel=document.createElement('div');panel.className='gb-placement-panel';panel.innerHTML='<button class="btn gb-placement-cancel">Cancel</button><button class="btn gb-placement-finish">Finish</button>';page.appendChild(panel);
    var help=document.createElement('div');help.className='gb-placement-help';help.textContent='Drag your sticker anywhere on the page. Use the round handle to rotate it.';page.appendChild(help);
    function update(){
      sticker.style.left=draft.x+'%';sticker.style.top=draft.y+'%';sticker.style.setProperty('--gb-rotation',draft.rotation+'deg');
    }
    function pointerPosition(ev){
      var rect=page.getBoundingClientRect();
      return{x:(ev.clientX-rect.left)/rect.width*100,y:(ev.clientY-rect.top)/rect.height*100,rect:rect};
    }
    sticker.addEventListener('pointerdown',function(ev){
      if(ev.target.closest('.gb-rotate-handle'))return;
      ev.preventDefault();sticker.setPointerCapture(ev.pointerId);
      function move(moveEv){var p=pointerPosition(moveEv);draft.x=Math.max(4,Math.min(96,p.x));draft.y=Math.max(6,Math.min(94,p.y));update();}
      function up(){sticker.removeEventListener('pointermove',move);sticker.removeEventListener('pointerup',up);sticker.removeEventListener('pointercancel',up);}
      sticker.addEventListener('pointermove',move);sticker.addEventListener('pointerup',up);sticker.addEventListener('pointercancel',up);
    });
    sticker.querySelector('.gb-rotate-handle').addEventListener('pointerdown',function(ev){
      ev.preventDefault();ev.stopPropagation();var handle=ev.currentTarget;handle.setPointerCapture(ev.pointerId);
      function move(moveEv){var rect=sticker.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;draft.rotation=Math.round(Math.atan2(moveEv.clientY-cy,moveEv.clientX-cx)*180/Math.PI+90);update();}
      function up(){handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);}
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
    });
    panel.querySelector('.gb-placement-cancel').onclick=function(){if(onCancel)onCancel();};
    panel.querySelector('.gb-placement-finish').onclick=function(){onFinish();};
  }

  function openGuestBookSigner(ownerHandle,displayName,onReady){
    var files=guestBookStickerFiles(),pageIndex=0,pageSize=40,selected=files[0]||'stickers/s58.png',uploaded='',shape='',size='medium',gift='';
    var body='<div class="win-body gb-sign-body">'+
      '<p class="gb-sign-intro">Write a note, choose a sticker, then place it anywhere on '+escapeHtml(displayName||ownerHandle)+'\'s newest Guest Book page.</p>'+
      '<div class="gb-sign-row"><label class="gb-sign-label" for="gb-note-input">Note (optional)</label><textarea class="gb-note-input" id="gb-note-input" maxlength="180" placeholder="'+escapeHtml(((state.account&&state.account.screenName)||'Guest')+' was here!')+'"></textarea></div>'+
      '<div class="gb-sign-row"><span class="gb-sign-label">Choose your sticker</span><div class="gb-sticker-source-tabs"><button class="btn gb-built-in-tab">Built-in Stickers</button><button class="btn gb-upload-button">Upload Your Own…</button></div></div>'+
      '<div class="gb-picker"><div class="gb-picker-grid"></div><div class="gb-picker-nav"><button class="btn gb-picker-prev">&larr;</button><span class="gb-picker-page"></span><button class="btn gb-picker-next">&rarr;</button></div></div>'+
      '<div class="gb-upload-summary"><img alt="Uploaded sticker preview"><div><b>Your uploaded sticker</b><div style="margin-top:5px"><button class="btn gb-change-upload">Adjust or replace…</button></div></div></div>'+
      '<div class="gb-sign-row"><span class="gb-sign-label">Sticker size</span><div class="gb-choice-row gb-size-row"><button class="gb-choice" data-size="small">Small</button><button class="gb-choice is-selected" data-size="medium">Medium</button><button class="gb-choice" data-size="large">Large</button></div></div>'+
      '<div class="gb-sign-error"></div><div class="gb-sign-actions"><button class="btn gb-sign-cancel">Cancel</button><button class="btn gb-place-button">Place Sticker</button></div>'+
      '</div>';
    createWindow({title:'Sign My Guest Book!',extraClass:'guest-book-sign-win',bodyHtml:body,type:'guestbooksign',onMount:function(el,id){
      var picker=el.querySelector('.gb-picker'),summary=el.querySelector('.gb-upload-summary'),error=el.querySelector('.gb-sign-error');
      function renderPicker(){
        var pages=Math.max(1,Math.ceil(files.length/pageSize));pageIndex=Math.max(0,Math.min(pages-1,pageIndex));
        var slice=files.slice(pageIndex*pageSize,pageIndex*pageSize+pageSize);
        el.querySelector('.gb-picker-grid').innerHTML=slice.map(function(src){return '<button class="gb-picker-item'+(!uploaded&&src===selected?' is-selected':'')+'" data-src="'+escapeHtml(src)+'"><img src="'+escapeHtml(src)+'" alt=""></button>';}).join('');
        el.querySelector('.gb-picker-page').textContent=(pageIndex+1)+' / '+pages;
        el.querySelector('.gb-picker-prev').disabled=pageIndex===0;el.querySelector('.gb-picker-next').disabled=pageIndex>=pages-1;
        el.querySelectorAll('.gb-picker-item').forEach(function(button){button.onclick=function(){uploaded='';shape='';selected=button.dataset.src;summary.classList.remove('is-ready');picker.style.display='block';renderPicker();};});
      }
      function chooseUpload(){
        var input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.style.display='none';document.body.appendChild(input);
        input.onchange=function(){
          var file=input.files&&input.files[0];input.remove();if(!file)return;
          if(file.size>GUEST_BOOK_UPLOAD_LIMIT){error.textContent='Choose an image smaller than 5 MB.';return;}
          if(!/^image\/(png|jpeg|webp)$/i.test(file.type)){error.textContent='Choose a PNG, JPEG, or WebP image.';return;}
          var reader=new FileReader();reader.onload=function(event){
            var image=new Image();image.onload=function(){
              if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40000000){error.textContent='That picture is too large to process safely. Choose one under 40 megapixels.';return;}
              openGuestBookUploadEditor(image,function(result){uploaded=result.data;shape=result.shape;selected='';summary.querySelector('img').src=uploaded;summary.classList.add('is-ready');picker.style.display='none';error.textContent='';});
            };image.onerror=function(){error.textContent='That image could not be opened.';};image.src=event.target.result;
          };reader.readAsDataURL(file);
        };input.click();
      }
      el.querySelector('.gb-picker-prev').onclick=function(){pageIndex--;renderPicker();};
      el.querySelector('.gb-picker-next').onclick=function(){pageIndex++;renderPicker();};
      el.querySelector('.gb-built-in-tab').onclick=function(){picker.style.display='block';};
      el.querySelector('.gb-upload-button').onclick=chooseUpload;
      el.querySelector('.gb-change-upload').onclick=chooseUpload;
      el.querySelectorAll('[data-size]').forEach(function(button){button.onclick=function(){size=button.dataset.size;el.querySelectorAll('[data-size]').forEach(function(b){b.classList.toggle('is-selected',b===button);});};});
      el.querySelector('.gb-sign-cancel').onclick=function(){closeWindow(id);};
      el.querySelector('.gb-place-button').onclick=function(){
        if(!selected&&!uploaded){error.textContent='Choose a sticker first.';return;}
        var note=el.querySelector('.gb-note-input').value.trim();
        if(!note)note=((state.account&&state.account.screenName)||'Guest')+' was here!';
        closeWindow(id);onReady({note:note.slice(0,180),source:selected,upload:uploaded,shape:shape,size:size,gift:gift});
      };
      renderPicker();
    }});
  }

  function guestBookCanvasData(canvas){
    var quality=.9,data=canvas.toDataURL('image/webp',quality);
    while(data.length>GUEST_BOOK_UPLOAD_DATA_LIMIT&&quality>.45){quality-=.1;data=canvas.toDataURL('image/webp',quality);}
    if(!/^data:image\/webp/i.test(data))data=canvas.toDataURL('image/png');
    return data;
  }

  function openGuestBookUploadEditor(image,onDone){
    var shape='square',mode='fit',zoom=1,offsetX=0,offsetY=0,rotation=0;
    var body='<div class="win-body gb-upload-body">'+
      '<div class="gb-choice-row" style="justify-content:center"><button class="gb-choice is-selected" data-shape="square">Square</button><button class="gb-choice" data-shape="circle">Circle</button></div>'+
      '<div class="gb-upload-stage"><canvas class="gb-upload-canvas" width="420" height="420"></canvas></div>'+
      '<div class="gb-upload-controls"><span class="gb-sign-label">Zoom</span><input class="gb-upload-zoom" type="range" min="35" max="250" value="100">'+
        '<div class="gb-upload-actions"><button class="btn gb-upload-fit">Fit Entire Image</button><button class="btn gb-upload-fill">Fill Shape</button><button class="btn gb-upload-rotate">Rotate 90°</button><button class="btn gb-upload-reset">Reset</button></div>'+
        '<div class="gb-upload-help">Drag the image to reposition it. Zooming out adds white space so the whole picture can fit without being cropped.</div>'+
        '<div class="gb-sign-error"></div><div class="gb-sign-actions"><button class="btn gb-upload-cancel">Cancel</button><button class="btn gb-upload-use">Use This Sticker</button></div>'+
      '</div></div>';
    createWindow({title:'Make Your Sticker',extraClass:'guest-book-upload-win',bodyHtml:body,type:'guestbookupload',onMount:function(el,id){
      var canvas=el.querySelector('canvas'),ctx=canvas.getContext('2d'),zoomEl=el.querySelector('.gb-upload-zoom'),error=el.querySelector('.gb-sign-error');
      function orientedSize(){return rotation%180===0?{w:image.naturalWidth,h:image.naturalHeight}:{w:image.naturalHeight,h:image.naturalWidth};}
      function baseScale(){var s=orientedSize();return mode==='fill'?Math.max(384/s.w,384/s.h):Math.min(384/s.w,384/s.h);}
      function roundedSquarePath(context,x,y,w,h,r){
        context.beginPath();context.moveTo(x+r,y);context.arcTo(x+w,y,x+w,y+h,r);context.arcTo(x+w,y+h,x,y+h,r);context.arcTo(x,y+h,x,y,r);context.arcTo(x,y,x+w,y,r);context.closePath();
      }
      function shapePath(context,x,y,size){
        if(shape==='circle'){context.beginPath();context.arc(x+size/2,y+size/2,size/2,0,Math.PI*2);context.closePath();}
        else roundedSquarePath(context,x,y,size,size,9);
      }
      function render(){
        ctx.clearRect(0,0,420,420);ctx.save();shapePath(ctx,18,18,384);ctx.fillStyle='#fff';ctx.fill();ctx.clip();
        var s=orientedSize(),scale=baseScale()*zoom,dw=s.w*scale,dh=s.h*scale;
        ctx.translate(210+offsetX,210+offsetY);ctx.rotate(rotation*Math.PI/180);
        ctx.drawImage(image,-image.naturalWidth*scale/2,-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);
        ctx.restore();ctx.save();shapePath(ctx,18,18,384);ctx.strokeStyle='#fff';ctx.lineWidth=16;ctx.stroke();ctx.restore();
      }
      function reset(nextMode){mode=nextMode||'fit';zoom=1;offsetX=0;offsetY=0;zoomEl.value='100';render();}
      el.querySelectorAll('[data-shape]').forEach(function(button){button.onclick=function(){shape=button.dataset.shape;el.querySelectorAll('[data-shape]').forEach(function(b){b.classList.toggle('is-selected',b===button);});render();};});
      zoomEl.oninput=function(){zoom=Number(zoomEl.value)/100;render();};
      el.querySelector('.gb-upload-fit').onclick=function(){reset('fit');};
      el.querySelector('.gb-upload-fill').onclick=function(){reset('fill');};
      el.querySelector('.gb-upload-rotate').onclick=function(){rotation=(rotation+90)%360;offsetX=0;offsetY=0;render();};
      el.querySelector('.gb-upload-reset').onclick=function(){rotation=0;reset('fit');};
      canvas.addEventListener('pointerdown',function(ev){
        ev.preventDefault();canvas.setPointerCapture(ev.pointerId);var startX=ev.clientX,startY=ev.clientY,baseX=offsetX,baseY=offsetY,rect=canvas.getBoundingClientRect(),ratio=420/rect.width;
        function move(moveEv){offsetX=baseX+(moveEv.clientX-startX)*ratio;offsetY=baseY+(moveEv.clientY-startY)*ratio;render();}
        function up(){canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}
        canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
      });
      el.querySelector('.gb-upload-cancel').onclick=function(){closeWindow(id);};
      el.querySelector('.gb-upload-use').onclick=function(){
        var data=guestBookCanvasData(canvas);
        if(data.length>GUEST_BOOK_UPLOAD_DATA_LIMIT){error.textContent='This image is still too detailed to use. Try zooming out or choosing a simpler image.';return;}
        closeWindow(id);onDone({data:data,shape:shape});
      };
      render();
    }});
  }

  function openOwnDtdGuestBook(){
    var handle=guestBookOwnHandle();
    if(handle){openGuestBookWindow(handle,(state.account&&state.account.screenName)||handle,false);return;}
    if(!getSupabaseSession()){openInfoWindow('Connect your DesktopDiary account online and reserve a Post Mail address first.');return;}
    ensureSupabaseSession().then(function(session){
      return supabaseRestRequest('dtd_profiles?select=handle,display_name&user_id=eq.'+encodeURIComponent(session.user.id)+'&limit=1');
    }).then(function(rows){
      var profile=rows&&rows[0];if(!profile)throw new Error('Reserve your online DesktopDiary address in Post Mail first.');
      state.mail=state.mail||{};state.mail.onlineAddress=profile.handle+'@desktopdiary.local';saveState();
      openGuestBookWindow(profile.handle,profile.display_name||profile.handle,false);
    }).catch(function(err){openInfoWindow(err.message);});
  }
