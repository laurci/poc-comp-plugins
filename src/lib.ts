import {ts} from "@ts-morph/bootstrap";
export {ts};

import type tsserver from "typescript/lib/tsserverlibrary";
export type {tsserver};

type HandleResultType = "next" | "stop" | "replace";

export abstract class HandleResult {
    protected constructor(public type: HandleResultType) {}

    public static next() {
        return new NextHandleResult();
    }

    public static stop() {
        return new StopHandleResult();
    }

    public static replace(node: ts.Node) {
        return new ReplaceHandleResult(node);
    }
}

class NextHandleResult extends HandleResult {
    constructor() {
        super("next");
    }
}

class StopHandleResult extends HandleResult {
    constructor() {
        super("stop");
    }
}

export class ReplaceHandleResult extends HandleResult {
    constructor(public node: ts.Node) {
        super("replace");
    }
}

export type PluginHandleApi<T extends ts.Node> = {
    node: T;
    checker: ts.TypeChecker;
    program: ts.Program;
    languageService: ts.LanguageService;
    ctx: ts.TransformationContext;
    next(): NextHandleResult;
    stop(): StopHandleResult;
    replace(node: ts.Node): ReplaceHandleResult;
};

export function createPluginHandleApi<T extends ts.Node>(
    node: T,
    ctx: ts.TransformationContext,
    checker: ts.TypeChecker,
    program: ts.Program,
    languageService: ts.LanguageService
): PluginHandleApi<T> {
    return {
        node,
        checker,
        program,
        languageService,
        ctx,
        next() {
            return HandleResult.next();
        },
        stop() {
            return HandleResult.stop();
        },
        replace(node: ts.Node) {
            return HandleResult.replace(node);
        },
    };
}

export type PluginHandleCallback<T extends ts.Node> = (handle: PluginHandleApi<T>) => HandleResult | undefined | void;
export type Finder<T extends ts.Node> = (node: ts.Node) => node is T;

export type VoidCallback = () => void;
export type PluginSourceFileCallback = (handle: PluginHandleApi<ts.SourceFile>) => ts.SourceFile | undefined | void;
export type PluginGenerateSourceFileCallback = (filePath: string) => string | undefined | void;

export interface PluginApi {
    match<T extends ts.Node>(finder: Finder<T>, cb: PluginHandleCallback<T>): PluginApi;
    beforeAll(cb: VoidCallback): PluginApi;
    before(cb: PluginSourceFileCallback): PluginApi;
    after(cb: PluginSourceFileCallback): PluginApi;
    afterAll(cb: VoidCallback): PluginApi;
    createSourceFile(p: string, cb: PluginGenerateSourceFileCallback): string;
}

export type PluginFn = (plugin: PluginApi) => void;

export function createPlugin(fn: PluginFn) {
    return fn;
}

type LanguageServiceOriginalApi = tsserver.server.PluginCreateInfo["languageService"];
export type LanguageServicePluginApi = {
    [key in keyof LanguageServiceOriginalApi as LanguageServiceOriginalApi[key] extends (...args: any[]) => any ? key : never]: (
        cb: LanguageServiceOriginalApi[key] extends (...args: any[]) => any ? LanguageServiceOriginalApi[key] : never
    ) => void;
};

export type LanguageServicePluginFn = (
    plugin: LanguageServicePluginApi,
    info: tsserver.server.PluginCreateInfo,
    ts: typeof tsserver
) => void;

export function createLanguageServicePlugin(fn: LanguageServicePluginFn) {
    return fn;
}
