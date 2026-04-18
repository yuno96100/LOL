// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v27.0.0
 * - 주요 기능: 파티 생성, 참여(비고 포함), 이동, 예약, 예약취소(탈퇴)
 * - 변경 사항: 티모 페르소나 제거(클래식 톤 원복) 및 '기타게임' 모드 추가
 */

var partyDB = {};

// 기타게임 모드 추가 (기본 5명 설정)
const maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5, "기타게임": 5
};

// 깔끔하게 정돈된 클래식 파티 정보 유닛
function getPartyStatusText(pId) {
    var p = partyDB[pId];
    if (!p) return "";
    
    var status = "🏆 [ " + pId + " ]\n";
    status += "📅 " + p.time + "  |  💬 " + p.vibe + "\n";
    status += "📊 현황 : " + p.members.length + " / " + p.max + " 명\n";
    
    // 멤버 명단 출력 (구분선/하이픈 없이 깔끔하게)
    for (var i = 0; i < p.members.length; i++) {
        var m = p.members[i];
        var noteStr = m.t ? " (" + m.t + ")" : "";
        status += "👤 " + m.n + noteStr + "\n";
    }
    
    if (p.reservations.length > 0) {
        status += "⏳ 예약 : " + p.reservations.join(", ") + "\n";
    }
    
    return status.replace(/\n$/, "");
}

// 유저가 속한 파티 ID를 찾는 헬퍼 함수
function findUserParty(user) {
    for (var id in partyDB) {
        var p = partyDB[id];
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === user) return id;
        }
    }
    return null;
}

// 유저가 예약 중인 파티 ID를 찾는 헬퍼 함수
function findUserReservation(user) {
    for (var id in partyDB) {
        if (partyDB[id].reservations && partyDB[id].reservations.indexOf(user) !== -1) return id;
    }
    return null;
}

