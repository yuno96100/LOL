/**
 * [main.js] v15.0.0 (Unified Version)
 * - INTEGRATION: v14.9.5(레벨/스탯/최대치) + v9.0.14(로그인/문의뱃지/가입제한)
 * - FEATURE: 유저 ID 10자 제한 및 관리자 목록 실시간 문의 알림 [🔔n]
 * - FEATURE: 능력치 초기화 및 강화 로직 유지
 */

// ━━━━━━━━ [1. 설정 및 시스템 데이터] ━━━━━━━━
var Config = {
    Prefix: ".", 
    AdminHash: "2056407147", 
    AdminRoom: "소환사의협곡관리", 
    GroupRoom: "소환사의협곡",
    BotName: "소환사의 협곡", 
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━", 
    WRAP_LIMIT: 17, 
    DIVIDER_LINE: 14,
    NAV_LEFT: "  ", 
    NAV_RIGHT: " ", 
    NAV_ITEMS: ["⬅️이전", "❌취소", "🏠메뉴"]
};

var MAX_LEVEL = 30; 

var TierData = [
    { name: "챌린저", icon: "✨", minLp: 3000 }, 
    { name: "그랜드마스터", icon: "🔴", minLp: 2500 },
    { name: "마스터", icon: "🟣", minLp: 2000 }, 
    { name: "다이아몬드", icon: "💎", minLp: 1700 },
    { name: "에메랄드", icon: "💚", minLp: 1400 }, 
    { name: "플래티넘", icon: "💿", minLp: 1100 },
    { name: "골드", icon: "🟡", minLp: 800 }, 
    { name: "실버", icon: "⚪", minLp: 500 },
    { name: "브론즈", icon: "🟤", minLp: 200 }, 
    { name: "아이언", icon: "⚫", minLp: 0 }
];

var SystemData = {
    roles: {
        "탱커": { icon: "🛡️", units: ["알리스타", "말파이트", "레오나"] },
        "전사": { icon: "⚔️", units: ["가렌", "다리우스", "잭스"] },
        "암살자": { icon: "🗡️", units: ["제드", "카타리나", "탈론"] },
        "마법사": { icon: "🔮", units: ["럭스", "아리", "빅토르"] },
        "원거리딜러": { icon: "🏹", units: ["애쉬", "베인", "카이사"] },
        "서포터": { icon: "✨", units: ["소라카", "유미", "쓰레쉬"] }
    },
    items: {
        "소모품": [
            { id: "RESET_TICKET", name: "능력치 초기화권", price: 10000, desc: "투자 포인트를 모두 환급합니다." }
        ]
    }
};

var RoleKeys = Object.keys(SystemData.roles);

var Utils = {
    getFixedDivider: function() { return Array(Config.DIVIDER_LINE + 1).join(Config.LINE_CHAR); },
    getNav: function() { return Config.NAV_LEFT + Config.NAV_ITEMS.join("    ") + Config.NAV_RIGHT; },
    wrapText: function(str) {
        if (!str) return "";
        var lines = str.split('\n'), result = [], limit = Config.WRAP_LIMIT;
        for (var i = 0; i < lines.length; i++) {
            var words = lines[i].split(' '), currentLine = "";
            for (var j = 0; j < words.length; j++) {
                var word = words[j];
                if (word.length > limit) {
                    if (currentLine.length > 0) { result.push(currentLine.trim()); currentLine = ""; }
                    var start = 0;
                    while (start < word.length) { result.push(word.substring(start, start + limit)); start += limit; }
                    continue;
                }
                if ((currentLine + word).length > limit) { result.push(currentLine.trim()); currentLine = word + " "; }
                else { currentLine += word + " "; }
            }
            if (currentLine.trim().length > 0) result.push(currentLine.trim());
        }
        return result.join('\n');
    }
};

function getTierInfo(lp) {
    lp = lp || 0;
    for (var i = 0; i < TierData.length; i++) {
        if (lp >= TierData[i].minLp) return { name: TierData[i].name, icon: TierData[i].icon };
    }
    return { name: "아이언", icon: "⚫" };
}

