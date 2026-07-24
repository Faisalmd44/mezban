const { withProjectBuildGradle } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * withGradleMemoryFix — increases Gradle JVM heap size, enables build cache,
 * disables lint abort-on-error, and wraps gradlew to:
 * 1. Capture error output with --stacktrace for CI debugging
 * 2. Preserve the real gradle exit code via pipefail
 * 3. After a successful build, locate any generated .apk and copy it to
 *    the path that the GitHub Actions workflow expects
 *    (app/build/outputs/apk/debug/app-debug.apk)
 */
function withGradleMemoryFix(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const androidDir = path.join(projectRoot, "android");
    const propsPath = path.join(androidDir, "gradle.properties");

    // Update gradle.properties
    let props = "";
    if (fs.existsSync(propsPath)) {
      props = fs.readFileSync(propsPath, "utf8");
    }

    props = props.replace(
      /org\.gradle\.jvmargs=.*/,
      "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError"
    );
    if (!props.includes("org.gradle.jvmargs")) {
      props += "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError\n";
    }
    if (!props.includes("org.gradle.workers.max")) {
      props += "org.gradle.workers.max=3\n";
    }
    if (!props.includes("org.gradle.caching=true")) {
      props += "org.gradle.caching=true\n";
    }
    if (!props.includes("android.useAndroidX=true")) {
      props += "android.useAndroidX=true\n";
    }
    if (!props.includes("android.abortOnError=")) {
      props += "android.abortOnError=false\n";
    }
    if (!props.includes("android.checkReleaseBuilds=")) {
      props += "android.checkReleaseBuilds=false\n";
    }

    fs.writeFileSync(propsPath, props);
    console.log("[withGradleMemoryFix] Updated gradle.properties");

    const gradlewPath = path.join(androidDir, "gradlew");
    const realGradlewPath = path.join(androidDir, "gradlew-real");

    if (fs.existsSync(gradlewPath) && !fs.existsSync(realGradlewPath)) {
      fs.renameSync(gradlewPath, realGradlewPath);

      const wrapper = '#!/bin/sh\n' +
        '# gradlew wrapper - adds --stacktrace, captures output, preserves exit code\n' +
        'set -o pipefail\n' +
        'DIR="$(cd "$(dirname "$0")" && pwd)"\n' +
        'LOG_FILE="$DIR/gradle-build-output.log"\n' +
        'sh "$DIR/gradlew-real" "$@" --stacktrace 2>&1 | tee "$LOG_FILE"\n' +
        'EXIT_CODE=$?\n' +
        '# On success, ensure the APK is at the path CI expects\n' +
        'if [ $EXIT_CODE -eq 0 ]; then\n' +
        '  EXPECTED="$DIR/app/build/outputs/apk/debug/app-debug.apk"\n' +
        '  if [ ! -f "$EXPECTED" ]; then\n' +
        '    APK_FOUND=$(find "$DIR/app/build/outputs" -name "*.apk" -type f 2>/dev/null | head -1)\n' +
        '    if [ -n "$APK_FOUND" ]; then\n' +
        '      mkdir -p "$DIR/app/build/outputs/apk/debug"\n' +
        '      cp "$APK_FOUND" "$EXPECTED"\n' +
        '      echo "[gradlew-wrapper] Copied APK from $APK_FOUND to $EXPECTED"\n' +
        '    else\n' +
        '      echo "[gradlew-wrapper] WARNING: No .apk file found in build outputs"\n' +
        '      echo "[gradlew-wrapper] Build outputs tree:"\n' +
        '      find "$DIR/app/build/outputs" -type f 2>/dev/null || echo "  (no outputs directory)"\n' +
        '    fi\n' +
        '  fi\n' +
'fi\n' +
        'if [ $EXIT_CODE -ne 0 ]; then\n' +
        '  echo ""\n' +
        '  echo "=== GRADLE BUILD FAILED (exit code: $EXIT_CODE) ==="\n' +
        '  echo "=== Full output saved to: gradle-build-output.log ==="\n' +
        '  tail -100 "$LOG_FILE"\n' +
        'fi\n' +
        'exit $EXIT_CODE\n';

      fs.writeFileSync(gradlewPath, wrapper);
      fs.chmodSync(gradlewPath, 0o755);
      console.log("[withGradleMemoryFix] Created gradlew wrapper with pipefail + APK copy");
    }

    return cfg;
  });
}

module.exports = withGradleMemoryFix;
