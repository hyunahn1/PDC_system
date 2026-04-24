# PiRacer Parking Distance Control

> A browser-based Parking Distance Control (PDC) simulator for rear obstacle detection, CAN distance decoding, warning-state computation, and reverse-camera overlay visualization.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=flat-square&logo=javascript&logoColor=111)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=flat-square&logo=html5&logoColor=fff)
![CSS3](https://img.shields.io/badge/CSS3-Responsive_UI-1572B6?style=flat-square&logo=css3&logoColor=fff)
![Test](https://img.shields.io/badge/Test-Node_assert-2EA44F?style=flat-square)

## Overview

PiRacer PDC is a compact Parking Distance Control system prototype focused on the rear-view reversing experience. It models how rear ultrasonic sensor readings are received, validated, converted into warning levels, and rendered as a camera overlay with visual guidance zones.

The project is intentionally split into a pure decision-making core and a standalone simulator UI. This keeps the safety-critical PDC logic testable without a browser, while still providing an interactive interface that demonstrates how the system behaves under clear, near, caution, critical, stale, and inactive conditions.

This repository is intended for simple PDC behavior testing and visualization. To implement a complete physical PDC system, ultrasonic sensors should be connected to an Arduino or equivalent microcontroller so real distance measurements can be transmitted into the vehicle software stack. For the hardware-integrated PDC implementation, refer to my separate GitHub repository named `HEAD_UNIT`, which contains the head-unit-side PDC code.

## Key Features

| Area | Description |
| --- | --- |
| Sensor model | Supports four rear sensor zones: rear left, rear mid-left, rear mid-right, and rear right. |
| CAN decoding | Decodes supported CAN frame formats into normalized distance readings. |
| Warning logic | Computes nearest obstacle distance and maps it to `Far`, `Near`, `Caution`, `Critical`, or `Off`. |
| Fail-safe handling | Detects stale frames, invalid distances, inactive gear state, and speed-based suppression. |
| Camera overlay | Renders reverse guide lines, warning bands, sector intensity, and live distance status on canvas. |
| Simulator controls | Includes automatic sensor motion, manual sliders, scenario presets, threshold controls, and gear toggle. |
| Testable core | Core PDC functions are framework-independent and covered by Node-based assertions. |

## System Architecture

```text
Ultrasonic Sensors / Mock Scenario Input
                 |
                 v
        CAN Frame / Distance Source
                 |
                 v
          PDC Core Logic
  - normalize sensor readings
  - validate distance ranges
  - reject stale data
  - find nearest obstacle
  - compute warning level
                 |
       +---------+----------+
       |                    |
       v                    v
 Canvas Camera Overlay   State Output / Tests
```

The architecture follows a small but deliberate separation of concerns:

| Layer | File | Responsibility |
| --- | --- | --- |
| Core domain logic | `PDC/src/pdc-core.js` | Provides sensor definitions, threshold defaults, CAN decoding, reading validation, nearest-distance calculation, stale-frame detection, and warning-level mapping. |
| Simulator application | `PDC/src/app.js` | Connects UI controls to the PDC core, generates automatic sensor scenarios, builds current state snapshots, and drives the render loop. |
| Visual interface | `PDC/src/styles.css` and `PDC/index.html` | Defines the responsive application shell, control panel, HUD, canvas stage, scenario controls, and threshold inputs. |
| Design reference | `PDC/docs/ARCHITECTURE.md` | Documents the runtime pipeline, fail-safe behavior, sensor layout, and intended head-unit integration path. |
| Validation | `PDC/test/pdc-core.test.js` | Verifies warning-level mapping, nearest-distance selection, stale behavior, and CAN frame decoding. |

## Core Logic

The PDC core is implemented as a Universal Module Definition-style JavaScript module, so it can run in both browser and Node environments.

### Sensor Layout

```text
rear_left | rear_mid_left | rear_mid_right | rear_right
```

Each sensor reading is normalized into this structure:

```js
{
  name: "rear_mid_right",
  distanceCm: 48,
  valid: true,
  timestampMs: 1000
}
```

### Distance Thresholds

Default warning thresholds are defined in centimeters:

| Threshold | Default | Meaning |
| --- | ---: | --- |
| `near` | `120 cm` | The obstacle is close enough to show active proximity guidance. |
| `caution` | `60 cm` | The obstacle is close and requires driver attention. |
| `critical` | `30 cm` | The obstacle is very close and should trigger the strongest warning state. |
| `minValid` | `2 cm` | Distances below this range are rejected as invalid. |
| `maxValid` | `400 cm` | Distances above this range are rejected as invalid. |
| `staleMs` | `450 ms` | Frames older than this timeout are considered stale. |

### Warning Levels

```text
Off -> Far -> Near -> Caution -> Critical
```

The state machine prioritizes fail-safe behavior. A warning is only active when the system is enabled, the latest readings are fresh, at least one valid distance exists, and the vehicle speed remains within the configured active range.

## CAN Frame Support

`PDC/src/pdc-core.js` currently supports two decoding paths:

| CAN ID | Format | Behavior |
| --- | --- | --- |
| `0x123` | Single-byte shared distance | Uses byte `data[1]` as a common distance value for all four rear sensors. |
| `0x350` | Four little-endian 16-bit distances | Reads four independent distances from byte pairs `[0,1]`, `[2,3]`, `[4,5]`, and `[6,7]`. |

An observed sample log is included in `PDC/samples/can0-observed.log`.

## Simulator UI

The browser simulator is designed as a reverse-camera instrument panel:

- A large canvas stage represents the rear camera view.
- Colored guide paths communicate proximity severity.
- Four lower sensor sectors show relative obstacle intensity.
- A HUD displays nearest distance, warning level, and current gear.
- A side control panel provides scenario presets, manual distance sliders, threshold inputs, automatic motion, and gear switching.

The simulator is useful for demonstrating both normal behavior and edge cases:

| Scenario | Purpose |
| --- | --- |
| `Clear` | Shows a safe reversing area with all sensors far from obstacles. |
| `Left` | Places the nearest obstacle near the left rear sensor. |
| `Center` | Places the obstacle across the two middle rear sensors. |
| `Right` | Places the nearest obstacle near the right rear sensor. |
| `Critical` | Drives the system into the strongest warning range. |
| `Stale` | Simulates outdated sensor data and verifies fail-safe shutoff behavior. |

## Project Structure

```text
.
├── README.md
└── PDC
    ├── docs
    │   └── ARCHITECTURE.md
    ├── index.html
    ├── samples
    │   └── can0-observed.log
    ├── src
    │   ├── app.js
    │   ├── pdc-core.js
    │   └── styles.css
    └── test
        └── pdc-core.test.js
```

## Getting Started

No package installation is required for the current standalone version.

### Run the Simulator

Open the simulator directly in a browser:

```text
PDC/index.html
```

If you prefer serving it from a local static server:

```bash
cd PDC
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### Run Tests

From the repository root:

```bash
node PDC/test/pdc-core.test.js
```

Expected result:

```text
PDC core tests passed
```

## Fail-Safe Behavior

| Condition | Result |
| --- | --- |
| Reverse gear is inactive | PDC warning level becomes `Off`. |
| No readings are available | State is treated as stale and warning level becomes `Off`. |
| All readings are older than the stale timeout | PDC enters stale mode and warning level becomes `Off`. |
| A distance is outside the valid range | That sensor reading is ignored. |
| No valid nearest distance exists | Warning level becomes `Off`. |
| Vehicle speed exceeds the active threshold | Warning output is suppressed. |

This behavior keeps the system conservative: uncertain input does not produce an aggressive warning state.

## Implementation Highlights

- `computeState()` is the central state reducer. It accepts normalized sensor readings and returns a complete PDC state snapshot.
- `decodeCanFrame()` isolates CAN-specific parsing from the rest of the application.
- `levelForDistance()` keeps threshold mapping deterministic and easy to test.
- `intensityForDistance()` converts distance into a visual strength value for the overlay.
- The browser app never owns the warning rules directly; it delegates that responsibility to the core module.

## Example State Output

```json
{
  "nearestDistanceCm": 48,
  "warningLevel": "Caution",
  "active": true,
  "stale": false,
  "sensors": [
    { "name": "rear_left", "distanceCm": 150, "valid": true },
    { "name": "rear_mid_left", "distanceCm": 82, "valid": true },
    { "name": "rear_mid_right", "distanceCm": 48, "valid": true },
    { "name": "rear_right", "distanceCm": 140, "valid": true }
  ]
}
```

## Extension Roadmap

The current simulator is structured so the mock input layer can be replaced with real vehicle data without rewriting the core logic.

Potential next steps:

- Connect the decoder to a SocketCAN provider on embedded Linux.
- Add per-sensor calibration and installation offsets.
- Add audible warning cadence using the computed warning level.
- Persist user-defined threshold profiles.
- Add browser-based regression snapshots for overlay rendering.
- Integrate the overlay into a Qt head-unit reverse camera window.

## Documentation

Additional architecture notes are available in:

```text
PDC/docs/ARCHITECTURE.md
```

## License

No license file is currently included. Add a license before distributing or publishing this project outside a private portfolio or coursework context.
