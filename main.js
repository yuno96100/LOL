/*
 * 🏰 소환사의 협곡 Bot - FINAL ULTIMATE FIX (v1.5.6 Stable Timeout)
 * - 버그 수정: 안드로이드 백그라운드 제한으로 인해 세션이 몰래 초기화되던 현상(Thread) 제거
 * - 로직 롤백: 가장 안정적인 '동기식 타임아웃(유저가 다음 입력을 할 때 만료 여부 즉시 판단 후 출력)'으로 복구
 */ 

// ━━━━━━━━ [1. 설정 및 인프라] ━━━━━━━━
var Config = {
    Version: "v1.5.6 Stable",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14,
    WRAP_LIMIT: 18, 
    TIMEOUT_MS: 10000 // 정상적으로 5분(300000) 세팅
};

var MAX_LEVEL = 30;
var POINT_PER_LEVEL = 5;

var Utils = {
    getFixedDivider: function() { 
        return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); 
    },
    
    get24HTime: function() {
        var d = new Date();
        var y = d.getFullYear();
        var m = (d.getMonth() + 1); m = m < 10 ? "0" + m : m;
        var dt = d.getDate(); dt = dt < 10 ? "0" + dt : dt;
        var h = d.getHours(); h = h < 10 ? "0" + h : h;
        var min = d.getMinutes(); min = min < 10 ? "0" + min : min;
        return y + "-" + m + "-" + dt + " " + h + ":" + min;
    },
    
    wrapText: function(str) {
        if (!str) return "";
        var lines = str.split("\n"), result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.length <= Config.WRAP_LIMIT) { 
                result.push(line);
            } else { 
                var currentLine = "";
                for (var j = 0; j < line.length; j++) {
                    currentLine += line[j];
                    if (currentLine.length >= Config.WRAP_LIMIT) {
                        while (j + 1 < line.length && /^[.,!?()]$/.test(line[j + 1])) {
                            currentLine += line[j + 1];
                            j++;
                        }
                        result.push(currentLine);
                        currentLine = "";
                    }
                }
                if (currentLine) result.push(currentLine);
            }
        }
        return result.join("\n");
    },

    getTierInfo: function(lp) {
        if (lp >= 3000) return { name: "챌린저", icon: "💎" };
        if (lp >= 2500) return { name: "그랜드마스터", icon: "👑" };
        if (lp >= 2000) return { name: "마스터", icon: "🔮" };
        if (lp >= 1700) return { name: "다이아몬드", icon: "💠" };
        if (lp >= 1400) return { name: "에메럴드", icon: "💚" };
        if (lp >= 1100) return { name: "플래티넘", icon: "💿" };
        if (lp >= 800) return { name: "골드", icon: "🥇" };
        if (lp >= 500) return { name: "실버", icon: "🥈" };
        if (lp >= 200) return { name: "브론즈", icon: "🥉" };
        return { name: "아이언", icon: "⚫" };
    },
    
    sendNotify: function(target, msg) {
        try {
            var frame = LayoutManager.renderFrame(ContentManager.title.notice, msg, false, "시스템 알림");
            Api.replyRoom(target, frame);
        } catch(e) {}
    }
};

// ━━━━━━━━ [2. 데이터베이스] ━━━━━━━━
var Database = {
    data: {}, inquiries: [],
    
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (file.exists()) {
            try {
                var content = FileStream.read(Config.DB_PATH);
                var d = JSON.parse(content);
                this.data = d.users || {};
                this.inquiries = d.inquiries || [];
            } catch (e) {
                this.data = {}; this.inquiries = [];
            }
        }
    },
    
    save: function() {
        var saveData = { users: this.data, inquiries: this.inquiries };
        FileStream.write(Config.DB_PATH, JSON.stringify(saveData, null, 4));
    },

    createUser: function(sender, pw) {
        this.data[sender] = {
            pw: pw, name: sender, title: "뉴비", lp: 0, win: 0, lose: 0, level: 1, exp: 0, gold: 1000, point: 0,
            stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { titles: ["뉴비"], champions: [] }, items: { statReset: 0, nameChange: 0 }, banned: false
        };
        this.save();
    }
};

// ━━━━━━━━ [세션 매니저 (가장 안정적인 방식 복구)] ━━━━━━━━
var SessionManager = {
    sessions: {},
    
    init: function() {
        var file = new java.io.File(Config.SESSION_PATH);
        if (file.exists()) {
            try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch (e) { this.sessions = {}; }
        }
    },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions, null, 4)); },
    
    getKey: function(room, sender) { return room + "_" + sender; },
    
    get: function(room, sender) {
        var key = this.getKey(room, sender);
        if (!this.sessions[key]) {
            this.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
            this.save();
        }
        return this.sessions[key];
    },
    
    checkTimeout: function(room, sender, replier) {
        var key = this.getKey(room, sender);
        var s = this.get(room, sender);
        
        // [핵심] 유저가 메시지를 보냈을 때, 이전 기록과 비교하여 5분이 지났으면 무조건 만료창 출력!
        if (s && s.screen !== "IDLE" && (Date.now() - s.lastTime > Config.TIMEOUT_MS)) {
            var backupId = s.tempId;
            this.reset(room, sender);
            if(backupId) { this.sessions[key].tempId = backupId; this.save(); } // 로그인 유지
            
            replier.reply(LayoutManager.renderFrame(ContentManager.title.notice, "⌛ 시간이 초과되어 세션이 만료되었습니다.", false, "다시 이용하시려면 '메뉴'를 입력하세요."));
            return true; 
        }
        
        // 만료되지 않았다면 시간 최신화
        if (s) { 
            s.lastTime = Date.now(); 
            this.save(); 
        }
        return false;
    },
    
    reset: function(room, sender) {
        var key = this.getKey(room, sender);
        this.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        this.save();
    }
};

