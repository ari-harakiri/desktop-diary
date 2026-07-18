  // ================= CLOUD SYNC WINDOW =================
  function openCloudSyncWindow(){
    // Show loading state while waiting for Firebase auth to resolve
    createWindow({
      title: 'Sync',
      extraClass: 'help-win',
      bodyHtml: '<div class="win-body" style="font-size:12px;padding:16px;">Checking sign-in status…</div>',
      type: 'cloudsync',
      onMount: function(el, id){
        cloudAuthReady.then(function(){
          var inner;
          if(!cloudUser){
            inner =
              '<div style="font-size:12px;line-height:1.6;padding:12px;">' +
                '<p>Sign in with Google to back up your diary to the cloud.</p>' +
                '<button class="btn" id="cs-signin">Sign in with Google</button>' +
                '<div class="signon-error" id="cs-error"></div>' +
              '</div>';
          } else {
            var displayName = cloudUser.email || cloudUser.displayName || 'your Google account';
            inner =
              '<div style="font-size:12px;line-height:1.6;padding:12px;">' +
                '<p>Signed in as <b>' + escapeHtml(displayName) + '</b></p>' +
                '<div class="nm-send-row" style="gap:6px;justify-content:flex-start;">' +
                  '<button class="btn" id="cs-push">Push to Cloud</button>' +
                  '<button class="btn" id="cs-pull">Pull from Cloud</button>' +
                '</div>' +
                '<div class="signon-error" id="cs-status" style="color:#0850d0;word-break:break-all;"></div>' +
                '<div class="nm-send-row" style="margin-top:14px;"><button class="btn" id="cs-signout">Sign Out of Google</button></div>' +
              '</div>';
          }
          var wb = el.querySelector('.win-body');
          if(wb) wb.outerHTML = inner;
          else el.insertAdjacentHTML('beforeend', inner);

          if(!cloudUser){
            el.querySelector('#cs-signin').addEventListener('click', function(){
              signInWithGoogle().then(function(){ closeWindow(id); openCloudSyncWindow(); })
                .catch(function(e){ el.querySelector('#cs-error').textContent = 'Sign-in failed: ' + (e && e.message ? e.message : String(e)); });
            });
          } else {
            el.querySelector('#cs-push').addEventListener('click', function(){
              el.querySelector('#cs-status').textContent = 'Pushing…';
              el.querySelector('#cs-status').style.color = '#0850d0';
              pushToCloud().then(function(){ el.querySelector('#cs-status').textContent = 'Backed up just now.'; })
                .catch(function(e){ el.querySelector('#cs-status').style.color='#c0392b'; el.querySelector('#cs-status').textContent='Push failed: '+(e&&e.message?e.message:String(e)); });
            });
            el.querySelector('#cs-pull').addEventListener('click', function(){
              el.querySelector('#cs-status').textContent = 'Pulling…';
              el.querySelector('#cs-status').style.color = '#0850d0';
              pullFromCloud().then(function(found){
                el.querySelector('#cs-status').textContent = found ? 'Restored from cloud.' : 'No backup found. Confirm you\'re signed into the same Google account on both devices.';
                if(state.account){
                  document.getElementById('bl-title-text').textContent = state.account.screenName;
                  document.getElementById('bl-me-name').textContent = state.account.screenName;
                }
                renderBuddyList(); refreshMyStatus(); refreshProfilePic(); applyBackground(); applyTheme(); renderAllStickyNotes();
              }).catch(function(e){ el.querySelector('#cs-status').style.color='#c0392b'; el.querySelector('#cs-status').textContent='Pull failed: '+(e&&e.message?e.message:String(e)); });
            });
            el.querySelector('#cs-signout').addEventListener('click', function(){
              signOutCloud().then(function(){ closeWindow(id); });
            });
          }
        });
      }
    });
  }

