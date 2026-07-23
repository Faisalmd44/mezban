const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * withNotifeeMavenRepo — forces Gradle to resolve app.notifee artifacts
 * exclusively from the local node_modules directory using Gradle's
 * exclusiveContent directive.
 *
 * Without this, Gradle searches Google Maven, Maven Central, JitPack,
 * etc. for app.notifee:core and fails because the AAR only ships inside
 * the npm package at @notifee/react-native/android/libs.
 *
 * See: https://github.com/invertase/notifee/issues/1284
 */
function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;

    const content = cfg.modResults.contents;
    if (content.includes('includeGroup "app.notifee"')) return cfg;

    const exclusiveContent = `
    exclusiveContent {
      filter {
        includeGroup "app.notifee"
      }
      forRepository {
        maven {
          url "$rootDir/../node_modules/@notifee/react-native/android/libs"
        }
      }
    }`;

    // Insert into existing allprojects.repositories block
    if (content.match(/allprojects\s*\{\s*repositories\s*\{/)) {
      cfg.modResults.contents = content.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        (match) => match + "\n" + exclusiveContent
      );
    } else if (content.includes("allprojects")) {
      cfg.modResults.contents = content.replace(
        /allprojects\s*\{/,
        (match) =>
          match +
          "\n  repositories {" +
          exclusiveContent +
          "\n    google()\n    mavenCentral()\n  }"
      );
    } else {
      cfg.modResults.contents =
        content +
        "\nallprojects {\n  repositories {" +
        exclusiveContent +
        "\n    google()\n    mavenCentral()\n  }\n}\n";
    }

    return cfg;
  });
}

module.exports = withNotifeeMavenRepo;