SessionManager.init();

// ━━━━━━━━ [3. 콘텐츠 매니저] ━━━━━━━━
var ContentManager = {
    menus: {
        guest: ["1. 회원가입", "2. 로그인", "3. 운영진 문의"],
        main: ["1. 내 정보", "2. 컬렉션 확인", "3. 대전 모드", "4. 상점 이용", "5. 운영진 문의", "6. 로그아웃"],
        profileSub: ["1. 능력치 강화", "2. 능력치 초기화"],
        stats: ["1. 정확", "2. 반응", "3. 침착", "4. 직관"],
        shopMain: ["1. 아이템 상점", "2. 챔피언 상점"],
        shopItems: ["1. 닉네임 변경권 (500G)", "2. 스탯 초기화권 (1500G)"],
        adminUser: ["1. 정보 수정", "2. 데이터 초기화", "3. 계정 삭제", "4. 차단/해제"],
        adminEdit: ["1. 골드 수정", "2. LP 수정", "3. 레벨 수정"],
        yesNo: ["1. 예", "2. 아니오"]
    },
    title: {
        error: "오류", fail: "실패", success: "성공", complete: "완료", notice: "알림", sysError: "시스템 오류"
    },
    statMap: {
        keys: {"1":"acc", "2":"ref", "3":"com", "4":"int"},
        names: {"1":"정확", "2":"반응", "3":"침착", "4":"직관"}
    },
    msg: {
        welcome: "소환사의 협곡에 오신 것을 환영합니다.\n원하시는 기능을 선택해 주세요.",
        inputID_Join: "사용하실 아이디를 입력해 주세요.",
        inputID_Login: "로그인할 아이디를 입력해 주세요.",
        inputPW: "비밀번호를 입력해 주세요.",
        registerComplete: "가입이 완료되었습니다!\n자동으로 로그인됩니다.",
        loginFail: "정보가 일치하지 않습니다.",
        notEnoughGold: "골드가 부족합니다.",
        onlyNumber: "숫자만 입력해 주세요.",
        banned: "🚫 관리자에 의해 이용이 제한된 계정입니다.",
        battlePrep: "⚔️ 대전 모드는 현재 준비 중입니다.",
        adminSelectUser: "관리할 유저의 번호를 입력하세요.",
        
        cancel: "진행 중인 작업을 중단하고 대기 상태로 전환합니다.",
        noPrevious: "이전 단계가 없습니다.\n현재 화면을 다시 불러옵니다.",
        logout: "성공적으로 로그아웃되었습니다.",
        noItem: "보유 중인 스탯 초기화권이 없습니다.\n상점에서 먼저 구매해 주세요.",
        statResetSuccess: "스탯이 초기화되고 투자했던 포인트가 모두 반환되었습니다.",
        
        buySuccess: function(item) { return item + " 구매 완료!\n인벤토리에 보관되었습니다."; },
        statResetConfirm: function(count) {
            return "정말로 능력치를 초기화하시겠습니까?\n(투자한 포인트는 100% 반환됩니다.)\n\n- 보유 초기화권: " + count + "개";
        },
        statEnhanceConfirm: function(stat, amt) { return "[" + stat + "] 능력치를 " + amt + "만큼 강화하시겠습니까?"; },
        
        adminEditConfirm: function(type, val) { return "[" + type + "] 수치를 " + val + "(으)로 수정하시겠습니까?"; },
        adminActionConfirm: function(action) { return "정말로 해당 유저의 [" + action + "] 작업을 진행하시겠습니까?"; },
        
        adminNotifyInit: "관리자에 의해 계정 데이터가 초기화되었습니다.",
        adminNotifyDelete: "관리자에 의해 계정이 영구 삭제되었습니다.",
        adminNotifyBan: "관리자에 의해 계정이 [이용 차단] 상태로 변경되었습니다.",
        adminNotifyUnban: "관리자에 의해 계정이 [차단 해제] 상태로 변경되었습니다.",
        adminNotifyEdit: function(type, val) { return "관리자에 의해 [" + type + "] 정보가 " + val + "(으)로 수정되었습니다."; }
    },
    champions: ["알리스타", "말파이트", "레오나", "가렌", "다리우스", "잭스", "제드", "카타리나", "탈론", "럭스", "아리", "빅토르", "애쉬", "베인", "카이사", "소라카", "유미", "쓰레쉬"]
};

// ━━━━━━━━ [4. 레이아웃 매니저] ━━━━━━━━
var LayoutManager = {
    renderFrame: function(title, content, showNav, footer) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content);

        if (showNav === true) res += "\n" + div + "\n[ ◀이전 | ✖취소 | 🏠메뉴 ]";
        else if (Array.isArray(showNav)) res += "\n" + div + "\n[ " + showNav.join(" | ") + " ]";

        if (footer) res += "\n" + div + "\n💡 " + footer;
        return res;
    },
    renderAlert: function(title, content) {
        return this.renderFrame(title, content, false, "잠시만 기다려주세요...");
    },
    renderProfileHead: function(data, targetName) {
        var div = Utils.getFixedDivider();
        var tier = Utils.getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats;
        var expDisplay = (data.level >= MAX_LEVEL) ? "MAX" : data.exp + "/" + (data.level * 100);
        var banStatus = data.banned ? " [🚫차단]" : "";

        var lines = [
            "👤 대상: " + targetName + banStatus,
            "🏅 칭호: [" + data.title + "]", div,
            "🏅 티어: " + tier.icon + tier.name,
            "🏆 점수: " + data.lp + " LP",
            "💰 골드: " + (data.gold || 0).toLocaleString() + " G",
            "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)",
            "🆙 레벨: Lv." + data.level,
            "🔷 경험: (" + expDisplay + ")", div,
            " [ 상세 능력치 ]",
            "🎯 정확: " + st.acc, "⚡ 반응: " + st.ref, "🧘 침착: " + st.com, "🧠 직관: " + st.int, div,
            "✨ 포인트: " + (data.point || 0) + " P"
        ];
        return lines.join("\n");
    },
    templates: {
        menuList: function(subtitle, items) {
            var list = items || []; return " " + list.join("\n "); 
        },
        inputRequest: function(subtitle, currentVal, info) {
            var lines = [" 현재 상태 : " + currentVal, " " + info, "", " 값을 입력하세요."];
            return lines.join("\n");
        }
    }
};

