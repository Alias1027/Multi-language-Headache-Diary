// Read-only comparison helper for an isolated portable-launcher test directory.
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
if (!process.argv[2]) throw Error('Test data directory required');
const directory=path.resolve(process.argv[2]);
const hash=value=>createHash('sha256').update(value).digest('hex');
const db=new DatabaseSync(path.join(directory,'diary.sqlite'),{readOnly:true});
try {
  if (db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok') throw Error('SQLite integrity check failed');
  const tables={};
  for (const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()) {
    const rows=db.prepare(`SELECT * FROM "${name.replaceAll('"','""')}"`).all();
    const values=rows.map(row=>JSON.stringify(row,(_,value)=>typeof value==='bigint'?value.toString():value)).sort();
    tables[name]={rows:rows.length,sha256:hash(JSON.stringify(values))};
  }
  const files={};
  for (const name of readdirSync(directory).sort()) {
    if (/\.sqlite(?:-wal|-shm)?$|\.log$|\.pid$/.test(name)) continue;
    // The clean launcher fixture has only SQLite files, keys and a test marker.
    files[name]=hash(readFileSync(path.join(directory,name)));
  }
  console.log(JSON.stringify({integrity:'ok',tables,files}));
} finally {db.close();}
