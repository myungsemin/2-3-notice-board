# 문의 시스템 (NS/SW/HW)

## 로그인
- 학생: 학번=아이디=비밀번호 (20301 ~ 20337)
- 총관리자: admin / admin123
- NS 관리자: nsadmin / ns123
- SW 관리자: swadmin / sw123
- HW 관리자: hwadmin / hw123

## 기능
- 학생: 분야 선택(NS/SW/HW) 문의 작성, 다회 작성, 내 문의 확인
- 관리자: 권한 범위(분야/전체) 글 열람 및 답장
- 백업 다운로드: 권한에 맞는 글 JSON 저장

## 로컬 실행
- `index.html`을 브라우저로 직접 엽니다.
- (선택) 간단 서버: `python3 -m http.server 8000` 후 `http://localhost:8000/`

## GitHub Pages 배포
1. 이 폴더의 파일들을 GitHub 새 저장소에 푸시
2. 저장소 Settings → Pages → Branch를 `main`(또는 `master`)의 `/ (root)`로 선택
3. 배포 URL(`https://<사용자명>.github.io/<저장소명>/`)로 접속

참고: `.nojekyll` 포함됨