// 사용 가능한 가장 낮은 파티 번호를 찾는 함수
function getNextPartyId(mode) {
    var i = 1;
    while (partyDB[mode + i]) { i++; }
    return mode + i;
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (room !== "ㅇㅇ") return;

    // 1. 명령어 가이드 (클래식 톤 복구)
    if (msg === "명령어") {
        var help = "\n✨ [ 롤 구인 시스템 메뉴얼 ] ✨\n\n" +
                   "📝 파티 만들기\n" +
                   "👉 모드 시간 분위기\n" +
                   "👉 예) 자랭 22시 즐겜\n\n" +
                   "🔍 현황 : 전체 파티 보기\n" +
                   "✅ 참여 [파티명] [비고]\n" +
                   "👉 예) 참여 자랭1 정글\n" +
                   "⏳ 예약 [파티명] : 예약 명단 등록\n" +
                   "❌ 탈퇴 : 파티/예약 취소\n" +
                   "🧨 파티삭제 : 내 파티 해산하기\n\n" +
                   "※ 지원: 내전, 아레나(8), 자랭, 듀랭, 칼바람, 기타게임";
        replier.reply(help);
        return;
    }

    // 2. 파티 현황
    if (msg === "현황") {
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply("✨ [ 실시간 파티 현황 ] ✨\n\n💡 현재 모집 중인 파티가 없습니다.\n새로운 파티를 만들어보세요!");
            return;
        }
        
        var body = "✨ [ 실시간 파티 현황 ] ✨\n\n";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            body += getPartyStatusText(keys[i]) + "\n";
            if (i < keys.length - 1) body += "\n";
        }
        body += "\n💡 참여 [파티명] [비고] / 예약 [파티명]";
        replier.reply(body);
        return;
    }

    // 3. 파티 생성 (기타게임 정규식 추가)
    var modeMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)(?:\s+|$)/);
    if (modeMatch && msg.indexOf("참여 ") !== 0 && msg.indexOf("예약 ") !== 0) {
        var createMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)\s+([^\s]+)\s+(.+)$/);
        if (createMatch) {
            var oldPartyId = findUserParty(sender);
            var oldResId = findUserReservation(sender);
            if (oldPartyId) {
                var oldP = partyDB[oldPartyId];
                for (var i = 0; i < oldP.members.length; i++) {
                    if (oldP.members[i].n === sender) {
                        oldP.members.splice(i, 1);
                        break;
                    }
                }
                if (oldP.members.length === 0) delete partyDB[oldPartyId];
            }
            if (oldResId) partyDB[oldResId].reservations.splice(partyDB[oldResId].reservations.indexOf(sender), 1);

            var mode = createMatch[1]; 
            var pId = getNextPartyId(mode); 
            partyDB[pId] = {
                mode: mode, 
                members: [{n: sender, t: ""}], 
                reservations: [],
                max: maxMembers[mode], 
                time: createMatch[2], 
                vibe: createMatch[3]
            };
            replier.reply("🎉 파티 생성 완료\n\n성공적으로 파티를 생성했습니다!\n\n" + getPartyStatusText(pId) + "\n\n💡 같이 하실 분은 '참여 " + pId + " [비고]'를 입력해주세요.");
            return;
        } else if (!msg.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)$/)) {
            replier.reply("⚠️ 입력 오류\n\n형식이 올바르지 않습니다.\n👉 예시: 자랭 22시 즐겜\n띄어쓰기를 꼭 맞춰주세요!");
            return;
        }
    }

    // 4. 파티 참여
    if (msg.indexOf("참여 ") === 0) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        var note = parts.slice(2).join(" "); 
        
        if (!partyDB[targetId]) { replier.reply("⚠️ 참여 실패\n\n존재하지 않는 파티 이름입니다.\n이름을 다시 확인해주세요."); return; }
        var p = partyDB[targetId];
        if (p.members.length >= p.max) { replier.reply("⚠️ 인원 초과\n\n해당 파티는 꽉 찼습니다.\n'예약 " + targetId + "'을 써서 대기해주세요!"); return; }
        
        var isAlreadyIn = false;
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === sender) { isAlreadyIn = true; break; }
        }
        if (isAlreadyIn) { replier.reply("⚠️ 중복 참여\n\n이미 해당 파티에 소속되어 있습니다."); return; }

        var currentPartyId = findUserParty(sender);
        var currentResId = findUserReservation(sender);
        if (currentPartyId) {
            var cp = partyDB[currentPartyId];
            for (var i = 0; i < cp.members.length; i++) {
                if (cp.members[i].n === sender) {
                    cp.members.splice(i, 1);
                    break;
                }
            }
            if (cp.members.length === 0) delete partyDB[currentPartyId];
        }
        if (currentResId) partyDB[currentResId].reservations.splice(partyDB[currentResId].reservations.indexOf(sender), 1);
        
        p.members.push({n: sender, t: note});
        var replyMsg = sender + "님 합류 완료!\n\n" + getPartyStatusText(targetId);
        replier.reply("✅ 파티 참여 완료\n\n" + replyMsg);
        return;
    }

    // 5. 파티 예약
    if (msg.indexOf("예약 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("⚠️ 예약 실패\n\n예약할 파티가 존재하지 않습니다."); return; }
        var p = partyDB[targetId];
        
        var isMember = false;
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === sender) { isMember = true; break; }
        }
        if (isMember) { replier.reply("⚠️ 중복 예약\n\n이미 파티에 합류 중입니다!"); return; }
        if (p.reservations.indexOf(sender) !== -1) { replier.reply("⚠️ 중복 예약\n\n이미 예약 명단에 있습니다."); return; }

        var currentResId = findUserReservation(sender);
        if (currentResId) partyDB[currentResId].reservations.splice(partyDB[currentResId].reservations.indexOf(sender), 1);

        p.reservations.push(sender);
        replier.reply("📝 예약 완료\n\n" + sender + "님, 자리가 나면 알려드릴게요!\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 6. 파티삭제
    if (msg === "파티삭제") {
        var targetId = findUserParty(sender);
        if (!targetId) { replier.reply("⚠️ 삭제 실패\n\n소속된 파티가 없습니다."); return; }
        delete partyDB[targetId];
        replier.reply("🧨 파티 삭제\n\n[" + targetId + "] 파티가 해산되었습니다.");
        return;
    }

    // 7. 탈퇴 / 예약취소 통합
    if (msg === "탈퇴" || msg === "예약취소") {
        var targetId = findUserParty(sender);
        var resId = findUserReservation(sender);
        if (!targetId && !resId) { replier.reply("⚠️ 탈퇴 실패\n\n참여 중인 파티나 예약 명단이 없습니다."); return; }
        
        if (resId) {
            partyDB[resId].reservations.splice(partyDB[resId].reservations.indexOf(sender), 1);
            replier.reply("💨 예약 취소\n\n예약 명단에서 취소되었습니다.");
        } else {
            var p = partyDB[targetId];
            for (var i = 0; i < p.members.length; i++) {
                if (p.members[i].n === sender) {
                    p.members.splice(i, 1);
                    break;
                }
            }
            if (p.members.length === 0) {
                delete partyDB[targetId];
                replier.reply("🍃 파티 해산\n\n파티원이 모두 이탈해 파티가 사라졌습니다.");
            } else {
                var exitMsg = sender + "님이 파티에서 나갔습니다.\n\n" + getPartyStatusText(targetId);
                if (p.reservations.length > 0) exitMsg += "\n\n🔔 알림: 대기 1순위 [" + p.reservations[0] + "]님!\n자리가 났습니다. '참여 " + targetId + "'를 입력해주세요!";
                replier.reply("💨 파티 퇴장\n\n" + exitMsg);
            }
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
