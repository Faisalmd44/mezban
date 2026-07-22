#!/usr/bin/env node

/**
 * generate-alarm-sound.js — generates the two-tone alarm WAV file
 * (assets/sounds/new_order_alarm.wav) that the withNewOrderAlarm
 * config plugin copies into android/app/src/main/res/raw/ during
 * prebuild. The WAV is created programmatically so the repo doesn't
 * have to store a binary file.
 *
 * Run automatically by the "prebuild" npm script, or manually:
 *   node scripts/generate-alarm-sound.js
 */

const fs = require("fs");
const path = require("path");

function writeAlarmWav(filePath) {
  const sampleRate = 22050;
  const duration = 3.0;
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples * 2; // 16-bit mono

  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);

  // fmt chunk
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // chunk size
  buf.writeUInt16LE(1, 20);  // PCM
  buf.writeUInt16LE(1, 22);  // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);  // block align
  buf.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cyclePos = (t % 0.3) / 0.3;
    const freq = cyclePos < 0.5 ? 800 : 1000;
    const fundamental = Math.sin(2 * Math.PI * freq * t);
    const harmonic = Math.sin(2 * Math.PI * freq * 2 * t);
    let val = 0.5 * fundamental + 0.2 * harmonic;
    // Envelope to avoid clicks at start/end
    const env = Math.min(1.0, t * 10) * Math.min(1.0, (duration - t) * 10);
    val *= env * 0.6;
    const intVal = Math.max(-32768, Math.min(32767, Math.round(val * 32767)));
    buf.writeInt16LE(intVal, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buf);
  console.log("[generate-alarm-sound] Wrote", filePath, "(" + buf.length + " bytes)");
}

const outDir = path.join(__dirname, "..", "assets", "sounds");
const outFile = path.join(outDir, "new_order_alarm.wav");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

writeAlarmWav(outFile);
