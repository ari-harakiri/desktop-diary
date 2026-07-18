(function(){
  'use strict';

  var root='companions/sprites/';
  var registry={
    koba:{
      idle:root+'koba/koba-new-idle.png',
      walk:root+'koba/koba-walk.png',
      run:root+'koba/koba-run.png',
      wake:root+'koba/koba-new-wake.png',
      speak:root+'koba/koba-new-speak.png',
      feed:root+'koba/koba-eat-from-bowl.png',
      treat:root+'koba/koba-eat-treat.png',
      bone:root+'koba/koba-eat-bone.png',
      fetch:root+'koba/play-ball/'
    },
    pigeon:{
      mailbox:root+'pigeon/mailbox.png',
      actions:root+'pigeon/pigeon-actions.png',
      perched:root+'pigeon/pigeon-perched.png',
      flyingEmpty:root+'pigeon/pigeon-flying-empty.png',
      flyingWithMail:root+'pigeon/pigeon-flying-with-mail.png',
      mailboxDiscovery:root+'pigeon/pigeon-mailbox-discovery.png?v=20260718-approved-v3',
      mailboxAngry:root+'pigeon/pigeon-mailbox-angry-frame-1.png?v=20260718-clean',
      mailboxAngryFrames:[1,2,3].map(function(frame){return root+'pigeon/pigeon-mailbox-angry-frame-'+frame+'.png?v=20260718-clean';}),
      chase:root+'pigeon/pigeon-chase-new.png?v=20260718-clean-v2'
    }
  };

  var listeners={};
  function on(name,handler){(listeners[name]||(listeners[name]=[])).push(handler);}
  function emit(name,detail){(listeners[name]||[]).slice().forEach(function(handler){handler(detail||{});});}

  // Warm Koba's action sheets into the browser cache before the first class
  // handoff. Keeping the Image objects alive also avoids a late decode that can
  // briefly leave the sprite transparent between actions.
  var kobaPreloadImages=[];
  function preloadKobaSprites(){
    if(kobaPreloadImages.length)return;
    [
      'assets/companion/koba-new-idle.png',
      'companions/sprites/koba/koba-walk.png',
      'companions/sprites/koba/koba-run.png',
      'companions/sprites/koba/koba-bark.png',
      'assets/embedded/companion-puppy-sleep.png',
      'assets/embedded/companion-puppy-happyhop.png',
      'assets/embedded/companion-puppy-treat.png',
      'assets/embedded/companion-puppy-shake.png',
      'assets/embedded/companion-puppy-digup.png',
      'assets/embedded/companion-puppy-bury.png',
      'assets/embedded/companion-puppy-withbox.png',
      'assets/embedded/koba-eat-bone.png',
      'assets/embedded/koba-eat-treat.png',
      'assets/embedded/koba-eat-from-bowl.png',
      'assets/embedded/koba-go-to-sleep.png',
      'assets/embedded/koba-roaming-dig-bone.png',
      'companions/sprites/koba/play-ball/koba-clicked-idle.png',
      'companions/sprites/koba/play-ball/koba-ball-intrigue.png',
      'companions/sprites/koba/play-ball/koba-ball-excited.png',
      'companions/sprites/koba/play-ball/koba-pick-up-ball.png',
      'companions/sprites/koba/play-ball/koba-carry-ball.png',
      'companions/sprites/koba/play-ball/koba-drop-ball.png',
      'companions/sprites/koba/play-ball/koba-roll-with-ball.png',
      'companions/sprites/koba/play-ball/koba-happy-ball-idle.png'
    ].forEach(function(url){
      var image=new Image();
      image.decoding='async';
      image.src=url;
      if(image.decode)image.decode().catch(function(){});
      kobaPreloadImages.push(image);
    });
  }

  window.DesktopDiaryCompanions={
    sprites:registry,
    on:on,
    emit:emit,
    preloadKobaSprites:preloadKobaSprites,
    // Pigeon scenes announce the third-strike chase through this shared event.
    requestPigeonChase:function(detail){emit('pigeon-chase-requested',detail);}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',preloadKobaSprites,{once:true});
  else preloadKobaSprites();
})();
