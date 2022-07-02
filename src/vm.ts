import {exec} from "child_process";

export function runOutput(rootDir: string, output: Record<string, string>) {
    const files = Object.keys(output);
    for (let file of files) {
        console.log(`file ${file}:\n`, output[file]);
    }

    console.log("running...");

    exec(`node ./starter.js ${Buffer.from(JSON.stringify(output)).toString("base64")}`, {cwd: rootDir}, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }

        process.stdout.write(stdout);
        process.stderr.write(stderr);
    });
}
