const path = require("path");
const fs = require("fs");

const arg = process.argv.pop();
const files = JSON.parse(Buffer.from(arg, "base64").toString());

// TODO: dear Lord, please forgive me for what I am about to sin;
const originalReadFileSync = fs.readFileSync.bind(fs);
const originalResolve = module.constructor._resolveFilename;

module.constructor._resolveFilename = (name, mod) => {
    if (files[name]) return name;

    const filename = path.join(mod.path, `${name}.js`);
    if (files[filename]) return filename;

    return originalResolve(name, mod);
};

fs.readFileSync = (p, options) => {
    if (files[p]) {
        return files[p];
    }

    return originalReadFileSync(p, options);
};

async function _start() {
    require("./index");
}

_start().catch((err) => {
    console.error(err);
});
