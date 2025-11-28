# TamperMonkeySCRIPTS
Various Web Scripts I build to customize websites via the app TamperMonkey.
  

**VideoSpeedOverride** is a small TamperMonkey script that forces LinkedIn Learning videos to respect your chosen playback speed, even above the built-in 2.0x limit. It is intended for users who focus better or learn more efficiently at higher playback rates.
It injects a floating on-screen control panel into LinkedIn Learning pages. You can:
  - Enable or disable the override
  - Select from speed presets: Off, 1x, 1.5x, 2x, 2.5x, 3x, 5x, 7x, 9x, 16x
  - Use keyboard shortcuts A (slower) and D (faster) to adjust speed in 0.25x steps
When the override is active, the extension globally patches the HTMLMediaElement playbackRate setter so that LinkedIn Learning cannot silently force video playback back to 2.0x. Testing shows that chapters continue to be marked complete at high speeds, with occasional rewatch needed on very short segments.
