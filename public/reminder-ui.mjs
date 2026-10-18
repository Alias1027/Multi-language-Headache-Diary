import {uiText} from './i18n.mjs';
export const reminderText=(lang,key)=>uiText(lang,'reminders',key);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderReminders(data,{t,lang,languages,offline=false}){
 if(!data)return `<p class="notice">${esc(t('rUnavailable'))}</p>`;
 const c=data.revision?data.config:{...data.config,language:lang};
 const field=(key,name,type,value,extra='')=>`<label class="field">${esc(t(key))}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
 const check=(key,name,value)=>`<label class="check"><input name="${name}" type="checkbox" ${value?'checked':''}>${esc(t(key))}</label>`;
 return `<p class="notice">${esc(t('rSimulation'))}</p><form id="reminders-form"><fieldset class="reminder-fields" ${offline?'disabled':''}>
 <div class="form-grid">${check('rEnable','enabled',c.enabled)}${field('rTime','time','time',c.time,'required')}${field('rTimezone','timezone','text',c.timezone,'required maxlength="80"')}
 <label class="field">${esc(t('rLanguage'))}<select name="language">${Object.entries(languages).map(([key,label])=>`<option value="${key}" ${c.language===key?'selected':''}>${label}</option>`).join('')}</select></label></div>
 <fieldset class="reminder-choice"><legend>${esc(t('rDays'))}</legend><div class="chips">${[1,2,3,4,5,6,0].map(day=>`<label class="chip"><input name="weekdays" type="checkbox" value="${day}" ${c.weekdays.includes(day)?'checked':''}>${esc(new Intl.DateTimeFormat(lang,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,4+day))))}</label>`).join('')}</div></fieldset>
 <fieldset class="reminder-choice"><legend>${esc(t('rChannels'))}</legend><div class="chips">${data.connections.map(({channel})=>`<label class="chip"><input type="checkbox" name="channels" value="${channel}" ${c.channels.includes(channel)?'checked':''}>${esc(t('rChannel_'+channel))}</label>`).join('')}</div></fieldset>
 <p class="muted">${esc(t('rConnections'))}</p><div class="form-grid">${field('rEmail','email','email',c.email,'autocomplete="email" maxlength="254"')}${field('rPhone','phone','tel',c.phone,'autocomplete="tel" maxlength="30"')}</div>
 <label class="field">${esc(t('rMessage'))}<textarea dir="auto" name="message" maxlength="240" placeholder="${esc(reminderText(c.language,'defaultMessage'))}">${esc(c.message)}</textarea></label><p class="muted">${esc(t('rMessageHint'))}</p>
 <div class="form-grid">${check('rQuiet','quietEnabled',c.quietEnabled)}${field('rQuietStart','quietStart','time',c.quietStart,'required')}${field('rQuietEnd','quietEnd','time',c.quietEnd,'required')}${field('rPause','pauseUntil','date',c.pauseUntil)}</div>
 <p class="muted">${esc(t('rTimingHint'))}</p>${check('rSkip','skipCompleted',c.skipCompleted)}<p class="muted">${esc(t('rCompleteHint'))}</p>${check('rConsent','consent',c.consent)}
 <div class="actions"><button class="primary" type="submit">${esc(t('savePreferences'))}</button><button type="button" data-action="reminder-test" ${!data.revision?'disabled':''}>${esc(t('rTest'))}</button><button type="button" data-action="reminder-refresh">${esc(t('rRefresh'))}</button></div>
 <p class="muted">${esc(t('rTestHint'))}</p></fieldset></form>
 <h3>${esc(t('rHistory'))}</h3><div class="reminder-history">${data.history.slice(0,20).map(row=>`<div class="reminder-event"><strong>${esc(t('rChannel_'+row.channel))} · ${esc(t('rStatus_'+row.status))}${row.test?' · '+esc(t('rTestTag')):''}</strong><small><bdi>${esc(new Date(row.at).toLocaleString(lang,{timeZone:row.timezone}))} · ${esc(row.timezone)}</bdi></small><p dir="auto">${esc(row.message)}</p></div>`).join('')||`<p class="muted">${esc(t('rEmpty'))}</p>`}</div>`;
}
export function reminderFormData(form){
 const d=new FormData(form),str=key=>String(d.get(key)||'');
 return {enabled:d.has('enabled'),time:str('time'),timezone:str('timezone'),weekdays:d.getAll('weekdays').map(Number),channels:d.getAll('channels'),language:str('language'),message:str('message'),email:str('email').trim(),phone:str('phone').trim(),quietEnabled:d.has('quietEnabled'),quietStart:str('quietStart'),quietEnd:str('quietEnd'),skipCompleted:d.has('skipCompleted'),pauseUntil:str('pauseUntil'),consent:d.has('consent')};
}
