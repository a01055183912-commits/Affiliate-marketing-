'use strict';
/* 제휴 마케팅 실습 도우미 — 3-6
   원칙: 정답 표시 없음 / 내 생각 먼저 / 계산은 내가 먼저 / 막히면 자문(되묻기) */

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
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hasDigit = s => /\d/.test(s || '');
const LV = { red: '확인 필요', org: '주의', grn: '좋아요', info: '참고' };

/* ───────── 상태 ───────── */
const KEY = 'affiliate36.v1';
let state = { meta: { team: '', writer: '' }, d: {}, wrap: {}, unlockAll: false, step: 1 };
function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장소를 못 써도 동작 */ } }
function restore() { try { const s = localStorage.getItem(KEY); if (s) { const o = JSON.parse(s); if (o && o.d) state = Object.assign(state, o); } } catch (e) { /* ignore */ } }
const G = (k, d = state.d) => d[k] || {};
function isFilled(key, d = state.d) {
  const o = d[key]; if (!o) return false;
  return Object.values(o).some(v => Array.isArray(v) ? v.length > 0 : (v !== '' && v != null));
}
const ctext = (key, d = state.d) => { const o = G(key, d); return [o.text, ...(o.picked || [])].filter(Boolean).join(' / '); };

/* ───────── 계산 (만 원 단위) ───────── */
function partnerCost(d = state.d) {
  const f = G('ws2.final', d); let s = 0;
  (f.selected || []).forEach(id => { const c = CANDS.find(x => x.id === id); if (!c) return; const neg = num(f.negA); s += (id === 'A' && neg != null) ? neg : c.cost; });
  return s + (num(f.extra) || 0);
}
function promos(d = state.d) {
  const pop = G('ws3.popup', d), ph = G('ws3.photo', d), gd = G('ws3.goods', d), bn = G('ws3.benefit', d);
  return {
    class: (pop.types || []).includes('class'),
    walkin: (pop.types || []).includes('walkin'),
    photo: ph.has === 'yes' && !!ph.text,
    goods: gd.has === 'yes' && !!gd.text,
    coupon: (bn.types || []).includes('coupon'),
    elder: (bn.types || []).includes('elder'),
  };
}
function compute(d = state.d) {
  const lim = G('ws4.limit', d);
  const sales = num(lim.sales), margin = num(lim.margin) ?? 30, mode = lim.mode || 'breakeven';
  const items = {};
  ITEMS4.forEach(it => { items[it.id] = it.id === 'license' ? partnerCost(d) : (num(G('ws4.item.' + it.id, d).amount) || 0); });
  const spent = Object.values(items).reduce((a, b) => a + b, 0);
  const limit = sales != null ? sales * 10000 * margin / 100 : null;
  const shortfall = limit != null ? spent - limit : null;
  const k = id => G('ws5.kpi.' + id, d);
  const visitors = num(k('visitors').target), members = num(k('app').target);
  const sh = k('shared'), gQty = num(sh.qty), gRate = num(sh.rate);
  const pop = G('ws3.popup', d);
  const cap = (num(pop.perDay) || 0) * (num(pop.perClass) || 0) * (num(pop.days) || 0);
  return {
    items, spent, remain: BUDGET - spent, sales, margin, mode, limit, shortfall, visitors, members,
    perPerson: (shortfall > 0 && members > 0) ? shortfall * 10000 / members / (margin / 100) : null,
    rev1: (sales != null && visitors > 0) ? sales * 1e8 / visitors : null,
    check2: visitors > 0 ? visitors * 0.5 * 0.6 : null,
    stop: visitors > 0 ? visitors * 0.5 * 0.4 : null,
    prod: (gQty > 0 && gRate > 0) ? gQty / (gRate / 100) : null, gQty, gRate,
    cap, couponCap: num(G('ws4.coupon', d).cap), partner: partnerCost(d),
  };
}
const ws2Totals = (d = state.d) => {
  const t = {}; CANDS.forEach(c => { t[c.id] = 0; });
  let any = false;
  CRITS.forEach(cr => { const o = G('ws2.score.' + cr.id, d); CANDS.forEach(c => { const v = num(o['s_' + c.id]); if (v != null) { t[c.id] += v; any = true; } }); });
  return any ? t : null;
};

/* ───────── 조언 규칙 ───────── */
const A = (lv, msg, why) => ({ lv, msg, why });

function budgetAdvice(d = state.d) {
  const c = compute(d), out = [];
  const savedItems = ITEMS4.filter(it => it.id !== 'license' && isFilled('ws4.item.' + it.id, d));
  if (!savedItems.length) return out;
  const ph = G('ws3.photo', d);
  if (c.spent > BUDGET) out.push(A('red', `예산 4억 원을 ${nf(c.spent - BUDGET)}만 원 넘었습니다. 어느 항목을 줄일지 정하세요.`, '가장 큰 항목부터 보고, 줄여도 목표에 영향이 적은 곳을 찾아보세요.'));
  if (isFilled('ws4.item.reserve', d) && c.items.reserve === 0) out.push(A('red', '예비비가 없습니다. 6주짜리 현장 행사에서는 예상 밖 비용이 반드시 생깁니다.'));
  const burdens = ITEMS4.filter(it => (G('ws4.item.' + it.id, d).partnerShare || '').trim()).length;
  if (savedItems.length >= 3 && burdens === 0) out.push(A('red', '파트너는 왜 이 협업을 합니까? 얻는 것이 있으면 내는 것도 있어야 합니다.', '"파트너가 부담하는 것" 칸이 모두 비어 있습니다.'));
  if (c.partner > 0 && c.partner / BUDGET >= 0.5) out.push(A('red', '파트너 비용이 예산의 절반을 넘습니다. 나머지 항목이 실행 가능한지 확인하세요.'));
  if (c.spent === BUDGET) out.push(A('org', '예산을 꽉 채웠습니다. 문제가 생기면 어디서 돈을 쓸지 정해 두세요.'));
  if (isFilled('ws4.item.reserve', d) && c.items.reserve > 0 && c.items.reserve < c.spent * 0.05) out.push(A('org', '예비비가 적습니다. 무엇에 대비하는 돈인지 용도를 적어 두세요.', `예비비 ${nf(c.items.reserve)}만 원은 쓴 돈의 ${(c.items.reserve / c.spent * 100).toFixed(1)}%입니다.`));
  ITEMS4.filter(it => it.id !== 'license').forEach(it => { const sh = c.items[it.id] / BUDGET; if (sh >= 0.35) out.push(A('org', `${it.name}에 예산의 ${Math.round(sh * 100)}%를 썼습니다. 다른 항목이 약해지지 않는지 보세요.`)); });
  if (isFilled('ws4.item.promo', d) && c.items.promo <= 7000 && c.visitors >= 70000) out.push(A('org', '홍보비에 비해 방문자 목표가 높습니다. 고객이 대신 알려 줄 장치가 있나요?', `홍보비 ${nf(c.items.promo)}만 원 / 방문자 목표 ${nf(c.visitors)}명`));
  if (c.shortfall != null && c.shortfall > 0 && c.mode === 'breakeven') out.push(A('org', `본전까지 ${nf(c.shortfall)}만 원이 모자랍니다. 비용을 줄이거나 목표 매출을 다시 보세요.`, '"기간 내 본전형"을 택했는데 쓴 돈이 한도를 넘었습니다. 방식을 바꾸는 것도 하나의 선택이지만, 그러면 무엇을 설명해야 할까요?'));
  if (c.shortfall != null && c.shortfall > 0 && c.mode === 'recover') {
    out.push(A('org', c.perPerson != null ? `신규 회원 한 명이 행사 뒤에 약 ${nf(c.perPerson)}원어치를 더 사야 회수됩니다. 가능한 금액인지 생각해 보세요.` : '행사 뒤 회수형입니다. 실습 ⑤에서 신규 앱 회원 목표를 정하면 1인당 추가 구매액이 계산됩니다.'));
  }
  if (c.rev1 != null && c.rev1 > 20000) out.push(A('org', `방문자 한 명당 ${nf(c.rev1)}원의 매출이 늘어야 합니다. 무료 체험 중심이라면 높은 목표입니다.`));
  if (promos(d).class && c.cap > 0 && c.visitors > 0 && c.cap < c.visitors * 0.1) out.push(A('org', '클래스만으로는 방문자 목표를 채울 수 없습니다. 예약 없이 들르는 공간이 필요합니다.', `클래스 정원 ${nf(c.cap)}명 < 방문자 목표의 10% (${nf(c.visitors * 0.1)}명)`));
  const stk = G('ws4.agree.stock', d);
  if (stk.cat === '백화점 매입' && isFilled('ws4.item.reserve', d) && c.items.reserve < 3000) out.push(A('org', '남은 물량을 사 올 돈이 예비비에 있는지 확인하세요.'));
  if (promos(d).coupon && !(c.couponCap > 0)) out.push(A('org', '가입자가 늘수록 쿠폰 비용이 커집니다. 몇 명까지 줄지 정하세요.', '실습 ④의 "쿠폰 한도" 칸에서 정할 수 있습니다.'));
  if (c.couponCap > 0 && c.members > c.couponCap) out.push(A('org', `쿠폰 없이 가입할 ${nf(c.members - c.couponCap)}명은 어떻게 가입시킬지 방법을 적어 주세요.`));
  if (isFilled('ws4.item.reserve', d) && c.items.reserve > 0 && c.spent < BUDGET) out.push(A('grn', '여유를 남기셨습니다. 예상 밖 비용에 대비할 수 있습니다.'));
  if (burdens >= 2) out.push(A('grn', '파트너도 함께 부담합니다. 협업 구조가 성립합니다.'));
  if (AGREE4.every(a => hasDigit(G('ws4.agree.' + a.id, d).text))) out.push(A('grn', '기준을 숫자로 정하셨습니다. 나중에 다툴 여지가 줄어듭니다.'));
  return out;
}

