// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v10.0.0
 * - 주요 기능: 자동 파티 생성, 이동, 참여/탈퇴/삭제/모드별 통합 대기 시스템
 * - 변경 사항: 대기열을 파티 단위가 아닌 '모드 단위'로 통합 관리
 */

// 봇이 켜져 있는 동안 파티 데이터를 기억할 저장소 (메모리 DB)
var partyDB = {};

// 모드별 통합 대기열 저장소
var waitlistDB = {
    "내전": [], "아레나": [], "자랭": [], "듀랭": [], "칼바람": []
};

// 모드별 최대 인원수 설정
var maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5
};

// 유저가 속한 파티 ID를 찾는 헬퍼 함수
function findUserParty(user) {
    for (var id in partyDB) {
        if (partyDB[id].members.indexOf(user) !== -1) return id;
    }
    return null;
}

// 유저가 어느 모드의 대기열에 있는지 찾는 헬퍼 함수
function findUserWaitMode(user) {
    for (var mode in waitlistDB) {
        if (waitlistDB[mode].indexOf(user) !== -1) return mode;
    }
    return null;
}

// 사용 가능한 가장 낮은 파티 번호를 찾는 함수
function getNextPartyId(mode) {
    var i = 1;
    while (partyDB[mode + i]) {
        i++;
    }
    return mode + i;
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
                   "🔹 현황 : 모집 중인 파티 및 모드별 대기 현황\n" +
                   "🔹 참여 [파티명] : 파티 합류 (이동 시 자동 탈퇴)\n" +
                   "🔹 대기 [모드] : 해당 모드 통합 대기열 등록\n" +
                   "🔹 탈퇴 : 현재 파티 또는 대기열에서 나가기\n" +
                   "🔹 삭제 (또는 쫑) : 현재 내가 속한 파티 폭파\n\n" +
                   "※ 지원 모드: 내전, 아레나, 자랭, 듀랭, 칼바람";
        replier.reply(help);
        return;
    }

    // 2. 양식 카테고리
    if (msg === "양식") {
        var formMenu = "[ 파티 생성 양식 ]\n\n" +
                       "아래 양식에 맞춰 띄어쓰기로 입력하시면 파티가 자동 생성됩니다.\n\n" +
                       "🔹 양식: [모드] [시간] [분위기]\n\n" +
                       "👉 예시) 자랭 22시 즐겜\n" +
                       "👉 예시) 내전 지금 디코필수\n\n" +
                       "※ 지원 모드: 내전, 아레나(8명), 자랭, 듀랭, 칼바람";
        replier.reply(formMenu);
        return;
    }

    // 3. 파티 현황 조회 (모드별 대기 명단 포함)
    if (msg === "파티" || msg === "현황") {
        var keys = Object.keys(partyDB);
        var res = "[ 현재 파티 현황 ]\n\n";
        
        if (keys.length === 0) {
            res += "❌ 현재 모집 중인 파티가 없습니다.\n\n";
        } else {
            keys.sort();
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

        // 모드별 대기 현황 추가
        var waitStatus = "";
        for (var mode in waitlistDB) {
            if (waitlistDB[mode].length > 0) {
                waitStatus += "⏳ " + mode + " 대기: " + waitlistDB[mode].join(", ") + "\n";
            }
        }
        if (waitStatus !== "") {
            res += "[ 모드별 대기 현황 ]\n" + waitStatus + "\n";
        }
        
        res += "💡 참여: 참여 [파티명] | 대기: 대기 [모드]\n";
        res += "💡 삭제: 삭제 (파티원 누구나 가능)";
        replier.reply(res.trim());
        return;
    }

    // 4. 파티 생성
    var modeMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람)(?:\s+|$)/);
    if (modeMatch && msg.indexOf("참여 ") !== 0 && msg.indexOf("대기 ") !== 0) {
        var createMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람)\s+([^\s]+)\s+(.+)$/);
        
        if (createMatch) {
            // 기존 상태 정리
            var oldPartyId = findUserParty(sender);
            var oldWaitMode = findUserWaitMode(sender);
            if (oldPartyId) {
                var oldP = partyDB[oldPartyId];
                oldP.members.splice(oldP.members.indexOf(sender), 1);
                if (oldP.members.length === 0) delete partyDB[oldPartyId];
            }
            if (oldWaitMode) {
                waitlistDB[oldWaitMode].splice(waitlistDB[oldWaitMode].indexOf(sender), 1);
            }

            var mode = createMatch[1]; 
            var time = createMatch[2]; 
            var vibe = createMatch[3]; 
            var pId = getNextPartyId(mode); 
            
            partyDB[pId] = {
                mode: mode,
                members: [sender],
                max: maxMembers[mode],
                time: time,
                vibe: vibe
            };
            
            replier.reply("🎉 [" + pId + "] 파티가 생성되었습니다!\n" +
                          "⏰ 시간: " + time + "\n" +
                          "💬 분위기: " + vibe + "\n" +
                          "👥 인원: (1/" + maxMembers[mode] + ")");
            return;
        }
    }

    // 5. 파티 참여 및 이동
    if (msg.indexOf("참여 ") === 0) {
        var targetId = msg.split(" ")[1];
        
        if (!partyDB[targetId]) {
            replier.reply("❌ 존재하지 않는 파티입니다.");
            return;
        }
        
        var p = partyDB[targetId];
        if (p.members.length >= p.max) {
            replier.reply("❌ [" + targetId + "] 파티는 이미 꽉 찼습니다.\n💡 '대기 " + p.mode + "' 명령어를 사용해보세요.");
            return;
        }
        if (p.members.indexOf(sender) !== -1) {
            replier.reply("❌ 이미 해당 파티에 참여 중입니다.");
            return;
        }

        // 기존 상태 정리
        var currentPartyId = findUserParty(sender);
        var currentWaitMode = findUserWaitMode(sender);
        if (currentPartyId) {
            var currentP = partyDB[currentPartyId];
            currentP.members.splice(currentP.members.indexOf(sender), 1);
            if (currentP.members.length === 0) delete partyDB[currentPartyId];
        }
        if (currentWaitMode) {
            waitlistDB[currentWaitMode].splice(waitlistDB[currentWaitMode].indexOf(sender), 1);
        }
        
        p.members.push(sender);
        var replyMsg = "✅ " + sender + "님이 [" + targetId + "] 파티에 합류했습니다!\n" +
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

    // 6. 모드별 통합 대기열 등록
    if (msg.indexOf("대기 ") === 0) {
        var targetMode = msg.split(" ")[1];
        
        if (!waitlistDB.hasOwnProperty(targetMode)) {
            replier.reply("❌ 올바른 모드명을 입력해주세요.\n(내전, 아레나, 자랭, 듀랭, 칼바람)");
            return;
        }
        
        if (findUserParty(sender)) {
            replier.reply("❌ 이미 파티에 참여 중입니다. 탈퇴 후 대기해주세요.");
            return;
        }
        if (waitlistDB[targetMode].indexOf(sender) !== -1) {
            replier.reply("❌ 이미 이 모드의 대기열에 등록되어 있습니다.");
            return;
        }

        // 다른 모드 대기열에 있다면 이동
        var currentWaitMode = findUserWaitMode(sender);
        if (currentWaitMode) {
            waitlistDB[currentWaitMode].splice(waitlistDB[currentWaitMode].indexOf(sender), 1);
        }

        waitlistDB[targetMode].push(sender);
        replier.reply("⏳ " + sender + "님이 [" + targetMode + "] 통합 대기열에 등록되었습니다.\n현재 대기 순번: " + waitlistDB[targetMode].length + "번");
        return;
    }

    // 7. 파티 삭제/쫑
    if (msg === "삭제" || msg === "쫑") {
        var targetId = findUserParty(sender);
        if (!targetId) {
            replier.reply("❌ 현재 참여 중인 파티가 없습니다.");
            return;
        }
        
        delete partyDB[targetId];
        replier.reply("🗑️ [" + targetId + "] 파티가 삭제되었습니다.");
        return;
    }

    // 8. 파티 탈퇴 (또는 대기 취소)
    if (msg === "탈퇴") {
        var targetId = findUserParty(sender);
        var waitMode = findUserWaitMode(sender);
        
        if (!targetId && !waitMode) {
            replier.reply("❌ 현재 참여 또는 대기 중인 파티가 없습니다.");
            return;
        }
        
        if (waitMode) {
            waitlistDB[waitMode].splice(waitlistDB[waitMode].indexOf(sender), 1);
            replier.reply("💨 [" + waitMode + "] 대기열에서 제외되었습니다.");
        } else {
            var p = partyDB[targetId];
            var pMode = p.mode;
            p.members.splice(p.members.indexOf(sender), 1);
            
            if (p.members.length === 0) {
                delete partyDB[targetId];
                replier.reply("💨 [" + targetId + "] 파티의 마지막 인원이 퇴장하여 삭제되었습니다.");
            } else {
                var exitMsg = "💨 " + sender + "님이 [" + targetId + "] 파티에서 나갔습니다.\n남은 인원: (" + p.members.length + "/" + p.max + ")";
                
                // 해당 모드의 대기자가 있다면 알림
                if (waitlistDB[pMode].length > 0) {
                    exitMsg += "\n\n🔔 [" + pMode + "] 대기 1순위 [" + waitlistDB[pMode][0] + "]님! 빈자리가 생겼습니다. '참여 " + targetId + "'를 입력해보세요.";
                }
                replier.reply(exitMsg);
            }
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
