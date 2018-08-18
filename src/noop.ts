import ScopeManager from './scope_manager';
import Span from './span';
import SpanContext from './span_context';
import Tracer from './tracer';

export let tracer: Tracer | null = null;
export let scopeManager: ScopeManager | null = null;
export let spanContext: SpanContext | null = null;
export let span: Span | null = null;

// Deferred initialization to avoid a dependency cycle where Tracer depends on
// Span which depends on the noop tracer.
export function initialize(): void {
    tracer = new Tracer();
    scopeManager = new ScopeManager();
    span = new Span();
    spanContext = new SpanContext();
}
