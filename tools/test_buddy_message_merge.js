#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'scripts/services/firebase.js'), 'utf8');
const context = vm.createContext({
  console,
  Promise,
  setTimeout,
  clearTimeout,
  state: { entries: {}, buddyEntryTombstones: {}, buddies: [] }
});
vm.runInContext(source, context, { filename: 'scripts/services/firebase.js' });

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

{
  const result = context.mergeBuddyEntryCollections(
    { buddyA: [{ id: 'local', html: 'Local only', ts: 100, kind: 'entry' }] },
    { buddyA: [{ id: 'cloud', html: 'Cloud only', ts: 200, kind: 'entry' }] },
    {},
    {}
  );
  assert.deepStrictEqual(
    plain(result.entries.buddyA.map(entry => entry.id)),
    ['local', 'cloud'],
    'local-only and cloud-only messages must both survive'
  );
}

{
  const result = context.mergeBuddyEntryCollections(
    { buddyA: [{ id: 'same', html: 'Older edit', ts: 100, editedAt: 150 }] },
    { buddyA: [{ id: 'same', html: 'Newer edit', ts: 100, editedAt: 250 }] },
    {},
    {}
  );
  assert.strictEqual(result.entries.buddyA[0].html, 'Newer edit', 'newest edit must win');
}

{
  const result = context.mergeBuddyEntryCollections(
    { buddyA: [{ id: 'deleted', html: 'Remove me', ts: 100 }] },
    {},
    {},
    { deleted: { buddyId: 'buddyA', deletedAt: 200 } }
  );
  assert.strictEqual(result.entries.buddyA, undefined, 'a newer deletion marker must suppress the entry');
  assert.strictEqual(result.tombstones.deleted.deletedAt, 200, 'active deletion marker must remain');
}

{
  const result = context.mergeBuddyEntryCollections(
    { buddyA: [{ id: 'restored', html: 'Back again', ts: 100, restoredAt: 300 }] },
    {},
    {},
    { restored: { buddyId: 'buddyA', deletedAt: 200 } }
  );
  assert.strictEqual(result.entries.buddyA[0].html, 'Back again', 'a newer restore must survive');
  assert.strictEqual(result.tombstones.restored, undefined, 'a restore must retire its older deletion marker');
}

{
  const local = { buddyA: [{ html: 'Legacy message', ts: 123, kind: 'entry', author: 'Ari' }] };
  const cloud = { buddyA: [{ html: 'Legacy message', ts: 123, kind: 'entry', author: 'Ari' }] };
  const result = context.mergeBuddyEntryCollections(local, cloud, {}, {});
  assert.strictEqual(result.entries.buddyA.length, 1, 'matching legacy messages must not duplicate');
  assert.match(result.entries.buddyA[0].id, /^legacy-/, 'legacy messages must receive a stable merge id');
}

{
  const result = context.mergeCloudBuddyLists(
    [
      { id: 'a', name: 'Local A', addedAt: 10, updatedAt: 30 },
      { id: 'b', name: 'Local B', addedAt: 20, updatedAt: 20 }
    ],
    [
      { id: 'a', name: 'Old cloud A', addedAt: 10, updatedAt: 15 },
      { id: 'c', name: 'Cloud C', addedAt: 25, updatedAt: 25 }
    ]
  );
  assert.deepStrictEqual(
    plain(result.map(buddy => [buddy.id, buddy.name])),
    [['a', 'Local A'], ['b', 'Local B'], ['c', 'Cloud C']],
    'buddy merge must retain both devices and the newest rename'
  );
}

{
  const result = context.mergeCloudBuddyLists(
    [],
    [
      { id: 'deleted-empty', name: 'Do not resurrect', addedAt: 10 },
      { id: 'needed', name: 'Owns a surviving message', addedAt: 20 }
    ],
    ['needed']
  );
  assert.deepStrictEqual(
    plain(result.map(buddy => buddy.id)),
    ['needed'],
    'cloud buddy records must return only when surviving messages still need them'
  );
}

{
  context.state = { buddyEntryTombstones: {} };
  context.Date = { now: () => 500 };
  context.recordBuddyEntryDeletion('buddyA', { id: 'messageA' });
  assert.deepStrictEqual(
    plain(context.state.buddyEntryTombstones.messageA),
    { buddyId: 'buddyA', deletedAt: 500 },
    'deleting a message must create a cloud-safe marker'
  );
}

{
  const instantMessages = fs.readFileSync(
    path.join(root, 'scripts/features/instant-messages.js'),
    'utf8'
  );
  const buddies = fs.readFileSync(path.join(root, 'scripts/features/buddies.js'), 'utf8');
  const trash = fs.readFileSync(
    path.join(root, 'scripts/core/media-and-helpers.js'),
    'utf8'
  );
  assert.ok(
    !source.includes('state.entries = cloudEntries;'),
    'cloud pull must never replace the complete local Buddy-message collection'
  );
  assert.ok(
    source.includes('transaction.set(chunkRef,{entries:chunk});') &&
      source.includes(
        'pushCloudMetaTransaction(metaRef,meta,prepareBuddyChunks,writeBuddyChunks)'
      ),
    'Buddy-message chunks and their metadata must commit in one transaction'
  );
  assert.ok(
    instantMessages.includes('recordBuddyEntryDeletion(buddyId,entry);'),
    'single-message deletion must create a sync marker'
  );
  assert.ok(
    instantMessages.includes('recordBuddyEntriesDeletion(buddyId,state.entries[buddyId]||[]);') &&
      buddies.includes('recordBuddyEntriesDeletion(b.id,state.entries[b.id]||[]);'),
    'both Buddy List deletion paths must protect every removed message'
  );
  assert.ok(
    trash.includes('entry.restoredAt=Date.now();') &&
      trash.includes('item.data.restoredAt=Date.now();'),
    'restored Buddy messages must be newer than their deletion markers'
  );
}

console.log('Buddy-message merge tests passed.');
