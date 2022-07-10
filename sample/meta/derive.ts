import {DeriveOf} from "../comptime";
import greet from "./greet";

export const derives = {
    Greet: greet,
} as Record<string, DeriveOf<any>>;
