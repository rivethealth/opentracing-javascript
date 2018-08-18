import BaseScope from './base_scope';
import Span from './span';
import Scope from './scope';
import ScopeManager from './scope_manager';
import {ZoneSpec} from './zone_types';

const defaultZoneName = 'opentracing';

const propertyKey = 'opentracing';

class PropertyData {
    readonly tasks = new WeakMap<Task, Span | null>();

    constructor(public span: Span | null) {
    }
};

type Property = {
    owner: ZoneScopeManager,
    data: PropertyData,
};

/**
 * ScopeManager using {@link Zone.js|https://github.com/angular/zone.js}.
 *
 * It works only for code initiated from a set-up zone:
 *
 * Zone.current.fork(scopeManager.zoneSpec()).run(() => {
 *     // code
 * });
 */
export class ZoneScopeManager implements ScopeManager {
    private scope: Scope | null = null;

    constructor(private readonly name: string = defaultZoneName) {
    }

    private readonly _setScopeAndSpan = (scope: Scope | null) => {
        const data = this._data(Zone.current);
        if (data) {
            data.span = scope && scope.span();
            this.scope = scope;
        } else {
            console.warn('Scopes should be in an Opentracing zone');
        }
    }

    private _localScope(span: Span | null) {
        return new BaseScope(span, false, this.scope, this._setScope);
    }

    private readonly _setScope = (scope: Scope | null) => this.scope = scope;

    private _data(zone: Zone): PropertyData | null {
        for (; zone = zone.getZoneWith(propertyKey); zone = zone.parent) {
            const {data, owner} = <Property>zone.get(propertyKey);
            if (this === owner) {
                return data;
            }
        }
        return null;
    }

    private _property(span: Span | null): Property {
        return {data: new PropertyData(span), owner: this};
    }

    activate(span: Span, finishOnClose: boolean) {
        return new BaseScope(span, finishOnClose, this.scope, this._setScopeAndSpan);
    }

    active() {
        return this.scope;
    }

    zoneSpec(): ZoneSpec {
        return {
            name: this.name,
            onCancelTask: (parent, current, target, task) => {
                const {tasks} = this._data(target)!;
                tasks.delete(task);
                return parent.cancelTask(target, task);
            },
            onFork: (parent, current, target, spec) => {
                const {span} = this._data(target)!;
                return parent.fork(target, spec).fork({
                    name: this.name,
                    properties: {
                        [propertyKey]: this._property(span),
                    },
                });
            },
            onInvokeTask: (parent, current, target, task, applyThis, applyArgs) => {
                const {tasks} = this._data(target)!;
                const span = tasks.get(task);
                if (span === undefined) {
                    console.warn('Could not find span for task');
                    return parent.invokeTask(target, task, applyThis, applyArgs);
                }
                return this._localScope(span).run(() => parent.invokeTask(target, task, applyThis, applyArgs));
            },
            onIntercept: (parent, current, target, delegate, source) => {
                const {span} = this._data(target)!;
                const manager = this;
                const wrappedDelegate = function() {
                    return manager._localScope(span).run(Function.apply.bind(delegate, this, arguments));
                };
                return parent.intercept(target, wrappedDelegate, source);
            },
            onScheduleTask: (parent, current, target, task) => {
                const {span, tasks} = this._data(target)!;
                tasks.set(task, span);
                return parent.scheduleTask(target, task);
            },
            properties: {
                [propertyKey]: this._property(null),
            },
        };
    }
}

export default ZoneScopeManager;
