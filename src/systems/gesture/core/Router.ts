type Fn = (intent: Intent) => void;
export class IntentRouter {

  private subs = new Set<Fn>();
  subscribe(fn: Fn){ this.subs.add(fn); return () => this.subs.delete(fn); }
  publish(intent: Intent){ for (const fn of this.subs) fn(intent); }
}
