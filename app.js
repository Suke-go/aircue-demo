'use strict';
const $ = (id) => document.getElementById(id);
let context, source, timer, phase = 'idle', generation = 0, shots = 0;
let selectedSink = '', outputVolume = 1;
const translations = {
  '準備を確認してください': 'Please check before starting.',
  '音声出力を準備しています': 'Preparing audio output.',
  'キャンセルしました': 'Cancelled.',
  '準備完了。手のひらを空気砲の前へ': 'Ready. Place your palm in front of the air cannon.',
  '発射信号を送信中': 'Sending pulse.',
  '発射信号を送信しました': 'Pulse sent.',
  'もう一度、体験できます': 'Ready to try again.',
  '画面を離れたためキャンセルしました': 'Cancelled because the page was hidden.',
  'タイミングが中断されたためキャンセルしました': 'Cancelled because timing was interrupted.',
  '音声出力が中断されました。接続を確認してください': 'Audio interrupted. Check the connection.',
  'このブラウザは音声出力に対応していません': 'Audio output is not supported in this browser.',
  '全画面にできません。ブラウザの全画面機能を利用してください': 'Use your browser’s full screen option.'
};
function bilingual(id, ja, en) {
  const element = $(id); element.textContent = ja;
  const english = document.createElement('span'); english.className = 'en'; english.lang = 'en'; english.textContent = en;
  element.append(english);
}
function status(text, error = false) {
  const seconds = text.match(/^発射まで (\d) 秒$/);
  bilingual('status', text, seconds ? `Firing in ${seconds[1]} seconds` : translations[text] || (error ? 'Audio error. Check your output device.' : ''));
  $('status').classList.toggle('error', error);
}
function controls() {
  $('fire').disabled = phase !== 'idle' || !$('ready').checked;
  $('stop').disabled = phase === 'idle';
  $('output-settings').disabled = phase !== 'idle';
  document.body.classList.toggle('counting', phase === 'countdown');
  document.body.classList.toggle('firing', phase === 'playing');
}
function reset(message) {
  generation++;
  clearTimeout(timer);
  if (source) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); source = null; }
  phase = 'idle';
  $('button-title').textContent = '空気砲を打つ';
  bilingual('button-sub', '3秒後に、1回発射', 'Fire once after 3 seconds');
  document.querySelector('.fire-icon').textContent = '◎';
  controls(); status(message);
}
async function start() {
  if (phase !== 'idle' || !$('ready').checked || document.hidden) return;
  phase = 'arming'; controls();
  const run = ++generation;
  status('音声出力を準備しています');
  try {
    if (!context || context.state === 'closed') {
      context = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
      context.addEventListener('statechange', () => {
        $('audio-state').textContent = context.state === 'running' ? `AUDIO ${context.sampleRate / 1000} kHz` : 'AUDIO STANDBY';
        if (context.state !== 'running' && ['countdown', 'playing'].includes(phase)) reset('音声出力が中断されました。接続を確認してください');
      });
    }
    if (selectedSink && typeof context.setSinkId !== 'function') throw new Error('このブラウザでは出力機器を変更できません');
    if (typeof context.setSinkId === 'function' && context.sinkId !== selectedSink) await context.setSinkId(selectedSink);
    if (run !== generation) return;
    await context.resume();
    if (run !== generation) return;
    if (context.state !== 'running') throw new Error('音声出力を開始できません');
    phase = 'countdown'; controls();
    const deadline = performance.now() + 3000;
    function tick() {
      if (run !== generation) return;
      const remaining = deadline - performance.now();
      if (remaining <= 0) {
        // Cancel stale callbacks rather than firing after a sleeping/busy tab wakes.
        if (remaining < -400 || document.hidden) { reset('タイミングが中断されたためキャンセルしました'); return; }
        play(run); return;
      }
      const seconds = Math.ceil(remaining / 1000);
      document.querySelector('.fire-icon').textContent = String(seconds);
      $('button-title').textContent = '発射まで';
      bilingual('button-sub', '手のひらを向けてください', 'Place your palm in front');
      status(`発射まで ${seconds} 秒`);
      timer = setTimeout(tick, Math.min(remaining, 100));
    }
    tick();
  } catch (error) {
    if (run !== generation) return;
    reset(''); status(`音声出力エラー：${error.message}`, true);
  }
}
function play(run) {
  try {
    if (context.state !== 'running') throw new Error('音声接続を確認してください');
    const samples = makePulse(context.sampleRate, 'both');
    for (const channel of samples) for (let i = 0; i < channel.length; i++) channel[i] *= outputVolume;
    const buffer = context.createBuffer(2, samples[0].length, context.sampleRate);
    samples.forEach((data, channel) => buffer.copyToChannel(data, channel));
    source = context.createBufferSource(); source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (run !== generation) return;
      source.disconnect(); source = null;
      phase = 'cooldown'; controls(); status('発射信号を送信しました');
      timer = setTimeout(() => reset('もう一度、体験できます'), 1400);
    };
    source.start(); phase = 'playing'; controls();
    $('count').textContent = String(++shots).padStart(2, '0');
    document.querySelector('.fire-icon').textContent = '◌';
    $('button-title').textContent = '発射'; bilingual('button-sub', '空気の刺激を送ります', 'Sending a puff of air');
    status('発射信号を送信中');
  } catch (error) { reset(''); status(`音声出力エラー：${error.message}`, true); }
}
$('fire').addEventListener('click', start);
$('stop').addEventListener('click', () => reset('キャンセルしました'));
$('ready').addEventListener('change', () => {
  if (!$('ready').checked) reset('準備を確認してください');
  else { controls(); status('準備完了。手のひらを空気砲の前へ'); }
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && phase !== 'idle') reset('キャンセルしました'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && phase !== 'idle') reset('画面を離れたためキャンセルしました'); });
window.addEventListener('pagehide', () => reset('準備を確認してください'));
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { status('全画面にできません。ブラウザの全画面機能を利用してください'); }
});
document.addEventListener('fullscreenchange', () => { bilingual('fullscreen', document.fullscreenElement ? '全画面を終了 ↙' : '全画面にする ↗', document.fullscreenElement ? 'Exit full screen' : 'Full screen'); });
if (!window.AudioContext) { $('ready').disabled = true; status('このブラウザは音声出力に対応していません', true); }

