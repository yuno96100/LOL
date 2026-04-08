// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v7.0.0
 * - 주요 기능: 자동 파티 생성, 이동, 참여/탈퇴/삭제(쫑) 시스템
 * - 변경 사항: 방장 시스템 제거, 파티명 없는 탈퇴/삭제 지원, 자동 파티 이동 기능 추가
 */

// 봇이 켜져 있는 동안 파티 데이터를 기억할 저장소 (메모리 DB)
var partyDB = {};

// 모드별 파티 번호를 매기기 위한 카운터
var partyCounters = {
    "내전": 1, "아레나": 1, "자랭": 1, "듀랭": 1, "칼바람": 1
};

// 모드별 최대 인원수 설정
var maxMembers = {
    "내전": 10, "아레나": 2, "자랭": 5, "듀랭": 2, "칼바람": 5
};

// 유저가 속한 파티 ID를 찾는 헬퍼 함수
function findUserParty(user) {
    for (var id in partyDB) {
        if (partyDB[id].members.indexOf(user) !== -1) return id;
    }
    return null;
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 단체톡방 이름이 'ㅇㅇ'일 때만 작동
    if (room !== "ㅇㅇ") return;

    // 1. 통합 도움말
    if (msg === "도움말" || msg === "명령어") {
        var help = "[ 롤 구인 시스템 이용 가이드 ]\n\n" +
                   "1️⃣ 파티 만들기\n" +
                   "🔹 [모드] [시간] [분위기]\n" +
                   "👉 예시) 자랭 22시 즐겜\n\n" +
                   "2️⃣ 참여 및 관리\n" +
                   "🔹 현황 : 현재 모집 중인 파티 목록\n" +
                   "🔹 참여 [파티명] : 파티 합류 (이동 시 자동 탈퇴)\n" +
                   "🔹 탈퇴 : 현재 내가 속한 파티에서 나가기\n" +
                   "🔹 삭제 (또는 쫑) : 현재 내가 속한 파티 폭파\n\n" +
                   "※ 지원 모드: 내전, 아레나, 자랭, 듀랭, 칼바람";
        replier.reply(help);
        return;
    }

    // 2. 파티 현황 조회
    if (msg === "파티" || msg === "현황") {
        var keys = Object.keys(partyDB);
        var res = "[ 현재 파티 현황 ]\n\n";
        
        if (keys.length === 0) {
            res += "❌ 현재 모집 중인 파티가 없습니다.\n\n";
        } else {
            for (var i = 0; i < keys.length; i++) {
                var pId = keys[i];
                var p = partyDB[pId];
                res += "🔹 " + pId + " (" + p.members.length + "/" + p.max + ")\n";
                res += " ⏰ 시간: " + p.time + " | 💬 " + p.vibe + "\n";
                res += " 👤 멤버\n";
                for (var j = 0; j < p.members.length; j++) {
                    res += " - " + p.members[j] + "\n";
                }
                res += "\n";
            }
        }
        
        res += "💡 참여: 참여 [파티명]\n";
        res += "💡 삭제: 삭제 (파티원 누구나 가능)";
        replier.reply(res.trim());
        return;
    }

    // 3. 파티 생성
    var modeMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람)(?:\s+|$)/);
    if (modeMatch && msg.indexOf("참여 ") !== 0) {
        var createMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람)\s+([^\s]+)\s+(.+)$/);
        
        if (createMatch) {
            // 이미 파티에 속해 있다면 기존 파티 탈퇴 처리
            var oldPartyId = findUserParty(sender);
            if (oldPartyId) {
                var oldP = partyDB[oldPartyId];
                oldP.members.splice(oldP.members.indexOf(sender), 1);
                if (oldP.members.length === 0) delete partyDB[oldPartyId];
            }

            var mode = createMatch[1]; 
            var time = createMatch[2]; 
            var vibe = createMatch[3]; 
            var pId = mode + partyCounters[mode]; 
            
            partyDB[pId] = {
                mode: mode,
                members: [sender],
                max: maxMembers[mode],
                time: time,
                vibe: vibe
            };
            partyCounters[mode]++;
            
            replier.reply("🎉 [" + pId + "] 파티가 생성되었습니다!\n" +
                          "⏰ 시간: " + time + "\n" +
                          "💬 분위기: " + vibe + "\n" +
                          "👥 인원: (1/" + maxMembers[mode] + ")");
            return;
        } else if (!msg.match(/^(내전|아레나|자랭|듀랭|칼바람)$/)) {
            var modeName = modeMatch[1];
            replier.reply("❌ 형식이 올바르지 않습니다.\n\n💡 예시: " + modeName + " 22시 즐겜");
            return;
        }
    }

    // 4. 파티 참여 및 이동
    if (msg.indexOf("참여 ") === 0) {
        var targetId = msg.split(" ")[1];
        
        if (!partyDB[targetId]) {
            replier.reply("❌ 존재하지 않는 파티입니다.");
            return;
        }
        
        var p = partyDB[targetId];
        if (p.members.length >= p.max) {
            replier.reply("❌ [" + targetId + "] 파티는 이미 꽉 찼습니다.");
            return;
        }
        if (p.members.indexOf(sender) !== -1) {
            replier.reply("❌ 이미 해당 파티에 참여 중입니다.");
            return;
        }

        // 다른 파티에 참여 중이라면 자동 탈퇴 처리
        var currentPartyId = findUserParty(sender);
        var moveMsg = "";
        if (currentPartyId) {
            var currentP = partyDB[currentPartyId];
            currentP.members.splice(currentP.members.indexOf(sender), 1);
            moveMsg = "🔄 기존 파티 [" + currentPartyId + "]에서 퇴장 후 ";
            if (currentP.members.length === 0) delete partyDB[currentPartyId];
        }
        
        p.members.push(sender);
        var replyMsg = "✅ " + moveMsg + sender + "님이 [" + targetId + "] 파티에 합류했습니다!\n" +
                       "현재 인원: (" + p.members.length + "/" + p.max + ")\n" +
                       "참여자 목록:\n";
        
        for (var k = 0; k < p.members.length; k++) {
            replyMsg += " - " + p.members[k] + "\n";
        }
                       
        if (p.members.length === p.max) {
            replyMsg += "\n🚀 인원이 모두 모였습니다! 즐겜하세요.";
        }
        replier.reply(replyMsg);
        return;
    }

    // 5. 파티 삭제/쫑 (파티원 누구나 가능)
    if (msg === "삭제" || msg === "쫑") {
        var targetId = findUserParty(sender);
        
        if (!targetId) {
            replier.reply("❌ 현재 참여 중인 파티가 없습니다.");
            return;
        }
        
        delete partyDB[targetId];
        replier.reply("🗑️ [" + targetId + "] 파티가 사용자에 의해 삭제되었습니다.");
        return;
    }

    // 6. 파티 탈퇴 (파티명 생략 가능)
    if (msg === "탈퇴") {
        var targetId = findUserParty(sender);
        
        if (!targetId) {
            replier.reply("❌ 현재 참여 중인 파티가 없습니다.");
            return;
        }
        
        var p = partyDB[targetId];
        p.members.splice(p.members.indexOf(sender), 1);
        
        if (p.members.length === 0) {
            delete partyDB[targetId];
            replier.reply("💨 [" + targetId + "] 파티의 마지막 인원이 퇴장하여 파티가 삭제되었습니다.");
        } else {
            replier.reply("💨 " + sender + "님이 [" + targetId + "] 파티에서 나갔습니다.\n" +
                          "남은 인원: (" + p.members.length + "/" + p.max + ")");
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
