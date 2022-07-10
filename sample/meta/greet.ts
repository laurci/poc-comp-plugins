import {deriveOf} from "../comptime";
import {Greet} from "../test";

export default deriveOf<typeof Greet>({
    hello({factory, target}) {
        return [
            factory.createExpressionStatement(
                factory.createCallExpression(
                    factory.createPropertyAccessExpression(factory.createIdentifier("console"), "log"),
                    undefined,
                    [factory.createStringLiteral(`comptime hello from ${target.declaration.name!.text}`)]
                )
            ),
        ];
    },
});