const canRoute = !!window.AudioContext && typeof AudioContext.prototype.setSinkId === 'function';
function outputMessage(ja, en) { bilingual('output-message', ja, en); }
function invalidateReady() { $('ready').checked = false; reset('準備を確認してください'); }
async function listOutputs() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  $('output-device').replaceChildren(new Option('OSの既定 / System default', ''));
  for (const device of devices.filter(d => d.kind === 'audiooutput' && d.deviceId && d.deviceId !== 'default')) {
    $('output-device').add(new Option(device.label || `音声出力 / Audio output ${$('output-device').length}`, device.deviceId));
  }
  if (selectedSink && ![...$('output-device').options].some(o => o.value === selectedSink)) {
    selectedSink = ''; invalidateReady();
    outputMessage('出力機器が見つかりません。接続を確認してください。', 'Output device missing. Check the connection.');
  }
  $('output-device').value = selectedSink;
}
$('output-settings').addEventListener('click', () => {
  if (phase === 'idle') $('output-dialog').showModal();
});
$('output-close').addEventListener('click', () => $('output-dialog').close());
$('volume').addEventListener('input', () => {
  outputVolume = Number($('volume').value) / 100;
  $('volume-value').textContent = `${$('volume').value}%`;
  invalidateReady();
});
$('output-device').addEventListener('change', () => { selectedSink = $('output-device').value; invalidateReady(); });
$('output-permission').addEventListener('click', async () => {
  $('output-permission').disabled = true;
  try {
    if (navigator.mediaDevices.selectAudioOutput) {
      const device = await navigator.mediaDevices.selectAudioOutput();
      selectedSink = device.deviceId;
      invalidateReady();
    } else {
      // Chromium needs microphone permission to enumerate all output devices.
      // Stop all tracks immediately; never record or connect this stream.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    }
    await listOutputs();
    outputMessage('出力機器を選んでください。', 'Select your output device.');
  } catch (error) {
    outputMessage('機器へのアクセスが許可されませんでした。OS側でも出力先を選べます。', 'Device access was not granted. You can choose the output in OS settings.');
  } finally { $('output-permission').disabled = false; }
});
if (!canRoute || !navigator.mediaDevices?.enumerateDevices) {
  $('output-device').disabled = true; $('output-permission').hidden = true;
  outputMessage('このブラウザでは出力先をOSの音声設定で選択してください。', 'Choose the output device in OS audio settings for this browser.');
} else {
  if (!navigator.mediaDevices.selectAudioOutput) {
    bilingual('output-permission', '機器一覧を許可（マイク権限）', 'Allow device list (microphone permission)');
    outputMessage('機器一覧の取得にはマイク権限が必要です。取得後すぐ停止し、録音・送信はしません。', 'Microphone permission is needed to list devices. Capture stops immediately; nothing is recorded or transmitted.');
  }
  listOutputs().catch(() => outputMessage('機器一覧を取得できません。OSの音声設定を利用してください。', 'Device list unavailable. Use OS audio settings.'));
  navigator.mediaDevices.addEventListener('devicechange', () => {
    invalidateReady();
    listOutputs().catch(() => {});
  });
}
