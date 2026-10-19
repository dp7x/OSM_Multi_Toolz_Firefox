/* Render API and imported data as text, never as HTML. */
'use strict';
window.MultiToolzUI = {
  node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined && text !== null) element.textContent = String(text);
    if (className) element.className = className;
    return element;
  },
  link(text, href, title) {
    const link = this.node('a', text);
    try {
      const url = new URL(href);
      if (url.protocol === 'https:') link.href = url.href;
    } catch (_) { /* Invalid imported links are never made executable. */ }
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (title) link.title = title;
    return link;
  },
  empty(container, text) {
    container.replaceChildren(this.node('li', text, 'empty-message'));
  },
  field(label, ...content) {
    const paragraph = this.node('p');
    paragraph.append(this.node('b', `${label}:`), ' ', ...content);
    return paragraph;
  }
};
