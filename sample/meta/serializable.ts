import {deriveOf} from "../comptime";
import {ts} from "../../src/lib";
import {Serializable} from "../test";

function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const numberTypes = ["uint8", "uint16", "uint32"];

export default deriveOf<typeof Serializable>({
    toByteArray({factory, target}) {
        const assignments: ts.ExpressionStatement[] = [];
        let offset = 0;

        for (let member of target.declaration.members) {
            if (!ts.isPropertyDeclaration(member)) return;
            if (!member.type) continue;

            const typeName = member.type.getText();
            if (!numberTypes.includes(typeName)) continue;

            assignments.push(
                factory.createExpressionStatement(
                    factory.createCallExpression(
                        factory.createPropertyAccessExpression(factory.createIdentifier("_data"), `set${capitalize(typeName)}`),
                        undefined,
                        [
                            factory.createNumericLiteral(offset),
                            factory.createPropertyAccessExpression(
                                factory.createPropertyAccessExpression(factory.createThis(), "instance"),
                                member.name.getText()
                            ),
                        ]
                    )
                )
            );

            offset += parseInt(typeName.replace("uint", "")) / 8;
        }

        return [
            factory.createVariableStatement(
                [factory.createModifier(ts.SyntaxKind.ConstKeyword)],
                factory.createVariableDeclarationList([
                    factory.createVariableDeclaration(
                        "_buff",
                        undefined,
                        undefined,
                        factory.createNewExpression(factory.createIdentifier("ArrayBuffer"), undefined, [
                            factory.createNumericLiteral(offset),
                        ])
                    ),
                    factory.createVariableDeclaration(
                        "_data",
                        undefined,
                        undefined,
                        factory.createNewExpression(factory.createIdentifier("DataView"), undefined, [factory.createIdentifier("_buff")])
                    ),
                ])
            ),
            ...assignments,
            factory.createReturnStatement(
                factory.createNewExpression(factory.createIdentifier("Uint8Array"), undefined, [factory.createIdentifier("_buff")])
            ),
        ];
    },
});
