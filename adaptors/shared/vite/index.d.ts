import type { Plugin as Plugin_2 } from 'vite';
import type { StaticGenerateRenderOptions } from '@builder.io/qwik-city/static';
import type { UserConfig } from 'vite';

/**
 * @alpha
 */
export declare interface AdaptorSSGOptions extends Omit<StaticGenerateRenderOptions, 'outDir' | 'origin'> {
    /**
     * Defines routes that should be static generated. Accepts wildcard behavior.
     */
    include: string[];
    /**
     * Defines routes that should not be static generated. Accepts wildcard behavior. `exclude` always
     * take priority over  `include`.
     */
    exclude?: string[];
    /**
     * The URL `origin`, which is a combination of the scheme (protocol) and hostname (domain).
     * For example, `https://qwik.builder.io` has the protocol `https://` and domain `qwik.builder.io`.
     * However, the `origin` does not include a `pathname`.
     *
     * The `origin` is used to provide a full URL during Static Site Generation (SSG), and to
     * simulate a complete URL rather than just the `pathname`. For example, in order to
     * render a correct canonical tag URL or URLs within the `sitemap.xml`, the `origin` must
     * be provided too.
     *
     * If the site also starts with a pathname other than `/`, please use the `basePathname`
     * option in the Qwik City config options.
     */
    origin?: string;
}

declare interface BuildLayout {
    filePath: string;
    dirPath: string;
    id: string;
    layoutType: 'top' | 'nested';
    layoutName: string;
}

declare interface BuildRoute extends ParsedPathname {
    /**
     * Unique id built from its relative file system path
     */
    id: string;
    /**
     * Local file system path
     */
    filePath: string;
    ext: string;
    /**
     * URL Pathname
     */
    pathname: string;
    layouts: BuildLayout[];
}

/**
 * @alpha
 */
export declare function getParentDir(startDir: string, dirName: string): string;

/**
 * @alpha
 */
export declare const NOT_FOUND_PATHS_ID = "@qwik-city-not-found-paths";

declare interface ParsedPathname {
    pattern: RegExp;
    paramNames: string[];
    segments: PathnameSegment[];
}

declare type PathnameSegment = PathnameSegmentPart[];

declare interface PathnameSegmentPart {
    content: string;
    dynamic: boolean;
    rest: boolean;
}

/**
 * @alpha
 */
export declare const RESOLVED_NOT_FOUND_PATHS_ID: string;

/**
 * @alpha
 */
export declare const RESOLVED_STATIC_PATHS_ID: string;

/**
 * @alpha
 */
export declare interface ServerAdaptorOptions {
    /**
     * Options the adaptor should use when running Static Site Generation (SSG).
     * Defaults the `filter` to "auto" which will attempt to automatically decides if
     * a page can be statically generated and does not have dynamic data, or if it the page
     * should instead be rendered on the server (SSR). Setting to `null` will prevent any
     * pages from being statically generated.
     */
    ssg?: AdaptorSSGOptions | null;
    /**
     * @deprecated Please use `ssg` instead.
     */
    staticGenerate?: Omit<StaticGenerateRenderOptions, 'outDir'> | true;
}

/**
 * @alpha
 */
export declare const STATIC_PATHS_ID = "@qwik-city-static-paths";

/**
 * @alpha
 */
export declare function viteAdaptor(opts: ViteAdaptorPluginOptions): Plugin_2;

/**
 * @alpha
 */
declare interface ViteAdaptorPluginOptions {
    name: string;
    origin: string;
    staticPaths?: string[];
    /**
     * @deprecated Please use `ssg` instead.
     */
    staticGenerate?: true | Omit<StaticGenerateRenderOptions, 'outDir'> | undefined;
    ssg?: AdaptorSSGOptions | null;
    cleanStaticGenerated?: boolean;
    maxWorkers?: number;
    config?: (config: UserConfig) => UserConfig;
    generate?: (generateOpts: {
        outputEntries: string[];
        clientOutDir: string;
        serverOutDir: string;
        basePathname: string;
        routes: BuildRoute[];
        warn: (message: string) => void;
        error: (message: string) => void;
    }) => Promise<void>;
}

export { }
