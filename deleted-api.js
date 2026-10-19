/* Read-only historical OSM data. Shared by the list and map pages. */
'use strict';
window.DeletedOSM = (() => {
  const API = 'https://api.openstreetmap.org/api/0.6';
  const histories = new Map();
  function positive(value) {
    if (!/^[1-9]\d*$/.test(String(value))) throw new Error('Invalid OSM ID or version');
    return String(value);
  }
  async function xml(path) {
    const response = await fetch(`${API}/${path}`, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`OSM API: HTTP ${response.status}`);
    const doc = new DOMParser().parseFromString(await response.text(), 'application/xml');
    if (doc.querySelector('parsererror') || !['osm', 'osmChange'].includes(doc.documentElement.tagName)) {
      throw new Error('Invalid OSM response');
    }
    return doc;
  }
  function element(el) {
    return {
      type: el.tagName, id: el.getAttribute('id'), version: Number(el.getAttribute('version')),
      visible: el.getAttribute('visible') !== 'false', timestamp: el.getAttribute('timestamp'),
      changeset: el.getAttribute('changeset'), user: el.getAttribute('user'),
      lat: el.hasAttribute('lat') ? Number(el.getAttribute('lat')) : null,
      lon: el.hasAttribute('lon') ? Number(el.getAttribute('lon')) : null,
      nodes: Array.from(el.querySelectorAll('nd'), nd => nd.getAttribute('ref')),
      tags: Object.fromEntries(Array.from(el.querySelectorAll('tag'), tag => [tag.getAttribute('k'), tag.getAttribute('v')]))
    };
  }
  async function history(type, id) {
    if (!['node', 'way'].includes(type)) throw new Error('Unsupported object type');
    const key = `${type}/${positive(id)}`;
    if (!histories.has(key)) {
      histories.set(key, xml(`${key}/history`).then(doc => Array.from(doc.querySelectorAll(`osm > ${type}`), element).sort((a,b) => a.version-b.version)).catch(err => {
        histories.delete(key);
        throw err;
      }));
    }
    return histories.get(key);
  }
  async function deleted(changeset) {
    const doc = await xml(`changeset/${positive(changeset)}/download`);
    return {
      objects: Array.from(doc.querySelectorAll('delete > way, delete > node'), element),
      relations: doc.querySelectorAll('delete > relation').length
    };
  }
  async function beforeDeletion(type, id, deletionVersion, changeset) {
    const versions = await history(type, id);
    const deletion = versions.find(v => v.version === Number(positive(deletionVersion)));
    if (!deletion || deletion.visible || deletion.changeset !== positive(changeset)) throw new Error('Deletion not available in this changeset');
    const previous = versions.filter(v => v.version < deletion.version && v.visible).at(-1);
    if (!previous) throw new Error('Previous visible version unavailable (possibly redacted)');
    return { previous, deletion };
  }
  async function pool(items, fn, concurrency = 3) {
    let next = 0;
    const results = new Array(items.length);
    await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, async () => {
      while (next < items.length) {
        const index = next++;
        try { results[index] = {value: await fn(items[index], index)}; }
        catch (error) { results[index] = {error}; }
      }
    }));
    return results;
  }
  async function geometry(previous, deletion) {
    if (previous.type === 'node') {
      if (!Number.isFinite(previous.lat) || !Number.isFinite(previous.lon)) throw new Error('Coordinates unavailable');
      return { segments: [[[previous.lat, previous.lon]]], missing: 0 };
    }
    const ids = [...new Set(previous.nodes)];
    const coordinates = new Map();
    await pool(ids, async id => {
      const versions = await history('node', id);
      // No coordinates from edits made after the deletion being inspected.
      const node = versions.filter(v => v.visible && v.timestamp <= deletion.timestamp).at(-1);
      if (!node || !Number.isFinite(node.lat) || !Number.isFinite(node.lon)) throw new Error('Coordinates unavailable');
      coordinates.set(id, [node.lat, node.lon]);
    });
    const segments = []; let segment = []; let missing = 0;
    for (const id of previous.nodes) {
      if (coordinates.has(id)) segment.push(coordinates.get(id));
      else { missing++; if (segment.length) segments.push(segment); segment = []; }
    }
    if (segment.length) segments.push(segment);
    return {segments, missing};
  }
  async function locale() {
    const lang = navigator.language.slice(0,2).toLowerCase();
    const code = ['it','en','sk'].includes(lang) ? lang : 'en';
    const response = await fetch(browser.runtime.getURL(`LOCALES/${code}.json`));
    if (!response.ok) throw new Error('Translations unavailable');
    document.documentElement.lang = code;
    return response.json();
  }
  return {positive, deleted, beforeDeletion, geometry, locale, pool};
})();
