import { tExpr as _tExpr, useFlowEngine } from '@nocobase/flow-engine';
// @ts-ignore
import pkg from './../../package.json';

export const NS = [pkg.name, 'client'];

export function useT() {
  const engine = useFlowEngine();
  return (str: string) => engine.context.t(str, { ns: NS });
}

export function tExpr(key: string) {
  return _tExpr(key, { ns: NS });
}
