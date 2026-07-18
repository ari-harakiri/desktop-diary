(function(){
  'use strict';
  var companions=window.DesktopDiaryCompanions;
  if(!companions)return;

  companions.pigeon={
    deliveryBehavior:'existing',
    canChaseKoba:true,
    mailboxCollisionReaction:true,
    mailboxStrikeLimit:3
  };

  var reactionClasses=['pigeon-mailbox-peeking','pigeon-mailbox-annoyed','pigeon-mailbox-furious','pigeon-mailbox-chasing'];
  var MARCEL_FIXED_SIZE=64;
  var CHASE_OFFSET_X=40;
  var CHASE_OFFSET_Y=-5;
  var CHASE_SAFE_PADDING=4;
  var CHASE_STATE_IDLE='idle';
  var CHASE_STATE_REACT='reacting';
  var CHASE_STATE_QUEUE='chase-queued';
  var CHASE_STATE_START='chase-starting';
  var CHASE_STATE_RUN='chase-running';
var runtime={
    strikes:0,
    reactionTimer:null,
    wakeTimer1:null,
    wakeTimer2:null,
    wakeTimer3:null,
    wakeDelayMs:0,
    retryTimer:null,
    chaseFrame:null,
    startTimer:null,
    chase:null,
    chaseState:CHASE_STATE_IDLE,
    chasePending:false,
    mailboxLock:null,
    overlap:{ball:false,koba:false},
    lastCollisionCheck:0
  };

  function clearTimer(name){
    clearTimeout(runtime[name]);
    runtime[name]=null;
  }
  function visibleRect(element){
    if(!element)return null;
    var style=window.getComputedStyle(element);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity||1)<=.04)return null;
    var rect=element.getBoundingClientRect();
    return rect.width>0&&rect.height>0?rect:null;
  }
  function intersects(a,b){
    return !!(a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);
  }
  function clamp(value,min,max){return Math.max(min,Math.min(value,max));}
  function mix(a,b,amount){return a+(b-a)*amount;}
  function ease(amount){return amount<.5?2*amount*amount:1-Math.pow(-2*amount+2,2)/2;}
  function setChaseState(state){runtime.chaseState=state;}

  function getSafeRectBounds(desktopRect,taskbarRect,movingRect,extraBottomReserve){
    var safePadding=CHASE_SAFE_PADDING;
    var left=safePadding;
    var top=safePadding;
    var right=desktopRect.width;
    var bottom=desktopRect.height;
    var taskbarHeight=(taskbarRect&&taskbarRect.offsetHeight)||34;
    if(taskbarHeight>0)bottom-=taskbarHeight;
    var maxX=Math.max(left,right-movingRect.width-safePadding);
    var maxY=Math.max(top,bottom-movingRect.height-safePadding);
    if(extraBottomReserve&&extraBottomReserve>0)maxY=Math.max(top,maxY-extraBottomReserve);
    return{minX:left,maxX:maxX,minY:top,maxY:maxY};
  }
  function clampPointToBounds(point,bounds){
    return{
      x:clamp(Math.round(point.x),bounds.minX,bounds.maxX),
      y:clamp(Math.round(point.y),bounds.minY,bounds.maxY)
    };
  }
  function hideChaseBall(scene){
    var ball=document.getElementById('koba-play-ball');
    if(!ball||scene.ballLocked)return;
    scene.ballLocked=true;
    scene.ballState={
      hidden:ball.classList.contains('pose-hidden'),
      pointerEvents:ball.style.pointerEvents
    };
    ball.classList.add('pose-hidden');
    ball.style.pointerEvents='none';
  }
  function restoreChaseBall(scene){
    var ball=document.getElementById('koba-play-ball');
    if(!ball||!scene.ballLocked)return;
    if(!scene.ballState.hidden)ball.classList.remove('pose-hidden');
    ball.style.pointerEvents=scene.ballState.pointerEvents||'';
    scene.ballLocked=false;
    delete scene.ballState;
  }

  function unlockMailbox(mailbox){
    var lock=runtime.mailboxLock;
    var target=lock&&lock.element?lock.element:mailbox;
    if(!target)return;
    delete target.dataset.pigeonSceneLocked;
    if(lock&&lock.ariaDisabled!==null)target.setAttribute('aria-disabled',lock.ariaDisabled);
    else target.removeAttribute('aria-disabled');
    runtime.mailboxLock=null;
  }
  function lockMailbox(mailbox){
    if(!mailbox)return;
    if(!runtime.mailboxLock){
      runtime.mailboxLock={element:mailbox,ariaDisabled:mailbox.getAttribute('aria-disabled')};
    }
    mailbox.dataset.pigeonSceneLocked='true';
    mailbox.setAttribute('aria-disabled','true');
  }
  function clearMailboxScene(mailbox){
    if(!mailbox)return;
    reactionClasses.forEach(function(name){mailbox.classList.remove(name);});
    unlockMailbox(mailbox);
  }
  function showMailboxScene(mailbox,className){
    clearMailboxScene(mailbox);
    void mailbox.offsetWidth;
    mailbox.classList.add(className);
    lockMailbox(mailbox);
  }
  function blockLockedMailboxActivation(event){
    var mailbox=event.currentTarget;
    if(!mailbox||mailbox.dataset.pigeonSceneLocked!=='true')return;
    if(event.type==='keydown'&&event.key!=='Enter'&&event.key!==' ')return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function installMailboxLockGuard(){
    var mailbox=document.getElementById('dtd-mailbox-icon');
    if(!mailbox||mailbox.dataset.pigeonLockGuard==='true')return;
    mailbox.dataset.pigeonLockGuard='true';
    mailbox.addEventListener('click',blockLockedMailboxActivation,true);
    mailbox.addEventListener('keydown',blockLockedMailboxActivation,true);
  }
  function restoreStyleProperty(element,name,value,priority){
    if(value)element.style.setProperty(name,value,priority||'');
    else element.style.removeProperty(name);
  }

  function pointOnPath(points,progress){
    progress=clamp(progress,0,1);
    for(var index=1;index<points.length;index++){
      if(progress<=points[index].t){
        var previous=points[index-1];
        var span=Math.max(.001,points[index].t-previous.t);
        var local=ease((progress-previous.t)/span);
        return{x:mix(previous.x,points[index].x,local),y:mix(previous.y,points[index].y,local)};
      }
    }
    return{x:points[points.length-1].x,y:points[points.length-1].y};
  }

  function placeChaser(scene,x,y){
    scene.chaser.style.transform='translate3d('+Math.round(x)+'px,'+Math.round(y)+'px,0)';
    scene.previousPigeonX=x;
  }
  function applyChaseFacing(scene,direction){
    if(Math.abs(direction)>.4){
      scene.chaser.classList.toggle('facing-left',direction<0);
      scene.koba.classList.toggle('pigeon-chase-left',direction<0);
    }
  }
  function placeKoba(scene,point,direction){
    if(direction===undefined)direction=point.x-scene.previousKobaX;
    if(Math.abs(direction)>.4)scene.koba.classList.toggle('pigeon-chase-left',direction<0);
    var suffix=scene.originalTransform?' '+scene.originalTransform:'';
    scene.koba.style.transform='translate3d('+Math.round(point.x-scene.baseX)+'px,'+Math.round(point.y-scene.baseY)+'px,0)'+suffix;
    scene.previousKobaX=point.x;
  }
  function queuePigeonWakeSequence(scene){
    if(!scene||!scene.restoreSleeping)return 0;
    clearTimer('wakeTimer1');
    clearTimer('wakeTimer2');
    clearTimer('wakeTimer3');
    clearTimer('wakeTimer4');
    var wakeMs=1280;
    var intrigueMs=560;
    var excitementHoldMs=360;
    var wakeToIntrigueBlendMs=180;
    runtime.wakeDelayMs=wakeMs+intrigueMs+excitementHoldMs;
    scene.koba.classList.remove('koba-ball-intrigued','koba-ball-excited');
    scene.koba.classList.add('waking');
    runtime.wakeTimer1=setTimeout(function(){
      if(!runtime.chase||runtime.chase!==scene)return;
      var dogSprite=scene.koba&&scene.koba.querySelector?scene.koba.querySelector('.companion-dog-sprite'):null;
      if(!dogSprite){
        scene.koba.classList.remove('waking');
        scene.koba.classList.add('koba-ball-intrigued');
        return;
      }
      dogSprite.style.willChange='opacity';
      dogSprite.style.transition='opacity '+wakeToIntrigueBlendMs+'ms cubic-bezier(.22,.64,.22,1)';
      dogSprite.style.opacity='0.72';
      requestAnimationFrame(function(){
        if(!runtime.chase||runtime.chase!==scene||!scene.koba)return;
        scene.koba.classList.remove('waking');
        scene.koba.classList.add('koba-ball-intrigued');
        dogSprite.style.opacity='1';
      });
    },wakeMs);
    runtime.wakeTimer4=setTimeout(function(){
      var dogSprite=scene.koba&&scene.koba.querySelector?scene.koba.querySelector('.companion-dog-sprite'):null;
      if(dogSprite){
        dogSprite.style.transition='';
        dogSprite.style.opacity='';
        dogSprite.style.willChange='';
      }
    },wakeMs+wakeToIntrigueBlendMs+60);
    runtime.wakeTimer2=setTimeout(function(){
      if(!runtime.chase||runtime.chase!==scene)return;
      scene.koba.classList.remove('koba-ball-intrigued');
      scene.koba.classList.add('koba-ball-excited');
    },wakeMs+intrigueMs);
    runtime.wakeTimer3=setTimeout(function(){
      if(!runtime.chase||runtime.chase!==scene)return;
      scene.koba.classList.remove('waking','koba-ball-intrigued','koba-ball-excited');
      scene.koba.classList.add('pigeon-chase-fleeing');
    },runtime.wakeDelayMs);
    return runtime.wakeDelayMs;
  }

  function finishChase(completed){
      clearTimer('reactionTimer');
      clearTimer('wakeTimer1');
      clearTimer('wakeTimer2');
      clearTimer('wakeTimer3');
      clearTimer('wakeTimer4');
      clearTimer('startTimer');
      clearTimer('retryTimer');
    setChaseState(CHASE_STATE_IDLE);
    if(runtime.chaseFrame!==null)cancelAnimationFrame(runtime.chaseFrame);
    runtime.chaseFrame=null;
    var scene=runtime.chase;
    if(scene){
      clearTimeout(scene.reducedTimer);
      restoreChaseBall(scene);
      restoreStyleProperty(scene.koba,'transform',scene.originalTransform,scene.originalTransformPriority);
      restoreStyleProperty(scene.koba,'will-change',scene.originalWillChange,scene.originalWillChangePriority);
    scene.koba.classList.remove('sleeping','waking','koba-ball-intrigued','koba-ball-excited','pigeon-chase-fleeing','pigeon-chase-left');
      if(scene.chaser.parentNode)scene.chaser.parentNode.removeChild(scene.chaser);
      if(scene.koba){
        var dogSprite=scene.koba.querySelector&&scene.koba.querySelector('.companion-dog-sprite');
        if(dogSprite){
          dogSprite.style.transition='';
          dogSprite.style.opacity='';
          dogSprite.style.willChange='';
        }
      }
      if(typeof window.endKobaExclusiveMotion==='function'){
        window.endKobaExclusiveMotion('pigeon-chase',scene.restoreSleeping);
      }else if(scene.restoreSleeping){
        scene.koba.classList.add('sleeping');
      }
      if(completed&&typeof window.returnKobaToKennel==='function'){
        window.returnKobaToKennel(true,scene.restoreSleeping);
      }
    }
    var mailbox=document.getElementById('dtd-mailbox-icon');
    clearMailboxScene(mailbox);
    if(mailbox){delete mailbox.dataset.pigeonTemper;delete mailbox.dataset.pigeonHitBy;}
    var source=scene&&scene.source;
    runtime.chase=null;
    runtime.chasePending=false;
    runtime.strikes=0;
    if(completed)companions.emit('pigeon-chase-completed',{source:source||'desktop-object'});
  }

  function animateChase(timestamp){
    var scene=runtime.chase;
    if(!scene)return;
    if(runtime.chaseState!==CHASE_STATE_RUN)return;
    if(!scene.startedAt)scene.startedAt=timestamp;
    var progress=clamp((timestamp-scene.startedAt)/scene.duration,0,1);
    var kobaPointRaw=progress<.84?pointOnPath(scene.path,progress/.84):{x:scene.baseX,y:scene.baseY};
    var kobaPoint=clampPointToBounds(kobaPointRaw,scene.kobaBounds);
    placeKoba(scene,kobaPoint);

    var pigeonPoint;
    var chaseDirection=scene.currentPigeonX-scene.previousPigeonX;
    if(progress<.12){
      var launch=ease(progress/.12);
      pigeonPoint={
      x:mix(scene.mailboxX,scene.baseX-scene.firstDirection*scene.chaseOffsetX,launch),
      y:mix(scene.mailboxY,scene.baseY+scene.leaveOffsetY,launch)
      };
      chaseDirection=pigeonPoint.x-scene.currentPigeonX;
    }else if(progress<.82){
      var chaseProgress=clamp((progress-.12)/.7,0,1);
      var followed=pointOnPath(scene.path,chaseProgress);
      var motionDirection=followed.x-scene.previousFollowX;
      if(Math.abs(motionDirection)>.5)scene.followDirection=motionDirection<0?-1:1;
      scene.previousFollowX=followed.x;
      pigeonPoint={x:followed.x-scene.followDirection*scene.chaseOffsetX,y:followed.y+scene.leadOffsetY};
      chaseDirection=pigeonPoint.x-scene.currentPigeonX;
    }else{
      if(scene.returnX===null){scene.returnX=scene.currentPigeonX;scene.returnY=scene.currentPigeonY;}
      var returnProgress=ease((progress-.82)/.18);
      pigeonPoint={
        x:mix(scene.returnX,scene.mailboxX,returnProgress),
        y:mix(scene.returnY,scene.mailboxY,returnProgress)
      };
      chaseDirection=pigeonPoint.x-scene.currentPigeonX;
    }
    if(Math.abs(chaseDirection)>.45)scene.followDirection=chaseDirection<0?-1:1;
    applyChaseFacing(scene,scene.followDirection);
    var boundedPigeon=clampPointToBounds(pigeonPoint,scene.chaserBounds);
    placeChaser(scene,boundedPigeon.x,boundedPigeon.y);
    scene.currentPigeonX=boundedPigeon.x;
    scene.currentPigeonY=boundedPigeon.y;
    scene.previousPigeonX=boundedPigeon.x;
    if(progress<1)runtime.chaseFrame=requestAnimationFrame(animateChase);
    else finishChase(true);
  }

  function kobaIsBusy(koba){
    var playState=typeof window.getKobaPlayBallState==='function'?window.getKobaPlayBallState():'Idle';
    if(playState!=='Idle')return true;
    // The idle ball-watching and post-fetch happy poses are interruptible.
    // startChase clears them through endKobaPlayBallPose before taking control.
    return ['dragging','interacting','actions-open','searching','waking','digging','burying','with-box','memos-open','barking','play-ball-fetching','pigeon-chase-fleeing'].some(function(name){
      return koba.classList.contains(name);
    });
  }

  function startChase(source){
    if(runtime.chaseState!==CHASE_STATE_QUEUE)return false;
    var desktop=document.getElementById('desktop');
    var mailbox=document.getElementById('dtd-mailbox-icon');
    var koba=document.getElementById('desktop-companion');
    if(!desktop||!mailbox||!visibleRect(koba))return false;
    var playState=typeof window.getKobaPlayBallState==='function'?window.getKobaPlayBallState():'Idle';
    if(playState!=='Idle'){
      if(typeof window.cancelKobaPlayBallForPigeonChase!=='function'||!window.cancelKobaPlayBallForPigeonChase())return false;
    }
    if(kobaIsBusy(koba))return false;

    var restoreSleeping=koba.classList.contains('sleeping');
    if(typeof window.endKobaPlayBallPose==='function')window.endKobaPlayBallPose();
    if(typeof window.beginKobaExclusiveMotion==='function'){
      var ownership=window.beginKobaExclusiveMotion('pigeon-chase');
      if(ownership&&typeof ownership.wasSleeping==='boolean')restoreSleeping=ownership.wasSleeping;
    }else if(typeof window.stopKobaRoaming==='function'){
      window.stopKobaRoaming();
      koba.classList.remove('sleeping');
    }

    var desktopRect=desktop.getBoundingClientRect();
    var taskbar=document.getElementById('taskbar');
    var buddyList=document.getElementById('buddylist-win');
    if(buddyList&&buddyList.style.display==='none')buddyList=null;
    var mailboxRect=mailbox.getBoundingClientRect();
    var kobaRect=koba.getBoundingClientRect();
    var kobaBounds=getSafeRectBounds(desktopRect,taskbar,kobaRect);
    var baseX=clamp(kobaRect.left-desktopRect.left,kobaBounds.minX,kobaBounds.maxX);
    var baseY=clamp(kobaRect.top-desktopRect.top,kobaBounds.minY,kobaBounds.maxY);
    var firstDirection=kobaRect.left+kobaRect.width/2>=mailboxRect.left+mailboxRect.width/2?1:-1;
    var awayX=firstDirection>0?kobaBounds.maxX:kobaBounds.minX;
    var oppositeX=firstDirection>0?kobaBounds.minX:kobaBounds.maxX;
    var highY=clamp(baseY>kobaBounds.maxY/2?baseY-125:baseY+105,kobaBounds.minY,kobaBounds.maxY);
    var lowY=clamp(highY<baseY?baseY+125:baseY-125,kobaBounds.minY,kobaBounds.maxY);
    var path=[
      {t:0,x:baseX,y:baseY},
      {t:.23,x:awayX,y:highY},
      {t:.49,x:oppositeX,y:lowY},
      {t:.74,x:awayX,y:clamp((highY+lowY)/2-35,kobaBounds.minY,kobaBounds.maxY)},
      {t:1,x:baseX,y:baseY}
    ];
    var chaser=document.createElement('div');
    chaser.className='dtd-pigeon-chaser';
    chaser.setAttribute('aria-hidden','true');
    var chaserRig=document.createElement('div');
    chaserRig.className='dtd-pigeon-chaser-rig';
    chaser.appendChild(chaserRig);
    var sprite=document.createElement('div');
    sprite.className='dtd-pigeon-chaser-sprite';
    chaserRig.appendChild(sprite);
    desktop.appendChild(chaser);

    clearMailboxScene(mailbox);
    mailbox.classList.add('pigeon-mailbox-chasing');
    koba.classList.remove('sleeping');
    var mailboxX=mailboxRect.left-desktopRect.left+(mailboxRect.width-MARCEL_FIXED_SIZE)/2;
    var mailboxY=mailboxRect.top-desktopRect.top-(MARCEL_FIXED_SIZE-16);
    var chaserBounds=getSafeRectBounds(desktopRect,taskbar,{width:MARCEL_FIXED_SIZE,height:MARCEL_FIXED_SIZE, left:0, top:0});
    if(buddyList){
      var blRect=buddyList.getBoundingClientRect();
      var safeMaxY=Math.min(blRect.top-desktopRect.top-CHASE_SAFE_PADDING,chaserBounds.maxY);
      if(safeMaxY>chaserBounds.minY&&safeMaxY>chaserBounds.minY+MARCEL_FIXED_SIZE+CHASE_SAFE_PADDING){
        chaserBounds.maxY=Math.max(chaserBounds.minY,safeMaxY);
      }
    }
    runtime.chasePending=false;
    runtime.chase={
      source:source,koba:koba,chaser:chaser,restoreSleeping:restoreSleeping,
      originalTransform:koba.style.getPropertyValue('transform'),
      originalTransformPriority:koba.style.getPropertyPriority('transform'),
      originalWillChange:koba.style.getPropertyValue('will-change'),
      originalWillChangePriority:koba.style.getPropertyPriority('will-change'),
      baseX:baseX,baseY:baseY,mailboxX:mailboxX,mailboxY:mailboxY,
      kobaBounds:kobaBounds,chaserBounds:chaserBounds,
      chaseOffsetX:CHASE_OFFSET_X,leadOffsetY:CHASE_OFFSET_Y,
      leaveOffsetY:CHASE_OFFSET_Y*2-1,path:path,
      firstDirection:firstDirection,followDirection:firstDirection,
      previousKobaX:baseX,previousPigeonX:mailboxX,previousFollowX:baseX,
      currentPigeonX:mailboxX,currentPigeonY:mailboxY,returnX:null,returnY:null,
      startedAt:0,duration:6800,reducedTimer:null
    };
    var clampedMailbox=clampPointToBounds({x:runtime.chase.mailboxX,y:runtime.chase.mailboxY},runtime.chase.chaserBounds);
    runtime.chase.mailboxX=clampedMailbox.x;
    runtime.chase.mailboxY=clampedMailbox.y;
    runtime.chase.currentPigeonX=runtime.chase.mailboxX;
    runtime.chase.currentPigeonY=runtime.chase.mailboxY;
    koba.style.setProperty('will-change','transform');
    hideChaseBall(runtime.chase);
    setChaseState(CHASE_STATE_START);
    applyChaseFacing(runtime.chase,runtime.chase.firstDirection);
    placeChaser(runtime.chase,runtime.chase.mailboxX,runtime.chase.mailboxY);
    if(!restoreSleeping)koba.classList.add('pigeon-chase-fleeing');
    var wakeDelay=queuePigeonWakeSequence(runtime.chase);
    setChaseState(CHASE_STATE_START);
    var startMotion=function(){
      var scene=runtime.chase;
      if(!scene||runtime.chaseState!==CHASE_STATE_START)return;
      if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        setChaseState(CHASE_STATE_RUN);
        hideChaseBall(scene);
        var reducedPoint=clampPointToBounds(
          {x:baseX-firstDirection*scene.chaseOffsetX,y:baseY+scene.leaveOffsetY},
          scene.chaserBounds
        );
        placeChaser(scene,reducedPoint.x,reducedPoint.y);
        scene.reducedTimer=setTimeout(function(){finishChase(true);},Math.max(900,wakeDelay));
      }else{
        setChaseState(CHASE_STATE_RUN);
        hideChaseBall(scene);
        scene.startedAt=0;
        runtime.chaseFrame=requestAnimationFrame(animateChase);
      }
    };
    companions.requestPigeonChase({source:source,strike:3});
    companions.emit('pigeon-chase-started',{source:source,strike:3});
    if(wakeDelay){
      runtime.chase.startedAt=0;
      runtime.startTimer=setTimeout(startMotion,wakeDelay);
    }else{
      startMotion();
    }
    return true;
  }

  function attemptChase(source){
    clearTimer('retryTimer');
    if(!runtime.chasePending)return;
    if(runtime.chaseState!==CHASE_STATE_QUEUE&&runtime.chaseState!==CHASE_STATE_IDLE)return;
    if(!document.body.classList.contains('signed-in')){finishChase(false);return;}
    if(startChase(source))return;
    runtime.retryTimer=setTimeout(function(){attemptChase(source);},420);
  }
  function queueChase(source){
    if(runtime.chaseState!==CHASE_STATE_QUEUE)return;
    runtime.chasePending=true;
    attemptChase(source);
  }

  function registerMailboxHit(source){
    var mailbox=document.getElementById('dtd-mailbox-icon');
    if(!mailbox||runtime.chasePending||runtime.chase||runtime.chaseState!==CHASE_STATE_IDLE)return runtime.strikes;
    clearTimer('reactionTimer');
    setChaseState(CHASE_STATE_REACT);
    runtime.strikes=Math.min(3,runtime.strikes+1);
    var strike=runtime.strikes;
    var className=strike===1?'pigeon-mailbox-peeking':strike===2?'pigeon-mailbox-annoyed':'pigeon-mailbox-furious';
    showMailboxScene(mailbox,className);
    mailbox.dataset.pigeonTemper=String(strike);
    mailbox.dataset.pigeonHitBy=source||'desktop-object';
    companions.emit('pigeon-mailbox-hit',{source:source||'desktop-object',strike:strike});
    if(strike<3){
      runtime.reactionTimer=setTimeout(function(){
        if(runtime.chaseState!==CHASE_STATE_REACT)return;
        clearMailboxScene(mailbox);
        delete mailbox.dataset.pigeonHitBy;
        runtime.reactionTimer=null;
        setChaseState(CHASE_STATE_IDLE);
      },strike===1?1350:3200);
    }else{
      runtime.reactionTimer=setTimeout(function(){
        if(runtime.chaseState!==CHASE_STATE_REACT)return;
        runtime.reactionTimer=null;
        setChaseState(CHASE_STATE_QUEUE);
        queueChase(source||'desktop-object');
      },2200);
    }
    return strike;
  }

  function resetOverlaps(){runtime.overlap.ball=false;runtime.overlap.koba=false;}
  function watchMailboxCollisions(timestamp){
    requestAnimationFrame(watchMailboxCollisions);
    if(document.hidden||timestamp-runtime.lastCollisionCheck<33)return;
    runtime.lastCollisionCheck=timestamp;
    var mailbox=document.getElementById('dtd-mailbox-icon');
    if(!mailbox||!document.body.classList.contains('signed-in')){
      resetOverlaps();
      if(runtime.chasePending||runtime.chase||runtime.strikes)finishChase(false);
      return;
    }
    var mailboxRect=visibleRect(mailbox);
    var ballInside=intersects(mailboxRect,visibleRect(document.getElementById('koba-play-ball')));
    var kobaInside=intersects(mailboxRect,visibleRect(document.getElementById('koba-click-target')));
    if((ballInside&&!runtime.overlap.ball)||(kobaInside&&!runtime.overlap.koba)){
      registerMailboxHit(ballInside&&!runtime.overlap.ball?'ball':'koba');
    }
    runtime.overlap.ball=ballInside;
    runtime.overlap.koba=kobaInside;
  }

  window.playPigeonMailboxAngryReaction=registerMailboxHit;
  window.getPigeonMailboxTemper=function(){return runtime.strikes;};
  window.resetPigeonMailboxTemper=function(){
    runtime.chaseState=CHASE_STATE_IDLE;
    finishChase(false);
  };
  document.addEventListener('visibilitychange',function(){resetOverlaps();runtime.lastCollisionCheck=0;});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){installMailboxLockGuard();requestAnimationFrame(watchMailboxCollisions);},{once:true});
  else{installMailboxLockGuard();requestAnimationFrame(watchMailboxCollisions);}
})();
