const UI = MultiToolzUI;
// watchlist.js

// --- Localization ---
async function loadLocale() {
  let lang = navigator.language.slice(0, 2).toLowerCase();
  if (!['it', 'en', 'sk'].includes(lang)) lang = 'en';
  const res = await fetch(`LOCALES/${lang}.json`);
  return await res.json();
}

// --- Export JSON Function ---
async function exportWatchlistJSON() {
  const { watchlist = [] } = await browser.storage.local.get("watchlist");
  const L = await loadLocale();
  
  if (watchlist.length === 0) {
    alert(L.watchlist_empty || "Watchlist is empty");
    return;
  }

  const content = JSON.stringify(watchlist, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'watchlist-export.json';
  a.click();
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// --- Import JSON Function ---
async function importWatchlistJSON() {
  const L = await loadLocale();
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      // Validate the imported data structure
      if (!Array.isArray(importedData)) {
        throw new Error(L.import_invalid_format || "Invalid file format");
      }
      
      // Basic validation of items
      const isValid = importedData.every(item => 
        item && typeof item === 'object' && 
        item.id && item.user && item.comment && item.link
      );
      
      if (!isValid) {
        throw new Error(L.import_invalid_data || "Invalid data structure");
      }
      
      // Ask for confirmation before overwriting
      const currentData = await browser.storage.local.get("watchlist");
      const currentCount = currentData.watchlist ? currentData.watchlist.length : 0;
      const importCount = importedData.length;
      
      const message = currentCount > 0 
        ? L.import_confirm_replace?.replace('{current}', currentCount).replace('{new}', importCount) 
          || `Current watchlist has ${currentCount} items. Replace with ${importCount} items?`
        : L.import_confirm?.replace('{count}', importCount) 
          || `Import ${importCount} items?`;
      
      if (!confirm(message)) return;
      
      // Save imported data
      await browser.storage.local.set({ watchlist: importedData });
      alert(L.import_success?.replace('{count}', importCount) || `Successfully imported ${importCount} items!`);
      
      // Reload the watchlist
      loadWatchlist();
      
    } catch (error) {
      alert(L.import_error || "Import error: " + error.message);
    }
  };
  
  input.click();
}

// --- Modified loadWatchlist function ---
async function loadWatchlist() {
  const L = await loadLocale();
  const { watchlist = [] } = await browser.storage.local.get("watchlist");
  const listDiv = document.getElementById("watchlist");
  listDiv.replaceChildren();

  document.title = L.watchlist_title;

  // Add export/import buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "buttons-container";
  for (const [id, label, className] of [['exportBtn', L.export_json, 'export-btn'], ['importBtn', L.import_json, 'import-btn']]) {
    const button = UI.node('button', label, className); button.id = id; buttonsContainer.append(button);
  }
  
  listDiv.appendChild(buttonsContainer);

  // Add event listeners
  document.getElementById("exportBtn").addEventListener('click', exportWatchlistJSON);
  document.getElementById("importBtn").addEventListener('click', importWatchlistJSON);

  if (watchlist.length === 0) {
    listDiv.append(UI.node('p', L.watchlist_empty));
    return;
  }

  // Add items count
  const countDiv = document.createElement("div");
  countDiv.className = "watchlist-count";
  const count = UI.node('p'); count.append(UI.node('strong', `${L.total_items}: ${watchlist.length}`)); countDiv.append(count);
  listDiv.appendChild(countDiv);

	// Watchlist items
	watchlist.forEach(entry => {
		const item = document.createElement("div");
		item.className = "watchlist-item";
		
		const cleanComment = String(entry.comment || '').replace('🌐', '').trim();
		
		// Formatta la data (se esiste, altrimenti usa data corrente per compatibilità)
		let addedDate = "Unknown date";
		if (entry.addedDate) {
			addedDate = new Date(entry.addedDate).toLocaleDateString();
		}
		
        const info = UI.node('div', null, 'watchlist-info');
        const idBox = UI.node('div', null, 'changeset-id');
        const id = String(entry.id);
        if (/^[1-9]\d*$/.test(id)) idBox.append(UI.link(id, `https://www.openstreetmap.org/changeset/${id}`));
        else idBox.textContent = id;
        const userBox = UI.node('div', null, 'changeset-user'); userBox.append(UI.node('b', entry.user));
        const dateBox = UI.node('div', `📅 ${addedDate}`, 'changeset-date');
        dateBox.style.cssText = 'font-size:11px;color:#888;margin-top:2px';
        info.append(idBox, userBox, UI.node('div', cleanComment, 'changeset-comment'), dateBox);
        const links = UI.node('div', null, 'watchlist-links');
        const remove = UI.node('button', '❌', 'removeBtn'); remove.title = L.btn_remove || 'Remove'; links.append(remove);
        item.append(info, links);

		item.querySelector(".removeBtn").addEventListener("click", async () => {
			if (confirm("Are you sure you want to remove this changeset from the watchlist?")) {
				const newList = watchlist.filter(e => e.id !== entry.id);
				await browser.storage.local.set({ watchlist: newList });
				loadWatchlist();
			}
		});

		listDiv.appendChild(item);
	});
}

document.addEventListener("DOMContentLoaded", loadWatchlist);