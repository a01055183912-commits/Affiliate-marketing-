'use strict';
/* 제휴 마케팅 실습 도우미 — 3-6 (첨부 교안·해설집 기반)
   원칙: 내 생각 먼저 → 예시답안과 비교 → 원리 이해 / 계산은 내가 먼저 / 막히면 자문(되묻기) */

/* ───────── 기본 도구 ───────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : null; };
const nf = n => (n == null || isNaN(n)) ? '-' : Math.round(n).toLocaleString('ko-KR');
const fm = m => {
  if (m == null || isNaN(m)) return '-';
  const neg = m < 0; m = Math.abs(Math.round(m));
  const e = Math.floor(m / 10000), r = m % 10000;
  let s = ''; if (e) s += e + '억 '; if (r || !e) s += r.toLocaleString('ko-KR') + '만';
  return (neg ? '−' : '') + s.trim() + ' 원';
};
const hasDigit = s => /\d/.test(s || '');
const CIRC = '①②③④⑤⑥⑦⑧';
const LV = { red: '확인 필요', org: '주의', grn: '좋아요', info: '참고' };

/* ───────── 상태 ───────── */
const KEY = 'affiliate36.v2';
let state = { meta: { team: '', writer: '' }, d: {}, chk: {}, unlockAll: false, showEx: false, step: 1 };
function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장소를 못 써도 동작 */ } }
function restore() { try { const s = localStorage.getItem(KEY); if (s) { const o = JSON.parse(s); if (o && o.d) state = Object.assign(state, o); } } catch (e) { /* ignore */ } }
const G = (k, d = state.d) => d[k] || {};
function isFilled(key, d = state.d) {
  const o = d[key]; if (!o) return false;
  return Object.values(o).some(v => Array.isArray(v) ? v.length > 0 : (v !== '' && v != null));
}
function withData(d, fn) { const keep = state.d; state.d = d; try { return fn(); } finally { state.d = keep; } }

/* ───────── 계산 (비용은 만 원 단위) ───────── */
function partnerCost(d = state.d) {
  const f = G('ws2.final', d); let s = 0;
  (f.selected || []).forEach(id => { const c = CANDS.find(x => x.id === id); if (!c) return; const neg = num(f.negA); s += (id === 'A' && neg != null) ? neg : c.cost; });
  return s + (num(f.extra) || 0);
}
function ws2Totals(d = state.d) {
  const t = {}; CANDS.forEach(c => { t[c.id] = 0; }); let any = false;
  CRITS.forEach(cr => { const o = G('ws2.score.' + cr.id, d); if (!isFilled('ws2.score.' + cr.id, d)) return; CANDS.forEach(c => { const v = num(o['s_' + c.id]); if (v != null) { t[c.id] += v; any = true; } }); });
  return any ? t : null;
}
const burdenCount = d => ITEMS4.filter(it => { const p = (G('ws4.item.' + it.id, d).payer || ''); return p && !p.startsWith('백화점 100%'); }).length;
function compute(d = state.d) {
  const items = {};
  ITEMS4.forEach(it => { items[it.id] = it.id === 'license' ? partnerCost(d) : (num(G('ws4.item.' + it.id, d).amount) || 0); });
  const spent = Object.values(items).reduce((a, b) => a + b, 0);
  const k = id => G('ws5.kpi.' + id, d);
  const sales = num(k('sales').target), visitors = num(k('visitors').target), app = num(k('app').target);
  const rate = num(k('s2').target), made = num(k('s2').made);
  const pop = G('ws3.popup', d), cap = (num(pop.perDay) || 0) * (num(pop.perClass) || 0) * (num(pop.days) || 0);
  const gp = sales != null ? sales * 10000 * GP : null;
  return {
    items, spent, remain: BUDGET - spent, pct: spent / BUDGET, partner: partnerCost(d), sales, visitors, app, rate, made, cap,
    multiple: (sales != null && spent > 0) ? sales * 10000 / spent : null,
    rev1: (sales != null && visitors > 0) ? sales * 1e8 / visitors : null,
    conv: (app != null && visitors > 0) ? app / visitors * 100 : null,
    check2: visitors > 0 ? visitors * 0.5 * 0.6 : null,
    stop: visitors > 0 ? visitors * 0.5 * 0.4 : null,
    sold: (made > 0 && rate != null) ? made * rate / 100 : null,
    gp, net: (gp != null && spent > 0) ? gp - spent : null,
  };
}

/* ───────── 자문 규칙 (교안·해설집의 "짚어야 할 것"에서 도출) ───────── */
const A = (lv, msg, why) => ({ lv, msg, why });
function stepAdvice(n, d = state.d) {
  const out = [], c = compute(d);
  if (n === 1) {
    const pur = CASES.map(x => (G('ws1.purpose.' + x.id, d).text || '').trim().replace(/\s+/g, ''));
    if (pur.every(Boolean) && new Set(pur).size === 1) out.push(A('red', '네 사례의 목적이 서로 다릅니다. 구매 부담 완화인지, 신규 유입인지, 프리미엄 강화인지 구분해서 보십시오.', '네 칸이 똑같이 적혀 있습니다. 사례 설명 카드를 다시 읽어 보세요.'));
    if (/신규|유입|많은 사람/.test(G('ws1.purpose.luxury', d).text || '')) out.push(A('org', '명품 팝업은 "주요 고객 대상의 프라이빗 이벤트"입니다. 많은 사람을 부르는 것과는 방향이 다릅니다.', '사례 설명의 "프리미엄 이미지 강화 · 고객 충성도 강화"를 다시 읽어 보세요.'));
    CASES.forEach(x => { const t = G('ws1.brand.' + x.id, d).text || ''; if (t && !(/백화점/.test(t) && /(파트너|카드|IP|브랜드|포켓몬|기업|상대|무신사|올리브영)/.test(t))) out.push(A('info', `${x.name}: 백화점이 얻는 것과 파트너가 얻는 것을 따로 써 보세요.`, '"백화점: …, 파트너: …"처럼 나눠 쓰면 이 안내가 사라집니다.')); });
    if (CASES.some(x => ITEMS1.some(i => /\d+\s*(%|만|억|명|건)/.test(G(`ws1.${i.id}.${x.id}`, d).text || '')))) out.push(A('info', '실제 협업 사례의 조건과 성과는 공개되지 않은 부분이 많습니다. 구체적 수치는 단정하지 마세요.'));
    [1, 2, 3].forEach(i => { const o = G('ws1.take.' + i, d); if (o.factor && !(o.apply || '').trim()) out.push(A('org', `성공 요인 ${i}: "우리 협업에 어떻게 적용할 것인가"가 비어 있습니다.`, '앞 분석에서 찾은 요인이 우리 목표(20~30대 신규, 앱 가입)에 어떻게 이어지는지 쓰세요.')); });
    if (CASES.every(x => isFilled('ws1.purpose.' + x.id, d)) && ![1, 2, 3].every(i => G('ws1.take.' + i, d).factor)) out.push(A('org', '"우리 협업에 가져갈 성공 요인" 세 칸을 채워야 실습 ②로 이어집니다.'));
  }
  if (n === 2) {
    const f = G('ws2.final', d), sel = f.selected || [], t = ws2Totals(d);
    if (sel.includes('A')) {
      out.push(A('red', '라이선스 3억 원은 예산 4억 원의 75%입니다. 남은 1억 원으로 150평 공간·굿즈·홍보·인력을 모두 해야 합니다. 경쟁사도 이미 협업해 차별화도 되나요?', '"됩니까?"에 숫자로 답해 보세요. 가능한지는 실습 ④에서 확인하게 됩니다.'));
      const neg = num(f.negA);
      if (neg == null) out.push(A('org', 'A를 고르고 협상으로 낮추려면 목표 금액을 숫자로 적으세요. 얼마까지 낮춰야 하나요?'));
      else if (neg <= 10000) out.push(A('org', '3억 원을 1억 원으로 낮추는 협상은 현실적이지 않습니다. 근거를 적어 주세요.'));
    }
    if (sel.includes('E')) out.push(A('org', 'E는 협의 기간이 깁니다. 6주 안에 어떻게 끝낼지(일정을 앞당기는 방법) 이유에 적어 주세요.'));
    if (t && sel.length === 1) { const max = Math.max(...Object.values(t)); if (t[sel[0]] === max && (f.reason || '').trim().length < 20) out.push(A('org', '점수 1위를 그대로 고르셨습니다. 점수는 후보를 좁히는 도구입니다. 목표(20~30대 신규)와 제약(6주·4억)으로 마지막 판단을 하세요.')); }
    if (num(G('ws2.score.diff', d).s_A) >= 13) out.push(A('org', '화제성과 차별화는 다릅니다. A는 가장 유명하지만 경쟁사도 이미 협업했습니다.', '두 개념을 나눠서 채점했는지 확인하세요.'));
    if (num(G('ws2.score.reach', d).s_C) >= 13) out.push(A('info', '카드사는 회원 900만 명이지만 20~30대는 28%, 약 252만 명입니다.', '전체 회원 수가 아니라 우리 목표 고객 수로 환산했나요?'));
    const cs = CANDS.filter(x => isFilled('ws2.score.cost', d) && num(G('ws2.score.cost', d)['s_' + x.id]) <= 3);
    if (cs.length) out.push(A('info', `비용 대비 효과는 10점뿐이지만 ${cs.map(x => x.id).join(', ')}는 이 항목에서 거의 점수를 받지 못했습니다. 배점이 낮은 항목이 결정타가 되는 경우입니다.`));
    CRITS.forEach(cr => { if (isFilled('ws2.score.' + cr.id, d) && !(G('ws2.score.' + cr.id, d).reason || '').trim()) out.push(A('org', `${cr.name}: 채점 근거가 비어 있습니다. 근거 칸이 비어 있으면 점수가 몇 점이든 미완성입니다.`, `브리프의 "${cr.look}" 칸 문구를 옮겨 적으면 됩니다.`)); });
    if (isFilled('ws2.final', d) && sel.length) {
      const un = CANDS.filter(x => !sel.includes(x.id)).filter(x => !(f['rej_' + x.id] || '').trim());
      if (un.length) out.push(A('org', `선택하지 않은 후보(${un.map(x => x.id).join(', ')})의 이유가 비어 있습니다. 고른 이유보다 버린 이유를 설명하는 것이 실무 역량입니다.`));
      if (!(f.combo || '').trim()) out.push(A('org', '단독이 아닌 복수 파트너 조합도 검토했나요? 조합을 아예 생각하지 않았다면 되돌려 보냅니다.'));
      out.push(A('info', `선택한 파트너 비용: ${fm(c.partner)} (예산의 ${(c.partner / BUDGET * 100).toFixed(1)}%). 남는 돈: ${fm(BUDGET - c.partner)}.`));
    }
  }
  if (n === 3) {
    const nm = (G('ws3.name', d).name || '').trim();
    if (nm && /^[^×xX*+]+\s*[×xX*+]\s*[^×xX*+]+$/.test(nm)) out.push(A('org', '두 로고를 나란히 놓는 것만으로는 협업이 아닙니다. 고객이 얻는 새로운 경험이 이름에 보이나요?'));
    if (['name', 'concept', 'popup', 'photo', 'goods', 'benefit'].some(i => isFilled('ws3.' + i, d)) && !isFilled('ws3.experience', d)) out.push(A('red', '"고객이 얻는 새로운 경험" 칸이 비어 있으면 로고 두 개를 붙인 것에 불과합니다. 어느 한쪽에서는 못 하는 경험인가요?'));
    PROMO_ROWS.forEach(r => { if (isFilled('ws3.' + r.id, d) && !(G('ws3.' + r.id, d).owner || '').trim()) out.push(A('org', `${r.name}: 주 담당이 비어 있습니다. 주 담당이 표시되어야 실습 ④로 이어집니다.`)); });
    if (isFilled('ws3.benefit', d) && G('ws3.benefit', d).appHook !== 'yes') out.push(A('org', '브리프의 우선 목표는 "앱 미가입 신규 고객 확보"입니다. 앱 가입 유도 장치가 프로모션 안에 있나요? 없으면 목표와 기획이 따로 놉니다.'));
    if (c.cap > 0) out.push(A('info', `예약제 프로그램 정원은 ${nf(c.cap)}명입니다 (하루 회차 × 회당 인원 × 운영 일수). 150평 공간에 비해 어떤가요? 예약 없이 들르는 공간이 필요한지 생각해 보세요.`));
    if (isFilled('ws3.popup', d) && isFilled('ws3.benefit', d)) out.push(A('info', '필수 조건 "기존 40~50대 고객 소외 최소화"를 이 기획이 어떻게 지키는지 한 줄로 설명할 수 있나요?'));
  }
  if (n === 4) {
    const saved = ITEMS4.filter(it => it.id !== 'license' && isFilled('ws4.item.' + it.id, d));
    if (c.spent > BUDGET) out.push(A('red', `예산 4억 원을 ${nf(c.spent - BUDGET)}만 원 넘었습니다. 예산 안에서 실행 가능한 답인지가 가장 먼저 확인됩니다.`, '가장 큰 항목 두 개가 각각 예산의 몇 %인지 보세요.'));
    else if (saved.length >= 3 && c.remain === 0) out.push(A('org', '예산을 꽉 채웠습니다. 여유 없이 짠 예산은 반드시 초과합니다. 문제가 생기면 어디서 돈을 쓰나요?'));
    else if (saved.length >= 3 && c.pct > 0.95) out.push(A('org', `예산의 ${(c.pct * 100).toFixed(1)}%를 썼습니다. 6주짜리 현장 행사에서 예상 밖 비용은 반드시 생깁니다.`));
    if (isFilled('ws4.item.reserve', d) && c.items.reserve === 0) out.push(A('red', '예비비가 0입니다. 예상 밖 비용 대응은 어디서 하나요?'));
    if (saved.length >= 3 && burdenCount(d) === 0) out.push(A('red', '파트너는 왜 이 협업을 합니까? 비용을 백화점이 전부 부담하는 안은 파트너가 얻는 것을 설명하지 못합니다.', '"비용 부담" 칸을 파트너가 내는 것(재고, 굿즈 제작, 인력, 홍보)으로 나눠 보세요.'));
    if (burdenCount(d) >= 2) out.push(A('grn', '파트너도 함께 부담합니다. 협업 구조가 성립합니다.'));
    ITEMS4.forEach(it => { const o = G('ws4.item.' + it.id, d); if (!it.locked && isFilled('ws4.item.' + it.id, d) && (o.amount === '' || o.amount == null) && !(o.payer || '').startsWith('파트너')) out.push(A('org', `${it.name}: 금액이 비어 있습니다. 금액 없이 서술만 있으면 구체성이 떨어집니다.`)); });
    if (c.partner > 0 && c.partner / BUDGET >= 0.5) out.push(A('red', '파트너 비용이 예산의 절반을 넘습니다. 나머지 항목을 남은 돈으로 채울 수 있는지 표로 확인하세요.', `라이선스 제외 나머지 항목에 쓸 수 있는 돈: ${fm(BUDGET - c.partner)}`));
    const filledAg = AGREE4.filter(a => isFilled('ws4.agree.' + a.id, d));
    if (saved.length >= 3 && filledAg.length < 4) out.push(A('info', `사전 합의 ${4 - filledAg.length}개가 비어 있습니다. 합의하지 않으면: ${AGREE4.find(a => !isFilled('ws4.agree.' + a.id, d)).fail}`));
    if (filledAg.length === 4 && AGREE4.every(a => hasDigit(G('ws4.agree.' + a.id, d).text))) out.push(A('grn', '합의 항목에 숫자나 기한이 들어 있습니다. 나중에 다툴 여지가 줄어듭니다.'));
    const lic = G('ws4.item.license', d);
    if (lic.snap != null && lic.snap !== c.partner) out.push(A('red', `실습 ②에서 고른 파트너 비용(${nf(c.partner)}만 원)과 라이선스 칸(${nf(lic.snap)}만 원)이 다릅니다. 라이선스 칸을 다시 저장하세요.`));
  }
  if (n === 5) {
    if (c.rev1 != null) out.push(A('info', `방문자 1인당 매출은 약 ${nf(c.rev1)}원입니다 (매출 ÷ 방문자). 이 숫자가 현실적인지 스스로 판단해 보세요.`));
    if (c.conv != null) out.push(A('info', `방문자 대비 앱 가입 전환율은 약 ${c.conv.toFixed(1)}%입니다. 가입은 어떤 장치로 만들어지나요?`));
    if (c.check2 != null) out.push(A('info', `2주차 점검선(목표의 60%)은 ${nf(c.check2)}명, 축소 운영 기준선(40%)은 ${nf(c.stop)}명입니다. 실습 ⑥의 중단 기준선과 이어집니다.`));
    if (c.multiple != null) out.push(A('info', `증분 매출 목표는 쓴 돈의 약 ${c.multiple.toFixed(1)}배입니다. 실습 ④의 쓴 돈 ${fm(c.spent)}과 비교한 값입니다.`));
    if (c.sold != null) out.push(A('info', `제작 ${nf(c.made)}개 × 판매율 ${c.rate}% = 판매 ${nf(c.sold)}개, 남는 수량 ${nf(c.made - c.sold)}개입니다. 남는 수량은 실습 ④의 합의대로 누가 가져가나요?`));
    KPIS.forEach(x => { const o = G('ws5.kpi.' + x.id, d); if (isFilled('ws5.kpi.' + x.id, d) && !(o.method || '').trim()) out.push(A('org', `${x.name}: 측정 방법이 비어 있습니다. "누가 · 어디서 · 언제 세는가"가 있어야 합니다.`)); });
    if (num(G('ws5.kpi.share', d).target) != null && num(G('ws5.kpi.share', d).target) <= 24) out.push(A('org', '20~30대 방문 비중 목표가 현재(24%) 이하입니다. 이 과제의 목표는 20~30대 유치입니다.'));
    const emp = KPI_AGREE.filter(a => !isFilled('ws5.agree.' + a.id, d));
    if (KPIS.some(x => isFilled('ws5.kpi.' + x.id, d)) && emp.length) out.push(A('info', `합의 사항 ${emp.length}개가 비어 있습니다 (${emp.map(a => a.name.split(' (')[0]).join(' / ')}).`));
  }
  if (n === 6) {
    const lv = RISKS.map(r => G('ws6.risk.' + r.id, d).level);
    if (lv.every(v => v === 'low')) out.push(A('red', '리스크가 전부 "낮음"입니다. 감점 사유입니다. 6주 중 사전 홍보가 2주뿐이라면 일정 지연은 어떤가요?'));
    if (G('ws6.risk.schedule', d).level === 'low') out.push(A('org', '일정 지연을 "낮음"으로 보셨습니다. 사전 홍보 2주 동안 시공·제작·섭외가 겹치는지 확인하세요.'));
    if (c.made > 0 && G('ws6.risk.stock', d).level === 'low') out.push(A('org', `굿즈 ${nf(c.made)}개를 만드는데 재고 리스크가 "낮음"입니다. 판매율 목표와 비교해 보세요.`));
    RISKS.forEach(r => { const o = G('ws6.risk.' + r.id, d); if (!isFilled('ws6.risk.' + r.id, d)) return; if (o.level && o.level !== r.gLevel && !(o.impact || '').trim()) out.push(A('info', `${r.name}: 교안의 일반 위험도는 "${LVL[r.gLevel]}"인데 "${LVL[o.level]}"로 보셨습니다. 앞 실습의 어떤 숫자가 근거인지 "발생 시 영향"에 적어 보세요.`)); if (!(o.pre || '').trim() || !(o.post || '').trim()) out.push(A('org', `${r.name}: 사전 대응과 발생 후 대응을 모두 적어 주세요.`)); });
    if (RISKS.some(r => isFilled('ws6.risk.' + r.id, d)) && !isFilled('ws6.stop', d)) out.push(A('org', '협업을 중단해야 할 기준선이 없습니다. 기준선은 시작 전에 정해야 합니다. 진행 중에 정하면 이미 쓴 돈이 아까워 아무도 멈추자고 말하지 못합니다.'));
    const st = G('ws6.stop', d).text || ''; if (st && !hasDigit(st)) out.push(A('info', '중단 기준선에 숫자나 날짜가 들어 있으면 더 분명합니다 (예: 2주차 방문자 ○명 미만).'));
  }
  if (n === 7) {
    ['share', 'app', 'sales'].forEach(id => { if (!(G('ws7.target.' + id, d).how || '').trim()) out.push(A('info', `정량 목표 "${{ share: '20~30대 방문 비중', app: '신규 회원 가입', sales: '증분 매출' }[id]}"의 달성 방법을 적어 주세요.`)); });
    if (c.net != null && c.net < 0) out.push(A('org', `기간 내 이익(증분 매출 × 30% = ${fm(c.gp)})이 투입(${fm(c.spent)})보다 ${fm(-c.net)} 모자랍니다. 회수의 근거를 "기대 효과"에 설명했나요?`, '교안·해설집 예시도 기간 내에는 "본전"이라 설명하고, 투자가 회수되는 근거는 확보한 신규 회원이 이후에도 구매를 이어가는 것이라고 봅니다. 계산상 차이를 "약"으로 넘기지 말고 직접 설명해 보세요.'));
    if (c.net != null && c.net >= 0) out.push(A('grn', `기간 내 이익(${fm(c.gp)})이 투입(${fm(c.spent)})을 넘거나 같습니다. 본전입니다.`));
  }
  return out;
}
const allAdvice = (n, d = state.d) => n <= 7 ? stepAdvice(n, d) : [];

