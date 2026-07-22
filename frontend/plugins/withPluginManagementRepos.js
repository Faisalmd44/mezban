const { withSettingsGradle } = require("@expo/config-plugins");

/**
 * withPluginManagementRepos — ensures the pluginManagement block in
 * settings.gradle includes gradlePluginPortal(), google(), and
 * mavenCentral() repositories. Without these, the
 * `io.invertase.gradle.build` plugin used by @react-native-firebase
 * and @notifee/react-native cannot be resolved, causing the Gradle
 * build to fail.
 */
function withPluginManagementRepos(config) {
  return withSettingsGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;

    const content = cfg.modResults.contents;
    if (content.includes("gradlePluginPortal()")) return cfg;

    const reposBlock = [
      "  repositories {",
      "    gradlePluginPortal()",
      "    google()",
      "    mavenCentral()",
      "  }",
    ].join("\n");

    cfg.modResults.contents = content.replace(
      "pluginManagement {",
      "pluginManagement {\n" + reposBlock
    );
    return cfg;
  });
}

module.exports = withPluginManagementRepos;
