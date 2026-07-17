  function openDtdPostWindow(){
    trackDtdUsage('post_mail_opened');
    var existing=openWindows.find(function(w){return w.type==='dtdmail';});
    if(existing){focusWindow(existing.id);return;}
    if(getSupabaseSession()){openOnlineDtdPostWindow();return;}
    function suggestedHandle(){return ((state.account&&state.account.screenName)||'user').toLowerCase().replace(/[^a-z0-9._-]+/g,'.').replace(/^[._-]+|[._-]+$/g,'').slice(0,20)||'user';}
    function mailConstructionBar(){return '<div class="dtd-construction"><span>UNDER CONSTRUCTION · LOCAL DELIVERY ONLY</span></div>';}
    function mailboxBody(){return '<div class="dtd-shell"><div class="dtd-sidebar"><button class="btn" id="dtd-compose">Compose</button><button class="btn" id="dtd-future">Note to Self</button><button class="btn dtd-folder active" data-folder="inbox">Inbox</button><button class="btn dtd-folder" data-folder="sent">Sent</button><button class="btn dtd-folder" data-folder="contacts">PenPals</button></div><div class="dtd-main"><div class="dtd-heading">Inbox</div><div class="dtd-list"></div></div></div>';}
    var setup='<div style="padding:18px;text-align:center"><div class="dtd-heading">Choose your Post Mail address</div><p style="font-size:11px;line-height:1.45;color:#555">Your address is separate from your screen name, so your screen name can change later without affecting your mail.</p><div style="display:flex;justify-content:center;align-items:center;gap:4px;margin:16px 0"><input id="dtd-handle" type="text" maxlength="20" value="'+escapeHtml(suggestedHandle())+'" style="width:130px;padding:6px;border:1px solid #888;text-align:right"><b style="font-size:11px">@desktopdiary.local</b></div><div id="dtd-address-status" style="min-height:28px;font-size:10px;color:#555">3–20 characters: letters, numbers, dots, dashes, or underscores.</div><button class="btn" id="dtd-reserve" style="padding:7px 16px">Reserve Address</button><div style="font-size:9px;color:#777;border-top:1px solid #ccc;margin-top:17px;padding-top:9px">This reserves the address in this copy of DesktopDiary. Worldwide availability will be added when DtD accounts connect online.</div></div>';
    var body='<div class="win-body">'+mailConstructionBar()+(state.mail.address?mailboxBody():setup)+'</div>';
    createWindow({title:'DtD Post Mail',extraClass:'dtd-win',initialLeft:74,initialTop:72,bodyHtml:body,type:'dtdmail',onClose:function(){detachPigeonFromMailWindow();pigeonIcon().classList.remove('mail-window-open');if(pigeonComposingActive)endPigeonComposing(false);},onMount:function(el){
      pigeonIcon().classList.add('mail-window-open');
      attachPigeonToMailWindow(el);
      function mountMailbox(){
      el.querySelector('.win-body').innerHTML=mailConstructionBar()+mailboxBody();
      var main=el.querySelector('.dtd-main'),folder='inbox';
      function localAddress(){return state.mail.address;}
      function deliverDue(){
        var before=state.mail.inbox.length;deliverLocalDueMail();refreshMailPigeonFromCache();saveState();return state.mail.inbox.length>before;
      }
      function setFolder(name){folder=name;el.querySelectorAll('.dtd-folder').forEach(function(b){b.classList.toggle('active',b.dataset.folder===name);});renderList();}
      function deleteLocalMailById(messageId){
        function execute(){
          var list=state.mail[folder]||[];
          var removeIndex=list.findIndex(function(item){return item.id===messageId;});
          if(removeIndex===-1)return;
          list.splice(removeIndex,1);
          saveState();
          if(folder==='inbox')refreshMailPigeonFromCache();
          renderList();
          openInfoWindow('Message deleted.');
        }
        if(window.appConfirm){
          window.appConfirm('Delete this message?',function(ok){
            if(!ok)return;
            execute();
          });
          return;
        }
        if(!window.confirm('Delete this message?'))return;
        execute();
      }
      function renderList(){
        if(pigeonComposingActive)endPigeonComposing(false);
        deliverDue();
        refreshMailPigeonFromCache();
        if(folder==='contacts'){renderDtdContacts(main,function(handle){showCompose(handle+'@desktopdiary.local','');});return;}
        var sourceList=state.mail&&state.mail[folder]||[];
        var list=folder==='inbox'?sortDtdIncomingMail(sourceList,function(m){return !m.read;},function(m){return m.ts;}):sourceList.slice().sort(function(a,b){return b.ts-a.ts;});
        var heading=folder==='inbox'?'Inbox':(folder==='sent'?'Sent':'Scheduled');
        main.innerHTML='<div class="dtd-heading">'+heading+(folder==='inbox'?' ('+list.filter(function(m){return !m.read;}).length+' unread)':'')+'</div><div class="dtd-list">'+(list.length?list.map(function(m){var party=folder==='inbox'?(mailPenPalNickname(m.from)||m.from):m.to,partyHtml=mailLetterType(m)?mailDisplayPartyHtml(m,party):(folder==='inbox'?mailAgedPartyHtml(party,m.ts):escapeHtml(party));return '<div class="dtd-row'+(!m.read&&folder==='inbox'?' unread':'')+'" data-mail-id="'+escapeHtml(m.id)+'"><span>'+partyHtml+'</span><span class="dtd-subject">'+escapeHtml(m.subject||'(no subject)')+'</span><time>'+escapeHtml(fmtDateShort(folder==='scheduled'?m.deliverAt:m.ts))+'</time><button class="btn dtd-row-delete">Delete</button></div>';}).join(''):'<div class="dtd-empty">No messages here.</div>')+'</div>';
        main.querySelectorAll('[data-mail-id]').forEach(function(row){
          var rowId=row.dataset.mailId;
          row.onclick=function(){openMessage(rowId);};
          var deleteButton=row.querySelector('.dtd-row-delete');
          if(deleteButton){
            deleteButton.onclick=function(event){
              event.stopPropagation();
              deleteLocalMailById(rowId);
            };
          }
        });
      }
      function openMessage(id){
        var msg=(state.mail[folder]||[]).find(function(m){return m.id===id;});if(!msg)return;
        if(folder==='inbox'&&!msg.read){msg.read=true;saveState();refreshMailPigeonFromCache();}
        var privateType=mailLetterType(msg),hideActions=folder==='scheduled'||!!privateType;
        var metaFrom=privateType?'You':msg.from,metaTo=privateType?mailDisplayParty(msg):msg.to,metaToHtml=privateType==='future-self'?mailDisplayPartyHtml(msg,metaTo):escapeHtml(metaTo);
        var disclaimer=privateType==='imaginary'?'<div style="padding:0 10px 8px;font-size:9px;font-weight:bold;color:#a3261e">This letter will never be sent to this person.</div>':'';
        var footerActions=folder==='scheduled'?'':'<button class="btn dtd-save-diary">Save to Diary</button>';
        if(!hideActions)footerActions+=(footerActions?' ':'')+'<button class="btn dtd-save-contact">Save PenPal</button> <button class="btn dtd-reply">Reply</button>';
        footerActions+=(footerActions?' ':'')+'<button class="btn dtd-delete-mail">Delete</button>';
        main.innerHTML='<div class="dtd-meta"><b>'+escapeHtml(msg.subject||'(no subject)')+'</b><br>From: '+escapeHtml(metaFrom)+'<br>To: '+metaToHtml+'<br>'+(folder==='scheduled'?'Delivery: ':'')+escapeHtml(scrapbookDate(folder==='scheduled'?msg.deliverAt:msg.ts))+'</div>'+disclaimer+'<div class="dtd-message">'+escapeHtml(msg.body||'')+'</div>'+(hideActions?'':'<div class="dtd-inline-reply" style="display:none"><textarea class="dtd-inline-reply-body" placeholder="Write a fresh letter back…"></textarea><div class="dtd-inline-reply-actions"><span class="dtd-inline-reply-note">The previous letter will not be included.</span><span><button class="btn dtd-reply-cancel">Cancel</button> <button class="btn dtd-reply-send">Send Reply</button></span></div><div class="signon-error dtd-reply-error"></div></div>')+'<div style="padding:7px;border-top:1px solid #ccc;display:flex;justify-content:space-between"><button class="btn dtd-back">Back</button>'+(footerActions?'<span>'+footerActions+'</span>':'')+'</div>';
        main.querySelector('.dtd-back').onclick=renderList;
        if(main.querySelector('.dtd-save-diary'))main.querySelector('.dtd-save-diary').onclick=function(){saveDtdMailToDiary('local:'+msg.id,msg.subject,metaFrom,metaTo,msg.body,msg.ts);};
        if(main.querySelector('.dtd-save-contact'))main.querySelector('.dtd-save-contact').onclick=function(){var contact=saveDtdContact(folder==='inbox'?msg.from:msg.to,'');openInfoWindow(contact?'Saved to PenPals.':'That DtD address is not valid.');};
        if(main.querySelector('.dtd-delete-mail'))main.querySelector('.dtd-delete-mail').onclick=function(){deleteLocalMailById(msg.id);};
        if(main.querySelector('.dtd-reply'))main.querySelector('.dtd-reply').onclick=function(){var box=main.querySelector('.dtd-inline-reply');box.style.display='grid';main.querySelector('.dtd-reply').style.display='none';beginPigeonComposing();box.querySelector('textarea').focus();};
        if(main.querySelector('.dtd-reply-cancel'))main.querySelector('.dtd-reply-cancel').onclick=function(){main.querySelector('.dtd-inline-reply').style.display='none';main.querySelector('.dtd-reply').style.display='';endPigeonComposing(false);};
        if(main.querySelector('.dtd-reply-send'))main.querySelector('.dtd-reply-send').onclick=function(){var body=main.querySelector('.dtd-inline-reply-body').value,text=body.trim(),recipient=folder==='inbox'?msg.from:msg.to;if(!text){main.querySelector('.dtd-reply-error').textContent='Write your reply first.';return;}var reply={id:uid(),from:localAddress(),to:recipient,subject:msg.subject||'',body:body,ts:Date.now(),read:true};state.mail.sent.push(reply);if(recipient.toLowerCase()===localAddress()||recipient.toLowerCase()==='self')state.mail.inbox.push({id:uid(),from:reply.from,to:reply.to,subject:reply.subject,body:reply.body,ts:reply.ts,read:false});saveState();trackDtdUsage('letter_sent');endPigeonComposing(true);openInfoWindow('Your reply is sealed and will be delivered at the next 8:00am.');renderList();};
      }
      function showCompose(to,subject){
        beginPigeonComposing();
        main.innerHTML='<div class="dtd-heading">New Message</div><div class="dtd-compose"><label><span>From</span><input type="text" value="'+escapeHtml(localAddress())+'" readonly></label><label><span>To</span><input id="dtd-to" type="text" value="'+escapeHtml(to||'')+'" placeholder="name@desktopdiary.local"></label><label><span>Subject</span><input id="dtd-subject" type="text" value="'+escapeHtml(subject||'')+'"></label><textarea id="dtd-body" placeholder="Plain text only…"></textarea><div class="dtd-compose-actions"><button class="btn dtd-compose-cancel">Cancel</button><button class="btn dtd-send">Send</button></div><div class="signon-error dtd-error"></div></div>';
        var toEl=main.querySelector('#dtd-to'),subEl=main.querySelector('#dtd-subject'),bodyEl=main.querySelector('#dtd-body');
        main.querySelector('.dtd-compose-cancel').onclick=renderList;
        main.querySelector('.dtd-send').onclick=function(){
          var recipient=toEl.value.trim(),text=bodyEl.value;if(!recipient){main.querySelector('.dtd-error').textContent='Enter a recipient.';return;}if(!text.trim()){main.querySelector('.dtd-error').textContent='Write a message first.';return;}
          var msg={id:uid(),from:localAddress(),to:recipient,subject:subEl.value.trim(),body:text,ts:Date.now(),read:true};state.mail.sent.push(msg);
          if(recipient.toLowerCase()===localAddress()||recipient.toLowerCase()==='self'){state.mail.inbox.push({id:uid(),from:msg.from,to:msg.to,subject:msg.subject,body:msg.body,ts:msg.ts,read:false});}
          saveState();trackDtdUsage('letter_sent');endPigeonComposing(true);setFolder('sent');
        };
        setTimeout(function(){(to?bodyEl:toEl).focus();},20);
      }
      function schedulePrivateLetter(letterType,displayRecipient,resolveDeliveryDate){
        var dateValue=resolveDeliveryDate(),when=dateValue?new Date(dateValue+'T08:00:00').getTime():0,text=main.querySelector('#dtd-body').value;
        if(!when){main.querySelector('.dtd-error').textContent='Choose a delivery time.';return;}
        if(!text.trim()){main.querySelector('.dtd-error').textContent='Write a message first.';return;}
        var record={id:uid(),from:localAddress(),to:localAddress(),subject:main.querySelector('#dtd-subject').value.trim(),body:text,ts:Date.now(),deliverAt:when,read:true,letterType:letterType};
        if(letterType==='imaginary')record.displayRecipient=displayRecipient;
        state.mail.scheduled.push(record);saveState();trackDtdUsage('letter_sent');endPigeonComposing(true);openInfoWindow('Your letter is sealed. It will be delivered at 8:00am on '+new Date(dateValue+'T08:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})+'.', 'Letter Sealed');setFolder('inbox');
      }
      function showFutureCompose(){
        // Bird already arrived when "Note to Self" was clicked (see
        // showPrivateLetterChoice caller) — don't retrigger the arrival here.
        main.innerHTML='<div class="dtd-heading">Note to Future Me</div><div class="dtd-compose"><label><span>To</span><input type="text" value="Future Me" readonly></label>'+dtdDeliveryMenuHtml()+'<label><span>Subject</span><input id="dtd-subject" type="text" placeholder="A note for later"></label><textarea id="dtd-body" placeholder="What would you like to receive later?"></textarea><div style="font-size:9px;color:#666">It will arrive the first time DesktopDiary is open on or after this date.</div><div class="dtd-compose-actions"><button class="btn dtd-compose-cancel">Cancel</button><button class="btn dtd-schedule">Schedule</button></div><div class="signon-error dtd-error"></div></div>';
        var resolveDeliveryDate=dtdWireDeliveryMenu(main);
        main.querySelector('.dtd-compose-cancel').onclick=showPrivateLetterChoice;
        main.querySelector('.dtd-schedule').onclick=function(){schedulePrivateLetter('future-self',null,resolveDeliveryDate);};
        setTimeout(function(){main.querySelector('#dtd-subject').focus();},20);
      }
      function showImaginaryCompose(){
        // Bird already arrived when "Note to Self" was clicked (see
        // showPrivateLetterChoice caller) — don't retrigger the arrival here.
        main.innerHTML='<div class="dtd-heading">Anybody</div><div class="dtd-compose"><label><span>To</span><input id="dtd-imaginary-to" type="text" placeholder="e.g. My Boss, Mom, The Universe"></label>'+dtdDeliveryMenuHtml()+'<label><span>Subject</span><input id="dtd-subject" type="text" placeholder="A letter you need to write"></label><textarea id="dtd-body" placeholder="Say what you need to say…"></textarea><div style="font-size:9px;font-weight:bold;color:#a3261e">This letter will never be sent to this person.</div><div class="dtd-compose-actions"><button class="btn dtd-compose-cancel">Cancel</button><button class="btn dtd-schedule">Schedule</button></div><div class="signon-error dtd-error"></div></div>';
        var resolveDeliveryDate=dtdWireDeliveryMenu(main);
        main.querySelector('.dtd-compose-cancel').onclick=showPrivateLetterChoice;
        main.querySelector('.dtd-schedule').onclick=function(){
          var to=main.querySelector('#dtd-imaginary-to').value.trim();
          if(!to){main.querySelector('.dtd-error').textContent='Enter who this letter is to.';return;}
          schedulePrivateLetter('imaginary',to,resolveDeliveryDate);
        };
        setTimeout(function(){main.querySelector('#dtd-imaginary-to').focus();},20);
      }
      function showPrivateLetterChoice(){
        // Note: no endPigeonComposing here — the bird should stay put for the
        // whole Note to Self flow (choice screen <-> Future Me/Anybody), not
        // fly off and back again every time you go back to this screen.
        main.innerHTML='<div class="dtd-heading">Note to Self</div><div class="dtd-compose" style="text-align:center"><p style="font-size:11px;color:#555;line-height:1.5;text-align:left;margin:0">Private letters stay with you. Choose the kind of letter to write.</p><button class="btn" id="dtd-private-futureself" style="padding:10px">Future Me</button><button class="btn" id="dtd-private-imaginary" style="padding:10px">Anybody</button><div class="dtd-compose-actions"><button class="btn dtd-compose-cancel">Cancel</button></div></div>';
        main.querySelector('.dtd-compose-cancel').onclick=renderList;
        main.querySelector('#dtd-private-futureself').onclick=showFutureCompose;
        main.querySelector('#dtd-private-imaginary').onclick=showImaginaryCompose;
      }
      el.querySelector('#dtd-compose').onclick=function(){showCompose('','');};
      el.querySelector('#dtd-future').onclick=function(){ beginPigeonComposing(); showPrivateLetterChoice(); };
      el.querySelectorAll('.dtd-folder').forEach(function(b){b.onclick=function(){setFolder(b.dataset.folder);};});
      renderList();
      var deliveryTimer=setInterval(function(){if(deliverDue()&&folder==='inbox')renderList();},30000);
      var winRecord=openWindows.find(function(w){return w.el===el;});if(winRecord)winRecord.dtdDeliveryTimer=deliveryTimer;
      }
      if(state.mail.address){mountMailbox();return;}
      var handleEl=el.querySelector('#dtd-handle'),statusEl=el.querySelector('#dtd-address-status'),reserveEl=el.querySelector('#dtd-reserve');
      function checkHandle(){
        var h=handleEl.value.trim().toLowerCase(),valid=/^[a-z0-9][a-z0-9._-]{1,18}[a-z0-9]$/.test(h)&&h.indexOf('..')===-1;
        statusEl.textContent=valid?'Available in this DesktopDiary: '+h+'@desktopdiary.local':'Use 3–20 characters, beginning and ending with a letter or number.';
        statusEl.style.color=valid?'#18752c':'#b3261e';reserveEl.disabled=!valid;return valid?h:'';
      }
      handleEl.oninput=checkHandle;
      handleEl.onkeydown=function(e){if(e.key==='Enter'&&!reserveEl.disabled){e.preventDefault();reserveEl.click();}};
      reserveEl.onclick=function(){var h=checkHandle();if(!h)return;state.mail.address=h+'@desktopdiary.local';state.mail.inbox.forEach(function(m){if(m.from==='postmaster@desktopdiary.local')m.to=state.mail.address;});saveState();mountMailbox();};
      checkHandle();
    }});
  }
