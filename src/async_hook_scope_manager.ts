import {AsyncHook, executionAsyncId, createHook} from 'async_hooks';
import BaseScope from './base_scope';
import Span from './span';
import Scope from './scope';
import ScopeManager from './scope_manager';
import * as fs from 'fs';

/**
 * ScopeManger using Node.js {@link async_hooks|https://nodejs.org/api/async_hooks.html}
 *
 * To install, scopeManager.hook().enable().
 * To uninstall, scopeManager.hook().disable().
 */
export class AsyncHookScopeManager implements ScopeManager {
    readonly _scopes = new Map<number, Scope>();

    private readonly _setScope = (scope: Scope | null) => {
        const asyncId = executionAsyncId();
        if (scope) {
            console.log(`${asyncId} set`);
            this._scopes.set(asyncId, scope);
        } else {
            console.log(`${asyncId} delete`);
            this._scopes.delete(asyncId);
        }
    }

    private readonly _hook = createHook({
        destroy: asyncId => {
            this._scopes.delete(asyncId);
        },
        init: (asyncId, type, triggerAsyncId) => {
            fs.writeSync(1, `${asyncId} ${type} ${triggerAsyncId}\n`);
            const scope = this._scopes.get(triggerAsyncId);
            if (scope) {
                const span = scope.span();
                const manager = this;
                this._scopes.set(asyncId, new class extends Scope {
                    close() {
                        manager._scopes.delete(asyncId);
                    }

                    span() {
                        return span;
                    }
                });
            }
        },
    });

    active() {
        return this._scopes.get(executionAsyncId()) || null;
    }

    activate(span: Span, finishOnClose: boolean) {
        return new BaseScope(span, finishOnClose, this.active(), this._setScope);
    }

    hook(): AsyncHook {
        return this._hook;
    }
}

export default AsyncHookScopeManager;
