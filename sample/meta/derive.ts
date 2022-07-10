import {DeriveOf} from "../comptime";
import greet from "./greet";
import serializable from "./serializable";

export const derives = {
    Greet: greet,
    Serializable: serializable,
} as Record<string, DeriveOf<any>>;
