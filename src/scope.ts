import {Span} from './span';

export abstract class Scope {
    abstract close(): void;

    run<A>(f: () => A): A {
        try {
            return f();
        } finally {
            this.close();
        }
    }

    abstract span(): Span;
}

export default Scope;
