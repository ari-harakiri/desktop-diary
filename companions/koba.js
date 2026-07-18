(function(){
  'use strict';
  var companions=window.DesktopDiaryCompanions;
  if(!companions)return;

  companions.koba={
    fetch:{
      flightDuration:860,
      bounceDuration:930,
      noticeDelayMin:300,
      noticeDelayMax:500,
      pickupDuration:1290,
      dropDuration:1310,
      rollDuration:1810,
      happyMinimumDuration:1400,
      runSpeed:168,
      carrySpeed:112
    },
    canChasePigeon:false
  };
})();
