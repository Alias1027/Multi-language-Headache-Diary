// Conservative, deterministic bilingual extraction. Suggestions never write records.
import {medicationIsAdvice} from './voice-review.mjs';
export const EXTRACTOR_VERSION='voice-rules-0.3.0';
const terms={
  location:{left:/左(?:侧|边)?|\bleft\b/i,right:/右(?:侧|边)?|\bright\b/i,bilateral:/双侧|两侧|\bbilateral\b|both sides/i,forehead:/前额|额头|\bforehead\b|\bfrontal\b/i,temple:/太阳穴|颞部|\btemples?\b|\btemporal\b/i,behind_eye:/眼后|眼眶后|behind (?:my |the )?eyes?/i,back_head:/后脑|枕部|back of (?:my |the )?head|occipital/i,whole_head:/整个头|全头|whole head|all over (?:my |the )?head/i},
  quality:{pulsating:/搏动|跳痛|一跳一跳|\bthrobbing\b|\bpulsating\b/i,pressing:/压迫|紧箍|压榨|pressing|pressure[- ]like|tight band/i,stabbing:/针刺|刺痛|\bstabbing\b/i,burning:/烧灼|灼痛|\bburning\b/i},
  symptoms:{nausea:/恶心|\bnausea\b|\bnauseous\b/i,vomiting:/呕吐|\bvomit(?:ing|ed)?\b/i,photophobia:/畏光|怕光|light sensitivity|sensitive to light/i,phonophobia:/畏声|怕吵|怕声音|sound sensitivity|sensitive to (?:sound|noise)/i,aura:/先兆|\baura\b/i,tearing:/流泪|\btearing\b|watery eye/i,nasal:/鼻塞|流鼻涕|nasal congestion|runny nose/i,aggravated_activity:/活动后加重|活动加重|worse with activity/i},
  suspectedTriggers:{stress:/压力|紧张|\bstress\b/i,poor_sleep:/熬夜|睡眠不足|没睡好|poor sleep|lack of sleep|sleep deprivation/i,caffeine:/咖啡|咖啡因|\bcoffee\b|\bcaffeine\b/i,alcohol:/饮酒|喝酒|\balcohol\b/i,missed_meal:/漏餐|没吃饭|空腹|missed meal|skipped (?:a )?meal/i,menstruation:/月经|经期|menstruation|menstrual/i,weather:/天气|\bweather\b/i,exercise:/运动|\bexercise\b/i}
};
const drugs=[['布洛芬','ibuprofen','nsaid'],['对乙酰氨基酚','paracetamol|acetaminophen','simple_analgesic'],['阿司匹林','aspirin','simple_analgesic'],['萘普生','naproxen','nsaid'],['舒马曲坦','sumatriptan','triptan']];
const negative=/(?:没有|并非|不是|未曾|否认|不伴|无|未服|没吃|没服|不确定|是否|\bno\b|\bnot\b|\bwithout\b|\bden(?:y|ies|ied)\b|\bnever\b|\bunsure\b|\bmaybe\b|\bif\b)/i;
const uncertain=/(?:可能|也许|不清楚|不记得|\bmight\b|\bperhaps\b|\bpossibly\b)/i;
const otherPerson=/(?:妈妈|母亲|爸爸|父亲|患者示例|my (?:mother|father|wife|husband|child)|example patient)/i;
export function extractVoice(text,{language='zh'}={}){
  if(typeof text!=='string'||text.length>5000||!['zh','en'].includes(language))throw new Error('invalid_voice_text');
  const result={version:EXTRACTOR_VERSION,language,fields:{days:{},episodes:{},medications:{}},evidence:[],warnings:[],unclassifiedText:text};
  const clauses=text.split(/[，,。;；\n!?！？]|(?<!\d)\.|\.(?!\d)|\bbut\b|但是|不过|但|而是/i).map(x=>x.trim()).filter(Boolean);
  const add=(kind,field,value,evidence)=>{result.fields[kind][field]=value;result.evidence.push({kind,field,value,quote:evidence});};
  if(otherPerson.test(text)){result.warnings.push('other_person');return result;}
  for(const [field,dict] of Object.entries(terms)){
    const found=[];
    for(const [code,re] of Object.entries(dict)){
      const clause=clauses.find(c=>re.test(c)&&(!negative.test(c)||(field==='suspectedTriggers'&&/没睡好|没吃饭/.test(c)))&&(field==='suspectedTriggers'||!uncertain.test(c)));
      if(clause){found.push(code);result.evidence.push({kind:'episodes',field,value:code,quote:clause});}
    }
    if(found.length)result.fields.episodes[field]=found;
  }
  const negatives=clauses.filter(c=>/^(?:今天|今日|today[, :]*)?\s*(?:没有头痛|无头痛|no headache|headache[- ]free)(?:了|\b|$)/i.test(c));
  const positives=clauses.filter(c=>/(?:今天|今日).*(?:头痛|头疼)|(?:我|开始).*(?:头痛|头疼)|(?:I have|I had|today I had) (?:a )?headache/i.test(c)&&!negative.test(c));
  if(negatives.length&&!positives.length)add('days','headache','no',negatives[0]);
  else if(positives.length&&!negatives.length)add('days','headache','yes',positives[0]);
  else if(negatives.length&&positives.length)result.warnings.push('conflicting_headache');
  function scalar(kind,field,regex,convert,valid){
    const matches=clauses.filter(c=>!negative.test(c)&&!uncertain.test(c)&&!/(?:\d\s*(?:-|–|到|至|or|to)\s*\d)/i.test(c)).flatMap(c=>[...c.matchAll(regex)].map(m=>({value:convert(m),quote:c})));
    const values=[...new Set(matches.map(m=>JSON.stringify(m.value)))];
    if(values.length===1&&valid(matches[0].value))add(kind,field,matches[0].value,matches[0].quote);
    else if(matches.length)result.warnings.push('ambiguous_'+field);
  }
  scalar('episodes','intensity',/(?:疼痛(?:程度|评分)?|痛感|pain(?: score| intensity)?)\s*[:：为是]?[ ]*(\d+(?:\.\d+)?)\s*(?:分|\/\s*10|out of 10)?/gi,m=>Number(m[1]),v=>Number.isInteger(v)&&v>=0&&v<=10);
  scalar('episodes','reportedDurationMinutes',/(?:持续(?:了)?|lasted(?: for)?|duration(?: of)?)\s*(\d+(?:\.\d+)?)\s*(小时|分钟|hours?|hrs?|minutes?|mins?)/gi,m=>Number(m[1])*(/小时|hour|hr/i.test(m[2])?60:1),v=>v>0&&v<=43200);
  const frequency=clauses.filter(c=>/(?:每周|每月|每星期|每个月)\s*\d+\s*次|\d+\s*(?:times|attacks)\s*(?:per|a|each)\s*(?:week|month)/i.test(c)&&!negative.test(c));
  if(frequency.length===1)add('episodes','reportedFrequency',frequency[0].slice(0,250),frequency[0]);
  const medicineClauses=clauses.filter(c=>!medicationIsAdvice(text)&&/(?:服用|服了|吃了|用了|用药|took|taken|taking|used|medication)/i.test(c)&&!negative.test(c)&&!uncertain.test(c));
  const foundDrugs=drugs.filter(([zh,en])=>medicineClauses.some(c=>new RegExp(zh+'|\\b(?:'+en+')\\b','i').test(c)));
  if(foundDrugs.length===1){
    const [zh,en,drugClass]=foundDrugs[0],clause=medicineClauses.find(c=>new RegExp(zh+'|\\b(?:'+en+')\\b','i').test(c));
    // More than one named drug or more than one dose must be reviewed manually.
    if(!/(?:和|以及|\band\b|\bplus\b)/i.test(clause)){
      add('medications','name',language==='zh'?zh:en.split('|')[0],clause);add('medications','drugClass',drugClass,clause);
      const amounts=[...clause.matchAll(/(\d+(?:\.\d+)?)\s*(毫克|微克|毫升|mg\b|mcg\b|mL\b|克|g\b|片|tablets?\b)/gi)];
      if(amounts.length===1&&!/\d\s*(?:-|–|到|至|or|to)\s*\d/i.test(clause)){
        const m=amounts[0],raw=m[2].toLowerCase(),unit=/毫克|^mg$|^克$|^g$/.test(raw)?'mg':/微克|mcg/.test(raw)?'mcg':/毫升|ml/.test(raw)?'mL':'tablet',dose=Number(m[1])*(raw==='克'||raw==='g'?1000:1);
        if(dose>0&&dose<100000){add('medications','dose',dose,clause);add('medications','unit',unit,clause);}
      }else result.warnings.push('ambiguous_dose');
    }else result.warnings.push('multiple_medications');
  }else if(foundDrugs.length>1)result.warnings.push('multiple_medications');
  const responses=clauses.filter(c=>!medicationIsAdvice(text)&&/(?:服药后|用药后|小时后|分钟后|after (?:the )?(?:dose|medication)|(?:hours?|minutes?) (?:later|after))/.test(c.toLowerCase())&&/(?:缓解|不痛|无痛|疼痛|有效|无效|痛|relief|pain|help|better)/i.test(c));
  if(responses.length)add('medications','responseNote',responses.join('；').slice(0,500),responses.join('；'));
  if(medicationIsAdvice(text))result.warnings.push('advice_not_actual');
  result.warnings.push('review_required','times_manual','single_event','triggers_suspected');
  return result;
}
