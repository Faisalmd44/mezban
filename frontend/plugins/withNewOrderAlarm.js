const { withDangerousMod, withAndroidManifest } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * withNewOrderAlarm — copies the custom alarm ringtone into the Android
 * `res/raw` folder so Notifee can reference it as `sound: "new_order_alarm"`.
 *
 * It also ensures the `android.permission.FOREGROUND_SERVICE` and related
 * permissions are declared in the manifest for full-screen-intent support.
 */
function withNewOrderAlarm(config) {
  // Copy sound file into android/app/src/main/res/raw/
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const resDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "res",
        "raw"
      );
      if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir, { recursive: true });
      }
      const srcFile = path.join(
        projectRoot,
        "assets",
        "sounds",
        "new_order_alarm.wav"
      );
      const destFile = path.join(resDir, "new_order_alarm.wav");
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
        console.log("[withNewOrderAlarm] Copied alarm sound to res/raw/");
      } else {
        console.warn(
          "[withNewOrderAlarm] Source sound not found:",
          srcFile
        );
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withNewOrderAlarm;
