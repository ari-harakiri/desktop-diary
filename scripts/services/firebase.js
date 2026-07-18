  // ---------------- cloud sync (Firebase: Google sign-in + Firestore) ----------------
  var firebaseConfig = {
    apiKey: "AIzaSyD2zxq7c33ff6CnLlNrVolPGtaqHRJhaa0",
    authDomain: "instantdiary-14474.firebaseapp.com",
    projectId: "instantdiary-14474",
    storageBucket: "instantdiary-14474.firebasestorage.app",
    messagingSenderId: "20644051614",
    appId: "1:20644051614:web:50d2be0d77cbec02a7998f"
  };
  var cloudUser = null;
  var cloudPushTimer = null;
  var fbApp = null, auth = null, db = null;
  var cloudAuthReady = Promise.resolve(); // resolves once auth state is known
  try{
    if(typeof firebase !== 'undefined'){
      fbApp = firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      cloudAuthReady = new Promise(function(resolve){
        auth.onAuthStateChanged(function(user){
          var wasSignedIn = !!cloudUser;
          cloudUser = user;
          resolve(user);
          // auto-pull when signing in for the first time in this session
          if(user && !wasSignedIn){
            pullFromCloud().then(function(found){
              if(found){
                normalizeState();
                applyTheme();
                applyBackground();
                renderAllStickyNotes();
                if(document.getElementById('buddylist-win') &&
                   document.getElementById('buddylist-win').style.display !== 'none'){
                  renderBuddyList();
                  refreshMyStatus();
                  refreshProfilePic();
                }
              }
            }).catch(function(){}); // silent — don't interrupt the user
          }
        });
      });
    }
  } catch(e){ /* Firebase not available (e.g. offline) — app still works locally */ }

  function signInWithGoogle(){
    if(!auth) return Promise.reject(new Error('Cloud sync is unavailable right now.'));
    var provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
  }
  function signOutCloud(){
    return auth ? auth.signOut() : Promise.resolve();
  }
  function scheduleCloudPush(){
    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(function(){ pushToCloud().catch(function(){}); }, 3000);
  }

  // splits an entries array into chunks that stay comfortably under Firestore's 1MB doc limit
  function chunkEntries(arr, maxBytes){
    maxBytes = maxBytes || 700000;
    var chunks = [], current = [], size = 2;
    (arr || []).forEach(function(item){
      var itemSize = JSON.stringify(item).length + 1;
      if(current.length && size + itemSize > maxBytes){
        chunks.push(current); current = []; size = 2;
      }
      current.push(item); size += itemSize;
    });
    chunks.push(current); // always at least one (possibly empty) chunk
    return chunks;
  }

  function pushToCloud(){
    if(!db || !cloudUser) return Promise.reject(new Error('Not signed in.'));
    var uid = cloudUser.uid;
    var meta = {
      screenName: state.account ? state.account.screenName : '',
      groups: state.groups,
      buddies: state.buddies,
      status: state.status,
      statusLog: state.statusLog,
      statusPresets: state.statusPresets,
      moodLog: state.moodLog,
      drafts: state.drafts,
      profile: state.profile,
      blogPosts: state.blogPosts,
      bgColor: (state.background && state.background.color) || '',
      hasBgImage: !!(state.background && state.background.image),
      customFonts: state.customFonts,
      customMoods: state.customMoods,
      customMoodColors: state.customMoodColors,
      theme: state.theme,
      customThemePresets: state.customThemePresets,
      stickyNotes: (state.stickyNotes || []).map(function(n){
        return { id:n.id, title:n.title||'', text:n.text, color:n.color, x:n.x, y:n.y, w:n.w, h:n.h };
      }),
      chunkCounts: {},
      updatedAt: Date.now()
    };
    var writes = [];
    Object.keys(state.entries).forEach(function(buddyId){
      var chunks = chunkEntries(state.entries[buddyId]);
      meta.chunkCounts[buddyId] = chunks.length;
      chunks.forEach(function(chunk, i){
        writes.push(db.collection('users').doc(uid).collection('entries').doc(buddyId+'_'+i).set({ entries: chunk }));
      });
    });
    // background image lives in its own doc (can be a large data URI) so it never
    // risks pushing the meta doc over Firestore's ~1MB document size limit
    if(state.background && state.background.image){
      writes.push(db.collection('users').doc(uid).collection('diary').doc('background').set({ image: state.background.image }));
    } else {
      writes.push(db.collection('users').doc(uid).collection('diary').doc('background').delete().catch(function(){}));
    }
    writes.push(db.collection('users').doc(uid).collection('diary').doc('meta').set(meta));
    return Promise.all(writes);
  }

  function pullFromCloud(){
    if(!db || !cloudUser) return Promise.reject(new Error('Not signed in.'));
    var uid = cloudUser.uid;
    var pullStartedRevision = stateRevision;
    return db.collection('users').doc(uid).collection('diary').doc('meta').get().then(function(snap){
      if(!snap.exists) return false;
      var meta = snap.data() || {};
      var chunkCounts = meta.chunkCounts || {};
      var buddyIds = Object.keys(chunkCounts);
      var cloudEntries = {};
      var fetches = buddyIds.map(function(buddyId){
        var n = chunkCounts[buddyId];
        var docFetches = [];
        for(var i=0;i<n;i++){
          docFetches.push(db.collection('users').doc(uid).collection('entries').doc(buddyId+'_'+i).get());
        }
        return Promise.all(docFetches).then(function(snaps){
          var all = [];
          snaps.forEach(function(s){ if(s.exists) all = all.concat((s.data()||{}).entries || []); });
          cloudEntries[buddyId] = all;
        });
      });
      var cloudBackground = { color: meta.bgColor || '', image: '' };
      // background image lives in its own doc; only fetch it if push indicated one exists
      var bgFetch = meta.hasBgImage
        ? db.collection('users').doc(uid).collection('diary').doc('background').get().then(function(bgSnap){
            cloudBackground.image = (bgSnap.exists && bgSnap.data().image) || '';
          }).catch(function(){
            cloudBackground.image = '';
          })
        : Promise.resolve();
      return Promise.all(fetches.concat([bgFetch])).then(function(){
        // Do not let an older cloud snapshot overwrite edits made while it was loading.
        if(stateRevision !== pullStartedRevision) return false;
        state.groups = meta.groups || state.groups;
        state.buddies = meta.buddies || [];
        state.status = meta.status || { label:'', html:'', ts:null };
        state.statusLog = meta.statusLog || [];
        state.statusPresets = meta.statusPresets || [];
        state.moodLog = meta.moodLog || [];
        state.drafts = meta.drafts || {};
        state.profile = meta.profile || { pic:'', html:'' };
        if(Array.isArray(meta.blogPosts)) state.blogPosts = meta.blogPosts;
        if(Array.isArray(meta.customFonts)) state.customFonts = meta.customFonts;
        if(Array.isArray(meta.customMoods)) state.customMoods = meta.customMoods;
        if(meta.customMoodColors && typeof meta.customMoodColors === 'object') state.customMoodColors = meta.customMoodColors;
        if(meta.theme && typeof meta.theme === 'object') state.theme = meta.theme;
        if(Array.isArray(meta.customThemePresets)) state.customThemePresets = meta.customThemePresets;
        if(Array.isArray(meta.stickyNotes)) state.stickyNotes = meta.stickyNotes;
        if(state.account && meta.screenName) state.account.screenName = meta.screenName;
        state.entries = cloudEntries;
        state.background = cloudBackground;
        normalizeState();
        return saveState().then(function(){ return true; });
      });
    });
  }

