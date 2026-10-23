// Deployment-operator command. Not an HTTP admin endpoint and never ships credentials.
import {Store,passwordHash} from '../server/storage.mjs';
import {prepareAccess,approveClinician} from '../server/care-access.mjs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
const [action,directory,email]=process.argv.slice(2);
if(!['list','approve','suspend','reset-password'].includes(action)||!directory){console.error('Usage: node scripts/clinician-account.mjs list|approve|suspend|reset-password <data-directory> [clinician-email]');process.exit(1);}
const store=new Store(resolve(directory));
try{
 prepareAccess(store);
 if(action==='list')console.log(JSON.stringify(store.db.prepare('SELECT id FROM users').all().map(r=>store.get(r.id)).filter(u=>u.profile.role==='clinician').map(u=>({email:u.profile.email,name:u.profile.displayName,approved:u.profile.clinicianApproved===true})),null,2));
 else{
  const row=store.findEmail(String(email||''));if(!row||store.get(row.id).profile.role!=='clinician')throw Error('Clinician account not found');
  if(action==='reset-password'){
   const password=randomBytes(18).toString('base64url');store.db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(password),row.id);store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.id);store.audit(row.id,'clinician_password_reset');console.log('New password (deliver privately; do not publish): '+password);
  }else{approveClinician(store,row.id,action==='approve');console.log(action==='approve'?'Clinician approved. Sign in to view connection code.':'Clinician suspended; all sessions invalidated.');}
 }
}finally{store.close();}
