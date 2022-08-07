import {assert, debug, Derivable, derive, log, magic} from "./runtime";

export abstract class Greet extends Derivable {
    abstract hello(): void;
}

// int types
type uint8 = number;
type uint16 = number;
type uint32 = number;

export abstract class Serializable extends Derivable {
    abstract toByteArray(): Uint8Array;
}

class WelcomeMessage extends derive(Greet, Serializable) {
    d: uint8 = 4;
    e: uint16 = 5;
    f: uint32 = 6;
}

export function welcome(str: string) {
    const x = magic!();
    assert(typeof x === "number");

    const message = new WelcomeMessage();
    message.hello();
    console.log(message.toByteArray());

    log!("hello", str, `from line ${__line}`);

    debug(message);

    assert(x === 43);
}
