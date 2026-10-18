import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createCipheriv,createDecipheriv,createHmac,scryptSync,timingSafeEqual,randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
export function seal(value,key,context) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(context));
  const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return JSON.stringify({alg:'A256GCM',keyId:'local-v1',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),body:body.toString('base64')});
}
export function unseal(envelope,key,context) {
  const e=JSON.parse(envelope);if(e.alg!=='A256GCM'||e.keyId!=='local-v1')throw new Error('unsupported_envelope');
  const d=createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));d.setAAD(Buffer.from(context));d.setAuthTag(Buffer.from(e.tag,'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(e.body,'base64')),d.final()]).toString('utf8'));
}
export function passwordHash(password,salt=randomBytes(16).toString('hex')) {return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function checkPassword(password,hash) {const [s,h]=hash.split(':');return timingSafeEqual(Buffer.from(h,'hex'),Buffer.from(passwordHash(password,s).split(':')[1],'hex'));}
export class Store {
  constructor(directory) {
    mkdirSync(directory,{recursive:true});this.directory=directory;
    const keyfile=path.join(directory,'local-keys.json');
    if(!existsSync(keyfile))writeFileSync(keyfile,JSON.stringify({diary:randomBytes(32).toString('base64'),hospital:randomBytes(32).toString('base64')}),{mode:0o600});
    const keys=JSON.parse(readFileSync(keyfile));this.key=Buffer.from(keys.diary,'base64');this.hospitalKey=Buffer.from(keys.hospital,'base64');
    this.db=new DatabaseSync(path.join(directory,'diary.sqlite'));this.hospital=new DatabaseSync(path.join(directory,'mock-hospital.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email_hash TEXT UNIQUE,password TEXT,profile TEXT,vault TEXT);
      CREATE TABLE IF NOT EXISTS revisions (user_id TEXT,revision INTEGER,body TEXT,PRIMARY KEY(user_id,revision));
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT,csrf TEXT,expires INTEGER);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT,event TEXT,at TEXT);
    `);
    this.hospital.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS receipts (transfer_id TEXT PRIMARY KEY,patient_id TEXT,revision INTEGER,received_at TEXT,body TEXT);');
  }
  hash(value) {return createHmac('sha256',this.key).update(value).digest('hex');}
  findEmail(email) {return this.db.prepare('SELECT * FROM users WHERE email_hash=?').get(this.hash(email.toLowerCase()));}
  createUser(email,password,vault,verified=false) {
    const id=randomUUID(),profile={email,verified,verification:randomBytes(4).toString('hex').toUpperCase(),verificationExpires:Date.now()+15*60000,verificationAttempts:0};
    this.db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(id,this.hash(email.toLowerCase()),passwordHash(password),seal(profile,this.key,id+':profile'),seal(vault,this.key,id+':vault'));return id;
  }
  get(id) {const row=this.db.prepare('SELECT * FROM users WHERE id=?').get(id);if(!row)return null;return {id,profile:unseal(row.profile,this.key,id+':profile'),vault:unseal(row.vault,this.key,id+':vault')};}
  save(user,{history=false}={}) {
    this.db.exec('BEGIN IMMEDIATE');
    try {const enc=seal(user.vault,this.key,user.id+':vault');this.db.prepare('UPDATE users SET profile=?,vault=? WHERE id=?').run(seal(user.profile,this.key,user.id+':profile'),enc,user.id);
      if(history)this.db.prepare('INSERT OR IGNORE INTO revisions VALUES (?,?,?)').run(user.id,user.vault.revision,enc);this.db.exec('COMMIT');
    } catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  session(id) {const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');this.db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(this.hash(token),id,csrf,Date.now()+12*3600000);return {token,csrf};}
  authenticate(token) {if(!token)return null;return this.db.prepare('SELECT user_id,csrf FROM sessions WHERE token_hash=? AND expires>?').get(this.hash(token),Date.now());}
  logout(token) {this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(this.hash(token));}
  audit(id,event) {this.db.prepare('INSERT INTO audit(user_id,event,at) VALUES (?,?,?)').run(id,event,new Date().toISOString());}
  audits(id) {return this.db.prepare('SELECT event,at FROM audit WHERE user_id=? ORDER BY id DESC LIMIT 50').all(id);}
  close(){this.db.close();this.hospital.close();}
}
