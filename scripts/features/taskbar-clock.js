  // ================= TASKBAR CLOCK =================
  var tbClock = document.getElementById('tb-clock');
  var calendarPopup = document.getElementById('calendar-popup');
  if(!tbClock) return;

  function tickClock(){
    var d = new Date();
    tbClock.textContent = fmtTime(d.getTime());
    // The clock changes width when its text is first rendered (and when the
    // time format changes), so re-center the resting ball after that update.
    if(window.anchorKobaPlayBallHome)window.anchorKobaPlayBallHome();
  }
  setInterval(tickClock, 1000 * 15);
  tbClock.addEventListener('click', function(e){
    e.stopPropagation();
    if(!state.account) return; // calendar only makes sense once signed in
    toggleCalendarPopup();
  });

  if(!calendarPopup) return;

  document.addEventListener('click', function(e){
    if(calendarPopup.classList.contains('open') && !calendarPopup.contains(e.target) && !e.target.closest('#tb-clock')){
      calendarPopup.classList.remove('open');
    }
  });
