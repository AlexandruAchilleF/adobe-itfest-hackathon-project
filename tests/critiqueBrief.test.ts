import { describe, expect, it } from 'vitest';
import { briefQuestions } from '../src/lib/gaps';
import { parseExtensionMessage, isFromExtension } from '../src/lib/extensionBridge';
import { Campaign, seedCampaign } from '../src/lib/campaigns';

describe('brief după critică', () => {
  it('pune trei întrebări, plus CTA numai pentru acțiuni neclare', () => {
    expect(briefQuestions(['contrast-slab'], 'Cupe').map(q => q.id)).toEqual(['product','audience','goal']);
    const qs = briefQuestions(['link-vag'], 'Cupe');
    expect(qs.map(q => q.id)).toEqual(['product','audience','goal','cta']);
    expect(qs[0].options).toContain('Cupe');
    expect(qs.flatMap(q=>q.options).join(' ')).not.toMatch(/%|lei/);
  });
  it('validează brief HTTP și limitele, păstrează publicul și obiectivul la salvare', () => {
    const brief = {source:{url:'https://example.org/x',title:'Cupe'},answers:{product:'Cana',audience:'Părinți',goal:'Comenzi',cta:'Comandă'}};
    expect(parseExtensionMessage({type:'spire:brief',brief})).toEqual({type:'spire:brief',brief});
    for (const invalid of [{...brief,source:{...brief.source,url:'javascript:alert(1)'}},{...brief,answers:{goal:'x'.repeat(501)}},{...brief,source:{...brief.source,title:'x'.repeat(301)}}]) {
      expect(parseExtensionMessage({type:'spire:brief',brief:invalid})).toBeNull();
    }
    expect(Campaign.parse({...seedCampaign(),answers:brief.answers}).answers).toMatchObject(brief.answers);
  });
  it('respinge brief-ul de la altă origine decât originea părintelui cunoscut', () => {
    const parent={} as Window;
    const win={parent,location:{search:'?din=extensie'},document:{referrer:'https://site.test/page'}} as unknown as Window;
    expect(isFromExtension({source:parent,origin:'https://site.test'} as MessageEvent,win)).toBe(true);
    expect(isFromExtension({source:parent,origin:'https://evil.test'} as MessageEvent,win)).toBe(false);
  });
});

it('fără referrer, originea explicită din iframe rămâne verificată', () => {
  const parent={} as Window;
  const win={parent,location:{search:'?din=extensie&hostOrigin=https%3A%2F%2Fsite.test'},document:{referrer:''}} as unknown as Window;
  expect(isFromExtension({source:parent,origin:'https://site.test'} as MessageEvent,win)).toBe(true);
  expect(isFromExtension({source:parent,origin:'https://evil.test'} as MessageEvent,win)).toBe(false);
  expect(briefQuestions([], 'MarinaPark')[2].options).toContain('Rezervări');
});

it('validează cererea AI corelată și limitele', () => {
  const input={page:{url:'https://site.test',title:'Site',lang:'ro',metaDescription:'',jsonLdTypes:[],h1Count:1,imagesWithoutAlt:0},elements:[],viewport:{w:1280,h:720}};
  expect(parseExtensionMessage({type:'spire:critique-request',requestId:'crit-1',input})?.type).toBe('spire:critique-request');
  expect(parseExtensionMessage({type:'spire:critique-request',requestId:'x'.repeat(101),input})).toBeNull();
});

it('transferă constatările concrete și respinge un context prea mare', () => {
  const critique={mode:'mock',items:[{id:'c1',title:'Titlu vag',observation:'Produsul nu este numit.',proposal:'Aș numi produsul.',elementId:null}],screenshot:'data:image/jpeg;base64,AAAA'};
  const brief={source:{url:'https://site.test',title:'Site'},answers:{},critique};
  expect(parseExtensionMessage({type:'spire:brief',brief})).toMatchObject({brief:{critique}});
  expect(parseExtensionMessage({type:'spire:brief',brief:{...brief,critique:{...critique,items:Array(6).fill(critique.items[0])}}})).toBeNull();
  expect(parseExtensionMessage({type:'spire:brief',brief:{...brief,critique:{...critique,screenshot:'data:image/png;base64,AAAA'}}})).toBeNull();
});
