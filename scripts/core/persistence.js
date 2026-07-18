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
          if(res && res.value){
            try { state = JSON.parse(res.value); normalizeState(); } catch(e){}
          }
          // Online diaries are stored per account. The generic state may not
          // contain that account, so use the authenticated session (or the
          // last known account after Sign Out) to find the correct diary.
          var rememberedEmail=getRememberedAccountEmail()||((state.account&&state.account.email)||'');
          if(rememberedEmail){
            rememberedEmail=String(rememberedEmail).trim().toLowerCase();
            activeStorageKey=accountStorageKey(rememberedEmail);
            return store.get(activeStorageKey,false).then(function(scoped){
              if(scoped&&scoped.value){
                try{state=JSON.parse(scoped.value);normalizeState();}catch(e){}
              }else if(state.account&&String(state.account.email||'').trim().toLowerCase()===rememberedEmail){
                return store.set(activeStorageKey,JSON.stringify(state),false);
              }else{
                state=makeFreshState();
                state.account={email:rememberedEmail,screenName:rememberedEmail.split('@')[0]};
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
    // DtD Post Mail is a singleton window — if one from the outgoing account
    // is still open, reopening mail after switching accounts would just
    // re-focus that same stale window (and its closed-over inbox/session)
    // instead of rebuilding it for the new account. Always close it here so
    // it's rebuilt fresh and scoped to whichever account is signing in now.
    openWindows.slice().forEach(function(w){ if(w.type==='dtdmail') closeWindow(w.id); });
    function finish(next){state=next||makeFreshState();normalizeState();state.account=state.account||{};state.account.email=normalizedEmail;state.account.password=password;state.account.screenName=state.account.screenName||((auth.user&&auth.user.user_metadata&&auth.user.user_metadata.screen_name)||normalizedEmail.split('@')[0]);activeStorageKey=newKey;applyBackground();applyTheme();return saveState();}
    return saveState().then(function(){if(forceFresh||!store)return finish(makeFreshState());return store.get(newKey,false).then(function(saved){if(saved&&saved.value){try{return finish(JSON.parse(saved.value));}catch(e){}}if(state.account&&state.account.email===normalizedEmail)return finish(state);return finish(makeFreshState());});});
  }

