import {createPlugin, ts} from "../lib";

export default createPlugin((plugin) => {
    plugin.match(ts.isIdentifier, (it) => {
        if (it.node.text == "__line") {
            const {line} = it.node.getSourceFile().getLineAndCharacterOfPosition(it.node.getStart());
            return it.replace(it.ctx.factory.createNumericLiteral(line));
        }
    });
});
