import BaseScope from './base_scope';
import Scope from './scope';
import Span from './span';

export class ScopeManager {
    activate(span: Span, finishOnClose: boolean): Scope {
        return new BaseScope(span, finishOnClose, this.active(), () => undefined);
    }

    active(): Scope | null {
        return null;
    }
};

export default ScopeManager;
