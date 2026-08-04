# Traffic Sign Recognition

A fully offline, on-device traffic sign recognition app built with [Expo](https://expo.dev) and React Native. It uses a YOLO-based TFLite model running through camera frame processors to detect and classify traffic signs in real time, announces them by voice, and keeps a log of what was seen during a drive.

No network calls, no cloud services, no analytics — everything runs and stays on the device.

## Features

- **Real-time detection** — the Scanner tab runs a TFLite model (`assets/models/best.tflite`) over the live camera feed via `react-native-vision-camera` frame processors, with bounding boxes drawn over the preview and bilingual (EN/FR) voice announcements via `expo-speech`.
- **Signs reference guide** — browse all supported sign categories with meanings and audio playback.
- **Trip Log** — a running log of every sign detected during the current session.
- **Two roles**, gated behind a simple login screen:
  - **Student Driver** — the primary user; uses the Scanner, Signs, and Trip Log tabs.
  - **Driving Instructor** — supervises lessons from a separate, PIN-protected area (default PIN `1234`, changeable in-app). Reviews and exports trip logs (PDF/CSV/TXT), edits sign metadata, and manages local app data. Never touches the Scanner.
- A Student Driver can switch into Instructor Mode directly from the Trip Log tab (PIN prompt), or log out from the Signs tab.

## Tech stack

- [Expo SDK 54](https://docs.expo.dev/) with [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing)
- [react-native-vision-camera](https://react-native-vision-camera.com/) + [vision-camera-resize-plugin](https://github.com/mrousavy/vision-camera-resize-plugin) for camera frame processing
- [react-native-fast-tflite](https://github.com/mrousavy/react-native-fast-tflite) for on-device inference (NNAPI-accelerated where available, CPU fallback)
- [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) style overlay rendering for detection boxes
- `expo-speech` for voice announcements
- `@react-native-async-storage/async-storage` for local persistence (role, PIN hash, trip log, sign overrides)
- `expo-crypto`, `expo-file-system`, `expo-sharing`, `expo-print` for hashed PIN storage and trip log export

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the dev server

   ```bash
   npx expo start
   ```

Since this app depends on native modules (camera, TFLite, worklets) it **cannot run in Expo Go** — use a development build, or build directly onto a device:

```bash
# Debug build, installed on a connected device/emulator (uses Metro)
npx expo run:android

# Standalone release build, installed on a connected device (no Metro needed)
npx expo run:android --variant release
```

The built APK lands at `android/app/build/outputs/apk/{debug,release}/app-{debug,release}.apk` and can be installed elsewhere with:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Project structure

```
app/
  login.tsx              Role selection + instructor PIN entry
  (tabs)/                 Student Driver area
    index.tsx             Scanner — camera + live detection
    explore.tsx            Signs — reference guide
    history.tsx             Trip Log
  (instructor)/            Instructor Mode (PIN-gated)
    index.tsx              Trip Review (export/clear)
    signs/                  Sign Editor (per-class metadata overrides)
    settings.tsx            Change PIN, reset data, log out
    about.tsx               App/role info
components/
  DetectionOverlay.tsx     Draws bounding boxes over the camera preview
  InstructorPinModal.tsx  Shared PIN-entry modal
hooks/
  useFrameInference.ts    Frame processor: inference + coordinate transform
  useModelSetup.ts         Loads model metadata/shape
  useSpeechAnnouncement.ts Debounced TTS announcements
lib/
  auth.ts                  Role + PIN storage (SHA-256 hashed)
  signMetadata.ts           Bundled sign data + instructor overrides
  tripLog.ts                Persisted trip log storage
  tripLogExport.ts          PDF/CSV/TXT export
assets/
  models/best.tflite       Detection model
  signs.json                Bundled sign metadata (11 classes)
  signs/                     Reference sign images
```

## Supported signs

Speed Limit 30, Speed Limit 50, Priority Road, Give Way, Stop, No Entry, Road Work, Traffic Lights Ahead, Pedestrian Crossing, Roundabout, No Parking.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [React Native VisionCamera docs](https://react-native-vision-camera.com/)
- [react-native-fast-tflite](https://github.com/mrousavy/react-native-fast-tflite)