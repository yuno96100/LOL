// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v35.0.0
 * - 주요 기능: 파티 생성, 참여, 예약, 탈퇴, 삭제
 * - 변경 사항: 데이터 영구 저장(JSON DB) 기능 추가 (업데이트 시 데이터 보존)
 */

const DB_PATH = "/sdcard/msgbot/lolgtec_db.json";
var partyDB = {};

// 💾 데이터 로드 및 저장 함수
function saveDB() {
    File.write(DB_PATH, JSON.stringify(partyDB));
}

function loadDB() {
    if (File.exists(DB_PATH)) {
        try {
            partyDB = JSON.parse(File.read(DB_PATH));
        } catch (e) {
            partyDB = {};
        }
    } else {
        partyDB = {};
        saveDB();
    }
}

// 스크립트 시작 시 데이터 로드
loadDB();

const maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5, "기타게임": 5
};

// 실시간 파티 정보 유닛
function getPartyStatusText(pId) {
    var p = partyDB[pId];
    if (!p) return "";
    
    var icon = p.isTemp ? "🌟" : "🏆";
    var tag = p.isTemp ? " [임시] " : " ";
    
    var status = icon + tag + "[ " + pId + " ]\n";
    status += "📅 " + p.time + "  |  💬 " + p.vibe + "\n";
    status += "📊 현황 : " + p.members.length + " / " + p.max + " 명\n";
    
    for (var i = 0; i < p.members.length; i++) {
        var m = p.members[i];
        var noteStr = m.t ? " (" + m.t + ")" : "";
        status += "👤 " + m.n + noteStr + "\n";
    }
    
    if (p.reservations && p.reservations.length > 0) {
        status += "⏳ 예약 : " + p.reservations.join(", ") + "\n";
    }
    
    return status.replace(/\n$/, "");
}

function getUserParties(user) {
    var list = [];
    for (var id in partyDB) {
        var p = partyDB[id];
        var isHere = false;
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === user) { isHere = true; break; }
        }
        if (!isHere && p.reservations && p.reservations.indexOf(user) !== -1) {
            isHere = true;
        }
        if (isHere) list.push(id);
    }
    return list;
}

function clearUserStatus(user) {
    var changed = false;
    for (var id in partyDB) {
        var p = partyDB[id];
        var removedMain = false;
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === user) {
                p.members.splice(i, 1);
                removedMain = true;
                changed = true;
                break;
            }
        }
        if (removedMain && p.members.length === 0) {
            delete partyDB[id];
            continue;
        }
        if (partyDB[id]) {
            var resIdx = partyDB[id].reservations.indexOf(user);
            if (resIdx !== -1) {
                partyDB[id].reservations.splice(resIdx, 1);
                changed = true;
            }
        }
    }
    if (changed) saveDB();
}

