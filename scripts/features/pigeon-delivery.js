  // ================= CARRIER-PIGEON DAILY DELIVERY CONTROLLER =================
  // Persisted delivery metadata lives in state.mail.pigeonDelivery. Animation
  // state and timers are deliberately session-only so a refresh cannot restore
  // a half-finished flight. All unread changes reconcile through this controller.
  var dtdDesktopDeliveryTimer=null,pigeonArrivalDelayTimer=null,pigeonAnimationTimer=null,pigeonDepartureTimer=null,pigeonOutgoingTimer=null;
  var pigeonRuntimeState='hidden',pigeonPendingMarker='',pigeonControllerReady=false,pigeonFetchInFlight=false,pigeonOutgoingActive=false;
  function desktopMailDateString(date){var d=date||new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
  function pigeonDeliveryState(){return state.mail.pigeonDelivery;}
  function pigeonMessageId(message){return String(message&&(message.message_id||message.id)||'');}
  function pigeonInbox(){return getSupabaseSession()?(Array.isArray(state.mail.onlineInboxCache)?state.mail.onlineInboxCache:[]):(Array.isArray(state.mail.inbox)?state.mail.inbox:[]);}
  function pigeonUnreadMessages(){return pigeonInbox().filter(function(message){return getSupabaseSession()?!message.read_at:!message.read;});}
  function pigeonBatchMarker(ids){return desktopMailDateString()+'|'+ids.slice().sort().join('|');}
  function pigeonIcon(){return document.getElementById('dtd-mailbox-icon');}
  var pigeonComposingActive=false;var pigeonComposeArriveTimer=null;
  function beginPigeonComposing(){
    var icon=pigeonIcon();if(!icon)return;
    // Moving between Compose and Note to Self is one continuous writing
    // session. Keep the already-perched pigeon still instead of replaying his
    // arrival every time the compose view changes.
    if(pigeonComposingActive){icon.classList.add('pigeon-composing');return;}
    pigeonComposingActive=true;
    clearTimeout(pigeonComposeArriveTimer);
    icon.classList.remove('pigeon-compose-arriving');void icon.offsetWidth;
    icon.classList.add('pigeon-composing','pigeon-compose-arriving');
    pigeonComposeArriveTimer=setTimeout(function(){icon.classList.remove('pigeon-compose-arriving');pigeonComposeArriveTimer=null;},900);
  }
  function endPigeonComposing(sent){var icon=pigeonIcon();pigeonComposingActive=false;if(!icon)return;icon.classList.remove('pigeon-composing');if(sent){playOutgoingPigeon();return;}if(icon.classList.contains('has-new-mail')||icon.classList.contains('pigeon-arriving')||icon.classList.contains('pigeon-departing')||icon.classList.contains('pigeon-sending'))return;playEmptyDeparture();}
  function playEmptyDeparture(){var icon=pigeonIcon();if(!icon)return;icon.classList.remove('has-new-mail','pigeon-arriving');void icon.offsetWidth;icon.classList.add('pigeon-departing');setTimeout(function(){icon.classList.remove('pigeon-departing');},920);}
  function clearPigeonTimers(){clearTimeout(pigeonArrivalDelayTimer);clearTimeout(pigeonAnimationTimer);clearTimeout(pigeonDepartureTimer);pigeonArrivalDelayTimer=pigeonAnimationTimer=pigeonDepartureTimer=null;}
  function hidePigeonImmediately(){var icon=pigeonIcon();clearPigeonTimers();pigeonPendingMarker='';pigeonRuntimeState='hidden';if(icon)icon.classList.remove('has-new-mail','pigeon-arriving','pigeon-departing');}
  function playOutgoingPigeon(){
    if(pigeonOutgoingActive)return;
    var icon=pigeonIcon();if(!icon)return;
    clearPigeonTimers();pigeonOutgoingActive=true;pigeonPendingMarker='';pigeonRuntimeState='hidden';
    icon.classList.remove('has-new-mail','pigeon-arriving','pigeon-departing','pigeon-sending');
    // Force a style pass so two successful sends can replay the same sequence.
    void icon.offsetWidth;icon.classList.add('pigeon-sending');
    pigeonOutgoingTimer=setTimeout(function(){
      icon.classList.remove('pigeon-sending');pigeonOutgoingTimer=null;pigeonOutgoingActive=false;
      // Sending mail must not dismiss an unread delivery pigeon. Restore the
      // correct waiting/hidden state as soon as the outgoing flight is over.
      reconcilePigeonDelivery();
    },2300);
  }
  function showPigeonWaiting(){var icon=pigeonIcon();if(!icon)return;clearPigeonTimers();pigeonPendingMarker='';pigeonRuntimeState='waiting';icon.classList.remove('pigeon-arriving','pigeon-departing');icon.classList.add('has-new-mail');}
  function completePigeonCycle(){var delivery=pigeonDeliveryState();delivery.acknowledged=true;delivery.activeBatchMarker='';delivery.presentedBatchMarker='';saveState();}
  function departPigeon(){
    var icon=pigeonIcon();
    if(pigeonRuntimeState==='hidden'){completePigeonCycle();return;}
    if(pigeonRuntimeState==='arrivalPending'){hidePigeonImmediately();completePigeonCycle();return;}
    if(pigeonRuntimeState==='departing')return;
    clearPigeonTimers();pigeonPendingMarker='';pigeonRuntimeState='departing';
    if(icon){icon.classList.remove('has-new-mail','pigeon-arriving');icon.classList.add('pigeon-departing');}
    pigeonDepartureTimer=setTimeout(function(){if(icon)icon.classList.remove('pigeon-departing');pigeonRuntimeState='hidden';completePigeonCycle();},920);
  }
  function schedulePigeonArrival(marker){
    if(pigeonRuntimeState==='arrivalPending'&&pigeonPendingMarker===marker)return;
    if(pigeonRuntimeState==='waiting'||pigeonRuntimeState==='arriving'){showPigeonWaiting();return;}
    hidePigeonImmediately();pigeonRuntimeState='arrivalPending';pigeonPendingMarker=marker;
    pigeonArrivalDelayTimer=setTimeout(function(){
      if(!document.body.classList.contains('signed-in')||!pigeonUnreadMessages().length){reconcilePigeonDelivery();return;}
      var icon=pigeonIcon();pigeonRuntimeState='arriving';
      if(icon){icon.classList.remove('pigeon-departing');icon.classList.add('has-new-mail','pigeon-arriving');}
      pigeonAnimationTimer=setTimeout(function(){
        if(icon)icon.classList.remove('pigeon-arriving');pigeonRuntimeState='waiting';
        var delivery=pigeonDeliveryState();delivery.presentedBatchMarker=marker;saveState();
      },1050);
    },5000);
  }
  function reconcilePigeonDelivery(newUnreadIds){
    if(!pigeonControllerReady||!document.body.classList.contains('signed-in'))return;
    if(pigeonOutgoingActive)return;
    var delivery=pigeonDeliveryState(),unread=pigeonUnreadMessages();newUnreadIds=(newUnreadIds||[]).filter(Boolean);
    if(!unread.length){departPigeon();return;}
    if(newUnreadIds.length){
      var marker=pigeonBatchMarker(newUnreadIds);delivery.activeBatchMarker=marker;delivery.acknowledged=false;
      if(pigeonRuntimeState==='waiting'||pigeonRuntimeState==='arriving'){delivery.presentedBatchMarker=marker;saveState();showPigeonWaiting();}
      else{delivery.presentedBatchMarker='';saveState();schedulePigeonArrival(marker);}
      return;
    }
    if(delivery.activeBatchMarker&&!delivery.acknowledged){
      if(delivery.presentedBatchMarker===delivery.activeBatchMarker)showPigeonWaiting();else schedulePigeonArrival(delivery.activeBatchMarker);
      return;
    }
    // Older unread mail or a message marked unread again restores the stationary
    // pigeon directly; it is not presented as a fake new delivery.
    showPigeonWaiting();
  }
  function rememberPigeonMessages(messages){
    var delivery=pigeonDeliveryState(),known={};delivery.knownMessageIds.forEach(function(id){known[id]=true;});
    var newUnread=[];messages.forEach(function(message){var id=pigeonMessageId(message);if(!id)return;if(!known[id]&&(getSupabaseSession()?!message.read_at:!message.read))newUnread.push(id);known[id]=true;});
    delivery.knownMessageIds=Object.keys(known).slice(-500);
    return newUnread;
  }
  function updatePigeonOnlineInbox(rows,deliveryDate){
    rows=rows||[];var newUnread=rememberPigeonMessages(rows);state.mail.onlineInboxCache=rows.slice();
    if(deliveryDate)state.mail.lastOnlineDeliveryDate=deliveryDate;
    saveState();reconcilePigeonDelivery(newUnread);return rows;
  }
  function deliverLocalDueMail(){
    var now=new Date(),today=desktopMailDateString(now);
    var due=state.mail.scheduled.filter(function(message){var deliveryDate=desktopMailDateString(new Date(message.deliverAt));return message.deliverAt<=now.getTime()&&(deliveryDate<today||now.getHours()>=8);});
    due.forEach(function(message){var delivered={id:uid(),from:message.from,to:message.to,subject:message.subject,body:message.body,ts:message.deliverAt,writtenAt:message.ts,read:false,letterType:mailLetterType(message)||'future-self'};if(delivered.letterType==='imaginary')delivered.displayRecipient=message.displayRecipient;state.mail.inbox.push(delivered);});
    if(due.length)state.mail.scheduled=state.mail.scheduled.filter(function(message){return message.deliverAt>now.getTime();});
    return due;
  }
  function refreshMailPigeonFromCache(){
    var newUnread=[];
    if(!getSupabaseSession())newUnread=rememberPigeonMessages(state.mail.inbox||[]);
    reconcilePigeonDelivery(newUnread);
  }
  function checkDesktopMailDelivery(){
    if(!document.body.classList.contains('signed-in'))return Promise.resolve();
    var now=new Date(),today=desktopMailDateString(now);
    if(!getSupabaseSession()){
      deliverLocalDueMail();var newUnread=rememberPigeonMessages(state.mail.inbox||[]);saveState();reconcilePigeonDelivery(newUnread);return Promise.resolve();
    }
    if(now.getHours()<8){reconcilePigeonDelivery();return Promise.resolve();}
    if(pigeonFetchInFlight)return Promise.resolve();pigeonFetchInFlight=true;
    return supabaseRpc('get_dtd_mailbox',{box_name:'inbox',client_timezone:dtdClientTimezone()}).then(function(rows){updatePigeonOnlineInbox(rows||[],today);}).catch(function(){reconcilePigeonDelivery();}).then(function(){pigeonFetchInFlight=false;});
  }
  function stopDesktopMailWatch(){clearInterval(dtdDesktopDeliveryTimer);clearTimeout(pigeonOutgoingTimer);dtdDesktopDeliveryTimer=pigeonOutgoingTimer=null;pigeonOutgoingActive=false;pigeonControllerReady=false;pigeonFetchInFlight=false;var icon=pigeonIcon();if(icon)icon.classList.remove('pigeon-sending');hidePigeonImmediately();}
  function startDesktopMailWatch(){
    stopDesktopMailWatch();pigeonControllerReady=true;
    // Saved state and cached mail have finished loading before this point. Older
    // unread mail is restored now; a newly fetched batch begins its five-second delay.
    reconcilePigeonDelivery();checkDesktopMailDelivery();dtdDesktopDeliveryTimer=setInterval(checkDesktopMailDelivery,60000);
  }

  function dtdContactHandle(value){return String(value||'').trim().toLowerCase().split('@')[0];}
  function saveDtdContact(handle,name){
    handle=dtdContactHandle(handle);name=String(name||'').trim();
    if(!/^[a-z0-9][a-z0-9._-]{1,18}[a-z0-9]$/.test(handle)||handle.indexOf('..')!==-1)return null;
    var existing=(state.mail.contacts||[]).find(function(contact){return contact.handle===handle;});
    if(existing){if(name)existing.name=name;saveState();return existing;}
    var contact={id:uid(),handle:handle,name:name};state.mail.contacts.push(contact);saveState();return contact;
  }
  function renderDtdContacts(main,onCompose){
    function render(){
      var contacts=(state.mail.contacts||[]).slice().sort(function(a,b){return (a.name||a.handle).localeCompare(b.name||b.handle);});
      main.innerHTML='<div class="dtd-heading">PenPals <button class="btn dtd-add-contact" style="float:right">Add+</button></div><div class="dtd-contact-list">'+(contacts.length?contacts.map(function(contact){var initials=(contact.name||contact.handle||'?').slice(0,2).toUpperCase();return '<div class="dtd-contact-row" data-contact-id="'+escapeHtml(contact.id)+'"><button class="dtd-contact-avatar" title="View profile">'+escapeHtml(initials)+'</button><button class="dtd-contact-name" title="View profile">'+escapeHtml(contact.name||contact.handle)+'<span class="dtd-contact-address">'+escapeHtml(contact.handle)+'@desktopdiary.local</span></button><button class="btn dtd-contact-write">Write</button><button class="btn dtd-contact-nickname">Nickname</button><button class="btn dtd-contact-delete" title="Delete pen pal">×</button></div>';}).join(''):'<div class="dtd-empty">No pen pals yet. Add a pen pal or save someone from a letter.</div>')+'</div>';
      main.querySelector('.dtd-add-contact').onclick=showAdd;
      main.querySelectorAll('[data-contact-id]').forEach(function(row){
        var contact=contacts.find(function(item){return item.id===row.dataset.contactId;});if(!contact)return;
        var avatar=row.querySelector('.dtd-contact-avatar');
        function openProfile(){if(!getSupabaseSession()){openInfoWindow('PenPal profiles are available when you are signed in online.');return;}openDtdPublicProfileWindow(contact.handle);}
        avatar.onclick=openProfile;row.querySelector('.dtd-contact-name').onclick=openProfile;
        if(getSupabaseSession())dtdMailProfilePreview(contact.handle).then(function(publicProfile){if(publicProfile&&publicProfile.profile_picture&&avatar.isConnected)avatar.innerHTML='<img src="'+escapeHtml(publicProfile.profile_picture)+'" alt="">';});
        row.querySelector('.dtd-contact-write').onclick=function(){onCompose(contact.handle);};
        row.querySelector('.dtd-contact-nickname').onclick=function(){appTextPrompt('Nickname for '+contact.handle+'@desktopdiary.local',contact.name||'',function(name){if(name===null)return;contact.name=name.trim().slice(0,50);saveState();render();});};
        row.querySelector('.dtd-contact-delete').onclick=function(){appConfirm('Remove '+(contact.name||contact.handle)+' from PenPals?',function(ok){if(!ok)return;state.mail.contacts=state.mail.contacts.filter(function(item){return item.id!==contact.id;});saveState();render();});};
      });
    }
    function showAdd(){
      main.innerHTML='<div class="dtd-heading">Add PenPal</div><div class="dtd-compose"><label><span>Nickname</span><input class="dtd-contact-new-name" placeholder="Optional nickname"></label><label><span>DtD username</span><span class="dtd-address-input"><input class="dtd-contact-new-handle" maxlength="20" placeholder="penpal" autocomplete="off" autocapitalize="none" spellcheck="false"><span class="dtd-address-suffix">@desktopdiary.local</span></span></label><div class="dtd-compose-actions"><button class="btn dtd-contact-cancel">Cancel</button><button class="btn dtd-contact-save">Save PenPal</button></div><div class="signon-error dtd-contact-error"></div></div>';
      var handle=main.querySelector('.dtd-contact-new-handle');
      handle.oninput=function(){handle.value=handle.value.toLowerCase().replace(/[^a-z0-9._-]/g,'');};
      main.querySelector('.dtd-contact-cancel').onclick=render;
      main.querySelector('.dtd-contact-save').onclick=function(){var contact=saveDtdContact(handle.value,main.querySelector('.dtd-contact-new-name').value);if(!contact){main.querySelector('.dtd-contact-error').textContent='Use a valid 3–20 character DtD username.';return;}render();};
      handle.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();main.querySelector('.dtd-contact-save').click();}};
      setTimeout(function(){handle.focus();},20);
    }
    render();
  }

