const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * withNotifeeMavenRepo — adds the local @notifee/react-native/android/libs
 * directory as a Maven repository in the project-level build.gradle so that
 * Gradle can resolve the `app.notifee:core` AAR that ships inside the npm
 * package.  Without this, the dependency resolution fails with
 * "Could not find any matches for app.notifee:core:+" because the Notifee
 * Maven server (mvn.notifee.app) was shut down when the project was archived.
 */
function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;

    const block = [
      "",
      "    // --- withNotifeeMavenRepo ---",
      "    allprojects {",
      "      repositories {",
      "        maven {",
      '          url "${rootDir}/../node_modules/@notifee/react-native/android/libs"',
      "        }",
      "      }",
      "    }",
      "    // --- end withNotifeeMavenRepo ---",
      "",
    ].join("\n");

    const content = cfg.modResults.contents;
    if (content.includes("withNotifeeMavenRepo")) return cfg;

    cfg.modResults.contents = content + block;
    return cfg;
  });
}

module.exports = withNotifeeMavenRepo;
