# Diary Page Maker

브라우저에서 바로 사용하는 4:5 다이어리 속지 제작 도구입니다. 별도 서버나 빌드 과정 없이 종이 구성과 스타일을 조정하고 고해상도 PNG로 저장할 수 있습니다.

## 주요 기능

- 최대 3×3 영역 구성과 드래그 셀 병합
- 라인, 점선, 도트, 격자, 체크리스트 등 영역별 요소 설정
- 여백, 색상, 선 굵기, 투명도, 6공 펀칭 조정
- 고정 시드 기반 손그림 왜곡으로 미리보기와 출력 결과 일치
- 브라우저 `localStorage` 기반 프리셋 저장·편집·백업
- 1200·1600·2000px PNG 단일 또는 일괄 내보내기
- 외부 라이브러리, 계정, 네트워크 요청 없음

## 설계 핵심

미리보기와 PNG 내보내기는 동일한 `buildPageSvg()` 렌더 함수를 사용합니다. 모든 손그림 변형은 고정 시드 PRNG로 계산되어 같은 설정은 항상 같은 결과를 만듭니다.

```text
PageSettings
    └─ buildPageSvg(settings)
          ├─ 브라우저 미리보기
          └─ Canvas 래스터화 → PNG
```

자세한 데이터 모델과 렌더링 구조는 [설계 문서](docs/DESIGN.md)를 참고하세요.

## 실행

저장소를 내려받은 뒤 `index.html`을 브라우저에서 열면 됩니다.

```bash
git clone https://github.com/codingdarin/diary-page-maker.git
cd diary-page-maker
```

정적 파일만 사용하므로 GitHub Pages 같은 정적 호스팅에도 바로 배포할 수 있습니다.

## 기술

`Vanilla JavaScript` · `SVG` · `Canvas API` · `CSS` · `localStorage`

## 프로젝트 상태

핵심 제작·미리보기·프리셋·PNG 출력 흐름이 구현된 개인 프로젝트입니다. 사용자 데이터는 브라우저 안에만 저장됩니다.
