
  // DESKTOPDIARY SOURCE MAP
  // 1. Online services and saved-state migrations
  // 2. Desktop, notes, display themes, and Paint
  // 3. Persistence, cloud sync, sound, and shared helpers
  // 4. Sign on, Buddy List, windows, IMs, search, and drafts
  // 5. Scrapbook, buddies, status, logs, DtD Post Mail, and AriNet
  // 6. Help, profiles, Diary entries, taskbar clock, calendar, and boot

  var STORAGE_KEY = 'buddy-diary-data-v1';
  var activeStorageKey = STORAGE_KEY;
  function accountStorageKey(email){return STORAGE_KEY+'-account-'+encodeURIComponent(String(email||'').trim().toLowerCase());}
  var SESSION_KEY = 'desktop-diary-signed-in';
  var LAST_ACCOUNT_KEY = 'desktop-diary-last-account-email';
  var DESKTOPDIARY_APP_URL = (function(){
    var raw = '';
    try {
      raw = String(window.location && window.location.href ? window.location.href : '');
      var q = raw.indexOf('?');
      if(q >= 0) raw = raw.slice(0, q);
      var h = raw.indexOf('#');
      if(h >= 0) raw = raw.slice(0, h);
      raw = raw.trim();
    } catch (e) {}
    if(!raw){
      try {
        var origin = window.location && window.location.origin ? window.location.origin : '';
        var path = window.location && window.location.pathname ? window.location.pathname : '';
        if(origin && path) return origin + path;
        if(origin) return origin;
      } catch (e) {}
    }
    return raw || 'https://ari-harakiri.github.io/desktop-diary/desktop-diary.html';
  })();
  var SUPABASE_URL = 'https://iiclhmiuggvsjthdtxlb.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qpMvUMG5YWrDWcR1ERHVuA_Uog5A5rn';
  var SUPABASE_SESSION_KEY = 'desktop-diary-supabase-session';

  function getSupabaseSession(){try{return JSON.parse(localStorage.getItem(SUPABASE_SESSION_KEY)||'null');}catch(e){return null;}}
  function rememberAccountEmail(email){
    var normalized=String(email||'').trim().toLowerCase();
    if(!normalized)return;
    try{localStorage.setItem(LAST_ACCOUNT_KEY,normalized);}catch(e){}
  }
  function getRememberedAccountEmail(){
    var session=getSupabaseSession();
    var sessionEmail=session&&session.user&&session.user.email;
    if(sessionEmail)return String(sessionEmail).trim().toLowerCase();
    try{return String(localStorage.getItem(LAST_ACCOUNT_KEY)||'').trim().toLowerCase();}catch(e){return '';}
  }
  function setSupabaseSession(session){
    try{
      if(session){
        localStorage.setItem(SUPABASE_SESSION_KEY,JSON.stringify(session));
        if(session.user&&session.user.email)rememberAccountEmail(session.user.email);
      }else localStorage.removeItem(SUPABASE_SESSION_KEY);
    }catch(e){}
  }
  function supabaseAuthRequest(path,body,accessToken){
    return fetch(SUPABASE_URL+'/auth/v1'+path,{method:'POST',headers:{'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+(accessToken||SUPABASE_PUBLISHABLE_KEY),'Content-Type':'application/json'},body:JSON.stringify(body||{})}).then(function(res){return res.json().catch(function(){return {};}).then(function(data){if(!res.ok)throw new Error(data.msg||data.message||data.error_description||data.error||'Account service error.');return data;});});
  }
  function supabaseUserRequest(method,body,accessToken){
    return fetch(SUPABASE_URL+'/auth/v1/user',{method:method,headers:{'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}).then(function(res){return res.json().catch(function(){return {};}).then(function(data){if(!res.ok)throw new Error(data.msg||data.message||data.error_description||data.error||'Account service error.');return data;});});
  }
  function readSupabaseRecoveryRedirect(){
    var params=new URLSearchParams(location.hash.replace(/^#/,''));
    if(params.get('type')!=='recovery'||!params.get('access_token'))return null;
    var session={access_token:params.get('access_token'),refresh_token:params.get('refresh_token')||'',expires_at:Math.floor(Date.now()/1000)+Number(params.get('expires_in')||3600),token_type:params.get('token_type')||'bearer'};
    try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
    return session;
  }
  function ensureSupabaseSession(){
    var session=getSupabaseSession();
    if(!session||!session.access_token)return Promise.reject(new Error('Sign out and connect your DesktopDiary account online first.'));
    if(!session.expires_at||session.expires_at>Date.now()/1000+60)return Promise.resolve(session);
    if(!session.refresh_token)return Promise.reject(new Error('Your online session has expired. Please sign in again.'));
    return supabaseAuthRequest('/token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(function(fresh){setSupabaseSession(fresh);return fresh;});
  }
  function adoptAuthenticatedEmail(email){
    var normalized=String(email||'').trim().toLowerCase();
    if(!normalized||!state.account)return Promise.resolve();
    rememberAccountEmail(normalized);
    state.account.email=normalized;
    delete state.account.pendingEmail;
    activeStorageKey=accountStorageKey(normalized);
    return saveState();
  }
  function syncAuthenticatedEmailFromServer(){
    if(!getSupabaseSession()||!state.account)return Promise.resolve();
    return ensureSupabaseSession().then(function(session){
      return supabaseUserRequest('GET',undefined,session.access_token).then(function(user){
        if(user&&user.email&&user.email.toLowerCase()!==String(state.account.email||'').toLowerCase())return adoptAuthenticatedEmail(user.email);
        if(user&&user.email&&state.account.pendingEmail&&user.email.toLowerCase()===state.account.pendingEmail.toLowerCase())return adoptAuthenticatedEmail(user.email);
      });
    });
  }
  function supabaseRestRequest(path,options){
    options=options||{};
    return ensureSupabaseSession().then(function(session){
      var headers={'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json'};
      if(options.prefer)headers.Prefer=options.prefer;
      return fetch(SUPABASE_URL+'/rest/v1/'+path,{method:options.method||'GET',headers:headers,body:options.body===undefined?undefined:JSON.stringify(options.body)}).then(function(res){return res.text().then(function(text){var data=null;try{data=text?JSON.parse(text):null;}catch(e){data=text;}if(!res.ok)throw new Error((data&&data.message)||String(data||'Mail service error.'));return data;});});
    });
  }
  function supabaseRpc(name,args){return supabaseRestRequest('rpc/'+name,{method:'POST',body:args||{}});}
  function supabasePublicRpc(name,args){
    return fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})}).then(function(res){return res.text().then(function(text){var data=null;try{data=text?JSON.parse(text):null;}catch(e){data=text;}if(!res.ok)throw new Error((data&&data.message)||String(data||'Site content service error.'));return data;});});
  }
  // Privacy-safe analytics: callers can send only an allowlisted event name
  // and a broad device class. Supabase supplies the time and decides whether
  // auth.uid() may be attached by reading the member's database preference.
  var DTD_USAGE_EVENTS={session_started:1,diary_opened:1,diary_entry_created:1,post_mail_opened:1,letter_sent:1,sudoku_started:1,sudoku_completed:1,profile_editor_opened:1,sticky_note_created:1,paint_opened:1,arinet_opened:1,help_opened:1,koba_interacted:1};
  var dtdUsageSessionTracked=false;
  function dtdUsageDeviceClass(){
    var sw=(window.screen&&screen.width)||window.innerWidth||1200,sh=(window.screen&&screen.height)||window.innerHeight||800,shortSide=Math.min(sw,sh);
    if(shortSide<=600)return'mobile';
    if(shortSide<=1024)return'tablet';
    return'desktop';
  }
  function trackDtdUsage(eventName){
    if(!DTD_USAGE_EVENTS[eventName])return Promise.resolve(false);
    var args={requested_event_name:eventName,requested_device_class:dtdUsageDeviceClass()};
    // Analytics must never block boot, show an error, or interrupt user work.
    var request=getSupabaseSession()?supabaseRpc('track_dtd_usage_event',args):supabasePublicRpc('track_dtd_usage_event',args);
    return request.then(function(){return true;}).catch(function(){return false;});
  }
  var DEFAULT_SITE_CONTENT={
    install_instructions:'iPhone / iPad (Safari)\n\n1. Open DesktopDiary in Safari (not Chrome).\n2. Tap the Share button at the bottom of the screen—the box with an arrow pointing up.\n3. Scroll down and tap “Add to Home Screen.”\n4. Give it a name and tap Add.\n5. DesktopDiary now lives on your home screen like a real app.\n\nAndroid / Samsung (Chrome)\n\n1. Open DesktopDiary in Chrome.\n2. Tap the three-dot menu in the top-right corner.\n3. Tap “Add to Home Screen” or “Install App.”\n4. Tap Add to confirm.\n5. DesktopDiary now lives on your home screen like a real app.',
    help_instructions:'Every buddy on your Buddy List is someone—or something—you can spill your guts to.\n\nUse messages to save birthdays, random memories, gift ideas, inside jokes, rants, shopping lists, life updates, or whatever is on your mind. Add your own categories and organize things your own way.\n\nClick a buddy to open an IM window and leave them a note. Keep a running history of thoughts, plans, and memories all in one place.\n\nBuddy icons show how recently their diary was updated:\nOnline = This week\nAway = More than 7 days\nOffline = More than 30 days\n\nUpdate your vibe anytime by setting your Status. It will be saved in the Log.\n\nHead to your Diary and choose New Entry to write and save.\n\nCustomize your profile, edit the HTML, choose a background, add sticky notes, and turn your desktop into your personal homepage.\n\nUse File → Cloud Sync to keep a backup through Google sign-in. Local storage also auto-saves on this device, but local data can be lost if the browser cache is cleared.\n\nBasically: it is like AIM, a diary, a notepad, and a personal homepage all rolled into one.'
  };
  var dtdSiteContent={install_instructions:DEFAULT_SITE_CONTENT.install_instructions,help_instructions:DEFAULT_SITE_CONTENT.help_instructions};
  var dtdAdminAccess=false;
  function loadDtdSiteContent(){
    return supabasePublicRpc('get_dtd_site_content',{}).then(function(rows){
      (rows||[]).forEach(function(row){if(row&&DEFAULT_SITE_CONTENT.hasOwnProperty(row.content_key)&&typeof row.content_value==='string')dtdSiteContent[row.content_key]=row.content_value;});
      return dtdSiteContent;
    }).catch(function(){return dtdSiteContent;});
  }
  function setAdminMenuVisible(visible){var menu=document.getElementById('menu-admin');dtdAdminAccess=!!visible;if(menu)menu.style.display=dtdAdminAccess?'block':'none';}
  function refreshAdminAccess(){
    setAdminMenuVisible(false);
    if(!getSupabaseSession())return Promise.resolve(false);
    return supabaseRpc('is_dtd_admin',{}).then(function(allowed){setAdminMenuVisible(allowed===true);return dtdAdminAccess;}).catch(function(){setAdminMenuVisible(false);return false;});
  }
  function syncDtdPublicProfile(){
    if(!getSupabaseSession()||!state.account)return Promise.resolve();
    var currentMood=(state.status&&state.status.mood)||'',statusText=JSON.stringify({label:(state.status&&state.status.label)||'',mood:currentMood,color:currentMood?moodColor(currentMood):''});
    return supabaseRpc('update_dtd_public_profile',{new_display_name:state.account.screenName||'',new_profile_picture:(state.profile&&state.profile.pic)||'',new_profile_header:(state.profile&&state.profile.header)||'',new_profile_about:(state.profile&&state.profile.aboutMe)||'',new_profile_status:statusText,new_profile_status_time:state.status&&state.status.ts?new Date(state.status.ts).toISOString():null});
  }
  function syncDtdPublicEntry(entry){
    if(!getSupabaseSession()||!entry)return Promise.resolve();
    return entry.shared?supabaseRpc('sync_dtd_public_entry',{entry_local_id:entry.id,entry_title:entry.title||'',entry_html:entry.html||'',entry_time:new Date(entry.ts||Date.now()).toISOString()}):supabaseRpc('remove_dtd_public_entry',{entry_local_id:entry.id});
  }
  function syncAllDtdPublicContent(){
    if(!getSupabaseSession())return Promise.resolve();
    return syncDtdPublicProfile().then(function(){return Promise.all((state.blogPosts||[]).map(syncDtdPublicEntry));});
  }

  function hasActiveSession(){
    try {
      if(localStorage.getItem(SESSION_KEY)==='1')return true;
      // Migrate active sessions created by older builds, which only survived
      // inside the current tab.
      if(sessionStorage.getItem(SESSION_KEY)==='1'){
        localStorage.setItem(SESSION_KEY,'1');
        return true;
      }
    } catch(e){}
    return false;
  }
  function setActiveSession(active){
    try {
      if(active) localStorage.setItem(SESSION_KEY, '1');
      else localStorage.removeItem(SESSION_KEY);
      // Clear the legacy per-tab value as well so Sign Out is definitive.
      sessionStorage.removeItem(SESSION_KEY);
    } catch(e){}
  }
