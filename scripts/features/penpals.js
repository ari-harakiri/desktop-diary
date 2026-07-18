  var dtdPenPalNotificationTimer=null,penPalNotificationCheckInFlight=false;
  function penPalNotificationState(){return state.companion.penPalNotifications;}
  function uniqueHandles(handles){return handles.filter(function(handle,index,list){return handle&&list.indexOf(handle)===index;});}
  function refreshKobaPendingAlerts(){
    var alerts=penPalNotificationState().unreadAlerts,companion=document.getElementById('desktop-companion');
    if(companion)companion.classList.toggle('has-pending-notification',alerts.length>0);
    if(window.refreshKobaMemos)window.refreshKobaMemos();
    if(window.showKobaNotification)alerts.forEach(function(alert){window.showKobaNotification(alert.message,alert.openRequests,alert.id);});
  }
  function addPenPalAlert(id,message,openRequests){
    var alerts=penPalNotificationState().unreadAlerts;
    if(!alerts.some(function(alert){return alert.id===id;}))alerts.push({id:id,message:message,openRequests:!!openRequests});
    saveState();refreshKobaPendingAlerts();
  }
  function acknowledgePenPalAlert(id){
    var notificationState=penPalNotificationState();
    notificationState.unreadAlerts=notificationState.unreadAlerts.filter(function(alert){return alert.id!==id;});
    saveState();refreshKobaPendingAlerts();
  }
  window.acknowledgePenPalAlert=acknowledgePenPalAlert;
  window.restorePendingPenPalAlerts=refreshKobaPendingAlerts;
  function rememberPendingPenPalRequest(handle){
    handle=String(handle||'').trim().toLowerCase();if(!handle)return;
    var notificationState=penPalNotificationState();
    notificationState.pendingOutgoing=uniqueHandles(notificationState.pendingOutgoing.concat(handle));
    saveState();
  }
  function checkPenPalNotifications(){
    if(!document.body.classList.contains('signed-in')||!getSupabaseSession()||penPalNotificationCheckInFlight)return Promise.resolve();
    refreshKobaPendingAlerts();
    penPalNotificationCheckInFlight=true;
    return supabaseRpc('list_dtd_friend_requests',{}).then(function(rows){
      rows=rows||[];
      var notificationState=penPalNotificationState();
      var incoming=rows.filter(function(row){return row.direction==='incoming';});
      var currentIncoming=uniqueHandles(incoming.map(function(row){return String(row.handle||'');}));
      var currentOutgoing=uniqueHandles(rows.filter(function(row){return row.direction==='outgoing';}).map(function(row){return String(row.handle||'');}));
      var newIncoming=incoming.filter(function(row){return notificationState.knownIncoming.indexOf(String(row.handle||''))===-1;});
      var previousOutgoing=notificationState.pendingOutgoing.slice();
      var resolvedCandidates=previousOutgoing.filter(function(handle){return currentOutgoing.indexOf(handle)===-1;});
      notificationState.knownIncoming=currentIncoming;
      if(newIncoming.length){
        newIncoming.forEach(function(request){var sender=request.display_name||request.handle;addPenPalAlert('incoming:'+request.handle,sender+' sent you a PenPal request! Click me to see it.',true);});
      }
      return Promise.all(resolvedCandidates.map(function(handle){
        return supabaseRpc('get_dtd_public_profile',{requested_handle:handle}).then(function(profile){return{handle:handle,profile:profile};}).catch(function(){return{handle:handle,profile:null};});
      })).then(function(results){
        var nextPending=currentOutgoing.slice();
        results.forEach(function(result){
          var profile=result.profile,status=profile&&profile.friend_status;
          if(status==='friends'){
            addPenPalAlert('accepted:'+result.handle,(profile.display_name||result.handle)+' accepted your PenPal request! Click me to dismiss this message.',false);
          }else if(!profile||status==='pending_outgoing')nextPending.push(result.handle);
        });
        notificationState.pendingOutgoing=uniqueHandles(nextPending);
        return saveState();
      });
    }).catch(function(){}).then(function(){penPalNotificationCheckInFlight=false;});
  }
  function stopPenPalNotificationWatch(){clearInterval(dtdPenPalNotificationTimer);dtdPenPalNotificationTimer=null;penPalNotificationCheckInFlight=false;}
  function startPenPalNotificationWatch(){stopPenPalNotificationWatch();refreshKobaPendingAlerts();checkPenPalNotifications();dtdPenPalNotificationTimer=setInterval(checkPenPalNotifications,60000);}

  function openFriendRequestsWindow(){
    var existing=openWindows.find(function(w){return w.type==='dtdfriendrequests';});if(existing){focusWindow(existing.id);return;}
    createWindow({title:'PenPal Requests',extraClass:'profile-win',bodyHtml:'<div class="win-body vp-body"><div class="vp-empty">Loading…</div></div>',type:'dtdfriendrequests',onMount:function(el){
      function row(r){
        var actions=r.direction==='incoming'
          ?'<button class="btn dtd-fr-accept" data-handle="'+escapeHtml(r.handle)+'">Accept</button> <span class="forgot-link dtd-fr-decline" data-handle="'+escapeHtml(r.handle)+'">Decline</span>'
          :'<span class="forgot-link dtd-fr-cancel" data-handle="'+escapeHtml(r.handle)+'">Cancel</span>';
        return '<div class="dtd-row" style="cursor:default"><span class="dtd-fr-name" data-handle="'+escapeHtml(r.handle)+'" style="cursor:pointer;text-decoration:underline">'+escapeHtml(r.display_name||r.handle)+'</span><span style="font-size:9px;color:#777;margin-left:6px">'+(r.direction==='incoming'?'wants to be PenPals':'PenPal request sent')+'</span><span style="margin-left:auto;display:flex;gap:6px;align-items:center">'+actions+'</span></div>';
      }
      function load(){
        if(!getSupabaseSession()){el.querySelector('.win-body').innerHTML='<div class="vp-empty">PenPal requests are only available with an online account.</div>';return;}
        el.querySelector('.win-body').innerHTML='<div class="vp-empty">Loading…</div>';
        supabaseRpc('list_dtd_friend_requests',{}).then(function(rows){
          rows=rows||[];
          el.querySelector('.win-body').innerHTML=rows.length?('<div class="dtd-list">'+rows.map(row).join('')+'</div>'):'<div class="vp-empty">No pending PenPal requests.</div>';
          el.querySelectorAll('.dtd-fr-name').forEach(function(s){s.onclick=function(){openDtdPublicProfileWindow(s.dataset.handle);};});
          el.querySelectorAll('.dtd-fr-accept').forEach(function(b){b.onclick=function(){supabaseRpc('respond_dtd_friend_request',{requester_handle:b.dataset.handle,accept:true}).then(function(){acknowledgePenPalAlert('incoming:'+b.dataset.handle);return load();}).catch(function(err){openInfoWindow(err.message);});};});
          el.querySelectorAll('.dtd-fr-decline').forEach(function(s){s.onclick=function(){supabaseRpc('respond_dtd_friend_request',{requester_handle:s.dataset.handle,accept:false}).then(function(){acknowledgePenPalAlert('incoming:'+s.dataset.handle);return load();}).catch(function(err){openInfoWindow(err.message);});};});
          el.querySelectorAll('.dtd-fr-cancel').forEach(function(s){s.onclick=function(){supabaseRpc('remove_dtd_friend',{other_handle:s.dataset.handle}).then(load).catch(function(err){openInfoWindow(err.message);});};});
        }).catch(function(err){el.querySelector('.win-body').innerHTML='<div class="vp-empty">'+escapeHtml(err.message)+'</div>';});
      }
      load();
    }});
  }

  function openDtdPublicProfileWindow(handle){
    var existing=openWindows.find(function(w){return w.type==='dtdpublicprofile'&&w.dtdHandle===handle;});if(existing){focusWindow(existing.id);return;}
    createWindow({title:handle+'\'s Profile',extraClass:'profile-win',bodyHtml:'<div class="win-body vp-body"><div class="vp-empty">Loading profile…</div></div>',type:'dtdpublicprofile',onMount:function(el){var rec=openWindows.find(function(w){return w.el===el;});if(rec)rec.dtdHandle=handle;
      function load(){
        el.querySelector('.win-body').innerHTML='<div class="vp-empty">Loading profile…</div>';
        supabaseRpc('get_dtd_public_profile',{requested_handle:handle}).then(function(p){if(!p)throw new Error('This profile is unavailable.');
          var pic=p.profile_picture?'<img src="'+escapeHtml(p.profile_picture)+'" class="vp-pic">':'',header=sanitizeProfileHTML(p.profile_header||''),about=sanitizeProfileHTML(p.profile_about||''),statusRaw=String(p.profile_status||''),statusLabel='',statusMood='',statusMoodColor='#333333';
          try{var parsedStatus=JSON.parse(statusRaw);statusLabel=parsedStatus.label||'';statusMood=parsedStatus.mood||'';if(/^#[0-9a-f]{6}$/i.test(parsedStatus.color||''))statusMoodColor=parsedStatus.color;}catch(e){statusLabel=statusRaw;}
          var friendStatus=p.friend_status||'none',authorized=friendStatus==='friends'||friendStatus==='self';
          var entries=Array.isArray(p.entries)?p.entries:[];
          var posts=authorized?(entries.length?entries.map(function(entry){return '<div class="blog-post"><div class="blog-post-header"><div><div class="blog-post-title">'+escapeHtml(entry.title||'Untitled')+'</div><div class="blog-post-date">'+fmtDayDivider(Number(entry.ts)||Date.now())+'</div></div></div><div class="blog-post-body">'+sanitizeHTML(entry.html||'')+'</div></div>';}).join(''):'<div class="vp-empty">No diary entries have been shared.</div>'):'';
          var actionHtml='';
          if(friendStatus==='none')actionHtml='<button class="btn" id="dtd-friend-add">Add PenPal</button>';
          else if(friendStatus==='pending_outgoing')actionHtml='<span style="font-size:10px;color:#555">PenPal request sent</span> <span class="forgot-link" id="dtd-friend-cancel">Cancel</span>';
          else if(friendStatus==='pending_incoming')actionHtml='<span style="font-size:10px;color:#555">Wants to be PenPals</span> <button class="btn" id="dtd-friend-accept">Accept</button> <span class="forgot-link" id="dtd-friend-decline">Decline</span>';
          else if(friendStatus==='friends')actionHtml='<span style="font-size:10px;color:#18752c">&#10003; PenPals</span> <span class="forgot-link" id="dtd-friend-remove">Remove PenPal</span>';
          var gateNote=(!authorized)?'<div class="vp-empty" style="font-size:10px">Add '+escapeHtml(p.display_name||p.handle)+' as a PenPal to see their profile and diary entries.</div>':'';
          el.querySelector('.win-body').outerHTML='<div class="win-body vp-body"><div class="vp-header">'+pic+'<div class="vp-name">'+escapeHtml(p.display_name||p.handle)+(statusMood?' <span class="vp-mood">is <span style="color:'+statusMoodColor+'">'+escapeHtml(statusMood)+'</span></span>':'')+'</div>'+(statusLabel?'<div class="vp-status"><b>Status:</b> '+escapeHtml(statusLabel)+'</div>':'')+'<div style="font-size:10px;color:#777">'+escapeHtml(p.handle)+'@desktopdiary.local</div>'+(actionHtml?'<div class="dtd-friend-actions" style="margin-top:6px;display:flex;align-items:center;justify-content:center;gap:6px">'+actionHtml+'</div>':'')+'<div class="signon-error dtd-friend-error" style="text-align:center"></div></div>'+gateNote+(header?'<div class="vp-section">'+header+'</div>':'')+(about?'<div class="vp-section">'+about+'</div>':'')+(authorized?'<div class="blog-posts-list">'+posts+'</div>':'')+'</div>';
          wire();
        }).catch(function(err){el.querySelector('.win-body').innerHTML='<div class="vp-empty">'+escapeHtml(err.message)+'</div>';});
      }
      function wire(){
        var errEl=el.querySelector('.dtd-friend-error');
        function onErr(err){if(errEl)errEl.textContent=err.message;}
        var addBtn=el.querySelector('#dtd-friend-add');if(addBtn)addBtn.onclick=function(){addBtn.disabled=true;supabaseRpc('send_dtd_friend_request',{recipient_handle:handle}).then(function(){rememberPendingPenPalRequest(handle);return load();}).catch(function(err){onErr(err);addBtn.disabled=false;});};
        var cancelBtn=el.querySelector('#dtd-friend-cancel');if(cancelBtn)cancelBtn.onclick=function(){supabaseRpc('remove_dtd_friend',{other_handle:handle}).then(load).catch(onErr);};
        var acceptBtn=el.querySelector('#dtd-friend-accept');if(acceptBtn)acceptBtn.onclick=function(){supabaseRpc('respond_dtd_friend_request',{requester_handle:handle,accept:true}).then(function(){acknowledgePenPalAlert('incoming:'+handle);return load();}).catch(onErr);};
        var declineBtn=el.querySelector('#dtd-friend-decline');if(declineBtn)declineBtn.onclick=function(){supabaseRpc('respond_dtd_friend_request',{requester_handle:handle,accept:false}).then(function(){acknowledgePenPalAlert('incoming:'+handle);return load();}).catch(onErr);};
        var removeBtn=el.querySelector('#dtd-friend-remove');if(removeBtn)removeBtn.onclick=function(){appConfirm('Remove '+handle+' as a PenPal?',function(ok){if(!ok)return;supabaseRpc('remove_dtd_friend',{other_handle:handle}).then(load).catch(onErr);});};
      }
      load();
    }});
  }

