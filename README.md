# 제휴 마케팅 실습 도우미 (3-6)

롯데 LIFT 유통·리테일 과정 「3-6. 제휴 마케팅 운영」 실습 ①~⑦을 스스로 생각하고 계산하며 완성하는 웹앱입니다.
교육용으로 구성한 가상 자료입니다.

## 설계 원칙
- 정답 표시 없음: 보기(생각 자극)는 **내 생각을 먼저 써야** 열리고, 열 때마다 순서가 섞입니다.
- 계산은 직접: "내 계산 확인"으로 먼저 계산해 보고, 틀리면 단계별 힌트를 받습니다.
- 자문: 조건에 걸리면 자문 카드가 뜨고, "막혔어요"는 정답 대신 되묻는 질문을 줍니다.
- 앞 실습의 숫자가 뒤로 이어지고, 넘어갈 때 앞뒤 숫자를 점검합니다.
- 내려받기: 인쇄(PDF, A4 가로) / CSV / 이어하기 JSON.

## 실행
    npm start        # http://localhost:3000

의존성 없는 Node 정적 서버(`server.js`)와 `public/` 폴더로 구성됩니다.

## Railway 배포
1. Railway → New Project → Deploy from GitHub repo → 이 저장소 선택
2. 배포할 브랜치 지정 (빌드: Nixpacks 자동, 시작: `node server.js`, 헬스체크: `/healthz`)
3. Settings → Networking → Generate Domain
