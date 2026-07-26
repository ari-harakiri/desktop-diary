window.onerror = function(msg, src, line, col, err){
  // Cross-origin scripts (Firebase, Google Sign-In) report errors as a blank
  // "Script error." with no line/source, per browser security rules. That's
  // never actionable and was alarming users for essentially no reason, so we
  // skip showing the banner for that specific unhelpful case.
  if(msg === 'Script error.' && !line && !src) return;
  // Chromium-based iOS browsers (Chrome, Brave, etc.) inject an internal
  // "__gCrWeb" bridge script into every page for autofill/password-manager
  // integration. When it fails to initialize in time, the browser blames it on
  // the page URL even though it's entirely the browser's own internal code —
  // nothing to do with this app, so it's not worth alarming anyone about.
  if(typeof msg === 'string' && msg.indexOf('__gCrWeb') !== -1) return;
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:10px;font-size:12px;z-index:999999;font-family:monospace;white-space:pre-wrap;word-break:break-all;';
  d.textContent = 'Error: ' + msg + '\nLine: ' + line + '\nSource: ' + src;
  document.body.appendChild(d);
};
try {
(function(){
/*__DESKTOPDIARY_MODULES__*/
})();
} catch(e){
  var _ed = document.createElement('div');
  _ed.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:10px;font-size:12px;z-index:999999;font-family:monospace;white-space:pre-wrap;word-break:break-all;';
  _ed.textContent = 'Top-level error: ' + (e && e.message ? e.message : String(e)) + (e && e.stack ? '\n' + e.stack.split('\n').slice(0,4).join('\n') : '');
  document.body.appendChild(_ed);
}
