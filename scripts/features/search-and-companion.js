  // ================= DESKTOP KEYWORD SEARCH =================
  (function(){
    var searchBox=document.getElementById('desktop-search');
    var toggle=document.getElementById('tb-search-toggle');
    var input=document.getElementById('desktop-search-input');
    var button=document.getElementById('desktop-search-button');
    var resultsBox=document.getElementById('desktop-search-results');
    var greeting=document.getElementById('companion-greeting');
    var companionNote=document.getElementById('companion-note');
    var memoryToggle=document.getElementById('companion-memory-toggle');
    var memoryPanel=document.getElementById('companion-memory-panel');
    var memoryInput=document.getElementById('companion-memory-input');
    var memorySave=document.getElementById('companion-memory-save');
    var memoryList=document.getElementById('companion-memory-list');
    var memoryCount=document.getElementById('companion-memory-count');
    var desktopCompanion=document.getElementById('desktop-companion');
    var companionActions=document.getElementById('companion-actions');
    var companionReaction=document.getElementById('companion-reaction');
    var companionMemosButton=document.getElementById('companion-memos-action');
    var companionBehaviorEndTimer=null;
    var companionSearchCycleTimer=null;
    var kobaNotificationTimer=null;
    var kobaNotificationQueue=[];
    var kobaNotificationActive=false;
    var kobaNotificationDismiss=null;
    var kobaNotificationIds={};
    var kobaMemosOpen=false;
    var kobaMemoBarkTimer=null;
    var kobaRoamTimer=null;
    var kobaRoamEndTimer=null;
    var kobaRoamAnimation=null;
    var kobaIsRoaming=false;
    var kobaBallThoughtTimer=null;
    var kobaBallThoughtEndTimer=null;
    var kobaExclusiveMotion='';

    function kobaHasActiveMotion(){
      return !!kobaExclusiveMotion||kobaIsRoaming||desktopCompanion.classList.contains('roaming')||desktopCompanion.classList.contains('dragging')||desktopCompanion.classList.contains('play-ball-fetching')||desktopCompanion.classList.contains('pigeon-chase-fleeing');
    }
    function setKobaSleeping(){
      if(kobaHasActiveMotion()){
        desktopCompanion.classList.remove('sleeping');
        return false;
      }
      desktopCompanion.classList.add('sleeping');
      return true;
    }
    function cancelKobaTransientMotion(){
      clearTimeout(companionBehaviorEndTimer);companionBehaviorEndTimer=null;
      clearTimeout(kobaRoamEndTimer);kobaRoamEndTimer=null;
      clearTimeout(kobaRoamTimer);kobaRoamTimer=null;
      clearTimeout(kobaBallThoughtEndTimer);kobaBallThoughtEndTimer=null;
      stopCompanionSearchCycle();
      hideKobaBallThought();
      if(kobaIsRoaming)stopKobaRoaming();
      clearTimeout(kobaRoamTimer);kobaRoamTimer=null;
      desktopCompanion.style.transition='none';
      void desktopCompanion.offsetWidth;
      desktopCompanion.style.transition='';
    }
    function beginKobaExclusiveMotion(reason){
      var wasSleeping=desktopCompanion.classList.contains('sleeping');
      cancelKobaTransientMotion();
      kobaExclusiveMotion=String(reason||'exclusive-motion');
      desktopCompanion.dataset.kobaMotionOwner=kobaExclusiveMotion;
      desktopCompanion.classList.remove('sleeping','waking','happy','spin-burst','confused-burst','roaming','roaming-walk','roaming-run','roaming-dig-bone','roaming-teddy','roaming-rest-k1','roaming-go-sleep','roaming-left');
      return{wasSleeping:wasSleeping};
    }
    function endKobaExclusiveMotion(reason,restoreSleeping){
      if(reason&&kobaExclusiveMotion&&String(reason)!==kobaExclusiveMotion)return false;
      kobaExclusiveMotion='';
      delete desktopCompanion.dataset.kobaMotionOwner;
      desktopCompanion.classList.remove('sleeping');
      if(restoreSleeping)setKobaSleeping();
      scheduleKobaRoam();
      scheduleKobaBallThought();
      return true;
    }
    window.setKobaSleepingIfIdle=setKobaSleeping;
    window.cancelKobaTransientMotion=cancelKobaTransientMotion;
    window.beginKobaExclusiveMotion=beginKobaExclusiveMotion;
    window.endKobaExclusiveMotion=endKobaExclusiveMotion;
    window.isKobaExclusiveMotionActive=function(){return !!kobaExclusiveMotion;};

    // Reusable fetch-toy state machine. A future stick, frisbee, or teddy bear
    // can provide another config without changing Koba's movement engine.
    function FetchToyController(config){
      this.config=config;
      this.desktop=document.getElementById('desktop');
      this.taskbar=document.getElementById('taskbar');
      this.koba=desktopCompanion;
      this.ball=null;
      this.sprite=null;
      this.state='Idle';
      this.logicalPosition={x:0,y:0};
      this.throwOrigin={x:0,y:0};
      this.shouldRoll=false;
      this.active=false;
      this.drag=null;
      this.motionFrame=null;
      this.ballWakeTimer=null;
      this.ballExcitementTimer=null;
      this.sequenceTimers=[];
    }
    FetchToyController.prototype.setState=function(next){
      this.state=next;
      if(next!=='Idle')hideKobaBallThought();
      if(this.ball)this.ball.dataset.fetchState=next;
    };
    FetchToyController.prototype.bounds=function(){
      var taskbarHeight=this.taskbar?this.taskbar.offsetHeight:34;
      return{
        maxX:Math.max(0,this.desktop.clientWidth-this.config.restSize),
        maxY:Math.max(0,this.desktop.clientHeight-taskbarHeight-this.config.restSize)
      };
    };
    FetchToyController.prototype.clampBall=function(point){
      var bounds=this.bounds();
      return{x:Math.max(0,Math.min(point.x,bounds.maxX)),y:Math.max(0,Math.min(point.y,bounds.maxY))};
    };
    FetchToyController.prototype.setBallMode=function(mode){
      this.ball.classList.remove('ball-flying','ball-bouncing');
      void this.ball.offsetWidth;
      if(mode==='flight')this.ball.classList.add('ball-flying');
      if(mode==='bounce')this.ball.classList.add('ball-bouncing');
    };
    FetchToyController.prototype.placeBallVisual=function(point,mode){
      var rest=this.config.restSize,left=point.x,top=point.y;
      if(mode==='flight'){
        left+=((rest-this.config.flightSize)/2);
        top+=((rest-this.config.flightSize)/2);
      }else if(mode==='bounce'){
        left+=(rest-this.config.bounceWidth)/2;
        top+=rest-this.config.bounceHeight;
      }
      this.ball.style.left=Math.round(left)+'px';
      this.ball.style.top=Math.round(top)+'px';
    };
    FetchToyController.prototype.placeRestingBall=function(point){
      this.logicalPosition=this.clampBall(point);
      this.setBallMode('rest');
      this.placeBallVisual(this.logicalPosition,'rest');
    };
    FetchToyController.prototype.persistBall=function(){
      var saved=state.companion.toys[this.config.storageKey];
      saved.x=Math.round(this.logicalPosition.x);
      saved.y=Math.round(this.logicalPosition.y);
      saveState();
    };
    FetchToyController.prototype.homePoint=function(){
      var desktopRect=this.desktop.getBoundingClientRect();
      var clock=document.getElementById('tb-clock');
      if(clock){
        var clockRect=clock.getBoundingClientRect();
        if(clockRect.width&&clockRect.height){
          return this.clampBall({
            x:clockRect.left-desktopRect.left+(clockRect.width-this.config.restSize)/2-(this.config.homeOffsetX||0),
            y:clockRect.top-desktopRect.top-this.config.restSize-(this.config.homeGap||6)
          });
        }
      }
      var bounds=this.bounds();
      return{x:Math.max(12,bounds.maxX-28),y:Math.max(12,bounds.maxY-8)};
    };
    FetchToyController.prototype.init=function(){
      var self=this;
      this.ball=document.createElement('div');
      this.ball.id=this.config.elementId;
      this.ball.setAttribute('role','button');
      this.ball.setAttribute('tabindex','-1');
      this.ball.setAttribute('aria-hidden','true');
      this.ball.setAttribute('aria-label','Red ball. Drag and release to throw it for Koba.');
      this.ball.title='Play Ball with Koba — drag and release to throw';
      this.sprite=document.createElement('div');
      this.sprite.className='koba-ball-sprite';
      this.sprite.setAttribute('aria-hidden','true');
      this.ball.appendChild(this.sprite);
      this.desktop.appendChild(this.ball);
      this.placeRestingBall(this.homePoint());
      this.persistBall();
      // Boot renders the clock text immediately after the toy is created.
      // Re-anchor on the next frame so the ball uses the clock's final width.
      requestAnimationFrame(function(){
        if(self.state==='Idle'&&!self.drag){
          self.placeRestingBall(self.homePoint());
          self.persistBall();
        }
      });
      this.active=true;
      this.ball.classList.add('toy-active');
      this.ball.setAttribute('tabindex','0');
      this.ball.setAttribute('aria-hidden','false');
      this.ball.addEventListener('dragstart',function(e){e.preventDefault();});
      this.ball.addEventListener('pointerdown',function(e){self.startDrag(e);});
      this.koba.addEventListener('pointerdown',function(e){self.interceptCarry(e);},true);
      this.ball.addEventListener('keydown',function(e){
        if((e.key==='Enter'||e.key===' ')&&self.state==='Idle'&&self.active){
          e.preventDefault();
          if(searchBox.style.display==='block')closeSearch();
          closeCompanionActions();
          self.endHappyPose();
          var origin={x:self.logicalPosition.x,y:self.logicalPosition.y};
          var direction=origin.x<self.bounds().maxX/2?1:-1;
          self.throwOrigin=origin;
          self.setState('ThrowBall');
          self.throwBall(origin,self.clampBall({x:origin.x+direction*180,y:origin.y-90}));
        }
      });
      window.addEventListener('resize',function(){
        if(self.state==='Idle'){
          self.placeRestingBall(self.homePoint());
          self.persistBall();
        }
      });
      window.endKobaPlayBallPose=function(){self.cancelReadyToy();self.endHappyPose();};
      window.cancelKobaPlayBallForPigeonChase=function(){return self.cancelForExternalMotion();};
      window.getKobaPlayBallState=function(){return self.state;};
      window.anchorKobaPlayBallHome=function(){
        if(self.state==='Idle'&&!self.drag)self.placeRestingBall(self.homePoint());
      };
    };
    FetchToyController.prototype.activate=function(){
      if(this.state!=='Idle'||this.active)return;
      clearTimeout(companionBehaviorEndTimer);
      stopCompanionSearchCycle();
      if(window.stopKobaRoaming)window.stopKobaRoaming();
      this.active=true;
      this.ball.classList.add('toy-active');
      this.ball.setAttribute('tabindex','0');
      this.ball.setAttribute('aria-hidden','false');
      this.ball.classList.remove('locked','pose-hidden');
      var desktopRect=this.desktop.getBoundingClientRect(),kobaRect=this.koba.getBoundingClientRect();
      var rightX=kobaRect.right-desktopRect.left+12;
      var leftX=kobaRect.left-desktopRect.left-this.config.restSize-12;
      var point={
        x:rightX<=this.bounds().maxX?rightX:leftX,
        y:kobaRect.bottom-desktopRect.top-this.config.restSize-5
      };
      this.placeRestingBall(point);
      this.persistBall();
      this.koba.classList.remove('sleeping','searching','happy','spin-burst','confused-burst','koba-fetch-happy','koba-fetch-left');
      this.koba.classList.add('koba-ball-watching');
      var self=this;
      setTimeout(function(){if(self.active&&self.state==='Idle')self.ball.focus();},0);
    };
    FetchToyController.prototype.deactivate=function(){
      // The ball is now a permanent desktop toy. Completing or cancelling a
      // throw only clears temporary animation state; it does not hide it.
      this.active=true;
      this.ball.classList.remove('carrying','locked','pose-hidden','ball-flying','ball-bouncing');
      this.ball.classList.add('toy-active');
      this.ball.setAttribute('tabindex','0');
      this.ball.setAttribute('aria-hidden','false');
      document.body.classList.remove('carrying-koba-ball');
    };
    FetchToyController.prototype.cancelReadyToy=function(){
      if(this.state!=='Idle'||!this.active)return;
      this.clearBallAttention();
      this.koba.classList.remove('koba-ball-watching','play-ball-fetching');
      this.ball.classList.remove('locked','pose-hidden');
    };
    FetchToyController.prototype.clearBallAttention=function(){
      clearTimeout(this.ballWakeTimer);this.ballWakeTimer=null;
      clearTimeout(this.ballExcitementTimer);this.ballExcitementTimer=null;
      if(this.koba.classList.contains('play-ball-fetching'))this.koba.classList.remove('waking');
      this.koba.classList.remove('koba-ball-intrigued','koba-ball-excited');
    };
    FetchToyController.prototype.scheduleSequence=function(callback,delay){
      var self=this,timer=setTimeout(function(){
        self.sequenceTimers=self.sequenceTimers.filter(function(item){return item!==timer;});
        callback();
      },delay);
      this.sequenceTimers.push(timer);
      return timer;
    };
    FetchToyController.prototype.clearSequenceTimers=function(){
      this.sequenceTimers.forEach(function(timer){clearTimeout(timer);});
      this.sequenceTimers=[];
    };
    FetchToyController.prototype.startDrag=function(e){
      if(this.state!=='Idle'||!this.active||(e.button!==undefined&&e.button!==0))return;
      // Capture Koba's real pose before closing search/actions. Those cleanup
      // paths normally put him to sleep, which must not manufacture a wake
      // transition for every ball press.
      var wasSleeping=this.koba.classList.contains('sleeping');
      e.preventDefault();
      e.stopPropagation();
      if(searchBox.style.display==='block')closeSearch();
      closeCompanionActions();
      this.endHappyPose();
      // Begin Koba's attention sequence while the user is holding the ball.
      this.showKobaBallAttention(wasSleeping);
      this.throwOrigin={x:this.logicalPosition.x,y:this.logicalPosition.y};
      this.drag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};
      this.setState('ThrowBall');
      this.ball.classList.add('carrying');
      document.body.classList.add('carrying-koba-ball');
      if(this.ball.setPointerCapture)try{this.ball.setPointerCapture(e.pointerId);}catch(_){ }
      var self=this;
      this.dragMoveHandler=function(event){self.moveDrag(event);};
      this.dragEndHandler=function(event){self.endDrag(event,false);};
      this.dragCancelHandler=function(event){self.endDrag(event,true);};
      document.addEventListener('pointermove',this.dragMoveHandler,{passive:false});
      document.addEventListener('pointerup',this.dragEndHandler);
      document.addEventListener('pointercancel',this.dragCancelHandler);
    };
    FetchToyController.prototype.interceptCarry=function(e){
      if(this.state!=='CarryBall'||!this.active||(e.button!==undefined&&e.button!==0))return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      if(this.motionFrame!==null)cancelAnimationFrame(this.motionFrame);
      this.motionFrame=null;
      var rect=this.desktop.getBoundingClientRect();
      var point=this.clampBall({
        x:e.clientX-rect.left-this.config.restSize/2,
        y:e.clientY-rect.top-this.config.restSize/2
      });
      this.setKobaAnimation(null);
      this.ball.classList.remove('locked','pose-hidden');
      this.placeRestingBall(point);
      this.setState('Idle');
      this.startDrag(e);
    };
    FetchToyController.prototype.cancelForExternalMotion=function(){
      this.clearBallAttention();
      this.clearSequenceTimers();
      if(this.motionFrame!==null)cancelAnimationFrame(this.motionFrame);
      this.motionFrame=null;
      if(this.drag){this.drag=null;this.stopDragListeners();}
      document.body.classList.remove('carrying-koba-ball');
      this.setKobaAnimation(null);
      this.koba.classList.remove('play-ball-fetching','koba-ball-watching','koba-fetch-left','waking');
      this.ball.classList.remove('carrying','locked','pose-hidden');
      this.placeRestingBall(this.logicalPosition);
      this.setState('Idle');
      this.deactivate();
      return true;
    };
    FetchToyController.prototype.moveDrag=function(e){
      if(!this.drag||e.pointerId!==this.drag.pointerId)return;
      e.preventDefault();
      if(Math.hypot(e.clientX-this.drag.startX,e.clientY-this.drag.startY)>=4)this.drag.moved=true;
      var rect=this.desktop.getBoundingClientRect();
      this.placeRestingBall({x:e.clientX-rect.left-this.config.restSize/2,y:e.clientY-rect.top-this.config.restSize/2});
    };
    FetchToyController.prototype.stopDragListeners=function(){
      document.removeEventListener('pointermove',this.dragMoveHandler);
      document.removeEventListener('pointerup',this.dragEndHandler);
      document.removeEventListener('pointercancel',this.dragCancelHandler);
      this.dragMoveHandler=this.dragEndHandler=this.dragCancelHandler=null;
    };
    FetchToyController.prototype.endDrag=function(e,cancelled){
      if(!this.drag||(e.pointerId!==undefined&&e.pointerId!==this.drag.pointerId))return;
      var moved=this.drag.moved,target={x:this.logicalPosition.x,y:this.logicalPosition.y};
      this.drag=null;
      this.stopDragListeners();
      this.ball.classList.remove('carrying');
      document.body.classList.remove('carrying-koba-ball');
      if(cancelled){
        this.placeRestingBall(this.throwOrigin);
        this.clearBallAttention();
        this.koba.classList.remove('koba-ball-watching','play-ball-fetching');
        this.deactivate();
        this.setState('Idle');
        return;
      }
      if(!moved||Math.hypot(target.x-this.throwOrigin.x,target.y-this.throwOrigin.y)<18){
        var direction=this.throwOrigin.x<this.bounds().maxX/2?1:-1;
        target=this.clampBall({x:this.throwOrigin.x+direction*180,y:this.throwOrigin.y-90});
      }
      this.throwBall(this.throwOrigin,target);
    };
    FetchToyController.prototype.throwBall=function(origin,target){
      var self=this,distance=Math.hypot(target.x-origin.x,target.y-origin.y);
      var saved=state.companion.toys[this.config.storageKey];
      saved.throwCount=(saved.throwCount||0)+1;
      this.shouldRoll=saved.throwCount%3===0;
      saveState();
      // Releasing the ball ends the held excitement pose. Koba now follows the
      // actual throw with his watching animation.
      this.clearBallAttention();
      this.koba.classList.remove('sleeping','happy','spin-burst','confused-burst','koba-fetch-happy','koba-fetch-left');
      this.koba.classList.add('play-ball-fetching','koba-ball-watching');
      this.setState('BallFlying');
      this.ball.classList.add('locked');
      this.ball.classList.remove('pose-hidden');
      this.setBallMode('flight');
      this.placeBallVisual(origin,'flight');
      var started=performance.now(),duration=this.config.flightDuration,arc=Math.min(140,48+distance*.17);
      function frame(ts){
        var t=Math.min(1,(ts-started)/duration);
        var eased=1-Math.pow(1-t,2);
        var point={
          x:origin.x+(target.x-origin.x)*eased,
          y:origin.y+(target.y-origin.y)*eased-arc*4*t*(1-t)
        };
        self.placeBallVisual(point,'flight');
        if(t<1){self.motionFrame=requestAnimationFrame(frame);return;}
        self.motionFrame=null;
        self.logicalPosition=self.clampBall(target);
        self.startBounce();
      }
      this.motionFrame=requestAnimationFrame(frame);
    };
    FetchToyController.prototype.startBounce=function(){
      var self=this;
      this.setState('BallBouncing');
      this.setBallMode('bounce');
      this.placeBallVisual(this.logicalPosition,'bounce');
      this.scheduleSequence(function(){
        self.placeRestingBall(self.logicalPosition);
        self.setState('NoticeBall');
        self.scheduleSequence(function(){self.waitForKobaIdle();},self.config.noticeDelayMin+Math.random()*(self.config.noticeDelayMax-self.config.noticeDelayMin));
      },this.config.bounceDuration);
    };
    FetchToyController.prototype.kobaIsBusy=function(){
      var busyClasses=['dragging','searching','waking','digging','burying','interacting','with-box','actions-open','memos-open','barking','treat','bone','feed','roaming'];
      return kobaIsRoaming||kobaNotificationActive||busyClasses.some(function(name){return desktopCompanion.classList.contains(name);});
    };
    FetchToyController.prototype.showKobaBallAttention=function(wasSleeping){
      // Busy interactions keep their own art; the fetch remains queued until
      // those interactions finish.
      if(this.kobaIsBusy())return;
      // Ignore duplicate pointer work while this attention sequence is active.
      if(this.koba.classList.contains('play-ball-fetching')&&(this.koba.classList.contains('koba-ball-intrigued')||this.koba.classList.contains('koba-ball-excited')||this.koba.classList.contains('koba-ball-watching')))return;
      // Suspend Koba's ordinary idle timers for the entire throw/notice gap so
      // they cannot switch him into the sleep pose just before the fetch.
      clearTimeout(companionBehaviorEndTimer);
      stopCompanionSearchCycle();
      if(window.stopKobaRoaming)window.stopKobaRoaming();
      this.clearBallAttention();
      this.koba.classList.remove('sleeping','happy','spin-burst','confused-burst','koba-fetch-happy','koba-fetch-left','koba-ball-watching');
      this.koba.classList.add('play-ball-fetching');
      var self=this;
      function showIntrigue(){
        self.ballWakeTimer=null;
        if(!self.koba.classList.contains('play-ball-fetching'))return;
        self.koba.classList.remove('waking');
        self.koba.classList.add('koba-ball-intrigued');
        self.ballExcitementTimer=setTimeout(function(){
          self.ballExcitementTimer=null;
          if(self.state==='Idle')return;
          self.koba.classList.remove('koba-ball-intrigued');
          self.koba.classList.add('koba-ball-excited');
        },self.config.fetchIntrigueDuration);
      }
      if(wasSleeping){
        this.koba.classList.add('waking');
        this.ballWakeTimer=setTimeout(showIntrigue,this.config.fetchWakeDuration);
      }else showIntrigue();
    };
    FetchToyController.prototype.waitForKobaIdle=function(){
      var self=this;
      if(this.state!=='NoticeBall')return;
      if(this.kobaIsBusy()){
        this.scheduleSequence(function(){self.waitForKobaIdle();},180);
        return;
      }
      this.beginFetch();
    };
    FetchToyController.prototype.kobaPoint=function(){
      var desktopRect=this.desktop.getBoundingClientRect(),rect=this.koba.getBoundingClientRect();
      return{x:rect.left-desktopRect.left,y:rect.top-desktopRect.top};
    };
    FetchToyController.prototype.kobaTargetForBall=function(ballPoint,fromX){
      var ballCenter=ballPoint.x+this.config.restSize/2;
      var direction=ballCenter>=fromX+this.koba.offsetWidth/2?1:-1;
      var taskbarHeight=this.taskbar?this.taskbar.offsetHeight:34;
      var maxX=Math.max(0,this.desktop.clientWidth-this.koba.offsetWidth);
      var maxY=Math.max(0,this.desktop.clientHeight-taskbarHeight-this.koba.offsetHeight);
      return{
        x:Math.max(0,Math.min(ballCenter-this.koba.offsetWidth/2-direction*this.config.mouthOffset,maxX)),
        y:Math.max(0,Math.min(ballPoint.y+this.config.restSize-this.config.kobaGroundOffset,maxY)),
        direction:direction
      };
    };
    FetchToyController.prototype.setKobaAnimation=function(name,direction){
      this.koba.classList.remove('koba-fetch-run','koba-fetch-pickup','koba-fetch-carry','koba-fetch-drop','koba-fetch-roll','koba-fetch-happy','koba-ball-intrigued','koba-ball-excited');
      if(direction!==undefined)this.koba.classList.toggle('koba-fetch-left',direction<0);
      if(name){void this.koba.offsetWidth;this.koba.classList.add(name);}
    };
    FetchToyController.prototype.moveKobaTo=function(target,speed){
      var self=this,start=this.kobaPoint(),x=start.x,y=start.y,last=performance.now();
      this.koba.style.transition='none';
      this.koba.style.left=x+'px';
      this.koba.style.top=y+'px';
      this.koba.style.right='auto';
      this.koba.style.bottom='auto';
      return new Promise(function(resolve){
        function step(ts){
          var dt=Math.min(1,Math.max(0,(ts-last)/1000));last=ts;
          var dx=target.x-x,dy=target.y-y,distance=Math.hypot(dx,dy);
          if(distance<=.5){
            x=target.x;y=target.y;
            self.koba.style.left=x+'px';self.koba.style.top=y+'px';
            self.motionFrame=null;resolve();return;
          }
          var travel=Math.min(distance,speed*dt);
          x+=dx/distance*travel;y+=dy/distance*travel;
          self.koba.style.left=x+'px';self.koba.style.top=y+'px';
          self.motionFrame=requestAnimationFrame(step);
        }
        self.motionFrame=requestAnimationFrame(step);
      });
    };
    FetchToyController.prototype.beginFetch=function(){
      var self=this;
      this.koba.classList.add('play-ball-fetching');
      this.clearBallAttention();
      if(window.stopKobaRoaming)window.stopKobaRoaming();
      this.koba.classList.remove('sleeping','happy','searching','spin-burst','confused-burst','roaming-left','roaming-walk','roaming-run','roaming-dig-bone','roaming-teddy','roaming-rest-k1','roaming-go-sleep','koba-ball-watching','koba-ball-intrigued','koba-ball-excited');
      var start=this.kobaPoint(),target=this.kobaTargetForBall(this.logicalPosition,start.x);
      this.setState('RunToBall');
      this.setKobaAnimation('koba-fetch-run',target.direction);
      this.moveKobaTo(target,this.config.runSpeed).then(function(){self.pickUpBall(target.direction);});
    };
    FetchToyController.prototype.pickUpBall=function(direction){
      var self=this;
      this.setState('PickUpBall');
      this.setKobaAnimation('koba-fetch-pickup',direction);
      this.ball.classList.add('pose-hidden');
      this.scheduleSequence(function(){self.carryBallHome();},this.config.pickupDuration);
    };
    FetchToyController.prototype.carryBallHome=function(){
      var self=this,start=this.kobaPoint(),target=this.kobaTargetForBall(this.homePoint(),start.x);
      var returnOffset=Number(this.config.returnNestOffsetX)||0;
      target.x=Math.max(0,Math.min(target.x+returnOffset,this.desktop.clientWidth-this.koba.offsetWidth));
      this.setState('CarryBall');
      this.setKobaAnimation('koba-fetch-carry',target.direction);
      this.moveKobaTo(target,this.config.carrySpeed).then(function(){self.dropBall(target.direction);});
    };
    FetchToyController.prototype.dropBall=function(direction){
      var self=this;
      this.setState('DropBall');
      this.setKobaAnimation('koba-fetch-drop',direction);
      this.scheduleSequence(function(){
        if(self.shouldRoll)self.rollWithBall(direction);
        else self.finishFetch(direction);
      },this.config.dropDuration);
    };
    FetchToyController.prototype.rollWithBall=function(direction){
      var self=this;
      this.setState('RollWithBall');
      this.setKobaAnimation('koba-fetch-roll',direction);
      this.scheduleSequence(function(){self.finishFetch(direction);},this.config.rollDuration);
    };
    FetchToyController.prototype.finishFetch=function(direction){
      var self=this;
      this.placeRestingBall(this.homePoint());
      this.ball.classList.remove('pose-hidden');
      this.persistBall();
      this.setState('HappyIdle');
      this.setKobaAnimation('koba-fetch-happy',direction);
      this.scheduleSequence(function(){
        self.setState('Idle');
        self.koba.classList.remove('play-ball-fetching');
        self.ball.classList.remove('locked');
        self.deactivate();
      },this.config.happyMinimumDuration);
    };
    FetchToyController.prototype.endHappyPose=function(){
      if(this.state!=='Idle')return;
      this.koba.classList.remove('koba-fetch-happy','koba-fetch-left');
      this.ball.classList.remove('pose-hidden','locked');
    };

    var playBallController=new FetchToyController({
      elementId:'koba-play-ball',
      storageKey:'ball',
      restSize:27,
      flightSize:28,
      bounceWidth:55,
      bounceHeight:88,
      flightDuration:860,
      bounceDuration:930,
      noticeDelayMin:300,
      noticeDelayMax:500,
      pickupDuration:1290,
      dropDuration:1310,
      rollDuration:1810,
      fetchWakeDuration:1150,
      fetchIntrigueDuration:480,
      happyMinimumDuration:1400,
      runSpeed:168,
      carrySpeed:112,
      mouthOffset:38,
      kobaGroundOffset:108,
      returnNestOffsetX:-5,
      homeGap:6,
      homeOffsetX:76
    });
    function hideKobaBallThought(){
      clearTimeout(kobaBallThoughtEndTimer);kobaBallThoughtEndTimer=null;
      desktopCompanion.classList.remove('koba-thinking-ball');
    }
    function canKobaThinkAboutBall(){
      return !kobaExclusiveMotion&&document.body.classList.contains('signed-in')&&playBallController.state==='Idle'&&playBallController.active&&!kobaIsRoaming&&!kobaNotificationActive&&searchBox.style.display!=='block'&&!desktopCompanion.classList.contains('actions-open')&&!desktopCompanion.classList.contains('interacting')&&!desktopCompanion.classList.contains('waking')&&!desktopCompanion.classList.contains('digging')&&!desktopCompanion.classList.contains('burying')&&!desktopCompanion.classList.contains('barking')&&!desktopCompanion.classList.contains('play-ball-fetching');
    }
    function scheduleKobaBallThought(delay){
      clearTimeout(kobaBallThoughtTimer);
      kobaBallThoughtTimer=setTimeout(function(){
        if(!canKobaThinkAboutBall()){scheduleKobaBallThought(12000+Math.random()*12000);return;}
        hideKobaBallThought();
        void desktopCompanion.offsetWidth;
        desktopCompanion.classList.add('koba-thinking-ball');
        kobaBallThoughtEndTimer=setTimeout(function(){
          hideKobaBallThought();
          scheduleKobaBallThought(42000+Math.random()*38000);
        },2800);
      },delay===undefined?24000+Math.random()*22000:delay);
    }
    function kobaReducedMotion(){return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
    function cancelKobaRoamAnimation(){
      var animation=kobaRoamAnimation;
      kobaRoamAnimation=null;
      if(!animation)return;
      animation.onfinish=null;
      animation.oncancel=null;
      try{animation.cancel();}catch(_){ }
    }
    function moveKobaSmoothly(startX,startY,targetX,targetY,duration,onDone){
      cancelKobaRoamAnimation();
      var durationMs=Math.max(1,duration*1000);
      desktopCompanion.style.transition='none';
      desktopCompanion.style.left=startX+'px';desktopCompanion.style.top=startY+'px';
      desktopCompanion.style.right='auto';desktopCompanion.style.bottom='auto';
      void desktopCompanion.offsetWidth;
      if(typeof desktopCompanion.animate==='function'){
        var animation=desktopCompanion.animate([
          {transform:'translate3d(0,0,0)'},
          {transform:'translate3d('+(targetX-startX)+'px,'+(targetY-startY)+'px,0)'}
        ],{duration:durationMs,easing:'linear',fill:'forwards'});
        kobaRoamAnimation=animation;
        animation.onfinish=function(){
          if(kobaRoamAnimation!==animation)return;
          kobaRoamAnimation=null;
          animation.onfinish=null;
          try{animation.cancel();}catch(_){ }
          desktopCompanion.style.left=targetX+'px';desktopCompanion.style.top=targetY+'px';
          void desktopCompanion.offsetWidth;
          desktopCompanion.style.transition='';
          onDone();
        };
        return;
      }
      desktopCompanion.style.transition='';
      requestAnimationFrame(function(){
        if(!kobaIsRoaming)return;
        desktopCompanion.style.left=targetX+'px';desktopCompanion.style.top=targetY+'px';
        kobaRoamEndTimer=setTimeout(onDone,durationMs+80);
      });
    }
    function settleKobaAtCurrentPosition(){
      if(!kobaIsRoaming)return;
      var desktop=document.getElementById('desktop'),desktopRect=desktop.getBoundingClientRect(),kobaRect=desktopCompanion.getBoundingClientRect();
      desktopCompanion.style.transition='none';
      cancelKobaRoamAnimation();
      desktopCompanion.style.left=Math.max(0,kobaRect.left-desktopRect.left)+'px';
      desktopCompanion.style.top=Math.max(0,kobaRect.top-desktopRect.top)+'px';
      desktopCompanion.style.right='auto';
      desktopCompanion.style.bottom='auto';
      void desktopCompanion.offsetWidth;
      desktopCompanion.style.transition='';
    }
    function stopKobaRoaming(){
      var wasRoaming=kobaIsRoaming;
      clearTimeout(kobaRoamEndTimer);kobaRoamEndTimer=null;
      settleKobaAtCurrentPosition();
      kobaIsRoaming=false;
      desktopCompanion.classList.remove('roaming','roaming-walk','roaming-run','roaming-dig-bone','roaming-teddy','roaming-rest-k1','roaming-go-sleep','roaming-left');
      desktopCompanion.style.removeProperty('--koba-roam-duration');
      if(wasRoaming)scheduleKobaRoam();
    }
    window.stopKobaRoaming=stopKobaRoaming;
    function canKobaRoam(){
      return !kobaExclusiveMotion&&document.body.classList.contains('signed-in')&&!kobaReducedMotion()&&searchBox.style.display!=='block'&&!kobaNotificationActive&&!desktopCompanion.classList.contains('has-pending-notification')&&!desktopCompanion.classList.contains('dragging')&&!desktopCompanion.classList.contains('actions-open')&&!desktopCompanion.classList.contains('interacting')&&!desktopCompanion.classList.contains('waking')&&!desktopCompanion.classList.contains('digging')&&!desktopCompanion.classList.contains('burying')&&!desktopCompanion.classList.contains('with-box')&&!desktopCompanion.classList.contains('play-ball-fetching')&&!desktopCompanion.classList.contains('koba-ball-watching')&&!desktopCompanion.classList.contains('koba-fetch-happy');
    }
    function scheduleKobaRoam(delay){
      clearTimeout(kobaRoamTimer);
      kobaRoamTimer=setTimeout(function(){
        if(canKobaRoam())startKobaRoam();
        else scheduleKobaRoam(9000+Math.random()*9000);
      },delay===undefined?22000+Math.random()*24000:delay);
    }
    function settleKobaAfterRoam(targetX,targetY){
      clearTimeout(kobaRoamEndTimer);kobaRoamEndTimer=null;kobaIsRoaming=false;
      desktopCompanion.style.transition='none';
      cancelKobaRoamAnimation();
      desktopCompanion.style.left=targetX+'px';desktopCompanion.style.top=targetY+'px';
      void desktopCompanion.offsetWidth;
      desktopCompanion.classList.remove('roaming','roaming-walk','roaming-run','roaming-dig-bone','roaming-teddy','roaming-rest-k1','roaming-go-sleep','roaming-left','searching');
      desktopCompanion.style.removeProperty('--koba-roam-duration');
      desktopCompanion.style.transition='';
      state.desktopIconPositions=state.desktopIconPositions||{};
      state.desktopIconPositions[desktopCompanion.id]={x:Math.round(targetX),y:Math.round(targetY),overBuddyList:false};
      desktopCompanion.classList.remove('over-buddy-list');
      saveState();
      if(window.anchorKobaPlayBallHome)window.anchorKobaPlayBallHome();
      if(!desktopCompanion.classList.contains('has-pending-notification'))setKobaSleeping();
      scheduleKobaRoam();
    }
    function kobaDestinationTouchesIcon(targetX,targetY,desktopRect){
      var padding=10,left=desktopRect.left+targetX,top=desktopRect.top+targetY;
      var right=left+desktopCompanion.offsetWidth,bottom=top+desktopCompanion.offsetHeight;
      return Array.prototype.some.call(document.querySelectorAll('.desktop-icon'),function(icon){
        if(icon===desktopCompanion)return false;
        var rect=icon.getBoundingClientRect();
        if(!rect.width||!rect.height)return false;
        return right>rect.left-padding&&left<rect.right+padding&&bottom>rect.top-padding&&top<rect.bottom+padding;
      });
    }
    function playKobaSleepScene(targetX,targetY){
      desktopCompanion.style.transition='none';
      desktopCompanion.style.left=targetX+'px';desktopCompanion.style.top=targetY+'px';
      desktopCompanion.classList.remove('sleeping','roaming-walk','roaming-run','roaming-dig-bone','roaming-teddy','roaming-rest-k1','roaming-left');
      desktopCompanion.classList.add('roaming','roaming-go-sleep');
      desktopCompanion.style.removeProperty('--koba-roam-duration');
      void desktopCompanion.offsetWidth;
      desktopCompanion.style.transition='';
      kobaRoamEndTimer=setTimeout(function(){settleKobaAfterRoam(targetX,targetY);},3250);
    }
    function playKobaPostRunAdventure(runX,runY){
      desktopCompanion.classList.remove('roaming-run','roaming-left');
      desktopCompanion.classList.add('roaming','roaming-dig-bone');
      desktopCompanion.style.removeProperty('--koba-roam-duration');
      void desktopCompanion.offsetWidth;
      kobaRoamEndTimer=setTimeout(function(){
        desktopCompanion.classList.remove('roaming-dig-bone');
        var desktop=document.getElementById('desktop'),taskbar=document.getElementById('taskbar'),desktopRect=desktop.getBoundingClientRect();
        var maxX=Math.max(4,desktop.clientWidth-desktopCompanion.offsetWidth-4);
        var maxY=Math.max(4,desktop.clientHeight-(taskbar?taskbar.offsetHeight:32)-desktopCompanion.offsetHeight-4);
        var walkX=runX,walkY=runY,tries=0,invalidTarget=true;
        while(tries++<40&&invalidTarget){
          walkX=4+Math.random()*Math.max(1,maxX-4);
          walkY=4+Math.random()*Math.max(1,maxY-4);
          invalidTarget=Math.hypot(walkX-runX,walkY-runY)<130||kobaDestinationTouchesIcon(walkX,walkY,desktopRect);
        }
        if(invalidTarget){playKobaSleepScene(runX,runY);return;}
        var distance=Math.hypot(walkX-runX,walkY-runY),duration=Math.max(2.4,Math.min(8,distance/72));
        desktopCompanion.classList.add('roaming-walk');
        desktopCompanion.classList.toggle('roaming-left',walkX<runX);
        desktopCompanion.style.setProperty('--koba-roam-duration',duration+'s');
        moveKobaSmoothly(runX,runY,walkX,walkY,duration,function(){
          if(!kobaIsRoaming||!desktopCompanion.classList.contains('roaming-walk'))return;
          playKobaSleepScene(walkX,walkY);
        });
      },4900);
    }
    function finishKobaRoam(targetX,targetY,wasRunning){
      clearTimeout(kobaRoamEndTimer);kobaRoamEndTimer=null;
      if(wasRunning){playKobaPostRunAdventure(targetX,targetY);return;}
      playKobaSleepScene(targetX,targetY);
    }
    function startKobaRoam(skipWake){
      if(!canKobaRoam()){scheduleKobaRoam();return;}
      if(!skipWake&&desktopCompanion.classList.contains('sleeping')){
        clearTimeout(kobaRoamEndTimer);
        kobaIsRoaming=true;
        desktopCompanion.classList.remove('sleeping','searching','happy','spin-burst','confused-burst');
        desktopCompanion.classList.add('waking');
        void desktopCompanion.offsetWidth;
        kobaRoamEndTimer=setTimeout(function(){
          if(!kobaIsRoaming)return;
          desktopCompanion.classList.remove('waking');
          startKobaRoam(true);
        },1160);
        return;
      }
      var desktop=document.getElementById('desktop'),taskbar=document.getElementById('taskbar');
      var desktopRect=desktop.getBoundingClientRect(),kobaRect=desktopCompanion.getBoundingClientRect();
      var startX=Math.max(4,Math.min(desktop.clientWidth-desktopCompanion.offsetWidth-4,kobaRect.left-desktopRect.left));
      var startY=Math.max(4,Math.min(desktop.clientHeight-(taskbar?taskbar.offsetHeight:32)-desktopCompanion.offsetHeight-4,kobaRect.top-desktopRect.top));
      var maxX=Math.max(4,desktop.clientWidth-desktopCompanion.offsetWidth-4);
      var maxY=Math.max(4,desktop.clientHeight-(taskbar?taskbar.offsetHeight:32)-desktopCompanion.offsetHeight-4);
      var targetX=startX,targetY=startY,tries=0,invalidTarget=true;
      while(tries++<40&&invalidTarget){
        targetX=4+Math.random()*Math.max(1,maxX-4);
        targetY=4+Math.random()*Math.max(1,maxY-4);
        invalidTarget=Math.hypot(targetX-startX,targetY-startY)<130||kobaDestinationTouchesIcon(targetX,targetY,desktopRect);
      }
      if(invalidTarget){scheduleKobaRoam();return;}
      var distance=Math.hypot(targetX-startX,targetY-startY),running=distance>420||Math.random()<.38;
      var duration=Math.max(running?1.7:2.4,Math.min(running?6:8,distance/(running?145:72)));
      desktopCompanion.classList.remove('sleeping','searching','happy','spin-burst','confused-burst','treat','bone','feed','roaming-go-sleep');
      desktopCompanion.classList.add('roaming',running?'roaming-run':'roaming-walk');
      desktopCompanion.classList.toggle('roaming-left',targetX<startX);
      desktopCompanion.style.setProperty('--koba-roam-duration',duration+'s');
      kobaIsRoaming=true;
      moveKobaSmoothly(startX,startY,targetX,targetY,duration,function(){
        if(!kobaIsRoaming||(!desktopCompanion.classList.contains('roaming-walk')&&!desktopCompanion.classList.contains('roaming-run')))return;
        finishKobaRoam(targetX,targetY,running);
      });
    }
    function stopCompanionSearchCycle(){
      clearTimeout(companionSearchCycleTimer);
      companionSearchCycleTimer=null;
      desktopCompanion.classList.remove('spin-burst','confused-burst');
    }
    function scheduleCompanionSearchCycle(){
      stopCompanionSearchCycle();
      (function idleThenBurst(isSpin){
        companionSearchCycleTimer=setTimeout(function(){
          if(!desktopCompanion.classList.contains('searching'))return;
          var cls=isSpin?'spin-burst':'confused-burst',dur=isSpin?1400:1200;
          desktopCompanion.classList.add(cls);
          companionSearchCycleTimer=setTimeout(function(){
            desktopCompanion.classList.remove(cls);
            idleThenBurst(!isSpin);
          },dur);
        },5000);
      })(true);
    }
    function stopCompanionBehavior(){
      if(window.endKobaPlayBallPose)window.endKobaPlayBallPose();
      if(kobaMemosOpen)closeKobaMemos(true);
      stopKobaRoaming();
      clearTimeout(companionBehaviorEndTimer);
      clearTimeout(kobaNotificationTimer);
      clearTimeout(kobaMemoBarkTimer);kobaMemoBarkTimer=null;
      kobaNotificationTimer=null;
      kobaNotificationActive=false;
      kobaNotificationDismiss=null;
      kobaNotificationQueue=[];
      kobaNotificationIds={};
      stopCompanionSearchCycle();
      desktopCompanion.classList.remove('waking','digging','burying','interacting','sleeping','with-box','barking','bark-flipped','notification-pending','notification-barking','happy','pet','treat','bone','feed','roaming-go-sleep','memos-open');
      companionReaction.classList.remove('koba-actionable','koba-woof','memo-align-left');
      companionReaction.onclick=null;
      companionReaction.textContent='';
    }
    function orientCompanionActions(){
      var desktop=document.getElementById('desktop'),desktopRect=desktop.getBoundingClientRect(),kobaRect=desktopCompanion.getBoundingClientRect();
      desktopCompanion.classList.toggle('menu-opens-left',kobaRect.left+kobaRect.width/2>desktopRect.left+desktopRect.width/2);
      desktopCompanion.classList.toggle('menu-opens-down',kobaRect.top-desktopRect.top<175);
    }
    function openCompanionActions(){
      orientCompanionActions();
      desktopCompanion.classList.add('actions-open');
    }
    function closeCompanionActions(){
      desktopCompanion.classList.remove('actions-open','menu-opens-left','menu-opens-down');
      if(!desktopCompanion.classList.contains('interacting')&&!desktopCompanion.classList.contains('searching')&&!desktopCompanion.classList.contains('waking')&&!desktopCompanion.classList.contains('burying')&&!desktopCompanion.classList.contains('digging')&&!desktopCompanion.classList.contains('with-box'))setKobaSleeping();
    }
    function getKobaMemoItems(){
      var notifications=state.companion&&state.companion.penPalNotifications;
      var alerts=notifications&&Array.isArray(notifications.unreadAlerts)?notifications.unreadAlerts:[];
      return alerts.map(function(alert){
        return{key:String(alert.id||''),message:String(alert.message||'New notification'),openRequests:!!alert.openRequests};
      });
    }
    function updateKobaMemosButton(){
      if(!companionMemosButton)return;
      var count=getKobaMemoItems().length;
      companionMemosButton.textContent=count?'Memos ('+count+')':'Memos';
      companionMemosButton.setAttribute('aria-label',count?count+' unread memos':'Memos, no unread notifications');
    }
    function renderKobaMemos(){
      var items=getKobaMemoItems();
      updateKobaMemosButton();
      companionReaction.textContent='';
      var head=document.createElement('div');head.className='koba-memos-head';
      var title=document.createElement('span');title.textContent='Memos'+(items.length?' ('+items.length+')':'');
      var close=document.createElement('button');close.type='button';close.className='koba-memos-close';close.setAttribute('aria-label','Close memos');close.textContent='×';
      head.appendChild(title);head.appendChild(close);companionReaction.appendChild(head);
      var list=document.createElement('div');list.className='koba-memos-list';
      if(!items.length){
        var empty=document.createElement('div');empty.className='koba-memos-empty';empty.textContent='All caught up!';list.appendChild(empty);
      }else items.forEach(function(item){
        var row=document.createElement('div');row.className='koba-memo-row';row.dataset.kobaMemoKey=item.key;
        var open=document.createElement('button');open.type='button';open.className='koba-memo-open';open.textContent=item.message;open.title=item.openRequests?'Open this notification':'Mark this notification as checked';
        var check=document.createElement('button');check.type='button';check.className='koba-memo-check';check.setAttribute('aria-label','Dismiss this memo');check.title='Dismiss this memo';check.textContent='✓';
        row.appendChild(open);row.appendChild(check);list.appendChild(row);
      });
      companionReaction.appendChild(list);
      if(items.length){
        var foot=document.createElement('div');foot.className='koba-memos-foot';
        var dismissAll=document.createElement('button');dismissAll.type='button';dismissAll.className='koba-memos-dismiss-all';dismissAll.textContent='Dismiss All';
        foot.appendChild(dismissAll);companionReaction.appendChild(foot);
      }
    }
    function playKobaMemoBark(){
      clearTimeout(kobaMemoBarkTimer);kobaMemoBarkTimer=null;
      if(!kobaMemosOpen)return;
      desktopCompanion.classList.remove('barking','notification-barking');
      faceKobaBarkTowardDesktop();
      void desktopCompanion.offsetWidth;
      desktopCompanion.classList.add('barking');
      kobaMemoBarkTimer=setTimeout(playKobaMemoBark,4000);
    }
    function closeKobaMemos(silent){
      if(!kobaMemosOpen)return;
      kobaMemosOpen=false;
      clearTimeout(kobaMemoBarkTimer);kobaMemoBarkTimer=null;
      desktopCompanion.classList.remove('memos-open','interacting','barking','bark-flipped','notification-barking');
      companionReaction.classList.remove('memo-align-left','koba-actionable','koba-woof');
      companionReaction.onclick=null;companionReaction.textContent='';
      if(silent)return;
      if(kobaNotificationQueue.length)showPendingKobaWoof();
      else if(searchBox.style.display==='block'){desktopCompanion.classList.add('searching');openCompanionActions();scheduleCompanionSearchCycle();}
      else{desktopCompanion.classList.remove('searching');setKobaSleeping();scheduleKobaRoam();}
    }
    function openKobaMemos(){
      stopKobaRoaming();
      clearTimeout(companionBehaviorEndTimer);
      clearTimeout(kobaNotificationTimer);kobaNotificationTimer=null;
      stopCompanionSearchCycle();
      kobaNotificationActive=false;kobaNotificationDismiss=null;
      companionReaction.onclick=null;
      closeCompanionActions();
      desktopCompanion.classList.remove('sleeping','happy','pet','treat','bone','feed','waking','digging','burying','with-box','notification-pending','notification-barking','barking','bark-flipped');
      desktopCompanion.classList.add('searching','interacting','memos-open');
      var rect=desktopCompanion.getBoundingClientRect();
      companionReaction.classList.toggle('memo-align-left',rect.left+rect.width/2<window.innerWidth/2);
      companionReaction.classList.remove('koba-actionable','koba-woof');
      kobaMemosOpen=true;
      renderKobaMemos();
      playKobaMemoBark();
    }
    function dismissKobaMemo(key,openItem){
      var items=getKobaMemoItems(),item=items.find(function(candidate){return candidate.key===key;});
      if(!item)return;
      state.companion.penPalNotifications.unreadAlerts=state.companion.penPalNotifications.unreadAlerts.filter(function(alert){return String(alert.id||'')!==key;});
      kobaNotificationQueue=kobaNotificationQueue.filter(function(alert){return String(alert.alertId||'')!==key;});
      delete kobaNotificationIds[key];
      saveState();
      desktopCompanion.classList.toggle('has-pending-notification',getKobaMemoItems().length>0);
      renderKobaMemos();
      if(openItem&&item.openRequests)openFriendRequestsWindow();
      if(!getKobaMemoItems().length){clearTimeout(companionBehaviorEndTimer);companionBehaviorEndTimer=setTimeout(function(){closeKobaMemos(false);},850);}
    }
    function dismissAllKobaMemos(){
      state.companion.penPalNotifications.unreadAlerts=[];
      kobaNotificationQueue=[];kobaNotificationIds={};
      saveState();
      desktopCompanion.classList.remove('has-pending-notification','notification-pending');
      renderKobaMemos();
      clearTimeout(companionBehaviorEndTimer);companionBehaviorEndTimer=setTimeout(function(){closeKobaMemos(false);},850);
    }
    function playCompanionInteraction(action){
      trackDtdUsage('koba_interacted');
      if(action==='memos'){openKobaMemos();return;}
      var details={
        praise:{className:'happy',message:'I’m a good boy!',duration:920},
        pet:{className:'pet',message:'♡ happy tail! ◡̈',duration:1600},
        feed:{className:'feed',message:'nom nom nom!',duration:2400},
        bone:{className:'bone',message:'best bone ever!',duration:2400},
        treat:{className:'treat',message:'crunch crunch!',duration:2400}
      }[action];
      if(!details)return;
      stopCompanionBehavior();
      closeCompanionActions();
      desktopCompanion.classList.remove('sleeping','happy');
      void desktopCompanion.offsetWidth;
      companionReaction.textContent=details.message;
      desktopCompanion.classList.add('searching','interacting',details.className);
      companionBehaviorEndTimer=setTimeout(function(){
        desktopCompanion.classList.remove('interacting',details.className);
        companionReaction.textContent='';
        if(searchBox.style.display==='block'){
          desktopCompanion.classList.add('searching');
          openCompanionActions();
          scheduleCompanionSearchCycle();
        }else setKobaSleeping();
      },details.duration);
    }
    function showPendingKobaWoof(){
      if(kobaMemosOpen||kobaNotificationActive||!kobaNotificationQueue.length)return;
      clearTimeout(companionBehaviorEndTimer);
      stopKobaRoaming();
      closeCompanionActions();
      desktopCompanion.classList.remove('sleeping','happy','barking','bark-flipped','interacting');
      desktopCompanion.classList.add('searching','has-pending-notification','notification-pending');
      companionReaction.classList.remove('koba-actionable');
      companionReaction.classList.add('koba-woof');
      companionReaction.textContent='Woof!';
    }
    function playNextKobaNotification(){
      if(kobaNotificationActive||!kobaNotificationQueue.length)return;
      var item=kobaNotificationQueue.shift();
      var remainingNotifications=kobaNotificationQueue.slice();
      var remainingNotificationIds=kobaNotificationIds;
      stopCompanionBehavior();
      kobaNotificationQueue=remainingNotifications;
      kobaNotificationIds=remainingNotificationIds;
      closeCompanionActions();
      kobaNotificationActive=true;
      desktopCompanion.classList.remove('sleeping','happy','notification-pending');
      companionReaction.classList.remove('koba-woof');
      void desktopCompanion.offsetWidth;
      companionReaction.textContent='Koba: '+item.message;
      companionReaction.classList.toggle('koba-actionable',!!item.openRequests);
      faceKobaBarkTowardDesktop();
      desktopCompanion.classList.add('searching','interacting','barking','notification-barking');
      function finish(openRequests){
        if(!kobaNotificationActive)return;
        clearTimeout(kobaNotificationTimer);kobaNotificationTimer=null;
        clearTimeout(companionBehaviorEndTimer);
        kobaNotificationDismiss=null;
        companionReaction.onclick=null;
        companionReaction.classList.remove('koba-actionable','koba-woof');
        companionReaction.textContent='';
        desktopCompanion.classList.remove('interacting','happy','barking','bark-flipped','notification-pending','notification-barking');
        kobaNotificationActive=false;
        if(item.alertId){delete kobaNotificationIds[item.alertId];if(window.acknowledgePenPalAlert)window.acknowledgePenPalAlert(item.alertId);}
        if(openRequests)openFriendRequestsWindow();
        if(kobaNotificationQueue.length)showPendingKobaWoof();
        else if(searchBox.style.display==='block'){desktopCompanion.classList.add('searching');scheduleCompanionSearchCycle();}
        else{desktopCompanion.classList.remove('searching','has-pending-notification');setKobaSleeping();}
      }
      kobaNotificationDismiss=function(openRequests){finish(openRequests===true);};
      companionReaction.onclick=function(e){e.preventDefault();e.stopPropagation();kobaNotificationDismiss(!!item.openRequests);};
      if(!item.alertId)kobaNotificationTimer=setTimeout(function(){finish(false);},8500);
    }
    window.showKobaNotification=function(message,openRequests,alertId){
      if(!message)return;
      alertId=alertId?String(alertId):'';
      if(alertId&&kobaNotificationIds[alertId])return;
      if(alertId)kobaNotificationIds[alertId]=true;
      kobaNotificationQueue.push({message:String(message),openRequests:!!openRequests,alertId:alertId});
      updateKobaMemosButton();
      if(kobaMemosOpen){renderKobaMemos();return;}
      showPendingKobaWoof();
    };
    function playCompanionDigSequence(){
      stopCompanionBehavior();
      closeCompanionActions();
      desktopCompanion.classList.remove('sleeping','searching','happy');
      void desktopCompanion.offsetWidth;
      desktopCompanion.classList.add('digging');
      companionBehaviorEndTimer=setTimeout(function(){
        desktopCompanion.classList.remove('digging');
        if(memoryPanel.style.display==='block'){
          desktopCompanion.classList.add('with-box');
        }else{
          if(searchBox.style.display==='block')desktopCompanion.classList.add('searching');else setKobaSleeping();
        }
      },4400);
    }
    function playCompanionMemorySequence(){
      stopCompanionBehavior();
      closeCompanionActions();
      desktopCompanion.classList.remove('sleeping','searching','happy');
      void desktopCompanion.offsetWidth;
      desktopCompanion.classList.add('burying');
      companionBehaviorEndTimer=setTimeout(function(){
        desktopCompanion.classList.remove('burying');
        if(searchBox.style.display==='block')desktopCompanion.classList.add('searching');else setKobaSleeping();
      },4400);
    }
    function tokensFor(q){return q.toLowerCase().trim().split(/\s+/).filter(Boolean).slice(0,8);}
    function matches(text,tokens){var hay=(text||'').toLowerCase();return tokens.every(function(t){return hay.indexOf(t)!==-1;});}
    function regexEscape(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
    function highlighted(text,tokens){var clean=(text||'').replace(/\s+/g,' ').trim();if(!clean)return '<span style="color:#999">Image entry</span>';var re=new RegExp('('+tokens.map(regexEscape).join('|')+')','ig');return clean.split(re).map(function(part){return tokens.some(function(t){return part.toLowerCase()===t;})?'<mark>'+escapeHtml(part)+'</mark>':escapeHtml(part);}).join('');}
    function excerpt(text,tokens){var clean=(text||'').replace(/\s+/g,' ').trim();if(!clean)return '';var lower=clean.toLowerCase(),at=-1;tokens.forEach(function(t){var i=lower.indexOf(t);if(i!==-1&&(at===-1||i<at))at=i;});var start=Math.max(0,(at<0?0:at)-55),end=Math.min(clean.length,start+180);if(end-start<180)start=Math.max(0,end-180);return(start?'…':'')+clean.slice(start,end)+(end<clean.length?'…':'');}
    function collect(q){
      var tokens=tokensFor(q),found=[];if(!tokens.length)return found;
      (state.blogPosts||[]).forEach(function(post){var body=stripHtmlTags(post.html||''),all=(post.title||'')+' '+body;if(matches(all,tokens))found.push({type:post.shared?'profile':'diaryentry',id:post.id,title:post.title||'Untitled',location:post.shared?'Profile':'Private Diary Entries',ts:post.ts||0,text:body||post.title||''});});
      Object.keys(state.entries||{}).forEach(function(buddyId){var buddy=state.buddies.find(function(b){return b.id===buddyId;}),name=buddy?buddy.name:'Diary';(state.entries[buddyId]||[]).forEach(function(entry){if(entry.locked)return;var body=stripHtmlTags(entry.html!==undefined?entry.html:(entry.text||''));if(matches(body,tokens))found.push({type:'buddy',id:entry.id,buddyId:buddyId,title:name,location:name+' diary entry',ts:entry.ts||0,text:body});});});
      (state.companion&&state.companion.memories||[]).forEach(function(memory){if(matches(memory.text,tokens))found.push({type:'companionmemory',id:memory.id,title:'Companion memory',location:'Puppy memory',ts:memory.ts||0,text:memory.text});});
      if(typeof sortedNotebookPages === 'function'){
        var notebookPages = sortedNotebookPages();
        notebookPages.forEach(function(page,index){
          var pageNum=index+1;
          var title=(page.title||'').trim() || 'Untitled Page';
          var haystack=(title+' '+(page.text||'')+' page '+pageNum+' page '+pageNum+' of '+notebookPages.length+' '+fmtDayDivider(page.createdAt||0)+' '+fmtDayDivider(page.updatedAt||0)).toLowerCase();
          if(tokens.every(function(token){ return haystack.indexOf(token) !== -1; })){
            found.push({
              type:'notebook',
              id:page.id,
              title:title,
              location:'Notebook · Page '+pageNum,
              ts:page.updatedAt||0,
              text:page.text||title,
              pageNum:pageNum
            });
          }
        });
      }
      return found.sort(function(a,b){return b.ts-a.ts;}).slice(0,50);
    }
    function updateCompanionGreeting(){
      var hour=new Date().getHours(),timeWord=hour<12?'morning':(hour<18?'afternoon':'evening'),name=(state.account&&state.account.screenName)||'friend',count=state.companion.memories.length;
      greeting.textContent='Good '+timeWord+', '+name+'!';
      companionNote.textContent=count?'I’m keeping '+count+(count===1?' memory':' memories')+' safe for you.':'I can search your diary and remember things for you.';
      memoryCount.textContent='('+count+')';
    }
    function renderCompanionMemories(){
      var memories=state.companion.memories.slice().sort(function(a,b){return b.ts-a.ts;});
      memoryList.innerHTML=memories.length?memories.map(function(memory){return '<div class="companion-memory-row" data-companion-memory-id="'+escapeHtml(memory.id)+'">'+escapeHtml(memory.text)+'<time>'+escapeHtml(fmtDayDivider(memory.ts))+'</time><button class="companion-memory-delete" type="button" title="Forget this memory" aria-label="Forget this memory">×</button></div>';}).join(''):'<div class="companion-memory-empty">Your puppy hasn’t memorized anything yet.</div>';
      updateCompanionGreeting();
    }
    function remember(){
      var text=memoryInput.value.trim();if(!text)return;
      state.companion.memories.push({id:uid(),text:text.slice(0,500),ts:Date.now()});memoryInput.value='';saveState();renderCompanionMemories();
      playCompanionMemorySequence();
    }
    function renderSearch(){
      var q=input.value.trim(),tokens=tokensFor(q);if(!q){resultsBox.style.display='none';resultsBox.innerHTML='';return;}
      var found=collect(q);resultsBox.style.display='block';
      if(!found.length){resultsBox.innerHTML='<div class="search-empty">I sniffed through your notebook and diary entries, but I couldn’t find anything about that.</div>';return;}
      resultsBox.innerHTML='<div class="search-summary">'+found.length+(found.length===1?' result':' results')+' for <b>'+escapeHtml(q)+'</b></div>'+found.map(function(r){
        var text=excerpt(r.text,tokens);
        var openBtn=r.type==='notebook' ? 'notebook-open' : '';
        return '<div class="search-result" tabindex="0" data-search-type="'+r.type+'" data-search-id="'+escapeHtml(r.id)+'" data-search-buddy="'+escapeHtml(r.buddyId||'')+'">'+
          '<div class="search-result-title">'+highlighted(r.title,tokens)+'</div>'+
          '<div class="search-result-meta">'+escapeHtml(r.location)+' · '+fmtDayDivider(r.ts)+'</div>'+
          '<div class="search-result-snippet">'+highlighted(text,tokens)+'</div>'+
          (openBtn?'<button class="search-result-open" data-open="notebook-open" data-open-id="'+escapeHtml(r.id)+'">Open page</button>':'')+
        '</div>';
      }).join('');
    }
    function flashTarget(selector){setTimeout(function(){var target=document.querySelector(selector);if(!target)return;target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.remove('search-target-flash');void target.offsetWidth;target.classList.add('search-target-flash');setTimeout(function(){target.classList.remove('search-target-flash');},1900);},120);}
    function closeSearch(){searchBox.style.display='none';resultsBox.style.display='none';toggle.setAttribute('aria-expanded','false');if(memoryPanel.style.display==='block'){memoryPanel.style.display='none';memoryToggle.setAttribute('aria-expanded','false');playCompanionMemorySequence();return;}closeCompanionActions();desktopCompanion.classList.remove('searching');if(!desktopCompanion.classList.contains('waking')&&!desktopCompanion.classList.contains('burying')&&!desktopCompanion.classList.contains('digging')&&!desktopCompanion.classList.contains('interacting')&&!desktopCompanion.classList.contains('with-box'))setKobaSleeping();if(window.restorePendingPenPalAlerts)window.restorePendingPenPalAlerts();}
    function openResult(row){var type=row.dataset.searchType,id=row.dataset.searchId,buddyId=row.dataset.searchBuddy;if(type==='companionmemory'){resultsBox.style.display='none';input.value='';memoryPanel.style.display='block';memoryToggle.setAttribute('aria-expanded','true');renderCompanionMemories();playCompanionDigSequence();flashTarget('[data-companion-memory-id="'+id+'"]');return;}closeSearch();if(type==='notebook'){if(window.openNotebookPage){var q=input.value.trim();window.openNotebookPage(id,q);}return;}if(type==='profile'){var w=openWindows.find(function(x){return x.type==='viewprofile';});if(w)focusWindow(w.id);else openViewProfileWindow();flashTarget('.blog-post[data-post-id="'+id+'"]');}else if(type==='diaryentry'){openDiaryEntriesWindow();flashTarget('[data-entry-id="'+id+'"]');}else{openIMWindow(buddyId);flashTarget('.im-entry[data-entry-id="'+id+'"]');}}
    function openSearchUI(){searchBox.style.display='block';toggle.setAttribute('aria-expanded','true');state.companion.lastOpened=Date.now();saveState();renderCompanionMemories();setTimeout(function(){input.focus();input.select();},0);}
    function faceKobaBarkTowardDesktop(){
      var desktop=document.getElementById('desktop'),desktopRect=desktop.getBoundingClientRect(),kobaRect=desktopCompanion.getBoundingClientRect();
      var kobaIsOnRight=kobaRect.left+kobaRect.width/2>desktopRect.left+desktopRect.width/2;
      desktopCompanion.classList.toggle('bark-flipped',kobaIsOnRight);
    }
    function playKobaSecondClickTrick(){
      stopCompanionBehavior();
      closeCompanionActions();
      desktopCompanion.classList.remove('sleeping','happy','spin-burst','confused-burst','barking','bark-flipped');
      void desktopCompanion.offsetWidth;
      var tricks=[
        {className:'spin-burst',duration:1400},
        {className:'happy',duration:920},
        {className:'barking',duration:1200}
      ];
      var trick=tricks[Math.floor(Math.random()*tricks.length)],animationClass=trick.className;
      if(animationClass==='barking')faceKobaBarkTowardDesktop();
      desktopCompanion.classList.add('searching',animationClass);
      // The action menu should be usable immediately; Koba can finish the
      // playful second-click animation behind it without blocking the user.
      openCompanionActions();
      companionBehaviorEndTimer=setTimeout(function(){
        desktopCompanion.classList.remove(animationClass,'bark-flipped');
        scheduleCompanionSearchCycle();
      },trick.duration);
    }
    toggle.addEventListener('click',function(){var opening=searchBox.style.display!=='block';if(opening){stopCompanionBehavior();closeCompanionActions();desktopCompanion.classList.remove('sleeping');desktopCompanion.classList.add('searching');openSearchUI();scheduleCompanionSearchCycle();}else{if(kobaMemosOpen)closeKobaMemos(true);closeSearch();}});
    bindAccessibleAction(desktopCompanion,function(e){
      e.stopPropagation();
      if(window.isKobaExclusiveMotionActive&&window.isKobaExclusiveMotionActive()){
        e.preventDefault();
        return;
      }
      trackDtdUsage('koba_interacted');
      if(kobaMemosOpen){closeKobaMemos(false);return;}
      if(kobaNotificationActive&&kobaNotificationDismiss){
        kobaNotificationDismiss();
        return;
      }
      if(kobaNotificationQueue.length&&!kobaNotificationActive){
        playNextKobaNotification();
        return;
      }
      if(searchBox.style.display==='block'){
        playKobaSecondClickTrick();
        return;
      }
      closeCompanionActions();
      stopCompanionBehavior();
      desktopCompanion.classList.remove('happy','sleeping');
      void desktopCompanion.offsetWidth;
      desktopCompanion.classList.add('searching','happy');
      companionBehaviorEndTimer=setTimeout(function(){desktopCompanion.classList.remove('happy');scheduleCompanionSearchCycle();},920);
      openSearchUI();
    });
    companionActions.addEventListener('pointerdown',function(e){e.stopPropagation();});
    companionActions.addEventListener('click',function(e){
      var closeButton=e.target.closest('.koba-panel-close');
      var actionButton=e.target.closest('[data-companion-action]');
      if(!closeButton&&!actionButton)return;
      e.preventDefault();e.stopPropagation();
      if(closeButton){closeCompanionActions();return;}
      playCompanionInteraction(actionButton.dataset.companionAction);
    });
    companionReaction.addEventListener('pointerdown',function(e){if(kobaMemosOpen)e.stopPropagation();});
    companionReaction.addEventListener('click',function(e){
      if(!kobaMemosOpen)return;
      e.preventDefault();e.stopPropagation();
      if(e.target.closest('.koba-memos-close')){closeKobaMemos(false);return;}
      if(e.target.closest('.koba-memos-dismiss-all')){dismissAllKobaMemos();return;}
      var row=e.target.closest('.koba-memo-row');
      if(!row)return;
      dismissKobaMemo(row.dataset.kobaMemoKey,!!e.target.closest('.koba-memo-open'));
    });
    button.addEventListener('click',renderSearch);
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();renderSearch();}if(e.key==='Escape'){if(kobaMemosOpen)closeKobaMemos(true);closeSearch();}});
    input.addEventListener('input',function(){if(input.value.trim().length>=2)renderSearch();else resultsBox.style.display='none';});
    memoryToggle.addEventListener('click',function(){var opening=memoryPanel.style.display!=='block';memoryPanel.style.display=opening?'block':'none';memoryToggle.setAttribute('aria-expanded',opening?'true':'false');if(opening){renderCompanionMemories();playCompanionDigSequence();setTimeout(function(){memoryInput.focus();},0);}else{playCompanionMemorySequence();}});
    memorySave.addEventListener('click',remember);
    memoryInput.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();remember();}});
    memoryList.addEventListener('click',function(e){var button=e.target.closest('.companion-memory-delete');if(!button)return;var row=button.closest('[data-companion-memory-id]'),id=row&&row.dataset.companionMemoryId;if(!id)return;appConfirm('Let your puppy forget this memory?',function(ok){if(!ok)return;state.companion.memories=state.companion.memories.filter(function(memory){return memory.id!==id;});saveState();renderCompanionMemories();});});
    resultsBox.addEventListener('click',function(e){
      var openBtn=e.target.closest('.search-result-open');
      var row=e.target.closest('.search-result');
      if(openBtn) e.preventDefault();
      if(row)openResult(row);
    });
    resultsBox.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('search-result')){e.preventDefault();openResult(e.target);}});
    document.addEventListener('pointerdown',function(e){
      var clickedOutsideCompanion=!desktopCompanion.contains(e.target);
      if(clickedOutsideCompanion&&kobaMemosOpen){closeKobaMemos(false);return;}
      if(clickedOutsideCompanion&&kobaNotificationActive&&kobaNotificationDismiss){
        kobaNotificationDismiss();
        return;
      }
      if(!searchBox.contains(e.target)&&!toggle.contains(e.target)&&clickedOutsideCompanion)closeSearch();
    });
    window.addEventListener('resize',function(){if(desktopCompanion.classList.contains('actions-open'))orientCompanionActions();});
    window.refreshKobaMemos=function(){updateKobaMemosButton();if(kobaMemosOpen)renderKobaMemos();};
    window.initializeKobaPlayBall=function(){playBallController.init();};
    renderCompanionMemories();
    updateKobaMemosButton();
    setKobaSleeping();
    scheduleKobaRoam(9000+Math.random()*7000);
    scheduleKobaBallThought();
  })();
