  // ================= DtD POST MAIL (offline fallback + online delivery) =================
  // ---- Private letters (Note to Self: Future Me / Anybody) shared helpers ----
  // These never touch real recipient lookup, friend search, or the send_dtd_message
  // recipient parameter with anything other than the current user's own address/handle.
  // The dtd_mailbox/send/read RPCs gate delivery on a caller-local calendar
  // date (client_timezone param). Without this, Postgres compares against the
  // database's own timezone (UTC), which can make an evening "tomorrow" in a
  // UTC-negative timezone already equal to UTC "today" and deliver early.
  function dtdClientTimezone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(e){return'UTC';}}
  var DTD_IMAGINARY_MARKER='⁣dtd-imaginary:';
  var DTD_DELIVERY_OPTIONS=[
    {id:'1d',label:'1 day',days:1},{id:'3d',label:'3 days',days:3},
    {id:'1w',label:'1 week',days:7},{id:'2w',label:'2 weeks',days:14},
    {id:'1m',label:'1 month',months:1},{id:'3m',label:'3 months',months:3},
    {id:'6m',label:'6 months',months:6},{id:'9m',label:'9 months',months:9},
    {id:'1y',label:'1 year',years:1},{id:'custom',label:'Custom date…'}
  ];
  function dtdLocalDateString(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
  function dtdOffsetDate(base,opt){var d=new Date(base.getTime());if(opt.days)d.setDate(d.getDate()+opt.days);if(opt.months)d.setMonth(d.getMonth()+opt.months);if(opt.years)d.setFullYear(d.getFullYear()+opt.years);return d;}
  function dtdDeliveryMinDate(){var t=new Date();t.setDate(t.getDate()+1);return dtdLocalDateString(t);}
  function dtdDeliveryMenuHtml(){
    var min=dtdDeliveryMinDate();
    return '<label><span>Send in</span><select id="dtd-delivery-option">'+DTD_DELIVERY_OPTIONS.map(function(o){return '<option value="'+o.id+'">'+escapeHtml(o.label)+'</option>';}).join('')+'</select></label><label class="dtd-delivery-custom-row" id="dtd-delivery-custom-row" style="display:none"><span>Custom date</span><input id="dtd-deliver-at" type="date" min="'+min+'" value="'+min+'"></label>';
  }
  function dtdWireDeliveryMenu(main){
    var select=main.querySelector('#dtd-delivery-option'),customRow=main.querySelector('#dtd-delivery-custom-row'),customInput=main.querySelector('#dtd-deliver-at'),min=dtdDeliveryMinDate();
    function sync(){customRow.style.display=select.value==='custom'?'grid':'none';}
    select.onchange=sync;sync();
    return function resolveDeliveryDate(){
      if(select.value==='custom')return(customInput.value&&customInput.value>=min)?customInput.value:'';
      var opt=DTD_DELIVERY_OPTIONS.find(function(o){return o.id===select.value;});
      return opt?dtdLocalDateString(dtdOffsetDate(new Date(),opt)):'';
    };
  }
  function mailLetterType(msg){if(!msg)return null;if(msg.letterType)return msg.letterType;if(msg.futureSelf)return'future-self';return null;}
  // "Future Me" letters are labeled by how long ago your past self actually
  // wrote them (not a fixed "Future Me" tag), e.g. "Me from 1 day ago",
  // "Me from 60 days ago" — computed live from the original write time so it
  // stays accurate no matter how long the letter sits unread.
  function futureSelfLabel(writtenAtMs){
    if(!writtenAtMs) return 'Future Me';
    var written=new Date(writtenAtMs),today=new Date();
    if(!Number.isFinite(written.getTime()))return'Future Me';
    var writtenDay=Date.UTC(written.getFullYear(),written.getMonth(),written.getDate());
    var todayDay=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
    var days=Math.max(0,Math.round((todayDay-writtenDay)/86400000));
    if(days<=0) return 'Me from today';
    if(days===1) return 'Me from 1 day ago';
    return 'Me from '+days+' days ago';
  }
  function futureSelfLabelParts(label){
    label=String(label||'');
    if(label.indexOf('Me ')!==0)return escapeHtml(label);
    return '<span class="dtd-future-me">Me</span> <span class="dtd-future-me-detail">'+escapeHtml(label.slice(3))+'</span>';
  }
  function futureSelfLabelHtml(label,writtenAtMs){
    var parts=futureSelfLabelParts(label),written=writtenAtMs?new Date(writtenAtMs).getTime():0;
    return written?'<span class="dtd-future-label" data-future-written-at="'+written+'" data-mail-age-name="Me">'+parts+'</span>':parts;
  }
  function mailAgeDetail(writtenAtMs){var label=futureSelfLabel(writtenAtMs);return label.indexOf('Me ')===0?label.slice(3):'';}
  function mailAgedPartyParts(name,writtenAtMs){var detail=mailAgeDetail(writtenAtMs);return '<span class="dtd-future-me">'+escapeHtml(name||'Unknown')+'</span>'+(detail?' <span class="dtd-future-me-detail">'+escapeHtml(detail)+'</span>':'');}
  function mailAgedPartyHtml(name,writtenAtMs){var written=writtenAtMs?new Date(writtenAtMs).getTime():0;return written?'<span class="dtd-future-label" data-future-written-at="'+written+'" data-mail-age-name="'+escapeHtml(name||'Unknown')+'">'+mailAgedPartyParts(name,written)+'</span>':escapeHtml(name||'Unknown');}
  function refreshFutureSelfLabels(){document.querySelectorAll('[data-future-written-at]').forEach(function(label){var written=Number(label.dataset.futureWrittenAt),name=label.dataset.mailAgeName||'Me';label.innerHTML=mailAgedPartyParts(name,written);});}
  setInterval(refreshFutureSelfLabels,60000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshFutureSelfLabels();});
  function mailDisplayParty(msg){var t=mailLetterType(msg);if(t==='imaginary')return msg.displayRecipient||'Unsent Letter';if(t==='future-self')return futureSelfLabel(msg.writtenAt||msg.ts);return null;}
  function mailDisplayPartyHtml(msg,fallback){var label=mailDisplayParty(msg)||fallback||'',writtenAt=msg&&(msg.writtenAt||msg.ts);return mailLetterType(msg)==='future-self'?futureSelfLabelHtml(label,writtenAt):escapeHtml(label);}
  function mailPenPalNickname(handle){
    var normalized=String(handle||'').trim().toLowerCase().split('@')[0];
    var contact=(state.mail.contacts||[]).find(function(item){return item.handle===normalized;});
    return contact&&contact.name?contact.name:'';
  }
  var dtdMailProfilePreviewCache={};
  function dtdMailProfilePreview(handle){
    handle=String(handle||'').trim().toLowerCase();
    if(!handle)return Promise.resolve(null);
    if(!dtdMailProfilePreviewCache[handle])dtdMailProfilePreviewCache[handle]=supabaseRpc('get_dtd_public_profile',{requested_handle:handle}).then(function(profile){if(!profile)delete dtdMailProfilePreviewCache[handle];return profile;}).catch(function(){delete dtdMailProfilePreviewCache[handle];return null;});
    return dtdMailProfilePreviewCache[handle];
  }
  function saveDtdMailToDiary(sourceId,subject,from,to,body,sentAt){
    sourceId=String(sourceId||'');
    state.blogPosts=state.blogPosts||[];
    if(sourceId&&state.blogPosts.some(function(entry){return entry.mailSourceId===sourceId;})){openInfoWindow('This letter is already saved in your diary.');return false;}
    var sentTime=new Date(sentAt||Date.now()).getTime();if(!Number.isFinite(sentTime))sentTime=Date.now();
    var messageHtml=escapeHtml(body||'').replace(/\r?\n/g,'<br>');
    var html='<div style="font-size:10px;color:#666;margin-bottom:10px"><b>From:</b> '+escapeHtml(from||'')+'<br><b>To:</b> '+escapeHtml(to||'')+'<br><b>Sent:</b> '+escapeHtml(scrapbookDate(sentTime))+'</div><hr><div>'+messageHtml+'</div>';
    state.blogPosts.push({id:uid(),title:(subject||'Untitled Letter'),html:html,ts:sentTime,shared:false,mailSourceId:sourceId,savedFromMailAt:Date.now()});
    saveState();
    trackDtdUsage('diary_entry_created');
    var diaryWindow=openWindows.find(function(w){return w.type==='diaryentries';});if(diaryWindow&&diaryWindow.el&&diaryWindow.el._refreshDiaryEntries)diaryWindow.el._refreshDiaryEntries();
    var profileWindow=openWindows.find(function(w){return w.type==='viewprofile';});if(profileWindow&&profileWindow.el&&profileWindow.el._refreshProfile)profileWindow.el._refreshProfile();
    openInfoWindow('Saved as a private diary entry.');return true;
  }
  function encodeImaginarySubject(displayRecipient,subject){return DTD_IMAGINARY_MARKER+encodeURIComponent(displayRecipient||'')+'⁣'+(subject||'');}
  function decodeImaginarySubject(raw){raw=raw||'';if(raw.indexOf(DTD_IMAGINARY_MARKER)!==0)return null;var rest=raw.slice(DTD_IMAGINARY_MARKER.length),sep=rest.indexOf('⁣');if(sep===-1)return null;return{displayRecipient:decodeURIComponent(rest.slice(0,sep)),subject:rest.slice(sep+1)};}
  function decodeOnlinePrivateLetter(m,profileHandle){if(!m||m.from_handle!==profileHandle||m.to_handle!==profileHandle)return null;var parsed=decodeImaginarySubject(m.message_subject);if(parsed)return{type:'imaginary',displayRecipient:parsed.displayRecipient,subject:parsed.subject};return{type:'future-self',displayRecipient:futureSelfLabel(m.created_at?new Date(m.created_at).getTime():null),subject:m.message_subject};}
  function sortDtdIncomingMail(rows,isUnread,getTime){
    return (rows||[]).slice().sort(function(a,b){
      var aUnread=!!isUnread(a),bUnread=!!isUnread(b);
      if(aUnread!==bUnread)return aUnread?-1:1;
      var aTime=Number(getTime(a))||0,bTime=Number(getTime(b))||0;
      return aUnread?aTime-bTime:bTime-aTime;
    });
  }
  var pigeonMailWindowObserver=null;
  function attachPigeonToMailWindow(el){
    var icon=pigeonIcon();if(!icon||!el)return;
    if(pigeonMailWindowObserver)pigeonMailWindowObserver.disconnect();
    function syncPigeonWindowEdge(){
      var iconRect=icon.getBoundingClientRect(),windowRect=el.getBoundingClientRect();
      icon.style.setProperty('--dtd-mail-window-top',Math.round(windowRect.top)+'px');
      icon.style.setProperty('--dtd-mail-window-pigeon-left',Math.round(iconRect.left+9)+'px');
    }
    syncPigeonWindowEdge();
    pigeonMailWindowObserver=new MutationObserver(syncPigeonWindowEdge);
    pigeonMailWindowObserver.observe(el,{attributes:true,attributeFilter:['style']});
    window.addEventListener('resize',syncPigeonWindowEdge);
    el._detachPigeonWindow=function(){
      if(pigeonMailWindowObserver)pigeonMailWindowObserver.disconnect();
      pigeonMailWindowObserver=null;
      window.removeEventListener('resize',syncPigeonWindowEdge);
      icon.style.removeProperty('--dtd-mail-window-top');
      icon.style.removeProperty('--dtd-mail-window-pigeon-left');
      delete el._detachPigeonWindow;
    };
  }
  function detachPigeonFromMailWindow(){
    var record=openWindows.find(function(w){return w.type==='dtdmail';});
    if(record&&record.el&&record.el._detachPigeonWindow)record.el._detachPigeonWindow();
  }
