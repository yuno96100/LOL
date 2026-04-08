// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v12.0.0
 * - 주요 기능: 자동 파티 생성, 이동, 참여/탈퇴/삭제/대기 시스템
 * - 변경 사항: 모든 액션(생성, 참여, 대기, 탈퇴) 시 실시간 멤버 현황 출력 추가
 */

// 봇이 켜져 있는 동안 파티 데이터를 기억할 저장소 (메모리 DB)
var partyDB = {};

// 모드별 최대 인원수 설정
var maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5
};

// 특정 파티의 실시간 멤버 및 대기 명단 텍스트를 생성하는 헬퍼 함수
function getPartyStatusText(pId) {
    var p = partyDB[pId];
    if (!p) return "";
    var status = "\n[ " + pId + " 현황 ]\n";
    status += " ⏰ 시간: " + p.time + " | 💬 " + p.vibe + "\n";
    status += " 👥 인원: (" + p.members.length + "/" + p.max + ")\n";
    status += " 👤 멤버\n";
    for (var i = 0; i < p.members.length; i++) {
        status += " - " + p.members[i] + "\n";
    }
    if (p.waiting.length > 0) {
        status += " ⏳ 대기중: " + p.waiting.join(", ") + "\n";
    }
    return status;
}

// 유저가 속한 파티 ID를 찾는 헬퍼 함수
function findUserParty(user) {
    for (var id in partyDB) {
        if (partyDB[id].members.indexOf(user) !== -1) return id;
    }
    return null;
}