// ━━━━━━━━ [2. UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help, isRoot) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content) + "\n" + div + "\n";
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    renderProfile: function(id, data, help, content, isRoot, session) {
        if (!data) return "데이터 로드 오류";
        var lp = data.lp || 0, tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats || { acc: 50, ref: 50, com: 50, int: 50 };
        var lv = data.level || 1, exp = data.exp || 0, maxExp = lv * 100;
        var div = Utils.getFixedDivider();
        
        var lvLabel = (lv >= MAX_LEVEL) ? "Lv." + MAX_LEVEL + " [Max]" : "Lv." + lv;
        var expBar = (lv >= MAX_LEVEL) ? "Max / Max" : exp + " / " + maxExp;

        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + (data.title || "뉴비") + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n" +
                 "🆙 레벨: " + lvLabel + "\n" +
                 "📊 경험: " + expBar + " EXP\n" +
                 "💰 골드: " + (data.gold || 0).toLocaleString() + " G";
        var s3 = "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)\n" + div + "\n🎯 정확: " + st.acc + " | ⚡ 반응: " + st.ref + "\n🧘 침착: " + st.com + " | 🧠 직관: " + st.int + "\n✨ 포인트: " + (data.point || 0) + " P";
        
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n" + s3 + "\n" + div + "\n";
        
        if (session && (session.screen === "ADMIN_USER_DETAIL" || session.screen === "PROFILE_VIEW")) {
            if (session.type === "ADMIN") {
                res += "1. 정보 수정\n2. 답변 하기\n3. 데이터 초기화\n4. 계정 삭제\n" + div + "\n";
            } else {
                res += "1. 능력치 강화\n2. 능력치 초기화\n" + div + "\n";
            }
        } else if (session && (session.screen === "STAT_UP_MENU" || session.screen === "STAT_UP_INPUT")) {
            res += "1. 정확 강화\n2. 반응 강화\n3. 침착 강화\n4. 직관 강화\n" + div + "\n";
        }

        if (content) res += Utils.wrapText(content.trim()) + "\n" + div + "\n"; 
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    go: function(session, screen, title, content, help, skipHistory) {
        var rootScreens = ["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "GROUP_MAIN"];
        var isRoot = (rootScreens.indexOf(screen) !== -1);
        
        if (session.tempId && Database.data[session.tempId]) session.data = Database.data[session.tempId];

        if (!skipHistory && session.screen && session.screen !== "IDLE" && session.screen !== screen) {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle, content: session.lastContent, help: session.lastHelp });
        }
        session.screen = screen; session.lastTitle = title;
        session.lastContent = content || ""; session.lastHelp = help || "";
        
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("STAT") !== -1 || screen === "ADMIN_USER_DETAIL") {
            var tid = session.targetUser || session.tempId;
            var td = Database.data[tid];
            return UI.renderProfile(tid, td, help, content, isRoot, session);
        }
        return this.make(title, content, help, isRoot);
    },
    renderMenu: function(session) {
        session.history = []; 
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호 입력");
        if (session.type === "GROUP") return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인\n2. 티어 랭킹", "번호 입력");
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 문의하기", "번호 선택");
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", "번호 입력");
    }
};