function getNextPartyId(mode) {
    var i = 1;
    while (partyDB[mode + i]) { i++; }
    return mode + i;
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (room !== "ㅇㅇ") return;

    if (msg === "명령어") {
        var help = "\n✨ [ 롤 구인 시스템 메뉴얼 ] ✨\n\n" +
                   "🏆 [ 메인 기능 : 자동 정리 ]\n" +
                   "👉 모드 시간 분위기\n" +
                   "👉 참여 [파티명] [비고]\n\n" +
                   "🌟 [ 임시 기능 : 기존 유지 ]\n" +
                   "👉 임시생성 [모드] [시간] [분위기]\n" +
                   "👉 임시참여 [파티명] [비고]\n\n" +
                   "🔍 현황  |  ❌ 탈퇴  |  🧨 파티삭제";
        replier.reply(help);
        return;
    }

    if (msg === "현황") {
        loadDB(); // 최신 데이터 확인
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply("✨ [ 실시간 파티 현황 ] ✨\n\n💡 현재 모집 중인 파티가 없습니다.");
            return;
        }
        var body = "✨ [ 실시간 파티 현황 ] ✨\n\n";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            body += getPartyStatusText(keys[i]) + "\n";
            if (i < keys.length - 1) body += "--------------------------\n";
        }
        replier.reply(body);
        return;
    }

    // 파티 생성
    var isTempCreate = (msg.indexOf("임시생성 ") === 0);
    var createStr = isTempCreate ? msg.replace("임시생성 ", "") : msg;
    
    if (msg.indexOf("참여 ") === -1 && msg.indexOf("임시참여") === -1 && msg.indexOf("예약") === -1 && msg.indexOf("탈퇴") === -1 && msg.indexOf("파티삭제") === -1) {
        var createMatch = createStr.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)\s+([^\s]+)\s+(.+)$/);
        if (createMatch) {
            if (isTempCreate) {
                if (getUserParties(sender).length >= 2) {
                    replier.reply("⚠️ 생성 실패\n\n최대 2개 파티까지만 소속 가능합니다.");
                    return;
                }
            } else {
                clearUserStatus(sender);
            }

            var mode = createMatch[1]; 
            var pId = getNextPartyId(mode); 
            partyDB[pId] = {
                mode: mode, members: [{n: sender, t: ""}], reservations: [],
                max: maxMembers[mode], time: createMatch[2], vibe: createMatch[3],
                isTemp: isTempCreate
            };
            saveDB();
            replier.reply("🎉 파티 생성 완료\n\n" + getPartyStatusText(pId));
            return;
        }
    }

    // 참여
    var isTempJoin = (msg.indexOf("임시참여 ") === 0);
    if (msg.indexOf("참여 ") === 0 || isTempJoin) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        var note = parts.slice(2).join(" "); 
        
        if (!partyDB[targetId]) { replier.reply("⚠️ 존재하지 않는 파티입니다."); return; }
        if (partyDB[targetId].members.length >= partyDB[targetId].max) { replier.reply("⚠️ 인원 초과입니다."); return; }
        if (getUserParties(sender).indexOf(targetId) !== -1) { replier.reply("⚠️ 이미 참여 중입니다."); return; }

        if (isTempJoin) {
            if (getUserParties(sender).length >= 2) {
                replier.reply("⚠️ 참여 실패\n최대 2개 파티까지만 가능합니다.");
                return;
            }
        } else {
            clearUserStatus(sender);
        }

        partyDB[targetId].members.push({n: sender, t: note});
        saveDB();
        replier.reply("✅ 합류 완료!\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 삭제
    if (msg.indexOf("파티삭제") === 0) {
        var targetId = msg.split(" ")[1] || getUserParties(sender)[0];
        if (targetId && partyDB[targetId]) {
            delete partyDB[targetId];
            saveDB();
            replier.reply("🧨 [" + targetId + "] 삭제되었습니다.");
        } else {
            replier.reply("⚠️ 삭제할 파티가 없거나 이름을 지정해주세요.");
        }
        return;
    }

    // 탈퇴
    if (msg.indexOf("탈퇴") === 0 || msg.indexOf("예약취소") === 0) {
        var targetId = msg.split(" ")[1];
        var userParties = getUserParties(sender);
        if (userParties.length === 0) { replier.reply("⚠️ 소속된 파티가 없습니다."); return; }
        
        var finalId = targetId || userParties[0];
        if (userParties.length > 1 && !targetId) {
            replier.reply("⚠️ '탈퇴 [파티명]'으로 지정해주세요.\n(참여중: " + userParties.join(", ") + ")");
            return;
        }

        var p = partyDB[finalId];
        if (!p) return;

        var isRemoved = false;
        var resIdx = p.reservations.indexOf(sender);
        if (resIdx !== -1) { p.reservations.splice(resIdx, 1); isRemoved = true; }
        else {
            for (var i = 0; i < p.members.length; i++) {
                if (p.members[i].n === sender) {
                    p.members.splice(i, 1);
                    isRemoved = true;
                    break;
                }
            }
        }

        if (isRemoved) {
            if (p.members.length === 0) delete partyDB[finalId];
            saveDB();
            replier.reply("💨 [" + finalId + "] 퇴장 완료.");
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
