# englantis-learning-mockup

## TeachAI OpenAI 연결 실행

1. OpenAI API key를 Windows 환경변수에 저장합니다.

   ```powershell
   setx OPENAI_API_KEY "발급받은_API_KEY"
   ```

2. PowerShell을 새로 열고 프로젝트 폴더에서 실행합니다.

   ```powershell
   npm run dev
   ```

3. 브라우저에서 표시된 주소를 열고 TeachAI 미션을 시작합니다.

`npm run dev`는 Vite 화면과 `/api/teach/*` 서버를 함께 실행합니다. 학생 답안은 브라우저에서 OpenAI로 직접 가지 않고, 로컬 서버가 `OPENAI_API_KEY`를 사용해 OpenAI Responses API에 대신 요청합니다.

모델을 바꾸고 싶으면 선택 사항으로 아래 환경변수를 추가합니다.

```powershell
setx OPENAI_TEACH_MODEL "gpt-4.1-mini"
```
