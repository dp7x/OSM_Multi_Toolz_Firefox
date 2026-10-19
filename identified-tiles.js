/* Identify this extension when its internal page has no HTTP Referer.
 * See https://wiki.openstreetmap.org/wiki/Referer
 * Browser HTTP cache is preserved; only visible Leaflet tiles are requested.
 */
'use strict';
window.MultiToolzTileLayer = L.TileLayer.extend({
  createTile(coords, done) {
    const tile = document.createElement('img');
    tile.alt = '';
    tile.setAttribute('role', 'presentation');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    tile._requestController = controller;
    tile._requestTimeout = timeout;
    const finish = error => {
      clearTimeout(timeout);
      tile._requestTimeout = null;
      if (tile._removed) return;
      tile.onload = tile.onerror = null;
      if (tile._objectURL) {
        URL.revokeObjectURL(tile._objectURL);
        tile._objectURL = null;
      }
      done(error, tile);
    };
    tile.onload = () => finish(null);
    tile.onerror = () => finish(new Error('Cannot decode map tile'));
    fetch(this.getTileUrl(coords), {
      headers: {
        'Accept': 'image/png',
        'X-Requested-With': 'OSM-MultiToolz (+https://github.com/dp7x/OSM_Multi_Toolz_Firefox)'
      },
      credentials: 'omit',
      signal: controller.signal
    }).then(response => {
      if (!response.ok || response.headers.has('x-blocked')) throw new Error(`Map tile: HTTP ${response.status}`);
      return response.blob();
    }).then(blob => {
      if (controller.signal.aborted) return;
      tile._objectURL = URL.createObjectURL(blob);
      tile.src = tile._objectURL;
    }).catch(error => finish(error));
    return tile;
  },
  _removeTile(key) {
    const tile = this._tiles[key]?.el;
    if (tile) {
      tile._removed = true;
      clearTimeout(tile._requestTimeout);
      tile._requestController?.abort();
      tile.onload = tile.onerror = null;
      if (tile._objectURL) URL.revokeObjectURL(tile._objectURL);
    }
    L.TileLayer.prototype._removeTile.call(this, key);
  }
});
