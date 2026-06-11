import { useAPIClient } from '@nocobase/client';
import { Alert, Button, Card, Input, message, Modal, Popconfirm, Space, Table, Tag, Typography, Upload } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { templates as builtinTemplates } from '../templates';
import { downloadJson } from './presets';
import {
  exportLibrarySnapshot,
  exportPack,
  getRows,
  importRows,
  JsTemplateRow,
  loadLibrary,
  parseTemplatePack,
  usageOf,
} from './templateLibrary';

const { Text, Paragraph } = Typography;

/**
 * Plugin settings page — manage the `jsTemplates` overlay table:
 * import packs (upsert by key), export (custom rows / full library snapshot),
 * hide built-ins, delete overrides / custom rows. Built-in templates live in
 * the plugin bundle and are listed read-only here.
 */

type DisplayRow = {
  key: string;
  label: string;
  kind: string;
  category: string;
  source: 'builtin' | 'override' | 'custom';
  hidden: boolean;
  note?: string | null;
  updatedAt?: string;
  rowId?: number;
};

export const TemplateLibraryAdmin: React.FC = () => {
  const api = useAPIClient();
  const [rows, setRows] = useState<JsTemplateRow[]>(getRows());
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [editOpen, setEditOpen] = useState<null | { title: string; isNew?: boolean }>(null);
  const [editText, setEditText] = useState('');
  const [q, setQ] = useState('');

  const reload = async () => {
    setBusy(true);
    await loadLibrary(api);
    setRows([...getRows()]);
    setBusy(false);
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data: DisplayRow[] = useMemo(() => {
    const rowByKey = new Map(rows.map((r) => [r.key, r]));
    const keys = new Set<string>([...builtinTemplates.map((t) => t.key), ...rows.map((r) => r.key)]);
    const out: DisplayRow[] = [];
    for (const key of keys) {
      const b = builtinTemplates.find((t) => t.key === key);
      const r = rowByKey.get(key);
      out.push({
        key,
        label: (r?.label ?? b?.label ?? key) as string,
        kind: (r?.kind ?? b?.kind ?? '—') as string,
        category: (r?.category ?? b?.category ?? '—') as string,
        source: r ? (b ? 'override' : 'custom') : 'builtin',
        hidden: r?.enabled === false,
        note: r?.note,
        updatedAt: r?.updatedAt,
        rowId: r?.id,
      });
    }
    return out.sort((a, b2) => a.key.localeCompare(b2.key));
  }, [rows]);

  const upsert = async (row: Partial<JsTemplateRow> & { key: string }) => {
    await api.request({
      url: 'jsTemplates:updateOrCreate',
      method: 'post',
      params: { filterKeys: ['key'] },
      data: row,
    });
    await reload();
  };

  const removeRow = async (key: string) => {
    await api.request({ url: 'jsTemplates:destroy', method: 'post', params: { filter: { key } } });
    await reload();
  };

  // editable JSON for a key: the existing row, or the built-in materialized
  // into a full row (saving it creates an override)
  const NEW_SKELETON: any = {
    key: 'myTemplate',
    label: 'My template',
    description: '',
    icon: '🧩',
    kind: 'block',
    scope: 'any',
    category: 'Custom',
    scenes: ['Dashboard'],
    sort: 500,
    params: [{ name: 'title', type: 'text', label: 'Title', default: 'Hello' }],
    body: "\nfunction MyBlock() {\n  return <div style={{ padding: 16 }}>{$p.title}</div>;\n}\nctx.render(<MyBlock />);\n",
    note: '',
  };

  const openEdit = (key?: string) => {
    if (!key) {
      setEditText(JSON.stringify(NEW_SKELETON, null, 2));
      setEditOpen({ title: 'New template', isNew: true });
      return;
    }
    const row = rows.find((r) => r.key === key);
    if (row) {
      const { id, updatedAt, createdAt, createdById, updatedById, ...rest } = row as any;
      setEditText(JSON.stringify(rest, null, 2));
      setEditOpen({ title: `Edit — ${key}` });
      return;
    }
    const b: any = builtinTemplates.find((t) => t.key === key);
    if (!b) return;
    const materialized = {
      key: b.key, label: b.label, description: b.description, icon: b.icon,
      kind: b.kind, alsoKinds: b.alsoKinds, scope: b.scope, category: b.category,
      scenes: b.scenes, sort: b.sort, logicOnly: b.logicOnly, params: b.params,
      body: b.body, rawCode: b.rawCode, note: 'customized from built-in',
    };
    setEditText(JSON.stringify(materialized, null, 2));
    setEditOpen({ title: `Customize built-in — ${key} (saving creates an override)` });
  };

  const saveEdit = async () => {
    let row: any;
    try {
      row = JSON.parse(editText);
    } catch (e: any) {
      message.error('Invalid JSON: ' + e.message);
      return;
    }
    if (!row || typeof row.key !== 'string' || !row.key.trim()) {
      message.error('A non-empty "key" is required');
      return;
    }
    if (editOpen?.isNew && (rows.some((r) => r.key === row.key) || builtinTemplates.some((t) => t.key === row.key))) {
      message.error(`Key "${row.key}" already exists — pick another`);
      return;
    }
    setBusy(true);
    try {
      await upsert(row);
      setEditOpen(null);
      message.success('Saved');
    } catch (e: any) {
      message.error(e?.response?.data?.errors?.[0]?.message || e?.message || 'Save failed');
    }
    setBusy(false);
  };

  const doImport = async (text: string) => {
    try {
      const parsed = parseTemplatePack(text);
      setBusy(true);
      const { ok, errors } = await importRows(api, parsed);
      setRows([...getRows()]);
      setBusy(false);
      setImportOpen(false);
      setImportText('');
      if (errors.length) message.warning(`Imported ${ok}, failed ${errors.length}: ${errors[0]}`);
      else message.success(`Imported ${ok} template(s)`);
    } catch (e: any) {
      setBusy(false);
      message.error(e?.message || 'Import failed');
    }
  };

  const columns = [
    { title: 'Key', dataIndex: 'key', width: 200, render: (v: string) => <Text code>{v}</Text> },
    { title: 'Label', dataIndex: 'label', width: 200 },
    { title: 'Host', dataIndex: 'kind', width: 90 },
    { title: 'Category', dataIndex: 'category', width: 110 },
    {
      title: 'Source',
      dataIndex: 'source',
      width: 110,
      filters: [
        { text: 'Built-in', value: 'builtin' },
        { text: 'Override', value: 'override' },
        { text: 'Custom', value: 'custom' },
      ],
      onFilter: (v: any, r: DisplayRow) => r.source === v,
      render: (v: DisplayRow['source'], r: DisplayRow) => (
        <Space size={4}>
          <Tag color={v === 'builtin' ? 'default' : v === 'override' ? 'orange' : 'blue'}>
            {v === 'builtin' ? 'Built-in' : v === 'override' ? 'Override' : 'Custom'}
          </Tag>
          {r.hidden ? <Tag color="red">hidden</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Usage',
      width: 80,
      sorter: (a2: DisplayRow, b2: DisplayRow) => usageOf(a2.key) - usageOf(b2.key),
      render: (_: any, r: DisplayRow) => usageOf(r.key) || '—',
    },
    { title: 'Note', dataIndex: 'note', ellipsis: true },
    {
      title: 'Actions',
      width: 220,
      render: (_: any, r: DisplayRow) => (
        <Space size={8}>
          <Button size="small" onClick={() => openEdit(r.key)}>
            {r.source === 'builtin' ? 'Customize' : 'Edit'}
          </Button>
          {r.source === 'builtin' && !r.hidden ? (
            <Popconfirm title="Hide this built-in from the gallery?" onConfirm={() => upsert({ key: r.key, enabled: false })}>
              <Button size="small">Hide</Button>
            </Popconfirm>
          ) : null}
          {r.hidden ? (
            <Button size="small" onClick={() => (r.source === 'override' && r.rowId ? upsert({ key: r.key, enabled: true }) : removeRow(r.key))}>
              Unhide
            </Button>
          ) : null}
          {r.source !== 'builtin' ? (
            <Popconfirm
              title={r.source === 'override' ? 'Delete the override (restore built-in)?' : 'Delete this custom template?'}
              onConfirm={() => removeRow(r.key)}
            >
              <Button size="small" danger>
                {r.source === 'override' ? 'Restore built-in' : 'Delete'}
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        Built-in templates ship inside the plugin; rows in the <Text code>jsTemplates</Text> collection overlay them by{' '}
        <Text code>key</Text> — add custom templates, override built-ins (only the fields you set), or hide them. The
        gallery merges both at load time. ⚠️ Template <Text code>body</Text> is JavaScript executed in the browser of
        whoever uses the template — keep write access to this collection admin-only.
      </Paragraph>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => openEdit()} type="primary">
          + New template
        </Button>
        <Button onClick={() => setImportOpen(true)}>
          ⬆ Import templates
        </Button>
        <Button onClick={() => downloadJson('js-templates-custom.json', exportPack(getRows()))} disabled={!rows.length}>
          ⬇ Export table rows ({rows.length})
        </Button>
        <Button onClick={() => downloadJson('js-templates-library.json', exportLibrarySnapshot())}>
          ⬇ Export full library snapshot
        </Button>
        <Button onClick={reload} loading={busy}>
          Refresh
        </Button>
        <Input
          allowClear
          placeholder="Search key / label…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 220 }}
        />
      </Space>
      <Table
        size="small"
        rowKey="key"
        loading={busy}
        columns={columns as any}
        dataSource={data.filter((r) => !q || (r.key + ' ' + r.label).toLowerCase().includes(q.toLowerCase()))}
        pagination={{ pageSize: 50, showSizeChanger: false }}
      />

      <Modal
        title="Import templates"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={() => doImport(importText)}
        okText="Import"
        confirmLoading={busy}
        width={680}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 10 }}
          message={'Accepts a {__jsTpl:"templates"} pack, a JSON array, or a single template object. Rows upsert by key.'}
        />
        <Upload.Dragger
          accept=".json"
          maxCount={1}
          beforeUpload={(file) => {
            file.text().then((t) => setImportText(t));
            return false;
          }}
          showUploadList={false}
          style={{ marginBottom: 10 }}
        >
          <p style={{ margin: 8 }}>Click or drop a .json file here</p>
        </Upload.Dragger>
        <Input.TextArea
          rows={10}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{"__jsTpl":"templates","templates":[{"key":"myKpi","label":"My KPI", ...}]}'
          style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
        />
      </Modal>

      <Modal
        title={editOpen?.title}
        open={!!editOpen}
        onCancel={() => setEditOpen(null)}
        onOk={saveEdit}
        okText="Save"
        confirmLoading={busy}
        width={760}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 10 }}
          message={'The row upserts by "key". Fields left out (or null) fall back to the built-in values; "body" is the template JS (JSX allowed, reference config via $p.*).'}
        />
        <Input.TextArea
          rows={18}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          spellCheck={false}
          style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
          data-tpl-edit
        />
      </Modal>
    </Card>
  );
};

export default TemplateLibraryAdmin;
