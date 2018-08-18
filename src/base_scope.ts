import Scope from './scope';
import { Span } from '.';

export class BaseScope extends Scope {
    constructor(
            private readonly _span: Span | null,
            private readonly _finishOnClose: boolean,
            private readonly _previous: Scope | null,
            private readonly _activate: (scope: Scope | null) => void
        ) {
        super();
        this._activate(this._span ? this : null);
    }

    close() {
        if (this._finishOnClose && this._span) {
            this._span.finish();
        }
        this._activate(this._previous);
    }

    span() {
        if (!this._span) {
            throw new Error('No span');
        }
        return this._span;
    }
}

export default BaseScope;
