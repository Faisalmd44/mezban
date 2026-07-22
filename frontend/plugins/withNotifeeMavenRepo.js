const { withSettingsGradle } = require("@expo/config-plugins");

/**
 * withNotifeeMavenRepo — adds the local @notifee/react-native/android/libs
 * directory as a Maven repository in settings.gradle's
 * dependencyResolutionManagement block so that Gradle can resolve the
 * `app.notifee:core` AAR that ships inside the npm package.
 *
 * Modern Gradle (8+) used by Expo SDK 54 uses
 * dependencyResolutionManagement in settings.gradle and ignores
 * allprojects.repositories in build.gradle, so the repo MUST be
 * declared here.
 */
function withNotifeeMavenRepo(config) {
  return withSettingsGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;

    const content = cfg.modResults.contents;
    if (content.includes("withNotifeeMavenRepo")) return cfg;

    const repoEntry =
      '        maven { url "${rootDir}/../node_modules/@notifee/react-native/android/libs" } // withNotifeeMavenRepo';

    // Insert into the dependencyResolutionManagement repositories block.
    // If the block exists, add our repo inside its repositories block.
    const drmMatch = content.match(
      /dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{/
    );
    if (drmMatch) {
      cfg.modResults.contents = content.replace(
        /dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{/,
        (match) => match + "\n" + repoEntry
      );
    } else {
      // If no dependencyResolutionManagement block, add a complete one
      // before the rootProject.name line, or append at end.
      const block = [
        "",
        "dependencyResolutionManagement {",
        "  repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)",
        "  repositories {",
        repoEntry,
        "    google()",
        "    mavenCentral()",
        "  }",
        "}",
        "",
      ].join("\n");

      if (content.includes("rootProject.name")) {
        cfg.modResults.contents = content.replace(
          "rootProject.name",
          block + "rootProject.name"
        );
      } else {
        cfg.modResults.contents = content + "\n" + block;
      }
    }

    return cfg;
  });
}

module.exports = withNotifeeMavenRepo;
