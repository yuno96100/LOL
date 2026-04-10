// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v19.0.0
 * - 주요 기능: 파티 생성, 참여, 이동, 예약, 예약취소, 파티삭제
 * - 변경 사항: 상단 구분선 제거, 도움말 메뉴 가독성 대폭 개선(리스트형 배치)
 */

var partyDB = {};

const maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5
};

// 🎨 군더더기를 뺀 미니멀 UI 엔진
const UI = {
    D: "--------------------------", // 항목 간 구분선
    format: function(title, content) {
        // 상단 구분선을 없애고 제목과 내용 사이 여백만 확보
        return title + "\n" + content;
    }
};

// 🐥 가독성 최적화 파티 정보 유닛
function getPartyStatusText(pId) {
    var p = partyDB[pId];
    if (!p) return "";
    
    var status = "🏆 [ " + pId + " ]\n";
    status += "📅 " + p.time + "  |  💬 " + p.vibe + "\n";
    status += "📊 현황 : " + p.members.length + " / " + p.max + " 명\n";
    status += " " + UI.D + "\n";
    
    for (var i = 0; i < p.members.length; i++) {
        var prefix = (i === p.members.length - 1 && p.reservations.length === 0) ? " ┗ " : " ┣ ";
        status += prefix + "👤 " + p.members[i] + "\n";
    }
    
    if (p.reservations.length > 0) {
        status += " ┃ \n";
        status += " ┗ ⏳ 예약 : " + p.reservations.join(", ") + "\n";
    }
    
    return status.replace(/\n$/, "");
}

function findUserParty(user) {
    for (var id in partyDB) { if (partyDB[id].members.indexOf(user) !== -1) return id; }
    return null;
}

function findUserReservation(user) {
    for (var id in partyDB) { if (partyDB[id].reservations && partyDB[id].reservations.indexOf(user) !== -1) return id; }
    return null;
}

