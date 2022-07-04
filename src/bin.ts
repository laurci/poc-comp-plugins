import path from "path";
import {createProject, ts} from "@ts-morph/bootstrap";
import macroPlugin from "./plugins/macro-plugin";
import {
    PluginApi,
    PluginHandleCallback,
    Finder,
    ReplaceHandleResult,
    createPluginHandleApi,
    PluginFn,
    PluginSourceFileCallback,
    PluginGenerateSourceFileCallback,
} from "./lib";
import callsitePlugin from "./plugins/callsite-plugin";
import {runOutput} from "./vm";
import linePlugin from "./plugins/line-plugin";

const SRC_DIR = path.join(__dirname, "../sample");
const SRC_DIST_DIR = path.join(SRC_DIR, "./dist");

const pluginFn: PluginFn[] = [macroPlugin, callsitePlugin, linePlugin];

class PluginApiImpl implements PluginApi {
    public matchHandles: [Finder<any>, PluginHandleCallback<any>][] = [];
    public beforeHandles: PluginSourceFileCallback[] = [];
    public afterHandles: PluginSourceFileCallback[] = [];
    public pendingSourceFiles: {
        filePath: string;
        finalizer: PluginGenerateSourceFileCallback;
    }[] = [];

    constructor(private program: ts.Program) {}

    before(cb: PluginSourceFileCallback): PluginApi {
        this.beforeHandles.push(cb);
        return this;
    }

    after(cb: PluginSourceFileCallback): PluginApi {
        this.afterHandles.push(cb);
        return this;
    }

    match<T extends ts.Node>(finder: Finder<T>, cb: PluginHandleCallback<T>): PluginApi {
        this.matchHandles.push([finder, cb]);
        return this;
    }

    createSourceFile(p: string, cb: PluginGenerateSourceFileCallback): string {
        const fullSourcePath = path.join(SRC_DIR, p);
        // const fullDistPath = path.join(SRC_DIST_DIR, p.replace(".ts", ".js"));

        this.pendingSourceFiles.push({
            filePath: fullSourcePath,
            finalizer: cb,
        });

        return fullSourcePath.replace(".ts", "");
    }
}

async function main() {
    const project = await createProject({
        tsConfigFilePath: path.join(SRC_DIR, "tsconfig.json"),
    });

    const program = project.createProgram();

    const plugins = pluginFn.map((x) => {
        const api = new PluginApiImpl(program);
        x(api);

        return api;
    });

    const output: Record<string, string> = {}; // TODO: better in-memory emit store :)
    const writer = (file: string, text: string) => {
        if (file.endsWith(".js")) {
            output[file] = text;
        } else {
            console.log("writer skipped", file);
        }
    };

    program.emit(undefined, writer, undefined, false, {
        before: plugins.map((plugin) => (ctx) => {
            const checker = program.getTypeChecker();
            const languageService = project.getLanguageService();

            return (root) => {
                root = plugin.beforeHandles.reduce(
                    (root, cb) => cb(createPluginHandleApi(root, ctx, checker, program, languageService)) ?? root,
                    root
                );

                const next = <T extends ts.Node>(node: T): T => ts.visitEachChild(node, visitor, ctx);
                const visitor = (node: ts.Node): ts.Node => {
                    let hasNext: boolean = false;
                    let hasStop: boolean = false;

                    for (const [finder, cb] of plugin.matchHandles) {
                        if (finder(node)) {
                            const result = cb(createPluginHandleApi(node, ctx, checker, program, languageService));

                            if (!result) {
                                hasNext = true;
                                continue;
                            }

                            if (result.type == "next") {
                                hasNext = true;
                            } else if (result.type == "stop") {
                                hasStop = true;
                            } else if (result.type == "replace") {
                                return (result as ReplaceHandleResult).node;
                            }
                        }
                    }

                    if (hasStop && !hasNext) return node;

                    return next(node);
                };

                let result = next(root);

                result = plugin.afterHandles.reduce(
                    (result, cb) => cb(createPluginHandleApi(result, ctx, checker, program, languageService)) ?? result,
                    result
                );

                return result;
            };
        }),
    });

    const pendingSourceFiles: ts.SourceFile[] = [];

    for (let plugin of plugins) {
        for (let pendingSource of plugin.pendingSourceFiles) {
            const finalStr = pendingSource.finalizer(pendingSource.filePath);

            if (finalStr) {
                const final = project.createSourceFile(pendingSource.filePath, finalStr, {
                    scriptKind: ts.ScriptKind.TS,
                });
                pendingSourceFiles.push(final);
            }
        }
    }

    const newProgram = project.createProgram();

    for (let file of pendingSourceFiles) {
        newProgram.emit(file, writer, undefined, false);
    }

    runOutput(SRC_DIST_DIR, output);
}

console.time("all");
main().then(() => console.timeEnd("all"));
