const { withAppBuildGradle, withProjectBuildGradle } = require("expo/config-plugins");

const objectPathLimit = "-DCMAKE_OBJECT_PATH_MAX=253";
const stagingDirectory = 'buildStagingDirectory rootProject.file("../.cxx")';

module.exports = function withAndroidObjectPath(config) {
  const appConfig = withAppBuildGradle(config, (gradle) => {
    const { contents } = gradle.modResults;
    const defaultConfig = /^    defaultConfig \{[ \t]*$/m;
    if (gradle.modResults.language !== "groovy" || !defaultConfig.test(contents)) {
      throw new Error("No se encontró defaultConfig en android/app/build.gradle.");
    }

    // Shorten CMake object paths to fit the Windows limit used by Ninja 1.10.
    const withLimit = contents.includes(objectPathLimit) ? contents : contents.replace(
      defaultConfig,
      `    defaultConfig {
        if (System.getProperty("os.name").startsWith("Windows")) {
            externalNativeBuild {
                cmake {
                    arguments "${objectPathLimit}"
                }
            }
        }`,
    );
    gradle.modResults.contents = withLimit.includes(stagingDirectory) ? withLimit : withLimit.replace(
      defaultConfig,
      `    if (System.getProperty("os.name").startsWith("Windows")) {
        externalNativeBuild {
            cmake {
                ${stagingDirectory}
            }
        }
    }
    defaultConfig {`,
    );
    return gradle;
  });

  return withProjectBuildGradle(appConfig, (gradle) => {
    if (gradle.modResults.contents.includes(objectPathLimit)) return gradle;

    gradle.modResults.contents += `

if (System.getProperty("os.name").startsWith("Windows")) {
    def reanimatedProject = findProject(":react-native-reanimated")
    reanimatedProject?.plugins?.withId("com.android.library") {
        reanimatedProject.androidComponents.finalizeDsl { androidConfig ->
            androidConfig.defaultConfig.externalNativeBuild.cmake.arguments.add("${objectPathLimit}")
        }
    }
}
`;
    return gradle;
  });
};
