import 'zone.js';
import { expect } from 'chai';
import * as opentracing from '..';

import {executionAsyncId} from 'async_hooks';

export function scopeManagerTests(
        run: (test: (scopeManager: opentracing.ScopeManager) => Promise<any>) => Promise<any>
    ) {
    describe('activate()', () => {
        it('should persist through setTimeout', async () => {
            await run(async scopeManager => {
                const span = new opentracing.Span();

                const scope = scopeManager.activate(span, true);
                expect(scopeManager.active()!.span()).to.equal(span);
                console.log('outer ' + executionAsyncId());
                const spanPromise = new Promise<opentracing.Span | null>((resolve) => {
                    console.log('promise ' + executionAsyncId());
                    setTimeout(() => {
                        console.log('timeout ' + executionAsyncId());
                        const scope = scopeManager.active();
                        resolve(scope && scope.span());
                    }, 0)
                });
                
                expect(scopeManager.active()).to.be.null;

                expect(await spanPromise).to.equal(span);
                scope.close();
                console.log('after ' + executionAsyncId());

                console.log('NOW');
                console.log(scopeManager.active());
                console.log('END');
                console.log('really done');
                expect(scopeManager.active()).to.be.null;
            });
        });

        it('should persist through async/await', async () => {
            await run(async scopeManager => {
                const span1 = new opentracing.Span();
                const span2 = new opentracing.Span();

                expect(scopeManager.active()).to.be.null;

                const scope1 = scopeManager.activate(span1, true);
                expect(scopeManager.active()!.span()).to.equal(span1);
                const span1Promise = (async () => {
                    await Promise.resolve();
                    const scope = scopeManager.active();
                    return scope && scope.span();
                })();
                scope1.close();
                expect(scopeManager.active()).to.be.null;
                

                const scope2 = scopeManager.activate(span2, true);
                const span2Promise = (async () => {
                    await Promise.resolve();
                    const scope = scopeManager.active();
                    return scope && scope.span();
                })();
                scope2.close();
                expect(scopeManager.active()).to.be.null;

                expect(await span1Promise).to.equal(span1);
                expect(await span2Promise).to.equal(span2);
            });
        });
    });
}

export function asyncHookManagerTests() {
    describe('AsyncHookManager', () => {
        const scopeManager = new opentracing.AsyncHookScopeManager();
        scopeManagerTests(async test => {
            scopeManager.hook().enable();
            try {
                await test(scopeManager);
            } finally {
                console.log('done');
                scopeManager.hook().disable();
            }
        });
    });
}

export function zoneScopeManagerTests() {
    describe('ZoneScopeManager', () => {
        const scopeManager = new opentracing.ZoneScopeManager();
        scopeManagerTests(test => Zone.current.fork(scopeManager.zoneSpec()).run(() => test(scopeManager)));
    });
}
