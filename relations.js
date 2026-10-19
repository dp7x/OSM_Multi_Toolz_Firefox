const UI = MultiToolzUI;
// relations.js
let relationsLocale = {};

async function loadLocale() {
    let lang = navigator.language.slice(0, 2).toLowerCase(); 
    if (!['it','en','sk'].includes(lang)) lang = 'en';
    try {
        const res = await fetch(browser.runtime.getURL(`LOCALES/${lang}.json`));
        return await res.json();
    } catch (err) {
        const res = await fetch(browser.runtime.getURL('LOCALES/en.json'));
        return await res.json();
    }
}

async function initializeRelations() {
    const L = await loadLocale();
    relationsLocale = L;
    applyTranslations(L);
}

function applyTranslations(L) {
    document.title = L.relations_title || "Relation Analyzer";
    document.getElementById('title').textContent = L.relations_title || "Relation Analyzer";
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'loadRelations') {
        loadRelations(request.relations, request.changesetId);
    }
});

function loadRelations(relations, changesetId) {
    const L = relationsLocale || {};
    
    const title = document.getElementById('title');
    const summary = document.getElementById('summary');
    const relationList = document.getElementById('relationList');
    
    const baseTitle = L.relations_title || "Relation Analyzer";
    title.textContent = `${baseTitle} - ${changesetId}`;
    
    const totalRelations = relations.created.length + relations.modified.length;
    
    if (totalRelations === 0) {
        const noRelationsMsg = L.relations_none || "No relations found in this changeset";
        UI.empty(relationList, noRelationsMsg);
        summary.textContent = L.relations_none_found || "No relations found";
        return;
    }
    
    // Summary
    const summaryText = L.relations_summary || "{total} relations ({created} created, {modified} modified)";
    const localizedSummary = summaryText
        .replace('{total}', totalRelations)
        .replace('{created}', relations.created.length)
        .replace('{modified}', relations.modified.length);
    
    summary.textContent = localizedSummary;
    
    relationList.replaceChildren();
    
    // Show created relations first
    relations.created.forEach(relation => {
        relationList.appendChild(createRelationElement(relation));
    });
    
    relations.modified.forEach(relation => {
        relationList.appendChild(createRelationElement(relation));
    });
}

function createRelationElement(relation) {
    const li = document.createElement('li');
    li.className = `relation-item ${relation.action}`;
    
    // Header with ID, type and action
    const header = document.createElement('div');
    header.className = 'relation-header';
    
    const idSpan = document.createElement('span');
    idSpan.className = 'relation-id';
    idSpan.textContent = `Relation #${relation.id}`;
    
    const typeSpan = document.createElement('span');
    typeSpan.className = 'relation-type';
    typeSpan.textContent = relation.type;
    
    const actionSpan = document.createElement('span');
    actionSpan.className = `relation-action ${relation.action}`;
    actionSpan.textContent = relation.action === 'created' ? 'Created' : 'Modified';
    
    header.appendChild(idSpan);
    header.appendChild(typeSpan);
    header.appendChild(actionSpan);
    
    // Links
    const links = document.createElement('div');
    links.className = 'relation-links';
    
    const analyzerLink = document.createElement('a');
    analyzerLink.href = `https://ra.osmsurround.org/analyzeRelation?relationId=${relation.id}&_noCache=on`;
    analyzerLink.target = '_blank';
    analyzerLink.textContent = 'Analyze on OSM Relation Analyzer';
    analyzerLink.className = 'relation-link';
    
    const osmLink = document.createElement('a');
    osmLink.href = `https://www.openstreetmap.org/relation/${relation.id}`;
    osmLink.target = '_blank';
    osmLink.textContent = 'View on OpenStreetMap';
    osmLink.className = 'relation-link';
    
    links.appendChild(analyzerLink);
    
    const separator = document.createElement('span');
    separator.textContent = '|';
    separator.className = 'separator';
    links.appendChild(separator);
    
    links.appendChild(osmLink);
    
    li.appendChild(header);
    li.appendChild(links);
    
    return li;
}

// Initialize
document.addEventListener('DOMContentLoaded', initializeRelations);

// Fallback
setTimeout(() => {
    const relationList = document.getElementById('relationList');
    if (relationList && relationList.children.length === 0) {
        const L = relationsLocale || {};
        UI.empty(relationList, L.relations_load_error || "Load error");
    }
}, 2000);