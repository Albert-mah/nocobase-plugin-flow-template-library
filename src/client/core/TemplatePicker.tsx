import { useFlowSettingsContext } from '@nocobase/flow-engine';
import { Card, Col, Empty, Input, InputNumber, Row, Select, Switch, Typography } from 'antd';
import React, { useMemo, useState } from 'react';
import { templates } from '../templates';
import { ParamSpec, Template, TemplateKind } from './types';

const { Text } = Typography;

// ---- data-source helpers -------------------------------------------------

function getMainDataSource(ctx: any) {
  return ctx?.dataSourceManager?.getDataSource?.('main');
}

function findModelByUid(ctx: any, uid: string) {
  if (!uid) return undefined;
  return ctx?.model?.flowEngine?.getModel?.(uid) || ctx?.model?.context?.engine?.getModel?.(uid);
}

/** which collection should a field-picker list, given collectionFrom + the current params */
function resolveCollectionName(ctx: any, params: any, collectionFrom?: string): string | undefined {
  if (collectionFrom && collectionFrom.startsWith('target:')) {
    const uid = params?.[collectionFrom.slice('target:'.length)];
    return findModelByUid(ctx, uid)?.collection?.name;
  }
  if (collectionFrom) return params?.[collectionFrom];
  // no explicit source → the model's own collection (form item / table row / data block).
  // Walk a few likely holders since the settings ctx shape varies by context.
  const m: any = ctx?.model;
  return (
    m?.collection?.name ||
    ctx?.collection?.name ||
    ctx?.blockModel?.collection?.name ||
    m?.parent?.collection?.name ||
    m?.context?.blockModel?.collection?.name
  );
}

function listTargetBlocks(ctx: any) {
  const grid: any = ctx?.blockGridModel;
  if (!grid?.filterSubModels) return [];
  const models: any[] = grid.filterSubModels('items', (m: any) => !!m?.resource?.supportsFilter) || [];
  return models
    .filter((m) => m.uid !== ctx?.model?.uid)
    .map((m) => ({ label: m.title || m.props?.title || m.collection?.title || m.uid, value: m.uid }));
}

function listCollections(ctx: any) {
  const ds: any = getMainDataSource(ctx);
  return (ds?.getCollections?.() || []).map((c: any) => ({ label: c.title || c.name, value: c.name }));
}

function listFields(ctx: any, collectionName?: string) {
  if (!collectionName) return [];
  const ds: any = getMainDataSource(ctx);
  const col: any = ds?.getCollection?.(collectionName);
  return (col?.getFields?.() || []).map((f: any) => ({ label: f.title || f.name, value: f.name }));
}

// ---- a single parameter input -------------------------------------------

function ParamField({
  spec,
  value,
  onChange,
  ctx,
  params,
}: {
  spec: ParamSpec;
  value: any;
  onChange: (v: any) => void;
  ctx: any;
  params: any;
}) {
  const collectionName = resolveCollectionName(ctx, params, spec.collectionFrom);

  // hooks must run unconditionally (Rules of Hooks) — compute all option lists up front
  const targetOptions = useMemo(() => listTargetBlocks(ctx), [ctx]);
  const collectionOptions = useMemo(() => listCollections(ctx), [ctx]);
  const fieldOptions = useMemo(() => listFields(ctx, collectionName), [ctx, collectionName]);

  let control: React.ReactNode;
  switch (spec.type) {
    case 'targetBlock':
      control = (
        <Select
          allowClear
          style={{ width: '100%' }}
          value={value}
          onChange={onChange}
          options={targetOptions}
          placeholder="Select a data block on this page"
        />
      );
      break;
    case 'collection':
      control = (
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          value={value}
          onChange={onChange}
          options={collectionOptions}
          placeholder="Select a collection"
        />
      );
      break;
    case 'field':
    case 'fields':
      control = (
        <Select
          mode={spec.type === 'fields' ? 'multiple' : undefined}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          value={value}
          onChange={onChange}
          options={fieldOptions}
          placeholder={collectionName ? 'Select field(s)' : 'Pick a collection / target block first'}
        />
      );
      break;
    case 'select':
      control = (
        <Select
          style={{ width: '100%' }}
          value={value}
          onChange={onChange}
          options={spec.options || []}
        />
      );
      break;
    case 'boolean':
      control = <Switch checked={!!value} onChange={onChange} />;
      break;
    case 'number':
      control = <InputNumber style={{ width: '100%' }} value={value} onChange={onChange} />;
      break;
    case 'text':
    default:
      control = <Input value={value} onChange={(e) => onChange(e.target.value)} />;
      break;
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ marginBottom: 4, fontWeight: 500 }}>
        {spec.label}
        {spec.required ? <span style={{ color: '#ff4d4f' }}> *</span> : null}
      </div>
      {control}
    </div>
  );
}

// ---- the gallery + param form (one Formily field) ------------------------
// value shape: { templateKey: string, params: Record<string, any> }

export function makeTemplatePicker(kind: TemplateKind) {
  return function TemplatePicker(props: any) {
    const { value, onChange } = props;
    const ctx = useFlowSettingsContext();
    const list = useMemo(
      () => templates.filter((t) => t.kind === kind).sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999)),
      [],
    );

    const [templateKey, setTemplateKey] = useState<string | undefined>(value?.templateKey);
    const [params, setParams] = useState<Record<string, any>>(value?.params || {});
    const selected: Template | undefined = list.find((t) => t.key === templateKey);

    const emit = (key: string | undefined, p: Record<string, any>) => onChange?.({ templateKey: key, params: p });

    const pick = (t: Template) => {
      const defaults: Record<string, any> = {};
      (t.params || []).forEach((sp) => {
        if (sp.default !== undefined) defaults[sp.name] = sp.default;
      });
      setTemplateKey(t.key);
      setParams(defaults);
      emit(t.key, defaults);
    };

    const setParam = (name: string, v: any) => {
      const next = { ...params, [name]: v };
      setParams(next);
      emit(templateKey, next);
    };

    if (!list.length) return <Empty description="No templates for this slot" />;

    return (
      <div>
        <div style={{ marginBottom: 8, color: '#888' }}>Pick a template</div>
        <Row gutter={[12, 12]}>
          {list.map((t) => {
            const active = t.key === templateKey;
            return (
              <Col xs={24} sm={12} md={8} key={t.key}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => pick(t)}
                  style={{
                    cursor: 'pointer',
                    borderColor: active ? '#1677ff' : undefined,
                    borderWidth: active ? 2 : 1,
                    background: active ? '#e6f4ff' : undefined,
                    height: '100%',
                  }}
                >
                  <div style={{ fontSize: 20, lineHeight: 1 }}>{t.icon || '🧩'}</div>
                  <div style={{ fontWeight: 600, marginTop: 6 }}>{t.label}</div>
                  {t.description ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t.description}
                    </Text>
                  ) : null}
                </Card>
              </Col>
            );
          })}
        </Row>

        {selected ? (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>
              {selected.icon || '🧩'} {selected.label} — options
            </div>
            {selected.params.length ? (
              selected.params.map((sp) => (
                <ParamField
                  key={sp.name}
                  spec={sp}
                  value={params[sp.name]}
                  onChange={(v) => setParam(sp.name, v)}
                  ctx={ctx}
                  params={params}
                />
              ))
            ) : (
              <Text type="secondary">This template needs no configuration.</Text>
            )}
          </div>
        ) : null}
      </div>
    );
  };
}
