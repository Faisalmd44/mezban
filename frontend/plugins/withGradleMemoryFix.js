const { withProjectBuildGradle } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * withGradleMemoryFix — increases Gradle JVM heap size, enables build cache,
 * disables lint abort-on-error, and wraps gradlew to capture error output
 * with --stacktrace for CI debugging.
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

    // Wrap gradlew to add --stacktrace and capture output for debugging.
    // Use pipefail so the exit code reflects gradle's actual result,
    // not tee's (which is always 0). Without this, a failed gradle build
    // reports success in CI, causing the artifact upload step to fail
    // because the APK was never produced.
    const gradlewPath = path.join(androidDir, "gradlew");
    const realGradlewPath = path.join(androidDir, "gradlew-real");

    if (fs.existsSync(gradlewPath) && !fs.existsSync(realGradlewPath)) {
      fs.renameSync(gradlewPath, realGradlewPath);

      const wrapper = '#!/bin/sh\n' +
        '# gradlew wrapper - adds --stacktrace and captures output\n' +
        'set -o pipefail\n' +
        'DIR="$(cd "$(dirname "$0")" && pwd)"\n' +
        'LOG_FILE="$DIR/gradle-build-output.log"\n' +
        'sh "$DIR/gradlew-real" "$@" --stacktrace 2>&1 | tee "$LOG_FILE"\n' +
        'EXIT_CODE=$?\n' +
        'if [ $EXIT_CODE -ne 0 ]; then\n' +
        '  echo ""\n' +
        '  echo "=== GRADLE BUILD FAILED (exit code: $EXIT_CODE) ==="\n' +
        '  echo "=== Full output saved to: gradle-build-output.log ==="\n' +
        '  tail -100 "$LOG_FILE"\n' +
        'fi\n' +
        'exit $EXIT_CODE\n';

      fs.writeFileSync(gradlewPath, wrapper);
      fs.chmodSync(gradlewPath, 0o755);
      console.log("[withGradleMemoryFix] Created gradlew wrapper with --stacktrace and pipefail");
    }

    return cfg;
  });
}

module.exports = withGradleMemoryFix;
