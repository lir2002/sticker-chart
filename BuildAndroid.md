# Android Build Workflow

This document provides guidance for developers on using the GitHub Actions workflow to build Android APKs/AABs for the Expo project. The workflow uses `npx expo prebuild` to generate a native Android project and automates the signing and building process.

## 1. Overview of the Workflow Using `expo prebuild`

The GitHub Actions workflow automates the process of generating a native Android project from the Expo project and building Android APKs/AABs. Below are the key steps performed by the workflow (defined in `.github/workflows/build.yml`):

1. **Checkout Code**:
   - Clones the repository using `actions/checkout@v4`.

2. **Set Up Node.js**:
   - Configures Node.js (version 20) with npm caching for faster dependency installation using `actions/setup-node@v4`.

3. **Install Dependencies**:
   - Runs `npm install` to install project dependencies.

4. **Install Expo CLI**:
   - Installs the Expo CLI globally using `npm install -g expo-cli`.

5. **Run `expo prebuild`**:
   - Executes `npx expo prebuild --platform android` to generate the native Android project directory (`android/`).
   - This step creates a standard Android project structure, including `android/app/build.gradle` and other necessary files.

6. **Set Up JDK**:
   - Configures Java 17 with Gradle caching using `actions/setup-java@v4` to support Android builds.

7. **Decode Keystore**:
   - Decodes a Base64-encoded Keystore file stored in GitHub Secrets and saves it as `android/app/keystore.jks`.

8. **Configure Signing**:
   - Dynamically appends signing configuration to `android/app/build.gradle` to enable signed release builds.
   - Uses environment variables from GitHub Secrets for Keystore passwords and alias.

9. **Build APKs/AAB**:
   - Optionally builds a debug APK (`assembleDebug`) for testing (configurable via workflow inputs or pull requests).
   - Builds a signed release APK (`assembleRelease`) and optionally an AAB (`bundleRelease`) for production.

10. **Upload Artifacts**:
    - Uploads the generated APKs and AABs as workflow artifacts using `actions/upload-artifact@v4`.

### Workflow Trigger
- **Automatic**: Runs on `push` or `pull_request` to the `main` branch.
- **Manual**: Can be triggered via `workflow_dispatch` with an optional `buildDebug` input (`true`/`false`) to control whether a debug APK is built.

### Notes
- The debug APK is built only for pull requests or when `buildDebug` is set to `true` in manual runs to save time in production workflows.
- Ensure `app.json` or `app.config.js` includes valid Android configurations (e.g., `android.package`, `versionCode`).

## 2. Generating a Signing Keystore

A Keystore is required to sign release APKs/AABs for production. Follow these steps to generate a Keystore:

1. **Generate Keystore**:
   - Use the `keytool` command (included with JDK) to create a Keystore file:
     ```bash
     keytool -genkeypair -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
     ```
   - Follow prompts to set:
     - Keystore password
     - Key alias (`my-key-alias`)
     - Key password
     - Other details (e.g., name, organization)
   - This generates `my-release-key.jks`.

2. **Secure the Keystore**:
   - Store the Keystore file securely (e.g., in a password-protected location).
   - Note down the Keystore password, key alias, and key password, as they will be needed for GitHub Secrets.

3. **Convert to Base64**:
   - Convert the Keystore file to Base64 for secure storage in GitHub Secrets:
     ```bash
     base64 my-release-key.jks
     ```
   - Copy the Base64 output for use in the next section.

### Notes
- Keep the Keystore file and passwords secure. Do not commit them to the repository.
- The Keystore is valid for 10,000 days (adjust `-validity` if needed).

## 3. Configuring the Keystore in GitHub Actions

The workflow uses GitHub Secrets to securely store Keystore information. Follow these steps to configure the secrets:

1. **Access Repository Settings**:
   - Go to your GitHub repository.
   - Navigate to `Settings > Secrets and variables > Actions > Secrets`.

2. **Add Secrets**:
   - Create the following repository secrets:
     - `KEYSTORE_FILE`:
       - **Value**: The Base64-encoded Keystore file (from `base64 my-release-key.jks`).
       - **Description**: Base64-encoded Keystore file for signing.
     - `KEYSTORE_PASSWORD`:
       - **Value**: The Keystore password set during generation.
       - **Description**: Password for the Keystore file.
     - `KEY_ALIAS`:
       - **Value**: The key alias (e.g., `my-key-alias`).
       - **Description**: Alias for the signing key.
     - `KEY_PASSWORD`:
       - **Value**: The key password set during generation.
       - **Description**: Password for the signing key.

3. **Verify Workflow**:
   - The workflow automatically decodes `KEYSTORE_FILE` into `android/app/keystore.jks` and uses the other secrets to configure signing in `build.gradle`.
   - No manual changes to `build.gradle` are needed, as the workflow appends the signing configuration dynamically.

### Notes
- Ensure the secret names match those used in the workflow (`KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).
- Only repository administrators should manage secrets to maintain security.

## 4. Retrieving the Built Installation Package

After the workflow completes, developers can download the generated APKs/AABs as follows:

1. **Access Workflow Run**:
   - Go to the repository’s `Actions` tab.
   - Select the workflow run (e.g., triggered by a push, pull request, or manual dispatch).

2. **Download Artifacts**:
   - Scroll to the bottom of the workflow run page.
   - Find the `Artifacts` section, which includes a file named `android-build-artifacts`.
   - Click to download the ZIP file containing:
     - Debug APK (`android/app/build/outputs/apk/debug/*.apk`, if built).
     - Release APK (`android/app/build/outputs/apk/release/*.apk`).
     - AAB (`android/app/build/outputs/bundle/release/*.aab`, if built).

3. **Extract and Use**:
   - Unzip the downloaded file to access the APKs/AABs.
   - **Debug APK**: Install on a device/emulator for testing (enable "Install from unknown sources" on Android).
   - **Release APK**: Distribute to users or testers (signed and ready for use).
   - **AAB**: Upload to Google Play Console for store distribution.

### Notes
- Artifacts are available for 90 days (default retention period). Download promptly or adjust retention in repository settings.
- If no artifacts appear, check the workflow logs for errors (e.g., Gradle failures, missing secrets).

## Additional Notes

- **Debug vs. Release Builds**:
  - Debug APKs are built only for pull requests or when `buildDebug` is `true` in manual runs. They are unoptimized but faster for testing.
  - Release APKs/AABs are signed and optimized for production.

- **Troubleshooting**:
  - **Workflow Fails**: Check logs for errors in `npx expo prebuild`, Gradle, or secret misconfiguration.
  - **No Artifacts**: Verify the `upload-artifact` step ran successfully.
  - **Signing Errors**: Ensure secrets match the Keystore’s passwords and alias.

- **Security**:
  - Never expose Keystore files or passwords in logs or public repositories.
  - Use Dependabot or similar tools to keep Actions (e.g., `actions/checkout@v4`) up to date.

For further assistance, contact the repository maintainers or refer to the [Expo Documentation](https://docs.expo.dev) and [GitHub Actions Documentation](https://docs.github.com/en/actions).

---
Last Updated: May 10, 2025