// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [롤 구인구직 봇] lolgtec.js v31.0.0
 * - 주요 기능: 파티 생성, 참여, 예약, 탈퇴, 삭제
 * - 변경 사항: 메인 파티 귀속형 서브 파티(대기게임) 시스템 도입
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
    
    // 메인 멤버 명단 (구분선/하이픈 없음)
    for (var i = 0; i < p.members.length; i++) {
        var m = p.members[i];
        var noteStr = m.t ? " (" + m.t + ")" : "";
        status += "👤 " + m.n + noteStr + "\n";
    }
    
    // 예약 명단
    if (p.reservations.length > 0) {
        status += "⏳ 예약 : " + p.reservations.join(", ") + "\n";
    }
    
    // 귀속된 서브 파티(대기게임)가 있을 경우 출력
    if (p.sub) {
        status += "\n🎮 [ 대기중 활동 : " + p.sub.mode + " ]\n";
        status += "┗ ⚔️ 참여 : " + p.sub.members.join(", ") + "\n";
    }
    
    return status.replace(/\n$/, "");
}

// 자동 탈퇴 처리 함수 (대기게임 소속도 함께 정리)
function clearUserStatus(user) {
    for (var id in partyDB) {
        var p = partyDB[id];
        
        // 메인 멤버에서 제거
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === user) {
                p.members.splice(i, 1);
                
                // 속해있던 대기게임에서도 이름 제거
                if (p.sub) {
                    var subIdx = p.sub.members.indexOf(user);
                    if (subIdx !== -1) {
                        p.sub.members.splice(subIdx, 1);
                        if (p.sub.members.length === 0) delete p.sub;
                    }
                }
                
                if (p.members.length === 0) delete partyDB[id];
                break;
            }
        }
        
        // 예약 명단에서 제거
        if (partyDB[id]) {
            var resIdx = partyDB[id].reservations.indexOf(user);
            if (resIdx !== -1) partyDB[id].reservations.splice(resIdx, 1);
        }
    }
}

