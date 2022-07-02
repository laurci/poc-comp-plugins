import path from "path";
import {createProject, ts} from "@ts-morph/bootstrap";
import macroPlugin from "./plugins/macro-plugin";
import {PluginApi, PluginHandleCallback, Finder, ReplaceHandleResult, createPluginHandleApi, PluginFn} from "./lib";
import callsitePlugin from "./plugins/callsite-plugin";
import {runOutput} from "./vm";
import linePlugin from "./plugins/line-plugin";

const SRC_DIR = path.join(__dirname, "../sample");
const SRC_DIST_DIR = path.join(SRC_DIR, "./dist");

const pluginFn: PluginFn[] = [macroPlugin, callsitePlugin, linePlugin];

class PluginApiImpl implements PluginApi {
    public matchHandles: [Finder<any>, PluginHandleCallback<any>][] = [];

    match<T extends ts.Node>(finder: Finder<T>, cb: PluginHandleCallback<T>): PluginApi {
        this.matchHandles.push([finder, cb]);
        return this;
    }
}

async function main() {
    const plugins = pluginFn.map((x) => {
        const api = new PluginApiImpl();
        x(api);

        return api;
    });

    const project = await createProject({
        tsConfigFilePath: path.join(SRC_DIR, "tsconfig.json"),
    });

    const program = project.createProgram();

    const output: Record<string, string> = {}; // TODO: better in-memory emit store :)

    program.emit(
        undefined,
        (file, text) => {
            if (file.endsWith(".js")) {
                output[file] = text;
            } else {
                console.log("writer skipped", file);
            }
        },
        undefined,
        false,
        {
            before: plugins.map((plugin) => (ctx) => {
                const checker = program.getTypeChecker();
                const languageService = project.getLanguageService();

                return (root) => {
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

                    const result = next(root);

                    return result;
                };
            }),
        }
    );

    runOutput(SRC_DIST_DIR, output);
}

console.time("all");
main().then(() => console.timeEnd("all"));
