// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v41.0.0 (최종 무결성 통합본)
 * - 주요 기능: 파티 생성, 참여, 예약, 탈퇴, 삭제 (자동 정리 기본)
 * - 변경 사항: 모든 명령어 출력문(알림 메시지)을 풍부하고 가독성 좋게 디자인 개선
 */

var partyDB = {};
var DB_PATH = "sdcard/msgbot/lolgtec_db.json";

// 💾 봇 구동 시 1회 데이터 로드 (오류 방지 적용)
try {
    if (File.exists(DB_PATH)) {
        var dbData = File.read(DB_PATH);
        if (dbData) partyDB = JSON.parse(dbData);
    }
} catch (e) {
    partyDB = {}; // 에러 발생 시 초기화하여 봇 멈춤 방지
}

// 💾 데이터 저장 함수 (폴더 자동 생성 및 오류 방지 적용)
function saveDB() {
    try {
        var folder = new java.io.File("sdcard/msgbot");
        if (!folder.exists()) folder.mkdirs(); // 폴더가 없으면 생성
        File.write(DB_PATH, JSON.stringify(partyDB));
    } catch (e) {
        // 권한 문제 등으로 저장 실패 시 봇이 멈추지 않도록 무시
    }
}

const maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5, "기타게임": 5
};

// 실시간 파티 정보 유닛 (임시 멤버 시각적 구분 적용)
function getPartyStatusText(pId) {
    var p = partyDB[pId];
    if (!p) return "";
    
    // 임시 파티일 경우 별 아이콘과 [임시] 라벨 추가
    var icon = p.isTemp ? "🌟" : "🏆";
    var tag = p.isTemp ? " [임시] " : " ";
    
    var status = icon + tag + "[ " + pId + " ]\n";
    status += "📅 " + p.time + "  |  💬 " + p.vibe + "\n";
    status += "📊 현황 : " + p.members.length + " / " + p.max + " 명\n";
    
    for (var i = 0; i < p.members.length; i++) {
        var m = p.members[i];
        var noteStr = m.t ? " (" + m.t + ")" : "";
        // 멤버가 임시 참여자인지 확인하여 아이콘 분리 (메인:👤, 임시:🌟)
        var mIcon = m.isTemp ? "🌟" : "👤"; 
        status += mIcon + " " + m.n + noteStr + "\n";
    }
    
    if (p.reservations.length > 0) {
        status += "⏳ 예약 : " + p.reservations.join(", ") + "\n";
    }
    
    return status.replace(/\n$/, "");
}

// 유저가 현재 속한 모든 파티 ID 배열 반환
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

// 자동 탈퇴 처리 함수
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
    if (isChanged) saveDB(); // 정리된 내역이 있으면 저장
}

