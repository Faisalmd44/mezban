const { withProjectBuildGradle } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * withGradleMemoryFix — increases Gradle JVM heap size and enables
 * build cache in android/gradle.properties to prevent OOM errors
 * during the APK build on CI.
 */
function withGradleMemoryFix(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const propsPath = path.join(projectRoot, "android", "gradle.properties");

    let props = "";
    if (fs.existsSync(propsPath)) {
      props = fs.readFileSync(propsPath, "utf8");
    }

    // Override JVM args to 4GB heap (default is 2GB which can OOM on CI)
    props = props.replace(
      /org\.gradle\.jvmargs=.*/,
      "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m"
    );
    if (!props.includes("org.gradle.jvmargs")) {
      props += "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m\n";
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

    fs.writeFileSync(propsPath, props);
    console.log("[withGradleMemoryFix] Updated gradle.properties");

    return cfg;
  });
}

module.exports = withGradleMemoryFix;
