/**
 * [main.js] v8.9.99
 * 1. 네비바 롤백: 이모지 포함 가로형 (◀이전 | ✖취소 | 🏠메뉴)
 * 2. 방 타입별 로직 완전 분리 (Admin / Group / Direct)
 * 3. 단톡방 로그인 연동: 개인톡 세션 자동 동기화
 * 4. 생략 없는 전체 로직 포함
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",
    AdminRoom: "소환사의협곡관리",
    GroupRoom: "소환사의협곡",
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 17,
    // 네비게이션 바 가로형 롤백
    NAV_BAR: "◀이전 | ✖취소 | 🏠메뉴"
};

var Utils = {
    getFixedDivider: function() { return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); }
};

var TierData = [
    { name: "챌린저", icon: "✨", minLp: 3000 }, { name: "그랜드마스터", icon: "🔴", minLp: 2500 },
    { name: "마스터", icon: "🟣", minLp: 2000 }, { name: "다이아몬드", icon: "💎", minLp: 1700 },
    { name: "에메랄드", icon: "💚", minLp: 1400 }, { name: "플래티넘", icon: "💿", minLp: 1100 },
    { name: "골드", icon: "🟡", minLp: 800 }, { name: "실버", icon: "⚪", minLp: 500 },
    { name: "브론즈", icon: "🟤", minLp: 200 }, { name: "아이언", icon: "⚫", minLp: 0 }
];

var SystemData = {
    roles: {
        "탱커": { icon: "🛡️", units: ["알리스타", "말파이트", "레오나"] },
        "전사": { icon: "⚔️", units: ["가렌", "다리우스", "잭스"] },
        "암살자": { icon: "🗡️", units: ["제드", "카타리나", "탈론"] },
        "마법사": { icon: "🔮", units: ["럭스", "아리", "빅토르"] },
        "원거리딜러": { icon: "🏹", units: ["애쉬", "베인", "카이사"] },
        "서포터": { icon: "✨", units: ["소라카", "유미", "쓰레쉬"] }
    }
};

var RoleKeys = Object.keys(SystemData.roles);

function getTierInfo(lp) {
    lp = lp || 0;
    for (var i = 0; i < TierData.length; i++) {
        if (lp >= TierData[i].minLp) return { name: TierData[i].name, icon: TierData[i].icon };
    }
    return { name: "아이언", icon: "⚫" };
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help, showNav) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + content + "\n" + div + "\n";
        
        if (help) {
            res += "💡 " + help;
            if (showNav) {
                res += "\n" + div + "\n" + Config.NAV_BAR + "\n" + div + "\n";
            } else {
                res += "\n" + div;
            }
        } else if (showNav) {
            res += Config.NAV_BAR + "\n" + div + "\n";
        }
        return res;
    },
    finish: function(title, content) {
        var div = Utils.getFixedDivider();
        return "『 " + title + " 』\n" + div + "\n" + content + "\n" + div + "\n🏁 작업 완료: ['메뉴'] 입력\n" + div;
    },
    renderProfile: function(id, data, help, content, showNav) {
        var lp = data.lp || 0;
        var tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var div = Utils.getFixedDivider();
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n💰 골드: " + (data.gold || 0).toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n";
        
        if (content) res += content + "\n" + div + "\n"; 
        if (help) {
            res += "💡 " + help;
            if (showNav) {
                res += "\n" + div + "\n" + Config.NAV_BAR + "\n" + div + "\n";
            } else {
                res += "\n" + div;
            }
        }
        return res;
    },
    go: function(session, screen, title, content, help) {
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
        session.screen = screen;
        session.lastTitle = title;
        var showNav = (session.history && session.history.length > 0);

        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("DETAIL") !== -1) {
            var tid = session.targetUser || session.tempId;
            var td = (session.targetUser) ? Database.data[session.targetUser] : session.data;
            return UI.renderProfile(tid, td, help, content, showNav);
        }
        return this.make(title, content, help, showNav);
    },
    renderMenu: function(session) {
        session.history = []; 
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호를 입력하세요.");
        if (session.type === "GROUP") {
            if (!session.data) { session.screen = "IDLE"; return UI.make("알림", "'시스템' 개인톡에서\n로그인을 해주세요.", "보안이 필요합니다.", false); }
            return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인", "번호를 입력하세요.");
        }
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인", "번호를 선택하세요.");
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 로그아웃", "작업 번호를 입력하세요.");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) { return { pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } }; }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", tempId: null, userListCache: [], targetUser: null };
        var s = this.sessions[h];
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else s.type = "DIRECT";
        return s;
    },
    reset: function(session) { session.screen = "IDLE"; session.history = []; session.userListCache = []; session.targetUser = null; },
    forceLogout: function(userId) {
        for (var key in this.sessions) { 
            if (this.sessions[key].tempId === userId) { 
                this.sessions[key].data = null; this.sessions[key].tempId = null; 
                this.sessions[key].screen = "IDLE"; this.sessions[key].history = []; 
            } 
        }
    }
};

// ━━━━━━━━ [4. 매니저: 관리자 시스템] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        var screen = session.screen;
        if (screen === "ADMIN_MAIN") {
            if (msg === "1") {
                var used = Math.floor((java.lang.Runtime.getRuntime().totalMemory() - java.lang.Runtime.getRuntime().freeMemory()) / 1024 / 1024);
                return replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", "📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명", "조회 완료", true));
            }
            if (msg === "2") {
                session.userListCache = Object.keys(Database.data);
                var list = session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n");
                return replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", list, "번호 입력", true));
            }
        }
        if (screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 정보 수정\n2. 데이터 초기화\n3. 계정 삭제", "선택", true));
            }
        }
        if (screen === "ADMIN_USER_DETAIL") {
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화 확인", "[" + session.targetUser + "] 님의 데이터를 초기화하시겠습니까?", "'확인' 입력 시 실행", true));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "삭제 확인", "[" + session.targetUser + "] 님의 계정을 삭제하시겠습니까?", "'삭제확인' 입력 시 실행", true));
        }
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData(Database.data[session.targetUser].pw);
            Database.save(Database.data); SessionManager.reset(session);
            return replier.reply(UI.finish("완료", session.targetUser + " 님\n데이터 초기화 완료"));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser); SessionManager.reset(session);
            return replier.reply(UI.finish("완료", session.targetUser + " 님\n계정 삭제 완료"));
        }
    }
};

// ━━━━━━━━ [5. 매니저: 개인톡(User) 시스템] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        var d = session.data;
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN": 
                    if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디를 입력하세요.", "가입"));
                    if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디를 입력하세요.", "보안 인증"));
                    break;
                case "JOIN_ID": 
                    if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 있는 아이디입니다.", "재입력", true));
                    session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호를 설정하세요.", "설정"));
                case "JOIN_PW": 
                    Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                    SessionManager.reset(session); return replier.reply(UI.finish("가입 완료", "['메뉴'] 입력 후 로그인하세요."));
                case "LOGIN_ID": 
                    session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비밀번호를 입력하세요.", "인증"));
                case "LOGIN_PW": 
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId]; return replier.reply(UI.renderMenu(session));
                    }
                    return replier.reply(UI.make("오류", "정보 불일치", "인증 실패", true));
            }
            return;
        }

        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "나의 요약 정보"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "수집 현황"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 봇 매칭", "전장 선택"));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 구매", "골드 소비"));
            if (msg === "5") { SessionManager.reset(session); session.data = null; session.tempId = null; return replier.reply(UI.finish("로그아웃", "종료되었습니다.")); }
        }
        
        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_VIEW", "보유 칭호", tList, "장착할 번호 선택"));
            }
            if (msg === "2") {
                var cList = (d.collection.characters.length > 0) ? d.collection.characters.join("\n") : "보유 유닛이 없습니다.";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 리스트", cList, "나의 팀원"));
            }
        }
        if (session.screen === "COL_TITLE_VIEW") {
            var tIdx = parseInt(msg) - 1;
            if (d.collection.titles[tIdx]) {
                d.title = d.collection.titles[tIdx]; Database.save(Database.data);
                SessionManager.reset(session); return replier.reply(UI.finish("변경 성공", "칭호가 변경되었습니다."));
            }
        }
        if (session.screen === "SHOP_MAIN" && msg === "1") return replier.reply(UI.go(session, "SHOP_ROLES", "상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "카테고리 선택"));
        if (session.screen === "SHOP_ROLES") {
            var rIdx = parseInt(msg) - 1;
            if (RoleKeys[rIdx]) {
                session.selectedRole = RoleKeys[rIdx];
                var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                    var owned = d.collection.characters.indexOf(u) !== -1;
                    return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "번호 입력"));
            }
        }
        if (session.screen === "SHOP_BUY_ACTION") {
            var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
            if (units[uIdx]) {
                var target = units[uIdx];
                if (d.collection.characters.indexOf(target) !== -1) return replier.reply(UI.make("알림", "이미 보유 중!", "취소", true));
                if (d.gold < 500) { SessionManager.reset(session); return replier.reply(UI.finish("실패", "골드가 부족합니다.")); }
                d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                SessionManager.reset(session); return replier.reply(UI.finish("성공", target + " 영입 완료!"));
            }
        }
        if (session.screen === "BATTLE_MAIN" && msg === "1") return replier.reply(UI.go(session, "BATTLE_AI_MATCHING", "매칭 중", "🤖 AI 상대를 탐색 중...", "아무 글자나 입력하여 수락"));
        if (session.screen === "BATTLE_AI_MATCHING") return replier.reply(UI.go(session, "BATTLE_PREP", "전투 준비", "⚔️ 매칭 성공!\n전투를 시작하시겠습니까?", "'시작' 입력 시 개시"));
        if (session.screen === "BATTLE_PREP" && msg === "시작") {
            SessionManager.reset(session); return replier.reply(UI.finish("전투 종료", "⚔️ 전투가 완료되었습니다."));
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방(Group) 시스템] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier) {
        if (session.screen === "GROUP_MAIN" && msg === "1") return replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "전적 확인", true));
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load(); 
SessionManager.load();         

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg) return; 
        var hash = String(imageDB.getProfileHash()); 
        var session = SessionManager.get(room, hash, isGroupChat); 
        msg = msg.trim(); 
        
        // 1. 공통 기능: 취소
        if (msg === "취소" || msg === "✖취소") {
            if (session.screen === "IDLE") return;
            session.preCancelScreen = session.screen;
            session.screen = "CANCEL_CONFIRM";
            return replier.reply(UI.make("확인", "작업을 중단하시겠습니까?", "'확인' 시 중단 / '거절' 시 복귀", false));
        }
        if (session.screen === "CANCEL_CONFIRM") {
            if (msg === "확인") { SessionManager.reset(session); return replier.reply(UI.finish("중단됨", "비활성화되었습니다.")); }
            if (msg === "거절") { session.screen = session.preCancelScreen; return replier.reply(UI.make("복구", "이전 단계로 돌아왔습니다.", "명령어를 입력하세요.", true)); }
            return;
        }

        // 2. 공통 기능: 메뉴 (단톡방 세션 연동 포함)
        if (msg === "메뉴" || msg === "🏠메뉴") {
            if (isGroupChat && room === Config.GroupRoom) {
                for (var k in SessionManager.sessions) {
                    var s = SessionManager.sessions[k];
                    if (s.type === "DIRECT" && s.tempId === sender && s.data) {
                        session.data = s.data; 
                        session.tempId = s.tempId; 
                        break;
                    }
                }
            }
            return replier.reply(UI.renderMenu(session));
        }

        // 3. 공통 기능: 이전
        if ((msg === "이전" || msg === "◀이전") && session.history && session.history.length > 0) {
            var p = session.history.pop();
            session.screen = p.screen; session.lastTitle = p.title;
            if (session.screen === "USER_MAIN") return replier.reply(UI.renderMenu(session));
            return replier.reply(UI.go(session, session.screen, session.lastTitle, "", "이전 단계입니다."));
        }

        if (session.screen === "IDLE") return;
        
        // 4. 방 타입별 매니저 호출
        if (session.type === "ADMIN" && hash === Config.AdminHash) AdminManager.handle(msg, session, replier);
        else if (session.type === "GROUP") GroupManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        
        SessionManager.save();
    } catch (e) { 
        Api.replyRoom(Config.AdminRoom, "오류: " + e.message + " (L:" + e.lineNumber + ")"); 
    }
}
