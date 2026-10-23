import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAccessStatus} from '../public/care-access-ui.mjs';
import {accessText} from '../public/care-access-i18n.mjs';
const t=k=>accessText('en',k)??k;
test('Unavailable authorization status is not presented as no linked clinicians',()=>{
 const unavailable=renderAccessStatus(null,t);
 assert.match(unavailable,/careUnavailable/);
 assert.ok(!unavailable.includes(t('accessEmpty')));
 assert.match(unavailable,/data-setting="access"/);
 assert.ok(!unavailable.includes('<form'));
 const empty=renderAccessStatus([],t);
 assert.ok(empty.includes(t('accessEmpty')));
 assert.ok(empty.includes(t('linkMyDoctor')));
});
test('Connection summary excludes revoked or expired access and escapes clinician names',()=>{
 const future='2030-01-01T00:00:00Z',now=Date.parse('2026-10-21T00:00:00Z');
 const html=renderAccessStatus([{active:true,expiresAt:future,clinicianName:'<img src=x onerror=alert(1)>'},{active:false,expiresAt:future,clinicianName:'REVOKED'},{active:true,expiresAt:'2026-10-20T00:00:00Z',clinicianName:'EXPIRED'}],t,now);
 assert.ok(!html.includes('REVOKED')&&!html.includes('EXPIRED')&&!html.includes('<img'));
 assert.match(html,/&lt;img/);assert.match(html,/ · 1<\/h2>/);
});