function getNextPartyId(mode) {
    var i = 1;
    while (partyDB[mode + i]) { i++; }
    return mode + i;
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (room !== "ㅇㅇ") return;

    // 1. 명령어 가이드
    if (msg === "명령어") {
        var help = "\n✨ [ 롤 구인 시스템 메뉴얼 ] ✨\n\n" +
                   "🏆 [ 메인 기능 : 자동 탈퇴 적용 ]\n" +
                   "※ 새로운 파티 생성/참여 시 기존 파티에서 자동 탈퇴됩니다.\n" +
                   "👉 [모드] [시간] [분위기] [비고(선택)]\n" +
                   "👉 예) 자랭 22시 즐겜 원딜\n" +
                   "👉 참여 [파티명] [비고] (예: 참여 자랭1 미드)\n" +
                   "👉 예약 [파티명]\n\n" +
                   "🌟 [ 임시 기능 : 기존 파티 유지 ]\n" +
                   "※ 메인 파티를 기다리며 임시로 다른 게임을 할 때 씁니다. (최대 2개 소속 가능)\n" +
                   "👉 임시생성 [모드] [시간] [분위기] [비고(선택)]\n" +
                   "👉 임시참여 [파티명] [비고]\n" +
                   "👉 임시예약 [파티명]\n\n" +
                   "💡 [ 꿀팁: 비고 활용법 ]\n" +
                   "※ 파티명 뒤에 포지션, 티어 등 메모를 자유롭게 적을 수 있습니다.\n" +
                   "👉 예) 참여 자랭1 원딜/골드\n" +
                   "👉 예) 임시참여 칼바람1 밥먹고옴\n\n" +
                   "⚙️ [ 관리 명령어 ]\n" +
                   "🔍 현황 : 모집 중인 파티 전체 보기\n" +
                   "❌ 탈퇴 [파티명] : 특정 파티 나가기/예약취소\n" +
                   "🧨 파티삭제 [파티명] : 내 파티 폭파하기\n\n" +
                   "※ 지원: 내전, 아레나, 자랭, 듀랭, 칼바람, 기타게임";
        replier.reply(help);
        return;
    }

    // 2. 파티 현황 (출력문 풍부하게 수정)
    if (msg === "현황") {
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply("📋 [ 실시간 파티 현황 ] 📋\n\n💡 현재 모집 중인 파티가 없습니다.\n\n새로운 파티의 첫 번째 방장이 되어보세요! (๑>ᴗ<๑)");
            return;
        }
        var body = "📋 [ 실시간 파티 현황 ] 📋\n\n";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            body += getPartyStatusText(keys[i]) + "\n";
            if (i < keys.length - 1) body += "--------------------------\n";
        }
        body += "\n💡 원하시는 파티에 합류해보세요!\n👉 참여 [파티명] [비고] / 임시참여 [파티명] [비고]";
        replier.reply(body);
        return;
    }

    // 3. 파티 생성 (기본 & 임시)
    var isTempCreate = (msg.indexOf("임시생성 ") === 0);
    var createStr = isTempCreate ? msg.replace("임시생성 ", "") : msg;
    
    if (msg.indexOf("참여 ") === -1 && msg.indexOf("임시참여") === -1 && msg.indexOf("예약") === -1 && msg.indexOf("탈퇴") === -1 && msg.indexOf("파티삭제") === -1) {
        var createMatch = createStr.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)\s+([^\s]+)\s+([^\s]+)(?:\s+(.+))?$/);
        if (createMatch) {
            if (isTempCreate) {
                var userParties = getUserParties(sender);
                if (userParties.length >= 2) {
                    replier.reply("⚠️ 임시 파티 생성 실패\n\n이미 2개의 파티에 소속되어 있어 더 이상 생성할 수 없습니다.\n기존 파티를 탈퇴한 후 다시 시도해주세요!");
                    return;
                }
            } else {
                clearUserStatus(sender);
            }

            var mode = createMatch[1]; 
            var pTime = createMatch[2];
            var pVibe = createMatch[3];
            var pNote = createMatch[4] || ""; 
            
            var pId = getNextPartyId(mode); 
            partyDB[pId] = {
                mode: mode, 
                members: [{n: sender, t: pNote, isTemp: isTempCreate}], 
                reservations: [],
                max: maxMembers[mode], time: pTime, vibe: pVibe,
                isTemp: isTempCreate 
            };
            
            saveDB(); 
            var prefix = isTempCreate ? "🌟 임시 파티 생성 완료" : "🎉 파티 생성 완료";
            replier.reply(prefix + "\n\n성공적으로 파티를 생성했습니다!\n\n" + getPartyStatusText(pId) + "\n\n💡 같이 하실 분은 '참여 " + pId + " [비고]'를 입력해주세요.");
            return;
        } else if (msg.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)(?:\s+|$)/) || isTempCreate) {
            replier.reply("⚠️ 명령어 입력 오류\n\n파티 생성 형식이 올바르지 않습니다.\n👉 예시: 자랭 22시 즐겜 원딜\n\n띄어쓰기와 항목을 꼭 맞춰서 입력해주세요!");
            return;
        }
    }

    // 4. 파티 참여 (기본 & 임시)
    var isTempJoin = (msg.indexOf("임시참여 ") === 0);
    if (msg.indexOf("참여 ") === 0 || isTempJoin) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        var note = parts.slice(2).join(" "); 
        
        if (!partyDB[targetId]) { replier.reply("⚠️ 파티 참여 실패\n\n입력하신 이름의 파티를 찾을 수 없습니다.\n파티명을 다시 한번 확인해주세요!"); return; }
        var p = partyDB[targetId];
        if (p.members.length >= p.max) { replier.reply("⚠️ 파티 인원 초과\n\n해당 파티는 이미 정원이 다 찼습니다.\n'예약 " + targetId + "'을 써서 대기 명단에 등록해보세요!"); return; }
        
        var userParties = getUserParties(sender);
        if (userParties.indexOf(targetId) !== -1) { replier.reply("⚠️ 중복 참여 오류\n\n이미 해당 파티에 소속되어 있습니다.\n중복으로 참여할 수 없습니다."); return; }

        if (isTempJoin) {
            if (userParties.length >= 2) {
                replier.reply("⚠️ 임시 참여 실패\n\n최대 2개의 파티에만 동시 소속이 가능합니다.\n참여 중인 다른 파티를 먼저 탈퇴해주세요!");
                return;
            }
        } else {
            clearUserStatus(sender);
        }

        p.members.push({n: sender, t: note, isTemp: isTempJoin});
        saveDB(); 
        var prefix = isTempJoin ? "🌟 임시 파티 합류 완료" : "✅ 파티 참여 완료";
        replier.reply(prefix + "\n\n" + sender + "님이 파티에 성공적으로 합류하셨습니다!\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 5. 파티 예약 (기본 & 임시)
    var isTempRes = (msg.indexOf("임시예약 ") === 0);
    if (msg.indexOf("예약 ") === 0 || isTempRes) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("⚠️ 예약 등록 실패\n\n입력하신 이름의 파티를 찾을 수 없습니다.\n파티명을 다시 한번 확인해주세요!"); return; }
        var userParties = getUserParties(sender);
        if (userParties.indexOf(targetId) !== -1) { replier.reply("⚠️ 중복 예약 오류\n\n이미 해당 파티에 소속되어 있습니다.\n추가로 예약할 수 없습니다."); return; }
        
        if (isTempRes) {
            if (userParties.length >= 2) {
                replier.reply("⚠️ 임시 예약 실패\n\n최대 2개의 파티에만 동시 소속이 가능합니다.\n참여 중인 다른 파티를 먼저 탈퇴해주세요!");
                return;
            }
        } else {
            clearUserStatus(sender);
        }

        partyDB[targetId].reservations.push(sender);
        saveDB(); 
        var prefix = isTempRes ? "🌟 임시 파티 예약 완료" : "📝 파티 예약 완료";
        replier.reply(prefix + "\n\n" + sender + "님이 대기 명단에 등록되었습니다!\n자리가 나면 가장 먼저 알려드릴게요.\n\n" + getPartyStatusText(targetId));
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
                replier.reply("🧨 파티 삭제 완료\n\n[" + targetId + "] 파티가 성공적으로 해산되었습니다.\n참여했던 대원들의 명단이 모두 정리되었습니다.");
            } else { 
                replier.reply("⚠️ 파티 삭제 실패\n\n존재하지 않는 파티입니다. 파티명을 확인해주세요."); 
            }
        } else {
            if (userParties.length === 0) {
                replier.reply("⚠️ 파티 삭제 실패\n\n현재 소속된 파티가 없어 삭제할 수 없습니다.");
            } else if (userParties.length === 1) {
                delete partyDB[userParties[0]];
                saveDB(); 
                replier.reply("🧨 파티 삭제 완료\n\n[" + userParties[0] + "] 파티가 성공적으로 해산되었습니다.\n참여했던 대원들의 명단이 모두 정리되었습니다.");
            } else { 
                replier.reply("⚠️ 파티 지정 필요\n\n현재 여러 파티(" + userParties.join(", ") + ")에 소속되어 있습니다.\n어떤 파티를 해산할지 '파티삭제 [파티명]'으로 명확히 지정해주세요."); 
            }
        }
        return;
    }

    // 7. 탈퇴 및 예약취소
    if (msg.indexOf("탈퇴") === 0 || msg.indexOf("예약취소") === 0) {
        var targetId = msg.split(" ")[1];
        var userParties = getUserParties(sender);
        
        if (userParties.length === 0) {
            replier.reply("⚠️ 탈퇴 실패\n\n현재 참여 중인 파티나 예약 명단이 없습니다.");
            return;
        }

        if (!targetId && userParties.length > 1) {
            replier.reply("⚠️ 파티 지정 필요\n\n현재 여러 파티에 소속되어 있습니다.\n어떤 파티에서 나갈지 '탈퇴 [파티명]'으로 명확히 지정해주세요.\n(참여중: " + userParties.join(", ") + ")");
            return;
        }

        var finalId = targetId || userParties[0];
        var p = partyDB[finalId];
        if (!p) { replier.reply("⚠️ 탈퇴 실패\n\n해당 파티를 찾을 수 없습니다."); return; }

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
            replier.reply("⚠️ 탈퇴 실패\n\n[" + finalId + "] 파티에 소속되어 있지 않습니다."); 
            return; 
        }

        if (p.members.length === 0) {
            delete partyDB[finalId];
            saveDB(); 
            replier.reply("🍃 파티 자동 해산\n\n마지막 멤버인 " + sender + "님이 이탈하여 [" + finalId + "] 파티가 조용히 사라졌습니다.");
        } else {
            saveDB(); 
            // 예약취소와 파티탈퇴 메시지 분리
            if (resIdx !== -1) {
                replier.reply("💨 예약 취소 완료\n\n" + sender + "님이 [" + finalId + "] 파티의 대기 명단에서 제외되었습니다.\n다음에 또 함께해요! 👋");
            } else {
                var exitMsg = "💨 파티 퇴장 완료\n\n" + sender + "님이 파티에서 성공적으로 나갔습니다.\n\n" + getPartyStatusText(finalId);
                if (p.reservations.length > 0) exitMsg += "\n\n🔔 알림: 대기 1순위 [" + p.reservations[0] + "]님!\n자리가 났습니다. '참여 " + finalId + "'를 입력하여 합류해주세요!";
                replier.reply(exitMsg);
            }
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
