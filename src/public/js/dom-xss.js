// ============================================================
//  DOM-based XSS demonstration (client-side only)
// ============================================================
// Reads the URL fragment (location.hash) and shows it as a
// greeting. The server never receives the fragment, so this
// vulnerability lives entirely in the browser.
//
//   VULNERABLE: writes untrusted input with innerHTML  -> XSS fires
//   SAFE:       writes untrusted input with textContent -> inert text
// ============================================================
(function () {
  var target = document.getElementById('greeting-target');
  if (!target) return;

  // Untrusted source: everything after the '#'
  var raw = decodeURIComponent(location.hash.slice(1));
  if (!raw) return;

  if (window.FLEX_MODE === 'vulnerable') {
    // DANGEROUS SINK: innerHTML parses and runs markup.
    target.innerHTML = raw;
  } else {
    // SAFE SINK: textContent treats it as plain text.
    target.textContent = raw;
  }
})();
