#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const personalization = fs.readFileSync(
  path.join(root, 'scripts/features/desktop-personalization.js'),
  'utf8'
);
const buddyList = fs.readFileSync(
  path.join(root, 'scripts/features/buddy-list.js'),
  'utf8'
);
const instantMessages = fs.readFileSync(
  path.join(root, 'scripts/features/instant-messages.js'),
  'utf8'
);

assert.ok(
  /trashClickTimer=setTimeout\(function\(\)\{\s*wiggleTrash\(\);\s*openTrashWindow\(\);/.test(
    personalization
  ),
  'a normal Trash click or tap must open the Trash window after disambiguating a double-click'
);
assert.ok(
  buddyList.includes('function editBuddyName(buddy,onRenamed)') &&
    buddyList.includes('buddy.updatedAt=Date.now();') &&
    buddyList.includes('saveState();') &&
    buddyList.includes('renderBuddyList();'),
  'Buddy renaming must save and immediately refresh the Buddy List'
);
assert.ok(
  buddyList.includes('class="bl-group-rename bl-buddy-edit"') &&
    buddyList.includes("editBuddy.addEventListener('click',beginBuddyEdit);") &&
    buddyList.includes("if(e.key!=='Enter'&&e.key!==' ')return;"),
  'every Buddy row must expose a mouse, touch, and keyboard-accessible Edit link'
);
assert.ok(
  instantMessages.includes('editBuddyName(buddy,function(nextName){'),
  'the conversation File menu must use the same working Buddy-name editor'
);

console.log('Trash and Buddy-name control tests passed.');
