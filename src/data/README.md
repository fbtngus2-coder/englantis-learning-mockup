# ENGLANTIS Data Modules

화면 컴포넌트에서 직접 고치지 않아도 되도록, 목업 데이터를 역할별로 나누었습니다.

## 학습자와 코스

- `studentProfile.ts`: 현재 학습자 정보, 레벨, 링코, 현재 학습 위치
- `learningPath.ts`: 주차/일차 학습 흐름, 오늘의 단원 정보
- `courseMap.ts`: 코스 게이트 화면의 노드 위치와 상태, 세션 아이콘

## 일일 학습

- `watchScenes.ts`: WATCH 대화형 레슨 장면
- `doMissions.ts`: DO 허브의 네 가지 미션 카드
- `practiceQuestions.ts`: 문장 정화, 룬 퍼즐, NPC 미션, 주간/월간 리뷰 문제
- `teachLessons.ts`: TeachAI 단원 목표와 NPC 지식 상태
- `teachMissions.ts`: TeachAI 단계별 미션과 입력 레벨

## 활동 아틀라스와 게임 규칙

- `activityAtlas.ts`: WATCH/DO/TEACH 활동 목록, 설명, 조작 안내
- `rhythmGame.ts`: 리듬 게임 노트, 박자, 레인 위치
- `fogBattleData.ts`: 안개몬 도시, 안개몬 종류, 배틀 모드, 보스 모드

## 화면 에셋

- `sceneAssets.ts`: 배경과 캐릭터의 public asset 경로
- `storyIntroData.ts`: 6페이지 스토리 인트로 장면 데이터

## 호환 파일

- `dummyData.ts`: 예전 import가 깨지지 않도록 남긴 re-export 파일입니다. 새 작업에서는 위의 역할별 파일을 직접 사용하는 것을 권장합니다.
