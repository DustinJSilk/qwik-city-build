// packages/qwik-city/adaptors/shared/vite/index.ts
import fs2 from "fs";
import { basename, dirname, join as join2, resolve } from "path";

// packages/qwik-city/adaptors/shared/vite/post-build.ts
import fs from "fs";
import { join } from "path";
import { getErrorHtml } from "@builder.io/qwik-city/middleware/request-handler";
async function postBuild(clientOutDir, basePathname, userStaticPaths, format, cleanStatic) {
  const ingorePathnames = /* @__PURE__ */ new Set([basePathname + "build/", basePathname + "assets/"]);
  const staticPaths = new Set(userStaticPaths);
  const notFounds = [];
  const loadItem = async (fsDir, fsName, pathname) => {
    if (ingorePathnames.has(pathname)) {
      return;
    }
    const fsPath = join(fsDir, fsName);
    if (fsName === "index.html" || fsName === "q-data.json") {
      if (!staticPaths.has(pathname) && cleanStatic) {
        await fs.promises.unlink(fsPath);
      }
      return;
    }
    if (fsName === "404.html") {
      const notFoundHtml = await fs.promises.readFile(fsPath, "utf-8");
      notFounds.push([pathname, notFoundHtml]);
      return;
    }
    const stat = await fs.promises.stat(fsPath);
    if (stat.isDirectory()) {
      await loadDir(fsPath, pathname + fsName + "/");
    } else if (stat.isFile()) {
      staticPaths.add(pathname + fsName);
    }
  };
  const loadDir = async (fsDir, pathname) => {
    const itemNames = await fs.promises.readdir(fsDir);
    await Promise.all(itemNames.map((i) => loadItem(fsDir, i, pathname)));
  };
  if (fs.existsSync(clientOutDir)) {
    await loadDir(clientOutDir, basePathname);
  }
  const notFoundPathsCode = createNotFoundPathsModule(basePathname, notFounds, format);
  const staticPathsCode = createStaticPathsModule(basePathname, staticPaths, format);
  return {
    notFoundPathsCode,
    staticPathsCode
  };
}
function createNotFoundPathsModule(basePathname, notFounds, format) {
  notFounds.sort((a, b) => {
    if (a[0].length > b[0].length)
      return -1;
    if (a[0].length < b[0].length)
      return 1;
    if (a[0] < b[0])
      return -1;
    if (a[0] > b[0])
      return 1;
    return 0;
  });
  if (!notFounds.some((r) => r[0] === basePathname)) {
    const html = getErrorHtml(404, "Resource Not Found");
    notFounds.push([basePathname, html]);
  }
  const c = [];
  c.push(`const notFounds = ${JSON.stringify(notFounds, null, 2)};`);
  c.push(`function getNotFound(p) {`);
  c.push(`  for (const r of notFounds) {`);
  c.push(`    if (p.startsWith(r[0])) {`);
  c.push(`      return r[1];`);
  c.push(`    }`);
  c.push(`  }`);
  c.push(`  return "Resource Not Found";`);
  c.push(`}`);
  if (format === "cjs") {
    c.push("exports.getNotFound = getNotFound;");
  } else {
    c.push("export { getNotFound };");
  }
  return c.join("\n");
}
function createStaticPathsModule(basePathname, staticPaths, format) {
  const assetsPath = basePathname + "assets/";
  const baseBuildPath = basePathname + "build/";
  const c = [];
  c.push(
    `const staticPaths = new Set(${JSON.stringify(
      Array.from(new Set(staticPaths)).sort()
    )});`
  );
  c.push(`function isStaticPath(method, url) {`);
  c.push(`  if (method.toUpperCase() !== 'GET') return false;`);
  c.push(`  const p = url.pathname;`);
  c.push(`  if (p.startsWith(${JSON.stringify(baseBuildPath)})) {`);
  c.push(`    return true;`);
  c.push(`  }`);
  c.push(`  if (p.startsWith(${JSON.stringify(assetsPath)})) {`);
  c.push(`    return true;`);
  c.push(`  }`);
  c.push(`  if (url.search !== "") {`);
  c.push(`    return false;`);
  c.push(`  }`);
  c.push(`  if (staticPaths.has(p)) {`);
  c.push(`    return true;`);
  c.push(`  }`);
  c.push(`  return false;`);
  c.push(`}`);
  if (format === "cjs") {
    c.push("exports.isStaticPath = isStaticPath;");
  } else {
    c.push("export { isStaticPath };");
  }
  return c.join("\n");
}