function getNextPartyId(mode) {
    var i = 1;
    while (partyDB[mode + i]) { i++; }
    return mode + i;
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (room !== "ㅇㅇ") return;

    // 1. 명령어 가이드 (리스트형으로 가독성 복구)
    if (msg === "명령어") {
        var help = "\n✨ [ 이용 메뉴얼 ] ✨\n" +
                   " " + UI.D + "\n\n" +
                   "📝 파티 만들기\n" +
                   "👉 모드 시간 분위기\n" +
                   "👉 예) 자랭 22시 즐겜\n\n" +
                   "🔍 현황 : 파티 목록 보기\n" +
                   "✅ 참여 [파티명] : 파티 합류하기\n" +
                   "⏳ 예약 [파티명] : 예약 명단 등록\n" +
                   "❌ 예약취소 : 참여/예약 나가기\n" +
                   "🧨 파티삭제 : 내 파티 해산하기\n\n" +
                   " " + UI.D + "\n" +
                   "※ 아레나(8) / 내전(10) / 그외(5)";
        replier.reply(help);
        return;
    }

    // 2. 파티 현황
    if (msg === "현황") {
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply("✨ [ 실시간 파티 현황 ] ✨\n\n💡 현재 모집 중인 팀이 없어요.\n새로운 파티를 만들어보세요! (๑>ᴗ<๑)");
            return;
        }
        
        var body = "\n";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            body += getPartyStatusText(keys[i]) + "\n";
            if (i < keys.length - 1) body += " " + UI.D + "\n\n";
        }
        body += "\n💡 참여 [파티명] / 예약 [파티명]";
        replier.reply(UI.format("✨ [ 실시간 파티 현황 ] ✨", body));
        return;
    }

    // 3. 파티 생성
    var modeMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람)(?:\s+|$)/);
    if (modeMatch && msg.indexOf("참여 ") !== 0 && msg.indexOf("예약 ") !== 0) {
        var createMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람)\s+([^\s]+)\s+(.+)$/);
        if (createMatch) {
            var oldPartyId = findUserParty(sender);
            var oldResId = findUserReservation(sender);
            if (oldPartyId) {
                var oldP = partyDB[oldPartyId];
                oldP.members.splice(oldP.members.indexOf(sender), 1);
                if (oldP.members.length === 0) delete partyDB[oldPartyId];
            }
            if (oldResId) partyDB[oldResId].reservations.splice(partyDB[oldResId].reservations.indexOf(sender), 1);

            var mode = createMatch[1]; 
            var pId = getNextPartyId(mode); 
            partyDB[pId] = {
                mode: mode, members: [sender], reservations: [],
                max: maxMembers[mode], time: createMatch[2], vibe: createMatch[3]
            };
            replier.reply(UI.format("🎉 파티 생성 완료", "\n" + getPartyStatusText(pId)));
            return;
        } else if (!msg.match(/^(내전|아레나|자랭|듀랭|칼바람)$/)) {
            replier.reply(UI.format("⚠️ 입력 방식 확인", "\n'자랭 22시 즐겜' 처럼\n띄어쓰기로 입력해주세요! 💦"));
            return;
        }
    }

    // 4. 파티 참여
    if (msg.indexOf("참여 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply(UI.format("⚠️ 참여 실패", "\n존재하지 않는 파티 이름이에요! 🥺")); return; }
        var p = partyDB[targetId];
        if (p.members.length >= p.max) { replier.reply(UI.format("⚠️ 인원 초과", "\n현재 자리가 없어요!\n'예약 " + targetId + "'을 써보세요!")); return; }
        if (p.members.indexOf(sender) !== -1) { replier.reply(UI.format("⚠️ 중복 참여", "\n이미 이 파티에 계시네요! 😊")); return; }

        var currentPartyId = findUserParty(sender);
        var currentResId = findUserReservation(sender);
        if (currentPartyId) {
            var cp = partyDB[currentPartyId];
            cp.members.splice(cp.members.indexOf(sender), 1);
            if (cp.members.length === 0) delete partyDB[currentPartyId];
        }
        if (currentResId) partyDB[currentResId].reservations.splice(partyDB[currentResId].reservations.indexOf(sender), 1);
        
        p.members.push(sender);
        replier.reply(UI.format("✅ 참여 완료", "\n" + getPartyStatusText(targetId)));
        return;
    }

    // 5. 파티 예약
    if (msg.indexOf("예약 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply(UI.format("⚠️ 예약 실패", "\n예약할 파티가 없어요! 🥺")); return; }
        var p = partyDB[targetId];
        if (p.members.indexOf(sender) !== -1) { replier.reply(UI.format("⚠️ 중복 예약", "\n이미 멤버로 참여 중입니다!")); return; }
        if (p.reservations.indexOf(sender) !== -1) { replier.reply(UI.format("⚠️ 중복 예약", "\n이미 예약 명단에 있어요! 😊")); return; }

        var currentResId = findUserReservation(sender);
        if (currentResId) partyDB[currentResId].reservations.splice(partyDB[currentResId].reservations.indexOf(sender), 1);

        p.reservations.push(sender);
        replier.reply(UI.format("📝 예약 완료", "\n" + sender + "님, 자리가 나면 알려드릴게요!\n\n" + getPartyStatusText(targetId)));
        return;
    }

    // 6. 파티삭제
    if (msg === "파티삭제") {
        var targetId = findUserParty(sender);
        if (!targetId) { replier.reply(UI.format("⚠️ 삭제 실패", "\n참여 중인 파티가 없어요! 💦")); return; }
        delete partyDB[targetId];
        replier.reply(UI.format("🧨 파티 삭제", "\n[" + targetId + "] 파티가 해산되었습니다."));
        return;
    }

    // 7. 예약취소
    if (msg === "예약취소") {
        var targetId = findUserParty(sender);
        var resId = findUserReservation(sender);
        if (!targetId && !resId) { replier.reply(UI.format("⚠️ 취소 실패", "\n취소할 정보가 없어요! 💦")); return; }
        
        if (resId) {
            partyDB[resId].reservations.splice(partyDB[resId].reservations.indexOf(sender), 1);
            replier.reply(UI.format("💨 예약 취소", "\n예약 명단에서 제외되었습니다. 👋"));
        } else {
            var p = partyDB[targetId];
            p.members.splice(p.members.indexOf(sender), 1);
            if (p.members.length === 0) {
                delete partyDB[targetId];
                replier.reply(UI.format("🍃 파티 해산", "\n파티원이 모두 나가 방이 사라졌어요."));
            } else {
                var exitMsg = sender + "님이 파티에서 나갔습니다.\n\n" + getPartyStatusText(targetId);
                if (p.reservations.length > 0) exitMsg += "\n\n🔔 알림 : 예약 1순위 [" + p.reservations[0] + "]님!\n자리가 났어요! '참여 " + targetId + "' 입력! ٩(๑•̀ㅂ•́)و";
                replier.reply(UI.format("💨 퇴장 알림", "\n" + exitMsg));
            }
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
