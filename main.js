// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v14.0.0
 * - 주요 기능: 파티 생성, 참여, 이동, 취소, 쫑, 예약 시스템
 * - 변경 사항: 유저 피드백 반영 (UI/UX 텍스트 및 이모티콘 아기자기하고 귀엽게 전면 개편)
 */

// 봇이 켜져 있는 동안 파티 데이터를 기억할 저장소 (메모리 DB)
var partyDB = {};

// 모드별 최대 인원수 설정
var maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5
};

// 🌸 귀여움을 극대화한 실시간 파티 정보 카드 생성기
function getPartyStatusText(pId) {
    var p = partyDB[pId];
    if (!p) return "";
    
    // 둥글둥글하고 귀여운 헤더 디자인
    var status = "\n\n🌸 [ " + pId + " ] 🌸\n";
    status += "⏰ " + p.time + " 🎀 " + p.vibe + "\n";
    status += "🍡 인원: " + p.members.length + "/" + p.max + " 명\n";
    
    // 병아리 이모티콘과 부드러운 선 사용
    for (var i = 0; i < p.members.length; i++) {
        if (i === p.members.length - 1) {
            status += " ╰ 🐥 " + p.members[i] + "\n";
        } else {
            status += " ┣ 🐥 " + p.members[i] + "\n";
        }
    }
    
    // 예약자가 있을 경우
    if (p.reservations.length > 0) {
        status += "🐾 찜콩: " + p.reservations.join(", ") + "\n";
    }
    return status.replace(/\n$/, ""); // 마지막 줄바꿈 제거
}

