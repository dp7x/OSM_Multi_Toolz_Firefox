# OSM Multi Toolz Firefox Extension

**OSM Multi Toolz** is a Firefox extension designed for OpenStreetMap contributors who want to quickly analyze changesets directly from the browser. It shows detailed user information, comments, bounding boxes, and provides quick links to useful OSM tools.

<img alt="OSM Multi Toolz" src="https://github.com/dp7x/OSM_Multi_Toolz_chrome/blob/main/readme/osmmultitoolz.png" />

---

## Features

- Automatic detection of the changeset from the current OSM page  
- Display user details:  
  - Username with profile link  
  - Total number of changesets  
  - Account creation date (`Mapper since`)  
  - Last changeset date (`Last map edit`)  
  - Number of GPX traces uploaded  
- Display changeset details:  
  - Comment (or indication if missing)  
  - Editor used (JOSM, iD, etc.)  
  - Bounding box with link and copy-to-clipboard button  
  - Changeset date with alerts for old or very large changesets  
- Quick access buttons to popular OSM tools:  
  - [OSMCha](https://osmcha.org)  
  - [Achavi](https://overpass-api.de/achavi/)  
  - [OSMViz](https://resultmaps.neis-one.org/osm-change-viz)  
  - [OSMOSE](https://osmose.openstreetmap.fr/)  
  - [OSM Inspector](https://tools.geofabrik.de/osmi/)  
  - [Map Compare](https://mc.bbbike.org/)  
  - [LOSMET](https://resultmaps.neis-one.org/osm-edits-tile/)  

---

## Installation (Development / Testing)

1. Download all files from this repository.  
2. Open Firefox and go to: `about:debugging#/runtime/this-firefox`  
3. Click **Load Temporary Add-on…**  
4. Select the `manifest.json` file from the extension folder.  

> ⚠️ Note: this installs the extension temporarily. It will be removed when Firefox is closed.  
> For permanent installation you need to [sign the extension on AMO](https://addons.mozilla.org/).  

---

## Usage

1. Navigate to an OpenStreetMap changeset or object page.  
2. Click the **OSM Multi Toolz** extension icon.  
3. The popup will automatically display detailed information about the changeset and user.  
4. Optionally, you can manually enter a changeset ID in the input box and click **Load**.  
5. Click one of the tool buttons for a deeper analysis.  

---

## Localization

The extension currently supports multiple languages (English, Italian, Slovak).  
Additional translations can be added in the `LOCALES` folder.  

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).  

---

## Credits

Developed by **dp7** – [OpenStreetMap profile](https://www.openstreetmap.org/user/dp7)  
