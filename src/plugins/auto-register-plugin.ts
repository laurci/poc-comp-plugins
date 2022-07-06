import {createPlugin, ts} from "../lib";
import path from "path";

export default createPlugin((plugin) => {
    let definitionsMap: {[key: string]: string[]} = {};

    const generatedSourcePath = plugin.createSourceFile("./generated/auto-register-plugin/map.ts", () => {
        const files = Object.keys(definitionsMap);

        let imports = "",
            calls = "";
        for (let file of files) {
            if (definitionsMap[file].length == 0) continue;

            imports += `import {${definitionsMap[file].join(", ")}} from "./${path
                .relative(path.dirname(generatedSourcePath), file)
                .replace(".ts", "")}";\n`;

            for (let className of definitionsMap[file]) {
                calls += `__auto_svc_registry_push(${className});\n`;
            }
        }

        return `
        if(!global.__auto_svc_registry_map) {
            global.__auto_svc_registry_map = [];

            global.__auto_svc_registry_push = (name: string) => {
                global.__auto_svc_registry_map.push(name);
            };
        }
        ${imports}  
        ${calls}
        `;
    });

    plugin.beforeAll(() => {
        definitionsMap = {};
    });

    plugin.before(({node}) => {
        definitionsMap[node.fileName] = [];
    });

    plugin.match(ts.isClassDeclaration, ({node, ctx}) => {
        if (!node.name) return;

        const factory = ctx.factory;

        if (node.name.text.endsWith("Service")) {
            definitionsMap[node.getSourceFile().fileName].push(node.name.text);
        }
    });
});
