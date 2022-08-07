type ReactLogFlags = 'render' | 'after-render';
interface LogOptions {
    react?: ReactLogFlags[]
};

function log(options?: LogOptions): any {
    return {} as any;
}

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

@log()
function randomFunc() {
    console.log("This is random");
}