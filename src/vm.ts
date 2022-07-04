import {exec} from "child_process";

export function runOutput(rootDir: string, output: Record<string, string>) {
    const files = Object.keys(output);

    console.log("output:");
    for (let file of files) {
        if (file.endsWith("index.js") || file.endsWith("test.js")) {
            console.log(`file ${file}:\n`, output[file]);
        } else {
            console.log(`file ${file}`);
        }
    }

    console.log("attempting to run 'index.js'");

    exec(`node ./starter.js ${Buffer.from(JSON.stringify(output)).toString("base64")}`, {cwd: rootDir}, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }

        process.stdout.write(stdout);
        process.stderr.write(stderr);

        console.log("---------");
    });
}
