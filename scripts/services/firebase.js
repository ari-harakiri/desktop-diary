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
  var cloudAutoPullIdentity = '';
  var cloudAutoPullInFlight = null;

  function cloudUserEmail(user){
    return String(user&&user.email||'').trim().toLowerCase();
  }
  function canUseCloudForActiveAccount(user){
    var session=getSupabaseSession();
    var accountEmail=String(state&&state.account&&state.account.email||'').trim().toLowerCase();
    var sessionEmail=String(session&&session.user&&session.user.email||'').trim().toLowerCase();
    var googleEmail=cloudUserEmail(user);
    return !!(
      user&&session&&session.access_token&&accountEmail&&googleEmail&&
      accountEmail===googleEmail&&
      (!sessionEmail||sessionEmail===accountEmail)&&
      activeStorageKey===accountStorageKey(accountEmail)&&
      document.body.classList.contains('signed-in')
    );
  }
  function refreshUiAfterAutomaticCloudPull(found){
    if(!found)return found;
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
    return found;
  }
  function autoPullCloudForActiveAccount(){
    if(!canUseCloudForActiveAccount(cloudUser))return Promise.resolve(false);
    var identity=String(cloudUser.uid||'')+'|'+cloudUserEmail(cloudUser);
    if(cloudAutoPullIdentity===identity)return cloudAutoPullInFlight||Promise.resolve(false);
    cloudAutoPullIdentity=identity;
    cloudAutoPullInFlight=pullFromCloud()
      .then(refreshUiAfterAutomaticCloudPull)
      .catch(function(){return false;})
      .then(function(found){cloudAutoPullInFlight=null;return found;});
    return cloudAutoPullInFlight;
  }
  try{
    if(typeof firebase !== 'undefined'){
      fbApp = firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      cloudAuthReady = new Promise(function(resolve){
        auth.onAuthStateChanged(function(user){
          var previousUid=String(cloudUser&&cloudUser.uid||'');
          cloudUser = user;
          if(!user||previousUid!==String(user.uid||'')){
            cloudAutoPullIdentity='';
            cloudAutoPullInFlight=null;
          }
          resolve(user);
          // A remembered Google login may exist while DesktopDiary is signed
          // out. Restore cloud data only after the matching DesktopDiary
          // account is authenticated and its account-scoped storage is active.
          if(user)autoPullCloudForActiveAccount();
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
    cloudAutoPullIdentity='';
    cloudAutoPullInFlight=null;
    return auth ? auth.signOut() : Promise.resolve();
  }
  function scheduleCloudPush(){
    clearTimeout(cloudPushTimer);
    if(!canUseCloudForActiveAccount(cloudUser))return;
    cloudPushTimer = setTimeout(function(){
      if(canUseCloudForActiveAccount(cloudUser))pushToCloud().catch(function(){});
    }, 3000);
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

  function buddyEntryRevision(entry){
    entry=entry&&typeof entry==='object'?entry:{};
    return Math.max(Number(entry.restoredAt)||0,Number(entry.editedAt)||0,Number(entry.ts)||0);
  }
  function stableLegacyBuddyEntryId(entry,buddyId){
    var source=[
      String(buddyId||''),
      String(entry&&entry.ts||''),
      String(entry&&entry.kind||''),
      String(entry&&entry.author||''),
      String(entry&&(entry.html!==undefined?entry.html:entry.text)||'')
    ].join('|');
    var hash=2166136261;
    for(var i=0;i<source.length;i++){
      hash^=source.charCodeAt(i);
      hash=Math.imul(hash,16777619);
    }
    return 'legacy-'+(hash>>>0).toString(36);
  }
  function mergeBuddyEntryTombstones(localMarkers,cloudMarkers){
    var merged={};
    function include(markers){
      if(!markers||typeof markers!=='object'||Array.isArray(markers))return;
      Object.keys(markers).forEach(function(entryId){
        var marker=markers[entryId],deletedAt=Number(marker&&marker.deletedAt)||0;
        if(!entryId||!deletedAt)return;
        if(!merged[entryId]||deletedAt>merged[entryId].deletedAt){
          merged[entryId]={buddyId:String(marker.buddyId||''),deletedAt:deletedAt};
        }
      });
    }
    include(localMarkers);
    include(cloudMarkers);
    return merged;
  }
  function chooseBuddyEntryVersion(first,second){
    var firstRevision=buddyEntryRevision(first),secondRevision=buddyEntryRevision(second);
    if(firstRevision!==secondRevision)return firstRevision>secondRevision?first:second;
    return JSON.stringify(first)>=JSON.stringify(second)?first:second;
  }
  function mergeBuddyEntryCollections(localEntries,cloudEntries,localMarkers,cloudMarkers){
    var byId={},buddyById={},markers=mergeBuddyEntryTombstones(localMarkers,cloudMarkers);
    function include(collection){
      if(!collection||typeof collection!=='object')return;
      Object.keys(collection).forEach(function(buddyId){
        var entries=Array.isArray(collection[buddyId])?collection[buddyId]:[];
        entries.forEach(function(rawEntry){
          if(!rawEntry||typeof rawEntry!=='object')return;
          var entry=Object.assign({},rawEntry);
          entry.id=String(entry.id||stableLegacyBuddyEntryId(entry,buddyId));
          var existing=byId[entry.id];
          if(!existing||chooseBuddyEntryVersion(existing,entry)===entry){
            byId[entry.id]=entry;
            buddyById[entry.id]=String(buddyId);
          }
        });
      });
    }
    include(localEntries);
    include(cloudEntries);
    var mergedEntries={};
    Object.keys(byId).forEach(function(entryId){
      var entry=byId[entryId],marker=markers[entryId];
      if(marker&&marker.deletedAt>=buddyEntryRevision(entry))return;
      if(marker)delete markers[entryId];
      var buddyId=buddyById[entryId]||String(marker&&marker.buddyId||'');
      if(!buddyId)return;
      if(!mergedEntries[buddyId])mergedEntries[buddyId]=[];
      mergedEntries[buddyId].push(entry);
    });
    Object.keys(mergedEntries).forEach(function(buddyId){
      mergedEntries[buddyId].sort(function(a,b){
        var timeDifference=(Number(a.ts)||0)-(Number(b.ts)||0);
        return timeDifference||String(a.id).localeCompare(String(b.id));
      });
    });
    return {entries:mergedEntries,tombstones:markers};
  }
  function recordBuddyEntryDeletion(buddyId,entry){
    if(!entry||!entry.id)return;
    if(!state.buddyEntryTombstones||typeof state.buddyEntryTombstones!=='object')state.buddyEntryTombstones={};
    var deletedAt=Date.now(),existing=state.buddyEntryTombstones[entry.id];
    if(existing&&Number(existing.deletedAt)>=deletedAt)deletedAt=Number(existing.deletedAt)+1;
    state.buddyEntryTombstones[entry.id]={buddyId:String(buddyId||''),deletedAt:deletedAt};
  }
  function recordBuddyEntriesDeletion(buddyId,entries){
    (Array.isArray(entries)?entries:[]).forEach(function(entry){recordBuddyEntryDeletion(buddyId,entry);});
  }
  function mergeCloudBuddyLists(localBuddies,cloudBuddies,requiredCloudBuddyIds){
    var byId={},requiredIds=null;
    if(Array.isArray(requiredCloudBuddyIds)){
      requiredIds={};
      requiredCloudBuddyIds.forEach(function(id){requiredIds[String(id)]=true;});
    }
    function include(list,filterCloudOnly){
      (Array.isArray(list)?list:[]).forEach(function(rawBuddy){
        if(!rawBuddy||!rawBuddy.id)return;
        var buddy=Object.assign({},rawBuddy),existing=byId[buddy.id];
        if(filterCloudOnly&&requiredIds&&!existing&&!requiredIds[String(buddy.id)])return;
        var buddyRevision=Math.max(Number(buddy.updatedAt)||0,Number(buddy.addedAt)||0);
        var existingRevision=Math.max(Number(existing&&existing.updatedAt)||0,Number(existing&&existing.addedAt)||0);
        if(!existing||buddyRevision>existingRevision||
           (buddyRevision===existingRevision&&JSON.stringify(buddy)>JSON.stringify(existing))){
          byId[buddy.id]=buddy;
        }
      });
    }
    include(localBuddies,false);
    include(cloudBuddies,true);
    return Object.keys(byId).map(function(id){return byId[id];}).sort(function(a,b){
      return (Number(a.addedAt)||0)-(Number(b.addedAt)||0)||String(a.id).localeCompare(String(b.id));
    });
  }
  function fetchCloudBuddyEntries(uid,chunkCounts){
    chunkCounts=chunkCounts&&typeof chunkCounts==='object'?chunkCounts:{};
    var cloudEntries={};
    var fetches=Object.keys(chunkCounts).map(function(buddyId){
      var count=Math.max(0,Math.floor(Number(chunkCounts[buddyId])||0)),docFetches=[];
      for(var i=0;i<count;i++){
        docFetches.push(db.collection('users').doc(uid).collection('entries').doc(buddyId+'_'+i).get());
      }
      return Promise.all(docFetches).then(function(snaps){
        var all=[];
        snaps.forEach(function(s){if(s.exists)all=all.concat((s.data()||{}).entries||[]);});
        cloudEntries[buddyId]=all;
      });
    });
    return Promise.all(fetches).then(function(){return cloudEntries;});
  }

  function cloudMetaContentCount(meta){
    meta = meta || {};
    var count = 0;
    ['buddies','statusLog','statusPresets','moodLog','blogPosts','customFonts','customMoods','customThemePresets'].forEach(function(key){
      if(Array.isArray(meta[key])) count += meta[key].length;
    });
    if(Array.isArray(meta.notebook&&meta.notebook.pages)) count += meta.notebook.pages.length;
    count += Object.keys(meta.chunkCounts || {}).length;
    count += Object.keys(meta.drafts || {}).filter(function(key){ return Array.isArray(meta.drafts[key]) && meta.drafts[key].length; }).length;
    var profile = meta.profile || {};
    if(profile.pic || profile.html || profile.header || profile.aboutMe) count++;
    if(meta.status && (meta.status.label || meta.status.html || meta.status.mood)) count++;
    if(meta.hasBgImage) count++;
    return count;
  }

  function cloudIdentityEmail(value){
    return String(value||'').trim().toLowerCase();
  }
  function cloudProfileHasContent(profile){
    profile=profile&&typeof profile==='object'?profile:{};
    return !!(profile.pic||profile.html||profile.header||profile.aboutMe);
  }
  function cloudScreenNameHasContent(name,email,revision){
    name=String(name||'').trim();
    if(!name||name.toLowerCase()==='guest')return false;
    if(Number(revision)>0)return true;
    email=cloudIdentityEmail(email);
    return !email||name.toLowerCase()!==email.split('@')[0];
  }
  function currentCloudProfileIdentity(){
    return {
      accountEmail:cloudIdentityEmail(state.account&&state.account.email),
      screenName:String(state.account&&state.account.screenName||''),
      screenNameUpdatedAt:Number(state.screenNameUpdatedAt)||0,
      profile:state.profile&&typeof state.profile==='object'?state.profile:{pic:'',html:'',header:'',aboutMe:''},
      profileUpdatedAt:Number(state.profileUpdatedAt)||0
    };
  }
  function cloudProfileIdentityFrom(value){
    value=value&&typeof value==='object'?value:{};
    return {
      accountEmail:cloudIdentityEmail(value.accountEmail),
      screenName:String(value.screenName||''),
      screenNameUpdatedAt:Number(value.screenNameUpdatedAt)||0,
      profile:value.profile&&typeof value.profile==='object'?value.profile:{pic:'',html:'',header:'',aboutMe:''},
      profileUpdatedAt:Number(value.profileUpdatedAt)||0
    };
  }
  function chooseCloudIdentityValue(localValue,localRevision,localHasContent,cloudValue,cloudRevision,cloudHasContent,preferCloudOnLegacyTie){
    if(localRevision>cloudRevision)return {value:localValue,revision:localRevision};
    if(cloudRevision>localRevision)return {value:cloudValue,revision:cloudRevision};
    if(localRevision>0)return {value:cloudValue,revision:cloudRevision};
    if(preferCloudOnLegacyTie)return cloudHasContent?{value:cloudValue,revision:0}:{value:localValue,revision:0};
    return localHasContent?{value:localValue,revision:0}:{value:cloudValue,revision:0};
  }
  function mergeCloudProfileIdentity(localIdentity,cloudIdentity,preferCloudOnLegacyTie){
    var localEmail=cloudIdentityEmail(localIdentity.accountEmail),cloudEmail=cloudIdentityEmail(cloudIdentity.accountEmail);
    if(localEmail&&cloudEmail&&localEmail!==cloudEmail){
      var accountError=new Error('This Google cloud backup belongs to a different DesktopDiary account. Sign out of Google Cloud Sync, then sign in with the matching account.');
      accountError.code='cloud-account-mismatch';
      throw accountError;
    }
    var identityEmail=cloudEmail||localEmail;
    var localNameRevision=Number(localIdentity.screenNameUpdatedAt)||0,cloudNameRevision=Number(cloudIdentity.screenNameUpdatedAt)||0;
    var localProfileRevision=Number(localIdentity.profileUpdatedAt)||0,cloudProfileRevision=Number(cloudIdentity.profileUpdatedAt)||0;
    var nameChoice=chooseCloudIdentityValue(
      String(localIdentity.screenName||''),localNameRevision,cloudScreenNameHasContent(localIdentity.screenName,identityEmail,localNameRevision),
      String(cloudIdentity.screenName||''),cloudNameRevision,cloudScreenNameHasContent(cloudIdentity.screenName,identityEmail,cloudNameRevision),
      preferCloudOnLegacyTie
    );
    var profileChoice=chooseCloudIdentityValue(
      localIdentity.profile&&typeof localIdentity.profile==='object'?localIdentity.profile:{pic:'',html:'',header:'',aboutMe:''},localProfileRevision,cloudProfileHasContent(localIdentity.profile),
      cloudIdentity.profile&&typeof cloudIdentity.profile==='object'?cloudIdentity.profile:{pic:'',html:'',header:'',aboutMe:''},cloudProfileRevision,cloudProfileHasContent(cloudIdentity.profile),
      preferCloudOnLegacyTie
    );
    return {
      accountEmail:identityEmail,
      screenName:nameChoice.value,
      screenNameUpdatedAt:nameChoice.revision,
      profile:profileChoice.value,
      profileUpdatedAt:profileChoice.revision
    };
  }
  function pushCloudMetaTransaction(metaRef,proposedMeta,prepareMeta,writeRelatedDocuments){
    var localIdentity=currentCloudProfileIdentity();
    return db.runTransaction(function(transaction){
      return transaction.get(metaRef).then(function(existingSnap){
        var existingMeta=existingSnap.exists?(existingSnap.data()||{}):{};
        var candidateMeta=Object.assign({},proposedMeta);
        if(cloudMetaContentCount(existingMeta)>0&&cloudMetaContentCount(candidateMeta)===0){
          var protectedError=new Error('Cloud backup protected: this device has no diary content, but the cloud backup does. Pull from Cloud before pushing.');
          protectedError.code='cloud-empty-overwrite-blocked';
          throw protectedError;
        }
        var cloudIdentity=cloudProfileIdentityFrom(existingMeta);
        var mergedIdentity=mergeCloudProfileIdentity(localIdentity,cloudIdentity,true);
        candidateMeta.screenName=mergedIdentity.screenName;
        candidateMeta.screenNameUpdatedAt=mergedIdentity.screenNameUpdatedAt;
        candidateMeta.profile=mergedIdentity.profile;
        candidateMeta.profileUpdatedAt=mergedIdentity.profileUpdatedAt;
        candidateMeta.accountEmail=mergedIdentity.accountEmail;
        if(typeof prepareMeta==='function')prepareMeta(candidateMeta,existingMeta);
        transaction.set(metaRef,candidateMeta);
        if(typeof writeRelatedDocuments==='function')writeRelatedDocuments(transaction,candidateMeta);
        return candidateMeta;
      });
    });
  }
  function markCloudProfileIdentityForExplicitPush(){
    var now=Date.now();
    state.screenNameUpdatedAt=now;
    state.profileUpdatedAt=now;
    return saveState();
  }

  function pushToCloud(){
    if(!db || !cloudUser) return Promise.reject(new Error('Not signed in.'));
    if(!canUseCloudForActiveAccount(cloudUser))return Promise.reject(new Error('Google Cloud Sync must use the same signed-in DesktopDiary account.'));
    return pushBuddySafeCloudSnapshot(cloudUser.uid,0);
  }

  function pushBuddySafeCloudSnapshot(uid,retryCount){
    var metaRef=db.collection('users').doc(uid).collection('diary').doc('meta');
    return metaRef.get().then(function(baseSnap){
      var baseMeta=baseSnap.exists?(baseSnap.data()||{}):{};
      var baseBuddyRevision=Number(baseMeta.buddyEntriesRevision)||0;
      return fetchCloudBuddyEntries(uid,baseMeta.chunkCounts).then(function(cloudEntries){
        var mergedMessages=mergeBuddyEntryCollections(
          state.entries,
          cloudEntries,
          state.buddyEntryTombstones,
          baseMeta.buddyEntryTombstones
        );
        state.entries=mergedMessages.entries;
        state.buddyEntryTombstones=mergedMessages.tombstones;
        state.buddies=mergeCloudBuddyLists(state.buddies,baseMeta.buddies,Object.keys(state.entries));
        var entryChunks={};
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
          accountEmail: cloudIdentityEmail(state.account&&state.account.email),
          screenNameUpdatedAt: Number(state.screenNameUpdatedAt)||0,
          profileUpdatedAt: Number(state.profileUpdatedAt)||0,
          blogPosts: state.blogPosts,
          bgColor: (state.background && state.background.color) || '',
          hasBgImage: !!(state.background && state.background.image),
          customFonts: state.customFonts,
          customMoods: state.customMoods,
          customMoodColors: state.customMoodColors,
          theme: state.theme,
          customThemePresets: state.customThemePresets,
          notebook: {
            pages:(state.notebook && Array.isArray(state.notebook.pages) ? state.notebook.pages : []).map(function(page){
              return {
                id: page.id,
                title: page.title || '',
                text: page.text || '',
                createdAt: Number(page.createdAt) || 0,
                updatedAt: Number(page.updatedAt) || 0,
                order: Number(page.order) || 0
              };
            }),
            currentPageId: state.notebook && state.notebook.currentPageId ? state.notebook.currentPageId : null
          },
          buddyEntryTombstones: state.buddyEntryTombstones,
          buddyEntriesRevision: baseBuddyRevision+1,
          chunkCounts: {},
          updatedAt: Date.now()
        };
        function prepareBuddyChunks(candidateMeta,latestMeta){
          var latestBuddyRevision=Number(latestMeta.buddyEntriesRevision)||0;
          if(latestBuddyRevision!==baseBuddyRevision){
            var retryError=new Error('Buddy messages changed in cloud while syncing. Retrying with the newer copy.');
            retryError.code='cloud-buddy-retry';
            throw retryError;
          }
          var finalMessages=mergeBuddyEntryCollections(
            state.entries,
            {},
            state.buddyEntryTombstones,
            latestMeta.buddyEntryTombstones
          );
          state.entries=finalMessages.entries;
          state.buddyEntryTombstones=finalMessages.tombstones;
          state.buddies=mergeCloudBuddyLists(state.buddies,latestMeta.buddies,Object.keys(state.entries));
          candidateMeta.buddies=state.buddies;
          candidateMeta.buddyEntryTombstones=state.buddyEntryTombstones;
          candidateMeta.buddyEntriesRevision=baseBuddyRevision+1;
          candidateMeta.chunkCounts={};
          entryChunks={};
          Object.keys(state.entries).forEach(function(buddyId){
            entryChunks[buddyId]=chunkEntries(state.entries[buddyId]);
            candidateMeta.chunkCounts[buddyId]=entryChunks[buddyId].length;
          });
        }
        function writeBuddyChunks(transaction){
          Object.keys(entryChunks).forEach(function(buddyId){
            entryChunks[buddyId].forEach(function(chunk,i){
              var chunkRef=db.collection('users').doc(uid).collection('entries').doc(buddyId+'_'+i);
              transaction.set(chunkRef,{entries:chunk});
            });
          });
        }
        return pushCloudMetaTransaction(metaRef,meta,prepareBuddyChunks,writeBuddyChunks).then(function(){
          var writes=[];
          // Background images remain separate because a data URI can approach
          // Firestore's per-document size limit.
          if(state.background&&state.background.image){
            writes.push(db.collection('users').doc(uid).collection('diary').doc('background').set({image:state.background.image}));
          }else{
            writes.push(db.collection('users').doc(uid).collection('diary').doc('background').delete().catch(function(){}));
          }
          return Promise.all(writes);
        });
      });
    }).catch(function(error){
      if(error&&error.code==='cloud-buddy-retry'&&retryCount<3){
        return pushBuddySafeCloudSnapshot(uid,retryCount+1);
      }
      throw error;
    });
  }

  function pullFromCloud(){
    if(!db || !cloudUser) return Promise.reject(new Error('Not signed in.'));
    if(!canUseCloudForActiveAccount(cloudUser))return Promise.reject(new Error('Google Cloud Sync must use the same signed-in DesktopDiary account.'));
    var uid = cloudUser.uid;
    var pullStartedRevision = stateRevision;
    return db.collection('users').doc(uid).collection('diary').doc('meta').get().then(function(snap){
      if(!snap.exists) return false;
      var meta = snap.data() || {};
      var cloudEntries={};
      var entriesFetch=fetchCloudBuddyEntries(uid,meta.chunkCounts).then(function(entries){cloudEntries=entries;});
      var cloudBackground = { color: meta.bgColor || '', image: '' };
      // background image lives in its own doc; only fetch it if push indicated one exists
      var bgFetch = meta.hasBgImage
        ? db.collection('users').doc(uid).collection('diary').doc('background').get().then(function(bgSnap){
            cloudBackground.image = (bgSnap.exists && bgSnap.data().image) || '';
          }).catch(function(){
            cloudBackground.image = '';
          })
        : Promise.resolve();
      return Promise.all([entriesFetch,bgFetch]).then(function(){
        // Do not let an older cloud snapshot overwrite edits made while it was loading.
        if(stateRevision !== pullStartedRevision) return false;
        state.groups = meta.groups || state.groups;
        state.status = meta.status || { label:'', html:'', ts:null };
        state.statusLog = meta.statusLog || [];
        state.statusPresets = meta.statusPresets || [];
        state.moodLog = meta.moodLog || [];
        state.drafts = meta.drafts || {};
        var mergedIdentity=mergeCloudProfileIdentity(currentCloudProfileIdentity(),cloudProfileIdentityFrom(meta),false);
        state.profile = mergedIdentity.profile;
        state.profileUpdatedAt = mergedIdentity.profileUpdatedAt;
        if(Array.isArray(meta.blogPosts)) state.blogPosts = meta.blogPosts;
        if(Array.isArray(meta.customFonts)) state.customFonts = meta.customFonts;
        if(Array.isArray(meta.customMoods)) state.customMoods = meta.customMoods;
        if(meta.customMoodColors && typeof meta.customMoodColors === 'object') state.customMoodColors = meta.customMoodColors;
        if(meta.theme && typeof meta.theme === 'object') state.theme = meta.theme;
        if(Array.isArray(meta.customThemePresets)) state.customThemePresets = meta.customThemePresets;
        if(meta.notebook && meta.notebook.pages) state.notebook = {
          pages: meta.notebook.pages,
          currentPageId: meta.notebook.currentPageId || null
        };
        else if(Array.isArray(meta.stickyNotes)) state.stickyNotes = meta.stickyNotes;
        if(state.account && mergedIdentity.screenName) state.account.screenName = mergedIdentity.screenName;
        state.screenNameUpdatedAt = mergedIdentity.screenNameUpdatedAt;
        var mergedMessages=mergeBuddyEntryCollections(
          state.entries,
          cloudEntries,
          state.buddyEntryTombstones,
          meta.buddyEntryTombstones
        );
        state.entries = mergedMessages.entries;
        state.buddyEntryTombstones = mergedMessages.tombstones;
        // Cloud Buddy Lists remain authoritative, while any local list that
        // still owns a surviving unsynced message is retained.
        state.buddies = mergeCloudBuddyLists(meta.buddies,state.buddies,Object.keys(state.entries));
        state.background = cloudBackground;
        normalizeState();
        return saveState().then(function(){ return true; });
      });
    });
  }
