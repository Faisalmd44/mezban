const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * withNotifeeMavenRepo — forces Gradle to resolve app.notifee artifacts
 * exclusively from the local node_modules directory using Gradle's
 * exclusiveContent directive.
 *
 * Uses subprojects {} in addition to allprojects {} because Expo SDK 53+
 * with Gradle 8+ does not propagate allprojects.repositories to
 * subprojects. The exclusiveContent directive is added to both blocks
 * to ensure all modules can resolve app.notifee:core.
 *
 * See: https://github.com/invertase/notifee/issues/1284
 *      https://github.com/expo/expo/issues/36229
 */
function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;

    const content = cfg.modResults.contents;
    if (content.includes('includeGroup "app.notifee"')) return cfg;

    const exclusiveContent = `    exclusiveContent {
      filter {
        includeGroup "app.notifee"
      }
      forRepository {
        maven {
          url "$rootDir/../node_modules/@notifee/react-native/android/libs"
        }
      }
    }`;

    // Add to existing allprojects.repositories block
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
          "\n  repositories {\n" +
          exclusiveContent +
          "\n    google()\n    mavenCentral()\n  }"
      );
    } else {
      cfg.modResults.contents =
        content +
        "\nallprojects {\n  repositories {\n" +
        exclusiveContent +
        "\n    google()\n    mavenCentral()\n  }\n}\n";
    }

    // Also add to subprojects to ensure all modules can resolve app.notifee
    const subprojectsBlock = `
subprojects {
  repositories {
    exclusiveContent {
      filter {
        includeGroup "app.notifee"
      }
      forRepository {
        maven {
          url "\$rootDir/../node_modules/@notifee/react-native/android/libs"
        }
      }
    }
  }
}
`;

    if (!content.includes("subprojects")) {
      cfg.modResults.contents =
        cfg.modResults.contents + "\n" + subprojectsBlock;
    }

    return cfg;
  });
}

module.exports = withNotifeeMavenRepo;
