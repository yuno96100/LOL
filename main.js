// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v66.0.0 (지원 모드 '솔랭' 추가)
 * - 변경 사항: 파티 생성 및 수정 지원 모드에 '솔랭' 추가 (최대 인원 1명)
 */

var partyDB_live = {};
var partyDB_test = {};
var DB_PATH_LIVE = "sdcard/msgbot/lolgtec_db.json";       
var DB_PATH_TEST = "sdcard/msgbot/lolgtec_test_db.json";  

try {
    if (File.exists(DB_PATH_LIVE)) {
        var dbData = File.read(DB_PATH_LIVE);
        if (dbData) partyDB_live = JSON.parse(dbData);
    }
} catch (e) { partyDB_live = {}; }

try {
    if (File.exists(DB_PATH_TEST)) {
        var testData = File.read(DB_PATH_TEST);
        if (testData) partyDB_test = JSON.parse(testData);
    }
} catch (e) { partyDB_test = {}; }

// 💡 솔랭(1인) 최대 인원수 추가
const maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "솔랭": 1, "칼바람": 5
};

function isNameMatch(name1, name2) {
    if (!name1 || !name2) return false;
    if (name1 === name2) return true;
    
    var regex = /^\d{2}\s*(?:[남여]\s*)?/;
    var core1 = name1.replace(regex, "").trim().toLowerCase();
    var core2 = name2.replace(regex, "").trim().toLowerCase();
    
    if (core1.length > 0 && core1 === core2) return true;
    if (core1.length >= 2 && core2.indexOf(core1) !== -1) return true;
    if (core2.length >= 2 && core1.indexOf(core2) !== -1) return true;
    
    return false;
}

function getPartyStatusText(pId, currentDB) {
    var p = currentDB[pId];
    if (!p) return "";
    
    var icon = p.isTemp ? "🌟" : "🏆";
    var tag = p.isTemp ? " [임시] " : " ";
    
    var status = icon + tag + "[ " + pId + " ]\n";
    status += "📅 " + p.time + "  |  🏅 구간: " + p.tier + "  |  💬 " + p.vibe + "\n";
    status += "📊 현황 : " + p.members.length + " / " + p.max + " 명\n";
    
    for (var i = 0; i < p.members.length; i++) {
        var m = p.members[i];
        var noteStr = m.t ? " (" + m.t + ")" : "";
        var mIcon = m.isTemp ? "🌟" : "👤"; 
        status += mIcon + " " + m.n + noteStr + "\n";
    }
    
    if (p.reservations && p.reservations.length > 0) {
        status += "⏳ 예약 : " + p.reservations.join(", ") + "\n";
    }
    
    return status.replace(/\n$/, "");
}

function getUserParties(user, currentDB) {
    var list = [];
    for (var id in currentDB) {
        var p = currentDB[id];
        var isHere = false;
        for (var i = 0; i < p.members.length; i++) {
            if (isNameMatch(p.members[i].n, user)) { isHere = true; break; }
        }
        if (!isHere && p.reservations) {
            for (var k = 0; k < p.reservations.length; k++) {
                if (isNameMatch(p.reservations[k], user)) { isHere = true; break; }
            }
        }
        if (isHere) list.push(id);
    }
    return list;
}

function clearUserStatus(user, currentDB, saveFunc) {
    var isChanged = false;
    for (var id in currentDB) {
        var p = currentDB[id];
        var removedMain = false;
        for (var i = 0; i < p.members.length; i++) {
            if (isNameMatch(p.members[i].n, user)) {
                p.members.splice(i, 1);
                removedMain = true;
                isChanged = true;
                break;
            }
        }
        if (removedMain && p.members.length === 0) {
            delete currentDB[id];
            continue;
        }
        if (currentDB[id] && currentDB[id].reservations) {
            for (var k = 0; k < currentDB[id].reservations.length; k++) {
                if (isNameMatch(currentDB[id].reservations[k], user)) {
                    currentDB[id].reservations.splice(k, 1);
                    isChanged = true;
                    break;
                }
            }
        }
    }
    if (isChanged) saveFunc(); 
}

