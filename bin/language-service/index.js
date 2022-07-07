const path = require("path");

require("ts-node").register({
    cwd: __dirname,
    transpileOnly: true,
    transpiler: "ts-node/transpilers/swc",
    esm: false,
    emit: false,
    project: path.join(__dirname, "tsconfig.json"),
});

module.exports = require("../../src/language-service");