// 유저가 대기 중인 파티 ID를 찾는 헬퍼 함수
function findUserWaiting(user) {
    for (var id in partyDB) {
        if (partyDB[id].waiting && partyDB[id].waiting.indexOf(user) !== -1) return id;
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
    if (room !== "ㅇㅇ") return;

    // 1. 통합 도움말
    if (msg === "도움말" || msg === "명령어") {
        var help = "[ 롤 구인 시스템 이용 가이드 ]\n\n" +
                   "1️⃣ 파티 만들기\n" +
                   "🔹 [모드] [시간] [분위기]\n" +
                   "👉 예시) 자랭 22시 즐겜\n\n" +
                   "2️⃣ 참여 및 관리\n" +
                   "🔹 양식 : 파티 생성 양식 보기\n" +
                   "🔹 현황 : 모집 중인 파티 목록 보기\n" +
                   "🔹 참여 [파티명] : 파티 합류 (이동 시 자동 탈퇴)\n" +
                   "🔹 대기 [파티명] : 파티 풀방일 때 대기 등록\n" +
                   "🔹 탈퇴 : 현재 파티/대기열에서 나가기\n" +
                   "🔹 삭제 (또는 쫑) : 현재 참여 중인 파티 폭파";
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

    // 3. 파티 현황 조회
    if (msg === "파티" || msg === "현황") {
        var keys = Object.keys(partyDB);
        var res = "[ 현재 파티 현황 ]\n\n";
        if (keys.length === 0) {
            res += "❌ 현재 모집 중인 파티가 없습니다.";
        } else {
            keys.sort();
            for (var i = 0; i < keys.length; i++) {
                res += "🔹 " + keys[i] + " (" + partyDB[keys[i]].members.length + "/" + partyDB[keys[i]].max + ")\n";
                res += " ⏰ " + partyDB[keys[i]].time + " | 💬 " + partyDB[keys[i]].vibe + "\n";
                res += " 👤 멤버: " + partyDB[keys[i]].members.join(", ") + "\n";
                if (partyDB[keys[i]].waiting.length > 0) res += " ⏳ 대기: " + partyDB[keys[i]].waiting.join(", ") + "\n";
                res += "\n";
            }
        }
        replier.reply(res.trim());
        return;
    }

    // 4. 파티 생성
    var modeMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람)(?:\s+|$)/);
    if (modeMatch && msg.indexOf("참여 ") !== 0 && msg.indexOf("대기 ") !== 0) {
        var createMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람)\s+([^\s]+)\s+(.+)$/);
        if (createMatch) {
            var oldPartyId = findUserParty(sender);
            var oldWaitId = findUserWaiting(sender);
            if (oldPartyId) {
                var oldP = partyDB[oldPartyId];
                oldP.members.splice(oldP.members.indexOf(sender), 1);
                if (oldP.members.length === 0) delete partyDB[oldPartyId];
            }
            if (oldWaitId) partyDB[oldWaitId].waiting.splice(partyDB[oldWaitId].waiting.indexOf(sender), 1);

            var mode = createMatch[1]; 
            var pId = getNextPartyId(mode); 
            partyDB[pId] = {
                mode: mode, members: [sender], waiting: [],
                max: maxMembers[mode], time: createMatch[2], vibe: createMatch[3]
            };
            replier.reply("🎉 [" + pId + "] 파티가 생성되었습니다!" + getPartyStatusText(pId));
            return;
        }
    }

    // 5. 파티 참여 및 이동
    if (msg.indexOf("참여 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("❌ 존재하지 않는 파티입니다."); return; }
        var p = partyDB[targetId];
        if (p.members.length >= p.max) { replier.reply("❌ [" + targetId + "] 파티는 풀방입니다. '대기 " + targetId + "'를 입력하세요."); return; }
        if (p.members.indexOf(sender) !== -1) { replier.reply("❌ 이미 참여 중입니다."); return; }

        var currentPartyId = findUserParty(sender);
        var currentWaitId = findUserWaiting(sender);
        if (currentPartyId) {
            var cp = partyDB[currentPartyId];
            cp.members.splice(cp.members.indexOf(sender), 1);
            if (cp.members.length === 0) delete partyDB[currentPartyId];
        }
        if (currentWaitId) partyDB[currentWaitId].waiting.splice(partyDB[currentWaitId].waiting.indexOf(sender), 1);
        
        p.members.push(sender);
        var replyMsg = "✅ " + sender + "님이 [" + targetId + "] 파티에 합류했습니다!" + getPartyStatusText(targetId);
        if (p.members.length === p.max) replyMsg += "\n🚀 인원이 모두 모였습니다!";
        replier.reply(replyMsg);
        return;
    }

    // 6. 대기열 등록
    if (msg.indexOf("대기 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("❌ 파티명이 존재하지 않습니다."); return; }
        var p = partyDB[targetId];
        if (p.members.indexOf(sender) !== -1) { replier.reply("❌ 이미 해당 파티 멤버입니다."); return; }
        if (p.waiting.indexOf(sender) !== -1) { replier.reply("❌ 이미 대기 중입니다."); return; }

        var currentWaitId = findUserWaiting(sender);
        if (currentWaitId) partyDB[currentWaitId].waiting.splice(partyDB[currentWaitId].waiting.indexOf(sender), 1);

        p.waiting.push(sender);
        replier.reply("⏳ " + sender + "님이 [" + targetId + "] 대기열에 등록되었습니다." + getPartyStatusText(targetId));
        return;
    }

    // 7. 삭제/쫑
    if (msg === "삭제" || msg === "쫑") {
        var targetId = findUserParty(sender);
        if (!targetId) { replier.reply("❌ 참여 중인 파티가 없습니다."); return; }
        delete partyDB[targetId];
        replier.reply("🗑️ [" + targetId + "] 파티가 삭제되었습니다.");
        return;
    }

    // 8. 탈퇴
    if (msg === "탈퇴") {
        var targetId = findUserParty(sender);
        var waitId = findUserWaiting(sender);
        if (!targetId && !waitId) { replier.reply("❌ 참여/대기 중인 파티가 없습니다."); return; }
        
        if (waitId) {
            partyDB[waitId].waiting.splice(partyDB[waitId].waiting.indexOf(sender), 1);
            replier.reply("💨 [" + waitId + "] 대기열에서 제외되었습니다." + getPartyStatusText(waitId));
        } else {
            var p = partyDB[targetId];
            p.members.splice(p.members.indexOf(sender), 1);
            if (p.members.length === 0) {
                delete partyDB[targetId];
                replier.reply("💨 [" + targetId + "] 파티가 해산되었습니다.");
            } else {
                var exitMsg = "💨 " + sender + "님이 [" + targetId + "] 파티에서 퇴장했습니다." + getPartyStatusText(targetId);
                if (p.waiting.length > 0) exitMsg += "\n🔔 대기 1순위 [" + p.waiting[0] + "]님! 빈자리가 생겼습니다.";
                replier.reply(exitMsg);
            }
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
