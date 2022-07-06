import {execSync} from "child_process";
import fs from "fs";
import path from "path";

export async function runOutput(rootDir: string, output: Record<string, string>) {
    const files = Object.keys(output);

    await Promise.all(
        files.map(async (file) => {
            const dir = path.dirname(file);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, {recursive: true});
            }
            await fs.promises.writeFile(file, output[file]);
        })
    );

    console.log("attempting to run 'index.js'");

    try {
        execSync(`node ./index.js`, {cwd: rootDir, stdio: "inherit"});
    } catch (e: any) {
        console.error("process exit", e.status);
    }
    console.log("\n\n\n");
}