// 유저가 속한 파티 ID를 찾는 헬퍼 함수
function findUserParty(user) {
    for (var id in partyDB) {
        if (partyDB[id].members.indexOf(user) !== -1) return id;
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

    // 1. 귀여운 통합 메뉴얼
    if (msg === "도움말" || msg === "명령어" || msg === "양식") {
        var help = "✨ [ 롤 구인 시스템 이용 방법 ] ✨\n\n" +
                   "🎀 파티 뚝딱 만들기\n" +
                   " [모드] [시간] [분위기]\n" +
                   " 👉 예) 자랭 22시 즐겜\n\n" +
                   "🎀 봇 명령어 모음\n" +
                   "🐾 현황 : 지금 있는 파티들 보기!\n" +
                   "🐾 참여 [파티명] : 파티에 쏙 들어가기\n" +
                   "🐾 예약 [파티명] : 꽉 찼을때 자리 찜하기\n" +
                   "🐾 취소 (또는 탈퇴) : 파티/예약 나가기\n" +
                   "🐾 쫑 (또는 삭제) : 내 파티 해산하기\n\n" +
                   "※ 지원: 내전, 아레나(8명), 자랭, 듀랭, 칼바람";
        replier.reply(help);
        return;
    }

    // 2. 전체 파티 현황 조회
    if (msg === "파티" || msg === "현황") {
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply("텅~ 비었어요! 💦\n지금 바로 '자랭 22시 즐겜'을 쳐서 첫 파티를 열어보세요! (๑>ᴗ<๑)");
            return;
        }
        
        var res = "✨ [ 실시간 파티 현황 ] ✨";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            res += getPartyStatusText(keys[i]);
        }
        res += "\n\n💡 명령어: 참여 [파티명] / 예약 [파티명]";
        replier.reply(res);
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
            replier.reply("짜잔! 파티가 예쁘게 만들어졌어요! ٩(๑❛ᴗ❛๑)۶" + getPartyStatusText(pId));
            return;
        } else if (!msg.match(/^(내전|아레나|자랭|듀랭|칼바람)$/)) {
            replier.reply("앗! 형식이 조금 이상해요 💦\n👉 예시: " + modeMatch[1] + " 22시 즐겜");
            return;
        }
    }

    // 4. 파티 참여 및 이동
    if (msg.indexOf("참여 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("그런 파티는 없어요 🥺 이름을 다시 확인해주세요!"); return; }
        var p = partyDB[targetId];
        
        if (p.members.length >= p.max) { 
            replier.reply("앗! [" + targetId + "] 파티는 꽉 찼어요 💦\n💡 '예약 " + targetId + "'를 쳐서 자리를 찜해보세요!"); 
            return; 
        }
        if (p.members.indexOf(sender) !== -1) { replier.reply("이미 파티에 들어가 계신걸요! (❁´◡`❁)"); return; }

        var currentPartyId = findUserParty(sender);
        var currentResId = findUserReservation(sender);
        var movePrefix = "";
        
        if (currentPartyId) {
            var cp = partyDB[currentPartyId];
            cp.members.splice(cp.members.indexOf(sender), 1);
            if (cp.members.length === 0) delete partyDB[currentPartyId];
            movePrefix = "슝~ 기존 파티에서 넘어왔어요! 🚀\n";
        }
        if (currentResId) partyDB[currentResId].reservations.splice(partyDB[currentResId].reservations.indexOf(sender), 1);
        
        p.members.push(sender);
        var replyMsg = movePrefix + "환영해요! " + sender + "님이 쏙! 들어왔어요 💕" + getPartyStatusText(targetId);
        if (p.members.length === p.max) replyMsg += "\n\n🎉 와아! 인원이 꽉 찼어요! 신나게 출발해볼까요?";
        replier.reply(replyMsg);
        return;
    }

    // 5. 파티 개별 예약 등록
    if (msg.indexOf("예약 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("예약할 파티가 없어요 🥺"); return; }
        var p = partyDB[targetId];
        if (p.members.indexOf(sender) !== -1) { replier.reply("이미 방 안에 계신걸요! (❁´◡`❁)"); return; }
        if (p.reservations.indexOf(sender) !== -1) { replier.reply("이미 찜하셨어요! 조금만 기다려주세요 얌얌 🍡"); return; }

        var currentResId = findUserReservation(sender);
        if (currentResId) partyDB[currentResId].reservations.splice(partyDB[currentResId].reservations.indexOf(sender), 1);

        p.reservations.push(sender);
        replier.reply("찜콩 완료! 🐾 " + sender + "님 조금만 기다려주세요~ (대기 " + p.reservations.length + "번)" + getPartyStatusText(targetId));
        return;
    }

    // 6. 삭제/쫑
    if (msg === "삭제" || msg === "쫑") {
        var targetId = findUserParty(sender);
        if (!targetId) { replier.reply("지울 파티가 없는걸요? 🥺"); return; }
        delete partyDB[targetId];
        replier.reply("펑! 🧨 [" + targetId + "] 파티가 해산되었어요. 다음에 또 만나요!");
        return;
    }

    // 7. 탈퇴 (또는 취소)
    if (msg === "탈퇴" || msg === "취소") {
        var targetId = findUserParty(sender);
        var resId = findUserReservation(sender);
        
        if (!targetId && !resId) { replier.reply("취소할 파티나 예약이 없어요! 💦"); return; }
        
        if (resId) {
            partyDB[resId].reservations.splice(partyDB[resId].reservations.indexOf(sender), 1);
            replier.reply("예약이 취소되었어요! 다음에 또 만나요 👋✨" + getPartyStatusText(resId));
        } else {
            var p = partyDB[targetId];
            p.members.splice(p.members.indexOf(sender), 1);
            if (p.members.length === 0) {
                delete partyDB[targetId];
                replier.reply("마지막 분이 나가셔서 [" + targetId + "] 파티가 조용히 사라졌어요 🍃");
            } else {
                var exitMsg = "호다닥! " + sender + "님이 나가셨어요 ㅠ_ㅠ 💦" + getPartyStatusText(targetId);
                if (p.reservations.length > 0) {
                    exitMsg += "\n\n🔔 삐용삐용! 예약 1순위 [" + p.reservations[0] + "]님! 자리가 났어요!\n얼른 '참여 " + targetId + "'를 쳐주세요! (๑•̀ㅂ•́)و✧";
                }
                replier.reply(exitMsg);
            }
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)                   "🔹 참여 [파티명] : 파티 합류 (이동 시 자동 탈퇴)\n" +
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
