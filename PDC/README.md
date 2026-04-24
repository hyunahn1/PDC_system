# PiRacer PDC

Standalone Park Distance Control project for the PiRacer head unit.

This repository can be published separately from the full Yocto/Head Unit tree. It includes:

- A browser-based PDC simulator that works without ultrasonic sensors.
- The same warning-level logic used by the head unit integration.
- CAN decode examples for the observed PiRacer frames.
- Documentation for integrating the feature into a Qt head unit.

## Run Locally

Open:

```text
index.html
```

No build step is required. The simulator uses mock rear sensor distances and can switch between automatic motion, manual sliders, and fixed scenarios.

Optional static server:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Test Core Logic

```bash
node test/pdc-core.test.js
```

Expected:

```text
PDC core tests passed
```

## Warning Levels

| Level | Distance |
|-------|----------|
| Far | `>= 120 cm` |
| Near | `60-119 cm` |
| Caution | `30-59 cm` |
| Critical | `< 30 cm` |
| Off | gear not reverse, stale data, invalid data, or speed gate |

## CAN Decode

The simulator core supports two frame formats:

| CAN ID | Payload | Meaning |
|--------|---------|---------|
| `0x123` | `B1` | Observed live Pi frame. `B1` is treated as one rear distance and copied to all rear sectors. |
| `0x350` | `B0-B1`, `B2-B3`, `B4-B5`, `B6-B7` | Proposed four-sensor frame, little-endian cm values. |

Example:

```js
const readings = PdcCore.decodeCanFrame({
  id: 0x350,
  data: [150, 0, 100, 0, 50, 0, 30, 0]
}, Date.now());
```

## Suggested GitHub Layout

```text
PDC/
├── index.html
├── src/
│   ├── app.js
│   ├── pdc-core.js
│   └── styles.css
├── test/
│   └── pdc-core.test.js
├── docs/
│   └── ARCHITECTURE.md
├── samples/
│   └── can0-observed.log
└── README.md
```

## Publish As A Separate Repository

From the `PDC` directory:

```bash
git init
git add .
git commit -m "Initial PiRacer PDC simulator"
git branch -M main
git remote add origin git@github.com:<your-user>/piracer-pdc.git
git push -u origin main
```

For GitHub Pages:

1. Open repository settings.
2. Go to Pages.
3. Set source to `Deploy from a branch`.
4. Select `main` and `/root`.
5. Open the generated Pages URL.

## Head Unit Integration

The full Qt integration lives in the Head Unit tree:

- `PdcTypes`
- `IPdcSensorProvider`
- `SocketCanPdcProvider`
- `PdcController`
- `PdcOverlayPainter`
- `PdcBeepController`
- `ReverseCameraWindow::setPdcState`

The standalone simulator is intentionally dependency-free so it can be used for demos, README screenshots, and threshold tuning without the car.
