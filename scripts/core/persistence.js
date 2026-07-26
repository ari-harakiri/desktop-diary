  // ---------------- persistence ----------------
  // window.storage only exists inside Claude's own preview iframe. On the real
  // deployed site (GitHub Pages, etc.) there's no such API, so we fall back to
  // IndexedDB — this is what makes local saving (and full offline use) actually
  // work once this file is hosted for real.
  var localStore = null;
  function makeIndexedDBStore(){
    var dbPromise = new Promise(function(resolve, reject){
      try{
        var req = indexedDB.open('instant-diary-db', 1);
        req.onupgradeneeded = function(){ req.result.createObjectStore('kv'); };
        req.onsuccess = function(){ resolve(req.result); };
        req.onerror = function(){ reject(req.error); };
      } catch(e){ reject(e); }
    });
    function withStore(mode, fn){
      return dbPromise.then(function(db){
        return new Promise(function(resolve, reject){
          var tx = db.transaction('kv', mode);
          var store = tx.objectStore('kv');
          var request = fn(store);
          request.onsuccess = function(){ resolve(request.result); };
          request.onerror = function(){ reject(request.error); };
        });
      });
    }
    return {
      get: function(key){
        return withStore('readonly', function(store){ return store.get(key); })
          .then(function(value){ return (value === undefined) ? null : { key: key, value: value }; });
      },
      set: function(key, value){
        return withStore('readwrite', function(store){ return store.put(value, key); })
          .then(function(){ return { key: key, value: value }; });
      }
    };
  }
  function getLocalStore(){
    if(localStore) return localStore;
    if(typeof window.storage !== 'undefined' && window.storage &&
       typeof window.storage.get === 'function' && typeof window.storage.set === 'function'){
      localStore = window.storage;
      return localStore;
    }
    if(typeof indexedDB !== 'undefined'){
      try{ localStore = makeIndexedDBStore(); return localStore; } catch(e){}
    }
    return null;
  }
  function loadState(){
    return loadStateAttempt(4);
  }
  function loadStateAttempt(retriesLeft){
    var store = getLocalStore();
    if(store){
      try{
        return store.get(STORAGE_KEY, false).then(function(res){
          activeStorageKey=STORAGE_KEY;
          if(res && res.value){
            try { state = JSON.parse(res.value); normalizeState(); } catch(e){}
          }
          // Never reveal an email account's diary merely because this browser
          // remembers its address. Only a live Supabase session may select an
          // account-scoped diary. The remembered email remains available to
          // prefill Sign On without loading private diary content.
          var authenticatedSession=getSupabaseSession();
          if(!authenticatedSession||!authenticatedSession.access_token){
            // Older builds sometimes left an email diary in the generic slot.
            // Preserve a scoped copy before hiding it from the signed-out UI.
            if(state.account&&state.account.email&&res&&res.value){
              var legacyEmail=String(state.account.email).trim().toLowerCase();
              var legacyKey=accountStorageKey(legacyEmail);
              state=makeFreshState();normalizeState();
              return store.get(legacyKey,false).then(function(existing){
                if(!existing||!existing.value)return store.set(legacyKey,res.value,false);
              });
            }
            return;
          }
          var authenticatedEmail=(authenticatedSession.user&&authenticatedSession.user.email)||getRememberedAccountEmail();
          if(authenticatedEmail){
            authenticatedEmail=String(authenticatedEmail).trim().toLowerCase();
            activeStorageKey=accountStorageKey(authenticatedEmail);
            return store.get(activeStorageKey,false).then(function(scoped){
              if(scoped&&scoped.value){
                try{state=JSON.parse(scoped.value);normalizeState();}catch(e){}
              }else if(state.account&&String(state.account.email||'').trim().toLowerCase()===authenticatedEmail){
                return store.set(activeStorageKey,JSON.stringify(state),false);
              }else{
                state=makeFreshState();
                state.account={email:authenticatedEmail,screenName:authenticatedEmail.split('@')[0]};
                normalizeState();
              }
            });
          }
        }).catch(function(){ /* nothing saved yet */ });
      } catch(e){
        return Promise.resolve();
      }
    }
    if(retriesLeft > 0){
      return new Promise(function(resolve){
        setTimeout(function(){ resolve(loadStateAttempt(retriesLeft - 1)); }, 200);
      });
    }
    return Promise.resolve();
  }

  var saveInFlight = false, savePending = false, stateRevision = 0;
  function saveState(){
    stateRevision++;
    var store = getLocalStore();
    if(!store) return Promise.resolve();
    if(saveInFlight){ savePending = true; return Promise.resolve(); }
    saveInFlight = true;
    var payload = JSON.stringify(state);
    var attempt;
    try{
      attempt = store.set(activeStorageKey, payload, false);
    } catch(e){
      attempt = Promise.reject(e);
    }
    return attempt
      .catch(function(){
        // one quiet retry - transient hiccups shouldn't surface to the user
        try{
          return store.set(activeStorageKey, payload, false).catch(function(){ /* give up quietly */ });
        } catch(e){ /* give up quietly */ }
      })
      .then(function(){
        saveInFlight = false;
        if(savePending){ savePending = false; return saveState(); }
        if(cloudUser) scheduleCloudPush();
      });
  }
  function activateAccountDiary(email,auth,password,forceFresh){
    var normalizedEmail=String(email||'').trim().toLowerCase(),store=getLocalStore(),newKey=accountStorageKey(normalizedEmail);
    rememberAccountEmail(normalizedEmail);
    if(window.resetKobaNotificationsForAccountSwitch)window.resetKobaNotificationsForAccountSwitch();
    dtdMailProfilePreviewCache={};
    // Close diary/content windows from the outgoing Guest or account before
    // the authenticated desktop becomes visible. Keep the fixed Buddy List
    // shell and any account-creation dialog that is completing this switch.
    openWindows.slice().forEach(function(w){
      if(w.type==='buddylist'||w.type==='createaccount'||w.type==='onlinepasswordreset')return;
      closeWindow(w.id);
    });
    function finish(next){
      state=next||makeFreshState();normalizeState();state.account=state.account||{};
      var authenticatedName=String(auth.user&&auth.user.user_metadata&&auth.user.user_metadata.screen_name||'').trim();
      if(!authenticatedName||authenticatedName.toLowerCase()==='guest')authenticatedName=normalizedEmail.split('@')[0];
      if(!state.account.screenName||String(state.account.screenName).trim().toLowerCase()==='guest')state.account.screenName=authenticatedName;
      delete state.account.mode;
      state.account.email=normalizedEmail;state.account.password=password;activeStorageKey=newKey;applyBackground();applyTheme();return saveState();
    }
    function finishFromGenericOrFresh(){
      return store.get(STORAGE_KEY,false).then(function(generic){
        if(generic&&generic.value){
          try{
            var candidate=JSON.parse(generic.value),candidateEmail=String(candidate&&candidate.account&&candidate.account.email||'').trim().toLowerCase();
            if(candidateEmail===normalizedEmail)return finish(candidate);
          }catch(e){}
        }
        return finish(makeFreshState());
      });
    }
    return saveState().then(function(){
      if(forceFresh||!store)return finish(makeFreshState());
      return store.get(newKey,false).then(function(saved){
        if(saved&&saved.value){
          try{
            var candidate=JSON.parse(saved.value),candidateAccount=candidate&&candidate.account||{};
            var candidateEmail=String(candidateAccount.email||'').trim().toLowerCase();
            var guestOverwrite=!candidateEmail&&String(candidateAccount.screenName||'').trim().toLowerCase()==='guest';
            var wrongAccount=!!candidateEmail&&candidateEmail!==normalizedEmail;
            if(!guestOverwrite&&!wrongAccount)return finish(candidate);
            var recoveryKey=newKey+'-pre-account-isolation-recovery';
            return store.get(recoveryKey,false).then(function(recovery){
              if(!recovery||!recovery.value)return store.set(recoveryKey,saved.value,false);
            }).then(finishFromGenericOrFresh);
          }catch(e){}
        }
        if(state.account&&String(state.account.email||'').trim().toLowerCase()===normalizedEmail)return finish(state);
        return finishFromGenericOrFresh();
      });
    });
  }
