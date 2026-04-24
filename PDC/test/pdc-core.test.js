const assert = require("assert");
const PdcCore = require("../src/pdc-core");

const now = 1000;

{
  const readings = [
    PdcCore.reading("rear_left", 150, now),
    PdcCore.reading("rear_mid_left", 82, now),
    PdcCore.reading("rear_mid_right", 48, now),
    PdcCore.reading("rear_right", 140, now)
  ];
  const state = PdcCore.computeState(readings, { nowMs: now });
  assert.strictEqual(state.nearestDistanceCm, 48);
  assert.strictEqual(state.warningLevel, "Caution");
  assert.strictEqual(state.stale, false);
}

{
  assert.strictEqual(PdcCore.levelForDistance(140), "Far");
  assert.strictEqual(PdcCore.levelForDistance(80), "Near");
  assert.strictEqual(PdcCore.levelForDistance(45), "Caution");
  assert.strictEqual(PdcCore.levelForDistance(20), "Critical");
}

{
  const stale = [PdcCore.reading("rear_left", 20, now - 1000)];
  const state = PdcCore.computeState(stale, { nowMs: now });
  assert.strictEqual(state.stale, true);
  assert.strictEqual(state.warningLevel, "Off");
}

{
  const readings = PdcCore.decodeCanFrame({
    id: 0x350,
    data: [150, 0, 100, 0, 50, 0, 30, 0]
  }, now);
  assert.deepStrictEqual(readings.map((item) => item.distanceCm), [150, 100, 50, 30]);
}

{
  const readings = PdcCore.decodeCanFrame({
    id: 0x123,
    data: [0, 0x49, 0, 0, 0, 0, 0, 0]
  }, now);
  assert.deepStrictEqual(readings.map((item) => item.distanceCm), [73, 73, 73, 73]);
}

console.log("PDC core tests passed");
