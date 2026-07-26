  // ================= CHANGE PASSWORD WINDOW =================
  // ================= PROFILE WINDOWS =================
  // More permissive than entry sanitizing (this is the user's own creative page),
  // but still strips <script>, event handlers, and javascript: URLs so a synced
  // or shared profile can't run malicious code.
  function sanitizeProfileHTML(rawHtml){
    var container = document.createElement('div');
    container.innerHTML = rawHtml;
    var blockedTags = { SCRIPT:1, IFRAME:1, OBJECT:1, EMBED:1, LINK:1, META:1, BASE:1, FORM:1 };
    (function clean(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(child){
        if(child.nodeType === 1){
          var tag = child.tagName;
          if(blockedTags[tag]){ node.removeChild(child); return; }
          Array.prototype.slice.call(child.attributes || []).forEach(function(attr){
            var name = attr.name.toLowerCase();
            var val = (attr.value || '');
            if(name.indexOf('on') === 0){ child.removeAttribute(attr.name); return; }
            if((name === 'href' || name === 'src' || name === 'style') && /javascript:/i.test(val)){
              child.removeAttribute(attr.name); return;
            }
          });
          clean(child);
        }
      });
    })(container);
    return container.innerHTML;
  }

  var SAMPLE_PROFILE = {
    header:
      "<h1 style='text-align:center'>My Page</h1>\n" +
      "<marquee>scroll for more &darr;</marquee>",
    about:
      "<p>Hi, I'm <font color='teal'>[Name]</font>. This is <span style='font-size:20px'>bigger text</span> and this is <span style='font-size:10px'>smaller text</span>.</p>\n" +
      "<hr>\n" +
      "<div style='background-color:#e0f7ff;padding:8px'>\n" +
      "<b>About me</b>\n" +
      "<ul><li>List item one</li><li>List item two</li></ul>\n" +
      "</div>\n" +
      "<br>\n" +
      "<div style='text-align:center'><marquee direction='down' style='height:60px'>falling text example</marquee></div>\n" +
      "<table border='1'><tr><td>Label</td><td>Value</td></tr><tr><td>Label</td><td>Value</td></tr></table>"
  };

  function openProfileHelpWindow(){
    var body =
      '<div class="win-body" style="font-size:12px; line-height:1.6; padding:10px;">' +

        '<div class="help-section-title">&#127912; Customizing With HTML</div>' +
        '<p>The Header and About Me boxes accept real HTML, so you can style your page however you want. Everything below works &mdash; just type it right into either box.</p>' +

        '<div class="help-platform"><b>Text</b></div>' +
        '<ul style="padding-left:18px; margin:4px 0 10px;">' +
          '<li><code>&lt;b&gt;bold&lt;/b&gt;</code>, <code>&lt;i&gt;italic&lt;/i&gt;</code>, <code>&lt;u&gt;underline&lt;/u&gt;</code></li>' +
          '<li><code>&lt;font color=&#39;blue&#39;&gt;text&lt;/font&gt;</code> or <code>&lt;span style=&#39;color:hotpink&#39;&gt;text&lt;/span&gt;</code> for color</li>' +
          '<li><code>&lt;span style=&#39;font-size:28px&#39;&gt;text&lt;/span&gt;</code> for size &mdash; any pixel value works</li>' +
          '<li><code>&lt;div style=&#39;text-align:center&#39;&gt;text&lt;/div&gt;</code> for position &mdash; use <code>center</code>, <code>right</code>, or <code>left</code></li>' +
        '</ul>' +

        '<div class="help-platform"><b>Layout</b></div>' +
        '<ul style="padding-left:18px; margin:4px 0 10px;">' +
          '<li><code>&lt;div style=&#39;background-color:#e0f7ff&#39;&gt;text&lt;/div&gt;</code> for a colored background block</li>' +
          '<li><code>&lt;hr&gt;</code> draws a visible divider line (a page break)</li>' +
          '<li><code>&lt;br&gt;</code> just drops to a new line, no visible line</li>' +
        '</ul>' +

        '<div class="help-platform"><b>Tables</b></div>' +
        '<p style="margin:4px 0 10px;"><code>&lt;table border=&#39;1&#39;&gt;&lt;tr&gt;&lt;td&gt;Cell 1&lt;/td&gt;&lt;td&gt;Cell 2&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;</code> &mdash; add more <code>&lt;tr&gt;</code> rows and <code>&lt;td&gt;</code> cells as needed.</p>' +

        '<div class="help-platform"><b>Fun &amp; Scrolling Effects</b></div>' +
        '<ul style="padding-left:18px; margin:4px 0 10px;">' +
          '<li><code>&lt;marquee&gt;text&lt;/marquee&gt;</code> scrolls sideways</li>' +
          '<li><code>&lt;marquee direction=&#39;down&#39; style=&#39;height:70px&#39;&gt;text&lt;/marquee&gt;</code> makes text fall like snow, looping inside that height</li>' +
          '<li>Put an <code>&lt;img&gt;</code> inside a falling marquee instead of text to make an image fall</li>' +
        '</ul>' +

        '<div class="help-platform"><b>Pictures &amp; Links</b></div>' +
        '<p style="margin:4px 0 10px;"><code>&lt;img src=&#39;https://...&#39;&gt;</code> and <code>&lt;a href=&#39;https://...&#39;&gt;link text&lt;/a&gt;</code></p>' +

        '<div class="help-platform"><b>What&#39;s Blocked</b></div>' +
        '<p style="margin:4px 0 0;">For safety, <code>&lt;script&gt;</code>, <code>&lt;iframe&gt;</code>, <code>&lt;object&gt;</code>, <code>&lt;embed&gt;</code>, <code>&lt;form&gt;</code>, and click/hover handlers (<code>onclick</code>, etc.) get stripped out automatically. Everything else is fair game.</p>' +

        '<p style="margin-top:10px;"><i>Not sure where to start? Hit Load Sample on the Edit Profile screen to see a page using most of this at once, then tweak it.</i></p>' +
      '</div>';
    createWindow({ title: 'HTML Help', extraClass: 'help-win', bodyHtml: body, type: 'profilehelp' });
  }

  function openProfilePictureCropEditor(image,onDone){
    var canvasSize=360,cropSize=320,zoom=1,offsetX=0,offsetY=0;
    var body='<div class="win-body profile-crop-body">'+
      '<div class="profile-crop-stage"><canvas class="profile-crop-canvas" width="'+canvasSize+'" height="'+canvasSize+'"></canvas></div>'+
      '<div class="profile-crop-controls"><label for="profile-crop-zoom">Zoom</label><input id="profile-crop-zoom" type="range" min="100" max="250" value="100">'+
        '<div class="profile-crop-help">Drag the picture to reposition it inside the square.</div>'+
        '<div class="profile-crop-actions"><button class="btn profile-crop-reset">Reset</button><span></span><button class="btn profile-crop-cancel">Cancel</button><button class="btn profile-crop-use">Use This Crop</button></div>'+
      '</div></div>';
    createWindow({title:'Adjust Profile Photo',extraClass:'profile-crop-win',bodyHtml:body,type:'profilecrop',onMount:function(el,id){
      var canvas=el.querySelector('canvas'),ctx=canvas.getContext('2d'),zoomEl=el.querySelector('#profile-crop-zoom');
      function baseScale(){return Math.max(cropSize/image.naturalWidth,cropSize/image.naturalHeight);}
      function clampOffsets(){
        var scale=baseScale()*zoom;
        var maxX=Math.max(0,(image.naturalWidth*scale-cropSize)/2);
        var maxY=Math.max(0,(image.naturalHeight*scale-cropSize)/2);
        offsetX=Math.max(-maxX,Math.min(maxX,offsetX));
        offsetY=Math.max(-maxY,Math.min(maxY,offsetY));
      }
      function render(){
        clampOffsets();
        ctx.clearRect(0,0,canvasSize,canvasSize);
        ctx.fillStyle='#c8d3df';ctx.fillRect(0,0,canvasSize,canvasSize);
        ctx.save();ctx.beginPath();ctx.rect(20,20,cropSize,cropSize);ctx.clip();
        ctx.fillStyle='#fff';ctx.fillRect(20,20,cropSize,cropSize);
        var scale=baseScale()*zoom;
        ctx.translate(canvasSize/2+offsetX,canvasSize/2+offsetY);
        ctx.drawImage(image,-image.naturalWidth*scale/2,-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);
        ctx.restore();
        ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.strokeRect(16,16,cropSize+8,cropSize+8);
        ctx.strokeStyle='#6f7e90';ctx.lineWidth=1;ctx.strokeRect(20.5,20.5,cropSize-1,cropSize-1);
      }
      function reset(){zoom=1;offsetX=0;offsetY=0;zoomEl.value='100';render();}
      zoomEl.oninput=function(){zoom=Number(zoomEl.value)/100;render();};
      canvas.addEventListener('pointerdown',function(ev){
        ev.preventDefault();canvas.setPointerCapture(ev.pointerId);
        var startX=ev.clientX,startY=ev.clientY,baseX=offsetX,baseY=offsetY,rect=canvas.getBoundingClientRect(),ratio=canvasSize/rect.width;
        function move(moveEv){offsetX=baseX+(moveEv.clientX-startX)*ratio;offsetY=baseY+(moveEv.clientY-startY)*ratio;render();}
        function up(){canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}
        canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
      });
      el.querySelector('.profile-crop-reset').onclick=reset;
      el.querySelector('.profile-crop-cancel').onclick=function(){closeWindow(id);};
      el.querySelector('.profile-crop-use').onclick=function(){
        clampOffsets();
        var output=document.createElement('canvas'),outputSize=300,ratio=outputSize/cropSize,scale=baseScale()*zoom*ratio;
        output.width=outputSize;output.height=outputSize;
        var out=output.getContext('2d');
        out.translate(outputSize/2+offsetX*ratio,outputSize/2+offsetY*ratio);
        out.drawImage(image,-image.naturalWidth*scale/2,-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);
        var data=output.toDataURL('image/webp',0.9);
        closeWindow(id);onDone(data);
      };
      render();
    }});
  }

  function openEditProfileWindow(){
    trackDtdUsage('profile_editor_opened');
    var body =
      '<div class="win-body nm-body">' +
        '<div style="text-align:right;margin-bottom:7px;"><span class="forgot-link" id="ep-preview-top">Preview Profile</span></div>' +
        '<div class="field-row"><label>Screen Name</label><input type="text" id="ep-screenname" value="'+escapeHtml((state.account&&state.account.screenName)||'')+'"></div>' +
        '<div class="profile-pic-edit">' +
          '<img id="ep-pic" class="ep-pic" style="display:none;">' +
          '<div class="ep-pic-ph" id="ep-pic-ph">No picture</div>' +
          '<div class="profile-pic-actions"><button class="btn" id="ep-pic-btn">Choose Picture</button>' +
          '<button class="btn" id="ep-pic-clear">Remove</button></div>' +
        '</div>' +
        '<div class="field-row" style="display:flex; align-items:center; justify-content:space-between;">' +
          '<label style="margin:0;">Customize with HTML</label>' +
          '<span class="icon-btn" id="ep-help-btn" title="HTML formatting help">?</span>' +
        '</div>' +
        '<div class="field-row"><label>Header</label>' +
          '<textarea id="ep-header" style="width:100%; height:70px; font-family:monospace; font-size:12px;" placeholder="&lt;h1&gt;My Page&lt;/h1&gt;&#10;&lt;marquee&gt;Scrolling welcome text&lt;/marquee&gt;&#10;&lt;div style=&#39;background-color:#ffe4e1;padding:6px&#39;&gt;Background color box&lt;/div&gt;"></textarea></div>' +
        '<div class="field-row"><label>About Me</label>' +
          '<textarea id="ep-about" style="width:100%; height:230px; font-family:monospace; font-size:12px;" placeholder="&lt;p&gt;Hi! I love...&lt;/p&gt;&#10;&#10;&lt;font color=&#39;blue&#39;&gt;Colored text&lt;/font&gt; or &lt;span style=&#39;color:hotpink&#39;&gt;this&lt;/span&gt;&#10;&lt;span style=&#39;font-size:28px&#39;&gt;Big text&lt;/span&gt; &lt;span style=&#39;font-size:10px&#39;&gt;tiny text&lt;/span&gt;&#10;&#10;&lt;div style=&#39;background-color:#e0f7ff;padding:6px&#39;&gt;Background color block&lt;/div&gt;&#10;&lt;div style=&#39;text-align:center&#39;&gt;Centered text&lt;/div&gt; &lt;div style=&#39;text-align:right&#39;&gt;Right-aligned text&lt;/div&gt;&#10;&#10;&lt;hr&gt; &amp;larr; page break / divider line&#10;&lt;br&gt; &amp;larr; just a line break, no visible line&#10;&#10;&lt;marquee&gt;Scrolling marquee text&lt;/marquee&gt;&#10;&lt;marquee direction=&#39;down&#39; style=&#39;height:70px&#39;&gt;Falling text!&lt;/marquee&gt; &amp;larr; snow-style falling text&#10;&lt;marquee direction=&#39;down&#39; style=&#39;height:70px&#39;&gt;&lt;img src=&#39;https://...&#39; width=&#39;40&#39;&gt;&lt;/marquee&gt; &amp;larr; falling image&#10;&#10;&lt;table border=&#39;1&#39;&gt;&lt;tr&gt;&lt;td&gt;Cell 1&lt;/td&gt;&lt;td&gt;Cell 2&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;&#10;&#10;&lt;b&gt;bold&lt;/b&gt; &lt;i&gt;italic&lt;/i&gt; &lt;u&gt;underline&lt;/u&gt;&#10;&lt;img src=&#39;https://...&#39;&gt; for pictures, &lt;a href=&#39;https://...&#39;&gt;links&lt;/a&gt;&#10;&#10;(no script/iframe/forms — those get stripped)"></textarea></div>' +
        '<div class="nm-send-row" style="gap:6px;">' +
          '<button class="btn" id="ep-sample" title="Fill both boxes with an example page">Load Sample</button>' +
          '<button class="btn" id="ep-preview">Preview</button>' +
          '<button class="btn" id="ep-save">Save Profile</button>' +
        '</div>' +
      '</div>';
    createWindow({
      title: 'Edit Profile',
      extraClass: 'profile-win',
      bodyHtml: body,
      type: 'editprofile',
      onMount: function(el, id){
        var picData = (state.profile && state.profile.pic) || '';
        var picSourceData = picData;
        var img = el.querySelector('#ep-pic');
        var ph = el.querySelector('#ep-pic-ph');
        function showPic(){
          if(picData){ img.src = picData; img.style.display = 'block'; ph.style.display = 'none'; }
          else { img.style.display = 'none'; ph.style.display = 'flex'; }
        }
        function openCrop(source,onCrop){
          var image=new Image();
          image.onload=function(){openProfilePictureCropEditor(image,onCrop);};
          image.onerror=function(){openInfoWindow('That picture could not be opened.');};
          image.src=source;
        }
        showPic();
        el.querySelector('#ep-header').value = (state.profile && state.profile.header) || '';
        el.querySelector('#ep-about').value = (state.profile && state.profile.aboutMe) || '';

        el.querySelector('#ep-pic-btn').addEventListener('click', function(){
          var input = document.createElement('input');
          input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
          document.body.appendChild(input);
          input.addEventListener('change', function(){
            var file = input.files && input.files[0];
            if(file){
              var reader = new FileReader();
              reader.onload = function(e){
                openCrop(e.target.result,function(data){picSourceData=e.target.result;picData=data;showPic();});
              };
              reader.readAsDataURL(file);
            }
            input.remove();
          });
          input.click();
        });
        el.querySelector('#ep-pic-clear').addEventListener('click', function(){ picData = ''; picSourceData=''; showPic(); });

        el.querySelector('#ep-help-btn').addEventListener('click', function(){
          openProfileHelpWindow();
        });

        el.querySelector('#ep-sample').addEventListener('click', function(){
          var hEl = el.querySelector('#ep-header'), aEl = el.querySelector('#ep-about');
          var hasContent = hEl.value.trim() || aEl.value.trim();
          function loadSample(){
            hEl.value = SAMPLE_PROFILE.header;
            aEl.value = SAMPLE_PROFILE.about;
          }
          if(hasContent){
            appConfirm('Replace what\'s currently in Header and About Me with the sample page?', function(ok){ if(ok) loadSample(); });
          } else {
            loadSample();
          }
        });

        function previewProfile(){
          var h = sanitizeProfileHTML(el.querySelector('#ep-header').value);
          var a = sanitizeProfileHTML(el.querySelector('#ep-about').value);
          openViewProfileWindow(h, a, picData);
        }
        el.querySelector('#ep-preview-top').addEventListener('click', previewProfile);
        el.querySelector('#ep-preview').addEventListener('click', previewProfile);
        el.querySelector('#ep-save').addEventListener('click', function(){
          var newName = el.querySelector('#ep-screenname').value.trim();
          if(newName && state.account){
            if(newName !== state.account.screenName) state.screenNameUpdatedAt = Date.now();
            state.account.screenName = newName;
            document.getElementById('bl-title-text').textContent = newName;
            document.getElementById('bl-me-name').textContent = newName;
          }
          state.profile = {
            pic: picData,
            header: sanitizeProfileHTML(el.querySelector('#ep-header').value),
            aboutMe: sanitizeProfileHTML(el.querySelector('#ep-about').value),
            html: '' // kept for backward compat but no longer used
          };
          state.profileUpdatedAt = Date.now();
          saveState();
          syncDtdPublicProfile().catch(function(){});
          refreshProfilePic();
          closeWindow(id);
        });
      }
    });
  }

  function openViewProfileWindow(previewHeader, previewAbout, previewPic){
    var isPreview = (typeof previewHeader === 'string' && typeof previewAbout === 'string');
    var pic = (typeof previewPic === 'string') ? previewPic : ((state.profile && state.profile.pic) || '');
    var header = isPreview ? previewHeader : ((state.profile && state.profile.header) || '');
    var aboutMe = isPreview ? previewAbout : ((state.profile && state.profile.aboutMe) || '');
    var picHtml = pic ? '<img src="'+pic+'" class="vp-pic">' : '';
    var name = escapeHtml(state.account.screenName);

    function buildBlogBody(){
      var profileStatus=(state.status&&state.status.label)||'',profileMood=(state.status&&state.status.mood)||'',profileMoodColor=profileMood?moodColor(profileMood):'#333333';
      var posts = (state.blogPosts || []).filter(function(p){return p.shared;}).slice().sort(function(a,b){ return b.ts - a.ts; });
      var postsHtml = posts.length ? posts.map(function(post){
        return '<div class="blog-post" data-post-id="'+escapeHtml(post.id)+'">' +
          '<div class="blog-post-header">' +
            '<div>' +
              '<div class="blog-post-title">' + escapeHtml(post.title||'Untitled') + '</div>' +
              '<div class="blog-post-date">' + fmtDayDivider(post.ts) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="blog-post-body">' + renderDiaryPostContent(post) + '</div>' +
        '</div>';
      }).join('') : '<div class="vp-empty">No diary entries have been shared to your profile yet.</div>';

      return '<div class="win-body vp-body" id="blog-view-body">' +
        '<div class="vp-header" style="position:relative">' + picHtml + '<span class="forgot-link" id="vp-edit-profile-btn" style="position:absolute;top:8px;right:10px">Edit Profile</span><div class="vp-name">' + name +(profileMood?' <span class="vp-mood">is <span style="color:'+profileMoodColor+'">'+escapeHtml(profileMood)+'</span></span>':'')+'</div>' +(profileStatus ? '<div class="vp-status"><b>Status:</b> '+escapeHtml(profileStatus)+(state.status&&state.status.ts?' <span style="color:#888">· '+escapeHtml(relTime(state.status.ts))+'</span>':'')+'</div>' : '')+'</div>' +
        (header ? '<div class="vp-section">' + header + '</div>' : '') +
        (aboutMe ? '<div class="vp-section">' + aboutMe + '</div>' : '') +
        '<div class="vp-newpost-row" style="padding:16px 4px 4px;text-align:center;"><button class="btn" id="vp-newpost-btn">+ New Entry</button></div>' +
        '<div style="text-align:center;padding:2px 4px 12px"><span class="forgot-link" id="vp-view-entries">View Entries</span> <span style="color:#aaa">·</span> <span class="forgot-link" id="vp-view-guestbook">View My Guest Book</span></div>' +
        '<div class="blog-posts-list">' + postsHtml + '</div>' +
      '</div>';
    }

    function wireProfileActions(el){
      el._refreshProfile=function(){var wb=el.querySelector('.win-body');if(wb)wb.outerHTML=buildBlogBody();wireProfileActions(el);};
      var newPostBtn = el.querySelector('#vp-newpost-btn');
      if(newPostBtn){
        newPostBtn.onclick = function(){
          openBlogPostEditor(null, function(){
            el._refreshProfile();
            openInfoWindow('Entry saved privately. Use View Entries when you want to read it or share it to your profile.');
          });
        };
      }
      var editProfileBtn = el.querySelector('#vp-edit-profile-btn');
      if(editProfileBtn){
        editProfileBtn.onclick = function(){
          var existingEditor = openWindows.find(function(w){return w.type === 'editprofile';});
          if(existingEditor) focusWindow(existingEditor.id);
          else openEditProfileWindow();
        };
      }
      var viewEntries=el.querySelector('#vp-view-entries');if(viewEntries)viewEntries.onclick=openDiaryEntriesWindow;
      var viewGuestBook=el.querySelector('#vp-view-guestbook');if(viewGuestBook)viewGuestBook.onclick=openOwnDtdGuestBook;
    }

    if(isPreview){
      var existingProfileWindow = null;
      for(var i=openWindows.length-1;i>=0;i--){
        if(openWindows[i].type === 'viewprofile'){
          existingProfileWindow = openWindows[i];
          break;
        }
      }
      if(existingProfileWindow){
        var existingBody = existingProfileWindow.el.querySelector('.win-body');
        if(existingBody) existingBody.outerHTML = buildBlogBody();
        wireProfileActions(existingProfileWindow.el);
        focusWindow(existingProfileWindow.id);
        return { id: existingProfileWindow.id, el: existingProfileWindow.el };
      }
    }

    createWindow({
      title: 'Profile',
      extraClass: 'profile-win',
      bodyHtml: buildBlogBody(),
      type: 'viewprofile',
      onMount: function(el, id){
        wireProfileActions(el);
      }
    });
  }
