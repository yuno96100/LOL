// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v33.0.0
 * - 주요 기능: 파티 생성, 참여, 예약, 탈퇴, 삭제 (자동 정리 기본)
 * - 변경 사항: '대기게임' 폐기 및 '임시' 명령어(임시생성, 임시참여, 임시예약) 통합 도입
 */

var partyDB = {};

const maxMembers = {
    "내전": 10, "아레나": 8, "자랭": 5, "듀랭": 2, "칼바람": 5, "기타게임": 5
};

// 실시간 파티 정보 유닛
function getPartyStatusText(pId) {
    var p = partyDB[pId];
    if (!p) return "";
    
    var status = "🏆 [ " + pId + " ]\n";
    status += "📅 " + p.time + "  |  💬 " + p.vibe + "\n";
    status += "📊 현황 : " + p.members.length + " / " + p.max + " 명\n";
    
    // 멤버 명단 출력
    for (var i = 0; i < p.members.length; i++) {
        var m = p.members[i];
        var noteStr = m.t ? " (" + m.t + ")" : "";
        status += "👤 " + m.n + noteStr + "\n";
    }
    
    // 예약 명단
    if (p.reservations.length > 0) {
        status += "⏳ 예약 : " + p.reservations.join(", ") + "\n";
    }
    
    return status.replace(/\n$/, "");
}

// 유저가 현재 속한 모든 파티 ID 배열을 반환
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

// 자동 탈퇴 처리 함수 (유저가 속한 모든 파티/예약 깔끔하게 정리)
function clearUserStatus(user) {
    for (var id in partyDB) {
        var p = partyDB[id];
        
        var removedMain = false;
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === user) {
                p.members.splice(i, 1);
                removedMain = true;
                break;
            }
        }
        
        if (removedMain && p.members.length === 0) {
            delete partyDB[id];
            continue; // 방이 사라졌으므로 예약 검사 패스
        }
        
        if (partyDB[id]) {
            var resIdx = partyDB[id].reservations.indexOf(user);
            if (resIdx !== -1) partyDB[id].reservations.splice(resIdx, 1);
        }
    }
}