// 유저가 속한 파티 ID 찾는 헬퍼 함수
function findUserParty(user) {
    for (var id in partyDB) {
        var p = partyDB[id];
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === user) return id;
        }
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

    // 1. 명령어 가이드 (대기게임 설명 추가)
    if (msg === "명령어") {
        var help = "\n✨ [ 롤 구인 시스템 메뉴얼 ] ✨\n\n" +
                   "📝 파티 만들기\n" +
                   "👉 모드 시간 분위기 (예: 자랭 22시 즐겜)\n\n" +
                   "🔍 현황 : 전체 파티 보기\n" +
                   "✅ 참여 [파티명] [비고] : 파티 합류\n" +
                   "⏳ 예약 [파티명] : 예약 명단 등록\n" +
                   "❌ 탈퇴 : 파티/예약 취소\n" +
                   "🧨 파티삭제 : 내 파티 해산하기\n\n" +
                   "🎮 대기게임 (메인 파티원 전용 미니게임)\n" +
                   "👉 대기게임 [파티명] [모드] (예: 대기게임 자랭1 칼바람)\n" +
                   "👉 대기참여 [파티명]\n" +
                   "👉 대기탈퇴\n\n" +
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

    // 3. 메인 파티 생성
    var modeMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)(?:\s+|$)/);
    if (modeMatch && msg.indexOf("참여 ") === -1 && msg.indexOf("예약 ") === -1 && msg.indexOf("파티삭제") === -1 && msg.indexOf("대기") === -1) {
        var createMatch = msg.match(/^(내전|아레나|자랭|듀랭|칼바람|기타게임)\s+([^\s]+)\s+(.+)$/);
        if (createMatch) {
            clearUserStatus(sender);

            var mode = createMatch[1]; 
            var pId = getNextPartyId(mode); 
            partyDB[pId] = {
                mode: mode, members: [{n: sender, t: ""}], reservations: [],
                max: maxMembers[mode], time: createMatch[2], vibe: createMatch[3]
            };
            replier.reply("🎉 파티 생성 완료\n\n" + getPartyStatusText(pId));
            return;
        }
    }

    // 4. 메인 파티 참여
    if (msg.indexOf("참여 ") === 0) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        var note = parts.slice(2).join(" "); 
        
        if (!partyDB[targetId]) { replier.reply("⚠️ 참여 실패\n존재하지 않는 파티입니다."); return; }
        var p = partyDB[targetId];
        if (p.members.length >= p.max) { replier.reply("⚠️ 인원 초과\n해당 파티는 꽉 찼습니다.\n'예약 " + targetId + "'을 써서 대기해주세요!"); return; }
        
        var isAlreadyIn = false;
        for (var i = 0; i < p.members.length; i++) if (p.members[i].n === sender) isAlreadyIn = true;
        if (isAlreadyIn) { replier.reply("⚠️ 중복 참여\n이미 해당 파티에 소속되어 있습니다."); return; }

        clearUserStatus(sender);
        p.members.push({n: sender, t: note});
        replier.reply("✅ 파티 참여 완료\n\n" + sender + "님 합류!\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 5. 파티 예약
    if (msg.indexOf("예약 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("⚠️ 예약 실패\n존재하지 않는 파티입니다."); return; }
        
        var p = partyDB[targetId];
        var isAlreadyIn = false;
        for (var i = 0; i < p.members.length; i++) if (p.members[i].n === sender) isAlreadyIn = true;
        if (isAlreadyIn) { replier.reply("⚠️ 중복 예약\n이미 파티에 합류 중입니다."); return; }
        if (p.reservations.indexOf(sender) !== -1) { replier.reply("⚠️ 중복 예약\n이미 예약 명단에 있습니다."); return; }

        // 기존 예약 제거
        for (var id in partyDB) {
            var resIdx = partyDB[id].reservations.indexOf(sender);
            if (resIdx !== -1) partyDB[id].reservations.splice(resIdx, 1);
        }

        p.reservations.push(sender);
        replier.reply("📝 예약 완료\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 6. 대기게임 생성
    if (msg.indexOf("대기게임 ") === 0) {
        var parts = msg.split(" ");
        var targetId = parts[1];
        var subMode = parts[2];
        
        if (!partyDB[targetId]) { replier.reply("⚠️ 존재하지 않는 파티입니다."); return; }
        var p = partyDB[targetId];
        
        var isMember = false;
        for(var i=0; i < p.members.length; i++) if(p.members[i].n === sender) isMember = true;
        
        if (!isMember) { replier.reply("⚠️ 메인 파티 멤버만 대기게임을 생성할 수 있습니다."); return; }
        if (p.sub) { replier.reply("⚠️ 이미 대기게임이 진행 중입니다."); return; }
        if (!subMode) { replier.reply("⚠️ 대기게임 모드를 입력해주세요. (예: 대기게임 자랭1 칼바람)"); return; }

        p.sub = { mode: subMode, members: [sender] };
        replier.reply("🎮 대기게임 오픈 완료\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 7. 대기게임 참여
    if (msg.indexOf("대기참여 ") === 0) {
        var targetId = msg.split(" ")[1];
        if (!partyDB[targetId]) { replier.reply("⚠️ 존재하지 않는 파티입니다."); return; }
        var p = partyDB[targetId];
        
        if (!p.sub) { replier.reply("⚠️ 진행 중인 대기게임이 없습니다."); return; }
        
        var isMember = false;
        for(var i=0; i < p.members.length; i++) if(p.members[i].n === sender) isMember = true;
        if (!isMember) { replier.reply("⚠️ 메인 파티 멤버만 대기게임에 참여할 수 있습니다."); return; }
        if (p.sub.members.indexOf(sender) !== -1) { replier.reply("⚠️ 이미 대기게임에 참여 중입니다."); return; }

        p.sub.members.push(sender);
        replier.reply("⚔️ 대기게임 합류 완료\n\n" + getPartyStatusText(targetId));
        return;
    }

    // 8. 대기게임 탈퇴
    if (msg.indexOf("대기탈퇴") === 0) {
        var targetId = msg.split(" ")[1];
        
        if (!targetId) {
            for(var id in partyDB) {
                if(partyDB[id].sub && partyDB[id].sub.members.indexOf(sender) !== -1) {
                    targetId = id; break;
                }
            }
        }
        
        if (!targetId || !partyDB[targetId] || !partyDB[targetId].sub) { replier.reply("⚠️ 참여 중인 대기게임이 없습니다."); return; }
        var p = partyDB[targetId];
        var idx = p.sub.members.indexOf(sender);
        if (idx === -1) { replier.reply("⚠️ 대기게임에 참여 중이 아닙니다."); return; }

        p.sub.members.splice(idx, 1);
        if (p.sub.members.length === 0) {
            delete p.sub;
            replier.reply("🍃 참여 인원이 없어 대기게임이 종료되었습니다.\n\n" + getPartyStatusText(targetId));
        } else {
            replier.reply("💨 대기게임에서 퇴장했습니다.\n\n" + getPartyStatusText(targetId));
        }
        return;
    }

    // 9. 파티삭제
    if (msg.indexOf("파티삭제") === 0) {
        var targetId = msg.split(" ")[1] || findUserParty(sender);
        if (!targetId || !partyDB[targetId]) { replier.reply("⚠️ 삭제 실패\n소속된 파티가 없거나 이름이 틀렸습니다."); return; }
        
        delete partyDB[targetId];
        replier.reply("🧨 파티 삭제\n\n[" + targetId + "] 파티가 해산되었습니다.");
        return;
    }

    // 10. 메인 파티 탈퇴 / 예약 취소
    if (msg === "탈퇴" || msg === "예약취소") {
        var targetId = findUserParty(sender);
        
        if (!targetId) {
            // 예약 명단 확인
            var resRemoved = false;
            for (var id in partyDB) {
                var resIdx = partyDB[id].reservations.indexOf(sender);
                if (resIdx !== -1) {
                    partyDB[id].reservations.splice(resIdx, 1);
                    replier.reply("💨 예약 취소\n\n[" + id + "] 예약 명단에서 취소되었습니다.");
                    resRemoved = true;
                    break;
                }
            }
            if (!resRemoved) replier.reply("⚠️ 탈퇴 실패\n참여 중인 파티나 예약 명단이 없습니다.");
            return;
        }

        var p = partyDB[targetId];
        
        // 메인 멤버에서 제거 및 대기게임 동시 정리
        for (var i = 0; i < p.members.length; i++) {
            if (p.members[i].n === sender) {
                p.members.splice(i, 1);
                if (p.sub) {
                    var subIdx = p.sub.members.indexOf(sender);
                    if (subIdx !== -1) {
                        p.sub.members.splice(subIdx, 1);
                        if (p.sub.members.length === 0) delete p.sub;
                    }
                }
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
        return;
    }
}
//=== 수정 끝 ===
// (파일 최하단)
