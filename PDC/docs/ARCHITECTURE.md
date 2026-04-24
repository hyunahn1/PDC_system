# PDC Architecture

## Goal

PDC warns the driver while reversing by combining rear ultrasonic distance data with a camera overlay.

## Runtime Pipeline

```text
Ultrasonic sensors
        |
       CAN
        |
        v
PdcSensorProvider
        |
        v
PdcController
  - validates distances
  - detects stale frames
  - computes nearest obstacle
  - maps distance to warning level
        |
        +------------------+
        |                  |
        v                  v
PdcOverlayPainter     PdcBeepController
camera guide lines    warning cadence
```

## Sensor Layout

```text
rear_left | rear_mid_left | rear_mid_right | rear_right
```

## Fail-Safe Behavior

| Condition | Behavior |
|-----------|----------|
| Gear is not reverse | PDC Off |
| No valid frame for stale timeout | PDC Off |
| Distance outside valid range | Sensor ignored |
| No CAN interface | Camera still works, PDC fault is logged |
| Speed over active threshold | Visual can remain, beep is suppressed |

## Standalone Mode

The standalone web simulator replaces the CAN provider with mock readings. This keeps the PDC state machine testable without hardware.

## Head Unit Mode

The Qt head unit uses SocketCAN and paints the PDC state on top of `ReverseCameraWindow`.