/* ───────── 단계 구성 ───────── */
function keysOf(n) {
  const k = [];
  if (n === 1) {
    ITEMS1.forEach(it => CASES.forEach(c => k.push({ key: `ws1.${it.id}.${c.id}`, group: it.name, label: c.name, req: it.id === 'purpose' })));
    [1, 2, 3].forEach(i => k.push({ key: 'ws1.take.' + i, group: '가져갈 성공 요인', label: '성공 요인 ' + i, req: true }));
  }
  if (n === 2) {
    CRITS.forEach(cr => k.push({ key: 'ws2.score.' + cr.id, group: '채점', label: cr.name, req: true }));
    k.push({ key: 'ws2.final', group: '최종 판단', label: '선정·버린 이유·조합 검토', req: true });
  }
  if (n === 3) [...CONCEPT_ROWS, ...PROMO_ROWS].forEach(r => k.push({ key: 'ws3.' + r.id, group: '컨셉·프로모션', label: r.name, req: true }));
  if (n === 4) {
    ITEMS4.forEach(it => k.push({ key: 'ws4.item.' + it.id, group: '비용 분담', label: it.name, req: !it.locked }));
    AGREE4.forEach(a => k.push({ key: 'ws4.agree.' + a.id, group: '사전 합의', label: a.name, req: true }));
  }
  if (n === 5) {
    KPIS.forEach(x => k.push({ key: 'ws5.kpi.' + x.id, group: x.grp, label: x.name, req: x.id !== 's1' }));
    KPI_AGREE.forEach(a => k.push({ key: 'ws5.agree.' + a.id, group: '합의 사항', label: a.name, req: true }));
  }
  if (n === 6) {
    RISKS.forEach(r => k.push({ key: 'ws6.risk.' + r.id, group: '리스크', label: r.name, req: true }));
    k.push({ key: 'ws6.biggest', group: '마무리', label: '가장 큰 리스크', req: true });
    k.push({ key: 'ws6.stop', group: '마무리', label: '중단 기준선', req: true });
  }
  return k;
}
const reqProgress = n => { const r = keysOf(n).filter(x => x.req); return { done: r.filter(x => isFilled(x.key)).length, total: r.length, miss: r.filter(x => !isFilled(x.key)) }; };
const stepDone = n => (n >= 7) ? true : reqProgress(n).done === reqProgress(n).total;
const unlocked = n => n === 1 || state.unlockAll || stepDone(n - 1);
const exOpen = n => state.showEx || stepDone(n);

/* ───────── 칸 요약 텍스트 (내 답 / 예시답안 모두 같은 함수) ───────── */
function cellText(key, d = state.d) {
  const o = G(key, d), p = key.split('.');
  if (!isFilled(key, d)) return '';
  if (p[0] === 'ws1' && p[1] === 'take') return [o.factor, o.apply && ('→ ' + o.apply)].filter(Boolean).join('\n');
  if (p[0] === 'ws1') return o.text || '';
  if (key === 'ws2.final') {
    const sel = (o.selected || []).map(id => id + '(' + CANDS.find(x => x.id === id).name + ')').join(' + ');
    return `선정: ${sel || '-'} · 파트너 비용 ${fm(partnerCost(d))}\n이유: ${o.reason || '-'}\n조합 검토: ${o.combo || '-'}\n` + CANDS.filter(c => !(o.selected || []).includes(c.id) && o['rej_' + c.id]).map(c => `${c.id} 제외: ${o['rej_' + c.id]}`).join('\n');
  }
  if (p[0] === 'ws2' && p[1] === 'score') return CANDS.map(c => c.id + ' ' + (o['s_' + c.id] ?? '-')).join(' · ') + (o.reason ? '\n근거: ' + o.reason : '');
  if (p[0] === 'ws3') {
    if (key === 'ws3.name') return [o.name && ('「' + o.name + '」'), o.slogan && ('"' + o.slogan + '"'), o.reason && ('\n이유: ' + o.reason)].filter(Boolean).join(' ');
    if (['ws3.concept', 'ws3.experience'].includes(key)) return (o.text || '') + (o.reason ? '\n이유: ' + o.reason : '');
    return [o.text, o.place && ('기간·장소: ' + o.place), o.owner && ('주 담당: ' + o.owner), o.effect && ('기대 효과: ' + o.effect), o.appHook === 'yes' && '(앱 가입 유도 장치 포함)'].filter(Boolean).join('\n');
  }
  if (p[0] === 'ws4' && p[1] === 'item') return [`${nf(p[2] === 'license' ? partnerCost(d) : num(o.amount))}만 원${o.payer ? ' · ' + o.payer : ''}`, o.dept && ('백화점: ' + o.dept), o.partner && ('파트너: ' + o.partner), o.nego && ('협의: ' + o.nego)].filter(Boolean).join('\n');
  if (p[0] === 'ws4' && p[1] === 'agree') return o.text || '';
  if (p[0] === 'ws5' && p[1] === 'kpi') {
    const x = KPIS.find(k => k.id === p[2]);
    const head = x.kind === 'num' ? `${o.label ? o.label + ': ' : ''}${o.target}${x.unit}${x.id === 's2' && o.made ? ` (제작 ${nf(num(o.made))}개)` : ''}` : `${o.label || x.name}: ${o.cur ? '현재 ' + o.cur + ' → ' : ''}목표 ${o.target || '-'}`;
    return head + (o.method ? '\n측정: ' + o.method : '');
  }
  if (p[0] === 'ws5' && p[1] === 'agree') return o.text || '';
  if (p[0] === 'ws6' && p[1] === 'risk') return LVL[o.level] || '';
  if (key === 'ws6.biggest') { const r = RISKS.find(x => x.id === o.risk); return `${r ? r.name : '-'} — ${o.reason || ''}`; }
  if (key === 'ws6.stop') return o.text || '';
  return '';
}