function getNextPartyId(mode) {
    var i = 1;
    while (partyDB[mode + i]) { i++; }
    return mode + i;
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (room !== "ㅇㅇ") return;

    // 1. 명령어 가이드 (임시 명령어 통합 안내)
    if (msg === "명령어") {
        var help = "\n✨ [ 롤 구인 시스템 메뉴얼 ] ✨\n\n" +
                   "🔹 [ 기본 기능 : 기존 파티 자동 정리 ]\n" +
                   "📝 [모드] [시간] [분위기]\n" +
                   "👉 예) 자랭 22시 즐겜\n" +
                   "✅ 참여 [파티명] [비고]\n" +
                   "⏳ 예약 [파티명]\n\n" +
                   "🔹 [ 임시 기능 : 기존 파티 유지 (최대 2개) ]\n" +
                   "📝 임시생성 [모드] [시간] [분위기]\n" +
                   "✅ 임시참여 [파티명] [비고]\n" +
                   "⏳ 임시예약 [파티명]\n\n" +
                   "🔍 현황 : 파티 전체 보기\n" +
                   "❌ 탈퇴 [파티명] / 🧨 파티삭제 [파티명]\n\n" +
                   "※ 지원: 내전, 아레나(8), 자랭, 듀랭, 칼바람, 기타게임";
        replier.reply(help);
        return;
    }

    // 2. 파티 현황
    if (msg === "현황") {
        var keys = Object.keys(partyDB);
        if (keys.length === 0) {
            replier.reply("✨ [ 실시간 파티 현황 ] ✨\n\n💡 현재 모집 중인 파티가 없습니다.");
            return;
        }
        var body = "✨ [ 실시간 파티 현황 ] ✨\n\n";
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            body += getPartyStatusText(keys[i]) + "\n";
            if (i < keys.length - 1) body += "\n";
        }
        replier.reply(body);
        return;
    }

    // 3. 파티 생성 (기본 & 임시)
    var isTempCreate = (msg.indexOf("임시생성 ") === 0);
    var createStr = isTempCreate ? msg.replace("임시생성 ", "") : msg;
    
    // 참여나 예약 등 다른 명령어와 겹치지 않게 방어
    if (msg.indexOf("참여 ") === -1 && msg.indexOf("임시참여") === -1 && msg.indexOf("예약") === -1 && msg.indexOf("탈퇴") === -1 && msg.indexOf("파티삭제") === -1) {
        var createMatch = createStr.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)\s+([^\s]+)\s+(.+)$/);
        if (createMatch) {
            if (isTempCreate) {
                var userParties = getUserParties(sender);
                if (userParties.length >= 2) {
                    replier.reply("⚠️ 생성 실패\n\n최대 2개의 파티에만 동시 소속될 수 있습니다.");
                    return;
                }
            } else {
                clearUserStatus(sender); // 기본 생성 시 기존 파티 깔끔하게 정리
            }

            var mode = createMatch[1]; 
            var pId = getNextPartyId(mode); 
            partyDB[pId] = {
                mode: mode, members: [{n: sender, t: ""}], reservations: [],
                max: maxMembers[mode], time: createMatch[2], vibe: createMatch[3]
            };
            
            var prefix = isTempCreate ? "🌟 임시 " : "🎉 ";
            replier.reply(prefix + "파티 생성 완료\n\n성공적으로 파티를 생성했습니다!\n\n" + getPartyStatusText(pId) + "\n\n💡 같이 하실 분은 '참여 " + pId + " [비고]'를 입력해주세요.");
            return;
        } else if (msg.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)(?:\s+|$)/) || isTempCreate) {
            replier.reply("⚠️ 입력 오류\n\n형식이 올바르지 않습니다.\n👉 예시: 자랭 22시 즐겜\n띄어쓰기를 꼭 맞춰주세요!");
            return;
        }
    }

    // 4. 파티 참여 (기본 & 임시)
    var isTempJoin = (msg.indexOf("임시참여 ") === 0);
    if (msg.indexOf("참여 ") === 0 || isTempJoin) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        var note = parts.slice(2).join(" "); 
        
        if (!partyDB[targetId]) { replier.reply("⚠️ 참여 실패\n\n존재하지 않는 파티입니다."); return; }
        var p = partyDB[targetId];
        if (p.members.length >= p.max) { replier.reply("⚠️ 인원 초과\n\n해당 파티는 꽉 찼습니다.\n'예약 " + targetId + "'을 써서 대기해주세요!"); return; }
        
        var userParties = getUserParties(sender);
        if (userParties.indexOf(targetId) !== -1) { replier.reply("⚠️ 중복 참여\n\n이미 해당 파티에 소속되어 있습니다."); return; }

        if (isTempJoin) {
            if (userParties.length >= 2) {
                replier.reply("⚠️ 참여 실패\n\n최대 2개의 파티에만 동시 소속될 수 있습니다.");
                return;
            }
        } else {
            clearUserStatus(sender);
        }

        p.members.push({n: sender, t: note});
        var prefix = isTempJoin ? "🌟 임시 " : "✅ 파티 ";
        replier.reply(prefix + "참여 완료\n\n" + sender + "님 합류!\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 5. 파티 예약 (기본 & 임시)
    var isTempRes = (msg.indexOf("임시예약 ") === 0);
    if (msg.indexOf("예약 ") === 0 || isTempRes) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("⚠️ 예약 실패\n\n존재하지 않는 파티입니다."); return; }
        
        var userParties = getUserParties(sender);
        if (userParties.indexOf(targetId) !== -1) { replier.reply("⚠️ 중복 예약\n\n이미 해당 파티에 소속되어 있습니다."); return; }
        
        if (isTempRes) {
            if (userParties.length >= 2) {
                replier.reply("⚠️ 예약 실패\n\n최대 2개의 파티에만 동시 소속될 수 있습니다.");
                return;
            }
        } else {
            clearUserStatus(sender);
        }

        partyDB[targetId].reservations.push(sender);
        var prefix = isTempRes ? "🌟 임시 " : "📝 ";
        replier.reply(prefix + "예약 완료\n\n" + sender + "님, 자리가 나면 알려드릴게요!\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 6. 파티삭제
    if (msg.indexOf("파티삭제") === 0) {
        var targetId = msg.split(" ")[1];
        var userParties = getUserParties(sender);
        
        if (targetId) {
            if (partyDB[targetId]) {
                delete partyDB[targetId];
                replier.reply("🧨 파티 삭제\n\n[" + targetId + "] 파티가 해산되었습니다.");
            } else {
                replier.reply("⚠️ 삭제 실패\n\n존재하지 않는 파티입니다.");
            }
        } else {
            if (userParties.length === 0) {
                replier.reply("⚠️ 삭제 실패\n\n소속된 파티가 없습니다.");
            } else if (userParties.length === 1) {
                delete partyDB[userParties[0]];
                replier.reply("🧨 파티 삭제\n\n[" + userParties[0] + "] 파티가 해산되었습니다.");
            } else {
                replier.reply("⚠️ 지정 필요\n\n현재 여러 파티(" + userParties.join(", ") + ")에 소속되어 있습니다.\n'파티삭제 [파티명]'으로 정확히 지정해주세요.");
            }
        }
        return;
    }

    // 7. 탈퇴 / 예약취소
    if (msg.indexOf("탈퇴") === 0 || msg.indexOf("예약취소") === 0) {
        var targetId = msg.split(" ")[1];
        var userParties = getUserParties(sender);
        
        if (userParties.length === 0) {
            replier.reply("⚠️ 탈퇴 실패\n\n참여 중인 파티나 예약이 없습니다.");
            return;
        }

        if (!targetId && userParties.length > 1) {
            replier.reply("⚠️ 지정 필요\n\n현재 여러 파티(" + userParties.join(", ") + ")에 소속되어 있습니다.\n'탈퇴 [파티명]'으로 나갈 곳을 정확히 지정해주세요.");
            return;
        }

        var finalId = targetId || userParties[0];
        var p = partyDB[finalId];
        if (!p) { replier.reply("⚠️ 탈퇴 실패\n\n해당 파티가 존재하지 않습니다."); return; }

        var isRemoved = false;
        
        // 예약자 명단에서 확인
        var resIdx = p.reservations.indexOf(sender);
        if (resIdx !== -1) {
            p.reservations.splice(resIdx, 1);
            replier.reply("💨 예약 취소\n\n[" + finalId + "] 예약 명단에서 취소되었습니다.");
            isRemoved = true;
        } else {
            // 멤버 명단에서 확인
            for (var i = 0; i < p.members.length; i++) {
                if (p.members[i].n === sender) {
                    p.members.splice(i, 1);
                    isRemoved = true;
                    break;
                }
            }
            if (isRemoved) {
                if (p.members.length === 0) {
                    delete partyDB[finalId];
                    replier.reply("🍃 파티 해산\n\n파티원이 모두 이탈해 [" + finalId + "] 파티가 사라졌습니다.");
                } else {
                    var exitMsg = sender + "님이 파티에서 나갔습니다.\n\n" + getPartyStatusText(finalId);
                    if (p.reservations.length > 0) exitMsg += "\n\n🔔 알림: 대기 1순위 [" + p.reservations[0] + "]님!\n자리가 났습니다. '참여 " + finalId + "'를 입력해주세요!";
                    replier.reply("💨 파티 퇴장\n\n" + exitMsg);
                }
            }
        }

        if (!isRemoved) {
            replier.reply("⚠️ 탈퇴 실패\n\n[" + finalId + "] 파티에 소속되어 있지 않습니다.");
        }
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
