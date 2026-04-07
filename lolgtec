// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v1.1.0
 * - 주요 기능: 단체톡방 'ㅇㅇ' 전용 구인 양식 출력
 */

const UI = {
    LINE_CHAR: "━", FIXED_LINE: 16,
    getDivider: function() { return Array(this.FIXED_LINE + 1).join(this.LINE_CHAR); }
};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 단체톡방 이름이 'ㅇㅇ'일 때만 작동하도록 제한
    if (room !== "ㅇㅇ") return;

    // 명령어: !구인양식 또는 !양식
    if (msg === "!구인양식" || msg === "!양식") {
        var formMsg = "📋 [ 롤 파티 구인 양식 ]\n\n" +
                      "아래 양식을 복사하여 빈칸을 채워주세요.\n" +
                      UI.getDivider() + "\n" +
                      "🔹 닉네임 : \n" +
                      "🔹 티어 : \n" +
                      "🔹 주 포지션 : \n" +
                      "🔹 마이크 여부(O/X) : \n" +
                      "🔹 남길 말 : \n" +
                      UI.getDivider();
                      
        replier.reply(formMsg);
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