// ━━━━━━━━ [3. DB 및 세션 관리] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) { 
        return { 
            pw: pw, gold: 1000, level: 1, exp: 0, lp: 0, win: 0, lose: 0, title: "뉴비", 
            point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 },
            inventory: { "RESET_TICKET": 0 },
            collection: { titles: ["뉴비"], characters: [] },
            inquiryCount: 0 
        }; 
    },
    addExp: function(userId, amount) {
        var d = this.data[userId];
        if (!d || d.level >= MAX_LEVEL) return;
        d.exp += amount;
        while (d.exp >= d.level * 100 && d.level < MAX_LEVEL) {
            d.exp -= (d.level * 100);
            d.level++;
            d.point += 5;
            if (d.level >= MAX_LEVEL) { d.exp = 0; break; }
        }
        this.save(this.data);
    }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", lastContent: "", lastHelp: "", tempId: "비회원", userListCache: [], targetUser: null, editType: null, room: r, isDirect: !g };
        var s = this.sessions[h]; s.room = r;
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else { s.type = "DIRECT"; s.isDirect = true; }
        return s;
    },
    reset: function(session) { 
        session.screen = "IDLE"; session.history = []; session.userListCache = []; 
        session.targetUser = null; session.editType = null;
    },
    findUserRoom: function(userId) {
        for (var h in this.sessions) { if (this.sessions[h].tempId === userId) return this.sessions[h].room; }
        return userId;
    },
    forceLogout: function(userId) {
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId) { this.sessions[key].data = null; this.sessions[key].tempId = "비회원"; this.reset(this.sessions[key]); } }
        this.save();
    }
};

// ━━━━━━━━ [4. 관리자 매니저] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        var screen = session.screen;
        if (screen === "ADMIN_MAIN") {
            if (msg === "1") {
                var rt = java.lang.Runtime.getRuntime();
                var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                return replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", "📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명", "조회 완료"));
            }
            if (msg === "2") {
                session.userListCache = Object.keys(Database.data);
                var list = session.userListCache.map(function(id, i){ 
                    var qCount = Database.data[id].inquiryCount || 0;
                    var badge = (qCount > 0) ? " [🔔" + qCount + "]" : "";
                    return (i+1)+". "+id + badge; 
                }).join("\n");
                return replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", list, "번호 입력"));
            }
        }
        if (screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "기능을 선택하세요.", "조회 중"));
            }
        }
        if (screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정\n3. 레벨 수정 (포인트 자동지급)", "항목 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 하기", "["+session.targetUser+"] 답변 입력", "내용 입력"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[" + session.targetUser + "] 초기화?", "'확인' 입력"));
            if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "[" + session.targetUser + "] 삭제?", "'삭제확인' 입력"));
        }
        if (screen === "ADMIN_ANSWER_INPUT") {
            var targetRoom = SessionManager.findUserRoom(session.targetUser);
            Api.replyRoom(targetRoom, UI.make("운영진 답변", msg, "알림", true));
            if(Database.data[session.targetUser]) { Database.data[session.targetUser].inquiryCount = 0; Database.save(Database.data); }
            SessionManager.reset(session); return replier.reply(UI.make("성공", "전송됨", "대기", true));
        }
        if (screen === "ADMIN_EDIT_MENU") {
            var types = {"1":"gold", "2":"lp", "3":"level"};
            if (types[msg]) { session.editType = types[msg]; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "수정", "새로운 값 입력", "숫자")); }
        }
        if (screen === "ADMIN_EDIT_INPUT") {
            var val = parseInt(msg); if (isNaN(val) || val < 1) return replier.reply(UI.make("오류", "1 이상의 숫자만 입력하세요."));
            var targetId = session.targetUser; var targetData = Database.data[targetId];
            if (!targetData) return replier.reply(UI.make("오류", "유저 데이터 유실"));
            var log = ""; 
            if (session.editType === "level") {
                if (val > MAX_LEVEL) val = MAX_LEVEL;
                targetData.level = val; targetData.exp = 0; var p = (val - 1) * 5; 
                targetData.stats = { acc: 50, ref: 50, com: 50, int: 50 }; targetData.point = p; 
                log = "레벨이 " + val + "로 변경되었습니다. (스탯 포인트 " + p + "P 재지급)";
            } else {
                var u = (session.editType === "gold") ? "G" : "LP";
                targetData[session.editType] = val; log = (session.editType === "gold" ? "골드" : "LP") + "가 " + val.toLocaleString() + u + "로 변경되었습니다.";
            }
            Database.save(Database.data);
            Api.replyRoom(SessionManager.findUserRoom(targetId), UI.make("정보 변경 알림", "운영진에 의해 정보가 수정되었습니다.\n\n내용: " + log, "시스템 메시지", true));
            SessionManager.reset(session); return replier.reply(UI.make("수정 완료", targetId + "님의 정보가 업데이트되었습니다.", "대기", true));
        }
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData(Database.data[session.targetUser].pw); Database.save(Database.data);
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("데이터 초기화", "운영진에 의해 데이터가 초기화되었습니다.", "알림", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "초기화됨", "대기", true));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), "운영진에 의해 계정이 삭제되었습니다.");
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser); SessionManager.reset(session);
            return replier.reply(UI.make("성공", "삭제됨", "대기", true));
        }
    }
};

