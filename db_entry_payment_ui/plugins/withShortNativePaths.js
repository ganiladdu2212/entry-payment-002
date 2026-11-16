const { withAppBuildGradle } = require('expo/config-plugins');

// Hash long C++ object paths below Windows' legacy 260-character limit.
// A very small value (e.g. 128) cannot fit generated target directories,
// causing CMake to fall back to the original, overlong object path.
module.exports = function withShortNativePaths(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes('CMAKE_OBJECT_PATH_MAX')) {
      mod.modResults.contents = mod.modResults.contents.replace(
        'defaultConfig {',
        'defaultConfig {\n        externalNativeBuild {\n            cmake {\n                arguments "-DCMAKE_OBJECT_PATH_MAX=250"\n            }\n        }'
      );
    }
    return mod;
  });
};
