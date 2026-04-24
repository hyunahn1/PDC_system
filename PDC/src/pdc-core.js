(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PdcCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const SENSOR_NAMES = ["rear_left", "rear_mid_left", "rear_mid_right", "rear_right"];
  const DEFAULT_THRESHOLDS = Object.freeze({
    near: 120,
    caution: 60,
    critical: 30,
    minValid: 2,
    maxValid: 400,
    staleMs: 450
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeThresholds(thresholds) {
    return Object.assign({}, DEFAULT_THRESHOLDS, thresholds || {});
  }

  function reading(name, distanceCm, nowMs) {
    const value = Number(distanceCm);
    const valid = Number.isFinite(value)
      && value >= DEFAULT_THRESHOLDS.minValid
      && value <= DEFAULT_THRESHOLDS.maxValid;

    return {
      name,
      distanceCm: valid ? value : -1,
      valid,
      timestampMs: nowMs
    };
  }

  function levelForDistance(distanceCm, thresholds) {
    const t = normalizeThresholds(thresholds);
    if (!Number.isFinite(distanceCm) || distanceCm < 0) return "Off";
    if (distanceCm < t.critical) return "Critical";
    if (distanceCm < t.caution) return "Caution";
    if (distanceCm < t.near) return "Near";
    return "Far";
  }

  function computeState(readings, options) {
    const opts = Object.assign({
      active: true,
      nowMs: Date.now(),
      speedKmh: 0,
      maxActiveSpeedKmh: 10,
      thresholds: DEFAULT_THRESHOLDS
    }, options || {});
    const t = normalizeThresholds(opts.thresholds);
    const list = Array.isArray(readings) ? readings : [];
    const stale = list.length === 0 || list.every((item) => {
      return !item.timestampMs || opts.nowMs - item.timestampMs > t.staleMs;
    });

    let nearest = Infinity;
    for (const item of list) {
      const ageOk = item.timestampMs && opts.nowMs - item.timestampMs <= t.staleMs;
      if (item.valid && ageOk && item.distanceCm < nearest) {
        nearest = item.distanceCm;
      }
    }

    const hasNearest = Number.isFinite(nearest);
    const speedAllowed = opts.speedKmh <= opts.maxActiveSpeedKmh;
    const warningLevel = opts.active && !stale && hasNearest && speedAllowed
      ? levelForDistance(nearest, t)
      : "Off";

    return {
      rearSensors: list,
      nearestDistanceCm: hasNearest ? nearest : -1,
      warningLevel,
      active: Boolean(opts.active),
      stale,
      speedKmh: opts.speedKmh
    };
  }

  function decodeCanFrame(frame, nowMs) {
    if (!frame || !Array.isArray(frame.data)) return [];
    const id = typeof frame.id === "string" ? parseInt(frame.id, 16) : frame.id;
    const data = frame.data.map((byte) => Number(byte) & 0xff);

    if (id === 0x123 && data.length >= 2) {
      return SENSOR_NAMES.map((name) => reading(name, data[1], nowMs));
    }

    if (id === 0x350 && data.length >= 8) {
      const values = [0, 2, 4, 6].map((offset) => data[offset] | (data[offset + 1] << 8));
      return SENSOR_NAMES.map((name, index) => reading(name, values[index], nowMs));
    }

    return [];
  }

  function intensityForDistance(distanceCm) {
    if (!Number.isFinite(distanceCm) || distanceCm < 0) return 0;
    return clamp((150 - distanceCm) / 120, 0, 1);
  }

  return {
    SENSOR_NAMES,
    DEFAULT_THRESHOLDS,
    clamp,
    computeState,
    decodeCanFrame,
    intensityForDistance,
    levelForDistance,
    reading
  };
});
