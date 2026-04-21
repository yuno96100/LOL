// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v48.0.0 (최종 커스텀 파티 적용본)
 * - 주요 기능: 파티 생성, 참여, 예약, 탈퇴, 삭제, 수정
 * - 변경 사항: '비고'를 '메모'로 명칭 변경, 매뉴얼 하단 파티 해산 권고 문구 추가
 */

var partyDB = {};
var DB_PATH = "sdcard/msgbot/lolgtec_db.json";

// 💾 봇 구동 시 1회 데이터 로드 
try {
    if (File.exists(DB_PATH)) {
        var dbData = File.read(DB_PATH);
        if (dbData) partyDB = JSON.parse(dbData);
    }
} catch (e) {
    partyDB = {}; 
}

// 💾 데이터 저장 함수
function saveDB() {
    try {
        var folder = new java.io.File("sdcard/msgbot");
        if (!folder.exists()) folder.mkdirs(); 
        File.write(DB_PATH, JSON.stringify(partyDB));
    } catch (e) {
    }
}

// 롤 관련 기본 모드 최대 인원수
const maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5
};

// 실시간 파티 정보 유닛
function getPartyStatusText(pId) {
    var p = partyDB[pId];
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
    var isChanged = false;
    for (var id in partyDB) {
        var p = partyDB[id];
        var removedMain = false;
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === user) {
                p.members.splice(i, 1);
                removedMain = true;
                isChanged = true;
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
                isChanged = true;
            }
        }
    }
    if (isChanged) saveDB(); 
}

