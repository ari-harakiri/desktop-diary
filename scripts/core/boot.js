  // ================= BOOT =================
  loadState().then(function(){
    try {
      normalizeState();
      if(window.initializeKobaPlayBall)window.initializeKobaPlayBall();
      loadDtdSiteContent();
      applyBackground();
      applyTheme();
      initializeDesktopIconDragging();
      (state.customFonts || []).forEach(function(f){ registerCustomFont(f); });
      tickClock();
      var recoverySession=readSupabaseRecoveryRedirect();
      var savedOnlineSession=getSupabaseSession();
      // A saved Supabase session is the durable proof that this browser is
      // still signed in. It survives reloads and browser restarts; Sign Out
      // removes it. The local marker remains for older-build migration.
      if(state.account && savedOnlineSession && (hasActiveSession() || state.autoLogin || savedOnlineSession.access_token)){
        enterDesktop();
      } else {
        showSignon();
      }
      if(recoverySession)openOnlinePasswordResetWindow(recoverySession);
    } catch(bootErr){
      // show the real error on screen so it's visible on iPhone without dev tools
      var errDiv = document.createElement('div');
      errDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:12px;font-size:13px;z-index:999999;font-family:monospace;white-space:pre-wrap;';
      errDiv.textContent = 'Boot error: ' + (bootErr && bootErr.message ? bootErr.message : String(bootErr));
      document.body.appendChild(errDiv);
    }
  }).catch(function(loadErr){
    var errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:12px;font-size:13px;z-index:999999;font-family:monospace;white-space:pre-wrap;';
    errDiv.textContent = 'Load error: ' + (loadErr && loadErr.message ? loadErr.message : String(loadErr));
    document.body.appendChild(errDiv);
  });