// packages/qwik-city/adaptors/shared/vite/index.ts
function viteAdaptor(opts) {
  let qwikCityPlugin = null;
  let qwikVitePlugin = null;
  let serverOutDir = null;
  let renderModulePath = null;
  let qwikCityPlanModulePath = null;
  let isSsrBuild = false;
  let format = "esm";
  const outputEntries = [];
  const plugin = {
    name: `vite-plugin-qwik-city-${opts.name}`,
    enforce: "post",
    apply: "build",
    config(config) {
      if (typeof opts.config === "function") {
        return opts.config(config);
      }
    },
    configResolved(config) {
      var _a, _b, _c, _d;
      isSsrBuild = !!config.build.ssr;
      if (isSsrBuild) {
        qwikCityPlugin = config.plugins.find(
          (p) => p.name === "vite-plugin-qwik-city"
        );
        if (!qwikCityPlugin) {
          throw new Error("Missing vite-plugin-qwik-city");
        }
        qwikVitePlugin = config.plugins.find(
          (p) => p.name === "vite-plugin-qwik"
        );
        if (!qwikVitePlugin) {
          throw new Error("Missing vite-plugin-qwik");
        }
        serverOutDir = config.build.outDir;
        if (((_a = config.build) == null ? void 0 : _a.ssr) !== true) {
          throw new Error(
            `"build.ssr" must be set to "true" in order to use the "${opts.name}" adaptor.`
          );
        }
        if (!((_c = (_b = config.build) == null ? void 0 : _b.rollupOptions) == null ? void 0 : _c.input)) {
          throw new Error(
            `"build.rollupOptions.input" must be set in order to use the "${opts.name}" adaptor.`
          );
        }
        if (((_d = config.ssr) == null ? void 0 : _d.format) === "cjs") {
          format = "cjs";
        }
      }
    },
    generateBundle(_, bundles) {
      if (isSsrBuild) {
        outputEntries.length = 0;
        for (const fileName in bundles) {
          const chunk = bundles[fileName];
          if (chunk.type === "chunk" && chunk.isEntry) {
            outputEntries.push(fileName);
            if (chunk.name === "entry.ssr") {
              renderModulePath = join2(serverOutDir, fileName);
            } else if (chunk.name === "@qwik-city-plan") {
              qwikCityPlanModulePath = join2(serverOutDir, fileName);
            }
          }
        }
        if (!renderModulePath) {
          throw new Error(
            'Unable to find "entry.ssr" entry point. Did you forget to add it to "build.rollupOptions.input"?'
          );
        }
        if (!qwikCityPlanModulePath) {
          throw new Error(
            'Unable to find "@qwik-city-plan" entry point. Did you forget to add it to "build.rollupOptions.input"?'
          );
        }
      }
    },
    closeBundle: {
      sequential: true,
      async handler() {
        var _a, _b;
        if (isSsrBuild && opts.ssg !== null && serverOutDir && (qwikCityPlugin == null ? void 0 : qwikCityPlugin.api) && (qwikVitePlugin == null ? void 0 : qwikVitePlugin.api)) {
          const staticPaths = opts.staticPaths || [];
          const routes = qwikCityPlugin.api.getRoutes();
          const basePathname = qwikCityPlugin.api.getBasePathname();
          const clientOutDir = qwikVitePlugin.api.getClientOutDir();
          const rootDir = qwikVitePlugin.api.getRootDir() ?? void 0;
          if (renderModulePath && qwikCityPlanModulePath && clientOutDir) {
            if (opts.staticGenerate) {
              this.warn(`Option "staticGenerate" is deprecated. Please use "ssg" option instead.`);
              opts.ssg = opts.ssg || {
                include: []
              };
              if (typeof opts.staticGenerate === "object") {
                opts.ssg = {
                  ...opts.staticGenerate,
                  ...opts.ssg
                };
              }
            }
            if (!Array.isArray((_a = opts.ssg) == null ? void 0 : _a.include) || ((_b = opts.ssg) == null ? void 0 : _b.include.length) === 0) {
              return;
            }
            let ssgOrigin = opts.origin;
            if (!ssgOrigin) {
              ssgOrigin = `https://yoursite.qwik.builder.io`;
            }
            if (ssgOrigin.length > 0 && !ssgOrigin.startsWith("https://") && !ssgOrigin.startsWith("http://")) {
              ssgOrigin = `https://${ssgOrigin}`;
            }
            try {
              ssgOrigin = new URL(ssgOrigin).origin;
            } catch (e) {
              this.warn(
                `Invalid "origin" option: "${ssgOrigin}". Using default origin: "https://yoursite.qwik.builder.io"`
              );
              ssgOrigin = `https://yoursite.qwik.builder.io`;
            }
            const staticGenerate = await import("../../../static/index.mjs");
            const generateOpts = {
              maxWorkers: opts.maxWorkers,
              basePathname,
              outDir: clientOutDir,
              rootDir,
              ...opts.ssg,
              origin: ssgOrigin,
              renderModulePath,
              qwikCityPlanModulePath
            };
            const staticGenerateResult = await staticGenerate.generate(generateOpts);
            if (staticGenerateResult.errors > 0) {
              const err = new Error(
                `Error while runnning SSG from "${opts.name}" adaptor. At least one path failed to render.`
              );
              err.stack = void 0;
              this.error(err);
            }
            staticPaths.push(...staticGenerateResult.staticPaths);
            const { staticPathsCode, notFoundPathsCode } = await postBuild(
              clientOutDir,
              basePathname,
              staticPaths,
              format,
              !!opts.cleanStaticGenerated
            );
            await Promise.all([
              fs2.promises.writeFile(join2(serverOutDir, RESOLVED_STATIC_PATHS_ID), staticPathsCode),
              fs2.promises.writeFile(
                join2(serverOutDir, RESOLVED_NOT_FOUND_PATHS_ID),
                notFoundPathsCode
              )
            ]);
            if (typeof opts.generate === "function") {
              await opts.generate({
                outputEntries,
                serverOutDir,
                clientOutDir,
                basePathname,
                routes,
                warn: (message) => this.warn(message),
                error: (message) => this.error(message)
              });
            }
          }
        }
      }
    }
  };
  return plugin;
}
var STATIC_PATHS_ID = "@qwik-city-static-paths";
var RESOLVED_STATIC_PATHS_ID = `${STATIC_PATHS_ID}.js`;
var NOT_FOUND_PATHS_ID = "@qwik-city-not-found-paths";
var RESOLVED_NOT_FOUND_PATHS_ID = `${NOT_FOUND_PATHS_ID}.js`;

// packages/qwik-city/adaptors/static/vite/index.ts
function staticAdaptor(opts) {
  return viteAdaptor({
    name: "static-generate",
    ssg: {
      include: ["/*"]
    },
    ...opts
  });
}
export {
  staticAdaptor
};
