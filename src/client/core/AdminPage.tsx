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
    { title: 'Note', dataIndex: 'note', ellipsis: true },
    {
      title: 'Actions',
      width: 220,
      render: (_: any, r: DisplayRow) => (
        <Space size={8}>
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
        <Button onClick={() => setImportOpen(true)} type="primary">
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
      </Space>
      <Table size="small" rowKey="key" loading={busy} columns={columns as any} dataSource={data} pagination={{ pageSize: 20, showSizeChanger: false }} />

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
    </Card>
  );
};

export default TemplateLibraryAdmin;
