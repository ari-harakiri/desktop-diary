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

  function openEditProfileWindow(){
    trackDtdUsage('profile_editor_opened');
    var body =
      '<div class="win-body nm-body">' +
        '<div class="field-row"><label>Screen Name</label><input type="text" id="ep-screenname" value="'+escapeHtml((state.account&&state.account.screenName)||'')+'"></div>' +
        '<div class="profile-pic-edit">' +
          '<img id="ep-pic" class="ep-pic" style="display:none;">' +
          '<div class="ep-pic-ph" id="ep-pic-ph">No picture</div>' +
          '<div><button class="btn" id="ep-pic-btn">Choose Picture</button>' +
          '<button class="btn" id="ep-pic-clear" style="margin-top:4px;">Remove</button></div>' +
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
        var img = el.querySelector('#ep-pic');
        var ph = el.querySelector('#ep-pic-ph');
        function showPic(){
          if(picData){ img.src = picData; img.style.display = 'block'; ph.style.display = 'none'; }
          else { img.style.display = 'none'; ph.style.display = 'flex'; }
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
                var im = new Image();
                im.onload = function(){
                  var maxDim = 300;
                  var w = im.width, h = im.height;
                  if(w > maxDim || h > maxDim){
                    if(w >= h){ h = Math.round(h*maxDim/w); w = maxDim; }
                    else { w = Math.round(w*maxDim/h); h = maxDim; }
                  }
                  var canvas = document.createElement('canvas');
                  canvas.width = w; canvas.height = h;
                  canvas.getContext('2d').drawImage(im, 0, 0, w, h);
                  picData = canvas.toDataURL('image/jpeg', 0.8);
                  showPic();
                };
                im.src = e.target.result;
              };
              reader.readAsDataURL(file);
            }
            input.remove();
          });
          input.click();
        });
        el.querySelector('#ep-pic-clear').addEventListener('click', function(){ picData = ''; showPic(); });

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

        el.querySelector('#ep-preview').addEventListener('click', function(){
          var h = sanitizeProfileHTML(el.querySelector('#ep-header').value);
          var a = sanitizeProfileHTML(el.querySelector('#ep-about').value);
          openViewProfileWindow(h, a, picData);
        });
        el.querySelector('#ep-save').addEventListener('click', function(){
          var newName = el.querySelector('#ep-screenname').value.trim();
          if(newName && state.account){
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
          '<div class="blog-post-body">' + (post.html || '') + '</div>' +
        '</div>';
      }).join('') : '<div class="vp-empty">No diary entries have been shared to your profile yet.</div>';

      return '<div class="win-body vp-body" id="blog-view-body">' +
        '<div class="vp-header">' + picHtml + '<div class="vp-name">' + name +(profileMood?' <span class="vp-mood">is <span style="color:'+profileMoodColor+'">'+escapeHtml(profileMood)+'</span></span>':'')+'</div>' +(profileStatus ? '<div class="vp-status"><b>Status:</b> '+escapeHtml(profileStatus)+(state.status&&state.status.ts?' <span style="color:#888">· '+escapeHtml(relTime(state.status.ts))+'</span>':'')+'</div>' : '')+'</div>' +
        (header ? '<div class="vp-section">' + header + '</div>' : '') +
        (aboutMe ? '<div class="vp-section">' + aboutMe + '</div>' : '') +
        '<div class="vp-newpost-row" style="padding:16px 4px 4px;text-align:center;"><button class="btn" id="vp-newpost-btn">+ New Entry</button></div>' +
        '<div style="text-align:center;padding:2px 4px 12px"><span class="forgot-link" id="vp-view-entries">View Entries</span></div>' +
        '<div class="blog-posts-list">' + postsHtml + '</div>' +
      '</div>';
    }

    createWindow({
      title: 'Profile',
      extraClass: 'profile-win',
      bodyHtml: buildBlogBody(),
      type: 'viewprofile',
      onMount: function(el, id){
        function wireActions(){
          el._refreshProfile=function(){var wb=el.querySelector('.win-body');if(wb)wb.outerHTML=buildBlogBody();wireActions();};
          var newPostBtn = el.querySelector('#vp-newpost-btn');
          if(newPostBtn){
            newPostBtn.onclick = function(){
              openBlogPostEditor(null, function(){
                el._refreshProfile();
                openInfoWindow('Entry saved privately. Use View Entries when you want to read it or share it to your profile.');
              });
            };
          }
          var viewEntries=el.querySelector('#vp-view-entries');if(viewEntries)viewEntries.onclick=openDiaryEntriesWindow;
        }
        wireActions();
      }
    });
  }

