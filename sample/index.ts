import {assert, log, magic} from "./runtime";

const msg: string = "world!";
welcome(msg);

function welcome(str: string) {
    const x = magic!!();
    assert(typeof x === "number");

    log!!("hello", str, "line number is", __line);

    assert(x === 43);
}
