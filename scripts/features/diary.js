  // ================= DIARY ENTRY EDITOR =================
  function normalizeDiaryStickerList(list){
    if(!Array.isArray(list)) return [];
    return list.filter(function(st){return st && isDtdStickerSrc(st.src||'');}).map(function(st,index){
      var size=Number(st.size),x=Number(st.x),y=Number(st.y),z=Number(st.zIndex);
      return {
        id:st.id||uid(),
        src:st.src,
        x:Number.isFinite(x)?Math.max(0,Math.min(92,x)):42,
        y:Number.isFinite(y)?Math.max(0,Math.min(88,y)):38,
        size:Number.isFinite(size)?Math.max(8,Math.min(40,size)):16,
        zIndex:Number.isFinite(z)?z:index+1,
        flipX:!!st.flipX
      };
    });
  }

  function renderDiaryPostContent(post){
    var html=(post&&post.html)||'',stickers=normalizeDiaryStickerList(post&&post.stickers);
    if(!stickers.length) return html;
    var placed=stickers.map(function(st){
      return '<img class="diary-saved-sticker" src="'+st.src+'" alt="sticker" draggable="false" style="left:'+st.x+'%;top:'+st.y+'%;width:'+st.size+'%;z-index:'+st.zIndex+';transform:'+(st.flipX?'scaleX(-1)':'none')+'">';
    }).join('');
    return '<div class="diary-rendered-entry"><div class="diary-rendered-text">'+html+'</div><div class="diary-rendered-sticker-layer">'+placed+'</div></div>';
  }

  function wireDiaryStickerCanvas(composeEl, initialStickers){
    var canvas=document.createElement('div'),layer=document.createElement('div'),stickers=normalizeDiaryStickerList(initialStickers),selectedId=null;
    canvas.className='diary-compose-canvas';
    layer.className='diary-compose-sticker-layer';
    composeEl.parentNode.insertBefore(canvas,composeEl);
    canvas.appendChild(composeEl);
    canvas.appendChild(layer);

    function nextLayer(){
      return stickers.reduce(function(max,st){return Math.max(max,Number(st.zIndex)||0);},0)+1;
    }
    function selectSticker(id){
      selectedId=id;
      Array.prototype.forEach.call(layer.querySelectorAll('.diary-placed-sticker'),function(el){
        el.classList.toggle('selected',el.dataset.stickerId===id);
      });
    }
    function render(){
      layer.innerHTML='';
      stickers.forEach(function(st){
        var wrap=document.createElement('div');
        wrap.className='diary-placed-sticker'+(st.id===selectedId?' selected':'');
        wrap.dataset.stickerId=st.id;
        wrap.style.left=st.x+'%';
        wrap.style.top=st.y+'%';
        wrap.style.width=st.size+'%';
        wrap.style.zIndex=st.zIndex;
        var img=document.createElement('img');
        img.src=st.src;img.alt='';img.draggable=false;
        img.style.transform=st.flipX?'scaleX(-1)':'';
        wrap.appendChild(img);
        var remove=document.createElement('button');
        remove.type='button';remove.className='diary-sticker-remove';remove.textContent='✕';remove.title='Remove sticker';
        remove.onclick=function(e){e.preventDefault();e.stopPropagation();stickers=stickers.filter(function(item){return item.id!==st.id;});selectedId=null;render();};
        wrap.appendChild(remove);
        var resize=document.createElement('button');
        resize.type='button';resize.className='diary-sticker-resize';resize.title='Drag to resize sticker';resize.setAttribute('aria-label','Resize sticker');
        wrap.appendChild(resize);

        wrap.addEventListener('click',function(e){e.stopPropagation();selectSticker(st.id);});
        wrap.addEventListener('dblclick',function(e){e.preventDefault();e.stopPropagation();st.flipX=!st.flipX;img.style.transform=st.flipX?'scaleX(-1)':'';});

        var dragging=false,dragPointer=null,startX=0,startY=0,startLeft=0,startTop=0;
        function dragMove(e){
          if(!dragging||e.pointerId!==dragPointer)return;
          e.preventDefault();
          var rect=canvas.getBoundingClientRect(),maxX=Math.max(0,100-st.size),maxY=Math.max(0,100-(wrap.offsetHeight/Math.max(1,rect.height))*100);
          st.x=Math.max(0,Math.min(maxX,startLeft+((e.clientX-startX)/rect.width)*100));
          st.y=Math.max(0,Math.min(maxY,startTop+((e.clientY-startY)/rect.height)*100));
          wrap.style.left=st.x+'%';wrap.style.top=st.y+'%';
        }
        function dragEnd(e){
          if(!dragging||(e&&e.pointerId!==dragPointer))return;
          dragging=false;dragPointer=null;wrap.classList.remove('dragging');
          window.removeEventListener('pointermove',dragMove);window.removeEventListener('pointerup',dragEnd);window.removeEventListener('pointercancel',dragEnd);
        }
        wrap.addEventListener('pointerdown',function(e){
          if(e.target===resize||e.target===remove)return;
          e.preventDefault();e.stopPropagation();selectSticker(st.id);
          st.zIndex=nextLayer();wrap.style.zIndex=st.zIndex;
          dragging=true;dragPointer=e.pointerId;startX=e.clientX;startY=e.clientY;startLeft=st.x;startTop=st.y;wrap.classList.add('dragging');
          window.addEventListener('pointermove',dragMove);window.addEventListener('pointerup',dragEnd);window.addEventListener('pointercancel',dragEnd);
        });

        var resizing=false,resizePointer=null,resizeStartX=0,resizeStartSize=0;
        function resizeMove(e){
          if(!resizing||e.pointerId!==resizePointer)return;
          e.preventDefault();e.stopPropagation();
          var rect=canvas.getBoundingClientRect();
          st.size=Math.max(8,Math.min(40,resizeStartSize+((e.clientX-resizeStartX)/rect.width)*100));
          wrap.style.width=st.size+'%';
        }
        function resizeEnd(e){
          if(!resizing||(e&&e.pointerId!==resizePointer))return;
          resizing=false;resizePointer=null;
          window.removeEventListener('pointermove',resizeMove);window.removeEventListener('pointerup',resizeEnd);window.removeEventListener('pointercancel',resizeEnd);
          if(e)e.stopPropagation();
        }
        resize.addEventListener('pointerdown',function(e){
          e.preventDefault();e.stopPropagation();selectSticker(st.id);
          st.zIndex=nextLayer();wrap.style.zIndex=st.zIndex;
          resizing=true;resizePointer=e.pointerId;resizeStartX=e.clientX;resizeStartSize=st.size;
          window.addEventListener('pointermove',resizeMove);window.addEventListener('pointerup',resizeEnd);window.addEventListener('pointercancel',resizeEnd);
        });
        layer.appendChild(wrap);
      });
    }
    canvas.addEventListener('pointerdown',function(e){if(e.target===canvas||e.target===composeEl)selectSticker(null);});
    composeEl._addFreeSticker=function(src){
      stickers.push({id:uid(),src:src,x:42,y:38,size:16,zIndex:nextLayer(),flipX:false});
      selectedId=stickers[stickers.length-1].id;
      render();
    };
    render();
    return {
      getStickers:function(){return normalizeDiaryStickerList(stickers);},
      setStickers:function(next){stickers=normalizeDiaryStickerList(next);selectedId=null;render();}
    };
  }

  function openBlogPostEditor(existingPost, onSave, initialHtml, initialStickers){
    var composeId = 'blog-compose-' + uid();
    var isEdit = !!existingPost;
    var body =
      '<div class="win-body nm-body">' +
        '<div class="field-row"><label>Title</label><input type="text" id="bp-title" value="'+escapeHtml(existingPost && existingPost.title ? existingPost.title : '')+'"></div>' +
        richComposeHtml(composeId, '', 'stickers') +
        '<div class="nm-send-row" style="margin-top:8px;">' +
          '<button class="btn" id="bp-save">'+(isEdit?'Save Changes':'Save Private Entry')+'</button>' +
        '</div>' +
        '<div class="draft-links"><span class="draft-save-link">Save Draft</span> &nbsp;|&nbsp; <span class="draft-view-link">Drafts</span></div>' +
        '<div class="diary-sticker-section"><div class="diary-sticker-label">Stickers</div><div class="diary-sticker-dock"></div></div>' +
      '</div>';
    createWindow({
      title: isEdit ? 'Edit Diary Entry' : 'New Diary Entry',
      extraClass: 'blog-win',
      bodyHtml: body,
      type: 'blogpost',
      onMount: function(el, id){
        var composeEl = el.querySelector('#'+composeId);
        wireRichToolbar(el, composeId);
        composeEl._mountStickerDock(el.querySelector('.diary-sticker-dock'));
        var stickerEditor=wireDiaryStickerCanvas(composeEl,existingPost&&existingPost.stickers||initialStickers||[]);
        var titleInput = el.querySelector('#bp-title');
        if(existingPost && existingPost.html) composeEl.innerHTML = existingPost.html;
        else if(!isEdit && initialHtml) composeEl.innerHTML = initialHtml;
        titleInput.focus();
        el.querySelector('#bp-save').addEventListener('click', function(){
          var title = titleInput.value.trim() || 'Untitled';
          var html = isRichEmpty(composeEl) ? '' : sanitizeHTML(composeEl.innerHTML);
          var stickers=stickerEditor.getStickers();
          if(!html && !title){ composeEl.focus(); return; }
          if(isEdit){
            existingPost.title = title;
            existingPost.html = html;
            existingPost.stickers = stickers;
            existingPost.editedAt = Date.now();
          } else {
            state.blogPosts = state.blogPosts || [];
            state.blogPosts.push({ id: uid(), title: title, html: html, stickers:stickers, ts: Date.now(), shared:false });
            trackDtdUsage('diary_entry_created');
          }
          saveState();
          if(onSave) onSave();
          closeWindow(id);
        });
        el.querySelector('.draft-save-link').addEventListener('click', function(){
          var draftStickers=stickerEditor.getStickers();
          if(isRichEmpty(composeEl)&&!draftStickers.length){ openInfoWindow('Nothing to save \u2014 the compose box is empty.'); return; }
          saveDraftFor('__blog__', sanitizeHTML(composeEl.innerHTML), null, {stickers:draftStickers});
          openInfoWindow('Draft saved.');
        });
        el.querySelector('.draft-view-link').addEventListener('click', function(){
          openDraftsListWindowFor('__blog__', 'Diary', function(html,draft){
            composeEl.innerHTML = html;
            stickerEditor.setStickers(draft&&draft.stickers);
            composeEl.focus();
          });
        });
      }
    });
  }

  function openAccountSettingsWindow(){
    var shownEmail=(state.account.pendingEmail||state.account.email||'');
    var body =
      '<div class="win-body nm-body">' +
        '<div class="field-row"><label>Screen Name</label><input type="text" id="acc-name" value="'+escapeHtml(state.account.screenName)+'"></div>' +
        '<div class="field-row"><label>Account Email</label><input type="email" id="acc-email" autocomplete="email" value="'+escapeHtml(shownEmail)+'">'+(state.account.pendingEmail?'<div style="margin-top:3px;color:#796400;font-size:9px">Waiting for confirmation at this new address.</div>':'')+'</div>' +
        '<div class="field-row"><label>New Password (optional)</label><input type="password" id="acc-newpw"></div>' +
        '<div class="field-row"><label>Confirm New Password</label><input type="password" id="acc-newpw2"></div>' +
        '<div class="field-row"><label>Current Password (required)</label><input type="password" id="acc-current"></div>' +
        '<div class="privacy-usage-box"><label><input type="checkbox" id="usage-identifiable-opt-in" checked disabled> Share identifiable feature feedback</label><div style="margin:5px 0 0 23px">Identifiable sharing is on by default for online accounts and can be turned off at any time. Desktop Diary records only an approved feature name, the server timestamp, and mobile/tablet/desktop. When this is off, no member ID is stored. When it is on, the database may attach your signed-in account ID so the administrator can understand which features members use. Diary text, letters, profile content, searches, drawings, and other private content are never sent.</div><div class="privacy-usage-status" id="usage-privacy-status" aria-live="polite">Loading identifiable sharing preference…</div></div>' +
        '<div class="signon-error" id="acc-error"></div>' +
        '<div class="nm-send-row"><button class="btn" id="acc-submit">Save Changes</button></div>' +
      '</div>';
    createWindow({
      title: 'Account Settings',
      extraClass: 'setup-win',
      bodyHtml: body,
      type: 'setup',
      onMount: function(el, id){
        var usageOptIn=el.querySelector('#usage-identifiable-opt-in'),usageStatus=el.querySelector('#usage-privacy-status');
        // The checkbox starts checked because accounts with no saved choice
        // default to identifiable sharing on. Explicit opt-outs remain off.
        // Its authoritative value comes only from the
        // private Supabase preference RPC, never from localStorage.
        if(!getSupabaseSession()){
          usageStatus.textContent='Identifiable sharing is off. Connect an online account to change it.';
        }else{
          supabaseRpc('get_dtd_usage_preference',{}).then(function(enabled){
            usageOptIn.checked=enabled===true;
            usageOptIn.disabled=false;
            usageStatus.style.color=enabled===true?'#237b31':'#666';
            usageStatus.textContent=enabled===true?'Identifiable feature feedback is on.':'Identifiable feature feedback is off.';
          }).catch(function(){
            usageOptIn.checked=false;
            usageStatus.textContent='Identifiable sharing remains off. Install the Usage Statistics SQL to enable this setting.';
          });
          usageOptIn.addEventListener('change',function(){
            var requested=usageOptIn.checked;
            usageOptIn.disabled=true;usageStatus.style.color='#555';usageStatus.textContent='Saving privacy setting…';
            supabaseRpc('set_dtd_usage_preference',{new_opt_in:requested}).then(function(saved){
              usageOptIn.checked=saved===true;
              usageStatus.style.color=saved===true?'#237b31':'#666';
              usageStatus.textContent=saved===true?'Identifiable feature feedback is on.':'Identifiable feature feedback is off. Earlier identifiers were removed.';
            }).catch(function(err){
              usageOptIn.checked=!requested;usageStatus.style.color='#c0392b';usageStatus.textContent=err.message;
            }).then(function(){usageOptIn.disabled=false;});
          });
        }
        el.querySelector('#acc-submit').addEventListener('click', function(){
          var errEl = el.querySelector('#acc-error');
          var submit=el.querySelector('#acc-submit');
          var newName = el.querySelector('#acc-name').value.trim();
          var newEmail = el.querySelector('#acc-email').value.trim().toLowerCase();
          var newPw = el.querySelector('#acc-newpw').value;
          var newPw2 = el.querySelector('#acc-newpw2').value;
          var current = el.querySelector('#acc-current').value;

          if(!current){ errEl.textContent = 'Enter your current password to make changes.'; return; }
          if(current !== state.account.password){ errEl.textContent = 'Current password is incorrect.'; return; }
          if(!newName){ errEl.textContent = 'Screen name can\'t be empty.'; return; }
          if(!/^\S+@\S+\.\S+$/.test(newEmail)){ errEl.textContent = 'Enter a valid account email.'; return; }
          if(newPw || newPw2){
            if(newPw !== newPw2){ errEl.textContent = 'New passwords do not match.'; return; }
            if(newPw.length<6){ errEl.textContent = 'New password must be at least 6 characters.'; return; }
          }
          var currentEmail=String(state.account.email||'').toLowerCase(),pendingEmail=String(state.account.pendingEmail||'').toLowerCase();
          var emailChanged=newEmail!==currentEmail&&newEmail!==pendingEmail;
          var session=getSupabaseSession(),payload={data:{screen_name:newName}};
          if(emailChanged)payload.email=newEmail;
          if(newPw)payload.password=newPw;
          submit.disabled=true;errEl.style.color='#555';errEl.textContent='Saving account changes…';
          var request=session?ensureSupabaseSession().then(function(fresh){return supabaseUserRequest('PUT',payload,fresh.access_token);}):Promise.resolve(null);
          request.then(function(user){
            if(newName!==state.account.screenName)state.screenNameUpdatedAt=Date.now();
            state.account.screenName=newName;
            if(newPw)state.account.password=newPw;
            if(emailChanged){
              if(!session||(user&&user.email&&user.email.toLowerCase()===newEmail))return adoptAuthenticatedEmail(newEmail).then(function(){return false;});
              state.account.pendingEmail=newEmail;
              return saveState().then(function(){return true;});
            }
            return saveState().then(function(){return !!state.account.pendingEmail;});
          }).then(function(waitingForEmail){
            document.getElementById('bl-title-text').textContent=state.account.screenName;
            document.getElementById('bl-me-name').textContent=state.account.screenName;
            syncDtdPublicProfile().catch(function(){});
            closeWindow(id);
            if(waitingForEmail)openInfoWindow('Check the new email address to confirm the change. Your current sign-in email remains active until confirmation.');
          }).catch(function(err){errEl.style.color='';errEl.textContent=err.message;submit.disabled=false;});
        });
      }
    });
  }
