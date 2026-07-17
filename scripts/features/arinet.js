  // ================= ARINET (fake in-app browser) =================
  // Extensible bookmark registry — add more entries here later.
  var ARINET_SITES = [
    { name: 'Mass Track', url: 'https://ari-harakiri.github.io/Mass-Track/', icon: '<img src="assets/embedded/arinet-mass-track-icon.png" alt="Mass Track scales">' },
    { name: 'Shufflr', url: 'https://www.shufflr.org', icon: '🔀' },
    { name: 'The Useless Web', url: 'https://theuselessweb.com/', icon: '🌀' },
    { name: 'Chrome Music Lab', url: 'https://musiclab.chromeexperiments.com/', icon: '🎹' },
    { name: 'SoundTools', url: 'https://soundtools.io/music-visualizer/', icon: '🎛️' },
    { name: 'Audioframe', url: 'https://www.audioframe.app/', icon: '📊' },
    { name: 'Typatone', url: 'https://typatone.com/kd', icon: '⌨️' },
    { name: 'Ariel’s Lab', url: 'https://www.arielslab.com/', icon: '⚗️' },
    { name: 'FunOnWeb', url: 'https://funonweb.com/', icon: '🕹️' },
    { name: 'Patatap', url: 'https://patatap.com/', icon: '🎵' },
    { name: 'A Soft Murmur', url: 'https://asoftmurmur.com/', icon: '🌧️' },
    { name: 'This Is Sand', url: 'https://thisissand.com/', icon: '⏳' },
    { name: 'Cat Bounce', url: 'https://cat-bounce.com/', icon: '🐈' },
    { name: 'Hacker Typer', url: 'https://hackertyper.com/', icon: '💻' }
  ];

  function openAriNetWindow(){
    trackDtdUsage('arinet_opened');
    var existing = openWindows.find(function(w){ return w.type === 'arinet'; });
    if(existing){ focusWindow(existing.id); return; }

    var tilesHtml = ARINET_SITES.map(function(s, i){
      return '<div class="arinet-tile" data-idx="' + i + '"><div class="arinet-tile-icon">' + s.icon + '</div><div class="arinet-tile-name">' + escapeHtml(s.name) + '</div></div>';
    }).join('');

    var body =
      '<div class="arinet-body">' +
        '<div class="arinet-toolbar">' +
          '<button class="arinet-nav-btn" id="an-back" title="Back" disabled>&#9664;</button>' +
          '<button class="arinet-nav-btn" id="an-fwd" title="Forward" disabled>&#9654;</button>' +
          '<button class="arinet-nav-btn" id="an-home" title="Home">&#8962;</button>' +
          '<button class="arinet-nav-btn" id="an-reload" title="Reload">&#8635;</button>' +
          '<input class="arinet-address" id="an-address" type="text" placeholder="http://arinet.local">' +
          '<button class="arinet-go-btn" id="an-go">Go</button>' +
        '</div>' +
        '<div class="arinet-content">' +
          '<div class="arinet-home" id="an-home-view">' +
            '<img class="arinet-home-banner" src="assets/embedded/arinet-home-banner.jpg" alt="AriNet">' +
            '<div class="arinet-home-inner"><div class="arinet-home-grid">' + tilesHtml + '</div></div>' +
          '</div>' +
          '<iframe class="arinet-frame" id="an-frame" title="AriNet browser"></iframe>' +
        '</div>' +
        '<div class="arinet-bookmarks">' +
          '<button class="arinet-bookmark" id="an-dock-home">🏠 Home</button>' +
          '<button class="arinet-bookmark" id="an-dock-arinet">🌐 AriNet</button>' +
          '<button class="arinet-bookmark" id="an-dock-mail">✉ Mail</button>' +
          '<button class="arinet-bookmark" id="an-dock-news">📰 News</button>' +
        '</div>' +
        '<div class="arinet-status" id="an-status">Ready</div>' +
      '</div>';

    createWindow({ title: 'AriNet', extraClass: 'arinet-win', bodyHtml: body, type: 'arinet', onMount: function(el){
      var homeView = el.querySelector('#an-home-view');
      var frame = el.querySelector('#an-frame');
      var address = el.querySelector('#an-address');
      var status = el.querySelector('#an-status');
      var backBtn = el.querySelector('#an-back');
      var fwdBtn = el.querySelector('#an-fwd');

      // simple linear history: {label, url|null} — null url means the home view
      var history = [{ label: 'Home', url: null }];
      var historyIndex = 0;

      function normalizeUrl(raw){
        raw = (raw || '').trim();
        if(!raw) return null;
        if(!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
        return raw;
      }

      function updateNavButtons(){
        backBtn.disabled = historyIndex <= 0;
        fwdBtn.disabled = historyIndex >= history.length - 1;
      }

      function renderCurrent(){
        var entry = history[historyIndex];
        if(entry.url){
          homeView.style.display = 'none';
          frame.style.display = 'block';
          if(frame.src !== entry.url) frame.src = entry.url;
          address.value = entry.url;
          status.textContent = entry.url;
        } else {
          frame.style.display = 'none';
          frame.src = 'about:blank';
          homeView.style.display = 'block';
          address.value = '';
          status.textContent = 'Home';
        }
        updateNavButtons();
      }

      function navigateTo(url, label, siteIdx){
        // drop any forward history once a new navigation happens
        history = history.slice(0, historyIndex + 1);
        history.push({ label: label || url, url: url, siteIdx: siteIdx });
        historyIndex = history.length - 1;
        renderCurrent();
      }

      function goHome(){
        history = history.slice(0, historyIndex + 1);
        history.push({ label: 'Home', url: null });
        historyIndex = history.length - 1;
        renderCurrent();
      }

      el.querySelector('#an-go').addEventListener('click', function(){
        var url = normalizeUrl(address.value);
        if(url) navigateTo(url);
      });
      address.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          var url = normalizeUrl(address.value);
          if(url) navigateTo(url);
        }
      });
      el.querySelector('#an-home').addEventListener('click', goHome);
      el.querySelector('#an-reload').addEventListener('click', function(){
        var entry = history[historyIndex];
        if(entry.url){
          frame.src = 'about:blank';
          setTimeout(function(){ frame.src = entry.url; }, 30);
        }
      });
      el.querySelector('#an-dock-home').addEventListener('click', goHome);
      el.querySelector('#an-dock-arinet').addEventListener('click', function(){
        var s = ARINET_SITES[0]; if(s) navigateTo(s.url, s.name, 0);
      });
      el.querySelector('#an-dock-mail').addEventListener('click', function(){
        var s = ARINET_SITES.find(function(x){ return /mail|post|dtd/i.test(x.name); });
        if(s) navigateTo(s.url, s.name);
        else if(typeof openDtdPostWindow === 'function') openDtdPostWindow();
      });

      el.querySelector('#an-dock-news').addEventListener('click', function(){
        var s = ARINET_SITES.find(function(x){ return /news/i.test(x.name); });
        if(s) navigateTo(s.url, s.name);
        else navigateTo('https://ari-harakiri.github.io', 'News');
      });
      backBtn.addEventListener('click', function(){
        if(historyIndex > 0){ historyIndex--; renderCurrent(); }
      });
      fwdBtn.addEventListener('click', function(){
        if(historyIndex < history.length - 1){ historyIndex++; renderCurrent(); }
      });

      function openBookmark(idx){
        var site = ARINET_SITES[idx];
        if(!site) return;
        navigateTo(site.url, site.name, idx);
      }
      el.querySelectorAll('.arinet-tile').forEach(function(t){
        t.addEventListener('click', function(){ openBookmark(parseInt(t.getAttribute('data-idx'), 10)); });
      });

      renderCurrent();
    }});
  }

