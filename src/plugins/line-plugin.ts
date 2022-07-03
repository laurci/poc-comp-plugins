import {createPlugin, ts} from "../lib";

export default createPlugin((plugin) => {
    let needsImport = false;

    plugin.before(() => {
        needsImport = false;
    });

    plugin.match(ts.isIdentifier, (it) => {
        if (it.node.text == "__line") {
            needsImport = true;

            const {line} = it.node.getSourceFile().getLineAndCharacterOfPosition(it.node.getStart());
            return it.replace(it.ctx.factory.createNumericLiteral(line + 1));
        }
    });

    plugin.after(({node, ctx}) => {
        if (!needsImport) return;

        // TODO: generate the fake source file before creating this import

        // const statements = ctx.factory.createNodeArray([
        //     ctx.factory.createImportDeclaration(
        //         undefined,
        //         undefined,
        //         ctx.factory.createImportClause(false, ctx.factory.createIdentifier("hello"), undefined),
        //         ctx.factory.createStringLiteral("./hello")
        //     ),
        //     ...node.statements,
        // ]);

        // return {
        //     ...node,
        //     statements,
        // };
    });
});
