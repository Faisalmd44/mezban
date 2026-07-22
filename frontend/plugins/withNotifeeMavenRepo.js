const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * withNotifeeMavenRepo — adds the local @notifee/react-native/android/libs
 * directory as a Maven repository to the root project's
 * allprojects.repositories block so that Gradle can resolve the
 * `app.notifee:core` AAR that ships inside the npm package.
 */
function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;

    const content = cfg.modResults.contents;
    if (content.includes("withNotifeeMavenRepo")) return cfg;

    const repoEntry =
      '    maven { url "${rootDir}/../node_modules/@notifee/react-native/android/libs" } // withNotifeeMavenRepo';

    // Add to the existing allprojects.repositories block
    const allprojectsMatch = content.match(
      /allprojects\s*\{\s*repositories\s*\{/
    );
    if (allprojectsMatch) {
      cfg.modResults.contents = content.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        (match) => match + "\n" + repoEntry
      );
    } else if (content.includes("allprojects")) {
      cfg.modResults.contents = content.replace(
        /allprojects\s*\{/,
        (match) => match + "\n  repositories {\n" + repoEntry + "\n  }"
      );
    } else {
      cfg.modResults.contents =
        content +
        "\nallprojects {\n  repositories {\n" +
        repoEntry +
        "\n    google()\n    mavenCentral()\n  }\n}\n";
    }

    return cfg;
  });
}

module.exports = withNotifeeMavenRepo;
