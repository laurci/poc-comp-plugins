import {createPlugin, ts} from "../lib";
import path from "path";

export default createPlugin((plugin) => {
    let needsImport = false;

    const generatedSourcePath = plugin.createSourceFile("./generated/line-plugin/lines.ts", () => {
        return `
            (global as any).__compute_line = (idx: number) => idx + 1; // line passed by compiler is 0 based
        `;
    });

    plugin.before(() => {
        needsImport = false;
    });

    plugin.match(ts.isIdentifier, (it) => {
        if (it.node.text == "__line") {
            needsImport = true;

            const {line} = it.node.getSourceFile().getLineAndCharacterOfPosition(it.node.getStart());
            return it.replace(
                it.ctx.factory.createCallExpression(it.ctx.factory.createIdentifier("__compute_line"), undefined, [
                    it.ctx.factory.createNumericLiteral(line),
                ])
            );
        }
    });

    plugin.after(({node, ctx}) => {
        if (!needsImport) return;

        console.log(node.fileName, generatedSourcePath + ".ts");
        const statements = ctx.factory.createNodeArray([
            ctx.factory.createImportDeclaration(
                undefined,
                undefined,
                undefined,
                ctx.factory.createStringLiteral("./" + path.relative(path.dirname(node.fileName), generatedSourcePath))
            ),
            ...node.statements,
        ]);

        return {
            ...node,
            statements,
        };
    });
});
