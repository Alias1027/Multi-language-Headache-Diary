import {validateSnapshot,JOURNAL_KEY} from './snapshot-exports.mjs';
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const AAD=enc.encode('headache-diary-android-backup-v1');
async function key(password,salt){if(typeof password!=='string'||password.length<12||password.length>1024)throw new Error('backupPassword');const k=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function encryptBackup(snapshot,password){
 const data=validateSnapshot(snapshot);delete data[JOURNAL_KEY].baseState.csrf;
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const plaintext=enc.encode(JSON.stringify(data));if(plaintext.length>40*1024*1024)throw new Error('backupSize');
 const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD},await key(password,salt),plaintext);
 return JSON.stringify({format:'headache-diary-android-backup',version:1,kdf:'PBKDF2-SHA256',iterations:310000,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(bytes))});
}
export async function decryptBackup(text,password){
 if(text.length>56*1024*1024)throw new Error('backupSize');const d=JSON.parse(text);
 if(d.format!=='headache-diary-android-backup'||d.version!==1||d.kdf!=='PBKDF2-SHA256'||d.iterations!==310000||typeof d.ciphertext!=='string')throw new Error('invalidBackup');
 const salt=un64(d.salt),iv=un64(d.iv);if(salt.length!==16||iv.length!==12)throw new Error('invalidBackup');
 let bytes;try{bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:AAD},await key(password,salt),un64(d.ciphertext));}catch{throw new Error('backupWrong');}
 return validateSnapshot(JSON.parse(dec.decode(bytes)));
}
