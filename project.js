// =======섹터번호 1=======
// (새 파일 최상단)
//=== 수정 시작 ===
/**
 * [project 도화지 봇] v1.0.0 (테스트: 가위바위보 미니 게임)
 */

var MY_HASH = "1249612734"; // 본인 해시값

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    // 1:1 방이 아니거나 본인이 아니면 작동 안 함
    if (isGroupChat || String(imageDB.getProfileHash()) !== MY_HASH) return;

    // 1. 기본 작동 테스트 명령어
    if (msg === "프로젝트테스트") {
        replier.reply("✅ 도화지 봇(project)이 완벽하게 갱신되어 작동 중입니다!\n\n🎮 테스트 게임: '가위', '바위', '보' 중 하나를 톡으로 보내보세요!");
        
cnlth
