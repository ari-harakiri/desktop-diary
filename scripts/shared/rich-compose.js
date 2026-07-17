  // ================= IM WINDOW =================
  var WRITING_PROMPTS = [
    "What made you smile today?",
    "What's weighing on you right now?",
    "Something you're proud of this week:",
    "What do you need more of lately?",
    "A small win from today:",
    "What are you avoiding, and why?",
    "Write a note to yourself about right now.",
    "What's one thing you'd change about today?"
  ];

  // ---- rich-text compose box: contenteditable with formatting, size, colors, bg, photos, tags ----
  function richComposeHtml(id, placeholder){
    return '<div class="rich-toolbar">' +
        '<button type="button" title="Bold" data-cmd="bold">B</button>' +
        '<button type="button" title="Italic" data-cmd="italic"><i>I</i></button>' +
        '<button type="button" title="Underline" data-cmd="underline"><u>U</u></button>' +
        '<select class="rich-font" title="Font">' +
          '<option value="Arial, sans-serif" selected>Arial</option>' +
          '<option value="\'Times New Roman\', serif">Times</option>' +
          '<option value="Georgia, serif">Georgia</option>' +
          '<option value="\'Courier New\', monospace">Courier</option>' +
          '<option value="\'DiaryComicSans\', sans-serif">Comic Sans</option>' +
          '<option value="\'DiaryOldEnglish\', fantasy">Old English</option>' +
          '<option value="\'DiaryMinecraft\', monospace">Minecraft</option>' +
          '<option value="\'DiaryEmoji\', sans-serif">Artsy</option>' +
        '</select>' +
        '<select class="rich-size" title="Text size">' +
          '<option value="2">Small</option>' +
          '<option value="3" selected>Normal</option>' +
          '<option value="5">Large</option>' +
          '<option value="6">Huge</option>' +
        '</select>' +
        '<label class="rich-swatch" title="Text color"><span>A</span><input type="color" data-cmd="foreColor" value="#000000"></label>' +
        '<label class="rich-swatch hl" title="Highlight selected text"><span>&#9608;</span><input type="color" data-cmd="hiliteColor" value="#ffff00"></label>' +
      '</div>' +
      '<div class="rich-compose" id="'+id+'" contenteditable="true" data-placeholder="'+escapeHtml(placeholder)+'"></div>';
  }

  // expands %t, %d when the user finishes a token (types a space).
  // Operates on the text node at the caret so existing formatting/images are untouched.
  function handleTokenExpansion(target){
    var sel = window.getSelection();
    if(!sel || !sel.rangeCount) return;
    var node = sel.anchorNode;
    if(!node || node.nodeType !== 3) return; // only within a text node
    var text = node.nodeValue;
    var caret = sel.anchorOffset;
    var before = text.slice(0, caret);
    var m = before.match(/%(t|d)\s$/i);
    if(!m) return;
    var token = m[0].trim().toLowerCase();
    var val;
    if(token === '%t') val = fmtTime(Date.now());
    else if(token === '%d') val = fmtDateShort(Date.now());
    else return;
    var start = caret - m[0].length;
    node.nodeValue = text.slice(0, start) + val + ' ' + text.slice(caret);
    var newCaret = start + val.length + 1;
    var range = document.createRange();
    range.setStart(node, Math.min(newCaret, node.nodeValue.length));
    range.collapse(true);
    sel.removeAllRanges(); sel.addRange(range);
  }

  function insertImageFile(target, file, savedRange){
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
      var img = new Image();
      img.onload = function(){
        var maxDim = 720; // stored resolution — larger than the default preview size
        var w = img.width, h = img.height;
        if(w > maxDim || h > maxDim){
          if(w >= h){ h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        target.focus();
        if(savedRange){
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange);
        }
        document.execCommand('insertHTML', false, '<img src="'+dataUrl+'" style="width:220px;max-width:100%;border-radius:4px;">');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // click-to-resize: tap an inserted photo in a compose box to pick Small/Medium/Large
  var activeResizeMenu = null;
  function removeResizeMenu(){
    if(activeResizeMenu){ activeResizeMenu.remove(); activeResizeMenu = null; }
  }
  function showResizeMenu(img){
    removeResizeMenu();
    var menu = document.createElement('div');
    menu.className = 'img-resize-menu';
    menu.innerHTML = '<button data-w="120">S</button><button data-w="220">M</button><button data-w="400">L</button>';
    document.body.appendChild(menu);
    var rect = img.getBoundingClientRect();
    menu.style.left = Math.max(4, rect.left) + 'px';
    menu.style.top = Math.max(4, rect.top - 28) + 'px';
    menu.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('mousedown', function(e){ e.preventDefault(); });
      btn.addEventListener('click', function(){
        img.style.width = btn.getAttribute('data-w') + 'px';
        img.style.maxWidth = '100%';
        removeResizeMenu();
      });
    });
    activeResizeMenu = menu;
    setTimeout(function(){
      document.addEventListener('click', onceOutside);
    }, 0);
    function onceOutside(e){
      if(!menu.contains(e.target) && e.target !== img){
        removeResizeMenu();
        document.removeEventListener('click', onceOutside);
      }
    }
  }
  function attachImageResize(target){
    target.addEventListener('click', function(e){
      if(e.target && e.target.tagName === 'IMG'){ showResizeMenu(e.target); }
    });
  }

  // ---------------- voice notes ----------------
  function insertAudioIntoTarget(target, dataUrl){
    target.focus();
    document.execCommand('insertHTML', false, '<audio controls src="'+dataUrl+'" style="max-width:100%;"></audio><br>');
  }

  function startVoiceRecording(target, anchorEl){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined'){
      openInfoWindow('Voice recording isn\'t supported in this browser.');
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
      var widget = document.createElement('div');
      widget.className = 'voice-rec-widget';
      widget.innerHTML = '<span class="vr-dot"></span><span class="vr-time">0:00 / 0:10</span><button class="vr-stop">Stop</button><button class="vr-cancel">&times;</button>';
      document.body.appendChild(widget);
      var rect = (anchorEl || target).getBoundingClientRect();
      widget.style.left = Math.max(4, Math.min(window.innerWidth - 160, rect.left)) + 'px';
      widget.style.top = Math.max(4, rect.top - 36) + 'px';

      var MAX_SECONDS = 10;
      var chunks = [];
      var recorder;
      try{ recorder = new MediaRecorder(stream); }
      catch(e){ openInfoWindow('Could not start recording.'); stream.getTracks().forEach(function(t){ t.stop(); }); widget.remove(); return; }
      recorder.ondataavailable = function(e){ if(e.data && e.data.size > 0) chunks.push(e.data); };

      var startedAt = Date.now();
      var timerInt = setInterval(function(){
        var secs = Math.floor((Date.now() - startedAt) / 1000);
        var mm = Math.floor(secs / 60), ss = secs % 60;
        widget.querySelector('.vr-time').textContent = mm + ':' + (ss < 10 ? '0' : '') + ss + ' / 0:10';
        if(secs >= MAX_SECONDS && recorder.state === 'recording'){ recorder.stop(); }
      }, 250);

      var cancelled = false;
      function cleanup(){
        clearInterval(timerInt);
        stream.getTracks().forEach(function(t){ t.stop(); });
        widget.remove();
      }
      recorder.onstop = function(){
        if(cancelled){ cleanup(); return; }
        var blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        cleanup();
        if(blob.size === 0) return;
        var reader = new FileReader();
        reader.onload = function(e){ insertAudioIntoTarget(target, e.target.result); };
        reader.readAsDataURL(blob);
      };
      widget.querySelector('.vr-stop').addEventListener('click', function(){ recorder.stop(); });
      widget.querySelector('.vr-cancel').addEventListener('click', function(){ cancelled = true; recorder.stop(); });
      recorder.start();
    }).catch(function(err){
      openInfoWindow('Could not access the microphone: ' + (err && err.message ? err.message : err));
    });
  }

  function wireRichToolbar(scopeEl, targetId){
    var target = scopeEl.querySelector('#'+targetId);
    var savedRange = null;
    function saveSelection(){
      var sel = window.getSelection();
      if(sel && sel.rangeCount > 0 && sel.anchorNode && target.contains(sel.anchorNode)){
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    }
    function restore(){
      target.focus();
      if(savedRange){
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange);
        return;
      }
      if(!target.firstChild){
        // box genuinely empty: create a real (invisible) anchor character and
        // SELECT it — not just collapse past it — so clicking Bold, Italic,
        // and Underline in a row before typing anything all actually apply
        // and combine, instead of only the last click sticking.
        var marker = document.createTextNode('\u200b');
        target.appendChild(marker);
        var range0 = document.createRange();
        range0.selectNodeContents(marker);
        var sel0 = window.getSelection();
        sel0.removeAllRanges();
        sel0.addRange(range0);
        return;
      }
      // box has existing content but selection was lost (e.g. a native
      // color/select picker stole focus) — place the caret at the very end,
      // nested inside the last element, so continuing formatting doesn't
      // reset color/size back to default.
      var node = target;
      while(node.lastChild) node = node.lastChild;
      var range = document.createRange();
      if(node.nodeType === 3){
        range.setStart(node, node.nodeValue.length);
      } else {
        range.selectNodeContents(node);
      }
      range.collapse(true);
      var sel2 = window.getSelection();
      sel2.removeAllRanges();
      sel2.addRange(range);
    }
    function updateToolbarState(){
      ['bold','italic','underline'].forEach(function(cmd){
        var btn = scopeEl.querySelector('.rich-toolbar button[data-cmd="'+cmd+'"]');
        if(!btn) return;
        var isActive = false;
        try{ isActive = document.queryCommandState(cmd); } catch(e){}
        btn.classList.toggle('active', isActive);
      });
    }
    scopeEl.querySelectorAll('.rich-toolbar button[data-cmd]').forEach(function(btn){
      btn.addEventListener('mousedown', function(e){ e.preventDefault(); saveSelection(); });
      btn.addEventListener('click', function(){
        restore();
        document.execCommand(btn.getAttribute('data-cmd'), false, null);
        updateToolbarState();
      });
    });
    var fontSel = scopeEl.querySelector('.rich-font');
    if(fontSel){
      fontSel.addEventListener('mousedown', saveSelection);
      fontSel.addEventListener('change', function(){ restore(); document.execCommand('fontName', false, fontSel.value); });
    }
    var sizeSel = scopeEl.querySelector('.rich-size');
    if(sizeSel){
      sizeSel.addEventListener('mousedown', saveSelection);
      sizeSel.addEventListener('change', function(){ restore(); document.execCommand('fontSize', false, sizeSel.value); });
    }
    scopeEl.querySelectorAll('.rich-swatch input[data-cmd]').forEach(function(inp){
      inp.addEventListener('mousedown', saveSelection);
      inp.addEventListener('input', function(){
        restore();
        var cmd = inp.getAttribute('data-cmd');
        if(cmd === 'hiliteColor'){
          // Safari doesn't support hiliteColor and often fails *silently*
          // (no thrown error), so a try/catch fallback never actually runs.
          // Check real support first and use backColor directly when needed.
          var supportsHilite = false;
          try{ supportsHilite = document.queryCommandSupported('hiliteColor'); } catch(e){}
          try{ document.execCommand(supportsHilite ? 'hiliteColor' : 'backColor', false, inp.value); } catch(e){}
        } else {
          try{ document.execCommand(cmd, false, inp.value); } catch(e){}
        }
        var swatch = inp.closest('.rich-swatch');
        if(swatch){
          if(swatch.classList.contains('hl') || swatch.classList.contains('bg')){
            swatch.style.background = inp.value;
          } else {
            var span = swatch.querySelector('span');
            if(span) span.style.color = inp.value;
          }
        }
      });
    });
    // live token expansion (fires after a token + space is typed)
    target.addEventListener('keyup', function(e){
      if(e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar'){
        handleTokenExpansion(target);
      }
      updateToolbarState();
    });
    target.addEventListener('mouseup', updateToolbarState);
    target.addEventListener('click', updateToolbarState);
    // continuously track the live selection while the box is focused, so
    // controls that steal focus (native <select>, <input type=color>) still
    // have the correct selection to apply formatting to — this is what was
    // breaking the size dropdown.
    document.addEventListener('selectionchange', function(){
      if(document.activeElement === target){
        updateToolbarState();
        saveSelection();
      }
    });
    attachImageResize(target);
    // expose a photo-insert hook for the Insert menu
    target._insertPhoto = function(){
      saveSelection();
      var picker = document.createElement('input');
      picker.type = 'file'; picker.accept = 'image/*';
      picker.style.display = 'none';
      document.body.appendChild(picker);
      picker.addEventListener('change', function(){
        if(picker.files && picker.files[0]) insertImageFile(target, picker.files[0], savedRange);
        picker.remove();
      });
      picker.click();
    };
    target._saveSelection = saveSelection;
    target._restore = restore;
  }

  function isRichEmpty(el){
    if(el.querySelector && (el.querySelector('img') || el.querySelector('audio'))) return false;
    return el.textContent.replace(/\u200b/g,'').trim() === '';
  }

  function appendPlainText(el, text){
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('insertText', false, text);
  }

