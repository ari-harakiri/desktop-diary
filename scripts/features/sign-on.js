  // ================= SIGN ON =================
  var signonMode = 'login'; // 'login' | 'create' | 'connect' | 'createfresh'
  var pwFieldIsSavedPlaceholder = false;

  function openOnlinePasswordResetWindow(recoverySession){
    setSupabaseSession(recoverySession);
    var body='<div class="win-body nm-body"><p style="font-size:11px;line-height:1.45;margin-top:0">Choose a new password for your DesktopDiary account.</p><div class="field-row"><label>New Password</label><input type="password" id="online-reset-password" autocomplete="new-password"></div><div class="field-row"><label>Confirm Password</label><input type="password" id="online-reset-confirm" autocomplete="new-password"></div><div class="signon-error" id="online-reset-error"></div><div class="nm-send-row"><button class="btn" id="online-reset-save">Reset Password</button></div></div>';
    createWindow({title:'Reset Password',extraClass:'setup-win',bodyHtml:body,type:'onlinepasswordreset',onMount:function(el,id){var pw=el.querySelector('#online-reset-password'),confirm=el.querySelector('#online-reset-confirm'),error=el.querySelector('#online-reset-error'),button=el.querySelector('#online-reset-save');pw.focus();button.onclick=function(){if(pw.value.length<6){error.textContent='Password must be at least 6 characters.';return;}if(pw.value!==confirm.value){error.textContent='Passwords do not match.';return;}button.disabled=true;error.style.color='#555';error.textContent='Updating password…';supabaseUserRequest('PUT',{password:pw.value},recoverySession.access_token).then(function(user){state.account=state.account||{};state.account.email=user.email||state.account.email||'';state.account.screenName=(user.user_metadata&&user.user_metadata.screen_name)||state.account.screenName||(user.email?user.email.split('@')[0]:'DesktopDiary');state.account.password=pw.value;state.savePassword=false;return saveState();}).then(function(){closeWindow(id);showSignon();var signonError=document.getElementById('signon-error');signonError.style.color='#2a7d2a';signonError.textContent='Password reset. Sign in with your new password.';}).catch(function(err){error.style.color='';error.textContent=err.message;button.disabled=false;});};confirm.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();button.click();}};}});
  }

  function showSignon(){
    setActiveSession(false);
    document.body.classList.remove('signed-in');
    var stickyLayer=document.getElementById('sticky-layer');
    if(stickyLayer)stickyLayer.innerHTML='';
    document.getElementById('buddylist-win').style.display = 'none';
    document.getElementById('connecting-wrap').style.display = 'none';
    document.getElementById('signon-icon').style.display = 'none';
    document.getElementById('signon-wrap').style.display = 'block';
    document.getElementById('signon-error').textContent = '';
    var pwInput = document.getElementById('in-password');
    var emailInput = document.getElementById('in-email');
    var switchRow=document.getElementById('account-switch-row');
    document.getElementById('forgot-row').style.display = 'block';
    document.getElementById('signon-go-label').textContent = 'Sign On';
    signonMode = 'login';
    switchRow.style.display='block';
    emailInput.readOnly = false;

    if(state.account && state.account.email){
      // Returning device with a known online email: default to Sign On,
      // pre-filled but editable so a different user can sign in on this device.
      document.getElementById('account-switch').textContent='Create a New Account';
      emailInput.value = state.account.email;
      document.getElementById('in-savepw').checked = !!state.savePassword;
      document.getElementById('in-autologin').checked = !!state.autoLogin;

      if(state.savePassword){
        pwInput.value = 'Saved - click here to change';
        pwInput.type = 'text';
        pwInput.classList.add('pw-saved');
        pwInput.readOnly = true;
        pwFieldIsSavedPlaceholder = true;
      } else {
        pwInput.value = '';
        pwInput.type = 'password';
        pwInput.classList.remove('pw-saved');
        pwInput.readOnly = false;
        pwFieldIsSavedPlaceholder = false;
      }
    } else {
      // Either no saved account at all, or a local-only diary with no email
      // attached yet. Sign On is always the default view either way; local
      // diary owners get a link to connect their existing diary instead of
      // being dropped straight into a signup-shaped form.
      document.getElementById('account-switch').textContent = state.account ? 'Connect this local account instead' : 'Don\'t have an account? Create One';
      emailInput.value = '';
      pwInput.value = ''; pwInput.type = 'password'; pwInput.classList.remove('pw-saved'); pwInput.readOnly = false;
      pwFieldIsSavedPlaceholder = false;
      document.getElementById('in-savepw').checked = false;
      document.getElementById('in-autologin').checked = false;
    }
  }

  document.getElementById('account-switch').addEventListener('click',function(){
    var mode = (state.account && state.account.email) ? 'createfresh' : (state.account ? 'connect' : 'create');
    openCreateAccountWindow(mode);
  });

  function openCreateAccountWindow(mode){
    var isConnect = mode === 'connect';
    var isFresh = mode === 'createfresh';
    var title = isConnect ? 'Connect Online Account' : 'Create Account';
    var submitLabel = isConnect ? 'Connect Online Account' : 'Create Account';
    var noteHtml = isFresh ? '<div style="margin:2px 0 6px;padding:5px;border:1px solid #b9c7d8;background:#f3f7fb;color:#46576a;font-size:9px;line-height:1.3;text-align:left">This creates a separate fresh diary. Existing diaries on this device will remain saved.</div>' : '';
    var body =
      '<div class="win-body nm-body">' +
        '<div class="signon-error" id="ca-error"></div>' +
        '<div class="field-row"><label for="ca-screenname">Screen Name</label><input type="text" id="ca-screenname" autocomplete="nickname"></div>' +
        '<div class="field-row"><label for="ca-email">Email</label><input type="email" id="ca-email" autocomplete="email"></div>' +
        '<div class="field-row"><label for="ca-password">Password</label><input type="password" id="ca-password" autocomplete="new-password"></div>' +
        '<div class="field-row"><label for="ca-password2">Confirm Password</label><input type="password" id="ca-password2" autocomplete="new-password"></div>' +
        noteHtml +
        '<div class="signon-bottom"><span class="signon-go" id="ca-submit"><span id="ca-submit-label">' + submitLabel + '</span></span></div>' +
      '</div>';

    var win = createWindow({ title: title, extraClass: 'ca-win', bodyHtml: body, type: 'createaccount', onMount: function(el, id){
      var nameInput = el.querySelector('#ca-screenname');
      var emailInput = el.querySelector('#ca-email');
      var passInput = el.querySelector('#ca-password');
      var pass2Input = el.querySelector('#ca-password2');
      var errEl = el.querySelector('#ca-error');
      var submit = el.querySelector('#ca-submit');

      nameInput.focus();

      function doSubmit(){
        errEl.style.color = '';
        errEl.textContent = '';
        var name = nameInput.value.trim();
        var email = emailInput.value.trim().toLowerCase();
        var pass = passInput.value;
        var pass2 = pass2Input.value;
        if(!name){ errEl.textContent = 'Please enter a screen name.'; return; }
        if(!/^\S+@\S+\.\S+$/.test(email)){ errEl.textContent = 'Please enter a valid private email address.'; return; }
        if(isFresh && state.account && state.account.email && email === state.account.email.toLowerCase()){ errEl.textContent = 'A fresh diary requires a different email address.'; return; }
        if(pass.length<6){ errEl.textContent = 'Password must be at least 6 characters.'; return; }
        if(pass !== pass2){ errEl.textContent = 'Passwords do not match.'; return; }
        submit.style.pointerEvents='none'; errEl.style.color='#555'; errEl.textContent='Creating secure account…';
        var connectingExisting = isConnect;
        supabaseAuthRequest('/signup?redirect_to='+encodeURIComponent(DESKTOPDIARY_APP_URL),{email:email,password:pass,data:{screen_name:name}}).then(function(auth){
          if(auth.access_token)setSupabaseSession(auth);
          if(connectingExisting){var _fresh=makeFreshState();_fresh.account={screenName:name,password:pass,email:email};state=_fresh;activeStorageKey=accountStorageKey(email);return saveState();}
          return activateAccountDiary(email,auth,pass,true);
        }).then(function(){
          state.savePassword = document.getElementById('in-savepw').checked;
          state.autoLogin = document.getElementById('in-autologin').checked;
          return saveState();
        }).then(function(){
          if(getSupabaseSession()){
            closeWindow(id);
            enterDesktop();
          } else {
            errEl.style.color='#2a7d2a';
            errEl.textContent='Check your email to confirm the account, then sign on.';
            submit.style.pointerEvents='';
          }
        }).catch(function(err){
          errEl.style.color=''; errEl.textContent=err.message; submit.style.pointerEvents='';
        });
      }

      submit.addEventListener('click', doSubmit);
      nameInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); emailInput.focus(); } });
      emailInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); passInput.focus(); } });
      passInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); pass2Input.focus(); } });
      pass2Input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); doSubmit(); } });
    }});

    var signonEl = document.getElementById('signon-wrap');
    if(signonEl && win && win.el){
      var sRect = signonEl.getBoundingClientRect();
      var w = win.el.offsetWidth, h = win.el.offsetHeight;
      var pos = clampToViewport(sRect.left + (sRect.width - w) / 2, sRect.top + (sRect.height - h) / 2, w, h);
      win.el.style.left = pos.x + 'px';
      win.el.style.top = pos.y + 'px';
    }

    return win;
  }

  document.getElementById('in-password').addEventListener('click', function(){
    if(pwFieldIsSavedPlaceholder){
      var pwInput = document.getElementById('in-password');
      pwInput.value = '';
      pwInput.type = 'password';
      pwInput.classList.remove('pw-saved');
      pwInput.readOnly = false;
      pwFieldIsSavedPlaceholder = false;
      pwInput.focus();
    }
  });

  document.getElementById('signon-submit').addEventListener('click', function(){
    var errEl = document.getElementById('signon-error');
    errEl.textContent = '';
    var email = document.getElementById('in-email').value.trim().toLowerCase();
    var pass = document.getElementById('in-password').value;
    var savePw = document.getElementById('in-savepw').checked;
    var autoLog = document.getElementById('in-autologin').checked;
    var submit=document.getElementById('signon-submit');

    var loginPassword=pwFieldIsSavedPlaceholder?state.account.password:pass;
    var loginEmail=email||(state.account&&state.account.email);
    if(!/^\S+@\S+\.\S+$/.test(loginEmail)){errEl.textContent='Please enter your account email.';return;}
    if(!loginPassword){errEl.textContent='Please enter your password.';return;}
    submit.style.pointerEvents='none';errEl.style.color='#555';errEl.textContent='Signing in securely…';
    supabaseAuthRequest('/token?grant_type=password',{email:loginEmail,password:loginPassword}).then(function(auth){setSupabaseSession(auth);return activateAccountDiary(loginEmail,auth,loginPassword,false);}).then(function(){state.savePassword=savePw;state.autoLogin=autoLog;return saveState().then(enterDesktop);}).catch(function(err){errEl.style.color='';errEl.textContent=err.message;}).then(function(){submit.style.pointerEvents='';});
  });

  document.getElementById('in-email').addEventListener('keydown', function(e){if(e.key==='Enter'){e.preventDefault();document.getElementById('in-password').focus();}});
  document.getElementById('in-password').addEventListener('keydown', function(e){
    if(e.key !== 'Enter') return;
    e.preventDefault();
    document.getElementById('signon-submit').click();
  });

  document.getElementById('forgot-link').addEventListener('click', function(){
    var recoveryEmail=(state.account&&state.account.email)||document.getElementById('in-email').value.trim().toLowerCase();
    if(recoveryEmail){
      var err=document.getElementById('signon-error');err.style.color='#555';err.textContent='Sending recovery email…';
      supabaseAuthRequest('/recover?redirect_to='+encodeURIComponent(DESKTOPDIARY_APP_URL),{email:recoveryEmail}).then(function(){err.style.color='#2a7d2a';err.textContent='Password recovery email sent.';}).catch(function(e){err.style.color='';err.textContent=e.message;});
    }else document.getElementById('signon-error').textContent='Enter your account email first.';
  });

  bindAccessibleAction(document.getElementById('btn-help'), function(){
    openHelpWindow();
  });

  function enterDesktop(){
    setActiveSession(true);
    document.body.classList.add('signed-in');
    if(!dtdUsageSessionTracked){dtdUsageSessionTracked=true;trackDtdUsage('session_started');}
    syncAuthenticatedEmailFromServer().catch(function(){});
    refreshAdminAccess();
    refreshTrashIcon();
    startDesktopMailWatch();
    startPenPalNotificationWatch();
    document.getElementById('signon-wrap').style.display = 'none';
    var connectingWindow=document.getElementById('connecting-wrap');
    connectingWindow.style.zIndex=++zCounter;
    connectingWindow.style.display='block';
    setTimeout(function(){
      playDoorCreak();
    }, 700);
    setTimeout(function(){
      document.getElementById('connecting-wrap').style.display = 'none';
      showBuddyList();
      renderAllStickyNotes();
    }, 1400);
  }

