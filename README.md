# 🧸 Hummit (허밋) — AI Humming Music Detective Studio

> **"듣고 있는 멜로디, 웅얼거려도 다 알아들어요"**
> 가사가 기억나지 않아도, 음정·리듬·흥얼거림 발음만으로 K-POP, J-POP, 글로벌 팝송 원곡 하이라이트를 찾아주는 AI 허밍 음악 탐정 스튜디오 웹 애플리케이션입니다.

---

## ✨ 주요 기능 (Key Features)

1. **🎙️ 실시간 허밍 녹음 & 라이브 피치/발음 분석**
   - Web Audio API 자기상관(Autocorrelation) 기반 실시간 피치 추출 및 음계 시각화
   - 가사를 몰라도 들리는 대로 웅얼거린 발음(Phonetics)과 템포(BPM)를 동시에 캡처
2. **🧠 Gemini 멀티모달 멜로디·발음 추론 & 재탐색 (Re-Inference)**
   - 녹음된 실제 오디오, 추출된 음계 인터벌, 발음 기호를 종합 분석해 Top 3 후보 곡과 3단계 추론 근거 제시
   - 다시 노래를 부르지 않고도 이전 후보를 제외하고 장르 필터를 적용해 **다른 후보 3곡 다시 추론하기** 지원
3. **💿 실제 원곡 30초 하이라이트 미리듣기 & 내 목소리 다시 듣기**
   - Apple iTunes Search API 연동으로 인위적인 기계음 대신 **원곡 가수의 공식 30초 하이라이트 음원** 및 고화질 앨범 커버 즉시 재생
   - 내가 방금 부른 실제 흥얼거림 녹음 원본 다시 듣기 지원
4. **☁️ 계정별 경량 클라우드 LP 보관함 (Multi-Account Cloud DB)**
   - 계정별(`@huiju`, `@popboymp3`, `@cafe_digger` 등)로 찾은 노래 히스토리를 독립 보관
   - 브라우저 내장 `IndexedDB` 영구 스토리지 및 선택적 `Firebase Realtime Database REST API` 실시간 동기화 지원
5. **🎨 Warm Retro Studio UI & 3D 코지 테디베어 마스코트**
   - Three.js 기반 3D 골방 레트로 스튜디오 곰돌이 마스코트 (13열 골든 네온 이퀄라이저 월, 아날로그 신디사이저 데스크, LP 바이닐 스택)
   - 인스타그램 스토리 공유용 고해상도 LP 카드 이미지 생성 및 다운로드

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **3D & Motion:** Three.js (`PopboyMascot3D`), Canvas Confetti
- **AI & Audio:** Google Gemini API (`@google/genai`), Web Audio API, Apple iTunes Search API
- **Database:** IndexedDB + Firebase Realtime Database REST Sync

---

## 🚀 실행 방법 (Getting Started)

```bash
# 1. 패키지 설치
npm install

# 2. 환경 변수 설정 (.env 파일 생성)
cp .env.example .env
# VITE_GEMINI_API_KEY에 Gemini API 키 입력 (앱 내 상단 열쇠 아이콘 모달에서도 입력 가능)

# 3. 개발 서버 실행
npm run dev
```