// ━━━━━━━━ [5. 시스템 액션] ━━━━━━━━
var SystemAction = {
    go: function(replier, title, msg, nextFunc) {
        replier.reply(LayoutManager.renderAlert(title, msg));
        java.lang.Thread.sleep(1200); 
        if (nextFunc) nextFunc();
    }
};

// ━━━━━━━━ [6. 컨트롤러] ━━━━━━━━

// 6-1. 인증 컨트롤러
var AuthController = {
    handle: function(msg, session, sender, replier, room) {
        if (msg === "refresh_screen") {
            if (session.screen === "IDLE" || session.screen === "GUEST_MAIN") {
                session.screen = "GUEST_MAIN";
                return replier.reply(LayoutManager.renderFrame("비회원 메뉴", LayoutManager.templates.menuList(null, ContentManager.menus.guest), false, "번호를 선택하세요.")); 
            }
            if (session.screen === "JOIN_ID") return replier.reply(LayoutManager.renderFrame("회원가입", ContentManager.msg.inputID_Join, true, "아이디 입력"));
            if (session.screen === "JOIN_PW") return replier.reply(LayoutManager.renderFrame("비밀번호 설정", ContentManager.msg.inputPW, true, "비밀번호 입력"));
            if (session.screen === "LOGIN_ID") return replier.reply(LayoutManager.renderFrame("로그인", ContentManager.msg.inputID_Login, true, "아이디 입력"));
            if (session.screen === "LOGIN_PW") return replier.reply(LayoutManager.renderFrame("로그인", ContentManager.msg.inputPW, true, "비밀번호 입력"));
            if (session.screen === "GUEST_INQUIRY") return replier.reply(LayoutManager.renderFrame("문의 접수", "운영진에게 보낼 내용을 입력하세요.", true, "내용 입력"));
        }

        if (session.screen === "GUEST_MAIN") {
            if (msg === "1") { session.screen = "JOIN_ID"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "LOGIN_ID"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { session.screen = "GUEST_INQUIRY"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
        }

        if (session.screen === "JOIN_ID") {
            if (msg.length > 10) return SystemAction.go(replier, ContentManager.title.error, "아이디는 10자 이내여야 합니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            if (Database.data[msg]) return SystemAction.go(replier, ContentManager.title.error, "이미 존재하는 아이디입니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            session.temp.id = msg; session.screen = "JOIN_PW";
            return AuthController.handle("refresh_screen", session, sender, replier, room);
        }
        if (session.screen === "JOIN_PW") {
            Database.createUser(session.temp.id, msg); Database.load(); 
            session.tempId = session.temp.id; 
            session.screen = "MAIN"; 
            SessionManager.save(); 
            try { Utils.sendNotify(Config.AdminRoom, "📢 [신규 유저] " + session.temp.id + "님이 가입했습니다."); } catch(e) {}
            return SystemAction.go(replier, ContentManager.title.success, ContentManager.msg.registerComplete, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
        }

        if (session.screen === "LOGIN_ID") {
            if (!Database.data[msg]) return SystemAction.go(replier, ContentManager.title.error, "존재하지 않는 아이디입니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            session.temp.id = msg; session.screen = "LOGIN_PW";
            return AuthController.handle("refresh_screen", session, sender, replier, room);
        }
        if (session.screen === "LOGIN_PW") {
            var userData = Database.data[session.temp.id];
            if (userData && userData.pw === msg) {
                session.tempId = session.temp.id; 
                session.screen = "MAIN"; 
                SessionManager.save(); 
                return SystemAction.go(replier, ContentManager.title.success, session.tempId + "님 환영합니다!", function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            } else {
                return SystemAction.go(replier, ContentManager.title.fail, ContentManager.msg.loginFail, function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            }
        }
        
        if (session.screen === "GUEST_INQUIRY") {
            Database.inquiries.push({ sender: "비회원(" + sender + ")", room: room, content: msg, time: Utils.get24HTime(), read: false });
            Database.save(); SessionManager.reset(room, sender);
            try { Utils.sendNotify(Config.AdminRoom, "🔔 새 문의가 접수되었습니다.\n보낸이: 비회원(" + sender + ")"); } catch(e){}
            return SystemAction.go(replier, ContentManager.title.complete, "문의가 접수되었습니다.", function(){ AuthController.handle("refresh_screen", SessionManager.get(room, sender), sender, replier, room); });
        }
    }
};

// 6-2. 유저 컨트롤러
var UserController = {
    handle: function(msg, session, sender, replier, room) {
        var data = Database.data[session.tempId]; 
        if (data && !data.items) { data.items = { statReset: 0, nameChange: 0 }; Database.save(); }
        if (!data) return AuthController.handle(msg, session, sender, replier, room);
        if (data.banned) return replier.reply(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.banned, false, null));

        if (msg === "refresh_screen") {
            if (session.screen === "MAIN") {
                return replier.reply(LayoutManager.renderFrame("메인 로비", LayoutManager.templates.menuList(null, ContentManager.menus.main), false, "메뉴를 선택하세요."));
            }
            if (session.screen === "PROFILE_MAIN") {
                var head = LayoutManager.renderProfileHead(data, session.tempId);
                return replier.reply(LayoutManager.renderFrame("내 정보", head + "\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.profileSub), true, "작업을 선택하세요."));
            }
            if (session.screen === "STAT_SELECT") {
                return replier.reply(LayoutManager.renderFrame("능력치 강화", LayoutManager.templates.menuList(null, ContentManager.menus.stats), true, "강화할 스탯 선택"));
            }
            if (session.screen === "STAT_RESET_CONFIRM") {
                var tCount = data.items.statReset || 0;
                var body = ContentManager.msg.statResetConfirm(tCount) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo);
                return replier.reply(LayoutManager.renderFrame("초기화 확인", body, true, "번호 선택"));
            }
            if (session.screen === "STAT_INPUT") {
                var body = LayoutManager.templates.inputRequest(null, data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P");
                return replier.reply(LayoutManager.renderFrame(session.temp.statName + " 강화", body, true, "투자할 포인트를 입력하세요."));
            }
            if (session.screen === "STAT_INPUT_CONFIRM") {
                var body = ContentManager.msg.statEnhanceConfirm(session.temp.statName, session.temp.statAmt) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo);
                return replier.reply(LayoutManager.renderFrame("강화 최종 확인", body, true, "번호 선택"));
            }
            if (session.screen === "COLLECTION_MAIN") {
                var body = LayoutManager.templates.menuList(null, ["1. 보유 칭호", "2. 보유 챔피언"]);
                return replier.reply(LayoutManager.renderFrame("컬렉션", body, true, "번호를 선택하세요."));
            }
            if (session.screen === "TITLE_EQUIP") {
                 var head = "👑 현재 칭호: [" + data.title + "]";
                 var list = data.inventory.titles.map(function(t, i) { return (i+1) + ". " + t + (t === data.title ? " [장착중]" : ""); }).join("\n");
                 return replier.reply(LayoutManager.renderFrame("칭호 관리", head + "\n" + Utils.getFixedDivider() + "\n" + list, true, "장착할 칭호 이름을 정확히 입력해 주세요."));
            }
            if (session.screen === "CHAMP_LIST") {
                 if (!data.inventory.champions) data.inventory.champions = [];
                 var head = "📊 수집 챔피언: " + data.inventory.champions.length + "명";
                 var list = (data.inventory.champions.length > 0) ? data.inventory.champions.map(function(c, i){ return (i+1) + ". " + c; }).join("\n") : "보유한 챔피언이 없습니다.";
                 return replier.reply(LayoutManager.renderFrame("챔피언 목록", head + "\n" + Utils.getFixedDivider() + "\n" + list, true, "목록 확인 완료"));
            }
            if (session.screen === "SHOP_MAIN") {
                return replier.reply(LayoutManager.renderFrame("상점", LayoutManager.templates.menuList(null, ContentManager.menus.shopMain), true, "상점 카테고리를 선택하세요."));
            }
            if (session.screen === "SHOP_ITEMS") {
                var head = "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G";
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.shopItems);
                return replier.reply(LayoutManager.renderFrame("아이템 상점", head + "\n" + Utils.getFixedDivider() + "\n" + body, true, "구매할 번호를 입력하세요."));
            }
            if (session.screen === "SHOP_CHAMPS") {
                if (!data.inventory.champions) data.inventory.champions = [];
                var head = "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G";
                var cList = ContentManager.champions.map(function(c, i){ return (i+1) + ". " + c + (data.inventory.champions.indexOf(c)!==-1?" [보유]":""); }).join("\n");
                return replier.reply(LayoutManager.renderFrame("챔피언 상점 (500G)", head + "\n" + Utils.getFixedDivider() + "\n" + cList, true, "영입할 번호를 입력하세요."));
            }
            if (session.screen === "USER_INQUIRY") {
                return replier.reply(LayoutManager.renderFrame("문의 접수", "운영진에게 보낼 내용을 입력해 주세요.", true, "내용 입력"));
            }
        }

        if (session.screen === "MAIN") {
            if (msg === "1") { session.screen = "PROFILE_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "COLLECTION_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { return replier.reply(LayoutManager.renderFrame("대전 모드", ContentManager.msg.battlePrep, true, "준비 중...")); }
            if (msg === "4") { session.screen = "SHOP_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "5") { session.screen = "USER_INQUIRY"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "6") { 
                var backupId = session.tempId; 
                SessionManager.reset(room, sender); 
                return SystemAction.go(replier, ContentManager.title.notice, ContentManager.msg.logout, function() {
                    AuthController.handle("refresh_screen", SessionManager.get(room, sender), sender, replier, room);
                });
            }
        }

        if (session.screen === "PROFILE_MAIN") {
            if (msg === "1") { session.screen = "STAT_SELECT"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "STAT_RESET_CONFIRM"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }

        if (session.screen === "STAT_RESET_CONFIRM") {
            if (msg === "1") {
                if ((data.items.statReset || 0) <= 0) return SystemAction.go(replier, ContentManager.title.error, ContentManager.msg.noItem, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
                data.items.statReset -= 1;
                data.stats = { acc: 50, ref: 50, com: 50, int: 50 };
                data.point = (data.level - 1) * POINT_PER_LEVEL; 
                Database.save();
                return SystemAction.go(replier, ContentManager.title.success, ContentManager.msg.statResetSuccess, function() {
                    session.screen = "PROFILE_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room);
                });
            } else if (msg === "2") {
                return SystemAction.go(replier, ContentManager.title.notice, "초기화를 취소합니다.", function() {
                    session.screen = "PROFILE_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room);
                });
            }
        }

        if (session.screen === "STAT_SELECT") {
            if (ContentManager.statMap.keys[msg]) {
                session.temp.statKey = ContentManager.statMap.keys[msg]; 
                session.temp.statName = ContentManager.statMap.names[msg]; 
                session.screen = "STAT_INPUT";
                return UserController.handle("refresh_screen", session, sender, replier, room);
            }
        }

        if (session.screen === "STAT_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt <= 0) return SystemAction.go(replier, ContentManager.title.error, ContentManager.msg.onlyNumber, function() { UserController.handle("refresh_screen", session, sender, replier, room); }); 
            if (data.point < amt) return SystemAction.go(replier, ContentManager.title.fail, "포인트가 부족합니다.", function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            
            session.temp.statAmt = amt;
            session.screen = "STAT_INPUT_CONFIRM";
            return UserController.handle("refresh_screen", session, sender, replier, room);
        }
        
        if (session.screen === "STAT_INPUT_CONFIRM") {
            if (msg === "1") {
                var amt = session.temp.statAmt;
                if (data.point < amt) return SystemAction.go(replier, ContentManager.title.fail, "포인트가 부족합니다.", function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); });
                
                data.point -= amt; data.stats[session.temp.statKey] += amt; Database.save(); 
                return SystemAction.go(replier, ContentManager.title.success, session.temp.statName + " 수치가 " + amt + " 상승했습니다.", function() { 
                    session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room);
                });
            } else if (msg === "2") {
                return SystemAction.go(replier, ContentManager.title.notice, "강화를 취소합니다.", function() {
                    session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room);
                });
            }
        }

        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") { session.screen = "TITLE_EQUIP"; return UserController.handle("refresh_screen", session, sender, replier, room); }
             if (msg === "2") { session.screen = "CHAMP_LIST"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }
        
        if (session.screen === "TITLE_EQUIP") {
            if (data.inventory.titles.indexOf(msg) === -1) return SystemAction.go(replier, ContentManager.title.error, "보유하지 않은 칭호입니다.", function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            data.title = msg; Database.save();
            return SystemAction.go(replier, ContentManager.title.complete, "칭호가 [" + msg + "](으)로 변경되었습니다.", function() { 
                session.screen = "COLLECTION_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); 
            });
        }

        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") { session.screen = "SHOP_ITEMS"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "SHOP_CHAMPS"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }
        
        if (session.screen === "SHOP_ITEMS") {
            var p = 0, n = "", act = "";
            if (msg === "1") { p = 500; n = "닉네임 변경권"; act = "name"; }
            else if (msg === "2") { p = 1500; n = "스탯 초기화권"; act = "reset"; }
            
            if (p > 0) {
                if (data.gold < p) return SystemAction.go(replier, ContentManager.title.fail, ContentManager.msg.notEnoughGold, function(){ UserController.handle("refresh_screen", session, sender, replier, room); });
                data.gold -= p; 
                if (act === "reset") data.items.statReset = (data.items.statReset || 0) + 1;
                if (act === "name") data.items.nameChange = (data.items.nameChange || 0) + 1;
                Database.save();
                return SystemAction.go(replier, ContentManager.title.success, ContentManager.msg.buySuccess(n), function(){ 
                    session.screen = "SHOP_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); 
                });
            }
        }

        if (session.screen === "SHOP_CHAMPS") {
            var idx = parseInt(msg) - 1;
            if (ContentManager.champions[idx]) {
                var target = ContentManager.champions[idx];
                if (data.inventory.champions.indexOf(target) !== -1 || data.gold < 500) {
                    return SystemAction.go(replier, ContentManager.title.fail, "이미 보유 중이거나 골드가 부족합니다.", function(){ UserController.handle("refresh_screen", session, sender, replier, room); });
                }
                data.gold -= 500; data.inventory.champions.push(target); Database.save();
                return SystemAction.go(replier, ContentManager.title.success, target + "님이 합류했습니다!", function(){ 
                    session.screen = "SHOP_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); 
                });
            }
        }

        if (session.screen === "USER_INQUIRY") {
            Database.inquiries.push({ sender: session.tempId, room: room, content: msg, time: Utils.get24HTime(), read: false });
            Database.save(); session.screen = "MAIN";
            try { Utils.sendNotify(Config.AdminRoom, "🔔 새 문의가 접수되었습니다.\n보낸이: " + session.tempId); } catch(e){}
            return SystemAction.go(replier, ContentManager.title.complete, "접수되었습니다.", function() { UserController.handle("refresh_screen", session, sender, replier, room); });
        }
    }
};

// 6-3. 관리자 컨트롤러
var AdminController = {
    handle: function(msg, session, sender, replier, room) {
        
        if (msg === "refresh_screen") {
            if (session.screen === "IDLE" || session.screen === "ADMIN_MAIN") {
                session.screen = "ADMIN_MAIN";
                var unreadCount = Database.inquiries.filter(function(iq){ return !iq.read; }).length;
                var adminMenus = [
                    "1. 시스템 정보", 
                    "2. 전체 유저", 
                    "3. 문의 관리" + (unreadCount > 0 ? " [" + unreadCount + "]" : "")
                ];
                return replier.reply(LayoutManager.renderFrame("관리 센터", LayoutManager.templates.menuList(null, adminMenus), false, "관리 메뉴 선택"));
            }
            if (session.screen === "ADMIN_SYS_INFO") {
                var rt = java.lang.Runtime.getRuntime();
                var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                var info = "📟 메모리: " + used + "MB 사용중\n👥 유저 수: " + Object.keys(Database.data).length + "명\n🛡️ 버전: " + Config.Version;
                return replier.reply(LayoutManager.renderFrame("시스템 정보", info, true, "확인 완료"));
            }
            if (session.screen === "ADMIN_USER_SELECT") {
                var users = Object.keys(Database.data);
                if (users.length === 0) return SystemAction.go(replier, ContentManager.title.notice, "등록된 유저가 없습니다.", function(){ session.screen = "ADMIN_MAIN"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                session.temp.userList = users;
                var listText = users.map(function(u, i) { return (i+1) + ". " + u; }).join("\n");
                return replier.reply(LayoutManager.renderFrame("유저 목록", listText, true, "번호 선택"));
            }
            if (session.screen === "ADMIN_USER_DETAIL") {
                var head = LayoutManager.renderProfileHead(Database.data[session.temp.targetUser], session.temp.targetUser);
                return replier.reply(LayoutManager.renderFrame(session.temp.targetUser + " 관리", head + "\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.adminUser), true, "작업 선택"));
            }
            if (session.screen === "ADMIN_ACTION_CONFIRM") {
                var actionMap = {"2": "데이터 초기화", "3": "계정 삭제", "4": "차단/해제"};
                var actionName = actionMap[session.temp.adminAction];
                var body = ContentManager.msg.adminActionConfirm(actionName) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo);
                return replier.reply(LayoutManager.renderFrame("작업 최종 확인", body, true, "번호 선택"));
            }
            if (session.screen === "ADMIN_INQUIRY_LIST") {
                if (Database.inquiries.length === 0) return SystemAction.go(replier, ContentManager.title.notice, "접수된 문의가 없습니다.", function(){ session.screen = "ADMIN_MAIN"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                
                var listArr = [];
                var curDate = "";
                for (var i = 0; i < Database.inquiries.length; i++) {
                    var iq = Database.inquiries[i];
                    var datePart = (iq.time && iq.time.length >= 10) ? iq.time.substring(0, 10) : "이전 문의";
                    if (curDate !== datePart) {
                        curDate = datePart;
                        if(listArr.length > 0) listArr.push(""); 
                        listArr.push("📅 [" + curDate + "]");
                    }
                    var mark = iq.read ? " ✅" : " ⬜";
                    listArr.push((i+1) + "." + mark + " " + iq.sender);
                }
                return replier.reply(LayoutManager.renderFrame("문의 목록", listArr.join("\n"), true, "확인할 문의 번호를 입력하세요."));
            }
            if (session.screen === "ADMIN_INQUIRY_DETAIL") {
                var iq = Database.inquiries[session.temp.inqIdx];
                if (!iq) return AdminController.handle("이전", session, sender, replier, room);
                
                if (!iq.read) { iq.read = true; Database.save(); }
                
                var timeParts = iq.time ? iq.time.split(" ") : ["알 수 없음", ""];
                var iqDate = timeParts[0];
                var iqTime = timeParts[1] || "정보 없음";
                
                var content = "👤 보낸이: " + iq.sender + "\n📅 날짜: " + iqDate + "\n⏰ 시간: " + iqTime + "\n" + Utils.getFixedDivider() + "\n" + iq.content;
                var body = LayoutManager.templates.menuList(null, ["1. 답변 전송", "2. 문의 삭제"]);
                return replier.reply(LayoutManager.renderFrame("문의 상세 내용", content + "\n\n" + body, true, "작업 선택"));
            }
            if (session.screen === "ADMIN_INQUIRY_REPLY") {
                return replier.reply(LayoutManager.renderFrame("답변 작성", "유저에게 전송할 답변 내용을 입력하세요.", true, "내용 입력"));
            }
            if (session.screen === "ADMIN_EDIT_SELECT") {
                return replier.reply(LayoutManager.renderFrame("정보 수정", LayoutManager.templates.menuList(null, ContentManager.menus.adminEdit), true, "수정할 항목 선택"));
            }
            if (session.screen === "ADMIN_EDIT_INPUT") {
                return replier.reply(LayoutManager.renderFrame("값 수정", "새로운 값을 입력하세요.", true, "숫자 입력"));
            }
            if (session.screen === "ADMIN_EDIT_INPUT_CONFIRM") {
                var typeName = {"gold":"골드", "lp":"LP", "level":"레벨"}[session.temp.editType];
                var body = ContentManager.msg.adminEditConfirm(typeName, session.temp.editVal) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo);
                return replier.reply(LayoutManager.renderFrame("수정 최종 확인", body, true, "번호 선택"));
            }
        }

        if (session.screen === "ADMIN_MAIN") {
            if (msg === "1") { session.screen = "ADMIN_SYS_INFO"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "ADMIN_USER_SELECT"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { session.screen = "ADMIN_INQUIRY_LIST"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }

        if (session.screen === "ADMIN_USER_SELECT") {
            var idx = parseInt(msg) - 1;
            if (session.temp.userList && session.temp.userList[idx]) {
                session.temp.targetUser = session.temp.userList[idx];
                session.screen = "ADMIN_USER_DETAIL";
                return AdminController.handle("refresh_screen", session, sender, replier, room);
            }
        }
        
        if (session.screen === "ADMIN_USER_DETAIL") {
            var target = session.temp.targetUser;
            var tData = Database.data[target];
            
            if (msg === "1") { 
                session.screen = "ADMIN_EDIT_SELECT";
                return AdminController.handle("refresh_screen", session, sender, replier, room);
            }
            if (msg === "2" || msg === "3" || msg === "4") {
                session.temp.adminAction = msg;
                session.screen = "ADMIN_ACTION_CONFIRM";
                return AdminController.handle("refresh_screen", session, sender, replier, room);
            }
        }
        
        if (session.screen === "ADMIN_ACTION_CONFIRM") {
            var target = session.temp.targetUser;
            var tData = Database.data[target];
            var action = session.temp.adminAction;

            if (msg === "1") {
                if (action === "2") {
                    var currentPw = tData.pw;
                    var currentBan = tData.banned;
                    Database.data[target] = {
                        pw: currentPw, name: target, title: "뉴비", lp: 0, win: 0, lose: 0, level: 1, exp: 0, gold: 1000, point: 0,
                        stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { titles: ["뉴비"], champions: [] }, items: { statReset: 0, nameChange: 0 }, banned: currentBan
                    };
                    Database.save(); 
                    Utils.sendNotify(target, ContentManager.msg.adminNotifyInit);
                    return SystemAction.go(replier, ContentManager.title.complete, "모든 데이터가 완벽하게 초기화되었습니다.", function() { session.screen="ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                }
                if (action === "3") {
                    delete Database.data[target]; Database.save();
                    Utils.sendNotify(target, ContentManager.msg.adminNotifyDelete);
                    return SystemAction.go(replier, ContentManager.title.complete, "계정이 삭제되었습니다.", function() { session.screen="ADMIN_USER_SELECT"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                }
                if (action === "4") {
                     tData.banned = !tData.banned; Database.save();
                     var notifyMsg = tData.banned ? ContentManager.msg.adminNotifyBan : ContentManager.msg.adminNotifyUnban;
                     Utils.sendNotify(target, notifyMsg);
                     return SystemAction.go(replier, ContentManager.title.complete, "차단 상태가 변경되었습니다.", function() { session.screen="ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                }
            } else if (msg === "2") {
                return SystemAction.go(replier, ContentManager.title.notice, "작업을 취소합니다.", function() {
                    session.screen = "ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room);
                });
            }
        }

        if (session.screen === "ADMIN_INQUIRY_LIST") {
            var iIdx = parseInt(msg) - 1;
            if (Database.inquiries[iIdx]) {
                session.temp.inqIdx = iIdx;
                session.screen = "ADMIN_INQUIRY_DETAIL";
                return AdminController.handle("refresh_screen", session, sender, replier, room);
            }
        }
        
        if (session.screen === "ADMIN_INQUIRY_DETAIL") {
            var idx = session.temp.inqIdx;
            if (msg === "1") {
                session.screen = "ADMIN_INQUIRY_REPLY";
                return AdminController.handle("refresh_screen", session, sender, replier, room);
            }
            if (msg === "2") {
                Database.inquiries.splice(idx, 1); Database.save();
                return SystemAction.go(replier, ContentManager.title.complete, "문의가 삭제되었습니다.", function(){ 
                    session.screen = "ADMIN_INQUIRY_LIST"; AdminController.handle("refresh_screen", session, sender, replier, room); 
                });
            }
        }
        
        if (session.screen === "ADMIN_INQUIRY_REPLY") {
            var idx = session.temp.inqIdx;
            var iq = Database.inquiries[idx];
            if (iq && iq.room) {
                var replyMsg = "🔔 [운영진 답변 도착]\n" + Utils.getFixedDivider() + "\n" + msg + "\n" + Utils.getFixedDivider();
                try { Api.replyRoom(iq.room, replyMsg); } catch(e){}
                return SystemAction.go(replier, ContentManager.title.complete, "답변이 성공적으로 전송되었습니다.", function(){
                    session.screen = "ADMIN_INQUIRY_LIST"; AdminController.handle("refresh_screen", session, sender, replier, room);
                });
            }
        }

        if (session.screen === "ADMIN_EDIT_SELECT") {
            var typeMap = { "1": "gold", "2": "lp", "3": "level" };
            if (typeMap[msg]) {
                session.temp.editType = typeMap[msg];
                session.screen = "ADMIN_EDIT_INPUT";
                return AdminController.handle("refresh_screen", session, sender, replier, room);
            }
        }
        
        if (session.screen === "ADMIN_EDIT_INPUT") {
             var val = parseInt(msg);
             if(isNaN(val)) return SystemAction.go(replier, ContentManager.title.error, ContentManager.msg.onlyNumber, function(){ AdminController.handle("refresh_screen", session, sender, replier, room); });
             
             session.temp.editVal = val;
             session.screen = "ADMIN_EDIT_INPUT_CONFIRM";
             return AdminController.handle("refresh_screen", session, sender, replier, room);
        }
        
        if (session.screen === "ADMIN_EDIT_INPUT_CONFIRM") {
            if (msg === "1") {
                var val = session.temp.editVal;
                var target = session.temp.targetUser;
                var typeName = {"gold":"골드", "lp":"LP", "level":"레벨"}[session.temp.editType];
                
                if (session.temp.editType === "level") {
                    var oldLevel = Database.data[target].level;
                    var diff = val - oldLevel;
                    if (diff !== 0) {
                        var addPoint = diff * POINT_PER_LEVEL;
                        Database.data[target].point += addPoint;
                        if(Database.data[target].point < 0) Database.data[target].point = 0;
                    }
                }
                
                Database.data[target][session.temp.editType] = val;
                Database.save();
                Utils.sendNotify(target, ContentManager.msg.adminNotifyEdit(typeName, val));
                
                return SystemAction.go(replier, ContentManager.title.complete, "수정되었습니다.", function() {
                    session.screen = "ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room);
                });
            } else if (msg === "2") {
                return SystemAction.go(replier, ContentManager.title.notice, "수정을 취소합니다.", function() {
                    session.screen = "ADMIN_EDIT_SELECT"; AdminController.handle("refresh_screen", session, sender, replier, room);
                });
            }
        }
    }
};

// ━━━━━━━━ [7. 메인 라우터] ━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        Database.load(); 
        var realMsg = msg.trim();

        if (realMsg === "업데이트" || realMsg === ".업데이트") return;

        // [핵심] 메시지 입력 시 동기식 타임아웃 100% 검사 완료 후 진행
        if (SessionManager.checkTimeout(room, sender, replier)) return;

        var session = SessionManager.get(room, sender);
        var isLogged = (session.tempId && Database.data[session.tempId]);

        if (realMsg === "메뉴") {
            session.lastTime = Date.now();
            if (room === Config.AdminRoom) {
                session.screen = "ADMIN_MAIN";
                return AdminController.handle("refresh_screen", session, sender, replier, room);
            }
            if (isLogged) {
                session.screen = "MAIN"; 
                return UserController.handle("refresh_screen", session, sender, replier, room);
            } else {
                session.screen = "GUEST_MAIN"; 
                return AuthController.handle("refresh_screen", session, sender, replier, room);
            }
        }

        if (realMsg === "취소") { 
            var backupId = session.tempId; 
            SessionManager.reset(room, sender); 
            var newSession = SessionManager.get(room, sender);
            if (backupId) {
                newSession.tempId = backupId;
                SessionManager.save();
            }
            return replier.reply(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.cancel, false, "다시 시작하려면 '메뉴'를 입력하세요."));
        }

        if (realMsg === "이전") {
            var pData = [
                "JOIN_ID:GUEST_MAIN,JOIN_PW:GUEST_MAIN,LOGIN_ID:GUEST_MAIN,LOGIN_PW:GUEST_MAIN,",
                "GUEST_INQUIRY:GUEST_MAIN,PROFILE_MAIN:MAIN,STAT_SELECT:PROFILE_MAIN,",
                "STAT_INPUT:STAT_SELECT,STAT_INPUT_CONFIRM:STAT_INPUT,STAT_RESET_CONFIRM:PROFILE_MAIN,",
                "COLLECTION_MAIN:MAIN,TITLE_EQUIP:COLLECTION_MAIN,CHAMP_LIST:COLLECTION_MAIN,",
                "SHOP_MAIN:MAIN,SHOP_ITEMS:SHOP_MAIN,SHOP_CHAMPS:SHOP_MAIN,USER_INQUIRY:MAIN,",
                "ADMIN_SYS_INFO:ADMIN_MAIN,ADMIN_INQUIRY_LIST:ADMIN_MAIN,ADMIN_USER_SELECT:ADMIN_MAIN,",
                "ADMIN_USER_DETAIL:ADMIN_USER_SELECT,ADMIN_EDIT_SELECT:ADMIN_USER_DETAIL,",
                "ADMIN_ACTION_CONFIRM:ADMIN_USER_DETAIL,",
                "ADMIN_EDIT_INPUT:ADMIN_EDIT_SELECT,ADMIN_EDIT_INPUT_CONFIRM:ADMIN_EDIT_INPUT,",
                "ADMIN_INQUIRY_DETAIL:ADMIN_INQUIRY_LIST,ADMIN_INQUIRY_REPLY:ADMIN_INQUIRY_DETAIL"
            ].join("").split(",");

            var pMap = {};
            for (var i = 0; i < pData.length; i++) {
                var pair = pData[i].split(":");
                if (pair.length === 2) pMap[pair[0]] = pair[1];
            }

            if (pMap[session.screen]) {
                session.screen = pMap[session.screen];
                if (room === Config.AdminRoom) return AdminController.handle("refresh_screen", session, sender, replier, room);
                if (isLogged) return UserController.handle("refresh_screen", session, sender, replier, room);
                return AuthController.handle("refresh_screen", session, sender, replier, room);
            }
            
            return SystemAction.go(replier, ContentManager.title.notice, ContentManager.msg.noPrevious, function() {
                if (room === Config.AdminRoom) return AdminController.handle("refresh_screen", session, sender, replier, room);
                if (isLogged) return UserController.handle("refresh_screen", session, sender, replier, room);
                return AuthController.handle("refresh_screen", session, sender, replier, room);
            });
        }

        if (room === Config.AdminRoom) return AdminController.handle(realMsg, session, sender, replier, room);
        
        if (isLogged) return UserController.handle(realMsg, session, sender, replier, room);
        else return AuthController.handle(realMsg, session, sender, replier, room);

    } catch (e) {
        var errLog = [
            "⛔ 시스템 오류 발생!", "━━━━━━━━━━━━━━", "📌 종류: " + e.name, "💬 내용: " + e.message,
            "📍 위치: " + (e.lineNumber || "정보 없음") + "줄", "🔎 상세: " + (e.stack ? e.stack.substring(0, 150) : "정보 없음")
        ].join("\n");
        try { Api.replyRoom(Config.AdminRoom, errLog); } catch(err) {} 
        
        return SystemAction.go(replier, ContentManager.title.sysError, ContentManager.msg.sysError, function() {
            SessionManager.reset(room, sender);
        });
    }
}
