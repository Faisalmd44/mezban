# Android CI Workflow Update (Manual Step Required)

The GitHub API token used by the bot lacks the `workflow` scope, so
`.github/workflows/Android.yml` cannot be updated via a PR. The updated
workflow file content is provided below. Copy it manually into
`.github/workflows/Android.yml` on the `main` branch.

## What Changed

1. **`--stacktrace`** added directly to the `./gradlew assembleDebug` invocation
   so errors are visible even if the gradlew wrapper interferes.
2. **`List build outputs`** step added with `if: always()` — runs even on
   failure, prints every `.apk` file found under `build/outputs/`, and shows
   the full output tree so we can see the exact path the APK was generated at.
3. **Glob pattern** `*.apk` instead of a single hardcoded filename — matches
   any APK in the debug output directory.
4. **`if-no-files-found: error`** — makes the upload step fail clearly when no
   APK exists, instead of silently uploading an empty artifact.

## Updated Android.yml

```yaml
name: Android APK Build

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    env:
      EXPO_PUBLIC_BACKEND_URL: ${{ secrets.EXPO_PUBLIC_BACKEND_URL }}

    defaults:
      run:
        working-directory: frontend

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install dependencies
        run: npm install

      - name: Verify Backend URL
        run: |
          if [ -z "$EXPO_PUBLIC_BACKEND_URL" ]; then
            echo "ERROR: EXPO_PUBLIC_BACKEND_URL secret is missing"
            exit 1
          fi
          echo "Backend URL detected"

      - name: Generate Android project
        run: npx expo prebuild --platform android --non-interactive

      - name: Make Gradle executable
        run: chmod +x android/gradlew

      - name: Build Debug APK
        run: |
          cd android
          ./gradlew assembleDebug --stacktrace

      - name: List build outputs
        if: always()
        run: |
          echo "=== Searching for APK files ==="
          find android/app/build/outputs -name "*.apk" -type f 2>/dev/null || echo "No APK found in outputs directory"
          echo "=== Full build outputs tree ==="
          find android/app/build/outputs -type f 2>/dev/null || echo "No build outputs directory exists"
          echo "=== Checking if standard path exists ==="
          ls -la android/app/build/outputs/apk/debug/ 2>/dev/null || echo "Standard debug APK directory does not exist"

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug-apk
          path: frontend/android/app/build/outputs/apk/debug/*.apk
          if-no-files-found: error
```
