import type tslib from "typescript/lib/tsserverlibrary";
import {LanguageServicePluginApi} from "./lib";

import plugins from "./plugins";

type LanguageServiceInitArgs = {
    typescript: typeof tslib;
};

type LanguageServicePluginData = Map<string, (...args: any[]) => any>;

function createLanguageServicePluginApiProxy(data: LanguageServicePluginData): LanguageServicePluginApi {
    return new Proxy(function () {} as any, {
        get(target, key: string) {
            return (fn: any) => {
                data.set(key, fn);
            };
        },
    });
}

function patchLanguageService(inst: any, patch: LanguageServicePluginData) {
    const keys = patch.keys();

    for (const key of keys) {
        inst[key] = patch.get(key);
    }
    return inst;
}

function cloneLanguageService(original: ts.LanguageService) {
    let result: ts.LanguageService = Object.create(null);
    for (let k of Object.keys(original) as Array<keyof ts.LanguageService>) {
        const x = original[k]!;
        // @ts-expect-error
        result[k] = (...args: Array<{}>) => x.apply(original, args);
    }

    return result;
}

function init({typescript: ts}: LanguageServiceInitArgs) {
    function create(info: ts.server.PluginCreateInfo) {
        info.project.projectService.logger.info("[COMP-PLUGINS]: Initializing language service plugins");

        let result = cloneLanguageService(info.languageService);
        for (const pluginFn of plugins.languageService) {
            const data: LanguageServicePluginData = new Map();
            const proxy = createLanguageServicePluginApiProxy(data);
            pluginFn(proxy, {...info, languageService: cloneLanguageService(result)}, ts);
            result = patchLanguageService(result, data);
        }

        info.project.projectService.logger.info("[COMP-PLUGINS]: Initialization of language service plugins complete");

        return result;
    }

    return {create};
}

export = init;
