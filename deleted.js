'use strict';
(async () => {
  const D = DeletedOSM, L = await D.locale();
  const status = document.getElementById('status'), list = document.getElementById('objects');
  const retry = document.getElementById('retry');
  document.title = document.getElementById('title').textContent = L.deleted_title;
  retry.textContent = L.deleted_retry;
  let changeset;
  try { changeset = D.positive(new URLSearchParams(location.search).get('changeset')); }
  catch (err) { status.textContent = L.deleted_invalid; document.body.classList.remove('is-loading'); return; }
  const link = document.getElementById('changeset');
  link.textContent = `Changeset #${changeset}`;
  link.href = `https://www.openstreetmap.org/changeset/${changeset}`;
  async function load() {
    document.body.classList.add('is-loading');
    retry.disabled = true;
    retry.hidden = true; list.replaceChildren(); status.className = '';
    document.getElementById('note').textContent = '';
    status.textContent = L.deleted_loading;
    try {
      const {objects, relations} = await D.deleted(changeset);
      // An object may be deleted, restored, then deleted again in the same changeset.
      const ways = objects.filter(o => o.type === 'way');
      const nodes = objects.filter(o => o.type === 'node');
      let done = 0;
      const wayResults = await D.pool(ways, async object => {
        try { return {...object, ...(await D.beforeDeletion(object.type, object.id, object.version, changeset))}; }
        finally { status.textContent = L.deleted_progress.replace('{done}', ++done).replace('{total}', ways.length); }
      });
      const covered = new Set(wayResults.flatMap(r => r.value?.previous.nodes || []));
      const standalone = nodes.filter(n => !covered.has(n.id));
      const entries = ways.map((object, i) => ({object, result: wayResults[i]}));
      entries.push(...standalone.map(object => ({object, result: null})));
      for (const entry of entries) {
        const li = document.createElement('li');
        const a = document.createElement('a'); a.className = 'object-link'; a.target = '_blank'; a.rel = 'noopener';
        const object = entry.object;
        a.textContent = `${object.type === 'way' ? L.deleted_way : L.deleted_node} #${object.id}`;
        a.href = browser.runtime.getURL(`deleted-map.html?changeset=${changeset}&type=${object.type}&id=${object.id}&version=${object.version}`);
        a.title = L.deleted_show;
        li.append(a);
        const description = document.createElement('div'); description.className = 'description'; li.append(description);
        function describe(result) {
          if (result.error) {description.textContent = L.deleted_history_error; description.classList.add('error'); return;}
          const tags = result.value.previous.tags;
          description.textContent = [tags.name, ...Object.entries(tags).filter(([k]) => ['highway','building','natural','amenity','waterway','landuse','historic','place','barrier'].includes(k)).map(([k,v])=>`${k}=${v}`)].filter(Boolean).join(' · ') || L.deleted_no_name;
        }
        entry.describe = describe;
        if (entry.result) describe(entry.result); else description.textContent = L.deleted_loading;
        list.append(li);
      }
      status.textContent = L.deleted_summary.replace('{ways}', ways.length).replace('{nodes}', standalone.length);
      if (!entries.length) status.textContent = L.deleted_empty;
      const notes = [L.deleted_list_note];
      if (relations) notes.push(L.deleted_relations.replace('{count}', relations));
      if (wayResults.some(r=>r.error)) {notes.push(L.deleted_filter_warning); retry.hidden = false;}
      document.getElementById('note').textContent = notes.join(' ');
      // Names of standalone nodes do not delay the display of the list.
      await D.pool(entries.filter(e=>!e.result), async entry => {
        try {entry.describe({value: await D.beforeDeletion('node', entry.object.id, entry.object.version, changeset)});}
        catch (error) {entry.describe({error}); retry.hidden = false;}
      });
    } catch (error) {
      status.className = 'error'; status.textContent = `${L.deleted_error} (${error.message})`; retry.hidden = false;
    } finally {document.body.classList.remove('is-loading'); retry.disabled = false;}
  }
  retry.onclick = load;
  await load();
})().catch(error => {document.getElementById('status').textContent = error.message; document.body.classList.remove('is-loading');});
