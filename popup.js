const UI = MultiToolzUI;
// --- Localization ---
async function loadLocale() {
    let lang = navigator.language.slice(0, 2).toLowerCase(); // primi due caratteri
    if (!['it','en','sk'].includes(lang)) lang = 'en'; // fallback a inglese
    const res = await fetch(`LOCALES/${lang}.json`);
    return await res.json();
}

// --- Global variable storing the current user ---
let currentUser = "";
let currentComment = "";

document.addEventListener('DOMContentLoaded', async () => {
    const L = await loadLocale();

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    const url = new URL(tab.url);

    const changesetInput = document.getElementById('changesetInput');
    const detailsDiv = document.getElementById('details');
    const alertsDiv = document.getElementById('alerts');
    const changesetIdSpan = document.getElementById('changesetId');

    // --- Localized texts update ---
    document.title = L.extName;
    document.getElementById('headerTitle').textContent = L.extName;
    document.getElementById('headerSubtitle').textContent = L.headerTitle; 
    document.getElementById('changesetLabel').textContent = L.changesetDetected;
    document.getElementById('manualLabel').textContent = L.manualChangeset;
    document.getElementById('osmchaBtn').textContent = L.btn_osmcha;
    document.getElementById('achaviBtn').textContent = L.btn_achavi;
    document.getElementById('osmvizBtn').textContent = L.btn_osmviz;
    document.getElementById('osmoseBtn').textContent = L.btn_osmose;
    document.getElementById('osminspectorBtn').textContent = L.btn_osminspector;
    document.getElementById('mapcompareBtn').textContent = L.btn_mapcompare;
    document.getElementById('losmeBtn').textContent = L.btn_losme;
    document.getElementById('taginfoBtn').textContent = L.btn_taginfo || "TagInfo"; 
	document.getElementById('relationAnalyzerBtn').textContent = L.btn_relation_analyzer; 	

    document.getElementById("deletedObjectsBtn").textContent = L.deleted_button;

    // --- Functions ---
    async function resolveChangesetFromObject(type, objId) {
        try {
            const res = await fetch(`https://api.openstreetmap.org/api/0.6/${type}/${objId}`);
            if (res.status === 410) {
                const history = await fetch(`https://api.openstreetmap.org/api/0.6/${type}/${objId}/history`);
                if (!history.ok) throw new Error(`OSM API: HTTP ${history.status}`);
                const doc = new DOMParser().parseFromString(await history.text(), "application/xml");
                return Array.from(doc.querySelectorAll(type)).at(-1)?.getAttribute("changeset") || null;
            }
            if (!res.ok) throw new Error(`OSM API: HTTP ${res.status}`);
            const xmlText = await res.text();
            const xml = new DOMParser().parseFromString(xmlText, "application/xml");
            const el = xml.querySelector(type);
            if (!el) throw new Error("Object not found");
            return el.getAttribute("changeset");
        } catch (err) {
            console.error(`Error getting changeset from ${type}/${objId}`, err);
            return null;
        }
    }

    async function renderChangeset(changesetId) {
        if (!/^[1-9]\d*$/.test(String(changesetId))) return;
        const deletedButton = document.getElementById('deletedObjectsBtn');
        deletedButton.disabled = true;
        deletedButton.onclick = null;

        changesetInput.value = changesetId;

        try {
            const response = await fetch(`https://api.openstreetmap.org/api/0.6/changeset/${changesetId}`);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, "application/xml");
            const cs = xml.querySelector("changeset");
            if (!cs) throw new Error("Changeset not foundù");

            const commentCount = parseInt(cs.getAttribute("comments_count"), 10) || 0;

            changesetIdSpan.replaceChildren(UI.link(changesetId, `https://www.openstreetmap.org/changeset/${changesetId}`));
            if (commentCount > 0) {
                const discussion = UI.link(`💬 ${commentCount}`, `https://www.openstreetmap.org/changeset/${changesetId}#comments`);
                discussion.style.marginLeft = '10px'; changesetIdSpan.append(discussion);
            }

            const user = cs.getAttribute("user");
            currentUser = user || "—";
            const uid = cs.getAttribute("uid");
            const createdAt = new Date(cs.getAttribute("created_at"));
            const createdStr = createdAt.toLocaleString();
            const comment = cs.querySelector('tag[k="comment"]')?.getAttribute("v") || "";
            currentComment = comment;
			const editor = cs.querySelector('tag[k="created_by"]')?.getAttribute("v") || "";
            const minlat = parseFloat(cs.getAttribute("min_lat"));
            const maxlat = parseFloat(cs.getAttribute("max_lat"));
            const minlon = parseFloat(cs.getAttribute("min_lon"));
            const maxlon = parseFloat(cs.getAttribute("max_lon"));
            const bboxStr = `${minlat.toFixed(3)}, ${minlon.toFixed(3)}, ${maxlat.toFixed(3)}, ${maxlon.toFixed(3)}`;
            const bboxLink = `https://www.openstreetmap.org/?minlat=${minlat}&minlon=${minlon}&maxlat=${maxlat}&maxlon=${maxlon}`;

            const latDiff = maxlat - minlat;
            const lonDiff = maxlon - minlon;
			
			// --- helper date format dd/mm/yyyy ---
			function formatDateDMY(dateStr) {
				if (!dateStr) return "—";
				const d = new Date(dateStr);
				const day = d.getDate();
				const month = d.getMonth() + 1;
				const year = d.getFullYear();
				return `${day}/${month}/${year}`;
			}

	// --- Function to get modified tags from changeset ---
	async function getModifiedTags(changesetId) {
		try {
			// Get changeset details to find modified elements
			const response = await fetch(`https://api.openstreetmap.org/api/0.6/changeset/${changesetId}/download`);
			const xmlText = await response.text();
			const parser = new DOMParser();
			const xml = parser.parseFromString(xmlText, "application/xml");

			const createdTags = new Map();
			const modifiedTags = new Map();
			
			// Process CREATED elements (brand new objects)
			const createElements = xml.querySelectorAll('create > *');
			createElements.forEach(element => {
				const tags = element.querySelectorAll('tag');
				tags.forEach(tag => {
					const k = tag.getAttribute("k");
					const v = tag.getAttribute("v");
					if (k && v) {
						const tagStr = `${k}=${v}`;
						createdTags.set(tagStr, (createdTags.get(tagStr) || 0) + 1);
					}
				});
			});

			// Process MODIFIED elements (pre-existing objects that were changed)
			const modifyElements = xml.querySelectorAll('modify > *');
			modifyElements.forEach(element => {
				const tags = element.querySelectorAll('tag');
				tags.forEach(tag => {
					const k = tag.getAttribute("k");
					const v = tag.getAttribute("v");
					if (k && v) {
						const tagStr = `${k}=${v}`;
						modifiedTags.set(tagStr, (modifiedTags.get(tagStr) || 0) + 1);
					}
				});
			});

			// Combine both maps into a single array with type information
			const allTags = [];
			
			// Add created tags
			createdTags.forEach((count, tagStr) => {
				const [key, ...valueParts] = tagStr.split('=');
				const value = valueParts.join('=');
				allTags.push({ 
					key, 
					value, 
					full: tagStr, 
					count, 
					type: 'created',
					typeLabel: 'New'
				});
			});

			// Add modified tags
			modifiedTags.forEach((count, tagStr) => {
				const [key, ...valueParts] = tagStr.split('=');
				const value = valueParts.join('=');
				allTags.push({ 
					key, 
					value, 
					full: tagStr, 
					count, 
					type: 'modified',
					typeLabel: 'Modified'
				});
			});

			// Sort: first by type (created first), then by count (descending), then by key (ascending)
			const sortedTags = allTags.sort((a, b) => {
				// First by type: created before modified
				if (a.type !== b.type) {
					return a.type === 'created' ? -1 : 1;
				}
				// Then by count (descending)
				if (b.count !== a.count) {
					return b.count - a.count;
				}
				// Then by key (ascending)
				return a.key.localeCompare(b.key);
			});

			return sortedTags;

		} catch (err) {
			console.error("Error getting modified tags:", err);
			// Fallback: return changeset tags if we can't get modified ones
			const changesetTags = await getChangesetTags(changesetId);
			// Add count=1 and type='unknown' for fallback tags
			return changesetTags.map(tag => ({ 
				...tag, 
				count: 1, 
				type: 'unknown',
				typeLabel: 'Unknown'
			}));
		}
	}
	
	// --- Function to get relations from changeset ---
	async function getChangesetRelations(changesetId) {
		try {
			const response = await fetch(`https://api.openstreetmap.org/api/0.6/changeset/${changesetId}/download`);
			const xmlText = await response.text();
			const parser = new DOMParser();
			const xml = parser.parseFromString(xmlText, "application/xml");

			const relations = {
				created: [],
				modified: []
			};

			// Process created relations
			const createdRelations = xml.querySelectorAll('create > relation');
			createdRelations.forEach(relation => {
				const id = relation.getAttribute('id');
				const typeTag = relation.querySelector('tag[k="type"]');
				const type = typeTag ? typeTag.getAttribute('v') : 'unknown';
				relations.created.push({ id, type, action: 'created' });
			});

			// Process modified relations  
			const modifiedRelations = xml.querySelectorAll('modify > relation');
			modifiedRelations.forEach(relation => {
				const id = relation.getAttribute('id');
				const typeTag = relation.querySelector('tag[k="type"]');
				const type = typeTag ? typeTag.getAttribute('v') : 'unknown';
				relations.modified.push({ id, type, action: 'modified' });
			});

			return relations;

		} catch (err) {
			console.error("Error getting changeset relations:", err);
			return { created: [], modified: [] };
		}
	}
	

 			// --- Retrieve user info (changeset count, account_created, traces) ---
			let changesetCount = "?";
			let mapperSinceStr = "—";
			let lastEditStr = "—";
			let tracesCount = "0";

			try {
				const userRes = await fetch(`https://api.openstreetmap.org/api/0.6/user/${uid}`);
				const userText = await userRes.text();
				const userDoc = parser.parseFromString(userText, "application/xml");

				// total number of changesets
				changesetCount = userDoc.querySelector("changesets")?.getAttribute("count") || "?";

				// account_created -> Mapper since
				const accountCreated = userDoc.querySelector("user")?.getAttribute("account_created") || "";
				mapperSinceStr = formatDateDMY(accountCreated);

				// GPS traces
				tracesCount = userDoc.querySelector("traces")?.getAttribute("count") || "0";

				// --- last changeset ---
				const changesetsRes = await fetch(`https://api.openstreetmap.org/api/0.6/changesets?user=${uid}`);
				const changesetsXml = await changesetsRes.text();
				const changesetsDoc = parser.parseFromString(changesetsXml, "application/xml");
				const lastChangesetNode = changesetsDoc.querySelector("changeset");
				const lastChangesetDate = lastChangesetNode?.getAttribute("created_at") || "";
				lastEditStr = formatDateDMY(lastChangesetDate);

			} catch (err) {
				console.error("Error getting user info:", err);
			}

            // Build the interface using text nodes for all API values.
            alertsDiv.replaceChildren();
            const addAlert = text => alertsDiv.append(UI.node('p', text));
            if (!comment) addAlert(L.alertNoComment);
            if (latDiff > 1 || lonDiff > 1) addAlert(L.alertLargeArea);
            const changesCount = cs.getAttribute('changes_count') || cs.getAttribute('num_changes') || '?';
            if (!isNaN(changesCount)) {
                if (changesCount < 10) addAlert(L.alertSmallChangeset);
                else if (changesCount > 5000) addAlert(L.alertHugeChangeset);
            }
            const ageYears = (new Date() - createdAt) / (1000*60*60*24*365);
            const tooOld = ageYears > 2;
            if (tooOld) addAlert(L.alertOldChangeset);
            const translateLink = `https://translate.google.com/?sl=auto&tl=${encodeURIComponent(navigator.language.split('-')[0] || 'en')}&text=${encodeURIComponent(comment)}`;
            const userRow = UI.field(L.user, `${user} (`, UI.node('strong', changesetCount), ') ',
                UI.link(L.osmProfile, `https://www.openstreetmap.org/user/${encodeURIComponent(user)}`), ' | ',
                UI.link(L.hdyc, `https://hdyc.neis-one.org/?${encodeURIComponent(user)}`), ' | ',
                UI.link(L.message, `https://www.openstreetmap.org/messages/new/${encodeURIComponent(user)}`));
            const icons = UI.node('p', null, 'details-icons');
            for (const [title, value] of [[L.mapperSince, `⏳ ${mapperSinceStr}`], [L.lastEdit, `🕒 ${lastEditStr}`], [L.traces, `🛰️ ${tracesCount}`]]) {
                if (icons.childNodes.length) icons.append(' | ');
                const span = UI.node('span', value); span.title = title; icons.append(span);
            }
            const commentRow = UI.field(L.comment, comment || L.missingComment);
            if (comment) commentRow.append(' ', UI.link('🌐', translateLink, 'Translate comment'));
            const dateRow = UI.field(L.changesetDate, createdStr);
            if (tooOld) dateRow.style.color = 'orange';
            const bboxRow = UI.field(L.bbox, UI.link(bboxStr, bboxLink));
            const copy = UI.node('a', `📋 ${L.copy}`); copy.href = '#'; copy.id = 'copyBbox'; copy.style.marginLeft = '8px';
            bboxRow.append(' ', copy);
            detailsDiv.replaceChildren(userRow, icons, commentRow,
                UI.field(L.editor || 'Editor', editor || L.missingEditor || '-'), dateRow, bboxRow);

            document.getElementById('copyBbox').addEventListener('click', (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(bboxStr).then(() => {
                    e.target.textContent = `✅ ${L.copied}`;
                    setTimeout(() => e.target.textContent = `📋 ${L.copy}`, 1500);
                });
            });

            const expandFactor = 0.2;
            const latMargin = latDiff * expandFactor || 0.05;
            const lonMargin = lonDiff * expandFactor || 0.05;
            const bbox = [minlon - lonMargin, minlat - latMargin, maxlon + lonMargin, maxlat + latMargin].join(",");
            const centerLat = (minlat + maxlat) / 2;
            const centerLon = (minlon + maxlon) / 2;

            // --- Pulsanti ---
            deletedButton.disabled = false;
            deletedButton.onclick = () => browser.windows.create({
                url: browser.runtime.getURL(`deleted.html?changeset=${changesetId}`),
                type: 'popup', width: 650, height: 620
            });

            const openTab = (link) => browser.tabs.create({ url: link });

            document.getElementById('osmoseBtn').onclick = () => {
                if(tooOld) alert(L.alertOldChangeset);
                const link = `https://osmose.openstreetmap.fr/en/map/#zoom=12&lat=${centerLat}&lon=${centerLon}&bbox=${bbox}&username=${encodeURIComponent(user)}`;
                openTab(link);
            };
            document.getElementById('osmchaBtn').onclick = () => {
                if(tooOld) alert(L.alertOldChangeset);
                openTab(`https://osmcha.org/changesets/${changesetId}`);
            };
            document.getElementById('achaviBtn').onclick = () => {
                if(tooOld) alert(L.alertOldChangeset);
                openTab(`https://overpass-api.de/achavi/?changeset=${changesetId}`);
            };
            document.getElementById('osmvizBtn').onclick = () => {
                if(tooOld) alert(L.alertOldChangeset);
                openTab(`https://resultmaps.neis-one.org/osm-change-viz?c=${changesetId}`);
            };
            document.getElementById('osminspectorBtn').onclick = () => {
                if(tooOld) alert(L.alertOldChangeset);
                openTab(`https://tools.geofabrik.de/osmi/?view=geometry&lon=${centerLon}&lat=${centerLat}&zoom=15&baselayer=Geofabrik%20Standard`);
            };
            document.getElementById('mapcompareBtn').onclick = () => {
                if(tooOld) alert(L.alertOldChangeset);
                openTab(`https://mc.bbbike.org/mc/?lon=${centerLon}&lat=${centerLat}&zoom=15`);
            };
			document.getElementById('losmeBtn').onclick = () => {
                if (tooOld) alert("This changeset is too old, LOSMET may not display it correctly..");
                openTab(`https://resultmaps.neis-one.org/osm-edits-tile/#14/${centerLat}/${centerLon}`);
            };
			
			// --- TagInfo Button ---
			document.getElementById('taginfoBtn').onclick = async () => {
				const tags = await getModifiedTags(changesetId);
				browser.tabs.create({
					url: browser.runtime.getURL('taginfo.html')
				});
				// Invia i dati dopo un delay
				setTimeout(() => {
					browser.tabs.query({}, (tabs) => {
						browser.tabs.sendMessage(tabs[tabs.length - 1].id, {
							action: 'loadTags',
							tags: tags,
							changesetId: changesetId
						});
					});
				}, 500);
			};

			// --- Relation Analyzer Button ---
			document.getElementById('relationAnalyzerBtn').onclick = async () => {
				const relations = await getChangesetRelations(changesetId);
				browser.tabs.create({
					url: browser.runtime.getURL('relations.html')
				});
				// Invia i dati dopo un delay
				setTimeout(() => {
					browser.tabs.query({}, (tabs) => {
						browser.tabs.sendMessage(tabs[tabs.length - 1].id, {
							action: 'loadRelations',
							relations: relations,
							changesetId: changesetId
						});
					});
				}, 500);
			};

			// --- Watchlist Button ---
			document.getElementById('openWatchlistBtn').addEventListener('click', () => {
				browser.tabs.create({
					url: browser.runtime.getURL('watchlist.html')
				});
			});

        } catch (err) {
            const errorMessage = UI.node('p', 'Error getting data'); errorMessage.style.color = 'red'; alertsDiv.replaceChildren(errorMessage);
            console.error(err);
        }
    }

    // --- Determine changeset from URL ---
    let changesetId = null;
    let match;
    if ((match = url.pathname.match(/^\/changeset\/(\d+)/))) {
        changesetId = match[1];
    } else if ((match = url.pathname.match(/^\/(node|way|relation)\/(\d+)/))) {
        changesetId = await resolveChangesetFromObject(match[1], match[2]);
    }

    if (changesetId) {
        await renderChangeset(changesetId);
    } else {
        changesetIdSpan.textContent = L.changesetDetected + ": --";
    }

    // --- Manual loading button ---
    document.getElementById('loadBtn').addEventListener('click', async () => {
        const manualId = changesetInput.value.trim();
        if (manualId) {
            await renderChangeset(manualId);
        }
    });
	
	// === Watchlist buttons ===
	document.getElementById("addToWatchlistBtn").title = L.btn_addWatchlist;
	document.getElementById("openWatchlistBtn").title = L.btn_openWatchlist;

	document.getElementById("addToWatchlistBtn").addEventListener("click", async () => {
		const changesetId = changesetInput.value.trim();
		if (!changesetId) {
			alert(L.alert_noChangeset);
			return;
		}

		const link = `https://www.openstreetmap.org/changeset/${changesetId}`;
		const user = currentUser || "—";

		const comment = currentComment || "—";

		const { watchlist = [] } = await browser.storage.local.get("watchlist");

		// Duplicates control
		if (watchlist.some(entry => entry.id === changesetId)) {
			alert(L.alert_watchlistExists);
			return;
		}

		// Create new entry WITH DATE
		const newEntry = {
			id: changesetId,
			user: user,
			comment: comment,
			link: link,
			addedDate: new Date().toISOString()
		};

		watchlist.push(newEntry);
		await browser.storage.local.set({ watchlist });

		alert(L.alert_watchlistAdded);
	});

});
