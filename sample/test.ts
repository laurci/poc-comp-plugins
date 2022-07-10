import {assert, Derivable, derive, log, magic} from "./runtime";

export abstract class Greet extends Derivable {
    abstract hello(): void;
}

export abstract class Serializable extends Derivable {
    abstract toByteArray(): Uint8Array;
}

class WelcomeMessage extends derive(Greet, Serializable) {}

export function welcome(str: string) {
    const x = magic!!();
    assert(typeof x === "number");

    const message = new WelcomeMessage();
    message.hello();

    log!!("hello", str, `from line ${__line}`);

    assert(x === 43);
}
