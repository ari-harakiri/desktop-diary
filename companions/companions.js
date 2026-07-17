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
      mailboxDiscovery:root+'pigeon/pigeon-mailbox-discovery.png?v=20260716-5',
      mailboxAngry:root+'pigeon/pigeon-mailbox-angry.png?v=20260716-4',
      chase:root+'pigeon/pigeon-chase-new.png'
    }
  };

  var listeners={};
  function on(name,handler){(listeners[name]||(listeners[name]=[])).push(handler);}
  function emit(name,detail){(listeners[name]||[]).slice().forEach(function(handler){handler(detail||{});});}

  window.DesktopDiaryCompanions={
    sprites:registry,
    on:on,
    emit:emit,
    // Pigeon scenes announce the third-strike chase through this shared event.
    requestPigeonChase:function(detail){emit('pigeon-chase-requested',detail);}
  };
})();
