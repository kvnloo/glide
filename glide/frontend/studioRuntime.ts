// Run the installed app's launch/auth helpers in Node, without bundling a second bridge.
export const STUDIO_RUNTIME = String.raw`
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const tern = args => exec('tern', args, { timeout: 20000, maxBuffer: 4 * 1024 * 1024 });
const [action, selected = ''] = process.argv.slice(1);
try {
  if (selected && !/^[\w-][\w.-]*$/.test(selected)) throw Error('Invalid project id');
  const config = process.env.TERN_CONFIG_DIR || path.join(os.homedir(), '.config/tern');
  const plugins = path.join(config, 'plugins');
  let linked;
  try { linked = (await fs.readFile(path.join(plugins, 'fframestudio.path'), 'utf8')).trim(); } catch {}
  const root = process.env.GLIDE_STUDIO_DIR || (linked ? path.dirname(linked) : path.join(plugins, 'fframestudio', '..'));
  const app = name => pathToFileURL(path.join(root, name)).href;
  let lifecycle, client;
  try {
    lifecycle = await import(app('tern/lifecycle.mjs'));
    client = await import(app('tern/bridge-client.mjs'));
  } catch { throw Error('Set GLIDE_STUDIO_DIR to the fframestudio checkout, or link its tern plugin. Install its existing dependencies first.'); }
  const info = await lifecycle.ensureBridge();
  if (action === 'inspect') {
    let native = false;
    try {
      const list = JSON.parse((await tern(['plugin', 'list', '--json'])).stdout);
      const installed = linked || path.join(plugins, 'fframestudio');
      native = list.plugins?.some(p => p.id === 'fframestudio' && p.status === 'ready') &&
        await fs.realpath(installed) === await fs.realpath(path.join(root, 'tern'));
    } catch {}
    let project = null;
    if (selected) {
      const raw = await client.requestJSON(info, '/lib/' + client.projectID(selected) + '/project.json');
      const { fromV0 } = await import(app('web/src/doc/project.js'));
      const doc = fromV0(raw);
      // Return only the read-only preview fields, never credentials, media paths or editor text.
      project = { schema: doc.schema, id: doc.id, title: doc.title || doc.id, videos: doc.videos.map(v => ({
        id: v.id, name: v.name || v.id, scenes: v.scenes.map(s => ({ id: s.id, name: s.name || s.id, clipIds: s.clipIds })),
        clips: v.clips.map(c => ({ id: c.id, name: c.name || c.id, mediaId: c.mediaId || null,
          attached: c.attached.map(a => ({ id: a.id, kind: a.kind || 'layer', ...(a.field ? { field: a.field } : {}) })) }))
      })) };
    }
    console.log(JSON.stringify({ mode: native ? 'native' : 'web', url: info.url + '/' + (selected ? '#/p/' + selected : ''), project }));
  } else {
    const owner = process.env.TERN_PANE || '';
    if (!/^[1-9][0-9]*$/.test(owner) || !Number.isSafeInteger(Number(owner))) throw Error('Studio needs a local Tern pane. The safe editor URL is shown in the card.');
    if (action === 'native') {
      await tern(['split', owner, 'right', '--json', '--', process.execPath, path.join(root, 'tern/app.mjs'), ...(selected ? ['--project', selected] : [])]);
    } else if (action === 'web') {
      const { controlFile } = await import(app('tern/tern-control.mjs'));
      // The existing helper keeps /open's credential in a private, temporary file, not argv/output.
      await controlFile('browser open ' + JSON.stringify(client.editorURL(info, selected || undefined)) + '\n', tern);
    } else throw Error('Unknown studio action');
    console.log(JSON.stringify({ opened: true }));
  }
} catch (error) {
  // Never serialize exec errors: they contain child output and possibly private paths.
  const message = error?.code || error?.cmd ? 'Studio launch failed. Check the installed app and local Tern pane.' : error.message;
  console.log(JSON.stringify({ error: message }));
  process.exitCode = 1;
}
`