/* ───────── 모달 엔진 ───────── */
let modalCtx = null;
const F = {
  T: (k, label, o = {}) => ({ t: 'text', k, label, ...o }),
  L: (k, label, o = {}) => ({ t: 'long', k, label, ...o }),
  N: (k, label, o = {}) => ({ t: 'num', k, label, ...o }),
  S: (k, label, opts, o = {}) => ({ t: 'select', k, label, opts, ...o }),
  M: (k, label, opts, o = {}) => ({ t: 'multi', k, label, opts, ...o }),
  R: (k, label, max, o = {}) => ({ t: 'range', k, label, max, ...o }),
  C: (id, label, expected, o = {}) => ({ t: 'calc', id, label, expected, ...o }),
  NOTE: html => ({ t: 'note', html }),
};
function fieldHtml(f, v) {
  const help = f.help ? `<div class="help">${f.help}</div>` : '';
  const lab = f.labelHtml || esc(f.label || '');
  if (f.t === 'note') return `<div class="note">${f.html}</div>`;
  const id = 'f_' + (f.k || f.id);
  if (f.t === 'text') return `<div class="fld"><label for="${id}">${lab}</label>${help}<input type="text" id="${id}" data-k="${f.k}" value="${esc(v[f.k] ?? '')}" placeholder="${esc(f.ph || '')}" autocomplete="off"></div>`;
  if (f.t === 'long') return `<div class="fld"><label for="${id}">${lab}</label>${help}<textarea id="${id}" data-k="${f.k}" placeholder="${esc(f.ph || '')}">${esc(v[f.k] ?? '')}</textarea></div>`;
  if (f.t === 'num') return `<div class="fld"><label for="${id}">${lab}</label>${help}<div class="inl"><input type="number" inputmode="decimal" step="any" id="${id}" data-k="${f.k}" value="${esc(v[f.k] ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.locked ? 'readonly' : ''}><span>${esc(f.unit || '')}</span></div></div>`;
  if (f.t === 'range') { const val = v[f.k] ?? (f.def ?? 0); return `<div class="fld"><label for="${id}">${lab}</label>${help}<div class="inl"><input type="range" id="${id}" data-k="${f.k}" min="0" max="${f.max}" step="1" value="${esc(val)}"><input type="number" aria-label="${esc(f.ariaLabel || f.label || '점수')} 숫자 입력" id="${id}_n" data-kn="${f.k}" min="0" max="${f.max}" step="1" value="${esc(val)}"><span>/ ${f.max}점</span></div></div>`; }
  if (f.t === 'select') return `<div class="fld"><label for="${id}">${lab}</label>${help}<select id="${id}" data-k="${f.k}"><option value="">선택하세요</option>${f.opts.map(o => { const ov = typeof o === 'string' ? o : o.v, ol = typeof o === 'string' ? o : o.l; return `<option value="${esc(ov)}" ${v[f.k] === ov ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select></div>`;
  if (f.t === 'multi') return `<div class="fld"><span class="lab">${lab}</span>${help}<div class="checks">${f.opts.map(o => `<label><input type="checkbox" data-km="${f.k}" value="${esc(o.v)}" ${(v[f.k] || []).includes(o.v) ? 'checked' : ''}> <span>${esc(o.l)}</span></label>`).join('')}</div></div>`;
  if (f.t === 'calc') return `<div class="fld calc" data-calc="${f.id}"><span class="lab">${lab}</span>${f.formula ? `<div class="help">계산해야 할 것: ${esc(f.formula)}</div>` : ''}<div class="inl"><input type="number" inputmode="decimal" step="any" id="${id}" data-k="${f.id}" value="${esc(v[f.id] ?? '')}" aria-label="내 계산 결과"><span>${esc(f.unit || '')}</span><button type="button" class="btn small" data-act="check" data-id="${f.id}">내 계산 확인</button></div><div class="fb" aria-live="polite"></div></div>`;
  return '';
}
function readVals(root, vals, fields) {
  fields.forEach(f => {
    if (f.t === 'multi') vals[f.k] = $$(`[data-km="${f.k}"]`, root).filter(x => x.checked).map(x => x.value);
    else if (f.k) { const el = $(`[data-k="${f.k}"]`, root); if (el) vals[f.k] = el.value; }
    else if (f.t === 'calc') { const el = $(`[data-k="${f.id}"]`, root); if (el) vals[f.id] = el.value; }
  });
}
const exGate = vals => Object.values(vals).some(v => typeof v === 'string' && v.trim().length >= 5);

function openModal(def) {
  const overlay = $('#overlay'), box = $('#modal');
  const vals = JSON.parse(JSON.stringify(def.init || {}));
  const fields = def.fields || [];
  const attempts = {};
  modalCtx = { def, vals, opener: document.activeElement };
  box.innerHTML = `
    <h2 id="mTitle">${esc(def.title)}</h2>
    ${def.sub || ''}
    ${def.q ? `<div class="q">${esc(def.q)}</div>` : ''}
    ${def.why ? `<details class="lec"><summary>원리: 왜 이 칸이 있나요? (막히면 펼치기)</summary><p>${esc(def.why)}</p></details>` : ''}
    <form id="mForm" onsubmit="return false">${fields.map(f => fieldHtml(f, vals)).join('')}</form>
    <div id="mLive">${def.live ? def.live(vals) : ''}</div>
    <div id="mAdv"></div>
    ${def.exKey ? `<details class="exbox" id="exBox"><summary>예시답안과 비교 <span id="exLock"></span></summary><div id="exBody"></div></details>` : ''}
    <div class="mbtns"><button type="button" class="btn" data-act="cancel">닫기 (Esc)</button>${def.consult ? '<button type="button" class="btn" data-act="consult">이 칸 자문 구하기</button>' : ''}<button type="button" class="btn accent" data-act="save">저장 (Ctrl+Enter)</button></div>`;
  overlay.hidden = false;
  const form = $('#mForm', box);
  const renderAdv = () => {
    if (!def.advice) { $('#mAdv', box).innerHTML = ''; return; }
    const list = def.advice(vals);
    $('#mAdv', box).innerHTML = list.length ? '<h3 style="font-size:16px;margin:12px 0 4px">자문 카드</h3>' + list.map(advHtml).join('') : '';
  };
  const exRender = () => {
    if (!def.exKey) return;
    const open = state.showEx || exGate(vals);
    $('#exLock', box).textContent = open ? '(열림)' : '🔒 내 생각을 5자 이상 쓰면 열립니다';
    const eb = $('#exBox', box);
    if (!open && eb.open) eb.open = false;
    if (open) $('#exBody', box).innerHTML = ['deck', 'book'].map(s => { const t = cellText(def.exKey, EX[s].d); return `<div class="exset"><b>${esc(EX[s].label)}</b><div class="pv">${t ? esc(t) : '(이 예시에는 이 칸이 없습니다)'}</div></div>`; }).join('') + `<div class="note">두 예시도 서로 다릅니다 — 유일한 정답은 없습니다. <b>내 답과 다른 점 한 가지</b>를 찾아, "왜 다른가?"를 스스로 설명해 보세요. 근거가 남아 있는지, 예산(4억)과 일정(6주) 안인지가 판단 기준입니다.</div>`;
  };
  const refresh = () => {
    readVals(form, vals, fields);
    if (def.live) $('#mLive', box).innerHTML = def.live(vals);
    renderAdv(); exRender();
  };
  form.addEventListener('input', e => {
    const kn = e.target.getAttribute('data-kn');
    if (kn) { const r = $(`[data-k="${kn}"]`, form); if (r) r.value = e.target.value; }
    if (e.target.type === 'range') { const n = $(`[data-kn="${e.target.getAttribute('data-k')}"]`, form); if (n) n.value = e.target.value; }
    refresh();
  });
  form.addEventListener('change', refresh);
  const eb = $('#exBox', box);
  if (eb) eb.addEventListener('toggle', () => { if (eb.open && !(state.showEx || exGate(vals))) { eb.open = false; $('#exLock', box).textContent = '🔒 먼저 내 생각을 5자 이상 써 주세요'; } });
  box.onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.getAttribute('data-act');
    if (act === 'cancel') closeModal();
    if (act === 'save') { readVals(form, vals, fields); const keep = def.onSave && def.onSave(vals); if (keep !== false) { closeModal(); persist(); renderAll(def.focusKey); } }
    if (act === 'consult') openConsult(def.consult);
    if (act === 'check') {
      const id = b.getAttribute('data-id'), f = fields.find(x => x.id === id), wrap = b.closest('[data-calc]'), fb = $('.fb', wrap);
      readVals(form, vals, fields);
      const mine = num(vals[id]), exp = f.expected(vals);
      attempts[id] = (attempts[id] || 0) + 1;
      if (mine == null) { fb.innerHTML = '<span class="ng">먼저 내 계산 결과를 숫자로 입력해 보세요.</span>'; return; }
      if (exp == null) { fb.innerHTML = '<span class="ng">비교할 값이 아직 없습니다. 앞 칸(파트너 선정·비용·목표)을 먼저 채워 주세요.</span>'; return; }
      const ok = Math.abs(mine - exp) <= Math.max(0.5, Math.abs(exp) * 0.01);
      if (ok) fb.innerHTML = `<span class="ok">✓ 맞았어요.</span> 계산 값 ${nf(exp)}${esc(f.unit || '')}과(와) 같습니다. 어떻게 계산했는지 한 줄로 설명할 수 있으면 완벽합니다.`;
      else if (attempts[id] === 1) fb.innerHTML = '<span class="ng">조금 달라요.</span> 단위(만 원 / 억 원 / 명 / %)를 먼저 맞췄는지, 빠뜨린 항목이 없는지 확인하고 다시 계산해 보세요.';
      else if (attempts[id] === 2) fb.innerHTML = `<span class="ng">아직 달라요.</span> 식 힌트: ${esc(f.formula || '')}. 입력한 숫자가 식의 어느 자리에 들어가는지 하나씩 적어 보세요.`;
      else fb.innerHTML = `<span class="ng">세 번째입니다.</span> 계산기의 값은 <b>${nf(exp)}${esc(f.unit || '')}</b>입니다. 내 값(${nf(mine)})과 어디서부터 달라졌는지 식을 거슬러 올라가 찾아보세요.`;
    }
  };
  refresh();
  setTimeout(() => { const first = $('input:not([readonly]):not([type=range]),textarea,select', form); (first || $('[data-act=cancel]', box)).focus(); }, 30);
}
function closeModal() { $('#overlay').hidden = true; $('#modal').innerHTML = ''; const o = modalCtx && modalCtx.opener; modalCtx = null; if (o && document.contains(o)) try { o.focus(); } catch (e) { /* ignore */ } }

let simpleOpener = null;
function openSimple(html, onClick, wide) {
  simpleOpener = document.activeElement;
  $('#modal2').className = 'modal' + (wide ? ' wide' : ''); $('#modal2').innerHTML = html; $('#overlay2').hidden = false; $('#modal2').onclick = onClick;
  setTimeout(() => { const b = $('#modal2 [data-act=cancel]'); if (b) b.focus(); }, 30);
}
function closeSimple() { $('#overlay2').hidden = true; $('#modal2').innerHTML = ''; if (simpleOpener && document.contains(simpleOpener)) try { simpleOpener.focus(); } catch (e) { /* ignore */ } simpleOpener = null; }
document.addEventListener('keydown', e => {
  const top2 = !$('#overlay2').hidden, top1 = !$('#overlay').hidden;
  if (!top1 && !top2) return;
  const root = top2 ? $('#modal2') : $('#modal');
  if (e.key === 'Escape') { e.preventDefault(); top2 ? closeSimple() : closeModal(); }
  else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !top2) { e.preventDefault(); const b = $('[data-act=save]', root); if (b) b.click(); }
  else if (e.key === 'Tab') {
    const f = $$('button:not([disabled]),input:not([readonly]),select,textarea,summary,[href]', root).filter(x => x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
$('#overlay').addEventListener('mousedown', e => { if (e.target.id === 'overlay') closeModal(); });
$('#overlay2').addEventListener('mousedown', e => { if (e.target.id === 'overlay2') closeSimple(); });
const advHtml = a => `<div class="adv lv-${a.lv}" role="note"><span class="badge lv-${a.lv}">${LV[a.lv]}</span>${esc(a.msg)}${a.why ? `<small>생각해 볼 점: ${esc(a.why)}</small>` : ''}</div>`;
function liveBudget(vals, key) {
  const c = compute({ ...state.d, [key]: vals });
  return `<div class="note"><b>지금까지</b> 쓴 돈 ${fm(c.spent)} (예산의 ${(c.pct * 100).toFixed(1)}%) · 남은 예산 <span class="${c.remain < 0 ? 'over' : ''}">${fm(c.remain)}</span></div>`;
}

/* ───────── 칸 정의 ───────── */
function cellDef(key) {
  const p = key.split('.'), o = G(key), ws = +p[0].slice(2);
  const adv = vals => allAdvice(ws, { ...state.d, [key]: vals });
  const mk = d => Object.assign({ init: o, focusKey: key, consult: ws, advice: adv, exKey: key, onSave: v => { state.d[key] = v; } }, d);
  const calcMk = d => Object.assign({ init: o, focusKey: key, consult: ws, onSave: v => { state.d[key] = v; } }, d);

  if (p[0] === 'ws1' && p[1] === 'take') {
    return mk({ title: `우리 협업에 가져갈 성공 요인 ${p[2]}`, q: '앞에서 분석한 사례에서 우리 협업에 가져갈 것 하나를 골라, 어떻게 적용할지 적어 보세요.',
      why: '"우리 협업에 어떻게 적용할 것인가"는 사례 분석을 실습 ②~⑦로 이어 주는 다리입니다. 우리 목표(20~30대 신규·앱 가입, 4억, 6주)에 직접 연결되는 요인만 가져오고, 나머지는 버립니다.',
      fields: [F.L('factor', '가져갈 성공 요인 (내 말로)'), F.L('apply', '우리 협업에 어떻게 적용할 것인가? (구체적으로, 가능하면 숫자와 함께)')] });
  }
  if (p[0] === 'ws1') {
    const it = ITEMS1.find(x => x.id === p[1]), c = CASES.find(x => x.id === p[2]);
    return mk({ title: `${c.name} (${c.tag}) · ${it.name}`, sub: `<div class="note"><b>교안 사례 설명</b><br>${esc(c.fact)}</div>`, q: it.ask, why: it.why,
      fields: [F.L('text', '내 생각 (내 말로 한두 문장)')] });
  }
  if (p[0] === 'ws2' && p[1] === 'score') {
    const cr = CRITS.find(x => x.id === p[2]);
    const fields = [F.NOTE(`<b>평가 항목</b>: ${esc(cr.name)} (배점 ${cr.max}점) — ${esc(cr.what)}<br><b>브리프에서 볼 칸</b>: ${esc(cr.look)}<br><b>낮은 점수의 신호</b>: ${esc(cr.low)}`)];
    CANDS.forEach(c => fields.push(F.R('s_' + c.id, '', cr.max, { ariaLabel: `${c.id} 후보`, labelHtml: `<b>${c.id}. ${esc(c.name)}</b> <div class="fact">브리프 문구: ${esc(cr.pick(c))}</div>` })));
    fields.push(F.L('reason', '채점 근거 (브리프의 문구나 숫자를 옮겨 적으세요)', { help: '점수보다 이유가 중요합니다. 후보별로 한 줄씩 적어도 좋습니다.' }));
    return mk({ title: `채점 · ${cr.name}`, q: cr.ask, why: `${cr.name}(${cr.max}점)에서 점수가 낮은 신호는 "${cr.low}"입니다. 채점 근거는 느낌이 아니라 브리프의 한 칸을 그대로 옮겨 적은 것입니다. 근거 칸이 비어 있으면 점수가 몇 점이든 미완성입니다.`, fields,
      live: v => `<div class="note">이 항목 점수: ${CANDS.map(c => `${c.id} ${num(v['s_' + c.id]) ?? 0}`).join(' · ')} (배점 ${cr.max})</div>` });
  }
  if (key === 'ws2.final') {
    const t = ws2Totals();
    const sub = (t ? `<div class="note"><b>내가 채점한 합계</b>: ${CANDS.map(c => `${c.id} ${t[c.id]}점`).join(' · ')}<br><span class="help">점수는 후보를 좁히는 도구입니다. 1위를 그대로 고르지 않아도 됩니다.</span></div>` : '<div class="note">아직 채점한 항목이 없습니다. 채점부터 하면 합계가 여기 보입니다.</div>') + '<div class="note"><b>선정 순서</b>: ① 채점표 → ② 제약(예산 4억·6주)에 걸리는 후보 지우기 → ③ 20~30대 신규 고객을 데려올 수 있는지 → ④ 부족하면 묶기 → ⑤ 고른 이유·버린 이유 쓰기</div>';
    return mk({ title: '최종 판단', sub, q: '누구와 함께하겠습니까? 그리고 누구를 버립니까?',
      why: '점수 1위를 기계적으로 고르는 것이 흔한 오답입니다. 마지막 판단은 목표(20~30대 신규 유치)와 제약(6주·4억)으로 합니다. 조합의 목적은 비용 절감이 아니라 각자의 약점을 서로 메우는 것입니다. 유일한 정답은 없고, 예산과 일정 안에서 근거가 남아 있는지를 봅니다.',
      fields: [F.M('selected', '선정한 파트너 (조합이면 여러 개 선택)', CANDS.map(c => ({ v: c.id, l: `${c.id}. ${c.name} — ${c.costTxt}` }))),
        F.N('negA', 'A를 고른 경우: 라이선스 협상 목표 금액 (협상하지 않으면 비움)', { unit: '만 원' }),
        F.N('extra', '다른 파트너 추가 비용이 있다면', { unit: '만 원' }),
        F.L('reason', '선정한 파트너와 결정적 이유 (제약과 목표로 설명하세요)'),
        ...CANDS.map(c => F.T('rej_' + c.id, `${c.id}. ${c.name} — 선택하지 않았다면 그 이유`, { ph: '예산·6주 제약 또는 목표와 연결해서' })),
        F.L('combo', '단독이 아닌 복수 파트너 조합도 검토했는가? 검토 결과와 이유는?')],
      live: v => { const pc = partnerCost({ ...state.d, 'ws2.final': v }); return `<div class="note"><b>파트너 비용 합계</b> ${fm(pc)} · 예산의 ${(pc / BUDGET * 100).toFixed(1)}% · 남는 돈 ${fm(BUDGET - pc)}</div>`; } });
  }
  if (key === 'ws2.calc') {
    return calcMk({ title: '내 계산 점검 (실습 ②)', q: '숫자로 먼저 계산해 보고, 그다음에 확인하세요.',
      fields: [F.C('a75', 'A의 라이선스 3억 원은 총 예산 4억 원의 몇 %입니까?', () => 75, { unit: '%', formula: '3억 ÷ 4억 × 100' }),
        F.C('c252', 'C 카드사 회원 900만 명 중 20~30대(28%)는 몇 만 명입니까?', () => 252, { unit: '만 명', formula: '900만 × 28%' }),
        F.C('pc', '내가 선정한 파트너 비용의 합계는 몇 만 원입니까?', () => { const pc = partnerCost(); return pc > 0 ? pc : null; }, { unit: '만 원', formula: '선택한 후보 비용의 합 (A는 협상 금액이 있으면 그 금액, C는 0)' }),
        F.C('rest', '내 파트너 비용을 빼고 남는 돈은 몇 만 원입니까?', () => { const pc = partnerCost(); return pc > 0 ? BUDGET - pc : null; }, { unit: '만 원', formula: '40,000 − 파트너 비용' })] });
  }
  if (p[0] === 'ws3') {
    const id = p[1], common = [F.L('reason', '이렇게 정한 이유 (고객이 얻는 것 중심으로)')];
    const promo = (extra = []) => [F.L('text', '프로모션 구체적 내용'), F.T('place', '운영 기간 · 장소'), F.T('owner', '주 담당 (누가 하나)'), F.T('effect', '기대 효과'), ...extra];
    const defs = {
      name: { title: '협업명 · 슬로건', q: '고객이 얻는 새로운 경험이 이름에 보이나요? 두 로고를 나란히 놓는 것만으로는 협업이 아닙니다.', fields: [F.T('name', '협업명'), F.T('slogan', '슬로건'), ...common] },
      concept: { title: '한 줄 협업 컨셉', q: '두 브랜드를 잇는 접점은 무엇입니까? 로고를 지워도 남는 것은 무엇입니까?', fields: [F.L('text', '한 줄 협업 컨셉'), ...common] },
      experience: { title: '고객이 얻는 새로운 경험', q: '이 팝업에서만 할 수 있는 행동은 무엇입니까? 어느 한쪽에서는 못 하는 경험인가요?', fields: [F.L('text', '고객이 얻는 새로운 경험'), ...common] },
      popup: { title: '팝업스토어', q: PROMO_ROWS[0].ask, fields: promo([F.N('perDay', '(선택) 예약제 프로그램이 있다면 하루 회차', { unit: '회' }), F.N('perClass', '회당 인원', { unit: '명' }), F.N('days', '운영 일수', { unit: '일' })]) },
      photo: { title: '포토존 · SNS 이벤트', q: PROMO_ROWS[1].ask, fields: promo() },
      goods: { title: '한정판 · 굿즈', q: PROMO_ROWS[2].ask, fields: promo() },
      benefit: { title: '공동 혜택 (할인 · 스탬프 등)', q: PROMO_ROWS[3].ask, fields: promo([F.S('appHook', '앱 가입을 유도하는 장치가 이 혜택 안에 들어 있나요?', [{ v: 'yes', l: '예, 들어 있다' }, { v: 'no', l: '아니오' }])]) },
    };
    return mk({ ...defs[id], why: ['name', 'concept', 'experience'].includes(id) ? '협업의 본질은 함께 노출하는 것이 아니라 고객에게 새로운 경험을 주는 것입니다. 판정 기준: "어느 한쪽에서는 못 하는 경험인가?" 이 칸이 비어 있으면 로고 두 개를 붙인 것에 불과합니다.' : '프로모션 유형: 공동 할인 · 공동 스탬프 · 포인트 적립 · 럭키드로우 · 사은품. 주 담당이 표시되어야 실습 ④의 역할·비용 분담으로 이어집니다. 브리프의 우선 목표(앱 미가입 신규 고객 확보)와 기획이 따로 놀지 않게 하세요.' });
  }
  if (p[0] === 'ws4' && p[1] === 'item') {
    const it = ITEMS4.find(x => x.id === p[2]);
    const fields = [it.locked ? F.N('amount', '비용 (실습 ②에서 자동 입력)', { unit: '만 원', locked: true }) : F.N('amount', '백화점이 내는 돈', { unit: '만 원', min: 0 }),
      F.L('dept', '백화점이 하는 일'), F.L('partner', '파트너가 하는 일'), F.S('payer', '비용 부담', PAYERS, { help: '파트너가 아무것도 내지 않는 협업은 성립하기 어렵습니다.' }), F.L('nego', '협의 필요 사항')];
    return mk({ title: `비용 분담 · ${it.name}`, q: it.ask,
      sub: `<div class="note"><b>교안: 누가 부담하는가</b><br>주로 백화점: ${esc(it.dept)} · 주로 파트너: ${esc(it.partner)} · 협의로 정하는 것: ${esc(it.nego)}</div>`,
      why: '항목마다 "주로 백화점 / 주로 파트너 / 협의로 정하는 것"이 있습니다. 파트너도 얻는 것이 있어야 협업이 성립하고, 예산은 꽉 채우지 않고 여유를 남깁니다(6주 현장 행사에서 예상 밖 비용은 반드시 생깁니다).',
      fields, live: v => liveBudget(v, key),
      init: it.locked ? { ...o, amount: String(partnerCost()) } : o,
      onSave: v => { if (it.locked) { v.amount = String(partnerCost()); v.snap = partnerCost(); } state.d[key] = v; } });
  }
  if (p[0] === 'ws4' && p[1] === 'agree') {
    const a = AGREE4.find(x => x.id === p[2]);
    return mk({ title: `사전 합의 · ${a.name}`, q: a.ask, sub: `<div class="note"><b>합의하지 않으면 생기는 일</b>: ${esc(a.fail)}<br><span class="help">실제 계약은 법무 검토가 필요합니다. 여기서는 합의의 "틀"을 연습합니다.</span></div>`,
      why: '협업이 깨지는 이유는 아이디어가 나빠서가 아니라 정산이 정리되지 않아서입니다. 곰표 밀맥주는 상표권 계약 종료 후 재고 처리와 IP 권리를 두고 3년간 분쟁을 겪었습니다. "누가, 언제까지, 무엇을 기준으로"를 숫자·기한으로 적으세요.',
      fields: [F.L('text', '우리 팀의 합의안')] });
  }
  if (key === 'ws4.calc') {
    return calcMk({ title: '내 계산 점검 (실습 ④)', q: '비용 표를 직접 합산해 보고, 예산과 비교하세요.',
      fields: [F.C('total', '백화점 부담 합계(쓴 돈)는 몇 만 원입니까?', () => { const c = compute(); return c.spent > 0 ? c.spent : null; }, { unit: '만 원', formula: '공간 + 상품 + 제작 + 홍보 + 인력 + 라이선스 + 예비비' }),
        F.C('pct', '쓴 돈은 예산 4억 원의 몇 %입니까?', () => { const c = compute(); return c.spent > 0 ? c.pct * 100 : null; }, { unit: '%', formula: '쓴 돈 ÷ 40,000 × 100' }),
        F.C('rest', '예산에서 남는 여유는 몇 만 원입니까?', () => { const c = compute(); return c.spent > 0 ? c.remain : null; }, { unit: '만 원', formula: '40,000 − 쓴 돈' })] });
  }
  if (p[0] === 'ws5' && p[1] === 'kpi') {
    const x = KPIS.find(k => k.id === p[2]);
    const fields = [];
    if (x.kind === 'text') fields.push(F.T('label', 'KPI 이름 (내가 고른 파트너에 맞게)'), F.T('cur', '현재값'), F.T('target', '목표값 (단위 포함)'));
    else { if (x.id === 's2') fields.push(F.T('label', '(선택) 지표 이름·메모')); fields.push(F.N('target', `목표값${x.cur && x.cur !== '—' ? ` (현재 ${x.cur})` : ''}`, { unit: x.unit })); if (x.id === 's2') fields.push(F.N('made', '제작 수량', { unit: '개' })); }
    fields.push(F.L('method', '측정 방법 (누가 · 어디서 · 언제 세는가)'));
    return mk({ title: `KPI · ${x.name}`, q: x.ask,
      sub: `<div class="note">구분: ${x.grp} · 성과 귀속: <b>${x.own}</b><br><span class="help">${esc(x.note)}</span></div>`,
      why: '"협업 잘 됐다"로는 다음 협업을 못 합니다. KPI는 누구의 성과인지 나눠야 하고, 측정 방법까지 정해야 다툼이 없습니다. "매출 증대" 수준의 목표는 감점입니다.',
      fields, live: v => { const cc = compute({ ...state.d, [key]: v }); let h = ''; if (x.id === 'visitors' && cc.check2 != null) h = `2주차 점검선 ${nf(cc.check2)}명 · 축소 기준선 ${nf(cc.stop)}명`; if (x.id === 's2' && cc.sold != null) h = `판매 ${nf(cc.sold)}개 · 남는 수량 ${nf(cc.made - cc.sold)}개`; return h ? `<div class="note">${h}</div>` : ''; } });
  }
  if (p[0] === 'ws5' && p[1] === 'agree') {
    const a = KPI_AGREE.find(x => x.id === p[2]);
    return mk({ title: `합의 사항 · ${a.name}`, q: a.ask, why: '재는 방법이 다르면 같은 결과를 두고도 다툽니다. 기준 기간은 시작 전에, 유입 경로는 전용 QR·쿠폰 코드처럼 기록이 남는 방식으로, 정성 성과는 사전·사후 조사처럼 숫자로 만들 수 있게 정합니다.', fields: [F.L('text', '우리 팀의 안 (이유 포함)')] });
  }
  if (key === 'ws5.calc') {
    return calcMk({ title: '내 계산 점검 (실습 ⑤)', q: '숫자가 서로 이어지는지 직접 계산해 보세요.',
      fields: [F.C('rev1', '방문자 1인당 매출은 몇 원입니까?', () => compute().rev1, { unit: '원', formula: '증분 매출(억 원) × 100,000,000 ÷ 방문자 목표' }),
        F.C('conv', '앱 가입 전환율은 몇 %입니까?', () => compute().conv, { unit: '%', formula: '신규 앱 회원 ÷ 방문자 × 100' }),
        F.C('c2', '2주차 점검선(목표의 60%)은 몇 명입니까?', () => compute().check2, { unit: '명', formula: '방문자 목표 × 1/2(4주 중 2주) × 60%' }),
        F.C('stop', '축소 운영 기준선(목표의 40%)은 몇 명입니까?', () => compute().stop, { unit: '명', formula: '방문자 목표 × 1/2 × 40%' }),
        F.C('sold', '굿즈 판매 수량은 몇 개입니까?', () => compute().sold, { unit: '개', formula: '제작 수량 × 판매율' })] });
  }
  if (p[0] === 'ws6' && p[1] === 'risk') {
    const r = RISKS.find(x => x.id === p[2]), c = compute();
    const ctx = { image: `고른 파트너: ${(G('ws2.final').selected || []).join(', ') || '(미정)'} · 파트너의 검증 이력과 노출 위치(1층 전면)를 떠올려 보세요.`,
      stock: c.made > 0 ? `굿즈 제작 ${nf(c.made)}개${c.rate != null ? ` · 판매율 목표 ${c.rate}%` : ''} · 재고 합의: ${(cellText('ws4.agree.stock') || '(미정)').slice(0, 80)}` : '굿즈 계획이 있다면 제작 수량과 재고 합의를 다시 보세요.',
      schedule: '사전 홍보 2주 + 팝업 4주. 시공·제작·강사 섭외·협의가 겹치는 구간은 언제인가요?',
      performance: `방문자 목표 ${nf(c.visitors)}명 · 홍보비 ${nf(c.items.promo)}만 원${c.check2 != null ? ` · 2주차 점검선 ${nf(c.check2)}명` : ''}`,
      rights: `사전 합의 4칸 중 ${AGREE4.filter(a => isFilled('ws4.agree.' + a.id)).length}칸 작성됨 · 데이터: ${(cellText('ws4.agree.data') || '(미정)').slice(0, 60)}` }[r.id];
    return mk({ title: `리스크 · ${r.name}`, q: `${r.what}. 우리 협업에서 이 일이 일어날 가능성과, 일어났을 때 무엇이 무너지나요?`,
      sub: `<div class="note"><b>교안의 일반론</b> — 위험도 ${LVL[r.gLevel]} · 사전 대응: ${esc(r.gPre)} · 발생 후: ${esc(r.gPost)}<br><b>앞 실습에서 가져온 사실</b>: ${esc(ctx)}</div>`,
      why: '일반론을 베끼지 말고, 우리 협업에 대입하세요. 같은 리스크라도 앞 실습의 숫자(사전 홍보 2주, 굿즈 수량, 홍보비 등)에 따라 위험도가 달라집니다. 사전 대응은 계약·일정·숫자로 막는 것, 발생 후 대응은 터진 뒤 수습하는 것입니다.',
      fields: [F.S('level', '우리 협업에서 발생 가능성', [{ v: 'high', l: '높음' }, { v: 'mid', l: '중간' }, { v: 'low', l: '낮음' }]), F.L('impact', '발생 시 영향 (앞 실습의 숫자를 근거로)'), F.L('pre', '사전 대응 (누가·언제·무엇을)'), F.L('post', '발생 후 대응')] });
  }
  if (key === 'ws6.biggest') {
    return mk({ title: '가장 큰 리스크 하나와 근거', q: '내 설계에서 가장 약한 곳은 어디입니까? 우리가 직접 막을 수 있는 것과 고객·파트너의 행동이라 통제할 수 없는 것을 나눠 보세요.',
      why: '교안 예시는 "기대 성과 미달"(고객의 행동이라 직접 정할 수 없음), 해설집 예시는 "일정 지연"(세 가지가 동시에 진행되어 연쇄로 흔들림)을 골랐습니다. 둘 다 다른 근거로 가능합니다. 통제 가능성과 연쇄 영향을 따져 보세요.',
      fields: [F.S('risk', '가장 큰 리스크', RISKS.map(r => ({ v: r.id, l: r.name }))), F.L('reason', '그 근거 (앞 실습의 숫자나 선택을 인용하세요)')] });
  }
  if (key === 'ws6.stop') {
    const c = compute();
    return mk({ title: '협업을 중단해야 할 기준선', q: '언제 멈출 것입니까? 숫자나 날짜가 들어가야 하고, 누가 멈출지도 정해야 합니다.',
      sub: `<div class="note">${c.check2 != null ? `실습 ⑤에서 계산된 2주차 점검선: ${nf(c.check2)}명 · 축소 기준선: ${nf(c.stop)}명` : '실습 ⑤에서 방문자 목표를 정하면 점검선이 여기 보입니다.'}</div>`,
      why: '기준선은 시작 전에 정해야 합니다. 진행 중에 정하면 이미 쓴 돈이 아까워 아무도 멈추자고 말하지 못합니다. "중단 기준선이 없음"은 감점 사유입니다.',
      fields: [F.L('text', '중단 기준선 (숫자·날짜·결정자 포함)')] });
  }
  if (key === 'ws7.calc') {
    return calcMk({ title: '내 계산 점검 (실습 ⑦ 기대 효과)', q: '이익률(GP) 30%를 가정하고 투입과 비교해 보세요.',
      fields: [F.C('gp', '기간 내 이익은 몇 만 원입니까? (이익률 30%)', () => compute().gp, { unit: '만 원', formula: '증분 매출(억 원) × 10,000 × 30%' }),
        F.C('net', '기간 내 이익 − 투입(쓴 돈)은 몇 만 원입니까? (음수면 모자람)', () => compute().net, { unit: '만 원', formula: '기간 내 이익 − 쓴 돈' })] });
  }
  return null;
}

/* ───────── 화면 렌더 ───────── */
function cellBtn(key, ph, mode) {
  const t = cellText(key);
  if (mode === 'print') return `<div class="pv">${esc(t)}</div>`;
  return `<button type="button" class="cell ${t ? 'filled' : ''}" data-cell="${key}">${t ? esc(t) : `<span class="ph">${esc(ph || '눌러서 작성')}</span>`}</button>`;
}
const th = a => `<thead><tr>${a.map(x => `<th scope="col">${x}</th>`).join('')}</tr></thead>`;
const tdr = (l, h) => `<td data-l="${l}">${h}</td>`;
function principleBox(n) {
  return `<details class="lec prin" open><summary>원리: 왜 이렇게 하나요?</summary><dl class="pr">${PRINCIPLE[n].map(x => `<dt>${esc(x.h)}</dt><dd>${esc(x.b)}</dd>`).join('')}</dl></details>`;
}
function refBox(n) {
  let h = '';
  if (n === 1) h = `<ul>${CASES.map(c => `<li><b>${esc(c.name)}</b> (${c.tag}) — ${esc(c.fact)}</li>`).join('')}</ul>`;
  if (n === 2) h = `<table class="ws"><thead><tr><th>평가 항목</th><th>무엇을 보나</th><th>배점</th><th>낮은 점수의 신호</th></tr></thead><tbody>${CRITS.map(c => `<tr><td class="rh">${c.name}</td><td>${esc(c.what)}</td><td>${c.max}점</td><td>${esc(c.low)}</td></tr>`).join('')}</tbody></table>`;
  if (n === 3) h = '<ul><li>주요 프로모션 유형: 공동 할인 행사(두 브랜드 제품 구매 시 추가 할인) · 공동 스탬프 이벤트(양사 채널에서 스탬프를 모아 경품 교환) · 포인트 적립(협력사 포인트 통합 운영) · 럭키드로우(구매 시 자동 응모) · 사은품 증정(구매 금액별 한정판 굿즈)</li><li>콘텐츠 중심의 현대적 협업: 숏폼·릴스, 해시태그 챌린지·크리에이터 협력, 라이브커머스</li><li>네이버웹툰 팝업스토어 방문객 17만 명 돌파 — 온라인에서 쌓인 팬덤이 오프라인으로 사람을 불러옵니다.</li><li>협업 전략의 핵심 요소: 목표 · 타깃 · 차별화 포인트.</li></ul>';
  if (n === 4) h = `<table class="ws"><thead><tr><th>항목</th><th>주로 백화점이 부담</th><th>주로 파트너가 부담</th><th>협의로 정하는 것</th></tr></thead><tbody>${ITEMS4.filter(i => i.id !== 'reserve').map(i => `<tr><td class="rh">${i.name}</td><td>${esc(i.dept)}</td><td>${esc(i.partner)}</td><td>${esc(i.nego)}</td></tr>`).join('')}</tbody></table><p><b>반드시 사전에 정해야 할 다섯 가지</b> ① 미판매 재고를 누가 가져가는가 ② 공동 제작물의 저작권은 누구에게 있는가 ③ 수집한 고객 데이터를 양사가 어디까지 쓸 수 있는가 ④ 성과가 목표에 미달하면 어떻게 하는가 ⑤ 협업 종료 후 재고와 콘텐츠를 어떻게 처리하는가. 실제 계약은 법무 검토가 필요합니다.</p>`;
  if (n === 5) h = '<table class="ws"><thead><tr><th>구분</th><th>KPI</th><th>측정 방법</th><th>성과 귀속</th><th>주의점</th></tr></thead><tbody><tr><td class="rh">공동 목표</td><td>협업 기간 총 매출 · 방문객 수</td><td>행사 기간 실적 − 기준 기간</td><td>양사 공동</td><td>기준 기간 설정에 합의 필요</td></tr><tr><td class="rh">백화점 측</td><td>신규 회원 가입 · 앱 다운로드 · 객단가</td><td>가입 경로 태깅</td><td>백화점</td><td>파트너 채널 유입분을 구분</td></tr><tr><td class="rh">파트너 측</td><td>브랜드 인지도 · SNS 언급량 · 굿즈 판매</td><td>사전·사후 조사 · 판매 데이터</td><td>파트너</td><td>굿즈 매출의 정산 방식 사전 합의</td></tr><tr><td class="rh">공유 지표</td><td>SNS 해시태그 도달 · 미디어 노출</td><td>해시태그 · 클리핑 집계</td><td>양사 공유</td><td>집계 도구와 기준을 통일</td></tr></tbody></table>';
  if (n === 6) h = `<table class="ws"><thead><tr><th>리스크</th><th>어떤 상황</th><th>사전 대응</th><th>발생 후 대응</th><th>위험도</th></tr></thead><tbody>${RISKS.map(r => `<tr><td class="rh">${r.name}</td><td>${esc(r.what)}</td><td>${esc(r.gPre)}</td><td>${esc(r.gPost)}</td><td>${LVL[r.gLevel]}</td></tr>`).join('')}</tbody></table><p>가장 흔한 실패는 화제성만 보고 파트너를 고른 경우입니다. 유명할수록 리스크도 큽니다. 교육 목적의 개괄적 안내이며 법률 자문이 아닙니다.</p>`;
  if (n === 8) h = `<table class="ws"><thead><tr><th>발표 순서</th><th>시간</th><th>이 말이 나오면 합격</th><th>이 말이 나오면 감점</th></tr></thead><tbody>${PRESENT.map(x => `<tr><td class="rh">${x.id}. ${x.name}<div class="help">${esc(x.q)}</div></td><td>${x.time}</td><td>${esc(x.ok)}</td><td>${x.bad.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table><p><b>질의응답 추천 질문</b> ${QNA.map(esc).join(' · ')}</p>`;
  return h ? `<details class="lec"><summary>교안 자료 보기</summary>${h}</details>` : '';
}
function checkCard(n, mode) {
  const L = CHECKLIST[n]; if (!L) return '';
  if (mode === 'print') return `<table class="ws"><tbody><tr><td class="rh">자기 점검</td><td>${L.map((t, i) => (state.chk[n + ':' + i] ? '■ ' : '□ ') + esc(t)).join('<br>')}</td></tr></tbody></table>`;
  return `<div class="card"><h3>자기 점검 (해설집의 채점 기준에서)</h3><div class="help" style="color:var(--sub);font-size:14px">모두 체크할 수 있는지 스스로 확인하세요. 체크할 수 없는 항목이 이번 실습의 약점입니다.</div>${L.map((t, i) => `<label class="chkrow"><input type="checkbox" data-chk="${n}:${i}" ${state.chk[n + ':' + i] ? 'checked' : ''}> <span>${esc(t)}</span></label>`).join('')}</div>`;
}
function exButtons(n, mode) {
  if (mode === 'print' || n > 7) return '';
  const open = exOpen(n);
  return `<div class="row-actions"><button type="button" class="btn" data-compare="${n}" ${open ? '' : 'disabled'}>예시답안과 통째로 비교 (교안판 · 해설집판)</button>${open ? '' : '<span class="help" style="color:var(--sub);align-self:center">🔒 이 실습의 필수 칸을 모두 채우면 열립니다.</span>'}</div>`;
}
function head(n, mode) {
  const s = STEPS[n - 1], p = (n >= 7) ? null : reqProgress(n);
  return `<h1>실습 ${CIRC[n - 1]} ${esc(s.name)}</h1><p class="lead">${esc(s.brief)} (${s.time}분)${p && mode !== 'print' ? ` · 필수 칸 ${p.done}/${p.total}` : ''}</p>`;
}
const briefTable = () => `<table class="ws"><tbody>${BRIEF.map(([a, b]) => `<tr><td class="rh" style="width:18%">${a}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`;

function renderWS(n, mode = 'edit') {
  let h = head(n, mode);
  if (mode === 'edit') h += principleBox(n) + refBox(n);
  if (n === 1) {
    h += `<p>네 사례를 같은 항목으로 비교합니다. 칸을 누르면 질문이 열립니다. <b>먼저 내 말로 쓰고</b>, 쓴 뒤에 예시답안과 비교하세요.</p>`;
    h += `<table class="ws">${th(['비교 항목', ...CASES.map(c => `${esc(c.name)}<div class="help" style="font-weight:400">(${c.tag})</div>`)])}<tbody>${ITEMS1.map(it => `<tr><td class="rh" data-l="비교 항목">${it.name}</td>${CASES.map(c => tdr(esc(c.name), cellBtn(`ws1.${it.id}.${c.id}`, '', mode))).join('')}</tr>`).join('')}</tbody></table>`;
    h += `<table class="ws">${th(['성공 요인 / 우리 협업에 어떻게 적용할 것인가'])}<tbody>${[1, 2, 3].map(i => `<tr>${tdr('성공 요인 ' + i, cellBtn('ws1.take.' + i, `성공 요인 ${i} 작성`, mode))}</tr>`).join('')}</tbody></table>`;
  }
  if (n === 2) {
    h += `<div class="card"><h3>실습 브리프 (교육용으로 구성한 가상 자료입니다)</h3>${briefTable()}</div>`;
    h += `<table class="ws"><caption style="text-align:left;font-weight:700">협업 후보 5곳</caption>${th(['후보', '유형', '도달 규모', '주 타깃', '예상 비용', '특징 · 유의점'])}<tbody>${CANDS.map(c => `<tr><td class="rh" data-l="후보">${c.id}</td>${tdr('유형', esc(c.type))}${tdr('도달 규모', esc(c.reach))}${tdr('주 타깃', esc(c.target))}${tdr('예상 비용', esc(c.costTxt))}${tdr('특징', esc(c.note))}</tr>`).join('')}</tbody></table>`;
    const t = ws2Totals();
    h += `<table class="ws"><caption style="text-align:left;font-weight:700">채점표 (항목 줄을 눌러 채점)</caption>${th(['평가 항목', '배점', ...CANDS.map(c => c.id + ' ' + esc(c.name)), '채점 근거'])}<tbody>${CRITS.map(cr => { const k = 'ws2.score.' + cr.id, o = G(k), done = isFilled(k); return `<tr><td class="rh" data-l="평가 항목">${cr.name}</td>${tdr('배점', cr.max)}${CANDS.map(c => tdr(c.id, mode === 'print' ? (done ? o['s_' + c.id] : '') : `<button type="button" class="cell ${done ? 'filled' : ''}" data-cell="${k}" aria-label="${cr.name} ${c.id}">${done ? esc(o['s_' + c.id]) : '<span class="ph">–</span>'}</button>`)).join('')}${tdr('채점 근거', mode === 'print' ? esc(o.reason) : `<button type="button" class="cell ${o.reason ? 'filled' : ''}" data-cell="${k}">${o.reason ? esc(o.reason) : '<span class="ph">근거 작성</span>'}</button>`)}</tr>`; }).join('')}<tr><td class="rh">합계</td><td>100</td>${CANDS.map(c => tdr('합계 ' + c.id, `<b>${t ? t[c.id] : '-'}</b>`)).join('')}<td></td></tr></tbody></table>`;
    h += `<table class="ws">${th(['최종 판단 (선정한 파트너와 결정적 이유 / 선택하지 않은 후보와 이유 / 조합 검토)'])}<tbody><tr>${tdr('최종 판단', cellBtn('ws2.final', '선정 · 버린 이유 · 조합 검토', mode))}</tr></tbody></table>`;
    if (mode === 'edit') h += `<div class="row-actions"><button type="button" class="btn" data-cell="ws2.calc">내 계산 점검하기 (75%? 252만 명? 내 파트너 비용?)</button></div>`;
  }
  if (n === 3) {
    const p2 = G('ws2.final').selected || [];
    h += `<p>실습 ②에서 고른 파트너: <b>${p2.length ? p2.map(id => id + '. ' + CANDS.find(c => c.id === id).name).join(' + ') : '(아직 없음)'}</b>. 파트너 조합이 달라지면 컨셉도 달라집니다.</p>`;
    h += `<table class="ws">${th(['항목', '내 설계'])}<tbody>${[...CONCEPT_ROWS, ...PROMO_ROWS].map(r => `<tr><td class="rh" data-l="항목">${r.name}</td>${tdr('내 설계', cellBtn('ws3.' + r.id, '', mode))}</tr>`).join('')}</tbody></table>`;
  }
  if (n === 4) {
    const c = compute();
    h += `<table class="ws">${th(['항목', '금액 · 비용 부담 · 역할', '협의 필요 사항'])}<tbody>${ITEMS4.map(it => { const o = G('ws4.item.' + it.id); return `<tr><td class="rh" data-l="항목">${it.name}</td>${tdr('금액 · 역할', cellBtn('ws4.item.' + it.id, '금액·역할 입력', mode))}${tdr('협의', esc(o.nego))}</tr>`; }).join('')}<tr><td class="rh">합계</td><td colspan="2"><b>${fm(c.spent)}</b> / 4억 원 (${(c.pct * 100).toFixed(1)}%) · 남은 예산 <b class="${c.remain < 0 ? 'over' : ''}">${fm(c.remain)}</b></td></tr></tbody></table>`;
    h += `<table class="ws">${th(['사전 합의 항목', '우리 팀의 합의안'])}<tbody>${AGREE4.map(a => `<tr><td class="rh" data-l="사전 합의 항목">${a.name}</td>${tdr('합의안', cellBtn('ws4.agree.' + a.id, '', mode))}</tr>`).join('')}</tbody></table>`;
    if (mode === 'edit') h += `<div class="row-actions"><button type="button" class="btn" data-cell="ws4.calc">내 계산 점검하기 (합계? 예산 대비 %? 여유?)</button></div>`;
  }
  if (n === 5) {
    h += `<table class="ws">${th(['구분', 'KPI', '현재값', '목표값 · 측정 방법', '성과 귀속'])}<tbody>${KPIS.map(x => `<tr><td class="rh" data-l="구분">${x.grp}</td>${tdr('KPI', esc(x.name))}${tdr('현재값', esc(x.cur))}${tdr('목표값 · 측정', cellBtn('ws5.kpi.' + x.id, '목표 · 측정 입력', mode))}${tdr('성과 귀속', x.own)}</tr>`).join('')}</tbody></table>`;
    h += `<table class="ws">${th(['합의 사항', '우리 팀의 안'])}<tbody>${KPI_AGREE.map(a => `<tr><td class="rh" data-l="합의 사항">${a.name}</td>${tdr('안', cellBtn('ws5.agree.' + a.id, '', mode))}</tr>`).join('')}</tbody></table>`;
    if (mode === 'edit') h += `<div class="row-actions"><button type="button" class="btn" data-cell="ws5.calc">내 계산 점검하기 (1인당 매출 · 전환율 · 점검선 · 판매 수량)</button></div>`;
  }
  if (n === 6) {
    h += `<table class="ws">${th(['리스크', '교안 일반 위험도', '우리 협업에서 발생 가능성', '발생 시 영향', '사전 대응', '발생 후 대응'])}<tbody>${RISKS.map(r => { const k = 'ws6.risk.' + r.id, o = G(k), t = isFilled(k); const bt = txt => mode === 'print' ? esc(txt) : `<button type="button" class="cell ${t ? 'filled' : ''}" data-cell="${k}">${txt ? esc(txt) : '<span class="ph">작성</span>'}</button>`; return `<tr><td class="rh" data-l="리스크">${r.name}<div class="help" style="font-weight:400;color:var(--sub);font-size:13px">${r.what}</div></td>${tdr('교안 일반 위험도', LVL[r.gLevel])}${tdr('발생 가능성', bt(LVL[o.level] || ''))}${tdr('발생 시 영향', bt(o.impact || ''))}${tdr('사전 대응', bt(o.pre || ''))}${tdr('발생 후 대응', bt(o.post || ''))}</tr>`; }).join('')}</tbody></table>`;
    h += `<table class="ws">${th(['가장 큰 리스크 하나와 그 근거', '협업을 중단해야 할 기준선'])}<tbody><tr>${tdr('가장 큰 리스크', cellBtn('ws6.biggest', '선택 · 근거', mode))}${tdr('중단 기준선', cellBtn('ws6.stop', '중단 기준선', mode))}</tr></tbody></table>`;
  }
  if (n === 7) h += render7(mode);
  if (n === 8) h += render8(mode);
  h += checkCard(n, mode) + exButtons(n, mode);
  return h;
}

/* 실습 ⑦ */
function draft7() {
  const c = compute(), f = G('ws2.final'), sel = (f.selected || []).map(id => `${id}(${CANDS.find(k => k.id === id).name})`);
  const t = key => (cellText(key) || '').replace(/\n+/g, ' / ');
  const takes = [1, 2, 3].map(i => G('ws1.take.' + i).factor).filter(Boolean).join(', ');
  const ws3 = [...CONCEPT_ROWS, ...PROMO_ROWS].map(r => t('ws3.' + r.id).split(' / ')[0]).filter(Boolean).join(' · ');
  const items = ITEMS4.map(it => `${it.name} ${nf(c.items[it.id])}만`).join(', ');
  const kp = KPIS.map(x => t('ws5.kpi.' + x.id).split(' / ')[0]).filter(Boolean).join(' · ');
  const rk = RISKS.map(r => { const o = G('ws6.risk.' + r.id); return o.level ? `${r.name}(${LVL[o.level]})` : ''; }).filter(Boolean).join(', ');
  const bg = G('ws6.biggest'), br = RISKS.find(r => r.id === bg.risk);
  return {
    1: `20~30대 방문 비중 24%, 앱 미가입 신규 고객 확보가 필요합니다. 6주, 4억 원 안에서 달성하려 합니다. 사례에서 가져갈 것: ${takes || '(실습 ① 작성 필요)'}`,
    2: `선정: ${sel.join(' + ') || '(미정)'} · 파트너 비용 ${fm(c.partner)}. 이유: ${f.reason || '(이유 작성 필요)'}. 제외: ${CANDS.filter(x => !(f.selected || []).includes(x.id) && f['rej_' + x.id]).map(x => `${x.id}(${f['rej_' + x.id]})`).join(', ') || '-'}`,
    3: ws3 || '(실습 ③ 작성 필요)',
    4: `${items}. 쓴 돈 ${fm(c.spent)} / 4억 원 (여유 ${fm(c.remain)}). 사전 합의: ${AGREE4.map(a => (G('ws4.agree.' + a.id).text || '').slice(0, 40)).filter(Boolean).join(' / ') || '-'}`,
    5: kp || '(실습 ⑤ 작성 필요)',
    6: `${rk || '(실습 ⑥ 작성 필요)'}${br ? `. 가장 큰 리스크: ${br.name}` : ''}. 중단 기준선: ${(G('ws6.stop').text || '-').slice(0, 80)}`,
    7: `증분 매출 ${c.sales ?? '-'}억 원, 방문자 ${nf(c.visitors)}명 목표.${c.rev1 != null ? ` 방문자 1인당 약 ${nf(c.rev1)}원.` : ''}${c.gp != null ? ` 이익률 30% 기준 기간 내 이익 ${fm(c.gp)} vs 투입 ${fm(c.spent)}.` : ''}`,
  };
}
const SEC7 = ['1. 배경과 협업 목적', '2. 파트너 선정과 근거', '3. 협업 컨셉과 프로모션', '4. 역할·비용 분담', '5. KPI와 성과 귀속', '6. 리스크와 대응', '7. 기대 효과'];
const SRC7 = ['CASE · WS 01', 'WS 02', 'WS 03', 'WS 04', 'WS 05', 'WS 06', '전체'];
function render7(mode) {
  const dr = draft7(), c = compute();
  let h = `<p>앞 실습 내용이 자동으로 모였습니다. <b>그대로 두지 말고 내 문장으로 다듬으세요.</b> "많이", "충분히" 같은 말은 숫자로 바꿉니다.</p>`;
  h += `<table class="ws">${th(['구성', '내용', '가져올 워크시트'])}<tbody>${SEC7.map((s, i) => { const o = G('ws7.sec.' + (i + 1)); const val = o.text ?? dr[i + 1]; return `<tr><td class="rh" data-l="구성">${s}</td>${tdr('내용', mode === 'print' ? `<div class="pv">${esc(val)}</div>` : `<textarea data-sec="${i + 1}" aria-label="${s}" class="inl-ta">${esc(val)}</textarea><button type="button" class="btn small" data-act7="reset" data-i="${i + 1}">다시 자동 채우기</button>`)}${tdr('가져올 워크시트', SRC7[i])}</tr>`; }).join('')}</tbody></table>`;
  const k = id => num(G('ws5.kpi.' + id).target);
  const T = [['share', '20~30대 방문 비중', '24%', k('share') != null ? k('share') + '%' : '(실습 ⑤)'], ['app', '신규 회원 가입 (6주)', '—', k('app') != null ? nf(k('app')) + '명' : '(실습 ⑤)'], ['sales', '협업 기간 증분 매출', '—', k('sales') != null ? k('sales') + '억 원' : '(실습 ⑤)']];
  h += `<table class="ws">${th(['전체 정량 목표', '현재', '협업 후 목표 (실습 ⑤ 값)', '달성 방법'])}<tbody>${T.map(([id, l, cur, tg]) => `<tr><td class="rh" data-l="목표">${l}</td>${tdr('현재', cur)}${tdr('목표', tg)}${tdr('달성 방법', mode === 'print' ? esc(G('ws7.target.' + id).how) : `<textarea data-tgt="${id}" aria-label="${l} 달성 방법" class="inl-ta" style="min-height:60px">${esc(G('ws7.target.' + id).how)}</textarea>`)}</tr>`).join('')}</tbody></table>`;
  h += `<div class="card"><h3>기대 효과 계산 (이익률 30% 가정 — 교안·해설집 예시의 GP 30%)</h3><dl class="kv"><dt>증분 매출 × 30% = 기간 내 이익</dt><dd>${c.gp != null ? fm(c.gp) : '-'}</dd><dt>투입 (실습 ④ 쓴 돈)</dt><dd>${c.spent > 0 ? fm(c.spent) : '-'}</dd><dt>이익 − 투입</dt><dd class="${c.net != null && c.net < 0 ? 'over' : ''}">${c.net != null ? fm(c.net) : '-'}</dd></dl><div class="help" style="color:var(--sub);font-size:14px">모자라거나 같다면, 투자가 회수되는 근거는 확보한 신규 회원이 이후에도 구매를 이어가는 것입니다. 이 설명을 "7. 기대 효과"에 쓰세요.</div>${mode === 'edit' ? '<div class="row-actions"><button type="button" class="btn" data-cell="ws7.calc">내 계산 점검하기</button></div>' : ''}</div>`;
  if (mode === 'edit') h += `<div class="row-actions"><button type="button" class="btn accent" id="dlAll">전체 인쇄(PDF)</button><button type="button" class="btn" id="dlCsv">전체 CSV 내려받기</button><button type="button" class="btn" id="dlJson">이어하기 파일(JSON) 저장</button></div>`;
  return h;
}
/* 실습 ⑧ */
function render8(mode) {
  let h = `<p>6분 발표를 네 파트로 나눕니다. 파트마다 <b>"합격 문장"을 내 협업의 숫자로 바꿔</b> 한 줄씩 써 보세요.</p>`;
  h += `<table class="ws">${th(['발표 순서', '시간', '합격 문장 (참고)', '감점 문장', '내 발표 한 줄'])}<tbody>${PRESENT.map(x => { const o = G('ws8.say.' + x.id); return `<tr><td class="rh" data-l="발표 순서">${x.id}. ${x.name}<div class="help" style="font-weight:400;color:var(--sub);font-size:13px">${esc(x.q)}</div></td>${tdr('시간', x.time)}${tdr('합격 문장', esc(x.ok))}${tdr('감점 문장', x.bad.map(esc).join('<br>'))}${tdr('내 발표 한 줄', mode === 'print' ? esc(o.text) : `<textarea data-say="${x.id}" aria-label="${x.name} 내 발표 한 줄" class="inl-ta" style="min-height:70px">${esc(o.text)}</textarea>`)}</tr>`; }).join('')}</tbody></table>`;
  h += `<table class="ws">${th(['평가 항목 (각 25점)', '25점 · 탁월', '20점 · 충족', '15점 이하 · 미흡'])}<tbody>
    <tr><td class="rh">파트너 선정의 논리성</td><td>여섯 항목 근거가 모두 채워졌고, 선정 이유보다 탈락 이유가 더 구체적이며, 조합까지 검토함</td><td>채점은 논리적이나 탈락 이유가 짧음</td><td>합계 1위를 기계적으로 선택 / 예산 초과를 인지하지 못함</td></tr>
    <tr><td class="rh">협업 컨셉의 차별성</td><td>두 브랜드를 잇는 접점이 컨셉으로 표현되고, 어느 한쪽만으로는 불가능한 경험이 설계됨</td><td>컨셉은 있으나 경험 설계가 다소 평범함</td><td>브랜드명 나열 / 로고 두 개를 붙인 수준</td></tr>
    <tr><td class="rh">역할·비용 분담의 구체성</td><td>여섯 항목에 금액이 있고 합계가 예산 이내이며, 사전 합의 4개 항목에 답이 있음</td><td>분담은 되어 있으나 사전 합의가 일부 비어 있음</td><td>백화점 단독 부담 / 금액 없이 서술만 있음</td></tr>
    <tr><td class="rh">KPI와 리스크 대응의 현실성</td><td>KPI에 측정 방법과 귀속이 있고, 리스크에 중단 기준선까지 정해짐</td><td>KPI는 있으나 측정 방법이 추상적</td><td>"매출 증대" 수준 / 리스크 전부 낮음</td></tr></tbody></table>`;
  return h;
}

/* ───────── 오른쪽 패널 ───────── */
function bar(label, val, max) { const pct = Math.max(0, Math.min(100, val / max * 100)); return `<div>${esc(label)} <b>${nf(val)}만</b> (${(val / max * 100).toFixed(0)}%)</div><div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`; }
function renderSide() {
  const n = state.step, c = compute(), adv = allAdvice(n);
  let h = `<h2>자문 카드</h2>`;
  h += adv.length ? adv.map(advHtml).join('') : `<div class="note">지금은 걸리는 점이 없습니다. 칸을 채우면 조건에 맞는 자문이 이곳에 뜨고, 고치면 사라집니다.</div>`;
  h += `<div class="row-actions"><button type="button" class="btn small" data-top="consult">막혔어요 · 자문 구하기</button><button type="button" class="btn small" data-top="listen">조언 듣기</button></div>`;
  const R = [];
  if (c.partner > 0 || isFilled('ws2.final')) R.push(['파트너 비용', `${nf(c.partner)}만 원`, '선택한 후보 비용의 합'], ['예산 대비', `${(c.partner / BUDGET * 100).toFixed(1)}%`, '파트너 비용 ÷ 40,000']);
  if (c.spent > 0) R.push(['쓴 돈 (실습 ④)', `${nf(c.spent)}만 원`, '7개 항목의 합'], ['예산 사용률', `${(c.pct * 100).toFixed(1)}%`, '쓴 돈 ÷ 40,000'], ['남은 예산', `${nf(c.remain)}만 원${c.remain < 0 ? ' (초과)' : ''}`, '40,000 − 쓴 돈']);
  if (c.multiple != null) R.push(['증분 매출 ÷ 쓴 돈', `${c.multiple.toFixed(1)}배`, '매출(억)×10,000 ÷ 쓴 돈']);
  if (c.gp != null) R.push(['기간 내 이익 (GP 30%)', `${nf(c.gp)}만 원`, '증분 매출 × 30%']);
  if (c.rev1 != null) R.push(['방문자 1인당 매출', `${nf(c.rev1)}원`, '매출 ÷ 방문자']);
  if (c.conv != null) R.push(['앱 가입 전환율', `${c.conv.toFixed(1)}%`, '신규 회원 ÷ 방문자']);
  if (c.check2 != null) R.push(['2주차 점검선 (60%)', `${nf(c.check2)}명`, '방문자 × 1/2 × 0.6'], ['축소 운영 기준선 (40%)', `${nf(c.stop)}명`, '방문자 × 1/2 × 0.4']);
  if (c.sold != null) R.push(['굿즈 판매 / 남는 수량', `${nf(c.sold)} / ${nf(c.made - c.sold)}개`, '제작 × 판매율']);
  if (c.cap > 0) R.push(['예약제 정원', `${nf(c.cap)}명`, '회차 × 인원 × 일수']);
  h += `<h2>원리 계산기 (식과 함께 보기)</h2>` + (R.length ? `<dl class="kv">${R.map(([a, b, f]) => `<dt>${a}<small>${f}</small></dt><dd>${b}</dd>`).join('')}</dl>` : '<div class="note">입력한 숫자에서 계산되는 값이 여기에 식과 함께 나타납니다.</div>');
  if (c.spent > 0) h += `<h2>항목별 비중 (총 예산 4억 원)</h2>` + ITEMS4.map(it => bar(it.name, c.items[it.id], BUDGET)).join('');
  h += `<details class="lec"><summary>숫자가 안 맞을 때 점검 순서</summary><ol>${NUMBER_CHECK.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>`;
  $('#side').innerHTML = h;
}

/* ───────── 자문 / 조언 듣기 / 맞춤 점검 / 예시 비교 ───────── */
function openConsult(n) {
  n = n || state.step;
  const html = `<h2 id="mTitle2">자문 구하기 · 실습 ${CIRC[n - 1]}</h2><p class="lead">정답을 알려 드리지 않고, 스스로 답을 찾도록 질문을 돌려 드립니다. 해당하는 막힘을 눌러 보세요.</p>
    ${(CONSULT[n] || []).map(x => `<details class="sym"><summary>${esc(x.s)}</summary><ul>${x.q.map(q => `<li>${esc(q)}</li>`).join('')}</ul></details>`).join('')}
    ${n >= 2 ? `<details class="sym"><summary>결과(숫자)가 제대로 안 나와요</summary><ul>${NUMBER_CHECK.map(q => `<li>${esc(q)}</li>`).join('')}</ul></details>` : ''}
    <details class="sym"><summary>원리 다시 보기</summary><ul>${PRINCIPLE[n].map(q => `<li><b>${esc(q.h)}</b> — ${esc(q.b)}</li>`).join('')}</ul></details>
    <div class="mbtns"><button type="button" class="btn accent" data-act="cancel">닫기 (Esc)</button></div>`;
  openSimple(html, e => { if (e.target.closest('[data-act=cancel]')) closeSimple(); });
}
function openListen() {
  const n = state.step, adv = allAdvice(n);
  const strong = adv.find(a => a.lv === 'grn'), weak = adv.find(a => a.lv === 'red') || adv.find(a => a.lv === 'org');
  const Q = { 1: '그래서 네 사례 중 우리 목표(20~30대 신규)에 가장 가까운 사례는 무엇이고, 나머지를 버린다면 무엇을 포기합니까?', 2: '점수 1위가 아닌 후보를 골랐다면 무엇이 점수에 반영되지 않았습니까? 1위를 골랐다면 예산 4억과 6주는 정말 통과합니까?', 3: '이 팝업을 로고 없이 설명한다면 고객이 할 수 있는 새로운 행동은 무엇입니까?', 4: '"파트너는 왜 이 협업을 합니까?" 그리고 문제가 생기면 어디서 돈을 씁니까?', 5: '방문자 숫자가 목표의 60%에 못 미치면 무엇을 바꾸기로 했습니까?', 6: '가장 큰 리스크가 현실이 되면 누가 언제 무엇을 결정합니까?', 7: '이 기획안에서 숫자가 바뀌면 영향을 받는 다른 칸은 어디입니까?', 8: '"파트너는 왜 이 협업을 합니까"에 한 문장으로 답할 수 있습니까?' };
  const html = `<h2 id="mTitle2">조언 듣기</h2><p class="lead">지금 입력한 내용만으로 세 가지를 말씀드립니다. 선택은 학습자가 합니다.</p>
    <div class="adv lv-grn"><span class="badge lv-grn">강점</span>${esc(strong ? strong.msg : '아직 뚜렷한 강점이 보이지 않습니다. 근거(숫자)를 채울수록 강점이 드러납니다.')}</div>
    <div class="adv lv-org"><span class="badge lv-org">가장 약한 곳</span>${esc(weak ? weak.msg : '지금 입력한 범위에서는 걸리는 점이 없습니다. 입력하지 않은 칸이 약한 곳일 수 있습니다.')}${weak && weak.why ? `<small>${esc(weak.why)}</small>` : ''}</div>
    <div class="adv lv-info"><span class="badge lv-info">스스로 생각해 볼 질문</span>${esc(Q[n])}</div>
    <div class="mbtns"><button type="button" class="btn accent" data-act="cancel">닫기</button></div>`;
  openSimple(html, e => { if (e.target.closest('[data-act=cancel]')) closeSimple(); });
}
function crossChecks(upto, d = state.d) {
  const c = compute(d), out = [], lic = G('ws4.item.license', d);
  if (upto >= 4 && lic.snap != null && lic.snap !== c.partner) out.push({ msg: `실습 ②에서 고른 파트너 비용(${nf(c.partner)}만 원)과 실습 ④의 라이선스(${nf(lic.snap)}만 원)가 다릅니다.`, go: 4, key: 'ws4.item.license' });
  if (upto >= 4 && c.spent > BUDGET) out.push({ msg: `실습 ④의 쓴 돈(${fm(c.spent)})이 예산 4억 원을 넘습니다.`, go: 4, key: 'ws4.calc' });
  if (upto >= 5 && c.sales != null && c.spent > 0 && c.sales * 10000 < c.spent) out.push({ msg: `증분 매출 목표(${c.sales}억 원)가 쓴 돈(${fm(c.spent)})보다 작습니다.`, go: 5, key: 'ws5.kpi.sales' });
  return out;
}
function showChecks(list, onProceed) {
  const html = `<h2 id="mTitle2">넘어가기 전에 앞뒤 숫자를 점검하세요</h2><p class="lead">아래 항목이 어긋나 있습니다. 의도한 것이라면 그대로 넘어가도 됩니다.</p>${list.map((x, i) => `<div class="adv lv-org"><span class="badge lv-org">주의</span>${esc(x.msg)} <button type="button" class="btn small" data-fix="${i}">고치러 가기</button></div>`).join('')}<div class="mbtns"><button type="button" class="btn" data-act="cancel">머무르기</button><button type="button" class="btn accent" data-act="go">그래도 넘어가기</button></div>`;
  openSimple(html, e => {
    if (e.target.closest('[data-act=cancel]')) closeSimple();
    if (e.target.closest('[data-act=go]')) { closeSimple(); onProceed(); }
    const f = e.target.closest('[data-fix]'); if (f) { const x = list[+f.getAttribute('data-fix')]; closeSimple(); setStep(x.go, true); const def = cellDef(x.key); if (def) openModal(def); }
  });
}
function openCompare(n) {
  const body = ['deck', 'book'].map(s => `<section class="cmp"><h2>${esc(EX[s].label)} <small>${esc(EX[s].desc)}</small></h2>${withData(EX[s].d, () => renderWS(n, 'print'))}</section>`).join('');
  const html = `<h2 id="mTitle2">예시답안과 통째로 비교 · 실습 ${CIRC[n - 1]}</h2>
    <div class="note"><b>비교하는 법</b> ① 내 답과 다른 점 한 가지를 찾는다 ② "왜 다른가?"를 스스로 설명한다 ③ 예시도 서로 다르다 — 정답은 하나가 아니라, <b>예산(4억)·일정(6주) 안에서 근거가 남아 있는가</b>가 기준이다.</div>
    ${body}<div class="mbtns"><button type="button" class="btn accent" data-act="cancel">닫기 (Esc)</button></div>`;
  openSimple(html, e => { if (e.target.closest('[data-act=cancel]')) closeSimple(); }, true);
}
function loadExample(setKey) {
  if (!confirm(`지금까지 입력한 내용이 모두 "${EX[setKey].label}"으로 바뀝니다. 계속할까요?\n(강사 시연용 기능입니다. 먼저 '이어하기 저장'을 권장합니다.)`)) return;
  state.d = JSON.parse(JSON.stringify(EX[setKey].d));
  state.d['ws4.item.license'].snap = partnerCost();
  state.chk = {}; persist(); renderAll();
}

/* ───────── 내려받기 ───────── */
function exportRows() {
  const rows = [['실습', '구분', '항목', '내용']];
  for (let n = 1; n <= 6; n++) keysOf(n).forEach(x => { const t = cellText(x.key); if (t) rows.push([`실습 ${n} ${STEPS[n - 1].name}`, x.group, x.label, t]); });
  const dr = draft7(); SEC7.forEach((s, i) => rows.push(['실습 7 전략 기획안', '기획안', s, G('ws7.sec.' + (i + 1)).text ?? dr[i + 1]]));
  ['share', 'app', 'sales'].forEach(id => { const h = G('ws7.target.' + id).how; if (h) rows.push(['실습 7 전략 기획안', '정량 목표 달성 방법', { share: '20~30대 방문 비중', app: '신규 회원 가입', sales: '증분 매출' }[id], h]); });
  PRESENT.forEach(x => { const t = G('ws8.say.' + x.id).text; if (t) rows.push(['실습 8 발표', '내 발표 한 줄', x.name, t]); });
  const c = compute(); rows.push(['계산', '요약', '쓴 돈(만 원)', c.spent], ['계산', '요약', '남은 예산(만 원)', c.remain], ['계산', '요약', '파트너 비용(만 원)', c.partner]);
  return rows;
}
function download(name, mime, data) { const b = new Blob([data], { type: mime }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const stamp = () => (state.meta.team || '조') + '_' + new Date().toISOString().slice(0, 10);
function downloadCsv() { const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; download(`제휴마케팅_${stamp()}.csv`, 'text/csv;charset=utf-8', '﻿' + exportRows().map(r => r.map(q).join(',')).join('\r\n')); }
function downloadJson() { state.meta.updatedAt = new Date().toISOString(); download(`제휴마케팅_이어하기_${stamp()}.json`, 'application/json', JSON.stringify(state, null, 1)); }
function printSteps(list) {
  $('#printArea').innerHTML = list.map(n => `<section><h1>3-6. 제휴 마케팅 운영 · 실습 ${CIRC[n - 1]}</h1><div class="sub">조 ${esc(state.meta.team)} · 작성자 ${esc(state.meta.writer)} · 교육용으로 구성한 가상 자료</div>${renderWS(n, 'print')}</section>`).join('');
  window.print();
}
window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; });

/* ───────── 네비게이션 / 전체 렌더 ───────── */
function setStep(n, force) {
  if (!force && !unlocked(n)) { $('#footMsg').textContent = `실습 ${CIRC[n - 1]}은 앞 실습의 필수 칸을 채워야 열립니다.`; return; }
  state.step = n; persist(); renderAll(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0);
}
function renderNav() {
  $('#nav').innerHTML = STEPS.map(s => {
    const lk = !unlocked(s.n), p = s.n >= 7 ? null : reqProgress(s.n), done = p && p.done === p.total;
    return `<button type="button" data-step="${s.n}" ${s.n === state.step ? 'aria-current="step"' : ''} ${lk ? 'disabled' : ''}>${CIRC[s.n - 1]} ${s.name}<small>${lk ? '🔒 잠김' : p ? (done ? '✓ 완료 ' : '진행 ') + p.done + '/' + p.total : '마무리'}</small></button>`;
  }).join('');
}
function renderAll(focusKey) {
  const y = window.scrollY;
  renderNav(); $('#main').innerHTML = renderWS(state.step); renderSide();
  $('#btnPrev').disabled = state.step === 1; $('#btnNext').disabled = state.step === 8;
  $('#btnNext').textContent = state.step === 6 ? '실습 ⑦ 기획안으로 →' : '다음 실습 →';
  $('#exTools').hidden = !state.showEx; $('#footMsg').textContent = '';
  if (focusKey) { const el = $(`[data-cell="${focusKey}"]`); if (el) el.focus({ preventScroll: true }); }
  window.scrollTo(0, y);
}
function goNext() {
  const n = state.step; if (n >= 8) return;
  const go = () => setStep(n + 1, true);
  if (!state.unlockAll && !stepDone(n)) {
    const p = reqProgress(n);
    $('#footMsg').textContent = `필수 칸이 ${p.total - p.done}개 비어 있습니다. 첫 빈 칸을 열어 드릴게요.`;
    const first = p.miss[0]; const def = first && cellDef(first.key); if (def) openModal(def); return;
  }
  const rel = crossChecks(n).filter(x => x.go <= n);
  if (rel.length) showChecks(rel, go); else go();
}

/* ───────── 이벤트 ───────── */
document.addEventListener('click', e => {
  const cell = e.target.closest('[data-cell]');
  if (cell && $('#overlay').hidden && $('#overlay2').hidden) { const def = cellDef(cell.getAttribute('data-cell')); if (def) openModal(def); return; }
  const st = e.target.closest('[data-step]'); if (st) { setStep(+st.getAttribute('data-step')); return; }
  const top = e.target.closest('[data-top]'); if (top) { if (top.getAttribute('data-top') === 'consult') openConsult(state.step); else openListen(); return; }
  const cmp = e.target.closest('[data-compare]'); if (cmp && !cmp.disabled) { openCompare(+cmp.getAttribute('data-compare')); return; }
  const r7 = e.target.closest('[data-act7=reset]'); if (r7) { delete state.d['ws7.sec.' + r7.getAttribute('data-i')]; persist(); renderAll(); return; }
  const ld = e.target.closest('[data-load]'); if (ld) { loadExample(ld.getAttribute('data-load')); return; }
  if (e.target.id === 'dlAll') printSteps([1, 2, 3, 4, 5, 6, 7]);
  if (e.target.id === 'dlCsv') downloadCsv();
  if (e.target.id === 'dlJson') downloadJson();
});
document.addEventListener('change', e => { const ck = e.target.getAttribute && e.target.getAttribute('data-chk'); if (ck) { state.chk[ck] = e.target.checked; persist(); } });
document.addEventListener('input', e => {
  const g = a => e.target.getAttribute && e.target.getAttribute(a);
  const sec = g('data-sec'); if (sec) { state.d['ws7.sec.' + sec] = { text: e.target.value }; persist(); return; }
  const tg = g('data-tgt'); if (tg) { state.d['ws7.target.' + tg] = { how: e.target.value }; persist(); renderSide(); return; }
  const sy = g('data-say'); if (sy) { state.d['ws8.say.' + sy] = { text: e.target.value }; persist(); return; }
  if (e.target.id === 'team') { state.meta.team = e.target.value; persist(); }
  if (e.target.id === 'writer') { state.meta.writer = e.target.value; persist(); }
});
$('#btnPrev').onclick = () => setStep(state.step - 1, true);
$('#btnNext').onclick = goNext;
$('#btnConsult').onclick = () => openConsult(state.step);
$('#btnSave').onclick = downloadJson;
$('#btnCsv').onclick = downloadCsv;
$('#btnPrint').onclick = () => printSteps(state.step >= 7 ? [1, 2, 3, 4, 5, 6, 7] : [state.step]);
$('#btnLoad').onclick = () => $('#fileLoad').click();
$('#fileLoad').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { const o = JSON.parse(r.result); if (!o || !o.d) throw new Error('형식 오류'); state = Object.assign({ meta: {}, d: {}, chk: {}, unlockAll: false, showEx: false, step: 1 }, o); persist(); init(); $('#footMsg').textContent = '이어하기 파일을 불러왔습니다.'; } catch (err) { alert('불러올 수 없는 파일입니다.'); } };
  r.readAsText(f); e.target.value = '';
};
$('#unlockAll').onchange = e => { state.unlockAll = e.target.checked; persist(); renderAll(); };
$('#showEx').onchange = e => { state.showEx = e.target.checked; persist(); renderAll(); };

function init() {
  $('#team').value = state.meta.team || ''; $('#writer').value = state.meta.writer || '';
  $('#unlockAll').checked = !!state.unlockAll; $('#showEx').checked = !!state.showEx;
  if (!unlocked(state.step)) state.step = 1;
  renderAll();
}
restore(); init();
