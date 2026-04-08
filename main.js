// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v16.0.0
 * - 주요 기능: 파티 생성, 참여, 이동, 예약, 예약취소, 파티삭제 시스템
 * - 변경 사항: 테두리 프레임(Box) 적용 및 항목/파티 간 구분선 추가 (UI 전면 고도화)
 */

// 봇이 켜져 있는 동안 파티 데이터를 기억할 저장소 (메모리 DB)
var partyDB = {};

// 모드별 최대 인원수 설정
var maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5
};

// 🎨 테두리와 구분선을 그려주는 UI 헬퍼 객체
const UI = {
    L: "━━━━━━━━━━━━━━━", // 실선 (파티간 구분 등)
    D: "┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈", // 점선 (항목간 구분 등)
    box: function(title, content) {
        return "┏" + this.L + "┓\n" +
               " " + title + "\n" +
               "┣" + this.L + "┫\n" +
               content + "\n" +
               "┗" + this.L + "┛";
    }
};

// 🌸 귀여움을 극대화한 실시간 파티 정보 카드 생성기
function getPartyStatusText(pId) {
    var p = partyDB[pId];
    if (!p) return "";
    
    var status = "🌸 [ " + pId + " ] 🌸\n";
    status += UI.D + "\n";
    status += "⏰ " + p.time + " 🎀 " + p.vibe + "\n";
    status += "🍡 인원: " + p.members.length + "/" + p.max + " 명\n";
    
    // 트리(Tree) 이모티콘 기호 사용
    for (var i = 0; i < p.members.length; i++) {
        if (i === p.members.length - 1) {
            status += " ╰ 🐥 " + p.members[i] + "\n";
        } else {
            status += " ┣ 🐥 " + p.members[i] + "\n";
        }
    }
    
    // 예약자가 있을 경우 점선 추가 후 출력
    if (p.reservations.length > 0) {
        status += UI.D + "\n";
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

    // 1. 단일화된 명령어 안내 메뉴 (테두리 적용)
    if (msg === "명령어") {
        var help = "\n🎀 파티 뚝딱 만들기\n" +
                   " [모드] [시간] [분위기]\n" +
                   " 👉 예) 자랭 22시 즐겜\n\n" +
                   UI.D + "\n" +
                   "🎀 봇 명령어 모음\n" +
                   "🐾 현황 : 지금 있는 파티들 보기!\n" +
                   "🐾 참여 [파티명] : 파티에 쏙 들어가기\n" +
                   "🐾 예약 [파티명] : 꽉 찼을때 자리 찜하기\n" +
                   "🐾 예약취소 : 내 파티/예약에서 나가기\n" +
                   "🐾 파티삭제 : 내 파티 완전히 해산하기\n\n" +
                   UI.D + "\n" +
                   "※ 지원: 내전, 아레나(8명), 자랭, 듀랭, 칼바람\n";
        replier.reply(UI.box("✨ 롤 구인 시스템 메뉴얼 ✨", help));
        return;
    }

    // 2. 파티 현황 조회 (테두리 및 파티간 구분선 적용)
    if (msg === "현황") {
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply(UI.box("✨ 실시간 파티 현황 ✨", "\n텅~ 비었어요! 💦\n'자랭 22시 즐겜' 쳐보세요! (๑>ᴗ<๑)\n"));
            return;
        }
        
        var body = "\n";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            body += getPartyStatusText(keys[i]) + "\n";
            // 파티와 파티 사이에 굵은 실선 추가
            if (i < keys.length - 1) {
                body += UI.L + "\n";
            }
        }
        body += UI.D + "\n💡 명령어: 참여 [파티명] / 예약 [파티명]\n";
        replier.reply(UI.box("✨ 실시간 파티 현황 ✨", body));
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
            replier.reply(UI.box("🎉 파티 생성 완료!", "\n짜잔! 파티가 만들어졌어요! ٩(๑❛ᴗ❛๑)۶\n\n" + getPartyStatusText(pId) + "\n"));
            return;
        } else if (!msg.match(/^(내전|아레나|자랭|듀랭|칼바람)$/)) {
            replier.reply(UI.box("⚠️ 입력 오류", "\n앗! 형식이 조금 이상해요 💦\n👉 예시: " + modeMatch[1] + " 22시 즐겜\n"));
            return;
        }
    }

    // 4. 파티 참여 및 이동
    if (msg.indexOf("참여 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply(UI.box("⚠️ 참여 실패", "\n그런 파티는 없어요 🥺\n이름을 다시 확인해주세요!\n")); return; }
        var p = partyDB[targetId];
        
        if (p.members.length >= p.max) { 
            replier.reply(UI.box("⚠️ 참여 실패", "\n앗! [" + targetId + "] 파티는 꽉 찼어요 💦\n💡 '예약 " + targetId + "'를 쳐보세요!\n")); 
            return; 
        }
        if (p.members.indexOf(sender) !== -1) { replier.reply(UI.box("⚠️ 참여 실패", "\n이미 파티에 들어가 계신걸요! (❁´◡`❁)\n")); return; }

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
        var replyMsg = movePrefix + "환영해요! " + sender + "님이 쏙! 들어왔어요 💕\n\n" + getPartyStatusText(targetId);
        if (p.members.length === p.max) replyMsg += "\n" + UI.D + "\n🎉 와아! 인원이 꽉 찼어요! 출발해볼까요?";
        replier.reply(UI.box("✅ 파티 참여 완료!", "\n" + replyMsg + "\n"));
        return;
    }

    // 5. 파티 개별 예약 등록
    if (msg.indexOf("예약 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply(UI.box("⚠️ 예약 실패", "\n예약할 파티가 없어요 🥺\n")); return; }
        var p = partyDB[targetId];
        if (p.members.indexOf(sender) !== -1) { replier.reply(UI.box("⚠️ 예약 실패", "\n이미 방 안에 계신걸요! (❁´◡`❁)\n")); return; }
        if (p.reservations.indexOf(sender) !== -1) { replier.reply(UI.box("⚠️ 예약 실패", "\n이미 찜하셨어요! 얌얌 🍡\n")); return; }

        var currentResId = findUserReservation(sender);
        if (currentResId) partyDB[currentResId].reservations.splice(partyDB[currentResId].reservations.indexOf(sender), 1);

        p.reservations.push(sender);
        replier.reply(UI.box("🐾 예약 완료!", "\n찜콩 완료! " + sender + "님 기다려주세요~\n(순번: " + p.reservations.length + "번)\n\n" + getPartyStatusText(targetId) + "\n"));
        return;
    }

    // 6. 파티삭제 (파티 완전 해산)
    if (msg === "파티삭제") {
        var targetId = findUserParty(sender);
        if (!targetId) { replier.reply(UI.box("⚠️ 삭제 실패", "\n지울 파티가 없는걸요? 🥺\n")); return; }
        delete partyDB[targetId];
        replier.reply(UI.box("🧨 파티 해산", "\n펑! [" + targetId + "] 파티가 해산되었어요.\n다음에 또 만나요! 👋\n"));
        return;
    }

    // 7. 예약취소 (파티 퇴장 또는 예약 취소)
    if (msg === "예약취소") {
        var targetId = findUserParty(sender);
        var resId = findUserReservation(sender);
        
        if (!targetId && !resId) { replier.reply(UI.box("⚠️ 취소 실패", "\n참여나 예약 중인 파티가 없어요! 💦\n")); return; }
        
        if (resId) {
            partyDB[resId].reservations.splice(partyDB[resId].reservations.indexOf(sender), 1);
            replier.reply(UI.box("💨 예약 취소", "\n예약에서 조용히 빠져나왔어요! 👋✨\n\n" + getPartyStatusText(resId) + "\n"));
        } else {
            var p = partyDB[targetId];
            p.members.splice(p.members.indexOf(sender), 1);
            if (p.members.length === 0) {
                delete partyDB[targetId];
                replier.reply(UI.box("🍃 파티 해산", "\n마지막 분이 나가셔서 [" + targetId + "]\n파티가 조용히 사라졌어요 🍃\n"));
            } else {
                var exitMsg = "호다닥! " + sender + "님이 파티에서 나가셨어요 💦\n\n" + getPartyStatusText(targetId);
                if (p.reservations.length > 0) {
                    exitMsg += "\n" + UI.D + "\n🔔 삐용삐용! 예약 1순위 [" + p.reservations[0] + "]님!\n얼른 '참여 " + targetId + "'를 쳐주세요! (๑•̀ㅂ•́)و✧";
                }
                replier.reply(UI.box("💨 파티 퇴장", "\n" + exitMsg + "\n"));
            }
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
