import {assert, log, magic} from "./runtime";

export function welcome(str: string) {
    const x = magic!!();
    assert(typeof x === "number");

    log!!("hello", str, `from line ${__line}`);

    assert(x === 43);
}
