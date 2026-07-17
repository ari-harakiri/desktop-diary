  // ================= DIARY ENTRY EDITOR =================
  function openBlogPostEditor(existingPost, onSave, initialHtml){
    var composeId = 'blog-compose-' + uid();
    var isEdit = !!existingPost;
    var body =
      '<div class="win-body nm-body">' +
        '<div class="field-row"><label>Title</label><input type="text" id="bp-title" value="'+escapeHtml(existingPost && existingPost.title ? existingPost.title : '')+'"></div>' +
        richComposeHtml(composeId, '') +
        '<div class="nm-send-row" style="margin-top:8px;">' +
          '<button class="btn" id="bp-save">'+(isEdit?'Save Changes':'Save Private Entry')+'</button>' +
        '</div>' +
        '<div class="draft-links"><span class="draft-save-link">Save Draft</span> &nbsp;|&nbsp; <span class="draft-view-link">Drafts</span></div>' +
      '</div>';
    createWindow({
      title: isEdit ? 'Edit Diary Entry' : 'New Diary Entry',
      extraClass: 'blog-win',
      bodyHtml: body,
      type: 'blogpost',
      onMount: function(el, id){
        wireRichToolbar(el, composeId);
        var composeEl = el.querySelector('#'+composeId);
        var titleInput = el.querySelector('#bp-title');
        if(existingPost && existingPost.html) composeEl.innerHTML = existingPost.html;
        else if(!isEdit && initialHtml) composeEl.innerHTML = initialHtml;
        titleInput.focus();
        el.querySelector('#bp-save').addEventListener('click', function(){
          var title = titleInput.value.trim() || 'Untitled';
          var html = isRichEmpty(composeEl) ? '' : sanitizeHTML(composeEl.innerHTML);
          if(!html && !title){ composeEl.focus(); return; }
          if(isEdit){
            existingPost.title = title;
            existingPost.html = html;
            existingPost.editedAt = Date.now();
          } else {
            state.blogPosts = state.blogPosts || [];
            state.blogPosts.push({ id: uid(), title: title, html: html, ts: Date.now(), shared:false });
            trackDtdUsage('diary_entry_created');
          }
          saveState();
          if(onSave) onSave();
          closeWindow(id);
        });
        el.querySelector('.draft-save-link').addEventListener('click', function(){
          if(isRichEmpty(composeEl)){ openInfoWindow('Nothing to save \u2014 the compose box is empty.'); return; }
          saveDraftFor('__blog__', sanitizeHTML(composeEl.innerHTML));
          openInfoWindow('Draft saved.');
        });
        el.querySelector('.draft-view-link').addEventListener('click', function(){
          openDraftsListWindowFor('__blog__', 'Diary', function(html){
            composeEl.innerHTML = html;
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
        '<div class="privacy-usage-box"><label><input type="checkbox" id="usage-identifiable-opt-in" disabled> Share identifiable feature feedback</label><div style="margin:5px 0 0 23px">Desktop Diary records only an approved feature name, the server timestamp, and mobile/tablet/desktop. When this is off, no member ID is stored. When it is on, the database may attach your signed-in account ID so the administrator can understand which features members use. Diary text, letters, profile content, searches, drawings, and other private content are never sent.</div><div class="privacy-usage-status" id="usage-privacy-status" aria-live="polite">Identifiable sharing is off while this setting loads.</div></div>' +
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
        // The checkbox starts unchecked. Its saved value comes only from the
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

