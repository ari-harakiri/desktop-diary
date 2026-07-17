  var state = {
    account: null,          // { screenName, password }
    savePassword: false,
    autoLogin: false,
    status: { label: '', html: '', ts: null },   // current status
    statusLog: [],                    // history: { label, html, ts }
    statusPresets: [],                // saved reusable statuses: { id, label, html }
    moodLog: [],                      // mood tracker history: { mood, ts }
    profile: { pic: '', html: '', header: '', aboutMe: '' },  // profile picture + two HTML sections
    blogPosts: [],          // blog posts: { id, title, html, ts, editedAt }
    background: { color: '', image: '' },  // custom desktop background (device-local, not synced)
    paintRecentColors: [],  // recently used custom colors in Paint (device-local, not synced)
    themeRecentColors: [],  // recently used custom colors in Edit Theme (device-local, not synced)
    theme: { preset: 'classic', customColors: ['#3d95ff'], buttonColor: '#9cc6f0', startColor: '#7ed957', buttonRainbow: false, startRainbow: false, clockColor: '#1a4fc4', calDaysColors: ['#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a','#8f8b7a'], fontColor: '#ffffff' }, // window chrome and interface colors
    customFonts: [],        // user-uploaded fonts (device-local, not synced): { id, name, dataUrl }
    stickyNotes: [],        // desktop sticky notes (device-local): { id, title, text, color, x, y, w, h }
    desktopIconPositions: {}, // desktop icon id -> { x, y }
    buddyListPosition: null, // device-local Buddy List position: { x, y }
    trash: [],              // recoverable deleted content, retained for seven days
    customMoods: [],        // user-added moods: ['Grateful', 'Hopeful', ...]
    customMoodColors: {},   // mood name -> hex color override
    groups: [ { id: 'default', name: 'Buddy Lists' } ],
    buddies: [],            // { id, name, addedAt, groupId }
    entries: {},            // buddyId -> [ { id, html, ts, kind:'entry'|'prompt' } ]
    drafts: {},             // buddyId -> [ { id, html, ts }, ... ] saved draft log
    mail: { address: '', inbox: [], sent: [], scheduled: [], contacts: [] }, // DtD Post Mail account, messages, and address book
    companion: { animal: 'puppy', memories: [], lastOpened: null, toys: { ball: { x: null, y: null, throwCount: 0 } }, penPalNotifications: { knownIncoming: [], pendingOutgoing: [], unreadAlerts: [] } }, // private desktop-companion memory, toys, and notification state
    scrapbook: { backgroundPreset: 'computer', backgroundColor: '#f1f3f5', backgroundPattern: 'none', border: 'simple', fontFamily: 'system', headingFont: 'system', fontSize: 'medium', stickers: [], notes: [] }
  };
  var EMPTY_STATE_TEMPLATE=JSON.stringify(state);
  function makeFreshState(){return JSON.parse(EMPTY_STATE_TEMPLATE);}

  function normalizeState(){
    if(!Array.isArray(state.groups) || !state.groups.length){
      state.groups = [{ id: 'default', name: 'Buddy Lists' }];
    }
    if(!Array.isArray(state.buddies)) state.buddies = [];
    state.buddies.forEach(function(b){ if(!b.groupId) b.groupId = 'default'; });
    if(!state.status) state.status = { label: '', html: '', ts: null };
    if(!Array.isArray(state.statusLog)) state.statusLog = [];
    state.statusLog.forEach(function(e){ if(!e.id) e.id = uid(); });
    if(!Array.isArray(state.statusPresets)) state.statusPresets = [];
    if(!Array.isArray(state.moodLog)) state.moodLog = [];
    state.moodLog.forEach(function(e){ if(!e.id) e.id = uid(); });
    if(!state.profile) state.profile = { pic: '', html: '', header: '', aboutMe: '' };
    if(!state.profile.header && !state.profile.aboutMe && state.profile.html){
      // migrate old single html field into aboutMe
      state.profile.aboutMe = state.profile.html;
    }
    if(state.profile.header === undefined) state.profile.header = '';
    if(state.profile.aboutMe === undefined) state.profile.aboutMe = '';
    if(!Array.isArray(state.blogPosts)) state.blogPosts = [];
    state.blogPosts.forEach(function(post){if(post.shared===undefined)post.shared=true;});
    if(!state.background) state.background = { color: '', image: '', gradient: '' };
    if(state.background.gradient === undefined) state.background.gradient = '';
    if(!Array.isArray(state.paintRecentColors)) state.paintRecentColors = [];
    state.paintRecentColors = state.paintRecentColors.filter(function(c){ return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c); }).slice(0,16);
    if(!Array.isArray(state.themeRecentColors)) state.themeRecentColors = [];
    state.themeRecentColors = state.themeRecentColors.filter(function(c){ return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c); }).slice(0,16);
    if(!state.theme || typeof state.theme !== 'object') state.theme = { preset: 'classic' };
    if(!state.theme.preset) state.theme.preset = 'classic';
    // migrate the old single customColor field into the new customColors array
    if(!Array.isArray(state.theme.customColors) || !state.theme.customColors.length){
      state.theme.customColors = [ state.theme.customColor || '#3d95ff' ];
    }
    if(!state.theme.startColor) state.theme.startColor = '#7ed957';
    if(!state.theme.buttonColor) state.theme.buttonColor = state.theme.startColor;
    if(state.theme.buttonRainbow === undefined) state.theme.buttonRainbow = !!state.theme.startRainbow;
    if(!state.theme.clockColor) state.theme.clockColor = '#1a4fc4';
    if(!Array.isArray(state.theme.calDaysColors) || state.theme.calDaysColors.length !== 7){
      var legacyBase = state.theme.calDaysColor || '#8f8b7a';
      var legacyRainbow = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#5b2c9d','#9b59b6'];
      state.theme.calDaysColors = state.theme.calDaysRainbow ? legacyRainbow.slice() : [legacyBase,legacyBase,legacyBase,legacyBase,legacyBase,legacyBase,legacyBase];
    }
    if(!state.theme.fontColor) state.theme.fontColor = '#ffffff';
    if(!state.theme.gradientDirection) state.theme.gradientDirection = 'horizontal';
    if(state.theme.preset && state.theme.preset !== 'custom' && state.theme.preset.indexOf('custom-') !== 0){
      state.theme.gradientDirection = 'vertical';
    }
    if(state.theme.preset && state.theme.preset !== 'custom' && state.theme.preset.indexOf('custom-') !== 0 && state.theme.preset !== 'rainbow'){
      state.theme.accentRainbow = false;
      state.theme.buttonRainbow = false;
      state.theme.startRainbow = false;
      state.theme.clockRainbow = false;
    }
    if(!Array.isArray(state.customThemePresets)) state.customThemePresets = [];
    if(!Array.isArray(state.customFonts)) state.customFonts = [];
    if(!Array.isArray(state.stickyNotes)) state.stickyNotes = [];
    if(!state.desktopIconPositions || typeof state.desktopIconPositions !== 'object') state.desktopIconPositions = {};
    if(!state.buddyListPosition || !Number.isFinite(Number(state.buddyListPosition.x)) || !Number.isFinite(Number(state.buddyListPosition.y))) state.buddyListPosition = null;
    if(!Array.isArray(state.trash)) state.trash = [];
    state.trash = state.trash.filter(function(item){return item&&item.deletedAt&&Date.now()-item.deletedAt<7*24*60*60*1000;});
    if(!Array.isArray(state.customMoods)) state.customMoods = [];
    if(!state.customMoodColors || typeof state.customMoodColors !== 'object') state.customMoodColors = {};
    state.entries = state.entries || {};
    Object.keys(state.entries).forEach(function(bid){
      (state.entries[bid] || []).forEach(function(e){ if(!e.kind) e.kind = 'entry'; });
    });
    if(!state.drafts || typeof state.drafts !== 'object') state.drafts = {};
    Object.keys(state.drafts).forEach(function(bid){
      var d = state.drafts[bid];
      if(d && !Array.isArray(d)){
        // migrate old single-draft-per-buddy format into a one-item log
        state.drafts[bid] = d.html ? [{ id: uid(), html: d.html, ts: d.ts || Date.now() }] : [];
      }
      if(!Array.isArray(state.drafts[bid])) state.drafts[bid] = [];
      state.drafts[bid].forEach(function(entry){ if(!entry.id) entry.id = uid(); });
    });
    if(!state.mail || typeof state.mail !== 'object') state.mail = { address: '', inbox: [], sent: [], scheduled: [], contacts: [] };
    if(typeof state.mail.address !== 'string') state.mail.address = '';
    if(!Array.isArray(state.mail.inbox)) state.mail.inbox = [];
    if(!Array.isArray(state.mail.sent)) state.mail.sent = [];
    if(!Array.isArray(state.mail.scheduled)) state.mail.scheduled = [];
    if(!Array.isArray(state.mail.contacts)) state.mail.contacts = [];
    if(!state.mail.pigeonDelivery || typeof state.mail.pigeonDelivery!=='object'){
      var legacyKnown=(Array.isArray(state.mail.onlineInboxCache)?state.mail.onlineInboxCache:state.mail.inbox).map(function(message){return String(message.message_id||message.id||'');}).filter(Boolean);
      state.mail.pigeonDelivery={knownMessageIds:legacyKnown.slice(-500),activeBatchMarker:'',presentedBatchMarker:'',acknowledged:false};
    }
    var pigeonDelivery=state.mail.pigeonDelivery;
    if(!Array.isArray(pigeonDelivery.knownMessageIds)) pigeonDelivery.knownMessageIds=[];
    pigeonDelivery.knownMessageIds=pigeonDelivery.knownMessageIds.map(String).filter(Boolean).slice(-500);
    if(typeof pigeonDelivery.activeBatchMarker!=='string') pigeonDelivery.activeBatchMarker='';
    if(typeof pigeonDelivery.presentedBatchMarker!=='string') pigeonDelivery.presentedBatchMarker='';
    pigeonDelivery.acknowledged=!!pigeonDelivery.acknowledged;
    var contactHandles = {};
    state.mail.contacts = state.mail.contacts.filter(function(contact){
      if(!contact || typeof contact.handle !== 'string') return false;
      contact.handle = contact.handle.trim().toLowerCase().split('@')[0];
      contact.name = typeof contact.name === 'string' ? contact.name.trim() : '';
      if(!contact.id) contact.id = uid();
      if(!contact.handle || contactHandles[contact.handle]) return false;
      contactHandles[contact.handle] = true;
      return true;
    });
    state.mail.inbox.forEach(function(m){if(m.subject==='Welcome to DtD Mail'||m.subject==='Welcome to DtD Post'||m.subject==='Welcome to DtD Postmail'){m.subject='Welcome to DtD Post Mail';m.from='postmaster@desktopdiary.local';m.body='DtD Post Mail is a private, local-only mail simulator. Messages you write stay inside DesktopDiary and never leave your device.';}});
    if(!state.companion || typeof state.companion!=='object') state.companion={animal:'puppy',memories:[],lastOpened:null};
    if(!state.companion.animal) state.companion.animal='puppy';
    if(!Array.isArray(state.companion.memories)) state.companion.memories=[];
    state.companion.memories=state.companion.memories.filter(function(memory){return memory&&typeof memory.text==='string'&&memory.text.trim();}).map(function(memory){if(!memory.id)memory.id=uid();if(!memory.ts)memory.ts=Date.now();memory.text=memory.text.trim().slice(0,500);return memory;});
    if(!state.companion.toys||typeof state.companion.toys!=='object')state.companion.toys={};
    if(!state.companion.toys.ball||typeof state.companion.toys.ball!=='object')state.companion.toys.ball={x:null,y:null,throwCount:0};
    if(state.companion.toys.ball.x===null||state.companion.toys.ball.x===''||!Number.isFinite(Number(state.companion.toys.ball.x)))state.companion.toys.ball.x=null;
    if(state.companion.toys.ball.y===null||state.companion.toys.ball.y===''||!Number.isFinite(Number(state.companion.toys.ball.y)))state.companion.toys.ball.y=null;
    if(!Number.isFinite(Number(state.companion.toys.ball.throwCount))||Number(state.companion.toys.ball.throwCount)<0)state.companion.toys.ball.throwCount=0;
    else state.companion.toys.ball.throwCount=Math.floor(Number(state.companion.toys.ball.throwCount));
    if(!state.companion.penPalNotifications||typeof state.companion.penPalNotifications!=='object')state.companion.penPalNotifications={knownIncoming:[],pendingOutgoing:[],unreadAlerts:[]};
    if(!Array.isArray(state.companion.penPalNotifications.knownIncoming))state.companion.penPalNotifications.knownIncoming=[];
    if(!Array.isArray(state.companion.penPalNotifications.pendingOutgoing))state.companion.penPalNotifications.pendingOutgoing=[];
    if(!Array.isArray(state.companion.penPalNotifications.unreadAlerts))state.companion.penPalNotifications.unreadAlerts=[];
    state.companion.penPalNotifications.knownIncoming=state.companion.penPalNotifications.knownIncoming.map(String).filter(Boolean);
    state.companion.penPalNotifications.pendingOutgoing=state.companion.penPalNotifications.pendingOutgoing.map(String).filter(Boolean);
    state.companion.penPalNotifications.unreadAlerts=state.companion.penPalNotifications.unreadAlerts.filter(function(alert){return alert&&alert.id&&alert.message;}).map(function(alert){return{id:String(alert.id),message:String(alert.message),openRequests:!!alert.openRequests};});
    if(!state.scrapbook || typeof state.scrapbook!=='object') state.scrapbook={backgroundPreset:'computer',backgroundColor:'#f1f3f5',backgroundPattern:'none',border:'simple',fontFamily:'system',headingFont:'system',fontSize:'medium',stickers:[],notes:[]};
    if(!state.scrapbook.backgroundPreset) state.scrapbook.backgroundPreset='computer';
    if(!/^#[0-9a-f]{6}$/i.test(state.scrapbook.backgroundColor||'')) state.scrapbook.backgroundColor='#f1f3f5';
    if(['none','dots','grid'].indexOf(state.scrapbook.backgroundPattern)<0) state.scrapbook.backgroundPattern='none';
    if(['simple','double','dashed','bold'].indexOf(state.scrapbook.border)<0) state.scrapbook.border='simple';
    if(['system','arial','georgia','courier','trebuchet','verdana','times'].indexOf(state.scrapbook.fontFamily)<0) state.scrapbook.fontFamily='system';
    if(['system','arial','georgia','courier','trebuchet','verdana','times'].indexOf(state.scrapbook.headingFont)<0) state.scrapbook.headingFont='system';
    if(['small','medium','large'].indexOf(state.scrapbook.fontSize)<0) state.scrapbook.fontSize='medium';
    if(!Array.isArray(state.scrapbook.stickers)) state.scrapbook.stickers=[];
    state.scrapbook.stickers=state.scrapbook.stickers.filter(function(sticker){return typeof sticker==='string'&&sticker.length<12;}).slice(0,12);
    if(!Array.isArray(state.scrapbook.notes)) state.scrapbook.notes=[];
    state.scrapbook.notes=state.scrapbook.notes.filter(function(note){return note&&typeof note.text==='string'&&note.text.trim();}).map(function(note){if(!note.id)note.id=uid();note.text=note.text.trim().slice(0,500);return note;}).slice(0,20);
    if(!state.mail.welcomed){
      state.mail.inbox.push({id:uid(),from:'postmaster@desktopdiary.local',to:(state.account&&state.account.screenName||'you')+'@desktopdiary.local',subject:'Welcome to DtD Post Mail',body:'DtD Post Mail is a private, local-only mail simulator. Messages you write stay inside DesktopDiary and never leave your device.',ts:Date.now(),read:false});
      state.mail.welcomed = true;
    }
  }

  var openWindows = [];     // { id, type, buddyId, el, tbEl }
  var activeWindowId = null;
  var showDesktopHidden = []; // window ids minimized by the "Show Desktop" toggle
  var logFilterByBuddy = {};       // buddyId -> 'photo'|'voice'|'prompt'|null
  var searchQueryByBuddy = {};     // buddyId -> string
  var zCounter = 100;
  var winCounter = 0;

  function isMobile(){
    return window.matchMedia('(max-width: 700px)').matches;
  }

