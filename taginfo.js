// taginfo.js

let currentTags = [];
let currentGrouping = 'none';
let currentMinCount = 1;
let taginfoLocale = {};
let allGroupsExpanded = false;

// --- Localization ---
async function loadLocale() {
    let lang = navigator.language.slice(0, 2).toLowerCase(); 
    if (!['it','en','sk'].includes(lang)) lang = 'en';
    try {
        const res = await fetch(browser.runtime.getURL(`LOCALES/${lang}.json`));
        return await res.json();
    } catch (err) {
        console.error("Error loading locale:", err);
        const res = await fetch(browser.runtime.getURL('LOCALES/en.json'));
        return await res.json();
    }
}

// --- Apply translations ---
function applyTranslations(L) {
    document.title = L.taginfo_title || "TagInfo - Changeset Tags";
    document.getElementById('title').textContent = L.taginfo_title || "Changeset Tags";
    document.getElementById('legendNew').textContent = L.taginfo_legend_new || "New Objects";
    document.getElementById('legendModified').textContent = L.taginfo_legend_modified || "Modified Objects";
    
    // Translate controls
    const groupBySelect = document.getElementById('groupBy');
    if (groupBySelect && L.taginfo_group_none) {
        groupBySelect.innerHTML = `
            <option value="none">${L.taginfo_group_none}</option>
            <option value="key">${L.taginfo_group_key}</option>
            <option value="prefix">${L.taginfo_group_prefix}</option>
            <option value="type">${L.taginfo_group_type}</option>
        `;
    }
    
    const minCountLabel = document.querySelector('label[for="minCount"]');
    if (minCountLabel && L.taginfo_min_occurrences) {
        minCountLabel.textContent = L.taginfo_min_occurrences;
    }
    
    const compactViewLabel = document.querySelector('label[for="compactView"]');
    if (compactViewLabel && L.taginfo_compact_view) {
        compactViewLabel.textContent = L.taginfo_compact_view;
    }
}

// --- Main function ---
async function initializeTagInfo() {
    const L = await loadLocale();
    taginfoLocale = L;
    applyTranslations(L);
}

// --- Message listener ---
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'loadTags') {
        loadTags(request.tags, request.changesetId);
    }
});

function loadTags(tags, changesetId) {
    const L = taginfoLocale || {};
    
    const title = document.getElementById('title');
    const summary = document.getElementById('summary');
    const tagList = document.getElementById('tagList');
    
    const baseTitle = L.taginfo_title || "Changeset Tags";
    title.textContent = `${baseTitle} - ${changesetId}`;
    
    currentTags = tags;
    
    if (tags.length === 0) {
        const noTagsMsg = L.taginfo_no_tags || "No tags found";
        tagList.innerHTML = `<li class="empty-message">${noTagsMsg}</li>`;
        summary.textContent = L.taginfo_no_tags_found || "No tags found";
        return;
    }
    
    // Statistics
    const totalTags = tags.reduce((sum, tag) => sum + tag.count, 0);
    const uniqueTags = tags.length;
    const createdTags = tags.filter(tag => tag.type === 'created').length;
    const modifiedTags = tags.filter(tag => tag.type === 'modified').length;
    
    const summaryText = L.taginfo_summary || "{unique} unique tags ({created} new, {modified} modified) | {total} total occurrences";
    const localizedSummary = summaryText
        .replace('{unique}', uniqueTags)
        .replace('{created}', createdTags)
        .replace('{modified}', modifiedTags)
        .replace('{total}', totalTags);
    
    summary.textContent = localizedSummary;
    
    setupControls();
    applyGroupingAndFilters();
}

function setupControls() {
    const groupBy = document.getElementById('groupBy');
    const minCount = document.getElementById('minCount');
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    
    if (groupBy) groupBy.addEventListener('change', (e) => {
        currentGrouping = e.target.value;
        applyGroupingAndFilters();
    });
    
    if (minCount) minCount.addEventListener('change', (e) => {
        currentMinCount = parseInt(e.target.value) || 1;
        applyGroupingAndFilters();
    });
    
    if (toggleAllBtn) toggleAllBtn.addEventListener('click', () => {
        toggleAllGroups();
    });
}

