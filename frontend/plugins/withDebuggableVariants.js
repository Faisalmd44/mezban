const { withAppBuildGradle } = require("@expo/config-plugins");

function withDebuggableVariants(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    if (!gradle.includes("debuggableVariants = []")) {
      cfg.modResults.contents = gradle.replace(
        /\/\/ debuggableVariants = \[.*?\]/,
        "debuggableVariants = []"
      );
    }
    return cfg;
  });
}

module.exports = withDebuggableVariants;