function stepAdvice(n, d = state.d) {
  const out = [];
  if (n === 1) {
    const pur = CASES.map(c => (G('ws1.purpose.' + c.id, d).text || '').trim().replace(/\s+/g, ''));
    if (pur.every(Boolean) && new Set(pur).size === 1) out.push(A('red', '네 사례의 목적이 서로 다릅니다. 구매 부담 완화, 신규 유입, 프리미엄 강화, 차별화 중 어느 쪽인지 다시 구분해 보세요.', '네 칸이 똑같이 적혀 있습니다.'));
    const lux = ctext('ws1.purpose.luxury', d);
    if (/신규|유입|많은 사람/.test(lux)) out.push(A('org', '명품 팝업은 초대받은 상위 고객을 위한 행사입니다. 많은 사람을 부르는 것과는 방향이 다릅니다.', '사례 설명의 "주요 고객 대상 프라이빗 이벤트"를 다시 읽어 보세요.'));
    CASES.forEach(c => {
      const t = ctext('ws1.brand.' + c.id, d);
      if (t && !(/백화점/.test(t) && /(파트너|카드|IP|브랜드|포켓몬|기업|상대)/.test(t))) out.push(A('info', `${c.name}: 백화점이 얻는 것과 파트너가 얻는 것을 따로 써 보세요.`, '"백화점은 …, 파트너는 …"처럼 나눠 쓰면 이 안내가 사라집니다.'));
    });
    if (CASES.every(c => isFilled('ws1.purpose.' + c.id, d)) && ![1, 2, 3].every(i => G('ws1.take.' + i, d).factor)) out.push(A('org', '이 칸을 비워 두면 실습 ②로 이어지지 않습니다. 우리 협업에 가져갈 성공 요인 세 가지를 채워 주세요.'));
  }
  if (n === 2) {
    const f = G('ws2.final', d), sel = f.selected || [], t = ws2Totals(d), c = compute(d);
    if (sel.includes('A')) {
      out.push(A('red', '라이선스 3억 원은 예산의 75%입니다. 남은 1억 원으로 150평 공간, 굿즈, 홍보, 인력을 모두 해야 합니다. 가능한지 실습 ④에서 확인하게 됩니다.'));
      const neg = num(f.negA); if (neg != null && neg < 15000) out.push(A('org', '3억 원을 절반 아래로 낮추는 협상은 현실적으로 어렵습니다. 근거를 적어 주세요.'));
    }
    if (sel.includes('E')) out.push(A('org', '협의 기간이 깁니다. 6주 안에 어떻게 끝낼지 일정을 적어 주세요.', '선정 이유 칸에 일정(주 단위)을 적으면 이 안내를 스스로 해결할 수 있습니다.'));
    if (t && sel.length) {
      const max = Math.max(...Object.values(t)); const topIds = Object.keys(t).filter(k => t[k] === max);
      if (sel.length === 1 && topIds.includes(sel[0]) && !(f.reason || '').trim()) out.push(A('org', '점수는 후보를 좁히는 도구입니다. 목표(20~30대 신규 고객)와 제약(6주, 4억 원)으로 마지막 판단을 해 보세요.'));
    }
    if (num(G('ws2.score.diff', d).s_A) >= 13) out.push(A('org', '화제성과 차별화는 다릅니다. A는 가장 유명하지만 경쟁사도 이미 협업했습니다.'));
    if (num(G('ws2.score.reach', d).s_C) >= 13) out.push(A('org', '회원 900만 명 중 20~30대는 28%, 약 252만 명입니다.', '전체 회원 수가 아니라 우리 목표 고객 수로 환산했는지 확인해 보세요.'));
    if (isFilled('ws2.final', d) && sel.length) {
      const unsel = CANDS.filter(x => !sel.includes(x.id)); if (unsel.some(x => !(f['rej_' + x.id] || '').trim())) out.push(A('org', '고른 이유보다 버린 이유를 설명하는 것이 더 중요합니다.', '선택하지 않은 후보 중 이유가 빈 칸이 있습니다.'));
      if (!(f.combo || '').trim()) out.push(A('info', '단독이 아닌 복수 파트너 조합도 검토했나요? 한 번은 검토해 보세요.'));
      if (c.partner > 0) out.push(A('info', `선택한 파트너 비용은 ${fm(c.partner)}이고 총 예산의 ${(c.partner / BUDGET * 100).toFixed(1)}%입니다. 남는 돈은 ${fm(BUDGET - c.partner)}입니다.`));
    }
  }
  if (n === 3) {
    const p = promos(d), pop = G('ws3.popup', d), c = compute(d);
    if (p.class && !p.walkin) out.push(A('org', c.cap > 0 ? `클래스 정원은 ${nf(c.cap)}명입니다. 150평 공간에 비해 적지 않나요? 예약 없이 들르는 공간도 함께 생각해 보세요.` : '클래스만 고르셨습니다. 하루 회차·회당 인원·운영 일수를 넣어 정원을 계산해 보세요.', '정원 = 하루 회차 × 회당 인원 × 운영 일수'));
    if (isFilled('ws3.benefit', d) && !p.coupon) out.push(A('org', '이 과제의 우선 목표는 앱 미가입 신규 고객 확보입니다. 앱 가입으로 이어지는 장치가 있나요?'));
    if (p.goods) out.push(A('info', '몇 개를 만들고, 남으면 누가 가져갈지 실습 ④에서 정하게 됩니다.'));
    const nm = (G('ws3.name', d).name || '').trim();
    if (nm && /^[^×xX*+&]+\s*[×xX*+&]\s*[^×xX*+&]+$/.test(nm)) out.push(A('org', '두 로고를 나란히 놓는 것만으로는 협업이 아닙니다. 고객이 얻는 새로운 경험이 이름에 보이나요?'));
    if (isFilled('ws3.benefit', d) && isFilled('ws3.popup', d) && !p.elder) out.push(A('org', "필수 조건에 '기존 40~50대 고객 소외 최소화'가 있습니다. 40~50대를 위한 장치가 하나라도 있나요?", '공동 혜택 칸의 체크 항목에서 표시할 수 있습니다.'));
  }
  if (n === 4) {
    const c = compute(d);
    if (isFilled('ws4.limit', d) && c.limit != null) out.push(A('info', `본전이 되는 한도는 ${fm(c.limit)}입니다 (${c.sales}억 원 × ${c.margin}%).`));
    const unsaved = ITEMS4.filter(it => it.id !== 'license' && !isFilled('ws4.item.' + it.id, d));
    if (unsaved.length && unsaved.length < 6) out.push(A('info', `아직 정하지 않은 항목: ${unsaved.map(x => x.name).join(', ')}`));
    const lic = G('ws4.item.license', d);
    if (lic.snap != null && lic.snap !== c.partner) out.push(A('red', `실습 ②에서 고른 파트너 비용(${nf(c.partner)}만 원)과 라이선스 칸(${nf(lic.snap)}만 원)이 다릅니다.`));
  }
  if (n === 5) {
    const c = compute(d);
    if (c.rev1 != null) out.push(A('info', `방문자 1인당 매출은 약 ${nf(c.rev1)}원입니다. 이 숫자가 현실적인지 스스로 판단해 보세요.`));
    if (c.check2 != null) out.push(A('info', `2주차 점검선 ${nf(c.check2)}명, 축소 운영 기준선 ${nf(c.stop)}명입니다. 실습 ⑥의 중단 기준선과 이어집니다.`));
    const s4 = c.sales, s5 = num(G('ws5.kpi.sales', d).target);
    if (s4 != null && s5 != null && s4 !== s5) out.push(A('org', `증분 매출 목표가 실습 ④(${s4}억 원)와 다릅니다(${s5}억 원). 어느 쪽이 기준인가요?`));
    if (c.prod != null) out.push(A('info', `판매 목표 ${nf(c.gQty)}개, 판매율 ${c.gRate}% → 제작 ${nf(c.prod)}개, 남는 수량 ${nf(c.prod - c.gQty)}개입니다. 남는 수량은 누구 몫인가요?`));
  }
  if (n === 6) {
    const levels = RISKS.map(r => G('ws6.risk.' + r.id, d).level);
    if (levels.every(v => v === 'low')) out.push(A('org', "모두 낮다면 왜 대응을 쓸까요? 6주 일정에서 일정 지연은 '높음'으로 보는 것이 맞습니다.", '준비 기간이 2주뿐인데 시공·제작·강사 섭외를 동시에 해야 하는지 생각해 보세요.'));
    const c = compute(d);
    if (isFilled('ws4.item.promo', d) && c.items.promo <= 7000 && G('ws6.risk.performance', d).level === 'low') out.push(A('org', '홍보비를 줄이셨습니다. 사람이 덜 올 위험을 다시 살펴보세요.'));
    if (promos(d).goods && G('ws6.risk.stock', d).level === 'low') out.push(A('org', '만든 수량과 판매 목표를 비교해 보세요.', c.prod != null ? `제작 ${nf(c.prod)}개 / 판매 목표 ${nf(c.gQty)}개` : ''));
    if (isFilled('ws6.risk.image', d) && !isFilled('ws6.stop', d)) out.push(A('org', '언제 멈출지를 미리 정해 두어야 손실이 커지지 않습니다.', '"중단 기준선" 칸이 비어 있습니다.'));
    const st = G('ws6.stop', d); if (isFilled('ws6.stop', d) && !hasDigit((st.custom || '') + (st.picked || []).join(''))) out.push(A('info', '기준선에 숫자나 날짜가 들어 있으면 더 분명합니다. (예: 2주차 방문자 ○명 미만)'));
    const used = RISKS.reduce((s, r) => s + (num(G('ws6.risk.' + r.id, d).reserveUse) || 0), 0);
    if (used > c.items.reserve && c.items.reserve >= 0 && isFilled('ws4.item.reserve', d)) out.push(A('red', `대응에 쓰겠다고 한 돈(${nf(used)}만 원)이 예비비(${nf(c.items.reserve)}만 원)보다 큽니다.`));
  }
  return out;
}
const allAdvice = (n, d = state.d) => [...stepAdvice(n, d), ...(n >= 4 ? budgetAdvice(d) : [])];

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
    k.push({ key: 'ws2.calc', group: '계산 점검', label: '내 계산' });
  }
  if (n === 3) [['name', '협업명·슬로건'], ['concept', '한 줄 협업 컨셉'], ['experience', '고객이 얻는 새로운 경험'], ['popup', '팝업스토어'], ['photo', '포토존·SNS 이벤트'], ['goods', '한정판·굿즈'], ['benefit', '공동 혜택']].forEach(([id, l]) => k.push({ key: 'ws3.' + id, group: '컨셉', label: l, req: true }));
  if (n === 4) {
    k.push({ key: 'ws4.limit', group: '한도 계산', label: '한도·방식', req: true });
    ITEMS4.forEach(it => k.push({ key: 'ws4.item.' + it.id, group: '비용 분담', label: it.name, req: it.id !== 'license' }));
    k.push({ key: 'ws4.coupon', group: '쿠폰', label: '쿠폰 한도' });
    AGREE4.forEach(a => k.push({ key: 'ws4.agree.' + a.id, group: '사전 합의', label: a.name, req: true }));
  }
  if (n === 5) {
    KPIS.forEach(x => k.push({ key: 'ws5.kpi.' + x.id, group: x.grp, label: x.name, req: true }));
    KPI_AGREE.forEach(a => k.push({ key: 'ws5.agree.' + a.id, group: '합의 사항', label: a.name, req: true }));
    k.push({ key: 'ws5.calc', group: '계산 점검', label: '내 계산' });
  }
  if (n === 6) {
    RISKS.forEach(r => k.push({ key: 'ws6.risk.' + r.id, group: '리스크', label: r.name, req: true }));
    k.push({ key: 'ws6.biggest', group: '마무리', label: '가장 큰 리스크', req: true });
    k.push({ key: 'ws6.stop', group: '마무리', label: '중단 기준선', req: true });
  }
  return k;
}
const reqProgress = n => { const r = keysOf(n).filter(x => x.req); return { done: r.filter(x => isFilled(x.key)).length, total: r.length, miss: r.filter(x => !isFilled(x.key)) }; };
const stepDone = n => { if (n === 7) return true; const p = reqProgress(n); return p.done === p.total; };
const unlocked = n => n === 1 || state.unlockAll || stepDone(n - 1);

