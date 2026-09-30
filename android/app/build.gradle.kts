import org.gradle.api.file.FileSystemOperations
import javax.inject.Inject

plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "dev.pixscape.game"
    compileSdk = 37

    defaultConfig {
        applicationId = "dev.pixscape.game"
        minSdk = 26
        targetSdk = 35
        versionCode = 5
        versionName = "1.4.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            // Same key as the other sideloaded apps (~/.android/debug.keystore).
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// The game itself lives at the repo root (index.html, style.css, src/, fonts/) and is played in a
// browser as-is. The app bundles a copy of those files as assets/game/ at build time, so there is
// only ever one copy of the game to edit.
abstract class BundleGameTask : DefaultTask() {
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val gameFiles: ConfigurableFileCollection

    @get:Internal
    abstract val gameRoot: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Inject
    abstract val fs: FileSystemOperations

    @TaskAction
    fun bundle() {
        fs.sync {
            from(gameRoot) {
                include(GAME_FILES)
                into("game")
            }
            into(outputDir)
        }
    }

    companion object {
        val GAME_FILES = listOf("index.html", "style.css", "src/**", "fonts/**")
    }
}

val bundleGame = tasks.register<BundleGameTask>("bundleGame") {
    val game = rootProject.layout.projectDirectory.dir("..")
    gameRoot.set(game)
    gameFiles.from(game.file("index.html"), game.file("style.css"), game.dir("src"), game.dir("fonts"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(bundleGame, BundleGameTask::outputDir)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.webkit)
}
