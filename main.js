// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v23.0.0
 * - 주요 기능: 파티 생성, 참여(비고 포함), 이동, 예약, 예약취소, 파티삭제
 * - 변경 사항: 구분선 완전 제거, 명단 하이픈(-) 제거로 극강의 깔끔함 추구
 */

var partyDB = {};

const maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5
};

// 🍄 티모 스타일이 적용된 파티 정보 유닛
function getPartyStatusText(pId) {
    var p = partyDB[pId];
    if (!p) return "";
    
    var status = "🏆 [ " + pId + " 정찰조 ]\n";
    status += "📅 " + p.time + "  |  💬 " + p.vibe + "\n";
    status += "📊 대원 현황 : " + p.members.length + " / " + p.max + " 명\n";
    
    // 멤버 이름 옆에 비고(note)가 있으면 출력 (하이픈 기호 제거)
    for (var i = 0; i < p.members.length; i++) {
        var m = p.members[i];
        var noteStr = m.t ? " (" + m.t + ")" : "";
        status += "🍄 " + m.n + noteStr + "\n";
    }
    
    if (p.reservations.length > 0) {
        status += "⏳ 대기조 : " + p.reservations.join(", ") + "\n";
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

    // 1. 명령어 가이드
    if (msg === "명령어") {
        var help = "\n✨ [ 티모 대위의 작전 메뉴얼 ] ✨\n\n" +
                   "📝 정찰조 편성하기\n" +
                   "👉 모드 시간 분위기\n" +
                   "👉 예) 자랭 22시 즐겜\n\n" +
                   "🔍 현황 : 전체 정찰조 보기\n" +
                   "✅ 참여 [파티명] [비고]\n" +
                   "👉 예) 참여 자랭1 탑\n" +
                   "⏳ 예약 [파티명] : 대기조 등록\n" +
                   "❌ 예약취소 : 정찰조/대기조 이탈\n" +
                   "🧨 파티삭제 : 내 정찰조 해산하기\n\n" +
                   "※ 아레나(8) / 내전(10) / 그외(5)";
        replier.reply(help);
        return;
    }

    // 2. 파티 현황
    if (msg === "현황") {
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply("✨ [ 정찰조 실시간 현황 ] ✨\n\n💡 작전 구역이 텅~ 비었슴다!\n빨리 파티를 하나 편성해주십쇼! 🍄");
            return;
        }
        
        var body = "✨ [ 정찰조 실시간 현황 ] ✨\n\n";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            body += getPartyStatusText(keys[i]) + "\n";
            // 구분선 대신 빈 줄로 파티 간격 띄움
            if (i < keys.length - 1) body += "\n";
        }
        body += "\n💡 참여 [파티명] [비고] / 예약 [파티명]";
        replier.reply(body);
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
            replier.reply("🎉 정찰조 편성 완료\n\n티모 대위, 명 받들겠슴다! 🍄\n\n" + getPartyStatusText(pId));
            return;
        } else if (!msg.match(/^(내전|아레나|자랭|듀랭|칼바람)$/)) {
            replier.reply("⚠️ 통신 불량\n\n암호가 틀렸지 말입니다 💦\n👉 예시: 자랭 22시 즐겜\n띄어쓰기를 꼭 맞춰주십쇼!");
            return;
        }
    }

    // 4. 파티 참여 (비고란 처리 포함)
    if (msg.indexOf("참여 ") === 0) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        var note = parts.slice(2).join(" "); 
        
        if (!partyDB[targetId]) { replier.reply("⚠️ 합류 실패\n\n그런 정찰조는 없슴다 🥺\n작전명을 다시 확인해주십쇼!"); return; }
        var p = partyDB[targetId];
        if (p.members.length >= p.max) { replier.reply("⚠️ 인원 초과\n\n해당 정찰조는 꽉 찼슴다 💦\n'예약 " + targetId + "'을 써서 대기해주십쇼!"); return; }
        
        var isAlreadyIn = false;
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === sender) { isAlreadyIn = true; break; }
        }
        if (isAlreadyIn) { replier.reply("⚠️ 중복 참여\n\n이미 해당 부대에 소속되어 있슴다! 😊"); return; }

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
        var replyMsg = "하나 둘 셋 넷! " + sender + " 대원님 합류 완료했슴다! 💕\n\n" + getPartyStatusText(targetId);
        replier.reply("✅ 부대 합류 완료\n\n" + replyMsg);
        return;
    }

    // 5. 파티 예약
    if (msg.indexOf("예약 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("⚠️ 예약 실패\n\n예약할 정찰조가 없슴다! 🥺"); return; }
        var p = partyDB[targetId];
        
        var isMember = false;
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === sender) { isMember = true; break; }
        }
        if (isMember) { replier.reply("⚠️ 중복 예약\n\n이미 부대에 합류 중이십니다!"); return; }
        if (p.reservations.indexOf(sender) !== -1) { replier.reply("⚠️ 중복 예약\n\n이미 대기조 명단에 있슴다! 얌얌 🍄"); return; }

        var currentResId = findUserReservation(sender);
        if (currentResId) partyDB[currentResId].reservations.splice(partyDB[currentResId].reservations.indexOf(sender), 1);

        p.reservations.push(sender);
        replier.reply("📝 대기조 등록 완료\n\n" + sender + " 대원님, 자리가 나면 잽싸게 정찰 다녀오겠슴다!\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 6. 파티삭제
    if (msg === "파티삭제") {
        var targetId = findUserParty(sender);
        if (!targetId) { replier.reply("⚠️ 해산 실패\n\n소속된 정찰조가 없슴다! 💦"); return; }
        delete partyDB[targetId];
        replier.reply("🧨 작전 취소\n\n펑! 🍄 [" + targetId + "] 정찰조가 버섯과 함께 해산됐슴다!");
        return;
    }

    // 7. 예약취소
    if (msg === "예약취소") {
        var targetId = findUserParty(sender);
        var resId = findUserReservation(sender);
        if (!targetId && !resId) { replier.reply("⚠️ 취소 실패\n\n취소할 작전이 없슴다! 💦"); return; }
        
        if (resId) {
            partyDB[resId].reservations.splice(partyDB[resId].reservations.indexOf(sender), 1);
            replier.reply("💨 은신 완료\n\n대기조 명단에서 쇽! 빠져나왔슴다. 👋");
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
                replier.reply("🍃 정찰조 해산\n\n정찰대원이 모두 이탈해 부대가 해산됐슴다.");
            } else {
                var exitMsg = "호다닥! " + sender + " 대원님이 은신해버렸슴다 💦\n\n" + getPartyStatusText(targetId);
                if (p.reservations.length > 0) exitMsg += "\n\n🔔 삐용삐용! 대기 1순위 [" + p.reservations[0] + "] 대원님!\n자리가 났슴다! '참여 " + targetId + "' 입력 실시! ٩(๑•̀ㅂ•́)و";
                replier.reply("💨 대원 이탈\n\n" + exitMsg);
            }
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