// ━━━━━━━━ [5. 유저 매니저] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        if (session.tempId && Database.data[session.tempId]) session.data = Database.data[session.tempId];
        var d = session.data;

        if (!d) {
            if (session.screen === "GUEST_MAIN") {
                if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디(최대 10자)", "가입"));
                if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디", "로그인"));
                if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "문의", "내용 입력", "전송"));
            }
            if (session.screen === "GUEST_INQUIRY") {
                Api.replyRoom(Config.AdminRoom, UI.make("비회원 문의", "방: " + session.room + "\n내용: " + msg, "회신 불가", true));
                SessionManager.reset(session); return replier.reply(UI.make("완료", "문의 전송됨", "메뉴 복귀", true));
            }
            if (session.screen === "JOIN_ID") {
                if (msg.length > 10) return replier.reply(UI.make("오류", "아이디는 10자 이하만 가능합니다."));
                if (Database.data[msg]) return replier.reply(UI.make("오류", "중복된 아이디"));
                session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비번 설정", "보안"));
            }
            if (session.screen === "JOIN_PW") {
                Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                Api.replyRoom(Config.AdminRoom, "🆕 신규 가입: " + session.tempId);
                session.data = Database.data[session.tempId]; SessionManager.reset(session);
                return replier.reply(UI.make("성공", "가입 성공!", "메뉴를 입력하세요.", true));
            }
            if (session.screen === "LOGIN_ID") { session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비번 입력", "인증")); }
            if (session.screen === "LOGIN_PW") {
                if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                    session.data = Database.data[session.tempId]; SessionManager.reset(session);
                    return replier.reply(UI.make("성공", "로그인됨", "메뉴를 입력하세요.", true));
                }
                return replier.reply(UI.make("실패", "비번 오류"));
            }
            return;
        }

        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "조회"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 대결", "전투"));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 상점\n2. 소모품 상점", "쇼핑"));
            if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의하기", "내용 입력", "전송"));
            if (msg === "6") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃", "종료", true)); }
        }

        if (session.screen === "PROFILE_VIEW") {
            if (msg === "1") return replier.reply(UI.go(session, "STAT_UP_MENU", "능력치 강화", "항목 번호 입력", "포인트: "+(d.point||0)));
            if (msg === "2") {
                var c = (d.inventory && d.inventory["RESET_TICKET"]) || 0;
                return replier.reply(UI.go(session, "STAT_RESET_CONFIRM", "초기화", "보유권: "+c, "'사용' 입력"));
            }
        }

        if (session.screen === "STAT_UP_MENU") {
            var keys = ["acc", "ref", "com", "int"], names = ["정확", "반응", "침착", "직관"];
            var idx = parseInt(msg)-1;
            if (idx >= 0 && idx < 4) {
                session.selectedStat = keys[idx]; session.selectedStatName = names[idx];
                return replier.reply(UI.go(session, "STAT_UP_INPUT", names[idx] + " 강화", "수치 입력 (보유: " + (d.point||0) + "P)", "숫자"));
            }
        }

        if (session.screen === "STAT_UP_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt <= 0) return replier.reply(UI.make("오류", "1 이상의 숫자"));
            if (amt > (d.point || 0)) return replier.reply(UI.make("실패", "포인트 부족"));
            d.stats[session.selectedStat] += amt; d.point -= amt; Database.save(Database.data);
            replier.reply(UI.make("✨ 강화 성공", session.selectedStatName + " +" + amt, "성공", true));
            session.history = [{ screen: "USER_MAIN", title: "메인 메뉴", content: "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", help: "번호 입력" }];
            return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "조회", true));
        }

        if (session.screen === "STAT_RESET_CONFIRM" && msg === "사용") {
            var has = (d.inventory && d.inventory["RESET_TICKET"] > 0);
            if (!has) return replier.reply(UI.make("실패", "초기화권 없음"));
            var ref = (d.stats.acc+d.stats.ref+d.stats.com+d.stats.int)-200;
            d.point += ref; d.stats = {acc:50, ref:50, com:50, int:50}; d.inventory["RESET_TICKET"]--;
            Database.save(Database.data); 
            replier.reply(UI.make("♻️ 초기화 완료", "환급: " + ref + "P", "완료", true));
            session.history = [{ screen: "USER_MAIN", title: "메인 메뉴", content: "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", help: "번호 입력" }];
            return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "조회", true));
        }

        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tL = d.collection.titles.map(function(t, i){ return (i+1)+". "+(t===d.title?"✅ ":"")+t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "칭호 변경", tL, "번호로 장착"));
            }
            if (msg === "2") {
                var cL = (d.collection.characters.length>0)?d.collection.characters.join("\n"):"보유 유닛 없음";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "캐릭터 리스트", cL, "목록"));
            }
        }

        if (session.screen === "COL_TITLE_ACTION") {
            var tI = parseInt(msg)-1;
            if (d.collection.titles[tI]) {
                d.title = d.collection.titles[tI]; Database.save(Database.data);
                return replier.reply(UI.make("성공", "["+d.title+"] 장착 완료!", "변경됨"));
            }
        }

        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "SHOP_ROLES", "역할군 선택", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "번호"));
            if (msg === "2") {
                var it = SystemData.items["소모품"][0];
                return replier.reply(UI.go(session, "SHOP_ITEM_BUY", "소모품 상점", "1. "+it.name+" ("+it.price+"G)", "구매 번호"));
            }
        }

        if (session.screen === "SHOP_ROLES") {
            var rI = parseInt(msg)-1;
            if (RoleKeys[rI]) {
                session.selectedRole = RoleKeys[rI];
                var uL = SystemData.roles[session.selectedRole].units.map(function(u, i){
                    var o = d.collection.characters.indexOf(u) !== -1;
                    return (i+1)+". "+u+(o?" [보유]":" (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uL, "구매 번호"));
            }
        }

        if (session.screen === "SHOP_BUY_ACTION") {
            var uI = parseInt(msg)-1; var us = SystemData.roles[session.selectedRole].units;
            if (us[uI]) {
                if (d.collection.characters.indexOf(us[uI]) !== -1) return replier.reply(UI.make("알림", "보유 중입니다."));
                if (d.gold < 500) return replier.reply(UI.make("실패", "골드 부족"));
                d.gold -= 500; d.collection.characters.push(us[uI]); Database.save(Database.data);
                return replier.reply(UI.make("성공", us[uI]+" 구매 완료", "잔액: "+d.gold));
            }
        }

        if (session.screen === "SHOP_ITEM_BUY" && msg === "1") {
            var it = SystemData.items["소모품"][0];
            if (d.gold < it.price) return replier.reply(UI.make("실패", "골드 부족"));
            d.gold -= it.price; if (!d.inventory) d.inventory = {};
            d.inventory[it.id] = (d.inventory[it.id]||0)+1; Database.save(Database.data);
            return replier.reply(UI.make("성공", "구매 완료", "잔액: "+d.gold));
        }

        if (session.screen === "USER_INQUIRY") {
            d.inquiryCount = (d.inquiryCount || 0) + 1; Database.save(Database.data);
            Api.replyRoom(Config.AdminRoom, UI.make("문의", msg, "ID: "+session.tempId, true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "전송됨", "대기", true));
        }

        if (session.screen === "BATTLE_MAIN" && msg === "1") return replier.reply(UI.go(session, "BATTLE_PREP", "전투 준비", "⚔️ AI 봇 매칭 성공.\n결투를 시작하시겠습니까?", "'시작' 입력"));
        if (session.screen === "BATTLE_PREP" && msg === "시작") {
            SessionManager.reset(session); return replier.reply(UI.make("알림", "전투 로직 준비 중", "메뉴 복귀", true));
        }
    }
};

// ━━━━━━━━ [6. 단체방 매니저] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender) {
        if (session.screen === "GROUP_MAIN") {
            if (msg === "1") {
                if (!session.tempId || session.tempId === "비회원") return replier.reply(UI.make("알림", "개인톡에서 먼저 로그인해주세요."));
                return replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "확인"));
            }
            if (msg === "2") {
                var users = Object.keys(Database.data);
                var rank = users.map(function(id){ return {id:id, lp:Database.data[id].lp||0}; }).sort(function(a,b){return b.lp-a.lp;});
                var txt = "", cnt = Math.min(rank.length, 10);
                for (var i=0; i<cnt; i++) {
                    var u = rank[i], t = getTierInfo(u.lp), m = (i===0)?"🥇":(i===1)?"🥈":(i===2)?"🥉":(i+1)+".";
                    txt += m+" "+u.id+" ("+t.icon+u.lp+" LP)\n";
                }
                return replier.reply(UI.go(session, "GROUP_RANKING", "랭킹 TOP 10", txt, "조회 완료"));
            }
        }
    }
};

