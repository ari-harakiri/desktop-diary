  // ================= HELP WINDOW =================
  function openHelpWindow(){
    trackDtdUsage('help_opened');
    var body='<div class="win-body" style="font-size:12px;line-height:1.6;padding:10px;">'+
      '<div class="help-section-title">Help / How It Works</div>'+
      '<div class="site-instruction-copy">'+escapeHtml(dtdSiteContent.help_instructions)+'</div>'+
      '<div class="help-section-title" style="margin-top:14px;">📱 Add to Home Screen</div>'+
      '<div class="site-instruction-copy">'+escapeHtml(dtdSiteContent.install_instructions)+'</div>'+
    '</div>';
    createWindow({title:'Help & Install',extraClass:'help-win',bodyHtml:body,type:'help'});
    loadDtdSiteContent().then(function(){
      var helpWindow=openWindows.find(function(w){return w.type==='help';});
      if(!helpWindow||!helpWindow.el)return;
      var copies=helpWindow.el.querySelectorAll('.site-instruction-copy');
      if(copies[0])copies[0].textContent=dtdSiteContent.help_instructions;
      if(copies[1])copies[1].textContent=dtdSiteContent.install_instructions;
    });
  }

  function openAdminWindow(){
    var existing=openWindows.find(function(w){return w.type==='admin';});
    if(existing){focusWindow(existing.id);return;}
    refreshAdminAccess().then(function(allowed){
      if(!allowed){openInfoWindow('Administrator access is not enabled for this account.');return;}
      return loadDtdSiteContent().then(function(){
        var body='<div class="win-body admin-panel">'+
          '<div class="admin-intro"><b>DesktopDiary Administration</b><br>Manage public Help &amp; Install wording and review privacy-limited feature feedback. Administrator access is checked by Supabase.</div>'+
          '<div class="admin-tabs" role="tablist"><button class="admin-tab active" type="button" role="tab" aria-selected="true" data-admin-tab="content">Help &amp; Install</button><button class="admin-tab" type="button" role="tab" aria-selected="false" data-admin-tab="usage">Usage Statistics</button></div>'+
          '<section class="admin-tab-panel active" data-admin-panel="content">'+
            '<div class="admin-field"><label for="admin-install-copy">Install Instructions</label><textarea id="admin-install-copy" maxlength="30000"></textarea></div>'+
            '<div class="admin-field"><label for="admin-help-copy">Help / How It Works</label><textarea id="admin-help-copy" maxlength="30000"></textarea></div>'+
            '<div class="admin-actions"><div class="admin-status" aria-live="polite"></div><button class="btn admin-save" type="button">Save Website Instructions</button></div>'+
          '</section>'+
          '<section class="admin-tab-panel" data-admin-panel="usage">'+
            '<div class="usage-toolbar"><label for="usage-period"><b>Date range</b></label><select id="usage-period"><option value="7d">Last 7 days</option><option value="30d" selected>Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All available data</option></select><button class="btn usage-refresh" type="button">Refresh</button><button class="btn usage-cleanup" type="button">Clean up expired events</button><span class="usage-updated"></span></div>'+
            '<div class="admin-intro">Only approved feature names, server timestamps, broad device classes, and opted-in member IDs are available here. No diary, letter, profile, search, drawing, or other private content is collected. Identifiable records are retained for at most 90 days.</div>'+
            '<div class="usage-status" aria-live="polite"></div><div class="usage-results"></div>'+
          '</section>'+
        '</div>';
        createWindow({title:'Administration',extraClass:'admin-win',bodyHtml:body,type:'admin',constructionBar:false,onMount:function(el){
          var install=el.querySelector('#admin-install-copy'),help=el.querySelector('#admin-help-copy'),save=el.querySelector('.admin-save'),status=el.querySelector('.admin-status');
          install.value=dtdSiteContent.install_instructions;
          help.value=dtdSiteContent.help_instructions;
          save.onclick=function(){
            var installValue=install.value.trim(),helpValue=help.value.trim();
            if(!installValue||!helpValue){status.style.color='#c0392b';status.textContent='Both instruction sections need text.';return;}
            save.disabled=true;status.style.color='#555';status.textContent='Saving…';
            supabaseRpc('update_dtd_site_content',{new_install_instructions:installValue,new_help_instructions:helpValue}).then(function(){
              dtdSiteContent.install_instructions=installValue;
              dtdSiteContent.help_instructions=helpValue;
              openWindows.filter(function(w){return w.type==='help';}).slice().forEach(function(w){closeWindow(w.id);});
              status.style.color='#237b31';status.textContent='Saved. The Help & Install window is now updated for everyone.';
            }).catch(function(err){status.style.color='#c0392b';status.textContent=err.message;}).then(function(){save.disabled=false;});
          };

          var usageLoaded=false,usageLoading=false,usageStatus=el.querySelector('.usage-status'),usageResults=el.querySelector('.usage-results'),periodSelect=el.querySelector('#usage-period'),refreshButton=el.querySelector('.usage-refresh'),cleanupButton=el.querySelector('.usage-cleanup'),updated=el.querySelector('.usage-updated');
          var usageLabels={diary_opened:'Diary opened',diary_entry_created:'Diary entry created',post_mail_opened:'Post Mail opened',letter_sent:'Letter sent',sudoku_started:'Sudoku started',sudoku_completed:'Sudoku completed',profile_editor_opened:'Profile editor opened',sticky_note_created:'Sticky note created',paint_opened:'Paint opened',arinet_opened:'AriNet opened',help_opened:'Help opened',koba_interacted:'Koba interaction'};
          function usageNumber(value){return Number(value||0).toLocaleString();}
          function usageDate(value,includeTime){
            if(!value)return'—';var date=new Date(value);if(!Number.isFinite(date.getTime()))return'—';
            return date.toLocaleString([],includeTime?{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:{year:'numeric',month:'short',day:'numeric'});
          }
          function usageCard(label,value,note){return '<div class="usage-card"><span>'+escapeHtml(label)+'</span><b>'+escapeHtml(String(value))+'</b>'+(note?'<small>'+escapeHtml(note)+'</small>':'')+'</div>';}
          function usageBars(rows,labelKey){
            rows=Array.isArray(rows)?rows:[];var max=rows.reduce(function(best,row){return Math.max(best,Number(row.count)||0);},0);
            if(!rows.length)return'<div class="usage-empty">No activity in this period.</div>';
            return'<div class="usage-bars">'+rows.map(function(row){var raw=row[labelKey]||'',label=labelKey==='event_name'?(usageLabels[raw]||raw):(raw.charAt(0).toUpperCase()+raw.slice(1)),count=Number(row.count)||0,width=max?Math.max(2,Math.round(count/max*100)):0;return'<div class="usage-bar-row"><span class="usage-bar-label" title="'+escapeHtml(label)+'">'+escapeHtml(label)+'</span><span class="usage-bar-track"><span class="usage-bar-fill" style="display:block;width:'+width+'%"></span></span><b>'+usageNumber(count)+'</b></div>';}).join('')+'</div>';
          }
          function renderUsage(data){
            data=data||{};var summary=data.summary||{},features=Array.isArray(data.feature_popularity)?data.feature_popularity:[],devices=Array.isArray(data.device_distribution)?data.device_distribution:[],members=Array.isArray(data.member_activity)?data.member_activity:[];
            var deviceMap={mobile:0,tablet:0,desktop:0};devices.forEach(function(row){if(deviceMap.hasOwnProperty(row.device_class))deviceMap[row.device_class]=Number(row.count)||0;});
            devices=['mobile','tablet','desktop'].map(function(name){return{device_class:name,count:deviceMap[name]};});
            var cards='<div class="usage-card-grid">'+
              usageCard('Total accounts',usageNumber(summary.total_accounts))+
              usageCard('New accounts',usageNumber(summary.new_accounts),'Selected period')+
              usageCard('Daily active users',usageNumber(summary.daily_active_users),'Identifiable · last 24 hours')+
              usageCard('Monthly active users',usageNumber(summary.monthly_active_users),'Identifiable · up to 30 days')+
              usageCard('Total sessions',usageNumber(summary.total_sessions))+
              usageCard('Anonymous aggregate activity',usageNumber(summary.anonymous_events),'Events without a member ID')+
              usageCard('Identifiable feedback',usageNumber(summary.opted_in_members)+' · '+Number(summary.opted_in_percentage||0).toFixed(1)+'%','Members opted in')+
              usageCard('Sudoku',usageNumber(summary.sudoku_starts)+' / '+usageNumber(summary.sudoku_completions),'Starts / completions')+
              usageCard('Letters sent',usageNumber(summary.letters_sent))+
              usageCard('Diary entries created',usageNumber(summary.diary_entries_created))+
            '</div>';
            var memberRows=members.map(function(member){var counts=member.feature_counts||{},chips=Object.keys(usageLabels).filter(function(name){return Number(counts[name])>0;}).map(function(name){return'<span class="usage-feature-chip">'+escapeHtml(usageLabels[name])+': '+usageNumber(counts[name])+'</span>';}).join('');if(!chips)chips='<span style="color:#777">No identifiable activity in this period</span>';return'<tr><td><b>'+escapeHtml(member.screen_name||'DesktopDiary Member')+'</b></td><td>'+escapeHtml(member.post_mail_handle?member.post_mail_handle+'@desktopdiary.local':'—')+'</td><td>'+escapeHtml(member.account_email||'—')+'</td><td>'+escapeHtml(usageDate(member.date_joined,false))+'</td><td>'+escapeHtml(usageDate(member.last_active,true))+'</td><td>'+usageNumber(member.session_count)+'</td><td>'+chips+'</td></tr>';}).join('');
            usageResults.innerHTML=cards+
              '<div class="usage-split"><div class="usage-section"><div class="usage-section-title">Feature popularity</div>'+usageBars(features,'event_name')+'</div><div class="usage-section"><div class="usage-section-title">Device distribution</div>'+usageBars(devices,'device_class')+'</div></div>'+
              '<div class="usage-section"><div class="usage-section-title"><span>Member Activity</span><small>Only activity members chose to identify</small></div><div class="usage-table-wrap"><table class="usage-table"><thead><tr><th>Screen name</th><th>Post Mail handle</th><th>Account email</th><th>Date joined</th><th>Last active</th><th>Sessions</th><th>Approved feature counts</th></tr></thead><tbody>'+(memberRows||'<tr><td colspan="7" class="usage-empty">No accounts found.</td></tr>')+'</tbody></table></div></div>';
            updated.textContent='Updated '+usageDate(data.generated_at,true);
          }
          function loadUsage(){
            if(usageLoading)return;usageLoading=true;usageStatus.className='usage-status';usageStatus.textContent='Loading privacy-limited statistics…';refreshButton.disabled=true;cleanupButton.disabled=true;
            supabaseRpc('get_dtd_usage_dashboard',{period_key:periodSelect.value}).then(function(data){usageLoaded=true;usageStatus.textContent='';renderUsage(data);}).catch(function(err){usageStatus.className='usage-status usage-error';usageStatus.textContent=err.message||'Usage Statistics are unavailable. Run the analytics SQL setup first.';usageResults.innerHTML='';updated.textContent='';}).then(function(){usageLoading=false;refreshButton.disabled=false;cleanupButton.disabled=false;});
          }
          el.querySelectorAll('[data-admin-tab]').forEach(function(tab){tab.addEventListener('click',function(){var name=tab.dataset.adminTab;el.querySelectorAll('[data-admin-tab]').forEach(function(button){var active=button===tab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});el.querySelectorAll('[data-admin-panel]').forEach(function(panel){panel.classList.toggle('active',panel.dataset.adminPanel===name);});if(name==='usage'&&!usageLoaded)loadUsage();});});
          periodSelect.addEventListener('change',loadUsage);refreshButton.addEventListener('click',loadUsage);
          cleanupButton.addEventListener('click',function(){
            appConfirm('Delete usage events older than 90 days now?',function(ok){if(!ok)return;cleanupButton.disabled=true;usageStatus.className='usage-status';usageStatus.textContent='Cleaning up expired events…';supabaseRpc('cleanup_dtd_usage_events',{}).then(function(count){usageStatus.style.color='#237b31';usageStatus.textContent='Cleanup complete. '+usageNumber(count)+' expired event'+(Number(count)===1?'':'s')+' removed.';usageLoaded=false;loadUsage();}).catch(function(err){usageStatus.className='usage-status usage-error';usageStatus.textContent=err.message;cleanupButton.disabled=false;});});
          });
        }});
      });
    });
  }