function toggleAllGroups() {
    const groupItems = document.querySelectorAll('.group-items');
    const toggleIcons = document.querySelectorAll('.toggle-icon');
    
    if (groupItems.length === 0) return;
    
    allGroupsExpanded = !allGroupsExpanded;
    
    groupItems.forEach(items => {
        items.classList.toggle('collapsed', !allGroupsExpanded);
    });
    
    toggleIcons.forEach(icon => {
        icon.textContent = allGroupsExpanded ? '▼' : '▶';
    });
    
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    const L = taginfoLocale || {};
    toggleAllBtn.title = allGroupsExpanded 
        ? (L.taginfo_collapse_all || "Collapse all groups") 
        : (L.taginfo_expand_all || "Expand all groups");
}

function applyGroupingAndFilters() {
    const tagList = document.getElementById('tagList');
    const L = taginfoLocale || {};
    
    const filteredTags = currentTags.filter(tag => tag.count >= currentMinCount);
    
    if (filteredTags.length === 0) {
        tagList.innerHTML = `<li class="empty-message">${L.taginfo_no_tags_filtered || "No tags"}</li>`;
        return;
    }
    
    switch (currentGrouping) {
        case 'key': renderGroupedByKey(filteredTags, tagList); break;
        case 'prefix': renderGroupedByPrefix(filteredTags, tagList); break;
        case 'type': renderGroupedByType(filteredTags, tagList); break;
        default: renderUngrouped(filteredTags, tagList);
    }
}

function renderUngrouped(tags, container) {
    container.innerHTML = '';
    tags.forEach(tag => {
        container.appendChild(createTagElement(tag)); 
    });
}

function renderGroupedByKey(tags, container) {
    const groups = {};
    tags.forEach(tag => {
        if (!groups[tag.key]) groups[tag.key] = [];
        groups[tag.key].push(tag);
    });
    renderGroups(groups, container, taginfoLocale.taginfo_group_header_key || "Key");
}

function renderGroupedByPrefix(tags, container) {
    const groups = {};
    tags.forEach(tag => {
        // Get also ":" if present
        let prefix = tag.key;
        if (tag.key.includes(':')) {
            prefix = tag.key.split(':')[0] + ':'; 
        }
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(tag);
    });
    renderGroups(groups, container, taginfoLocale.taginfo_group_header_prefix || "Prefix");
}

function renderGroupedByType(tags, container) {
    const L = taginfoLocale || {};
    const groups = {
        'created': tags.filter(tag => tag.type === 'created'),
        'modified': tags.filter(tag => tag.type === 'modified')
    };
    Object.keys(groups).forEach(key => {
        if (groups[key].length === 0) delete groups[key];
    });
    renderGroups(groups, container, L.taginfo_group_header_type || "Type");
}

