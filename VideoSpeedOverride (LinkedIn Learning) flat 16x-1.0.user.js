// ==UserScript==
// @name         VideoSpeedOverride (LinkedIn Learning) flat 16x
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Override LinkedIn video speed limits with presets + A/D fine control
// @match        https://www.linkedin.com/learning/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=linkedin.com
// @run-at       document-start
// @grant        none
// ==/UserScript==
/*
VideoSpeedOverride – High-speed playback controller for LinkedIn Learning
Copyright (C) 2025 Nate Byrnes

Licensed under the Creative Commons Attribution–NonCommercial–ShareAlike
4.0 International Public License (CC BY-NC-SA 4.0).
You may copy, modify, and redistribute this work **for non-commercial
purposes only**, provided that you:
- Give appropriate credit to the original author,
- Include a link to the license, and
- Distribute any derivative works under the same CC BY-NC-SA 4.0 license.
No warranties are provided. This software is offered “as-is” without
any guarantee of fitness or functionality.
Full license text: https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode
*/
(function() {
  'use strict';

  // --- Global state ---
  var overrideMode = false;// true = force our speed, false = native behavior
  var overrideRate = 1.0;// current target speed when overrideMode is true
  var MAX_RATE = 20.0;
  var MIN_RATE = 0.1;
  var STEP_RATE = 0.25;// A / D step size
  var activeButton = null;// UI button currently selected
  var panelBuilt = false;

  // --- Patch HTMLMediaElement.prototype.playbackRate globally ---
  (function patchPlaybackRate() {
    var proto = HTMLMediaElement && HTMLMediaElement.prototype;
    if (!proto) return;

    var desc = Object.getOwnPropertyDescriptor(proto, 'playbackRate');
    if (!desc || !desc.get || !desc.set) return;

    Object.defineProperty(proto, 'playbackRate', {
      configurable: true,
      enumerable: desc.enumerable,
      get: function() {
        return desc.get.call(this);
      },
      set: function(newVal) {
        // If override is active, ignore the requested value and enforce our own
        var target;
        if (overrideMode && typeof overrideRate === 'number') {
          target = overrideRate;
        } else {
          target = newVal;
        }

        if (typeof target !== 'number' || isNaN(target)) {
          target = 1.0;
        }

        if (target > MAX_RATE) target = MAX_RATE;
        if (target < MIN_RATE) target = MIN_RATE;

        desc.set.call(this, target);
      }
    });
  })();

  // --- Utility: find the main (largest) video on the page ---
  function findVideo() {
    var vids = document.querySelectorAll('video');
    if (!vids.length) return null;
    var best = null;
    var bestArea = 0;
    vids.forEach(function(v) {
      var r = v.getBoundingClientRect();
      var area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = v;
      }
    });
    return best;
  }

  // Apply current override rate to the main video (useful when toggling UI)
  function applyRateToCurrent() {
    var v = findVideo();
    if (!v) return;
    try {
      v.playbackRate = overrideMode ? overrideRate : v.playbackRate;
    } catch (e) {}
  }

  // --- Keyboard controls: A (down), D (up) ---
  document.addEventListener('keydown', function(e) {
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || e.isContentEditable) return;

    if (e.key === 'd' || e.key === 'D') {
      // Speed up
      if (!overrideMode) {
        // Turn on override starting from current speed
        var v = findVideo();
        var cur = (v && v.playbackRate) || 1.0;
        overrideRate = cur;
        overrideMode = true;
      }
      overrideRate += STEP_RATE;
      if (overrideRate > MAX_RATE) overrideRate = MAX_RATE;
      applyRateToCurrent();
      updateActiveButtonHighlight();
    }

    if (e.key === 'a' || e.key === 'A') {
      // Slow down
      if (!overrideMode) {
        var v2 = findVideo();
        var cur2 = (v2 && v2.playbackRate) || 1.0;
        overrideRate = cur2;
        overrideMode = true;
      }
      overrideRate -= STEP_RATE;
      if (overrideRate < MIN_RATE) overrideRate = MIN_RATE;
      applyRateToCurrent();
      updateActiveButtonHighlight();
    }
  });

  // --- UI panel ---

  var speedOptions = [
    { label: 'Off', value: null },// disable override
    { label: '1x', value: 1.0 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2.0 },
    { label: '2.5x', value: 2.5 },
    { label: '3x', value: 3.0 },
    { label: '5x', value: 5.0 },
    { label: '7x', value: 7.0 },
    { label: '9x', value: 9.0 },
    { label: '16x', value: 16.0 },
  ];

  function createPanel() {
    if (panelBuilt) return;
    panelBuilt = true;

    var panel = document.createElement('div');
    panel.id = 'vso-panel';
    panel.style.position = 'fixed';
    panel.style.right = '16px';
    panel.style.bottom = '16px';
    panel.style.zIndex = '999999';
    panel.style.background = 'rgba(0,0,0,0.8)';
    panel.style.color = '#fff';
    panel.style.padding = '8px 10px';
    panel.style.borderRadius = '6px';
    panel.style.fontSize = '12px';
    panel.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '6px';

    var title = document.createElement('div');
    title.textContent = 'VideoSpeedOverride';
    title.style.fontWeight = '600';
    panel.appendChild(title);

    var row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '4px';

    speedOptions.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.style.cursor = 'pointer';
      btn.style.padding = '2px 6px';
      btn.style.borderRadius = '4px';
      btn.style.border = '1px solid #777';
      btn.style.background = '#333';
      btn.style.color = '#fff';
      btn.style.fontSize = '11px';

      btn.dataset.vsoValue = (opt.value === null ? '' : String(opt.value));

      btn.addEventListener('click', function() {
        if (opt.value === null) {
          // Off
          overrideMode = false;
          overrideRate = 1.0;
        } else {
          overrideMode = true;
          overrideRate = opt.value;
        }
        applyRateToCurrent();
        setActiveButton(btn);
      });

      row.appendChild(btn);

      // Default highlight: Off
      if (opt.value === null && !activeButton) {
        activeButton = btn;
        btn.style.background = '#0a66c2';
        btn.style.borderColor = '#0a66c2';
      }
    });

    panel.appendChild(row);

    var hint = document.createElement('div');
    hint.textContent = 'A/D: step down/up';
    hint.style.fontSize = '10px';
    hint.style.opacity = '0.8';
    panel.appendChild(hint);

    document.body.appendChild(panel);
  }

  function setActiveButton(btn) {
    if (activeButton && activeButton !== btn) {
      activeButton.style.background = '#333';
      activeButton.style.borderColor = '#777';
    }
    activeButton = btn;
    if (btn) {
      btn.style.background = '#0a66c2';
      btn.style.borderColor = '#0a66c2';
    }
  }

  function updateActiveButtonHighlight() {
    if (!panelBuilt) return;
    var buttons = document.querySelectorAll('#vso-panel button');
    var targetLabel = null;

    if (!overrideMode) {
      targetLabel = 'Off';
    } else {
      // Try to match exact preset, otherwise just leave current highlight
      var v = overrideRate;
      targetLabel = null;
      speedOptions.forEach(function(opt) {
        if (opt.value !== null && Math.abs(opt.value - v) < 0.001) {
          targetLabel = opt.label;
        }
      });
    }

    buttons.forEach(function(btn) {
      var label = btn.textContent;
      if (label === targetLabel) {
        setActiveButton(btn);
      }
    });
  }

  // Build panel when DOM is ready
  function initUI() {
    if (document.body) {
      createPanel();
    } else {
      var obs = new MutationObserver(function() {
        if (document.body) {
          obs.disconnect();
          createPanel();
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

})();
