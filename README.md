# AirCue demo

A bilingual, browser-based air-cannon haptics demo.

https://ksk432.com/aircue-demo/

Run locally: `python -m http.server 8080 --bind 127.0.0.1`, then open http://127.0.0.1:8080/.

Stereo L + R, 12 ms push / 48 ms return. Default volume: 100% (unity gain, +0 dB). Audio settings allow attenuation and output-device selection where supported. Device enumeration may require microphone permission; capture stops immediately and is never recorded or transmitted. Unsupported browsers use OS output selection.

Dedicated air-cannon hardware is required. The gentle-stimulus description refers to the physical air-cannon design, not software attenuation. Actual intensity depends on the hardware and amplifier.

GitHub Pages publishes the main branch root. No backend, build step, analytics or external assets.

Tests: `node --test waveform.test.cjs`.

Derived from AirCue. Copyright (C) 2026 AirCue contributors. GNU GPL v3 only; see LICENSE.

