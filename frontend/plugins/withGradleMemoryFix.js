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

    const additions = [];
    if (!props.includes("org.gradle.jvmargs")) {
      additions.push("org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m");
    }
    if (!props.includes("org.gradle.workers.max")) {
      additions.push("org.gradle.workers.max=3");
    }
    if (!props.includes("org.gradle.caching=true")) {
      additions.push("org.gradle.caching=true");
    }
    if (!props.includes("android.useAndroidX=true")) {
      additions.push("android.useAndroidX=true");
    }

    if (additions.length > 0) {
      const newProps = props + (props.endsWith("\n") ? "" : "\n") + additions.join("\n") + "\n";
      fs.writeFileSync(propsPath, newProps);
      console.log("[withGradleMemoryFix] Updated gradle.properties");
    }

    return cfg;
  });
}

module.exports = withGradleMemoryFix;