// ━━━━━━━━ [7. 메인 핸들러] ━━━━━━━━
Database.data = Database.load(); SessionManager.load();         

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg || msg.indexOf(".업데이트") !== -1) return;
        var hash = String(imageDB.getProfileHash()); 
        var session = SessionManager.get(room, hash, isGroupChat); 
        msg = msg.trim(); 
        
        if (msg === "메뉴") {
            if (isGroupChat) {
                for (var k in SessionManager.sessions) {
                    var s = SessionManager.sessions[k];
                    if (s.isDirect && s.tempId !== "비회원" && s.tempId === sender) {
                        session.tempId = s.tempId; session.data = s.data; break;
                    }
                }
            }
            return replier.reply(UI.renderMenu(session)); 
        }

        if (msg === "취소") {
            if (session.screen === "IDLE") return replier.reply(UI.make("알림", "진행 중 작업 없음", "대기", true));
            SessionManager.reset(session); return replier.reply(UI.make("알림", "취소됨", "대기", true));
        }

        if (msg === "이전" && session.history && session.history.length > 0) {
            var p = session.history.pop();
            session.screen = p.screen; session.lastTitle = p.title; session.lastContent = p.content; session.lastHelp = p.help;
            var root = (["USER_MAIN","ADMIN_MAIN","GUEST_MAIN","GROUP_MAIN"].indexOf(p.screen) !== -1);
            if (p.screen.indexOf("PROFILE") !== -1 || p.screen.indexOf("STAT") !== -1 || p.screen === "ADMIN_USER_DETAIL") {
                return replier.reply(UI.renderProfile(session.targetUser || session.tempId, Database.data[session.targetUser || session.tempId], p.help, p.content, root, session));
            }
            return replier.reply(UI.make(p.title, p.content, p.help, root));
        }

        if (session.screen === "IDLE") return;

        if (session.type === "ADMIN" && hash === Config.AdminHash) AdminManager.handle(msg, session, replier);
        else if (session.type === "GROUP") GroupManager.handle(msg, session, replier, sender);
        else UserManager.handle(msg, session, replier);
        
        SessionManager.save();

    } catch (e) {
        replier.reply(UI.make("⚠️ 오류", e.message.split(":")[0], "'메뉴' 입력", true));
        Api.replyRoom(Config.AdminRoom, "에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
