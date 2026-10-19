const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Ensure Metro can bundle ES module (.mjs) and CommonJS (.cjs) files
config.resolver.sourceExts.push("mjs", "cjs");

// Force React and Tailwind v3 singletons to resolve locally within the app
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
  tailwindcss: path.resolve(projectRoot, "node_modules/tailwindcss"),
  nativewind: path.resolve(projectRoot, "node_modules/nativewind"),
};

// Custom resolver hook to handle internal subpaths for all @clerk packages
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@clerk/")) {
    const parts = moduleName.split("/");
    // Intercept subpath requests like @clerk/react/internal or @clerk/shared/getToken
    if (parts.length > 2) {
      const pkgName = `${parts[0]}/${parts[1]}`;
      const subpath = parts.slice(2).join("/");

      try {
        const pkgDir = path.dirname(
          require.resolve(`${pkgName}/package.json`, {
            paths: [context.originModulePath, projectRoot, workspaceRoot],
          })
        );

        const candidates = [
          path.join(pkgDir, "dist", `${subpath}.mjs`),
          path.join(pkgDir, "dist", `${subpath}.cjs`),
          path.join(pkgDir, "dist", `${subpath}.js`),
          path.join(pkgDir, "dist", subpath, "index.mjs"),
          path.join(pkgDir, "dist", subpath, "index.cjs"),
          path.join(pkgDir, "dist", subpath, "index.js"),
          path.join(pkgDir, "dist", "runtime", `${subpath}.mjs`),
          path.join(pkgDir, "dist", "runtime", `${subpath}.cjs`),
          path.join(pkgDir, "dist", "runtime", `${subpath}.js`),
          path.join(pkgDir, `${subpath}.js`),
        ];

        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            return {
              type: "sourceFile",
              filePath: candidate,
            };
          }
        }
      } catch (e) {
        // Fall back to default resolution if package lookup fails
      }
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { 
  input: "./global.css" 
});