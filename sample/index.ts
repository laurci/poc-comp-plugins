import {getRegisteredServices} from "./runtime";
import {welcome} from "./test";

console.log("services", getRegisteredServices());

const msg: string = "world!";
welcome(msg);
