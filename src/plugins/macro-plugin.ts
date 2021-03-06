import {createPlugin, ts} from "../lib";

function createLogCall(f: ts.NodeFactory, args: ts.NodeArray<ts.Expression>) {
    return f.createCallExpression(f.createPropertyAccessExpression(f.createIdentifier("console"), "log"), undefined, args);
}

export default createPlugin((plugin) => {
    plugin.match(ts.isCallExpression, ({node, ctx, replace}) => {
        const expression = node.expression;

        if (ts.isNonNullExpression(expression) && ts.isIdentifier(expression.expression)) {
            const ident = expression.expression; // TODO: WTF

            if (ident.text == "log") {
                return replace(createLogCall(ctx.factory, node.arguments));
            }

            if (ident.text == "magic") {
                return replace(ctx.factory.createNumericLiteral(42));
            }
        }
    });
});
