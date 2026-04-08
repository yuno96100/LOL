// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v2.0.1
 * - 주요 기능: 파티 자동 생성, 현황 조회, 참여 및 탈퇴 시스템
 * - 변경 사항: UI 객체 및 꾸밈용 구분선 완전히 제거 (평문 출력)
 */

// 봇이 켜져 있는 동안 파티 데이터를 기억할 저장소 (메모리 DB)
var partyDB = {};

// 모드별 파티 번호를 매기기 위한 카운터 (예: 자랭1, 자랭2...)
var partyCounters = {
    "내전": 1, "아레나": 1, "자랭": 1, "듀랭": 1, "칼바람": 1
};

// 모드별 최대 인원수 설정
var maxMembers = {
    "내전": 10, "아레나": 2, "자랭": 5, "듀랭": 2, "칼바람": 5
};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 단체톡방 이름이 'ㅇㅇ'일 때만 작동
    if (room !== "ㅇㅇ") return;

    // 1. 파티 현황 조회 (명령어: 파티 또는 현황)
    if (msg === "파티" || msg === "현황") {
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply("현재 모집 중인 파티가 없습니다.\n(명령어 예시: 자랭 생성)");
            return;
        }
        
        var res = "[ 현재 파티 현황 ]\n\n";
        for (var i = 0; i < keys.length; i++) {
            var pId = keys[i];
            var p = partyDB[pId];
            res += "🔹 " + pId + " (" + p.members.length + "/" + p.max + ")\n";
            res += " └ 참여자: " + p.members.join(", ") + "\n\n";
        }
        res += "💡 참여하려면: 참여 [파티명] (예: 참여 자랭1)\n";
        res += "💡 탈퇴하려면: 탈퇴 [파티명] (예: 탈퇴 자랭1)";
        replier.reply(res.trim());
        return;
    }

    // 2. 파티 생성 (명령어: [모드] 생성)
    var createMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람) 생성$/);
    if (createMatch) {
        var mode = createMatch[1]; // "자랭"
        var pId = mode + partyCounters[mode]; // "자랭1"
        
        // 파티 데이터 생성 및 방장(sender) 자동 참여
        partyDB[pId] = {
            mode: mode,
            host: sender,
            members: [sender],
            max: maxMembers[mode]
        };
        partyCounters[mode]++; // 다음 파티를 위해 번호 1 증가
        
        replier.reply("🎉 [" + pId + "] 파티가 생성되었습니다!\n\n" +
                      "방장: " + sender + "\n" +
                      "인원: (1/" + maxMembers[mode] + ")\n\n" +
                      "💡 같이 하실 분들은 '참여 " + pId + "' 을 입력해주세요.");
        return;
    }

    // 3. 파티 참여 (명령어: 참여 [파티명])
    if (msg.indexOf("참여 ") === 0) {
        var targetId = msg.split(" ")[1]; // "자랭1"
        
        if (!partyDB[targetId]) {
            replier.reply("❌ 존재하지 않거나 이미 종료된 파티입니다.");
            return;
        }
        
        var p = partyDB[targetId];
        if (p.members.length >= p.max) {
            replier.reply("❌ [" + targetId + "] 파티는 이미 인원이 꽉 찼습니다.");
            return;
        }
        if (p.members.indexOf(sender) !== -1) {
            replier.reply("❌ 이미 [" + targetId + "] 파티에 참여 중입니다.");
            return;
        }
        
        p.members.push(sender); // 멤버 목록에 닉네임 추가
        var isFull = p.members.length === p.max;
        
        var replyMsg = "✅ " + sender + "님이 [" + targetId + "] 파티에 합류했습니다!\n" +
                       "현재 인원: (" + p.members.length + "/" + p.max + ")\n" +
                       "참여자: " + p.members.join(", ");
                       
        if (isFull) {
            replyMsg += "\n\n🚀 인원이 모두 모였습니다! 파티를 시작해주세요.";
        }
        replier.reply(replyMsg);
        return;
    }

    // 4. 파티 탈퇴 및 해산 (명령어: 탈퇴 [파티명])
    if (msg.indexOf("탈퇴 ") === 0) {
        var targetId = msg.split(" ")[1];
        
        if (!partyDB[targetId]) return; // 없는 파티면 무시
        
        var p = partyDB[targetId];
        var idx = p.members.indexOf(sender);
        
        if (idx === -1) {
            replier.reply("❌ 해당 파티에 참여하고 있지 않습니다.");
            return;
        }
        
        // 방장이 탈퇴하면 파티 자체를 삭제 (폭파)
        if (p.host === sender) {
            delete partyDB[targetId];
            replier.reply("💥 방장(" + sender + ")이 이탈하여 [" + targetId + "] 파티가 해산되었습니다.");
            return;
        }
        
        // 일반 멤버 탈퇴 시 목록에서만 제거
        p.members.splice(idx, 1);
        replier.reply("💨 " + sender + "님이 [" + targetId + "] 파티에서 나갔습니다.\n" +
                      "현재 인원: (" + p.members.length + "/" + p.max + ")");
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
