'use strict';
(async () => {
  const D = DeletedOSM, T = await D.locale();
  const params = new URLSearchParams(location.search), type = params.get('type');
  const status = document.getElementById('status'), retry = document.getElementById('retry');
  retry.textContent = T.deleted_retry;
  const loading = document.getElementById('map-loading');
  document.getElementById('map-loading-label').textContent = T.deleted_loading_map;
  let id, version, changeset;
  try {
    id = D.positive(params.get('id')); version = D.positive(params.get('version')); changeset = D.positive(params.get('changeset'));
    if (!['node','way'].includes(type)) throw new Error('Invalid type');
  } catch (err) {status.textContent = T.deleted_invalid; loading.hidden = true; document.getElementById('map').setAttribute('aria-busy','false'); return;}
  const label = `${type === 'way' ? T.deleted_way : T.deleted_node} #${id}`;
  document.title = `${label} — OSM MultiToolz`;
  document.getElementById('title').textContent = `${T.deleted_map_title} · ${label}`;
  const cs = document.getElementById('changeset'); cs.textContent = `Changeset #${changeset}`;
  cs.href = `https://www.openstreetmap.org/changeset/${changeset}`;
  const history = document.getElementById('history'); history.textContent = T.deleted_history;
  history.href = `https://www.openstreetmap.org/${type}/${id}/history`;
  document.getElementById('tags-title').textContent = T.deleted_tags;
  document.getElementById('note').textContent = T.deleted_map_note;
  const map = L.map('map');
  const tiles = new MultiToolzTileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);
  let tileWarning = false;
  const retryTiles = document.getElementById('retry-tiles');
  retryTiles.textContent = T.deleted_reload_map;
  tiles.on('tileerror', () => {
    retryTiles.hidden = false;
    if (!tileWarning) {
      tileWarning = true;
      document.getElementById('note').append(` ${T.deleted_tiles_error}`);
    }
  });
  retryTiles.onclick = () => { retryTiles.hidden = true; tiles.redraw(); };
  L.control.scale().addTo(map);
  const layer = L.featureGroup().addTo(map);
  function tagTable(tags) {
    const table = document.createElement('table');
    for (const [key, value] of Object.entries(tags).sort(([a],[b])=>a.localeCompare(b))) {
      const row = document.createElement('tr');
      for (const text of [key,value]) { const cell = document.createElement('td'); cell.textContent = text; row.append(cell); }
      table.append(row);
    }
    return table;
  }
  async function load() {
    loading.hidden = false;
    document.getElementById('map').setAttribute('aria-busy','true');
    retry.hidden = true; status.className = ''; status.textContent = T.deleted_loading; layer.clearLayers();
    try {
      const {previous, deletion} = await D.beforeDeletion(type,id,version,changeset);
      document.getElementById('metadata').textContent = T.deleted_version.replace('{version}',previous.version).replace('{date}',new Date(deletion.timestamp).toLocaleString());
      const tags = document.getElementById('tags'); tags.replaceChildren();
      if (Object.keys(previous.tags).length) tags.append(tagTable(previous.tags)); else tags.textContent = T.deleted_no_tags;
      const {segments, missing} = await D.geometry(previous,deletion);
      for (const segment of segments) {
        const shape = segment.length === 1 ? L.circleMarker(segment[0],{radius:7,color:'#c62828',fillOpacity:.8}) : L.polyline(segment,{color:'#d32f2f',weight:5});
        const popup = document.createElement('div'); const heading = document.createElement('strong');
        heading.textContent = `${label}${previous.tags.name ? ` · ${previous.tags.name}` : ''}`; popup.append(heading,tagTable(previous.tags));
        shape.bindPopup(popup).addTo(layer);
      }
      if (!segments.length) throw new Error(T.deleted_no_geometry);
      map.fitBounds(layer.getBounds(), {padding:[35,35],maxZoom:18});
      status.textContent = missing ? T.deleted_partial.replace('{count}',missing) : T.deleted_ready;
      if (missing) {status.className = 'error';retry.hidden = false;}
    } catch (error) {status.className = 'error';status.textContent = `${T.deleted_error} (${error.message})`;retry.hidden = false;}
    finally {loading.hidden = true; document.getElementById('map').setAttribute('aria-busy','false');}
  }
  retry.onclick = load;
  await load();
})().catch(error => {
  document.getElementById('status').textContent = error.message;
  document.getElementById('map-loading').hidden = true;
  document.getElementById('map').setAttribute('aria-busy','false');
});
