  // ================= CALENDAR =================
  var calendarViewDate = new Date();
  var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WEEKDAYS = ['S','M','T','W','T','F','S'];

  function toggleCalendarPopup(){
    var popup = document.getElementById('calendar-popup');
    if(popup.classList.contains('open')){
      popup.classList.remove('open');
    } else {
      calendarViewDate = new Date();
      renderCalendarPopup();
      popup.classList.add('open');
    }
  }

  function renderCalendarPopup(){
    var year = calendarViewDate.getFullYear();
    var month = calendarViewDate.getMonth();
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    // which days this month have at least one entry, across every buddy
    var activeDays = {};
    Object.keys(state.entries).forEach(function(bid){
      (state.entries[bid] || []).forEach(function(e){
        var d = new Date(e.ts);
        if(d.getFullYear() === year && d.getMonth() === month){
          activeDays[d.getDate()] = true;
        }
      });
    });

    var today = new Date();
    var isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    var cells = '';
    for(var i = 0; i < firstDay; i++){ cells += '<div class="cal-cell cal-empty"></div>'; }
    for(var day = 1; day <= daysInMonth; day++){
      var isToday = isCurrentMonth && day === today.getDate();
      cells += '<div class="cal-cell' + (isToday ? ' cal-today' : '') + '" data-day="' + day + '">' +
        day + (activeDays[day] ? '<span class="cal-dot"></span>' : '') +
      '</div>';
    }

    var RAINBOW = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#5b2c9d','#9b59b6'];
    var themePreset = state.theme && state.theme.preset;
    var isSilver = themePreset === 'silver';
    var isRainbowTheme = themePreset === 'rainbow';
    var isCustomTheme = themePreset === 'custom' || (themePreset && themePreset.indexOf('custom-') === 0);
    var customDayColors = (isCustomTheme && state.theme.calDaysColors && state.theme.calDaysColors.length === 7) ? state.theme.calDaysColors : null;
    document.getElementById('cal-title').textContent = MONTH_NAMES[month] + ' ' + year;
    document.getElementById('cal-grid').innerHTML =
      WEEKDAYS.map(function(w, i){
        var style = '';
        if(customDayColors) style = ' style="background:' + customDayColors[i] + ';"';
        else if(isSilver) style = ' style="background:' + RAINBOW[i] + ';"';
        else if(isRainbowTheme) style = ' style="background:#888;"';
        return '<div class="cal-wd"' + style + '>' + w + '</div>';
      }).join('') + cells;

    document.querySelectorAll('#calendar-popup .cal-cell[data-day]').forEach(function(cell){
      cell.addEventListener('click', function(e){
        e.stopPropagation();
        document.getElementById('calendar-popup').classList.remove('open');
        openCalendarDayWindow(year, month, parseInt(cell.getAttribute('data-day'), 10));
      });
    });
  }

  document.getElementById('cal-prev').addEventListener('click', function(e){
    e.stopPropagation();
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderCalendarPopup();
  });
  document.getElementById('cal-next').addEventListener('click', function(e){
    e.stopPropagation();
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderCalendarPopup();
  });

  function openCalendarDayWindow(year, month, day){
    var results = [];
    state.buddies.forEach(function(b){
      var dayEntries = (state.entries[b.id] || []).filter(function(e){
        var d = new Date(e.ts);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      });
      if(dayEntries.length) results.push({ buddy: b, entries: dayEntries });
    });

    var dateLabel = new Date(year, month, day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    var bodyHtml;
    if(!results.length){
      bodyHtml = '<div class="bl-empty">No entries on this day.</div>';
    } else {
      bodyHtml = results.map(function(r){
        var rows = r.entries.map(function(e){
          var preview = stripHtmlTags(e.html !== undefined ? e.html : (e.text || '')).trim();
          if(preview.length > 70) preview = preview.slice(0, 70) + '\u2026';
          return '<div class="status-log-row cal-day-entry" data-buddy-id="' + escapeHtml(r.buddy.id) + '">' +
            '<div class="slr-ts">' + fmtTime(e.ts) + '</div>' +
            '<div class="sl-status-label">' + (escapeHtml(preview) || '<i>(empty)</i>') + '</div>' +
          '</div>';
        }).join('');
        return '<div style="font-weight:bold;padding:6px 8px 2px;border-bottom:1px solid #ccc;">' + escapeHtml(r.buddy.name) + ' (' + r.entries.length + ')</div>' + rows;
      }).join('');
    }

    createWindow({
      title: dateLabel,
      extraClass: 'help-win',
      bodyHtml: '<div class="win-body">' + bodyHtml + '</div>',
      type: 'calday',
      onMount: function(el, id){
        el.querySelectorAll('.cal-day-entry').forEach(function(row){
          row.style.cursor = 'pointer';
          row.addEventListener('click', function(){
            openIMWindow(row.getAttribute('data-buddy-id'));
          });
        });
      }
    });
  }