function renderGroups(groups, container, groupType) {
    const L = taginfoLocale || {};
    container.innerHTML = '';
    
    const sortedGroups = Object.entries(groups)
        .filter(([_, items]) => items.length > 0)
        .sort(([_, a], [__, b]) => b.length - a.length);
    
    if (sortedGroups.length === 0) {
        container.innerHTML = `<li class="empty-message">${L.taginfo_no_tags_filtered || "No tags"}</li>`;
        return;
    }
    
    sortedGroups.forEach(([groupName, items]) => {
        const groupElement = document.createElement('li');
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        
        // Main content
        const headerContent = document.createElement('span');
        
        // Toggle Icon
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '▶';
        headerContent.appendChild(toggleIcon);
        
        // Group text
        let displayGroupName = groupName;
        if (groupType === (L.taginfo_group_header_type || "Type")) {
            if (groupName === 'created') displayGroupName = L.taginfo_type_new || "New";
            else if (groupName === 'modified') displayGroupName = L.taginfo_type_modified || "Modified";
        }
        
        const groupText = document.createTextNode(` ${groupType}: ${displayGroupName} `);
        headerContent.appendChild(groupText);
        
        // Counter
        const groupCount = document.createElement('span');
        groupCount.className = 'group-count';
        groupCount.textContent = items.length;
        headerContent.appendChild(groupCount);
        
		//TAGINFO Universal link
        if (groupType === (L.taginfo_group_header_key || "Key") || 
            groupType === (L.taginfo_group_header_prefix || "Prefix")) {
            
            const tagInfoLink = document.createElement('a');
            
            tagInfoLink.href = `https://taginfo.openstreetmap.org/keys/${encodeURIComponent(groupName)}`;
            tagInfoLink.title = L.taginfo_link_key || 'View on TagInfo';
            tagInfoLink.target = '_blank';
            tagInfoLink.className = 'tag-link';
            tagInfoLink.style.marginLeft = '10px';
            tagInfoLink.style.fontSize = '11px';
            tagInfoLink.textContent = '🔍';
            headerContent.appendChild(tagInfoLink);
        }
        
        groupHeader.appendChild(headerContent);
        
        const groupItems = document.createElement('div');
        groupItems.className = 'group-items collapsed';
        
		items.forEach(tag => {
			groupItems.appendChild(createTagElement(tag)); 
		});
        
        groupHeader.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            
            const isCollapsed = groupItems.classList.contains('collapsed');
            groupItems.classList.toggle('collapsed', !isCollapsed);
            toggleIcon.textContent = isCollapsed ? '▼' : '▶';
        });
        
        groupElement.appendChild(groupHeader);
        groupElement.appendChild(groupItems);
        container.appendChild(groupElement);
    });
}

function createTagElement(tag) {
    const L = taginfoLocale || {};
    
    const li = document.createElement('li');
    li.className = `tag-item ${tag.type}`;
    
    const tagContent = document.createElement('div');
    tagContent.className = 'tag-content';
    
    // Type badge
    const typeBadge = document.createElement('span');
    typeBadge.className = `tag-type ${tag.type}`;
    let typeLabel = tag.type === 'created' ? (L.taginfo_type_new || "New") : (L.taginfo_type_modified || "Modified");
    typeBadge.textContent = typeLabel;
    
    // Count badge
    const countBadge = document.createElement('span');
    countBadge.className = 'tag-count';
    countBadge.textContent = tag.count;
    
    // Tag text
    const tagText = document.createElement('span');
    tagText.className = 'tag-text';
    tagText.innerHTML = `<span class="tag-key">${tag.key}</span><span class="tag-value">=${tag.value}</span>`;
    
    // Links 
    const links = document.createElement('div');
    links.className = 'tag-links';
    
    const keyLink = document.createElement('a');
    keyLink.href = `https://taginfo.openstreetmap.org/keys/${encodeURIComponent(tag.key)}`;
    keyLink.target = '_blank';
    keyLink.textContent = L.taginfo_link_key || "Key";
    keyLink.className = 'tag-link';
    
    const kvLink = document.createElement('a');
    kvLink.href = `https://taginfo.openstreetmap.org/tags/${encodeURIComponent(tag.key)}=${encodeURIComponent(tag.value)}`;
    kvLink.target = '_blank';
    kvLink.textContent = L.taginfo_link_keyvalue || "Key=Value";
    kvLink.className = 'tag-link';
    
    links.appendChild(keyLink);
    
    const separator = document.createElement('span');
    separator.textContent = '|';
    separator.className = 'separator';
    links.appendChild(separator);
    
    links.appendChild(kvLink);
    
    tagContent.appendChild(typeBadge);
    tagContent.appendChild(countBadge);
    tagContent.appendChild(tagText);
    
    li.appendChild(tagContent);
    li.appendChild(links);
    
    return li;
}

// Initialize
document.addEventListener('DOMContentLoaded', initializeTagInfo);

// Fallback
setTimeout(() => {
    const tagList = document.getElementById('tagList');
    if (tagList && tagList.children.length === 0) {
        const L = taginfoLocale || {};
        tagList.innerHTML = `<li class="empty-message">${L.taginfo_load_error || "Load error"}</li>`;
    }
}, 2000);