/* SVG template helpers shared by device renderers. Keep artwork in src/icons/*.svg. */
const HASSStudioSvg = (() => {
  const escapeXml = value => String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[ch]));

  /** Extract editable standalone SVG contents for insertion into the HA diagram. */
  const fragment = xml => {
    const match = /^\s*(?:<\?xml[^>]*>\s*)?<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/i.exec(xml);
    if (!match) throw new Error('Expected one complete standalone SVG document');
    return match[1];
  };

  /** Replace attributes/text of explicitly named SVG elements, never hand-edit paths. */
  const apply = (template, bindings) => {
    const found = new Set();
    const attributed = template.replace(/<([A-Za-z][\w:.-]*)([^<>]*?)>/g, (opening, tag, attributes) => {
      const id = /(?:^|\s)id="([^"]+)"/.exec(attributes)?.[1];
      if (!id || !Object.prototype.hasOwnProperty.call(bindings, id)) return opening;
      found.add(id);
      const updates = bindings[id];
      for (const [name, value] of Object.entries(updates)) {
        if (name === 'text') continue;
        if (!/^[a-z][a-z-]*$/.test(name)) throw new Error('Invalid SVG attribute: ' + name);
        const attr = new RegExp('(\\s)' + name + '="[^"]*"');
        const replacement = ' ' + name + '="' + escapeXml(value) + '"';
        if (attr.test(attributes)) attributes = attributes.replace(attr, replacement);
        else attributes += replacement;
      }
      return '<' + tag + attributes + '>';
    });
    const rendered = attributed.replace(/(<text\b[^>]*\bid="([^"]+)"[^>]*>)([^<]*)(<\/text>)/g,
      (whole, start, id, previous, end) =>
        Object.prototype.hasOwnProperty.call(bindings[id] || {}, 'text')
          ? start + escapeXml(bindings[id].text) + end : whole);
    for (const id of Object.keys(bindings)) {
      if (!found.has(id)) throw new Error('SVG element not found: ' + id);
    }
    return rendered;
  };

  /** Fill a named empty SVG group with renderer-generated animation SVG. */
  const inject = (template, slots) => {
    let result = template;
    for (const [id, content] of Object.entries(slots)) {
      if (!/^[a-z][a-zA-Z0-9_-]*$/.test(id)) throw new Error('Invalid SVG slot name');
      const marker = '<g id="' + id + '"></g>';
      if (result.split(marker).length !== 2) throw new Error('Expected one empty SVG slot: ' + id);
      result = result.replace(marker, '<g id="' + id + '">' + content + '</g>');
    }
    return result;
  };

  /** Namespace every SVG id/reference so repeated cards cannot collide. */
  const namespaceIds = (svg, prefix) => svg
    .replace(/(\bid=")([^"]+)(")/g, (_, a, id, z) => a + prefix + id + z)
    .replace(/url\(#([^)]+)\)/g, (_, id) => 'url(#' + prefix + id + ')')
    .replace(/(\b(?:href|xlink:href)="#)([^"]+)(")/g, (_, a, id, z) => a + prefix + id + z);

  return Object.freeze({ fragment, apply, inject, namespaceIds });
})();
