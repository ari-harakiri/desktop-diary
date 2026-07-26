  function entryMatchesTypeFilter(entry, filter){
    if(!filter) return true;
    var content = (entry.html !== undefined) ? entry.html : (entry.text || '');
    if(filter === 'photo') return /<img/i.test(content);
    if(filter === 'voice') return /<audio/i.test(content);
    if(filter === 'prompt') return entry.kind === 'prompt';
    return true;
  }

  function entryMatchesSearch(entry, query){
    if(!query) return true;
    var content = (entry.html !== undefined) ? entry.html : (entry.text || '');
    var haystack = stripHtmlTags(content).toLowerCase() + ' ' + (entry.statusLabel || '').toLowerCase();
    return haystack.indexOf(query.toLowerCase()) !== -1;
  }

