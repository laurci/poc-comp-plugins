type ReactLogFlags = 'render' | 'after-render';


type FunctionDecorator = { __dec: "function" };
function makeFunctionDecorator<T extends any[]>(): (...args: T) => FunctionDecorator {
    return () => {
        return { __dec: "function" }
    };
}

interface LogOptions {
    react?: ReactLogFlags[]
};


const log = makeFunctionDecorator<[options?: LogOptions]>();

declare namespace JSX {
    interface IntrinsicElements {
        div: {}
    }
}

@log({react: ['render']})
function WelcomeComponent() {
    console.log("WelcomeComponent");

    return <div>hello world!</div>;
}

@log({})
function randomFunc() {
    console.log("This is random");
}