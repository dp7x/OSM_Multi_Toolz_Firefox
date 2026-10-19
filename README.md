# OSM Multi Toolz for Firefox

A Firefox extension for inspecting OpenStreetMap changesets and accessing mapping and quality assurance tools. **Version 2.0** adds a viewer for deleted objects.

<img alt="OSM Multi Toolz" src="https://github.com/dp7x/OSM_Multi_Toolz_Chrome/blob/main/readme/osmmultitoolz.png" />

[Firefox Add-ons](https://addons.mozilla.org/firefox/addon/osm-changeset-analyzer/)

## Features

- Detect the changeset from an OSM changeset or object page, or enter its ID manually.
- Inspect mapper information, changeset comments, editor, date and bounding box, with translation links and alerts.
- Open OSMCha, Achavi, OSMViz, Osmose, OSM Inspector, Map Compare, LOSMET, TagInfo and Relation Analyzer.
- Save changesets to a local watchlist, with JSON import and export.
- View deleted ways and standalone nodes on a map, with all tags from their last available visible version before deletion. Nodes belonging to listed ways are hidden from the list.

The deleted-object viewer is **read-only**: it does not restore or modify OSM data. The highlighted geometry is historical; the background map shows current OSM data. Missing geometry is reported. Deleted relations are not supported yet.

Interface languages: **English, Italian and Slovak**.

## Try the repository version

1. Download and extract the repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…** and select `manifest.json`.
4. Open an OSM changeset, click the extension icon and choose a tool. Select **Deleted objects** to inspect deletions.

The temporary installation lasts until Firefox closes. For detailed Italian instructions, see [LEGGIMI_2.0.md](LEGGIMI_2.0.md).

## License and credits

Extension code: [MIT License](https://opensource.org/licenses/MIT). Bundled Leaflet and OSM attribution: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Developed by **[dp7](https://www.openstreetmap.org/user/dp7)**.