function getNextPartyId(mode, currentDB) {
    var i = 1;
    while (currentDB[mode + i]) { i++; }
    return mode + i;
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (room !== "ㅇㅇ" && room !== "LOL지텍 구인방") return;

    var isTestRoom = (room === "ㅇㅇ");
    var currentDB = isTestRoom ? partyDB_test : partyDB_live;

    var saveDB = function() {
        var path = isTestRoom ? DB_PATH_TEST : DB_PATH_LIVE;
        try {
            var folder = new java.io.File("sdcard/msgbot");
            if (!folder.exists()) folder.mkdirs(); 
            File.write(path, JSON.stringify(currentDB));
        } catch(e){}
    };

    if (msg === "명령어") {
        var help = "✨ [ 구인구직 시스템 매뉴얼 ] ✨\n\n" +
                   "🟢 [ 기본 필수 명령어 ] (이것만 알아도 충분해요!)\n" +
                   "👉 생성 : [모드] [시간] [티어(선택)] [분위기(선택)]\n" +
                   "   (예: 자랭 22시 골드 빡겜)\n" +
                   "👉 참여 : 참여 [파티명] / 예약 [파티명]\n" +
                   "👉 메모 : 메모 [파티명] [할말] (내 포지션 등록)\n" +
                   "👉 현황 : 현황 (모집 중인 파티 전체 보기)\n" +
                   "👉 탈퇴 : 탈퇴 [파티명]\n\n" +
                   "🟡 [ 특수 파티 기능 ] (타 게임 / 투잡 뛰기)\n" +
                   "👉 타게임 : 기타 [게임명] [최대인원] [시간] [분위기]\n" +
                   "   (예: 기타 배그 4 22시 즐겜)\n" +
                   "👉 임시방 : 임시생성 [모드] [시간] ...\n" +
                   "👉 임시참여 : 임시참여 [파티명]\n\n" +
                   "🔴 [ 관리 및 예외 처리 ] (방장 / 대리용)\n" +
                   "👉 수정 : 수정 [파티명] [시간] [티어] [분위기] (방장 전용)\n" +
                   "👉 삭제 : 파티삭제 [파티명] (파티 완전 해산)\n" +
                   "👉 대리 : 강제참여 [파티명] @[이름] @[이름]...\n" +
                   "👉 강퇴 : 강제탈퇴 [파티명] @[이름] @[이름]...\n\n" +
                   "💡 강제명령어 시 여러 명을 멘션하여 한 번에 등록/제거가 가능합니다.\n\n" +
                   "⚠️ 파티가 끝났거나 폭파될 땐 꼭 '파티삭제 [파티명]'으로 방을 정리해 주세요!\n" +
                   "🚫 동시 입력 시 처리가 누락될 수 있으니 앞선 메시지 처리 후 입력을 권장합니다.\n\n" +
                   "※ 지원 모드 : 내전, 아레나, 자랭, 듀랭, 솔랭, 칼바람, 기타";
        replier.reply(help);
        return;
    }

    if (msg === "현황") {
        var keys = Object.keys(currentDB);
        if (keys.length === 0) {
            replier.reply("📋 [ 실시간 파티 현황 ] 📋\n\n💡 현재 모집 중인 파티가 없습니다.\n\n새로운 파티를 생성해 주세요.");
            return;
        }
        var body = "📋 [ 실시간 파티 현황 ] 📋\n\n";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            body += getPartyStatusText(keys[i], currentDB) + "\n";
            if (i < keys.length - 1) body += "--------------------------\n";
        }
        body += "\n💡 '참여 [파티명]' 후 '메모 [파티명] [할말]'로 포지션을 등록해 보세요!";
        replier.reply(body);
        return;
    }

    var isTempCreate = (msg.indexOf("임시생성 ") === 0);
    var createStr = isTempCreate ? msg.replace("임시생성 ", "").trim() : msg.trim();
    
    if (msg.indexOf("참여 ") === -1 && msg.indexOf("임시참여") === -1 && msg.indexOf("예약") === -1 && msg.indexOf("탈퇴") === -1 && msg.indexOf("파티삭제") === -1 && msg.indexOf("수정 ") === -1 && msg.indexOf("메모 ") === -1 && msg.indexOf("강제참여 ") === -1 && msg.indexOf("강제탈퇴 ") === -1) {
        var validModes = ["내전", "아레나", "자랭", "듀랭", "솔랭", "칼바람"];
        var words = createStr.split(/\s+/);
        var mode = words[0];
        
        if (validModes.indexOf(mode) !== -1 || mode === "기타") {
            if (isTempCreate) {
                var userParties = getUserParties(sender, currentDB);
                if (userParties.length >= 2) {
                    replier.reply("⚠️ 생성 실패\n\n최대 2개의 파티에만 동시 소속될 수 있습니다.");
                    return;
                }
            } else {
                clearUserStatus(sender, currentDB, saveDB);
            }

            var pId, pTime, pTier, pVibe, pMax, actualMode;

            if (mode === "기타") {
                if (words.length < 4) {
                    replier.reply("⚠️ 입력 오류: 필수 항목이 누락되었습니다.\n👉 예시: 기타 배그 4 22시 즐겜");
                    return;
                }
                actualMode = words[1];
                pMax = parseInt(words[2]);
                if (isNaN(pMax) || pMax <= 0) {
                    replier.reply("⚠️ 입력 오류: 인원수는 숫자로 입력해 주세요.\n👉 예시: 기타 배그 4 22시");
                    return;
                }
                pTime = words[3];
                pTier = "무관";
                pVibe = words[4] || "즐겜";
                pId = getNextPartyId(actualMode, currentDB);
            } else {
                if (words.length < 2) {
                    replier.reply("⚠️ 입력 오류: [시간] 항목이 누락되었습니다.\n👉 예시: " + mode + " 22시");
                    return;
                }
                actualMode = mode;
                pMax = maxMembers[mode];
                pTime = words[1];
                var defaultTier = (mode === "칼바람" || mode === "아레나" || mode === "내전" || mode === "솔랭") ? "무관" : "미정";
                pTier = words[2] || defaultTier;
                pVibe = words[3] || "즐겜";
                pId = getNextPartyId(actualMode, currentDB);
            }
            
            currentDB[pId] = {
                mode: actualMode, 
                members: [{n: sender, t: "", isTemp: isTempCreate}], 
                reservations: [],
                max: pMax, 
                time: pTime, 
                tier: pTier, 
                vibe: pVibe,
                isTemp: isTempCreate 
            };
            
            saveDB(); 
            var prefix = isTempCreate ? "✅ 임시 파티 생성 완료" : "✅ 파티 생성 완료";
            replier.reply(prefix + "\n\n파티가 생성되었습니다.\n\n" + getPartyStatusText(pId, currentDB) + "\n\n💡 '메모 " + pId + " [할말]' 명령어로 내 포지션을 추가해 보세요!");
            return;
            
        } else if (isTempCreate) {
            replier.reply("⚠️ 지원하지 않는 모드입니다.\n(지원: 내전, 아레나, 자랭, 듀랭, 솔랭, 칼바람, 기타)");
            return;
        }
    }

    var isTempJoin = (msg.indexOf("임시참여 ") === 0);
    if (msg.indexOf("참여 ") === 0 || isTempJoin) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        
        if (!currentDB[targetId]) { replier.reply("⚠️ 참여 실패: 해당 파티를 찾을 수 없습니다."); return; }
        var p = currentDB[targetId];
        if (p.members.length >= p.max) { replier.reply("⚠️ 인원 초과: 정원이 마감되었습니다. '예약 " + targetId + "'을 이용해 주세요."); return; }
        
        var userParties = getUserParties(sender, currentDB);
        if (userParties.indexOf(targetId) !== -1) { replier.reply("⚠️ 중복 참여: 이미 파티에 소속되어 있습니다."); return; }

        if (isTempJoin) {
            if (userParties.length >= 2) {
                replier.reply("⚠️ 참여 실패: 최대 2개의 파티에만 동시 소속이 가능합니다.");
                return;
            }
        } else {
            clearUserStatus(sender, currentDB, saveDB);
        }

        p.members.push({n: sender, t: "", isTemp: isTempJoin});
        saveDB(); 
        var prefix = isTempJoin ? "✅ 임시 파티 참여 완료" : "✅ 파티 참여 완료";
        replier.reply(prefix + "\n\n" + sender + "님이 파티에 참여했습니다.\n\n" + getPartyStatusText(targetId, currentDB) + "\n\n💡 '메모 " + targetId + " [할말]' 명령어로 포지션을 등록해 주세요!");
        return;
    }

    var isTempRes = (msg.indexOf("임시예약 ") === 0);
    if (msg.indexOf("예약 ") === 0 || isTempRes) {
        var targetId = msg.split(" ")[1];
        if (!currentDB[targetId]) { replier.reply("⚠️ 예약 실패: 해당 파티를 찾을 수 없습니다."); return; }
        var userParties = getUserParties(sender, currentDB);
        if (userParties.indexOf(targetId) !== -1) { replier.reply("⚠️ 중복 예약: 이미 해당 파티에 소속되어 있습니다."); return; }
        
        if (isTempRes) {
            if (userParties.length >= 2) {
                replier.reply("⚠️ 예약 실패: 최대 2개의 파티에만 동시 소속이 가능합니다.");
                return;
            }
        } else {
            clearUserStatus(sender, currentDB, saveDB);
        }

        currentDB[targetId].reservations.push(sender);
        saveDB(); 
        var prefix = isTempRes ? "✅ 임시 파티 예약 완료" : "✅ 파티 예약 완료";
        replier.reply(prefix + "\n\n" + sender + "님이 대기 명단에 등록되었습니다.\n\n" + getPartyStatusText(targetId, currentDB));
        return;
    }

    if (msg.indexOf("파티삭제") === 0) {
        var targetId = msg.split(" ")[1];
        var userParties = getUserParties(sender, currentDB);
        
        if (targetId) {
            if (currentDB[targetId]) {
                delete currentDB[targetId];
                saveDB(); 
                replier.reply("🗑️ 파티 삭제 완료\n\n[" + targetId + "] 파티가 해산되었습니다.");
            } else { 
                replier.reply("⚠️ 삭제 실패: 존재하지 않는 파티입니다."); 
            }
        } else {
            if (userParties.length === 0) {
                replier.reply("⚠️ 삭제 실패: 현재 소속된 파티가 없습니다.");
            } else if (userParties.length === 1) {
                delete currentDB[userParties[0]];
                saveDB(); 
                replier.reply("🗑️ 파티 삭제 완료\n\n[" + userParties[0] + "] 파티가 해산되었습니다.");
            } else { 
                replier.reply("⚠️ 파티 지정 필요: 여러 파티에 소속되어 있습니다. '파티삭제 [파티명]'으로 지정해 주세요."); 
            }
        }
        return;
    }

    if (msg.indexOf("탈퇴") === 0 || msg.indexOf("예약취소") === 0) {
        var targetId = msg.split(" ")[1];
        var userParties = getUserParties(sender, currentDB);
        
        if (userParties.length === 0) {
            replier.reply("⚠️ 탈퇴 실패: 현재 참여 중인 파티나 예약 내역이 없습니다.");
            return;
        }

        if (!targetId && userParties.length > 1) {
            replier.reply("⚠️ 파티 지정 필요\n\n'탈퇴 [파티명]'으로 탈퇴할 파티를 명시해 주세요.\n(참여 중: " + userParties.join(", ") + ")");
            return;
        }

        var finalId = targetId || userParties[0];
        var p = currentDB[finalId];
        if (!p) { replier.reply("⚠️ 탈퇴 실패: 해당 파티를 찾을 수 없습니다."); return; }

        var isRemoved = false;
        var resIdx = -1;
        for (var k = 0; k < p.reservations.length; k++) {
            if (isNameMatch(p.reservations[k], sender)) { resIdx = k; break; }
        }
        
        if (resIdx !== -1) {
            p.reservations.splice(resIdx, 1);
            isRemoved = true;
        } else {
            for (var i = 0; i < p.members.length; i++) {
                if (isNameMatch(p.members[i].n, sender)) {
                    p.members.splice(i, 1);
                    isRemoved = true;
                    break;
                }
            }
        }

        if (!isRemoved) {
            replier.reply("⚠️ 탈퇴 실패: [" + finalId + "] 파티에 소속되어 있지 않습니다.");
            return;
        }

        if (p.members.length === 0) {
            delete currentDB[finalId];
            saveDB();
            replier.reply("🗑️ 파티 자동 해산\n\n마지막 멤버의 이탈로 [" + finalId + "] 파티가 해산되었습니다.");
        } else {
            saveDB();
            if (resIdx !== -1) {
                replier.reply("❌ 예약 취소 완료\n\n" + sender + "님이 [" + finalId + "] 파티의 대기 명단에서 제외되었습니다.");
            } else {
                var exitMsg = "❌ 파티 퇴장 완료\n\n" + sender + "님이 파티에서 퇴장했습니다.\n\n" + getPartyStatusText(finalId, currentDB);
                if (p.reservations && p.reservations.length > 0) exitMsg += "\n\n🔔 알림: 대기 1순위 [" + p.reservations[0] + "]님! 자리가 발생했습니다. '참여 " + finalId + "'를 입력하여 합류해 주세요.";
                replier.reply(exitMsg);
            }
        }
        return;
    }

    if (msg.indexOf("수정 ") === 0) {
        var parts = msg.split(/\s+/);
        var targetId = parts[1];

        if (!currentDB[targetId]) { 
            replier.reply("⚠️ 수정 실패: 해당 파티를 찾을 수 없습니다."); 
            return; 
        }
        var p = currentDB[targetId];

        if (!isNameMatch(p.members[0].n, sender)) { 
            replier.reply("⚠️ 권한 없음: 파티 수정은 파티를 생성한 방장만 가능합니다."); 
            return; 
        }

        if (parts.length < 3) {
            replier.reply("⚠️ 입력 오류: 수정할 시간을 입력해 주세요.\n👉 예시: 수정 " + targetId + " 23시 빡겜");
            return;
        }

        p.time = parts[2];
        var validModesArray = ["내전", "아레나", "자랭", "듀랭", "솔랭", "칼바람"];
        var isCustomGame = (validModesArray.indexOf(p.mode) === -1);
        
        var defaultTier = (isCustomGame || p.mode === "칼바람" || p.mode === "아레나" || p.mode === "내전" || p.mode === "솔랭") ? "무관" : "미정";
        p.tier = parts[3] || defaultTier;
        p.vibe = parts[4] || "즐겜";

        saveDB();
        replier.reply("🔄 파티 수정 완료\n\n파티 정보가 성공적으로 변경되었습니다.\n\n" + getPartyStatusText(targetId, currentDB));
        return;
    }

    if (msg.indexOf("메모 ") === 0) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        var note = parts.slice(2).join(" "); 

        var p = currentDB[targetId];
        if (!p) { 
            replier.reply("⚠️ 메모 갱신 실패: 해당 파티를 찾을 수 없습니다."); 
            return; 
        }

        var isMember = false;
        for (var i = 0; i < p.members.length; i++) {
            if (isNameMatch(p.members[i].n, sender)) {
                p.members[i].t = note;
                isMember = true;
                break;
            }
        }

        if (!isMember) {
            replier.reply("⚠️ 메모 갱신 실패: [" + targetId + "] 파티에 소속된 대원만 메모를 수정할 수 있습니다.");
            return;
        }

        saveDB();
        replier.reply("📝 메모 갱신 완료\n\n" + sender + "님의 파티 메모가 업데이트되었습니다.\n\n" + getPartyStatusText(targetId, currentDB));
        return;
    }

    if (msg.indexOf("강제참여 ") === 0) {
        var parts = msg.split(/\s+/);
        if (parts.length < 3) {
            replier.reply("⚠️ 입력 오류: 파티명과 멘션할 이름을 입력해 주세요.\n👉 예시: 강제참여 자랭1 @멈무 @여름");
            return;
        }
        var targetId = parts[1];
        
        if (!currentDB[targetId]) { replier.reply("⚠️ 강제참여 실패: 해당 파티를 찾을 수 없습니다."); return; }
        var p = currentDB[targetId];

        var rawNamesStr = msg.replace("강제참여 " + targetId, "").trim();
        var nameList = [];
        
        if (rawNamesStr.indexOf("@") !== -1) {
            var splitNames = rawNamesStr.split("@");
            for (var i = 1; i < splitNames.length; i++) {
                var cleanedName = splitNames[i].replace(/[\u200B-\u200D\uFEFF\u2068-\u2069]/g, "").trim();
                if (cleanedName) nameList.push(cleanedName);
            }
        } else {
            var cleanedName = rawNamesStr.replace(/[\u200B-\u200D\uFEFF\u2068-\u2069]/g, "").trim();
            if (cleanedName) nameList.push(cleanedName);
        }

        var addedNames = [];
        var errorMsgs = [];

        for (var n = 0; n < nameList.length; n++) {
            var targetName = nameList[n];

            if (p.members.length >= p.max) {
                errorMsgs.push("[" + targetName + "] 정원 초과");
                continue;
            }

            var isDuplicate = false;
            for (var j = 0; j < p.members.length; j++) {
                if (isNameMatch(p.members[j].n, targetName)) { isDuplicate = true; break; }
            }
            if (isDuplicate) {
                errorMsgs.push("[" + targetName + "] 중복 참여");
                continue;
            }

            p.members.push({n: targetName, t: "", isTemp: p.isTemp, isForced: true});
            addedNames.push(targetName);
        }

        if (addedNames.length > 0) saveDB();

        var replyMsg = "";
        if (addedNames.length > 0) {
            replyMsg += "✅ 강제 참여 완료\n\n[" + addedNames.join(", ") + "]님이 파티에 추가되었습니다.\n\n" + getPartyStatusText(targetId, currentDB);
        }
        if (errorMsgs.length > 0) {
            if (replyMsg) replyMsg += "\n\n";
            replyMsg += "⚠️ 일부 실패 내역: " + errorMsgs.join(", ");
        }
        if (!replyMsg) replyMsg = "⚠️ 명단에 추가된 인원이 없습니다.";

        replier.reply(replyMsg);
        return;
    }

    if (msg.indexOf("강제탈퇴 ") === 0) {
        var parts = msg.split(/\s+/);
        if (parts.length < 3) {
            replier.reply("⚠️ 입력 오류: 파티명과 멘션할 이름을 입력해 주세요.\n👉 예시: 강제탈퇴 자랭1 @멈무 @여름");
            return;
        }
        var targetId = parts[1];

        if (!currentDB[targetId]) { replier.reply("⚠️ 강제탈퇴 실패: 해당 파티를 찾을 수 없습니다."); return; }
        var p = currentDB[targetId];

        var rawNamesStr = msg.replace("강제탈퇴 " + targetId, "").trim();
        var nameList = [];
        
        if (rawNamesStr.indexOf("@") !== -1) {
            var splitNames = rawNamesStr.split("@");
            for (var i = 1; i < splitNames.length; i++) {
                var cleanedName = splitNames[i].replace(/[\u200B-\u200D\uFEFF\u2068-\u2069]/g, "").trim();
                if (cleanedName) nameList.push(cleanedName);
            }
        } else {
            var cleanedName = rawNamesStr.replace(/[\u200B-\u200D\uFEFF\u2068-\u2069]/g, "").trim();
            if (cleanedName) nameList.push(cleanedName);
        }

        var removedNames = [];
        var notFoundNames = [];

        for (var n = 0; n < nameList.length; n++) {
            var targetName = nameList[n];
            var isRemoved = false;
            var resIdx = -1;
            
            for (var k = 0; k < p.reservations.length; k++) {
                if (isNameMatch(p.reservations[k], targetName)) { resIdx = k; break; }
            }
            
            if (resIdx !== -1) {
                var actualName = p.reservations[resIdx];
                p.reservations.splice(resIdx, 1);
                isRemoved = true;
                removedNames.push(actualName);
            } else {
                for (var j = 0; j < p.members.length; j++) {
                    if (isNameMatch(p.members[j].n, targetName)) {
                        var actualName = p.members[j].n; 
                        p.members.splice(j, 1);
                        isRemoved = true;
                        removedNames.push(actualName);
                        break;
                    }
                }
            }

            if (!isRemoved) {
                notFoundNames.push(targetName);
            }
        }

        if (p.members.length === 0) {
            delete currentDB[targetId];
            saveDB();
            replier.reply("🗑️ 파티 자동 해산\n\n마지막 멤버의 이탈로 [" + targetId + "] 파티가 해산되었습니다.");
            return;
        } else if (removedNames.length > 0) {
            saveDB();
        }

        var replyMsg = "";
        if (removedNames.length > 0) {
            replyMsg += "❌ 강제 탈퇴 완료\n\n[" + removedNames.join(", ") + "]님이 파티에서 제외되었습니다.\n\n" + getPartyStatusText(targetId, currentDB);
        }
        if (notFoundNames.length > 0) {
            if (replyMsg) replyMsg += "\n\n";
            replyMsg += "⚠️ 명단 없음: [" + notFoundNames.join(", ") + "]";
        }
        if (!replyMsg) replyMsg = "⚠️ 제외된 인원이 없습니다.";

        replier.reply(replyMsg);
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
