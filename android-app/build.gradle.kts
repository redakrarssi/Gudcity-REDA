plugins {
    // Versions are specified in module-level build files
}

tasks.register<Delete>("clean") {
    delete(rootProject.buildDir)
}