function getNextPartyId(mode) {
    var i = 1;
    while (partyDB[mode + i]) { i++; }
    return mode + i;
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (room !== "ㅇㅇ") return;

    // 1. 명령어 가이드 (메모로 명칭 변경 및 공지 추가)
    if (msg === "명령어") {
        var help = "✨ [ 롤 구인 시스템 매뉴얼 ] ✨\n\n" +
                   "🏆 [ 롤 파티 생성 ] (자동 탈퇴 적용)\n" +
                   "👉 [모드] [시간] [티어(선택)] [분위기(선택)] [메모(선택)]\n" +
                   "👉 예) 자랭 22시 골드 빡겜 원딜\n\n" +
                   "🎮 [ 타 게임 파티 생성 ] (커스텀)\n" +
                   "👉 기타 [게임명] [최대인원] [시간] [분위기(선택)] [메모]\n" +
                   "👉 예) 기타 배그 4 22시 빡겜 디코필수\n\n" +
                   "🌟 [ 임시 파티 생성 ] (기존 파티 유지)\n" +
                   "👉 임시생성 [모드] [시간] ...\n" +
                   "👉 임시생성 기타 [게임명] [인원] [시간] ...\n\n" +
                   "✅ [ 참여 및 관리 명령어 ]\n" +
                   "👉 참여 [파티명] [메모]\n" +
                   "👉 임시참여 [파티명] [메모]\n" +
                   "👉 예약 [파티명] / 임시예약 [파티명]\n" +
                   "🔍 현황 : 파티 전체 보기\n" +
                   "🔄 수정 [파티명] [시간] [티어] [분위기] (방장 전용)\n" +
                   "❌ 탈퇴 [파티명] : 파티 나가기/예약취소\n" +
                   "🗑️ 파티삭제 [파티명] : 파티 해산하기\n\n" +
                   "💡 [ 메모 활용 안내 ]\n" +
                   "※ 파티명 뒤에 포지션, 티어 등 간단한 메모를 기재할 수 있습니다.\n\n" +
                   "⚠️ 파티가 종료되거나 해산할 경우, 반드시 '파티삭제 [파티명]' 명령어로 방을 정리해 주시기 바랍니다.\n\n" +
                   "※ 지원: 내전, 아레나, 자랭, 듀랭, 칼바람, 기타";
        replier.reply(help);
        return;
    }

    // 2. 파티 현황
    if (msg === "현황") {
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply("📋 [ 실시간 파티 현황 ] 📋\n\n💡 현재 모집 중인 파티가 없습니다.\n\n새로운 파티를 생성해 주세요.");
            return;
        }
        var body = "📋 [ 실시간 파티 현황 ] 📋\n\n";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            body += getPartyStatusText(keys[i]) + "\n";
            if (i < keys.length - 1) body += "--------------------------\n";
        }
        body += "\n💡 참여 [파티명] [메모] / 임시참여 [파티명] [메모]";
        replier.reply(body);
        return;
    }

    // 3. 파티 생성
    var isTempCreate = (msg.indexOf("임시생성 ") === 0);
    var createStr = isTempCreate ? msg.replace("임시생성 ", "").trim() : msg.trim();
    
    if (msg.indexOf("참여 ") === -1 && msg.indexOf("임시참여") === -1 && msg.indexOf("예약") === -1 && msg.indexOf("탈퇴") === -1 && msg.indexOf("파티삭제") === -1 && msg.indexOf("수정 ") === -1) {
        var validModes = ["내전", "아레나", "자랭", "듀랭", "칼바람"];
        var words = createStr.split(/\s+/);
        var mode = words[0];
        
        if (validModes.indexOf(mode) !== -1 || mode === "기타") {
            if (isTempCreate) {
                var userParties = getUserParties(sender);
                if (userParties.length >= 2) {
                    replier.reply("⚠️ 생성 실패\n\n최대 2개의 파티에만 동시 소속될 수 있습니다.");
                    return;
                }
            } else {
                clearUserStatus(sender);
            }

            var pId, pTime, pTier, pVibe, pNote, pMax, actualMode;

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
                pNote = words.slice(5).join(" ") || "";
                pId = getNextPartyId(actualMode);
            } else {
                if (words.length < 2) {
                    replier.reply("⚠️ 입력 오류: [시간] 항목이 누락되었습니다.\n👉 예시: " + mode + " 22시");
                    return;
                }
                actualMode = mode;
                pMax = maxMembers[mode];
                pTime = words[1];
                var defaultTier = (mode === "칼바람" || mode === "아레나" || mode === "내전") ? "무관" : "미정";
                pTier = words[2] || defaultTier;
                pVibe = words[3] || "즐겜";
                pNote = words.slice(4).join(" ") || ""; 
                pId = getNextPartyId(actualMode);
            }
            
            partyDB[pId] = {
                mode: actualMode, 
                members: [{n: sender, t: pNote, isTemp: isTempCreate}], 
                reservations: [],
                max: pMax, 
                time: pTime, 
                tier: pTier, 
                vibe: pVibe,
                isTemp: isTempCreate 
            };
            
            saveDB(); 
            var prefix = isTempCreate ? "✅ 임시 파티 생성 완료" : "✅ 파티 생성 완료";
            replier.reply(prefix + "\n\n파티가 생성되었습니다.\n\n" + getPartyStatusText(pId) + "\n\n💡 참여 [파티명] [메모] 명령어로 합류할 수 있습니다.");
            return;
            
        } else if (isTempCreate) {
            replier.reply("⚠️ 지원하지 않는 모드입니다.\n(지원: 내전, 아레나, 자랭, 듀랭, 칼바람, 기타)");
            return;
        }
    }

    // 4. 파티 참여
    var isTempJoin = (msg.indexOf("임시참여 ") === 0);
    if (msg.indexOf("참여 ") === 0 || isTempJoin) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        var note = parts.slice(2).join(" "); 
        
        if (!partyDB[targetId]) { replier.reply("⚠️ 참여 실패: 해당 파티를 찾을 수 없습니다."); return; }
        var p = partyDB[targetId];
        if (p.members.length >= p.max) { replier.reply("⚠️ 인원 초과: 정원이 마감되었습니다. '예약 " + targetId + "'을 이용해 주세요."); return; }
        
        var userParties = getUserParties(sender);
        if (userParties.indexOf(targetId) !== -1) { replier.reply("⚠️ 중복 참여: 이미 파티에 소속되어 있습니다."); return; }

        if (isTempJoin) {
            if (userParties.length >= 2) {
                replier.reply("⚠️ 참여 실패: 최대 2개의 파티에만 동시 소속이 가능합니다.");
                return;
            }
        } else {
            clearUserStatus(sender);
        }

        p.members.push({n: sender, t: note, isTemp: isTempJoin});
        saveDB(); 
        var prefix = isTempJoin ? "✅ 임시 파티 참여 완료" : "✅ 파티 참여 완료";
        replier.reply(prefix + "\n\n" + sender + "님이 파티에 참여했습니다.\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 5. 파티 예약
    var isTempRes = (msg.indexOf("임시예약 ") === 0);
    if (msg.indexOf("예약 ") === 0 || isTempRes) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("⚠️ 예약 실패: 해당 파티를 찾을 수 없습니다."); return; }
        var userParties = getUserParties(sender);
        if (userParties.indexOf(targetId) !== -1) { replier.reply("⚠️ 중복 예약: 이미 해당 파티에 소속되어 있습니다."); return; }
        
        if (isTempRes) {
            if (userParties.length >= 2) {
                replier.reply("⚠️ 예약 실패: 최대 2개의 파티에만 동시 소속이 가능합니다.");
                return;
            }
        } else {
            clearUserStatus(sender);
        }

        partyDB[targetId].reservations.push(sender);
        saveDB(); 
        var prefix = isTempRes ? "✅ 임시 파티 예약 완료" : "✅ 파티 예약 완료";
        replier.reply(prefix + "\n\n" + sender + "님이 대기 명단에 등록되었습니다.\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 6. 파티삭제
    if (msg.indexOf("파티삭제") === 0) {
        var targetId = msg.split(" ")[1];
        var userParties = getUserParties(sender);
        
        if (targetId) {
            if (partyDB[targetId]) {
                delete partyDB[targetId];
                saveDB(); 
                replier.reply("🗑️ 파티 삭제 완료\n\n[" + targetId + "] 파티가 해산되었습니다.");
            } else { 
                replier.reply("⚠️ 삭제 실패: 존재하지 않는 파티입니다."); 
            }
        } else {
            if (userParties.length === 0) {
                replier.reply("⚠️ 삭제 실패: 현재 소속된 파티가 없습니다.");
            } else if (userParties.length === 1) {
                delete partyDB[userParties[0]];
                saveDB(); 
                replier.reply("🗑️ 파티 삭제 완료\n\n[" + userParties[0] + "] 파티가 해산되었습니다.");
            } else { 
                replier.reply("⚠️ 파티 지정 필요: 여러 파티에 소속되어 있습니다. '파티삭제 [파티명]'으로 지정해 주세요."); 
            }
        }
        return;
    }

    // 7. 탈퇴 및 예약취소
    if (msg.indexOf("탈퇴") === 0 || msg.indexOf("예약취소") === 0) {
        var targetId = msg.split(" ")[1];
        var userParties = getUserParties(sender);
        
        if (userParties.length === 0) {
            replier.reply("⚠️ 탈퇴 실패: 현재 참여 중인 파티나 예약 내역이 없습니다.");
            return;
        }

        if (!targetId && userParties.length > 1) {
            replier.reply("⚠️ 파티 지정 필요\n\n'탈퇴 [파티명]'으로 탈퇴할 파티를 명시해 주세요.\n(참여 중: " + userParties.join(", ") + ")");
            return;
        }

        var finalId = targetId || userParties[0];
        var p = partyDB[finalId];
        if (!p) { replier.reply("⚠️ 탈퇴 실패: 해당 파티를 찾을 수 없습니다."); return; }

        var isRemoved = false;
        var resIdx = p.reservations.indexOf(sender);
        if (resIdx !== -1) { 
            p.reservations.splice(resIdx, 1); 
            isRemoved = true; 
        } else {
            for (var i = 0; i < p.members.length; i++) {
                if (p.members[i].n === sender) {
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
            delete partyDB[finalId];
            saveDB(); 
            replier.reply("🗑️ 파티 자동 해산\n\n마지막 멤버의 이탈로 [" + finalId + "] 파티가 해산되었습니다.");
        } else {
            saveDB(); 
            if (resIdx !== -1) {
                replier.reply("❌ 예약 취소 완료\n\n" + sender + "님이 [" + finalId + "] 파티의 대기 명단에서 제외되었습니다.");
            } else {
                var exitMsg = "❌ 파티 퇴장 완료\n\n" + sender + "님이 파티에서 퇴장했습니다.\n\n" + getPartyStatusText(finalId);
                if (p.reservations && p.reservations.length > 0) exitMsg += "\n\n🔔 알림: 대기 1순위 [" + p.reservations[0] + "]님! 자리가 발생했습니다. '참여 " + finalId + "'를 입력하여 합류해 주세요.";
                replier.reply(exitMsg);
            }
        }
        return;
    }

    // 8. 파티 수정
    if (msg.indexOf("수정 ") === 0) {
        var parts = msg.split(/\s+/);
        var targetId = parts[1];

        if (!partyDB[targetId]) { 
            replier.reply("⚠️ 수정 실패: 해당 파티를 찾을 수 없습니다."); 
            return; 
        }
        var p = partyDB[targetId];

        if (p.members[0].n !== sender) { 
            replier.reply("⚠️ 권한 없음: 파티 수정은 파티를 생성한 방장만 가능합니다."); 
            return; 
        }

        if (parts.length < 3) {
            replier.reply("⚠️ 입력 오류: 수정할 시간을 입력해 주세요.\n👉 예시: 수정 " + targetId + " 23시 빡겜");
            return;
        }

        p.time = parts[2];
        var validModesArray = ["내전", "아레나", "자랭", "듀랭", "칼바람"];
        var isCustomGame = (validModesArray.indexOf(p.mode) === -1);
        
        var defaultTier = (isCustomGame || p.mode === "칼바람" || p.mode === "아레나" || p.mode === "내전") ? "무관" : "미정";
        p.tier = parts[3] || defaultTier;
        p.vibe = parts[4] || "즐겜";

        saveDB();
        replier.reply("🔄 파티 수정 완료\n\n파티 정보가 성공적으로 변경되었습니다.\n\n" + getPartyStatusText(targetId));
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
