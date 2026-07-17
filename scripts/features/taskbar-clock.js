  // ================= TASKBAR CLOCK =================
  function tickClock(){
    var d = new Date();
    document.getElementById('tb-clock').textContent = fmtTime(d.getTime());
    // The clock changes width when its text is first rendered (and when the
    // time format changes), so re-center the resting ball after that update.
    if(window.anchorKobaPlayBallHome)window.anchorKobaPlayBallHome();
  }
  setInterval(tickClock, 1000 * 15);
  document.getElementById('tb-clock').addEventListener('click', function(e){
    e.stopPropagation();
    if(!state.account) return; // calendar only makes sense once signed in
    toggleCalendarPopup();
  });
  document.addEventListener('click', function(e){
    var popup = document.getElementById('calendar-popup');
    if(popup.classList.contains('open') && !popup.contains(e.target) && !e.target.closest('#tb-clock')){
      popup.classList.remove('open');
    }
  });