/* ───────── 칸 요약 텍스트 ───────── */
function cellText(key, d = state.d) {
  const o = G(key, d), p = key.split('.');
  if (!isFilled(key, d)) return '';
  if (p[0] === 'ws1' && p[1] === 'take') return [o.factor, o.apply && ('→ ' + o.apply)].filter(Boolean).join('\n');
  if (p[0] === 'ws1') return ctext(key, d);
  if (key === 'ws2.final') {
    const sel = (o.selected || []).map(id => { const c = CANDS.find(x => x.id === id); return id + '(' + c.name + ')'; }).join(' + ');
    return `선정: ${sel || '-'} · 파트너 비용 ${fm(partnerCost(d))}\n이유: ${o.reason || '-'}\n조합 검토: ${o.combo || '-'}\n` + CANDS.filter(c => !(o.selected || []).includes(c.id) && o['rej_' + c.id]).map(c => `${c.id} 제외: ${o['rej_' + c.id]}`).join('\n');
  }
  if (p[1] === 'score') return CANDS.map(c => c.id + ' ' + (o['s_' + c.id] ?? '-')).join(' · ') + (o.reason ? '\n근거: ' + o.reason : '');
  if (p[0] === 'ws3') {
    if (key === 'ws3.name') return [o.name && ('「' + o.name + '」'), o.slogan && ('"' + o.slogan + '"')].filter(Boolean).join(' ');
    return o.text || (o.has === 'no' ? '(넣지 않음)' : '');
  }
  if (key === 'ws4.limit') { const c = compute(d); return `목표 매출 ${o.sales}억 원 × 이익률 ${o.margin ?? 30}% = 한도 ${fm(c.limit)} · ${o.mode === 'recover' ? '행사 뒤 회수형' : '기간 내 본전형'}`; }
  if (p[0] === 'ws4' && p[1] === 'item') return `${nf(p[2] === 'license' ? partnerCost(d) : num(o.amount))}만 원`;
  if (p[0] === 'ws4' && p[1] === 'agree') return [o.cat && `[${o.cat}]`, o.text, o.threshold && `판매율 기준 ${o.threshold}%`, o.deadline && `기한 ${o.deadline}`].filter(Boolean).join(' ');
  if (key === 'ws4.coupon') return `쿠폰 한도 ${nf(num(o.cap))}명${o.split ? ' · 분담: ' + o.split : ''}`;
  if (p[0] === 'ws5' && p[1] === 'kpi') { const x = KPIS.find(k => k.id === p[2]); if (p[2] === 'shared') return `판매 ${nf(num(o.qty))}개 · 판매율 ${o.rate ?? '-'}% · 인증 게시물 ${nf(num(o.ugc))}건`; return `${o.label ? o.label + ': ' : ''}${o.target ?? ''}${x.unit}`; }
  if (p[0] === 'ws5' && p[1] === 'agree') return ctext(key, d);
  if (p[0] === 'ws6' && p[1] === 'risk') return o.level;
  if (key === 'ws6.biggest') { const r = RISKS.find(x => x.id === o.risk); return `${r ? r.name : '-'} — ${o.reason || ''}`; }
  if (key === 'ws6.stop') return [...(o.picked || []), o.custom].filter(Boolean).join(' / ');
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
  if (f.t === 'num') return `<div class="fld"><label for="${id}">${lab}</label>${help}<div class="inl"><input type="number" inputmode="decimal" step="any" id="${id}" data-k="${f.k}" value="${esc(v[f.k] ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.locked ? 'readonly' : ''}><span>${esc(f.unit || '')}</span></div></div>`;
  if (f.t === 'range') { const val = v[f.k] ?? (f.def ?? 0); return `<div class="fld"><label for="${id}">${lab}</label>${help}<div class="inl"><input type="range" id="${id}" data-k="${f.k}" min="${f.min ?? 0}" max="${f.max}" step="${f.step ?? 1}" value="${esc(val)}"><input type="number" aria-label="${esc(f.label || '')} 숫자 입력" id="${id}_n" data-kn="${f.k}" min="${f.min ?? 0}" max="${f.max}" step="${f.step ?? 1}" value="${esc(val)}"><span>/ ${f.max}${esc(f.unit || '')}</span></div></div>`; }
  if (f.t === 'select') return `<div class="fld"><label for="${id}">${lab}</label>${help}<select id="${id}" data-k="${f.k}"><option value="">선택하세요</option>${f.opts.map(o => { const ov = typeof o === 'string' ? o : o.v, ol = typeof o === 'string' ? o : o.l; return `<option value="${esc(ov)}" ${v[f.k] === ov ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select></div>`;
  if (f.t === 'multi') return `<div class="fld"><span class="lab">${lab}</span>${help}<div class="checks">${f.opts.map(o => { const ov = typeof o === 'string' ? o : o.v, ol = typeof o === 'string' ? o : o.l; return `<label><input type="checkbox" data-km="${f.k}" value="${esc(ov)}" ${(v[f.k] || []).includes(ov) ? 'checked' : ''}> <span>${esc(ol)}</span></label>`; }).join('')}</div></div>`;
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
function openModal(def) {
  const overlay = $('#overlay'), box = $('#modal');
  const vals = JSON.parse(JSON.stringify(def.init || {}));
  const fields = def.fields || [];
  const attempts = {};
  modalCtx = { def, vals, opener: document.activeElement };
  const ideas = def.ideas || [];
  box.innerHTML = `
    <h2 id="mTitle">${esc(def.title)}</h2>
    ${def.sub || ''}
    ${def.q ? `<div class="q">${esc(def.q)}</div>` : ''}
    ${def.hint ? `<details class="lec"><summary>도움말 (막히면 펼치기)</summary><p>${def.hint}</p></details>` : ''}
    <form id="mForm" onsubmit="return false">
      ${fields.map(f => fieldHtml(f, vals)).join('')}
      ${ideas.map((id, i) => `<div class="ideas" data-ideas="${i}"><p><b>${esc(id.label || '막히면: 생각 자극 보기')}</b><br><span class="help">정답이 아니라 참고용입니다. 순서는 열 때마다 섞입니다. 먼저 위 칸에 내 생각을 써야 열립니다.</span></p><button type="button" class="btn small" data-act="reveal" data-i="${i}" disabled>생각 자극 보기 열기</button><div class="chips" hidden></div></div>`).join('')}
    </form>
    <div id="mLive">${def.live ? def.live(vals) : ''}</div>
    <div id="mAdv"></div>
    <div class="mbtns"><button type="button" class="btn" data-act="cancel">닫기 (Esc)</button>${def.consult ? '<button type="button" class="btn" data-act="consult">이 칸 자문 구하기</button>' : ''}<button type="button" class="btn accent" data-act="save">${esc(def.saveLabel || '저장 (Ctrl+Enter)')}</button></div>`;
  overlay.hidden = false;
  const form = $('#mForm', box);
  const refresh = () => {
    readVals(form, vals, fields);
    ideas.forEach((id, i) => { const b = $(`[data-act=reveal][data-i="${i}"]`, box); const g = (vals[id.gate] || '').trim().length >= 5; if (b) b.disabled = !g; });
    if (def.live) $('#mLive', box).innerHTML = def.live(vals);
    renderAdv();
  };
  const renderAdv = () => {
    if (!def.advice) { $('#mAdv', box).innerHTML = ''; return; }
    const list = def.advice(vals);
    $('#mAdv', box).innerHTML = list.length ? '<h3 style="font-size:16px;margin:12px 0 4px">자문 카드</h3>' + list.map(advHtml).join('') : '';
  };
  form.addEventListener('input', e => {
    const kn = e.target.getAttribute('data-kn');
    if (kn) { const r = $(`[data-k="${kn}"]`, form); if (r) r.value = e.target.value; }
    if (e.target.type === 'range') { const n = $(`[data-kn="${e.target.getAttribute('data-k')}"]`, form); if (n) n.value = e.target.value; }
    refresh();
  });
  form.addEventListener('change', refresh);
  box.onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.getAttribute('data-act');
    if (act === 'cancel') closeModal();
    if (act === 'save') { readVals(form, vals, fields); const keep = def.onSave && def.onSave(vals); if (keep !== false) { closeModal(); persist(); renderAll(def.focusKey); } }
    if (act === 'consult') openConsult(def.consult);
    if (act === 'reveal') {
      const i = +b.getAttribute('data-i'), id = ideas[i], chips = b.parentElement.querySelector('.chips');
      chips.hidden = !chips.hidden; if (chips.hidden) return;
      const picked = vals[id.key || 'picked'] = vals[id.key || 'picked'] || [];
      chips.innerHTML = shuffle(id.items).map(t => `<button type="button" class="chip" aria-pressed="${picked.includes(t)}" data-t="${esc(t)}">${esc(t)}</button>`).join('');
      chips.onclick = ev => { const c = ev.target.closest('.chip'); if (!c) return; const t = c.getAttribute('data-t'); const ix = picked.indexOf(t); if (ix >= 0) picked.splice(ix, 1); else picked.push(t); c.setAttribute('aria-pressed', picked.includes(t)); refresh(); };
    }
    if (act === 'check') {
      const id = b.getAttribute('data-id'), f = fields.find(x => x.id === id), wrap = b.closest('[data-calc]'), fb = $('.fb', wrap);
      readVals(form, vals, fields);
      const mine = num(vals[id]); const exp = f.expected(vals);
      attempts[id] = (attempts[id] || 0) + 1;
      if (mine == null) { fb.innerHTML = '<span class="ng">먼저 내 계산 결과를 숫자로 입력해 보세요.</span>'; return; }
      if (exp == null) { fb.innerHTML = '<span class="ng">비교할 값이 아직 없습니다. 앞 칸(파트너 선정·목표 입력)을 먼저 채워 주세요.</span>'; return; }
      const ok = Math.abs(mine - exp) <= Math.max(0.5, Math.abs(exp) * 0.01);
      if (ok) fb.innerHTML = `<span class="ok">✓ 맞았어요.</span> 계산 값 ${nf(exp)}${esc(f.unit || '')}과(와) 같습니다. 어떻게 계산했는지 한 줄로 설명할 수 있으면 완벽합니다.`;
      else if (attempts[id] === 1) fb.innerHTML = '<span class="ng">조금 달라요.</span> 단위(만 원 / 억 원 / 명)를 먼저 맞췄는지, 빠뜨린 항목이 없는지 확인하고 다시 계산해 보세요.';
      else if (attempts[id] === 2) fb.innerHTML = `<span class="ng">아직 달라요.</span> 식 힌트: ${esc(f.formula || '')}. 입력한 숫자가 식의 어느 자리에 들어가는지 하나씩 적어 보세요.`;
      else fb.innerHTML = `<span class="ng">세 번째입니다.</span> 계산기의 값은 <b>${nf(exp)}${esc(f.unit || '')}</b>입니다. 내 값(${nf(mine)})과 어디서부터 달라졌는지 식을 거슬러 올라가 찾아보세요.`;
    }
  };
  refresh();
  setTimeout(() => { const first = $('input:not([readonly]):not([type=range]),textarea,select', form); (first || $('[data-act=cancel]', box)).focus(); }, 30);
}
function closeModal() { $('#overlay').hidden = true; $('#modal').innerHTML = ''; const o = modalCtx && modalCtx.opener; modalCtx = null; if (o && document.contains(o)) try { o.focus(); } catch (e) { /* ignore */ } }
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
let simpleOpener = null;
function openSimple(html, onClick) {
  simpleOpener = document.activeElement;
  $('#modal2').innerHTML = html; $('#overlay2').hidden = false;
  $('#modal2').onclick = onClick;
  setTimeout(() => { const b = $('#modal2 [data-act=cancel]'); if (b) b.focus(); }, 30);
}
function closeSimple() { $('#overlay2').hidden = true; $('#modal2').innerHTML = ''; if (simpleOpener && document.contains(simpleOpener)) try { simpleOpener.focus(); } catch (e) { /* ignore */ } simpleOpener = null; }
function liveBudget(vals, key) {
  const dd = { ...state.d, [key]: vals }; const c = compute(dd);
  return `<div class="note"><b>지금까지</b> 쓴 돈 ${fm(c.spent)} · 남은 예산 <span class="${c.remain < 0 ? 'over' : ''}">${fm(c.remain)}</span>${c.limit != null ? ` · 본전 한도 ${fm(c.limit)}` : ''}</div>`;
}

/* ───────── 칸 정의 ───────── */
const ROLE_HINT = {
  license: ['—', 'IP 라이선스료 (파트너 측 수익)', '매출 연동 수수료율'],
  space: ['매장·팝업 공간 제공, 시설', '부스 집기 일부', '임차료 상계 여부'],
  stock: ['직매입 시 재고 부담', '위탁 시 재고 부담', '매입 방식, 미판매분 처리'],
  production: ['매장 내 사이니지·인테리어', '굿즈·패키지 제작', '공동 제작물의 분담 비율'],
  promo: ['자사 채널·앱·매장 매체', '파트너 SNS·팬덤 채널', '유료 광고비 분담'],
  staff: ['매장 운영 인력', '브랜드 전담 인력', '행사 진행 인력'],
  reserve: ['—', '—', '—'],
};
function cellDef(key) {
  const p = key.split('.'), o = G(key);
  const ws = +p[0].slice(2);
  const adv = vals => allAdvice(ws, { ...state.d, [key]: vals });
  const mk = d => Object.assign({ init: o, focusKey: key, consult: ws, advice: adv, onSave: v => { state.d[key] = v; } }, d);

  if (p[0] === 'ws1' && p[1] === 'take') {
    const i = p[2];
    return mk({ title: `우리 협업에 가져갈 성공 요인 ${i}`, q: '앞에서 분석한 사례에서 우리 협업에 가져갈 것 하나를 골라, 어떻게 적용할지 적어 보세요.',
      fields: [F.L('factor', '가져갈 성공 요인 (내 말로)'), F.L('apply', '우리 협업에 어떻게 적용할 것인가? (구체적으로, 가능하면 숫자와 함께)')],
      ideas: [{ label: '막히면: 생각 자극 보기', items: TAKE_IDEAS, gate: 'factor' }] });
  }
  if (p[0] === 'ws1') {
    const it = ITEMS1.find(x => x.id === p[1]), c = CASES.find(x => x.id === p[2]);
    return mk({ title: `${c.name} · ${it.name}`, sub: `<div class="note"><b>사례 설명</b><br>${esc(c.fact)}</div>`, q: it.ask,
      fields: [F.L('text', '내 생각 (내 말로 한두 문장)'), F.L('reason', '왜 그렇게 봤나요? (사례 설명의 어느 부분이 근거인가요?)')],
      ideas: [{ label: '막히면: 생각 자극 보기', items: it.ideas, gate: 'text' }] });
  }
  if (p[1] === 'score' && p[0] === 'ws2') {
    const cr = CRITS.find(x => x.id === p[2]);
    const fields = [F.NOTE(`<b>평가 항목</b>: ${esc(cr.name)} (배점 ${cr.max}점) · 브리프에서 볼 칸: <b>${esc(cr.look)}</b><br><b>낮은 점수의 신호</b>: ${esc(cr.low)}`)];
    CANDS.forEach(c => fields.push(F.R('s_' + c.id, '', cr.max, { labelHtml: `<b>${c.id}. ${esc(c.name)}</b> <div class="fact">브리프 문구: ${esc(cr.pick(c))}</div>`, unit: '점' })));
    fields.push(F.L('reason', '채점 근거 (브리프의 문구나 숫자를 옮겨 적으세요)', { help: '점수보다 이유가 중요합니다. 후보별로 한 줄씩 적어도 좋습니다.' }));
    return mk({ title: `채점 · ${cr.name}`, q: cr.ask, fields,
      live: v => { const sum = CANDS.map(c => `${c.id} ${num(v['s_' + c.id]) ?? 0}`).join(' · '); return `<div class="note">이 항목 점수: ${sum} (배점 ${cr.max})</div>`; },
      advice: vals => { const l = []; if (!(vals.reason || '').trim()) l.push(A('info', '점수보다 이유가 중요합니다. 근거 칸에 브리프 문구를 옮겨 적어 보세요.')); return [...l, ...stepAdvice(2, { ...state.d, [key]: vals })]; } });
  }
  if (key === 'ws2.final') {
    const t = ws2Totals();
    const tbl = t ? `<div class="note"><b>내가 채점한 합계</b>: ${CANDS.map(c => `${c.id} ${t[c.id]}점`).join(' · ')}<br><span class="help">1등을 그대로 고르지 않아도 됩니다. 점수는 후보를 좁히는 도구입니다.</span></div>` : '<div class="note">아직 채점한 항목이 없습니다. 채점부터 하면 합계가 여기 보입니다.</div>';
    return mk({ title: '최종 판단', sub: tbl + `<div class="note"><b>선정 순서</b>: ①채점표 → ②제약(예산 4억·6주)에 걸리는 후보 지우기 → ③20~30대 신규 고객에 맞는지 → ④약하면 묶기 → ⑤고른 이유·버린 이유 쓰기</div>`,
      q: '누구와 함께하겠습니까? 그리고 누구를 버립니까?',
      fields: [F.M('selected', '선정한 파트너 (조합이면 여러 개 선택)', CANDS.map(c => ({ v: c.id, l: `${c.id}. ${c.name} — ${c.costTxt}` }))),
        F.N('negA', 'A를 고른 경우: 라이선스 협상 목표 금액', { unit: '만 원', help: '협상하지 않으면 비워 두세요. (브리프 기준 30,000만 원)' }),
        F.N('extra', '다른 파트너·추가 로컬 브랜드 비용이 있다면', { unit: '만 원' }),
        F.L('reason', '선정한 결정적 이유 (제약과 목표로 설명하세요)'),
        ...CANDS.map(c => F.T('rej_' + c.id, `${c.id}. ${c.name} — 선택하지 않았다면 그 이유`, { ph: '제약(예산·6주) 또는 목표와 연결해서' })),
        F.L('combo', '단독이 아닌 복수 파트너 조합도 검토했나요? 검토 결과와 이유는?'),
        F.L('gaveup', '이 선택으로 포기하는 것은 무엇입니까?')],
      live: v => { const dd = { ...state.d, 'ws2.final': v }; const pc = partnerCost(dd); return `<div class="note"><b>파트너 비용 합계</b> ${fm(pc)} · 총 예산의 ${(pc / BUDGET * 100).toFixed(1)}% · 남는 돈 ${fm(BUDGET - pc)}</div>`; },
      onSave: v => { state.d[key] = v; state.wrap[2] = state.wrap[2] || {}; if (v.gaveup && !state.wrap[2].gaveUp) state.wrap[2].gaveUp = v.gaveup; } });
  }
  if (key === 'ws2.calc') {
    return mk({ title: '내 계산 점검 (실습 ②)', q: '숫자로 먼저 계산해 보고, 그다음에 확인하세요.',
      fields: [F.C('a75', 'A의 라이선스 3억 원은 총 예산 4억 원의 몇 %입니까?', () => 75, { unit: '%', formula: '3억 ÷ 4억 × 100' }),
        F.C('c252', 'C 카드사 회원 900만 명 중 20~30대(28%)는 몇 만 명입니까?', () => 252, { unit: '만 명', formula: '900만 × 28%' }),
        F.C('pc', '내가 선정한 파트너 비용의 합계는 몇 만 원입니까?', () => { const pc = partnerCost(); return pc > 0 ? pc : null; }, { unit: '만 원', formula: '선택한 후보 비용의 합 (A는 협상 금액이 있으면 그 금액)' })] });
  }
  if (p[0] === 'ws3') {
    const common = [F.L('reason', '이렇게 정한 이유 (고객이 얻는 것 중심으로)')];
    const defs = {
      name: { title: '협업명 · 슬로건', q: '고객이 얻는 새로운 경험이 이름에 보이나요? 두 로고를 나란히 놓는 것만으로는 협업이 아닙니다.', fields: [F.T('name', '협업명'), F.T('slogan', '슬로건'), ...common] },
      concept: { title: '한 줄 협업 컨셉', q: '이 협업을 한 문장으로 설명한다면? 로고를 지워도 남는 것은 무엇입니까?', fields: [F.L('text', '한 줄 협업 컨셉'), ...common] },
      experience: { title: '고객이 얻는 새로운 경험', q: '이 팝업에서만 할 수 있는 행동은 무엇입니까? 화장품 매장이나 카페에서는 못 하는 것인가요?', fields: [F.L('text', '고객이 얻는 새로운 경험'), ...common] },
      popup: { title: '팝업스토어 (1층 아트리움 150평, 4주)', q: '고객이 팝업에서 실제로 무엇을 하나요? 하루에 몇 명이 참여할 수 있나요?',
        fields: [F.L('text', '프로모션 구체적 내용'), F.T('place', '운영 기간 · 장소'), F.T('owner', '주 담당 (누가 운영하나)'), F.T('effect', '기대 효과 (숫자로)'),
          F.M('types', '내용에 포함된 것 (해당하는 것 모두)', [{ v: 'class', l: '클래스·예약제 체험' }, { v: 'walkin', l: '예약 없이 들르는 열린 공간' }, { v: 'other', l: '그 외' }]),
          F.N('perDay', '클래스가 있다면: 하루 회차', { unit: '회' }), F.N('perClass', '회당 인원', { unit: '명' }), F.N('days', '운영 일수', { unit: '일' }), ...common] },
      photo: { title: '포토존 · SNS 이벤트', q: '고객이 스스로 퍼뜨릴 장면은 무엇입니까? 그 장면에 얼마까지 쓸 수 있나요?', fields: [F.S('has', '넣나요?', [{ v: 'yes', l: '넣는다' }, { v: 'no', l: '넣지 않는다' }]), F.L('text', '내용'), ...common] },
      goods: { title: '한정판 · 굿즈 (5층 팝업존 60평)', q: '굿즈를 만든다면 몇 개를 만들고, 남으면 누가 가져갑니까? (만들지 않는 선택도 가능합니다)', fields: [F.S('has', '넣나요?', [{ v: 'yes', l: '넣는다' }, { v: 'no', l: '넣지 않는다 (체험에 집중)' }]), F.L('text', '내용'), ...common] },
      benefit: { title: '공동 혜택 (할인·스탬프 등)', q: '이 과제의 우선 목표는 앱 미가입 신규 고객 확보입니다. 고객은 왜 앱을 켜야 합니까? 40~50대 고객은요?',
        fields: [F.L('text', '혜택의 구체적 내용'), F.M('types', '내용에 포함된 것 (해당하는 것 모두)', [{ v: 'coupon', l: '앱 가입 즉시 쿠폰' }, { v: 'stamp', l: '층간 스탬프 랠리' }, { v: 'card', l: '제휴카드 청구 할인' }, { v: 'lucky', l: '구매 고객 럭키드로우' }, { v: 'reward', l: '다음에 쓰는 리워드 적립' }, { v: 'gift', l: '구매 금액 구간별 사은품' }, { v: 'elder', l: '40~50대 고객을 위한 별도 장치' }]), ...common] },
    };
    const d = defs[p[1]];
    return mk({ ...d, hint: '교안: 협업의 본질은 함께 노출하는 것이 아니라 고객에게 새로운 경험을 주는 것입니다. 프로모션을 고르는 순간 돈이 듭니다 — 오른쪽 패널에서 실습 ④에서 커지는 항목을 확인하세요.' });
  }
  if (key === 'ws4.limit') {
    return mk({ title: '쓸 수 있는 돈의 한도 계산', q: '이번 협업으로 매출이 얼마나 늘 것 같나요? 그 근거는 무엇입니까?',
      sub: '<div class="note">한도 = 늘어난 매출 × 이익률. 이익률 30%는 교육용 가정이며 20~40%로 바꿀 수 있습니다.</div>',
      fields: [F.N('sales', '늘어날 매출 목표', { unit: '억 원', min: 0 }), F.L('basis', '이 매출 목표의 근거 (방문자 × 객단가 등으로 설명해 보세요)'),
        F.R('margin', '이익률', 40, { min: 20, def: 30, unit: '%' }),
        F.C('lim', '본전이 되는 한도는 몇 만 원입니까? (내 계산)', v => num(v.sales) != null ? num(v.sales) * 10000 * (num(v.margin) ?? 30) / 100 : null, { unit: '만 원', formula: '매출(억 원) × 10,000 × 이익률 ÷ 100  (1억 원 = 10,000만 원)' }),
        F.S('mode', '방식 선택', [{ v: 'breakeven', l: '기간 내 본전형 (쓴 돈 ≤ 한도)' }, { v: 'recover', l: '행사 뒤 회수형 (쓴 돈 > 한도, 신규 회원이 더 사서 회수)' }], { help: '선택한 방식은 발표에서 설명해야 합니다: 줄인 곳 때문에 생기는 위험 / 모자란 돈을 신규 회원이 얼마씩 더 사야 하는지.' })],
      live: v => { const s = num(v.sales); const m = num(v.margin) ?? 30; return `<div class="note">${s != null ? `내 입력 기준 한도: <b>${fm(s * 10000 * m / 100)}</b>` : '매출 목표를 입력하면 한도가 표시됩니다.'}</div>`; },
      onSave: v => { if (v.margin === '' || v.margin == null) v.margin = '30'; state.d[key] = v; } });
  }
  if (p[0] === 'ws4' && p[1] === 'item') {
    const it = ITEMS4.find(x => x.id === p[2]), rh = ROLE_HINT[it.id];
    const fields = [it.locked ? F.N('amount', '비용 (실습 ②에서 자동 입력)', { unit: '만 원', locked: true }) : F.N('amount', '백화점이 내는 돈', { unit: '만 원', min: 0 }),
      F.L('dept', '백화점이 하는 일'), F.L('partner', '파트너가 하는 일'), F.T('partnerShare', '파트너가 부담하는 것 (돈·인력·물품)', { help: '파트너가 아무것도 내지 않는 협업은 성립하기 어렵습니다.' }), F.T('nego', '협의가 필요한 사항')];
    if (it.id === 'stock') fields.unshift(F.S('stockType', '상품 취급 방식', ['직매입', '위탁', '위탁 + 분할 제작', '위탁 + 남으면 사은품 전환', '판매율에 따라 분담', '예약 주문 제작']));
    if (it.id === 'production') fields.push(F.S('ratio', '파트너와의 분담 비율', ['5:5', '7:3', '품목별 분리', '기타']));
    if (it.id === 'staff') fields.push(F.S('support', '파트너 전담 인력 비용', ['각자 부담', '절반 지원', '전액 지원']));
    if (it.id === 'reserve') fields.push(F.L('purpose', '예비비의 용도 (무엇에 대비하는 돈인가?)'));
    if (it.id === 'license') fields.push(F.T('usage', '행사 뒤 사진·영상 사용 범위'));
    const sub = `<div class="note"><b>교안: 누가 부담하는가</b> — 주로 백화점: ${esc(rh[0])} · 주로 파트너: ${esc(rh[1])} · 협의로 정하는 것: ${esc(rh[2])}</div>`;
    return mk({ title: `비용 분담 · ${it.name}`, sub, q: it.ask, fields, live: v => liveBudget(v, key),
      onSave: v => { if (it.id === 'license') { v.amount = String(partnerCost()); v.snap = partnerCost(); } state.d[key] = v; },
      init: it.id === 'license' ? { ...o, amount: String(partnerCost()) } : o });
  }
  if (p[0] === 'ws4' && p[1] === 'agree') {
    const a = AGREE4.find(x => x.id === p[2]);
    const fields = [F.L('text', '우리 팀의 합의안 (누가·언제까지·무엇을 기준으로)'), F.S('cat', '가장 가까운 분류', a.cats)];
    if (a.id === 'stock') fields.push(F.N('threshold', '판매율 기준이 있다면 (없으면 비움)', { unit: '%' }), F.T('deadline', '반품·정산 기한'));
    return mk({ title: `사전 합의 · ${a.name}`, q: a.ask, sub: '<div class="note">실제 계약은 법무 검토가 필요합니다. 여기서는 합의의 "틀"을 연습합니다.</div>', fields,
      ideas: [{ label: '막히면: 생각 자극 보기 (정답 아님)', items: a.ideas, gate: 'text' }] });
  }
  if (key === 'ws4.coupon') {
    return mk({ title: '앱 가입 쿠폰 한도', q: '가입자가 늘수록 쿠폰 비용이 커집니다. 몇 명까지 줄 것이고, 카드사와 어떻게 나눕니까?',
      fields: [F.N('cap', '쿠폰을 받을 수 있는 최대 인원', { unit: '명', min: 0 }), F.T('split', '카드사와의 분담 방식'), F.N('unit', '1인당 쿠폰 금액 (참고)', { unit: '원' })],
      live: v => { const cap = num(v.cap), u = num(v.unit); return `<div class="note">${cap != null && u != null ? `최대 쿠폰 비용: ${nf(cap)}명 × ${nf(u)}원 = <b>${nf(cap * u / 10000)}만 원</b> (홍보비 안에 들어 있나요?)` : '인원과 금액을 넣으면 쿠폰 비용 상한이 계산됩니다.'}</div>`; } });
  }
  if (p[0] === 'ws5' && p[1] === 'kpi') {
    const x = KPIS.find(k => k.id === p[2]);
    let fields, init = o;
    if (x.id === 'partner') fields = [F.T('label', '파트너 KPI 이름 (예: 팔로워, 판매 수량)'), F.N('target', '목표값')];
    else if (x.id === 'shared') fields = [F.N('qty', '굿즈 판매 목표 수량', { unit: '개' }), F.N('rate', '목표 판매율', { unit: '%', min: 0, max: 100 }), F.N('ugc', '인증 게시물 수 목표', { unit: '건' })];
    else fields = [F.N('target', `목표값 (현재 ${x.cur})`, { unit: x.unit })];
    if (x.id === 'sales' && o.target == null) { const s = num(G('ws4.limit').sales); if (s != null) init = { ...o, target: String(s) }; }
    fields.push(F.L('method', '측정 방법 (누가·어디서·언제 세는가)'), F.L('reason', '왜 이 숫자입니까? (어떻게 계산했나요?)'));
    const c = compute();
    return mk({ title: `KPI · ${x.name}`, q: x.ask, init,
      sub: `<div class="note">구분: ${x.grp} · 성과 귀속: <b>${x.own}</b>${x.id === 'sales' && c.sales != null ? ` · 실습 ④에서 정한 목표 매출: ${c.sales}억 원` : ''}</div>`,
      fields, ideas: [{ label: '막히면: 측정 방법 생각 자극 보기', items: x.meas, gate: 'method' }],
      live: v => { const dd = { ...state.d, [key]: v }; const cc = compute(dd); let h = ''; if (x.id === 'visitors' && cc.check2 != null) h = `2주차 점검선 ${nf(cc.check2)}명 · 축소 기준선 ${nf(cc.stop)}명`; if (x.id === 'shared' && cc.prod != null) h = `제작 수량 ${nf(cc.prod)}개 · 남는 수량 ${nf(cc.prod - cc.gQty)}개`; return h ? `<div class="note">${h}</div>` : ''; } });
  }
  if (p[0] === 'ws5' && p[1] === 'agree') {
    const a = KPI_AGREE.find(x => x.id === p[2]);
    return mk({ title: `합의 사항 · ${a.name}`, q: a.ask, fields: [F.L('text', '우리 팀의 안 (이유 포함)')], ideas: [{ label: '막히면: 생각 자극 보기', items: a.ideas, gate: 'text' }] });
  }
  if (key === 'ws5.calc') {
    return mk({ title: '내 계산 점검 (실습 ⑤)', q: '숫자가 서로 이어지는지 직접 계산해 보세요.',
      fields: [F.C('rev1', '방문자 1인당 매출은 몇 원입니까?', () => compute().rev1, { unit: '원', formula: '목표 매출(억 원) × 100,000,000 ÷ 방문자 목표' }),
        F.C('c2', '2주차 점검선은 몇 명입니까?', () => compute().check2, { unit: '명', formula: '방문자 목표 × 0.5 × 0.6 (4주 중 2주, 목표의 60%)' }),
        F.C('prod', '굿즈 제작 수량은 몇 개입니까?', () => compute().prod, { unit: '개', formula: '판매 목표 ÷ 판매율' })] });
  }
  if (p[0] === 'ws6' && p[1] === 'risk') {
    const r = RISKS.find(x => x.id === p[2]), c = compute(), pr = promos();
    const ctx = { image: `고른 파트너: ${(G('ws2.final').selected || []).join(', ') || '(미정)'} · 파트너 검증 이력, 노출 위치(1층 전면)를 떠올려 보세요.`,
      stock: pr.goods ? `굿즈 계획 있음${c.prod != null ? ` · 제작 ${nf(c.prod)}개 / 판매 목표 ${nf(c.gQty)}개` : ''} · 재고 합의: ${cellText('ws4.agree.stock') || '(미정)'}` : '굿즈를 만들지 않기로 했다면 이 리스크는 어떻게 달라지나요?',
      schedule: '사전 홍보 2주 + 팝업 4주. 시공·제작·강사 섭외·승인 절차(금융 제휴는 심의 기간)가 겹치는 구간은 언제인가요?',
      performance: `홍보비 ${nf(c.items.promo)}만 원 · 방문자 목표 ${nf(c.visitors)}명${c.check2 != null ? ` · 2주차 점검선 ${nf(c.check2)}명` : ''}`,
      rights: `사전 합의 4칸 중 ${AGREE4.filter(a => isFilled('ws4.agree.' + a.id)).length}칸 작성됨 · 데이터: ${cellText('ws4.agree.data') || '(미정)'}` }[r.id];
    return mk({ title: `리스크 · ${r.name}`, q: `${r.what}. 우리 협업에서 이 일이 일어날 가능성과, 일어났을 때 무엇이 무너지나요?`,
      sub: `<div class="note"><b>앞 실습에서 가져온 사실</b><br>${esc(ctx)}</div>`,
      fields: [F.S('level', '발생 가능성', [{ v: 'high', l: '높음' }, { v: 'mid', l: '중간' }, { v: 'low', l: '낮음' }], { help: '근거 없이 고르지 말고, 위 사실 중 하나를 근거로 삼아 보세요.' }),
        F.L('impact', '발생 시 영향 (앞 실습의 숫자를 근거로)'), F.L('pre', '사전 대응 (누가·언제·무엇을)'), F.L('post', '발생 후 대응'), F.N('reserveUse', '대응에 쓸 예비비 (선택)', { unit: '만 원' })],
      ideas: [{ label: '막히면: 사전 대응 생각 자극 보기', items: r.pre, gate: 'pre', key: 'pre_picks' }, { label: '막히면: 발생 후 대응 생각 자극 보기', items: r.post, gate: 'post', key: 'post_picks' }] });
  }
  if (key === 'ws6.biggest') {
    return mk({ title: '가장 큰 리스크 하나와 근거', q: '내 설계에서 가장 약한 곳은 어디입니까? 내가 통제할 수 있는 리스크와 없는 리스크를 나눠 보세요.',
      fields: [F.S('risk', '가장 큰 리스크', RISKS.map(r => ({ v: r.id, l: r.name }))), F.L('reason', '그 근거 (앞 실습의 숫자나 선택을 인용하세요)')] });
  }
  if (key === 'ws6.stop') {
    const c = compute();
    return mk({ title: '협업을 중단해야 할 기준선', q: '언제 멈출 것입니까? 숫자나 날짜가 들어가야 하고, 누가 멈출지도 정해야 합니다.',
      sub: `<div class="note">${c.check2 != null ? `실습 ⑤에서 계산된 2주차 점검선: ${nf(c.check2)}명 · 축소 기준선: ${nf(c.stop)}명` : '실습 ⑤에서 방문자 목표를 정하면 점검선이 여기 보입니다.'}</div>`,
      fields: [F.L('custom', '내 중단 기준선 (숫자·날짜·결정자 포함)')], ideas: [{ label: '막히면: 생각 자극 보기', items: STOP_IDEAS, gate: 'custom' }] });
  }
  return null;
}

/* ───────── 화면 렌더 ───────── */
function cellBtn(key, ph, mode, extra = '') {
  const t = cellText(key);
  if (mode === 'print') return `<div class="pv">${esc(t)}</div>`;
  return `<button type="button" class="cell ${t ? 'filled' : ''}" data-cell="${key}">${t ? esc(t) : `<span class="ph">${esc(ph || '눌러서 작성')}</span>`}</button>`;
}
const th = a => `<thead><tr>${a.map(x => `<th scope="col">${x}</th>`).join('')}</tr></thead>`;
function lecBox(n) { return `<details class="lec"><summary>교안 다시보기 (핵심 노트)</summary><ul>${LECTURE[n].map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`; }
function wrapCard(n, mode) {
  const w = state.wrap[n] || {};
  if (mode === 'print') return `<table class="ws"><tbody><tr><td class="rh">정한 것</td><td>${esc(w.decided)}</td><td class="rh">이유</td><td>${esc(w.reason)}</td><td class="rh">포기한 것</td><td>${esc(w.gaveUp)}</td></tr></tbody></table>`;
  return `<div class="card"><h3>이번 실습의 결정 요약 — 정한 것 · 이유 · 포기한 것</h3><div class="help" style="color:var(--sub);font-size:14px">"포기한 것"이 비어 있다면, 정말 아무것도 포기하지 않았는지 다시 생각해 보세요. 이 내용은 실습 ⑦ 한눈에 보기에 모입니다.</div><div class="wrapbox">
    <div><label for="w${n}d">정한 것</label><textarea id="w${n}d" data-wrap="${n}:decided">${esc(w.decided)}</textarea></div>
    <div><label for="w${n}r">이유 (숫자가 들어 있나요?)</label><textarea id="w${n}r" data-wrap="${n}:reason">${esc(w.reason)}</textarea></div>
    <div><label for="w${n}g">포기한 것</label><textarea id="w${n}g" data-wrap="${n}:gaveUp">${esc(w.gaveUp)}</textarea></div></div></div>`;
}
function head(n, mode) {
  const s = STEPS[n - 1], p = n === 7 ? null : reqProgress(n);
  return `<h1>실습 ${'①②③④⑤⑥⑦'[n - 1]} ${esc(s.name)}</h1><p class="lead">${esc(s.brief)} (${s.time}분)${p && mode !== 'print' ? ` · 필수 칸 ${p.done}/${p.total}` : ''}</p>`;
}
function briefTable() { return `<table class="ws"><tbody>${BRIEF.map(([a, b]) => `<tr><td class="rh" style="width:18%">${a}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`; }

function renderWS(n, mode = 'edit') {
  let h = head(n, mode);
  if (mode === 'edit') h += lecBox(n);
  if (n === 1) {
    h += `<p>네 사례를 같은 항목으로 비교합니다. 칸을 누르면 질문이 열립니다. <b>먼저 내 말로 쓰고</b>, 막히면 참고 보기를 여세요.</p>`;
    h += `<table class="ws">${th(['비교 항목', ...CASES.map(c => esc(c.name))])}<tbody>${ITEMS1.map(it => `<tr><td class="rh" data-l="비교 항목">${it.name}</td>${CASES.map(c => `<td data-l="${esc(c.name)}">${cellBtn(`ws1.${it.id}.${c.id}`, '', mode)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    h += `<table class="ws">${th(['우리 협업에 가져갈 성공 요인', '우리 협업에 어떻게 적용할 것인가'])}<tbody>${[1, 2, 3].map(i => `<tr><td colspan="2" data-l="성공 요인 ${i}">${cellBtn('ws1.take.' + i, `성공 요인 ${i} 작성`, mode)}</td></tr>`).join('')}</tbody></table>`;
  }
  if (n === 2) {
    h += `<div class="card"><h3>실습 브리프 (교육용 가상 자료)</h3>${briefTable()}</div>`;
    h += `<table class="ws"><caption style="text-align:left;font-weight:700">협업 후보 5곳</caption>${th(['후보', '유형', '도달 규모', '주 타깃', '비용', '특징·유의점'])}<tbody>${CANDS.map(c => `<tr><td class="rh" data-l="후보">${c.id}</td><td data-l="유형">${esc(c.type)}</td><td data-l="도달 규모">${esc(c.reach)}</td><td data-l="주 타깃">${esc(c.target)}</td><td data-l="비용">${esc(c.costTxt)}</td><td data-l="특징">${esc(c.note)}</td></tr>`).join('')}</tbody></table>`;
    const t = ws2Totals();
    h += `<table class="ws"><caption style="text-align:left;font-weight:700">채점표 (항목 줄을 눌러 채점)</caption>${th(['평가 항목', '배점', ...CANDS.map(c => c.id + ' ' + esc(c.name)), '채점 근거'])}<tbody>${CRITS.map(cr => { const o = G('ws2.score.' + cr.id); const done = isFilled('ws2.score.' + cr.id); return `<tr><td class="rh" data-l="평가 항목">${cr.name}</td><td data-l="배점">${cr.max}</td>${CANDS.map(c => `<td data-l="${c.id}">${mode === 'print' ? (done ? o['s_' + c.id] : '') : `<button type="button" class="cell ${done ? 'filled' : ''}" data-cell="ws2.score.${cr.id}" aria-label="${cr.name} ${c.id}">${done ? esc(o['s_' + c.id]) : '<span class="ph">–</span>'}</button>`}</td>`).join('')}<td data-l="채점 근거">${mode === 'print' ? esc(o.reason) : `<button type="button" class="cell ${o.reason ? 'filled' : ''}" data-cell="ws2.score.${cr.id}">${o.reason ? esc(o.reason) : '<span class="ph">근거 작성</span>'}</button>`}</td></tr>`; }).join('')}<tr><td class="rh">합계</td><td>100</td>${CANDS.map(c => `<td data-l="합계 ${c.id}"><b>${t ? t[c.id] : '-'}</b></td>`).join('')}<td></td></tr></tbody></table>`;
    h += `<table class="ws">${th(['최종 판단'])}<tbody><tr><td>${cellBtn('ws2.final', '선정한 파트너 · 버린 이유 · 조합 검토', mode)}</td></tr></tbody></table>`;
    if (mode === 'edit') h += `<div class="row-actions"><button type="button" class="btn" data-cell="ws2.calc">내 계산 점검하기 (75%? 252만 명? 내 파트너 비용?)</button></div>`;
  }
  if (n === 3) {
    const p2 = G('ws2.final').selected || [];
    h += `<p>실습 ②에서 고른 파트너: <b>${p2.length ? p2.map(id => id + '. ' + CANDS.find(c => c.id === id).name).join(' + ') : '(아직 없음)'}</b>. 보기 대신 내 아이디어를 씁니다 — 파트너 조합이 달라지면 컨셉도 달라집니다.</p>`;
    h += `<table class="ws">${th(['항목', '내 설계'])}<tbody>${[['name', '협업명 · 슬로건'], ['concept', '한 줄 협업 컨셉'], ['experience', '고객이 얻는 새로운 경험'], ['popup', '팝업스토어'], ['photo', '포토존 · SNS 이벤트'], ['goods', '한정판 · 굿즈'], ['benefit', '공동 혜택']].map(([id, l]) => `<tr><td class="rh" data-l="항목">${l}</td><td data-l="내 설계">${cellBtn('ws3.' + id, '', mode)}</td></tr>`).join('')}</tbody></table>`;
  }
  if (n === 4) {
    const c = compute();
    h += `<div class="row-actions">${mode === 'edit' ? `<button type="button" class="btn accent" data-cell="ws4.limit">① 먼저: 쓸 수 있는 돈의 한도 계산</button>` : ''}</div>`;
    h += `<table class="ws">${th(['한도 계산'])}<tbody><tr><td>${cellBtn('ws4.limit', '한도를 먼저 계산하세요', mode)}</td></tr></tbody></table>`;
    h += `<p style="color:var(--sub)">권장 순서: 라이선스 → 공간 → 예비비 → 홍보 → 제작 → 인력 → 상품 (큰 돈부터, 예비비는 마지막이 아니라 먼저). 단위는 만 원, 백화점이 내는 돈만 입력합니다.</p>`;
    h += `<table class="ws">${th(['항목', '금액·분담', '백화점이 하는 일', '파트너가 하는 일', '파트너 부담'])}<tbody>${ITEMS4.map(it => { const o = G('ws4.item.' + it.id); return `<tr><td class="rh" data-l="항목">${it.name}</td><td data-l="금액">${cellBtn('ws4.item.' + it.id, '금액 입력', mode)}</td><td data-l="백화점이 하는 일">${esc(o.dept)}</td><td data-l="파트너가 하는 일">${esc(o.partner)}</td><td data-l="파트너 부담">${esc(o.partnerShare)}</td></tr>`; }).join('')}<tr><td class="rh">합계</td><td colspan="4"><b>${fm(c.spent)}</b> / 4억 원 · 남은 예산 <b class="${c.remain < 0 ? 'over' : ''}">${fm(c.remain)}</b></td></tr></tbody></table>`;
    h += `<table class="ws">${th(['쿠폰 한도 (쿠폰을 쓰는 경우)'])}<tbody><tr><td>${cellBtn('ws4.coupon', '쿠폰 한도', mode)}</td></tr></tbody></table>`;
    h += `<table class="ws">${th(['사전 합의 항목', '우리 팀의 합의안'])}<tbody>${AGREE4.map(a => `<tr><td class="rh" data-l="사전 합의 항목">${a.name}</td><td data-l="합의안">${cellBtn('ws4.agree.' + a.id, '', mode)}</td></tr>`).join('')}</tbody></table>`;
  }
  if (n === 5) {
    const c = compute();
    h += `<table class="ws">${th(['구분', 'KPI', '현재값', '목표값 · 측정', '성과 귀속'])}<tbody>${KPIS.map(x => `<tr><td class="rh" data-l="구분">${x.grp}</td><td data-l="KPI">${x.name}</td><td data-l="현재값">${x.cur}</td><td data-l="목표값">${cellBtn('ws5.kpi.' + x.id, '목표 입력', mode)}${esc(G('ws5.kpi.' + x.id).method ? '측정: ' + G('ws5.kpi.' + x.id).method : '')}</td><td data-l="성과 귀속">${x.own}</td></tr>`).join('')}</tbody></table>`;
    h += `<table class="ws">${th(['합의 사항', '우리 팀의 안'])}<tbody>${KPI_AGREE.map(a => `<tr><td class="rh" data-l="합의 사항">${a.name}</td><td data-l="안">${cellBtn('ws5.agree.' + a.id, '', mode)}</td></tr>`).join('')}</tbody></table>`;
    if (mode === 'edit') h += `<div class="row-actions"><button type="button" class="btn" data-cell="ws5.calc">내 계산 점검하기 (1인당 매출·점검선·제작 수량)</button></div>`;
  }
  if (n === 6) {
    const L = { high: '높음', mid: '중간', low: '낮음' };
    h += `<table class="ws">${th(['리스크', '발생 가능성', '발생 시 영향', '사전 대응', '발생 후 대응'])}<tbody>${RISKS.map(r => { const k = 'ws6.risk.' + r.id, o = G(k); const t = isFilled(k); const bt = txt => mode === 'print' ? esc(txt) : `<button type="button" class="cell ${t ? 'filled' : ''}" data-cell="${k}">${txt ? esc(txt) : '<span class="ph">작성</span>'}</button>`; return `<tr><td class="rh" data-l="리스크">${r.name}<div class="help" style="font-weight:400;color:var(--sub);font-size:13px">${r.what}</div></td><td data-l="발생 가능성">${bt(L[o.level] || '')}</td><td data-l="발생 시 영향">${bt(o.impact || '')}</td><td data-l="사전 대응">${bt([o.pre, ...(o.pre_picks || [])].filter(Boolean).join(' / '))}</td><td data-l="발생 후 대응">${bt([o.post, ...(o.post_picks || [])].filter(Boolean).join(' / '))}</td></tr>`; }).join('')}</tbody></table>`;
    h += `<table class="ws">${th(['가장 큰 리스크 하나와 근거', '협업을 중단해야 할 기준선'])}<tbody><tr><td data-l="가장 큰 리스크">${cellBtn('ws6.biggest', '선택·근거', mode)}</td><td data-l="중단 기준선">${cellBtn('ws6.stop', '중단 기준선', mode)}</td></tr></tbody></table>`;
  }
  if (n === 7) h += render7(mode);
  if (n !== 7) h += wrapCard(n, mode);
  return h;
}

/* 실습 ⑦: 자동 수집 */
function draft7() {
  const c = compute(), f = G('ws2.final'), sel = (f.selected || []).map(id => { const x = CANDS.find(k => k.id === id); return `${id}(${x.name})`; });
  const t = n => (cellText(n) || '').replace(/\n+/g, ' / ');
  const takes = [1, 2, 3].map(i => G('ws1.take.' + i).factor).filter(Boolean).join(', ');
  const ws3 = ['name', 'concept', 'experience', 'popup', 'photo', 'goods', 'benefit'].map(id => t('ws3.' + id)).filter(Boolean).join(' · ');
  const items = ITEMS4.map(it => `${it.name} ${nf(c.items[it.id])}만`).join(', ');
  const kp = KPIS.map(x => t('ws5.kpi.' + x.id)).filter(Boolean).join(' · ');
  const rk = RISKS.map(r => { const o = G('ws6.risk.' + r.id); return o.level ? `${r.name}(${{ high: '높음', mid: '중간', low: '낮음' }[o.level]})` : ''; }).filter(Boolean).join(', ');
  const bg = G('ws6.biggest'), br = RISKS.find(r => r.id === bg.risk);
  return {
    1: `20~30대 방문 비중 24%, 앱 미가입 신규 고객 확보가 필요합니다. 6주, 4억 원 안에서 달성하려 합니다. 사례에서 가져갈 것: ${takes || '(실습 ① 작성 필요)'}`,
    2: `선정: ${sel.join(' + ') || '(미정)'} · 파트너 비용 ${fm(c.partner)}. 이유: ${f.reason || '(이유 작성 필요)'}. 버린 후보: ${CANDS.filter(x => !(f.selected || []).includes(x.id) && f['rej_' + x.id]).map(x => `${x.id}(${f['rej_' + x.id]})`).join(', ') || '-'}`,
    3: ws3 || '(실습 ③ 작성 필요)',
    4: `${items}. 쓴 돈 ${fm(c.spent)} / 4억 원.${c.limit != null ? ` 본전 한도 ${fm(c.limit)}, ${c.shortfall > 0 ? `부족분 ${fm(c.shortfall)}` : '기간 내 본전'}.` : ''} 사전 합의: ${AGREE4.map(a => t('ws4.agree.' + a.id)).filter(Boolean).join(' / ') || '-'}`,
    5: kp || '(실습 ⑤ 작성 필요)',
    6: `${rk || '(실습 ⑥ 작성 필요)'}${br ? `. 가장 큰 리스크: ${br.name} — ${bg.reason || ''}` : ''}. 중단 기준선: ${t('ws6.stop') || '-'}`,
    7: `증분 매출 ${c.sales ?? '-'}억 원, 방문자 ${nf(c.visitors)}명 목표.${c.rev1 != null ? ` 방문자 1인당 약 ${nf(c.rev1)}원.` : ''}${c.limit != null ? ` 쓴 돈 ${fm(c.spent)} 대비 본전 한도 ${fm(c.limit)}.` : ''}${c.check2 != null ? ` 2주차 점검선 ${nf(c.check2)}명.` : ''}`,
  };
}
const SEC7 = ['1. 배경과 협업 목적', '2. 파트너 선정과 근거', '3. 협업 컨셉과 프로모션', '4. 역할·비용 분담', '5. KPI와 성과 귀속', '6. 리스크와 대응', '7. 기대 효과'];
const SRC7 = ['CASE · WS 01', 'WS 02', 'WS 03', 'WS 04', 'WS 05', 'WS 06', 'WS 05 + 계산기'];
function render7(mode) {
  const dr = draft7();
  let h = `<p>앞 실습 내용이 자동으로 모였습니다. <b>그대로 두지 말고 내 문장으로 다듬으세요.</b> "많이", "충분히" 같은 말은 숫자로 바꿉니다.</p>`;
  h += `<table class="ws">${th(['구성', '내용', '가져올 곳'])}<tbody>${SEC7.map((s, i) => { const o = G('ws7.sec.' + (i + 1)); const val = o.text ?? dr[i + 1]; return `<tr><td class="rh" data-l="구성">${s}</td><td data-l="내용">${mode === 'print' ? `<div class="pv">${esc(val)}</div>` : `<textarea data-sec="${i + 1}" aria-label="${s}" style="width:100%;min-height:96px;border:1px solid var(--line);padding:6px;border-radius:4px">${esc(val)}</textarea><button type="button" class="btn small" data-act7="reset" data-i="${i + 1}">다시 자동 채우기</button>`}</td><td data-l="가져올 곳">${SRC7[i]}</td></tr>`; }).join('')}</tbody></table>`;
  const c = compute(), k = id => num(G('ws5.kpi.' + id).target);
  const T = [['share', '20~30대 방문 비중', '24%', k('share') != null ? k('share') + '%' : '(실습 ⑤)'], ['app', '신규 회원 가입 (6주)', '—', k('app') != null ? nf(k('app')) + '명' : '(실습 ⑤)'], ['sales', '협업 기간 증분 매출', '—', k('sales') != null ? k('sales') + '억 원' : '(실습 ⑤)']];
  h += `<table class="ws">${th(['전체 정량 목표', '현재', '협업 후 목표 (실습 ⑤ 값)', '달성 방법'])}<tbody>${T.map(([id, l, cur, tg]) => `<tr><td class="rh" data-l="목표">${l}</td><td data-l="현재">${cur}</td><td data-l="목표">${tg}</td><td data-l="달성 방법">${mode === 'print' ? esc(G('ws7.target.' + id).how) : `<textarea data-tgt="${id}" aria-label="${l} 달성 방법" style="width:100%;min-height:60px;border:1px solid var(--line);padding:6px;border-radius:4px">${esc(G('ws7.target.' + id).how)}</textarea>`}</td></tr>`).join('')}</tbody></table>`;
  h += `<h2 style="font-size:19px;margin-top:20px">내 기획안 한눈에 보기 — 정한 것 · 이유 · 포기한 것</h2>`;
  h += `<table class="ws">${th(['실습', '정한 것', '이유', '포기한 것'])}<tbody>${[1, 2, 3, 4, 5, 6].map(n => { const w = state.wrap[n] || {}; return `<tr><td class="rh" data-l="실습">${'①②③④⑤⑥'[n - 1]} ${STEPS[n - 1].name}</td><td data-l="정한 것">${esc(w.decided)}</td><td data-l="이유">${esc(w.reason)}</td><td data-l="포기한 것">${esc(w.gaveUp)}</td></tr>`; }).join('')}</tbody></table>`;
  if (mode === 'edit') h += `<div class="row-actions"><button type="button" class="btn accent" id="dlAll">전체 인쇄(PDF)</button><button type="button" class="btn" id="dlCsv">전체 CSV 내려받기</button><button type="button" class="btn" id="dlJson">이어하기 파일(JSON) 저장</button></div>`;
  return h;
}

/* ───────── 오른쪽 패널 ───────── */
function bar(label, val, max) { const pct = Math.max(0, Math.min(100, val / max * 100)); return `<div>${esc(label)} <b>${nf(val)}만</b> (${(val / max * 100).toFixed(0)}%)</div><div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`; }
function renderSide() {
  const n = state.step, c = compute(), adv = allAdvice(n);
  let h = `<h2>자문 카드</h2>`;
  h += adv.length ? adv.map(advHtml).join('') : `<div class="note">지금은 걸리는 점이 없습니다. 칸을 채우면 조건에 맞는 자문이 이곳에 뜨고, 고치면 사라집니다.</div>`;
  h += `<div class="row-actions"><button type="button" class="btn small" data-top="consult">막혔어요 · 자문 구하기</button><button type="button" class="btn small" data-top="listen">조언 듣기</button></div>`;
  if (n >= 3) {
    const p = promos(); const on = Object.keys(PROMO_MAP).filter(k => p[k]);
    h += `<h2>실습 ④에서 커지는 항목 (미리보기)</h2>` + (on.length ? `<table class="ws" style="font-size:14px"><tbody>${on.map(k => `<tr><td class="rh">${PROMO_MAP[k].name}</td><td>돈이 커지는 곳: ${PROMO_MAP[k].grow}<br><i>미리 정해 둘 것: ${PROMO_MAP[k].ask}</i></td></tr>`).join('')}</tbody></table>` : '<div class="note">실습 ③에서 프로모션을 고르면 여기에 표시됩니다.</div>');
  }
  if (n >= 2) {
    h += `<h2>예산 계산기 (만 원)</h2><dl class="kv">
      <dt>파트너 비용</dt><dd>${nf(c.partner)}</dd>
      <dt>쓴 돈</dt><dd>${nf(c.spent)}</dd>
      <dt>남은 예산</dt><dd class="${c.remain < 0 ? 'over' : ''}">${nf(c.remain)}${c.remain < 0 ? ' (초과)' : ''}</dd>
      <dt>본전 한도</dt><dd>${c.limit != null ? nf(c.limit) : '-'}</dd>
      <dt>부족분</dt><dd>${c.shortfall != null ? (c.shortfall <= 0 ? '0 (본전)' : nf(c.shortfall)) : '-'}</dd>
      ${c.mode === 'recover' && c.perPerson != null ? `<dt>회수에 필요한 1인당 추가 구매액</dt><dd>${nf(c.perPerson)}원</dd>` : ''}
      <dt>방문자 1인당 매출</dt><dd>${c.rev1 != null ? nf(c.rev1) + '원' : '-'}</dd>
      <dt>2주차 점검선</dt><dd>${c.check2 != null ? nf(c.check2) + '명' : '-'}</dd>
      <dt>축소 운영 기준선</dt><dd>${c.stop != null ? nf(c.stop) + '명' : '-'}</dd>
      <dt>굿즈 제작 수량</dt><dd>${c.prod != null ? nf(c.prod) + '개 (남는 수량 ' + nf(c.prod - c.gQty) + ')' : '-'}</dd>
      <dt>클래스 정원</dt><dd>${c.cap > 0 ? nf(c.cap) + '명' : '-'}</dd></dl>`;
    h += `<h2>항목별 비중 (총 예산 4억 원)</h2>` + ITEMS4.map(it => bar(it.name, c.items[it.id], BUDGET)).join('');
    h += `<details class="lec"><summary>숫자가 안 맞을 때 점검 순서</summary><ol>${NUMBER_CHECK.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>`;
  }
  $('#side').innerHTML = h;
}

/* ───────── 자문 / 조언 듣기 / 맞춤 점검 ───────── */
function openConsult(n) {
  n = n || state.step;
  const html = `<h2 id="mTitle2">자문 구하기 · 실습 ${'①②③④⑤⑥⑦'[n - 1]}</h2><p class="lead">정답을 알려 드리지 않고, 스스로 답을 찾도록 질문을 돌려 드립니다. 해당하는 막힘을 눌러 보세요.</p>
    ${CONSULT[n].map(x => `<details class="sym"><summary>${esc(x.s)}</summary><ul>${x.q.map(q => `<li>${esc(q)}</li>`).join('')}</ul></details>`).join('')}
    ${n >= 2 ? `<details class="sym"><summary>결과(숫자)가 제대로 안 나와요</summary><ul>${NUMBER_CHECK.map(q => `<li>${esc(q)}</li>`).join('')}</ul></details>` : ''}
    <details class="sym"><summary>교안 핵심 노트 보기</summary><ul>${LECTURE[n].map(q => `<li>${esc(q)}</li>`).join('')}</ul></details>
    <div class="mbtns"><button type="button" class="btn accent" data-act="cancel">닫기 (Esc)</button></div>`;
  openSimple(html, e => { if (e.target.closest('[data-act=cancel]')) closeSimple(); });
}
function openListen() {
  const n = state.step, adv = allAdvice(n);
  const strong = adv.find(a => a.lv === 'grn') || null, weak = adv.find(a => a.lv === 'red') || adv.find(a => a.lv === 'org') || null;
  const Q = { 1: '그래서 네 사례 중 우리 목표(20~30대 신규)에 가장 가까운 사례는 무엇이고, 나머지를 버린다면 무엇을 포기합니까?', 2: '점수 1등이 아닌 후보를 골랐다면 무엇이 점수에 반영되지 않았습니까? 1등을 골랐다면 제약(4억·6주)은 정말 통과합니까?', 3: '이 팝업을 로고 없이 설명한다면 고객이 할 수 있는 새로운 행동은 무엇입니까?', 4: '쓴 돈이 한도를 넘는다면 줄일 곳과 그로 인해 생기는 위험은 무엇입니까?', 5: '방문자 숫자가 목표의 60%에 못 미치면 무엇을 바꾸기로 했습니까?', 6: '가장 큰 리스크가 현실이 되면 누가 언제 무엇을 결정합니까?', 7: '그래서 무엇을 포기했습니까?' };
  const html = `<h2 id="mTitle2">조언 듣기</h2><p class="lead">지금 입력한 내용만으로 세 가지를 말씀드립니다. 선택은 학습자가 합니다.</p>
    <div class="adv lv-grn"><span class="badge lv-grn">강점</span>${esc(strong ? strong.msg : '아직 뚜렷한 강점이 보이지 않습니다. 근거(숫자)를 채울수록 강점이 드러납니다.')}</div>
    <div class="adv lv-org"><span class="badge lv-org">가장 약한 곳</span>${esc(weak ? weak.msg : '지금 입력한 범위에서는 걸리는 점이 없습니다. 입력하지 않은 칸이 약한 곳일 수 있습니다.')}${weak && weak.why ? `<small>${esc(weak.why)}</small>` : ''}</div>
    <div class="adv lv-info"><span class="badge lv-info">스스로 생각해 볼 질문</span>${esc(Q[n])}</div>
    <div class="mbtns"><button type="button" class="btn accent" data-act="cancel">닫기</button></div>`;
  openSimple(html, e => { if (e.target.closest('[data-act=cancel]')) closeSimple(); });
}
function crossChecks(upto, d = state.d) {
  const c = compute(d), out = [], p = promos(d);
  const lic = G('ws4.item.license', d);
  if (upto >= 4 && lic.snap != null && lic.snap !== c.partner) out.push({ msg: `실습 ②에서 고른 파트너 비용(${nf(c.partner)}만 원)과 실습 ④의 라이선스(${nf(lic.snap)}만 원)가 다릅니다.`, go: 4, key: 'ws4.item.license' });
  if (upto >= 4) {
    if (p.class && (isFilled('ws4.item.staff', d) && c.items.staff === 0 || isFilled('ws4.item.space', d) && c.items.space === 0)) out.push({ msg: '클래스를 고르셨는데 운영 인력과 공간에 반영됐는지 확인하세요.', go: 4, key: 'ws4.item.staff' });
    if (p.goods && isFilled('ws4.item.production', d) && c.items.production === 0) out.push({ msg: '굿즈를 고르셨는데 제작비가 0입니다. 반영됐는지 확인하세요.', go: 4, key: 'ws4.item.production' });
    if (p.coupon && isFilled('ws4.item.promo', d) && c.items.promo === 0) out.push({ msg: '쿠폰을 고르셨는데 홍보·광고비가 0입니다. 반영됐는지 확인하세요.', go: 4, key: 'ws4.item.promo' });
  }
  if (upto >= 5) {
    if (c.couponCap > 0 && c.members > c.couponCap) out.push({ msg: `가입 목표(${nf(c.members)}명)가 쿠폰 한도(${nf(c.couponCap)}명)보다 큽니다.`, go: 5, key: 'ws5.kpi.app' });
    const th4 = num(G('ws4.agree.stock', d).threshold);
    if (th4 != null && c.gRate != null && c.gRate < th4) out.push({ msg: `판매율 목표(${c.gRate}%)가 재고 약속 기준(${th4}%)보다 낮습니다.`, go: 5, key: 'ws5.kpi.shared' });
    const s5 = num(G('ws5.kpi.sales', d).target);
    if (c.sales != null && s5 != null && c.sales !== s5) out.push({ msg: `증분 매출 목표가 실습 ④(${c.sales}억 원)와 ⑤(${s5}억 원)에서 다릅니다.`, go: 5, key: 'ws5.kpi.sales' });
  }
  if (upto >= 6) {
    const used = RISKS.reduce((s, r) => s + (num(G('ws6.risk.' + r.id, d).reserveUse) || 0), 0);
    if (isFilled('ws4.item.reserve', d) && used > c.items.reserve) out.push({ msg: `대응에 쓰겠다고 한 돈(${nf(used)}만 원)이 예비비(${nf(c.items.reserve)}만 원)보다 큽니다.`, go: 6, key: 'ws6.risk.performance' });
  }
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

/* ───────── 내려받기 ───────── */
function exportRows() {
  const rows = [['실습', '구분', '항목', '내용']];
  for (let n = 1; n <= 6; n++) {
    keysOf(n).forEach(x => { if (x.key.endsWith('.calc')) return; const t = cellText(x.key); if (t) rows.push([`실습 ${n} ${STEPS[n - 1].name}`, x.group, x.label, t]); });
    const w = state.wrap[n] || {}; [['decided', '정한 것'], ['reason', '이유'], ['gaveUp', '포기한 것']].forEach(([k, l]) => { if (w[k]) rows.push([`실습 ${n} ${STEPS[n - 1].name}`, '결정 요약', l, w[k]]); });
  }
  const dr = draft7(); SEC7.forEach((s, i) => rows.push(['실습 7 전략 기획안', '기획안', s, G('ws7.sec.' + (i + 1)).text ?? dr[i + 1]]));
  ['share', 'app', 'sales'].forEach(id => { const h = G('ws7.target.' + id).how; if (h) rows.push(['실습 7 전략 기획안', '정량 목표 달성 방법', id, h]); });
  const c = compute(); rows.push(['예산 계산기', '요약', '쓴 돈(만 원)', c.spent], ['예산 계산기', '요약', '남은 예산(만 원)', c.remain], ['예산 계산기', '요약', '본전 한도(만 원)', c.limit ?? '']);
  return rows;
}
function download(name, mime, data) { const b = new Blob([data], { type: mime }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const stamp = () => (state.meta.team || '조') + '_' + new Date().toISOString().slice(0, 10);
function downloadCsv() { const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; download(`제휴마케팅_${stamp()}.csv`, 'text/csv;charset=utf-8', '﻿' + exportRows().map(r => r.map(q).join(',')).join('\r\n')); }
function downloadJson() { state.meta.updatedAt = new Date().toISOString(); download(`제휴마케팅_이어하기_${stamp()}.json`, 'application/json', JSON.stringify(state, null, 1)); }
function printSteps(list) {
  const a = $('#printArea');
  a.innerHTML = list.map(n => `<section><h1>3-6. 제휴 마케팅 운영 · 실습 ${'①②③④⑤⑥⑦'[n - 1]}</h1><div class="sub">조 ${esc(state.meta.team)} · 작성자 ${esc(state.meta.writer)} · 교육용으로 구성한 가상 자료</div>${renderWS(n, 'print')}</section>`).join('');
  window.print();
}
window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; });

/* ───────── 네비게이션 / 전체 렌더 ───────── */
function setStep(n, force) {
  if (!force && !unlocked(n)) { $('#footMsg').textContent = `실습 ${'①②③④⑤⑥⑦'[n - 1]}은 앞 실습의 필수 칸을 채워야 열립니다.`; return; }
  state.step = n; persist(); renderAll(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0);
}
function renderNav() {
  $('#nav').innerHTML = STEPS.map(s => {
    const lk = !unlocked(s.n), p = s.n === 7 ? null : reqProgress(s.n), done = s.n !== 7 && p.done === p.total;
    return `<button type="button" data-step="${s.n}" ${s.n === state.step ? 'aria-current="step"' : ''} ${lk ? 'disabled' : ''}>${'①②③④⑤⑥⑦'[s.n - 1]} ${s.name}<small>${lk ? '🔒 잠김' : p ? (done ? '✓ 완료 ' : '진행 ') + p.done + '/' + p.total : '마무리'}</small></button>`;
  }).join('');
}
function renderAll(focusKey) {
  const y = window.scrollY;
  renderNav(); $('#main').innerHTML = renderWS(state.step); renderSide();
  $('#btnPrev').disabled = state.step === 1; $('#btnNext').disabled = state.step === 7;
  $('#btnNext').textContent = state.step === 6 ? '실습 ⑦ 기획안으로 →' : '다음 실습 →';
  $('#footMsg').textContent = '';
  if (focusKey) { const el = $(`[data-cell="${focusKey}"]`); if (el) el.focus({ preventScroll: true }); }
  window.scrollTo(0, y);
}
function goNext() {
  const n = state.step; if (n >= 7) return;
  const go = () => setStep(n + 1, true);
  if (!state.unlockAll && !stepDone(n)) {
    const p = reqProgress(n);
    $('#footMsg').textContent = `필수 칸이 ${p.total - p.done}개 비어 있습니다. 첫 빈 칸을 열어 드릴게요.`;
    const first = p.miss[0]; const def = first && cellDef(first.key); if (def) openModal(def); return;
  }
  const list = crossChecks(n + 0);
  const rel = list.filter(x => x.go <= n);
  if (rel.length) showChecks(rel, go); else go();
}

/* ───────── 이벤트 ───────── */
document.addEventListener('click', e => {
  const cell = e.target.closest('[data-cell]');
  if (cell && $('#overlay').hidden && $('#overlay2').hidden) { const def = cellDef(cell.getAttribute('data-cell')); if (def) openModal(def); return; }
  const st = e.target.closest('[data-step]'); if (st) { setStep(+st.getAttribute('data-step')); return; }
  const top = e.target.closest('[data-top]'); if (top) { if (top.getAttribute('data-top') === 'consult') openConsult(state.step); else openListen(); return; }
  const r7 = e.target.closest('[data-act7=reset]'); if (r7) { const i = r7.getAttribute('data-i'); delete state.d['ws7.sec.' + i]; persist(); renderAll(); return; }
  if (e.target.id === 'dlAll') printSteps([1, 2, 3, 4, 5, 6, 7]);
  if (e.target.id === 'dlCsv') downloadCsv();
  if (e.target.id === 'dlJson') downloadJson();
});
document.addEventListener('input', e => {
  const w = e.target.getAttribute && e.target.getAttribute('data-wrap');
  if (w) { const [n, f] = w.split(':'); state.wrap[n] = state.wrap[n] || {}; state.wrap[n][f] = e.target.value; persist(); renderSide(); return; }
  const sec = e.target.getAttribute && e.target.getAttribute('data-sec'); if (sec) { state.d['ws7.sec.' + sec] = { text: e.target.value }; persist(); return; }
  const tg = e.target.getAttribute && e.target.getAttribute('data-tgt'); if (tg) { state.d['ws7.target.' + tg] = { how: e.target.value }; persist(); return; }
  if (e.target.id === 'team') { state.meta.team = e.target.value; persist(); }
  if (e.target.id === 'writer') { state.meta.writer = e.target.value; persist(); }
});
$('#btnPrev').onclick = () => setStep(state.step - 1, true);
$('#btnNext').onclick = goNext;
$('#btnConsult').onclick = () => openConsult(state.step);
$('#btnSave').onclick = downloadJson;
$('#btnCsv').onclick = downloadCsv;
$('#btnPrint').onclick = () => printSteps(state.step === 7 ? [1, 2, 3, 4, 5, 6, 7] : [state.step]);
$('#btnLoad').onclick = () => $('#fileLoad').click();
$('#fileLoad').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { const o = JSON.parse(r.result); if (!o || !o.d) throw new Error('형식 오류'); state = Object.assign({ meta: {}, d: {}, wrap: {}, unlockAll: false, step: 1 }, o); persist(); init(); $('#footMsg').textContent = '이어하기 파일을 불러왔습니다.'; } catch (err) { alert('불러올 수 없는 파일입니다.'); } };
  r.readAsText(f); e.target.value = '';
};
$('#unlockAll').onchange = e => { state.unlockAll = e.target.checked; persist(); renderAll(); };

function init() {
  $('#team').value = state.meta.team || ''; $('#writer').value = state.meta.writer || ''; $('#unlockAll').checked = !!state.unlockAll;
  if (!unlocked(state.step)) state.step = 1;
  renderAll();
}
restore(); init();
