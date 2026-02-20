/*
 * 🏰 소환사의 협곡 Bot - FINAL ULTIMATE FIX (v1.5.9 Enterprise)
 * - 하드코딩 완전 제거: 프로필(LayoutManager), 시스템 오류, 관리자 안내 메시지 등 남은 모든 한글 텍스트를 ContentManager로 100% 분리
 * - 관리자 메뉴 동적 처리: 안 읽은 문의 갯수 표기를 ContentManager 함수로 캡슐화
 */ 

// ━━━━━━━━ [1. 설정 및 인프라] ━━━━━━━━
var Config = {
    Version: "v1.5.9 Enterprise",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14,
    WRAP_LIMIT: 18, 
    TIMEOUT_MS: 300000
};

var MAX_LEVEL = 30;
var POINT_PER_LEVEL = 5;

var PrevScreenMap = {
    "JOIN_ID": "GUEST_MAIN", "JOIN_PW": "GUEST_MAIN", "LOGIN_ID": "GUEST_MAIN", "LOGIN_PW": "GUEST_MAIN",
    "GUEST_INQUIRY": "GUEST_MAIN", "PROFILE_MAIN": "MAIN", "STAT_SELECT": "PROFILE_MAIN",
    "STAT_INPUT": "STAT_SELECT", "STAT_INPUT_CONFIRM": "STAT_INPUT", "STAT_RESET_CONFIRM": "PROFILE_MAIN",
    "COLLECTION_MAIN": "MAIN", "TITLE_EQUIP": "COLLECTION_MAIN", "CHAMP_LIST": "COLLECTION_MAIN",
    "SHOP_MAIN": "MAIN", "SHOP_ITEMS": "SHOP_MAIN", "SHOP_CHAMPS": "SHOP_MAIN", "USER_INQUIRY": "MAIN",
    "ADMIN_SYS_INFO": "ADMIN_MAIN", "ADMIN_INQUIRY_LIST": "ADMIN_MAIN", "ADMIN_USER_SELECT": "ADMIN_MAIN",
    "ADMIN_USER_DETAIL": "ADMIN_USER_SELECT", "ADMIN_EDIT_SELECT": "ADMIN_USER_DETAIL",
    "ADMIN_ACTION_CONFIRM": "ADMIN_USER_DETAIL", "ADMIN_EDIT_INPUT": "ADMIN_EDIT_SELECT", 
    "ADMIN_EDIT_INPUT_CONFIRM": "ADMIN_EDIT_INPUT", "ADMIN_INQUIRY_DETAIL": "ADMIN_INQUIRY_LIST", 
    "ADMIN_INQUIRY_REPLY": "ADMIN_INQUIRY_DETAIL"
};

var Utils = {
    getFixedDivider: function() { return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); },
    get24HTime: function() {
        var d = new Date(), y = d.getFullYear(), m = (d.getMonth() + 1); m = m < 10 ? "0" + m : m;
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
            if (line.length <= Config.WRAP_LIMIT) { result.push(line); } 
            else { 
                var currentLine = "";
                for (var j = 0; j < line.length; j++) {
                    currentLine += line[j];
                    if (currentLine.length >= Config.WRAP_LIMIT) {
                        while (j + 1 < line.length && /^[.,!?()]$/.test(line[j + 1])) { currentLine += line[j + 1]; j++; }
                        result.push(currentLine); currentLine = "";
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
        try { Api.replyRoom(target, LayoutManager.renderFrame(ContentManager.title.notice, msg, false, ContentManager.footer.sysNotify)); } catch(e) {}
    }
};

// ━━━━━━━━ [2. 데이터베이스] ━━━━━━━━
var Database = {
    data: {}, inquiries: [],
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (file.exists()) {
            try { var d = JSON.parse(FileStream.read(Config.DB_PATH)); this.data = d.users || {}; this.inquiries = d.inquiries || []; } 
            catch (e) { this.data = {}; this.inquiries = []; }
        }
    },
    save: function() { FileStream.write(Config.DB_PATH, JSON.stringify({ users: this.data, inquiries: this.inquiries }, null, 4)); },
    createUser: function(sender, pw) {
        this.data[sender] = {
            pw: pw, name: sender, title: "뉴비", lp: 0, win: 0, lose: 0, level: 1, exp: 0, gold: 1000, point: 0,
            stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { titles: ["뉴비"], champions: [] }, items: { statReset: 0, nameChange: 0 }, banned: false
        };
        this.save();
    }
};

// ━━━━━━━━ [세션 매니저 (백그라운드 자동 알림 완벽 적용)] ━━━━━━━━
var SessionManager = {
    sessions: {},
    init: function() {
        var file = new java.io.File(Config.SESSION_PATH);
        if (file.exists()) { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch (e) { this.sessions = {}; } }
    },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions, null, 4)); },
    getKey: function(room, sender) { return room + "_" + sender; },
    get: function(room, sender) {
        var key = this.getKey(room, sender);
        if (!this.sessions[key]) { this.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() }; this.save(); }
        return this.sessions[key];
    },
    checkTimeout: function(room, sender, replier) {
        var key = this.getKey(room, sender);
        var s = this.get(room, sender);
        
        // 동기식 검사: 타이머가 에러로 작동하지 않았을 경우를 대비한 2차 방어선
        if (s && s.screen !== "IDLE" && (Date.now() - s.lastTime > Config.TIMEOUT_MS)) {
            var backupId = s.tempId;
            this.reset(room, sender);
            if(backupId) { this.sessions[key].tempId = backupId; this.save(); } 
            replier.reply(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.timeout, false, ContentManager.footer.reStart));
            return true; 
        }
        return false;
    },
    reset: function(room, sender) {
        var key = this.getKey(room, sender);
        this.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        this.save();
    },
    
    // [핵심] 유저의 행동 처리가 완전히 끝난 후, 제일 마지막에 타이머를 작동시킵니다.
    startAutoTimer: function(room, sender) {
        var key = this.getKey(room, sender);
        var s = this.sessions[key];
        
        if (!s || s.screen === "IDLE") return;
        
        // 모든 처리가 끝난 직후의 찐 최종 시간을 기록
        s.lastTime = Date.now();
        this.save();
        
        var targetTime = s.lastTime;
        var timeLimit = Config.TIMEOUT_MS;
        
        var roomStr = String(room);
        // [버그 수정] autoTimeout(없는 변수) ➔ timeout(정상 변수)으로 변경하여 내용을 채움!
        var msgStr = String(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.timeout, false, ContentManager.footer.reStart));

        new java.lang.Thread(new java.lang.Runnable({
            run: function() {
                try {
                    // 지정된 시간 대기
                    java.lang.Thread.sleep(timeLimit);
                    
                    var curSession = SessionManager.sessions[key];
                    // 지정 시간 뒤 일어났는데 시간이 1밀리초도 변하지 않았다면 = 아무것도 안 함 = 만료 처리!
                    if (curSession && curSession.screen !== "IDLE" && curSession.lastTime === targetTime) {
                        
                        // 1. 내부 세션 초기화
                        var backupId = curSession.tempId;
                        SessionManager.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
                        if (backupId) SessionManager.sessions[key].tempId = backupId;
                        SessionManager.save();
                        
                        // 2. 톡방에 자동으로 만료 알림(내용 포함) 전송!
                        Api.replyRoom(roomStr, msgStr);
                    }
                } catch (e) {
                    // 백그라운드 스레드 에러 발생 시 무시
                }
            }
        })).start();
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
        yesNo: ["1. 예", "2. 아니오"],
        adminInqDetail: ["1. 답변 전송", "2. 문의 삭제"],
        
        getAdminMain: function(unreadCount) {
            return ["1. 시스템 정보", "2. 전체 유저", "3. 문의 관리" + (unreadCount > 0 ? " [" + unreadCount + "]" : "")];
        }
    },
    adminMap: {
        editType: { "1": "gold", "2": "lp", "3": "level" },
        editName: { "gold": "골드", "lp": "LP", "level": "레벨" },
        actionName: { "2": "데이터 초기화", "3": "계정 삭제", "4": "차단/해제" }
    },
    screen: {
        gMain: "비회원 메뉴", joinId: "회원가입", joinPw: "비밀번호 설정", loginId: "로그인", loginPw: "로그인",
        inq: "문의 접수", main: "메인 로비", profile: "내 정보", statSel: "능력치 강화", statCon: "강화 최종 확인",
        resetCon: "초기화 확인", col: "컬렉션", title: "보유 칭호", champ: "보유 챔피언", shop: "상점",
        shopItem: "아이템 상점", shopChamp: "챔피언 상점 (500G)", battle: "대전 모드",
        aMain: "관리자 메뉴", aSys: "시스템 정보", aUser: "유저 목록", aActionCon: "작업 최종 확인",
        aInqList: "문의 목록", aInqDet: "문의 상세 내용", aInqRep: "답변 작성", aUserDetail: " 관리",
        aEditSel: "정보 수정", aEditIn: "값 수정", aEditCon: "수정 최종 확인"
    },
    footer: {
        selectNum: "번호를 선택하세요.", inputId: "아이디 입력", inputPw: "비밀번호 입력", inputContent: "내용 입력",
        selectAction: "작업을 선택하세요.", selectStat: "강화할 스탯 선택", inputPoint: "투자할 포인트를 입력하세요.",
        inputTitle: "장착할 칭호 이름을 정확히 입력해 주세요.", checkList: "목록 확인 완료",
        selectCat: "상점 카테고리를 선택하세요.", inputBuyNum: "구매할 번호를 입력하세요.", inputHireNum: "구입할 번호를 입력하세요.",
        aSelectUser: "관리할 유저의 번호를 입력하세요.", aInputInq: "확인할 문의 번호를 입력하세요.", aInputRep: "유저에게 전송할 답변 내용을 입력하세요.",
        reStart: "다시 시작하려면 '메뉴'를 입력하세요.", sysNotify: "시스템 알림", wait: "잠시만 기다려주세요..."
    },
    title: {
        error: "오류", fail: "실패", success: "성공", complete: "완료", notice: "알림", sysError: "시스템 오류"
    },
    statMap: {
        keys: {"1":"acc", "2":"ref", "3":"com", "4":"int"},
        names: {"1":"정확", "2":"반응", "3":"침착", "4":"직관"}
    },
    ui: {
        replyMark: "🔔 [운영진 답변 도착]", sender: "👤 보낸이: ", date: "📅 날짜: ", time: "⏰ 시간: ",
        read: " ✅ ", unread: " ⬜ ", datePrefix: "📅 [", dateSuffix: "]",
        pTarget: "👤 대상: ", pTitle: "🏅 칭호: [", pTier: "🏅 티어: ", pLp: "🏆 점수: ", pGold: "💰 골드: ",
        pRecord: "⚔️ 전적: ", pLevel: "🆙 레벨: Lv.", pExp: "🔷 경험: ", pStatH: " [ 상세 능력치 ]",
        pAcc: "🎯 정확: ", pRef: "⚡ 반응: ", pCom: "🧘 침착: ", pInt: "🧠 직관: ", pPoint: "✨ 포인트: "
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
        invalidLevel: "레벨은 1부터 " + MAX_LEVEL + "까지만 설정할 수 있습니다.",
        banned: "🚫 관리자에 의해 이용이 제한된 계정입니다.",
        battlePrep: "⚔️ 대전 모드는 현재 준비 중입니다.",
        inputNewVal: "새로운 값을 입력하세요.",
        
        cancel: "진행 중인 작업을 중단하고 대기 상태로 전환합니다.",
        timeout: "⌛ 시간이 초과되어 세션이 만료되었습니다.",
        noPrevious: "이전 단계가 없습니다.\n현재 화면을 다시 불러옵니다.",
        logout: "성공적으로 로그아웃되었습니다.",
        noItem: "보유 중인 스탯 초기화권이 없습니다.\n상점에서 먼저 구매해 주세요.",
        statResetSuccess: "스탯이 초기화되고 투자했던 포인트가 모두 반환되었습니다.",
        
        noTitleError: "보유하지 않은 칭호입니다.",
        titleEquipSuccess: function(t) { return "칭호가 [" + t + "](으)로 변경되었습니다."; },
        buySuccess: function(item) { return item + " 구매 완료!\n인벤토리에 보관되었습니다."; },
        champFail: "이미 보유 중이거나 골드가 부족합니다.",
        champSuccess: function(c) { return c + "님이 합류했습니다!"; },
        
        statResetConfirm: function(count) { return "정말로 능력치를 초기화하시겠습니까?\n(투자한 포인트는 100% 반환됩니다.)\n\n- 보유 초기화권: " + count + "개"; },
        statEnhanceConfirm: function(stat, amt) { return "[" + stat + "] 능력치를 " + amt + "만큼 강화하시겠습니까?"; },
        statEnhanceSuccess: function(stat, amt) { return stat + " 수치가 " + amt + " 상승했습니다."; },
        
        inqSubmitSuccess: "문의가 접수되었습니다.",
        notifyNewUser: function(id) { return "📢 [신규 유저] " + id + "님이 가입했습니다."; },
        notifyNewInq: function(sender) { return "🔔 새 문의가 접수되었습니다.\n보낸이: " + sender; },
        
        adminNoUser: "등록된 유저가 없습니다.",
        adminNoInq: "접수된 문의가 없습니다.",
        adminSysInfo: function(used, users, ver) { return "📟 메모리: " + used + "MB 사용중\n👥 유저 수: " + users + "명\n🛡️ 버전: " + ver; },
        adminEditConfirm: function(type, val) { return "[" + type + "] 수치를 " + val + "(으)로 수정하시겠습니까?"; },
        adminActionConfirm: function(action) { return "정말로 해당 유저의 [" + action + "] 작업을 진행하시겠습니까?"; },
        adminCancel: "작업을 취소합니다.",
        adminInitSuccess: "모든 데이터가 완벽하게 초기화되었습니다.",
        adminDelSuccess: "계정이 삭제되었습니다.",
        adminBanSuccess: "차단 상태가 변경되었습니다.",
        adminInqDelSuccess: "문의가 삭제되었습니다.",
        adminReplySuccess: "답변이 성공적으로 전송되었습니다.",
        adminEditSuccess: "수정되었습니다.",
        adminEditCancel: "수정을 취소합니다.",
        
        adminNotifyInit: "관리자에 의해 계정 데이터가 초기화되었습니다.",
        adminNotifyDelete: "관리자에 의해 계정이 영구 삭제되었습니다.",
        adminNotifyBan: "관리자에 의해 계정이 [이용 차단] 상태로 변경되었습니다.",
        adminNotifyUnban: "관리자에 의해 계정이 [차단 해제] 상태로 변경되었습니다.",
        adminNotifyEdit: function(type, val) { return "관리자에 의해 [" + type + "] 정보가 " + val + "(으)로 수정되었습니다."; },
        
        sysErrorLog: function(e) {
            return ["⛔ 시스템 오류 발생!", "━━━━━━━━━━━━━━", "📌 종류: " + e.name, "💬 내용: " + e.message,
                    "📍 위치: " + (e.lineNumber || "정보 없음") + "줄", "🔎 상세: " + (e.stack ? e.stack.substring(0, 150) : "정보 없음")].join("\n");
        }
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
        if (footer) res += "\n" + div + "\n💡 " + Utils.wrapText(footer).replace(/\n/g, "\n   ");
        return res;
    },
    renderAlert: function(title, content) { return this.renderFrame(title, content, false, ContentManager.footer.wait); },
    renderProfileHead: function(data, targetName) {
        var div = Utils.getFixedDivider(), u = ContentManager.ui, tier = Utils.getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose, winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats, expDisplay = (data.level >= MAX_LEVEL) ? "MAX" : data.exp + "/" + (data.level * 100);
        return [
            u.pTarget + targetName + (data.banned ? " [🚫차단]" : ""),
            u.pTitle + data.title + "]", div,
            u.pTier + tier.icon + tier.name, u.pLp + data.lp + " LP", u.pGold + (data.gold || 0).toLocaleString() + " G",
            u.pRecord + win + "승 " + lose + "패 (" + winRate + "%)", u.pLevel + data.level, u.pExp + expDisplay + ")", div,
            u.pStatH, u.pAcc + st.acc, u.pRef + st.ref, u.pCom + st.com, u.pInt + st.int, div, u.pPoint + (data.point || 0) + " P"
        ].join("\n");
    },
    templates: {
        menuList: function(subtitle, items) { return " " + (items || []).join("\n "); },
        inputRequest: function(subtitle, currentVal, info) { return [" 현재 상태 : " + currentVal, " " + info, "", " 값을 입력하세요."].join("\n"); }
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
        var s = ContentManager.screen, f = ContentManager.footer, m = ContentManager.msg, t = ContentManager.title;
        
        if (msg === "refresh_screen") {
            if (session.screen === "IDLE" || session.screen === "GUEST_MAIN") {
                session.screen = "GUEST_MAIN";
                return replier.reply(LayoutManager.renderFrame(s.gMain, LayoutManager.templates.menuList(null, ContentManager.menus.guest), false, f.selectNum)); 
            }
            if (session.screen === "JOIN_ID") return replier.reply(LayoutManager.renderFrame(s.joinId, m.inputID_Join, true, f.inputId));
            if (session.screen === "JOIN_PW") return replier.reply(LayoutManager.renderFrame(s.joinPw, m.inputPW, true, f.inputPw));
            if (session.screen === "LOGIN_ID") return replier.reply(LayoutManager.renderFrame(s.loginId, m.inputID_Login, true, f.inputId));
            if (session.screen === "LOGIN_PW") return replier.reply(LayoutManager.renderFrame(s.loginPw, m.inputPW, true, f.inputPw));
            if (session.screen === "GUEST_INQUIRY") return replier.reply(LayoutManager.renderFrame(s.inq, "운영진에게 보낼 내용을 입력하세요.", true, f.inputContent));
        }

        if (session.screen === "GUEST_MAIN") {
            if (msg === "1") { session.screen = "JOIN_ID"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "LOGIN_ID"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { session.screen = "GUEST_INQUIRY"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
        }

        if (session.screen === "JOIN_ID") {
            if (msg.length > 10) return SystemAction.go(replier, t.error, "아이디는 10자 이내여야 합니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            if (Database.data[msg]) return SystemAction.go(replier, t.error, "이미 존재하는 아이디입니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            session.temp.id = msg; session.screen = "JOIN_PW"; return AuthController.handle("refresh_screen", session, sender, replier, room);
        }
        if (session.screen === "JOIN_PW") {
            Database.createUser(session.temp.id, msg); Database.load(); session.tempId = session.temp.id; session.screen = "MAIN"; SessionManager.save(); 
            try { Utils.sendNotify(Config.AdminRoom, m.notifyNewUser(session.temp.id)); } catch(e) {}
            return SystemAction.go(replier, t.success, m.registerComplete, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
        }

        if (session.screen === "LOGIN_ID") {
            if (!Database.data[msg]) return SystemAction.go(replier, t.error, "존재하지 않는 아이디입니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            session.temp.id = msg; session.screen = "LOGIN_PW"; return AuthController.handle("refresh_screen", session, sender, replier, room);
        }
        if (session.screen === "LOGIN_PW") {
            var userData = Database.data[session.temp.id];
            if (userData && userData.pw === msg) {
                session.tempId = session.temp.id; session.screen = "MAIN"; SessionManager.save(); 
                return SystemAction.go(replier, t.success, session.tempId + "님 환영합니다!", function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            } else {
                return SystemAction.go(replier, t.fail, m.loginFail, function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            }
        }
        
        if (session.screen === "GUEST_INQUIRY") {
            Database.inquiries.push({ sender: "비회원(" + sender + ")", room: room, content: msg, time: Utils.get24HTime(), read: false });
            Database.save(); SessionManager.reset(room, sender);
            try { Utils.sendNotify(Config.AdminRoom, m.notifyNewInq("비회원(" + sender + ")")); } catch(e){}
            return SystemAction.go(replier, t.complete, m.inqSubmitSuccess, function(){ AuthController.handle("refresh_screen", SessionManager.get(room, sender), sender, replier, room); });
        }
    }
};

// 6-2. 유저 컨트롤러
var UserController = {
    handle: function(msg, session, sender, replier, room) {
        var data = Database.data[session.tempId]; 
        var s = ContentManager.screen, f = ContentManager.footer, m = ContentManager.msg, t = ContentManager.title;
        if (data && !data.items) { data.items = { statReset: 0, nameChange: 0 }; Database.save(); }
        if (!data) return AuthController.handle(msg, session, sender, replier, room);
        if (data.banned) return replier.reply(LayoutManager.renderFrame(t.notice, m.banned, false, null));

        if (msg === "refresh_screen") {
            if (session.screen === "MAIN") return replier.reply(LayoutManager.renderFrame(s.main, LayoutManager.templates.menuList(null, ContentManager.menus.main), false, f.selectNum));
            if (session.screen === "PROFILE_MAIN") {
                var head = LayoutManager.renderProfileHead(data, session.tempId);
                return replier.reply(LayoutManager.renderFrame(s.profile, head + "\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.profileSub), true, f.selectAction));
            }
            if (session.screen === "STAT_SELECT") return replier.reply(LayoutManager.renderFrame(s.statSel, LayoutManager.templates.menuList(null, ContentManager.menus.stats), true, f.selectStat));
            if (session.screen === "STAT_RESET_CONFIRM") {
                var body = m.statResetConfirm(data.items.statReset || 0) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo);
                return replier.reply(LayoutManager.renderFrame(s.resetCon, body, true, f.selectNum));
            }
            if (session.screen === "STAT_INPUT") {
                var body = LayoutManager.templates.inputRequest(null, data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P");
                return replier.reply(LayoutManager.renderFrame(session.temp.statName + " 강화", body, true, f.inputPoint));
            }
            if (session.screen === "STAT_INPUT_CONFIRM") {
                var body = m.statEnhanceConfirm(session.temp.statName, session.temp.statAmt) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo);
                return replier.reply(LayoutManager.renderFrame(s.statCon, body, true, f.selectNum));
            }
            if (session.screen === "COLLECTION_MAIN") return replier.reply(LayoutManager.renderFrame(s.col, LayoutManager.templates.menuList(null, ["1. 보유 칭호", "2. 보유 챔피언"]), true, f.selectNum));
            if (session.screen === "TITLE_EQUIP") {
                 var head = "👑 현재 칭호: [" + data.title + "]";
                 var list = data.inventory.titles.map(function(t, i) { return (i+1) + ". " + t + (t === data.title ? " [장착중]" : ""); }).join("\n");
                 return replier.reply(LayoutManager.renderFrame(s.title, head + "\n" + Utils.getFixedDivider() + "\n" + list, true, f.inputTitle));
            }
            if (session.screen === "CHAMP_LIST") {
                 var head = "📊 수집 챔피언: " + (data.inventory.champions ? data.inventory.champions.length : 0) + "명";
                 var list = (data.inventory.champions && data.inventory.champions.length > 0) ? data.inventory.champions.map(function(c, i){ return (i+1) + ". " + c; }).join("\n") : "보유한 챔피언이 없습니다.";
                 return replier.reply(LayoutManager.renderFrame(s.champ, head + "\n" + Utils.getFixedDivider() + "\n" + list, true, f.checkList));
            }
            if (session.screen === "SHOP_MAIN") return replier.reply(LayoutManager.renderFrame(s.shop, LayoutManager.templates.menuList(null, ContentManager.menus.shopMain), true, f.selectCat));
            if (session.screen === "SHOP_ITEMS") {
                var head = "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G";
                return replier.reply(LayoutManager.renderFrame(s.shopItem, head + "\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.shopItems), true, f.inputBuyNum));
            }
            if (session.screen === "SHOP_CHAMPS") {
                var head = "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G";
                var cList = ContentManager.champions.map(function(c, i){ return (i+1) + ". " + c + ((data.inventory.champions||[]).indexOf(c)!==-1?" [보유]":""); }).join("\n");
                return replier.reply(LayoutManager.renderFrame(s.shopChamp, head + "\n" + Utils.getFixedDivider() + "\n" + cList, true, f.inputHireNum));
            }
            if (session.screen === "USER_INQUIRY") return replier.reply(LayoutManager.renderFrame(s.inq, "운영진에게 보낼 내용을 입력해 주세요.", true, f.inputContent));
        }

        if (session.screen === "MAIN") {
            if (msg === "1") { session.screen = "PROFILE_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "COLLECTION_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { return replier.reply(LayoutManager.renderFrame(s.battle, m.battlePrep, true, "준비 중...")); }
            if (msg === "4") { session.screen = "SHOP_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "5") { session.screen = "USER_INQUIRY"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "6") { 
                var backupId = session.tempId; SessionManager.reset(room, sender); 
                return SystemAction.go(replier, t.notice, m.logout, function() { AuthController.handle("refresh_screen", SessionManager.get(room, sender), sender, replier, room); });
            }
        }

        if (session.screen === "PROFILE_MAIN") {
            if (msg === "1") { session.screen = "STAT_SELECT"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "STAT_RESET_CONFIRM"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }

        if (session.screen === "STAT_RESET_CONFIRM") {
            if (msg === "1") {
                if ((data.items.statReset || 0) <= 0) return SystemAction.go(replier, t.error, m.noItem, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
                data.items.statReset -= 1; data.stats = { acc: 50, ref: 50, com: 50, int: 50 }; data.point = (data.level - 1) * POINT_PER_LEVEL; Database.save();
                return SystemAction.go(replier, t.success, m.statResetSuccess, function() { session.screen = "PROFILE_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
            } else if (msg === "2") { return SystemAction.go(replier, t.notice, m.adminCancel, function() { session.screen = "PROFILE_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); }); }
        }

        if (session.screen === "STAT_SELECT") {
            if (ContentManager.statMap.keys[msg]) {
                session.temp.statKey = ContentManager.statMap.keys[msg]; session.temp.statName = ContentManager.statMap.names[msg]; 
                session.screen = "STAT_INPUT"; return UserController.handle("refresh_screen", session, sender, replier, room);
            }
        }

        if (session.screen === "STAT_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt <= 0) return SystemAction.go(replier, t.error, m.onlyNumber, function() { UserController.handle("refresh_screen", session, sender, replier, room); }); 
            if (data.point < amt) return SystemAction.go(replier, t.fail, "포인트가 부족합니다.", function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            session.temp.statAmt = amt; session.screen = "STAT_INPUT_CONFIRM"; return UserController.handle("refresh_screen", session, sender, replier, room);
        }
        
        if (session.screen === "STAT_INPUT_CONFIRM") {
            if (msg === "1") {
                var amt = session.temp.statAmt;
                if (data.point < amt) return SystemAction.go(replier, t.fail, "포인트가 부족합니다.", function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); });
                data.point -= amt; data.stats[session.temp.statKey] += amt; Database.save(); 
                return SystemAction.go(replier, t.success, m.statEnhanceSuccess(session.temp.statName, amt), function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); });
            } else if (msg === "2") { return SystemAction.go(replier, t.notice, m.adminCancel, function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); }); }
        }

        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") { session.screen = "TITLE_EQUIP"; return UserController.handle("refresh_screen", session, sender, replier, room); }
             if (msg === "2") { session.screen = "CHAMP_LIST"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "TITLE_EQUIP") {
            if ((data.inventory.titles||[]).indexOf(msg) === -1) return SystemAction.go(replier, t.error, m.noTitleError, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            data.title = msg; Database.save();
            return SystemAction.go(replier, t.complete, m.titleEquipSuccess(msg), function() { session.screen = "COLLECTION_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
        }

        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") { session.screen = "SHOP_ITEMS"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "SHOP_CHAMPS"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "SHOP_ITEMS") {
            var p = 0, n = "", act = "";
            if (msg === "1") { p = 500; n = "닉네임 변경권"; act = "name"; } else if (msg === "2") { p = 1500; n = "스탯 초기화권"; act = "reset"; }
            if (p > 0) {
                if (data.gold < p) return SystemAction.go(replier, t.fail, m.notEnoughGold, function(){ UserController.handle("refresh_screen", session, sender, replier, room); });
                data.gold -= p; if (act === "reset") data.items.statReset = (data.items.statReset || 0) + 1; if (act === "name") data.items.nameChange = (data.items.nameChange || 0) + 1; Database.save();
                return SystemAction.go(replier, t.success, m.buySuccess(n), function(){ session.screen = "SHOP_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
            }
        }
        if (session.screen === "SHOP_CHAMPS") {
            var idx = parseInt(msg) - 1;
            if (ContentManager.champions[idx]) {
                var target = ContentManager.champions[idx];
                if ((data.inventory.champions||[]).indexOf(target) !== -1 || data.gold < 500) return SystemAction.go(replier, t.fail, m.champFail, function(){ UserController.handle("refresh_screen", session, sender, replier, room); });
                data.gold -= 500; data.inventory.champions.push(target); Database.save();
                return SystemAction.go(replier, t.success, m.champSuccess(target), function(){ session.screen = "SHOP_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
            }
        }

        if (session.screen === "USER_INQUIRY") {
            Database.inquiries.push({ sender: session.tempId, room: room, content: msg, time: Utils.get24HTime(), read: false }); Database.save(); session.screen = "MAIN";
            try { Utils.sendNotify(Config.AdminRoom, m.notifyNewInq(session.tempId)); } catch(e){}
            return SystemAction.go(replier, t.complete, m.inqSubmitSuccess, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
        }
    }
};

// 6-3. 관리자 컨트롤러
var AdminController = {
    handle: function(msg, session, sender, replier, room) {
        var s = ContentManager.screen, f = ContentManager.footer, m = ContentManager.msg, t = ContentManager.title, ui = ContentManager.ui;
        
        if (msg === "refresh_screen") {
            if (session.screen === "IDLE" || session.screen === "ADMIN_MAIN") {
                session.screen = "ADMIN_MAIN";
                var unreadCount = Database.inquiries.filter(function(iq){ return !iq.read; }).length;
                return replier.reply(LayoutManager.renderFrame(s.aMain, LayoutManager.templates.menuList(null, ContentManager.menus.getAdminMain(unreadCount)), false, f.selectNum));
            }
            if (session.screen === "ADMIN_SYS_INFO") {
                var rt = java.lang.Runtime.getRuntime(), used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                return replier.reply(LayoutManager.renderFrame(s.aSys, m.adminSysInfo(used, Object.keys(Database.data).length, Config.Version), true, "확인 완료"));
            }
            if (session.screen === "ADMIN_USER_SELECT") {
                var users = Object.keys(Database.data);
                if (users.length === 0) return SystemAction.go(replier, t.notice, m.adminNoUser, function(){ session.screen = "ADMIN_MAIN"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                session.temp.userList = users; var listText = users.map(function(u, i) { return (i+1) + ". " + u; }).join("\n");
                return replier.reply(LayoutManager.renderFrame(s.aUser, listText, true, f.selectNum));
            }
            if (session.screen === "ADMIN_USER_DETAIL") {
                var head = LayoutManager.renderProfileHead(Database.data[session.temp.targetUser], session.temp.targetUser);
                return replier.reply(LayoutManager.renderFrame(session.temp.targetUser + s.aUserDetail, head + "\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.adminUser), true, f.selectAction));
            }
            if (session.screen === "ADMIN_ACTION_CONFIRM") {
                var body = m.adminActionConfirm(ContentManager.adminMap.actionName[session.temp.adminAction]) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo);
                return replier.reply(LayoutManager.renderFrame(s.aActionCon, body, true, f.selectNum));
            }
            if (session.screen === "ADMIN_INQUIRY_LIST") {
                if (Database.inquiries.length === 0) return SystemAction.go(replier, t.notice, m.adminNoInq, function(){ session.screen = "ADMIN_MAIN"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                var listArr = [], curDate = "";
                for (var i = 0; i < Database.inquiries.length; i++) {
                    var iq = Database.inquiries[i];
                    var datePart = (iq.time && iq.time.length >= 10) ? iq.time.substring(0, 10) : "이전 문의";
                    if (curDate !== datePart) { curDate = datePart; if(listArr.length > 0) listArr.push(""); listArr.push(ui.datePrefix + curDate + ui.dateSuffix); }
                    listArr.push((i+1) + "." + (iq.read ? ui.read : ui.unread) + iq.sender);
                }
                return replier.reply(LayoutManager.renderFrame(s.aInqList, listArr.join("\n"), true, f.aInputInq));
            }
            if (session.screen === "ADMIN_INQUIRY_DETAIL") {
                var iq = Database.inquiries[session.temp.inqIdx];
                if (!iq) return AdminController.handle("이전", session, sender, replier, room);
                if (!iq.read) { iq.read = true; Database.save(); }
                var timeParts = iq.time ? iq.time.split(" ") : ["알 수 없음", ""];
                var content = ui.sender + iq.sender + "\n" + ui.date + timeParts[0] + "\n" + ui.time + (timeParts[1] || "정보 없음") + "\n" + Utils.getFixedDivider() + "\n" + iq.content;
                return replier.reply(LayoutManager.renderFrame(s.aInqDet, content + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.adminInqDetail), true, f.selectAction));
            }
            if (session.screen === "ADMIN_INQUIRY_REPLY") return replier.reply(LayoutManager.renderFrame(s.aInqRep, f.aInputRep, true, f.inputContent));
            if (session.screen === "ADMIN_EDIT_SELECT") return replier.reply(LayoutManager.renderFrame(s.aEditSel, LayoutManager.templates.menuList(null, ContentManager.menus.adminEdit), true, f.selectNum));
            if (session.screen === "ADMIN_EDIT_INPUT") return replier.reply(LayoutManager.renderFrame(s.aEditIn, m.inputNewVal, true, "숫자 입력"));
            if (session.screen === "ADMIN_EDIT_INPUT_CONFIRM") {
                var body = m.adminEditConfirm(ContentManager.adminMap.editName[session.temp.editType], session.temp.editVal) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo);
                return replier.reply(LayoutManager.renderFrame(s.aEditCon, body, true, f.selectNum));
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
                session.temp.targetUser = session.temp.userList[idx]; session.screen = "ADMIN_USER_DETAIL"; return AdminController.handle("refresh_screen", session, sender, replier, room);
            }
        }
        
        if (session.screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") { session.screen = "ADMIN_EDIT_SELECT"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2" || msg === "3" || msg === "4") {
                session.temp.adminAction = msg; session.screen = "ADMIN_ACTION_CONFIRM"; return AdminController.handle("refresh_screen", session, sender, replier, room);
            }
        }
        
        if (session.screen === "ADMIN_ACTION_CONFIRM") {
            var target = session.temp.targetUser; var tData = Database.data[target]; var action = session.temp.adminAction;
            if (msg === "1") {
                if (action === "2") {
                    var currentPw = tData.pw; var currentBan = tData.banned;
                    Database.data[target] = { pw: currentPw, name: target, title: "뉴비", lp: 0, win: 0, lose: 0, level: 1, exp: 0, gold: 1000, point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { titles: ["뉴비"], champions: [] }, items: { statReset: 0, nameChange: 0 }, banned: currentBan };
                    Database.save(); Utils.sendNotify(target, m.adminNotifyInit);
                    return SystemAction.go(replier, t.complete, m.adminInitSuccess, function() { session.screen="ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                }
                if (action === "3") {
                    delete Database.data[target]; Database.save(); Utils.sendNotify(target, m.adminNotifyDelete);
                    return SystemAction.go(replier, t.complete, m.adminDelSuccess, function() { session.screen="ADMIN_USER_SELECT"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                }
                if (action === "4") {
                     tData.banned = !tData.banned; Database.save();
                     Utils.sendNotify(target, tData.banned ? m.adminNotifyBan : m.adminNotifyUnban);
                     return SystemAction.go(replier, t.complete, m.adminBanSuccess, function() { session.screen="ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                }
            } else if (msg === "2") { return SystemAction.go(replier, t.notice, m.adminCancel, function() { session.screen = "ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); }); }
        }

        if (session.screen === "ADMIN_INQUIRY_LIST") {
            var iIdx = parseInt(msg) - 1;
            if (Database.inquiries[iIdx]) { session.temp.inqIdx = iIdx; session.screen = "ADMIN_INQUIRY_DETAIL"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }
        
        if (session.screen === "ADMIN_INQUIRY_DETAIL") {
            var idx = session.temp.inqIdx;
            if (msg === "1") { session.screen = "ADMIN_INQUIRY_REPLY"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") {
                Database.inquiries.splice(idx, 1); Database.save();
                return SystemAction.go(replier, t.complete, m.adminInqDelSuccess, function(){ session.screen = "ADMIN_INQUIRY_LIST"; AdminController.handle("refresh_screen", session, sender, replier, room); });
            }
        }
        
        if (session.screen === "ADMIN_INQUIRY_REPLY") {
            var idx = session.temp.inqIdx; var iq = Database.inquiries[idx];
            if (iq && iq.room) {
                try { Api.replyRoom(iq.room, ui.replyMark + "\n" + Utils.getFixedDivider() + "\n" + msg + "\n" + Utils.getFixedDivider()); } catch(e){}
                return SystemAction.go(replier, t.complete, m.adminReplySuccess, function(){ session.screen = "ADMIN_INQUIRY_LIST"; AdminController.handle("refresh_screen", session, sender, replier, room); });
            }
        }

        if (session.screen === "ADMIN_EDIT_SELECT") {
            if (ContentManager.adminMap.editType[msg]) { session.temp.editType = ContentManager.adminMap.editType[msg]; session.screen = "ADMIN_EDIT_INPUT"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }
        
        if (session.screen === "ADMIN_EDIT_INPUT") {
             var val = parseInt(msg);
             if(isNaN(val)) return SystemAction.go(replier, t.error, m.onlyNumber, function(){ AdminController.handle("refresh_screen", session, sender, replier, room); });
             
             // [추가] 레벨 최대치 예외 처리
             if (session.temp.editType === "level" && (val < 1 || val > MAX_LEVEL)) {
                 return SystemAction.go(replier, t.error, m.invalidLevel, function(){ AdminController.handle("refresh_screen", session, sender, replier, room); });
             }
             
             session.temp.editVal = val; session.screen = "ADMIN_EDIT_INPUT_CONFIRM"; return AdminController.handle("refresh_screen", session, sender, replier, room);
        }
        
        if (session.screen === "ADMIN_EDIT_INPUT_CONFIRM") {
            if (msg === "1") {
                var val = session.temp.editVal; var target = session.temp.targetUser; var typeName = ContentManager.adminMap.editName[session.temp.editType];
                if (session.temp.editType === "level") {
                    var diff = val - Database.data[target].level;
                    if (diff !== 0) { Database.data[target].point += (diff * POINT_PER_LEVEL); if(Database.data[target].point < 0) Database.data[target].point = 0; }
                }
                Database.data[target][session.temp.editType] = val; Database.save();
                Utils.sendNotify(target, m.adminNotifyEdit(typeName, val));
                return SystemAction.go(replier, t.complete, m.adminEditSuccess, function() { session.screen = "ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); });
            } else if (msg === "2") { return SystemAction.go(replier, t.notice, m.adminEditCancel, function() { session.screen = "ADMIN_EDIT_SELECT"; AdminController.handle("refresh_screen", session, sender, replier, room); }); }
        }
    }
};

// ━━━━━━━━ [7. 메인 라우터] ━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        Database.load(); 
        var realMsg = msg.trim();

        if (realMsg === "업데이트" || realMsg === ".업데이트") return;

        // 1. 시간 갱신 없이, 만료 여부만 먼저 검사합니다.
        if (SessionManager.checkTimeout(room, sender, replier)) return;

        var session = SessionManager.get(room, sender);
        var isLogged = (session.tempId && Database.data[session.tempId]);

        if (realMsg === "메뉴") {
            // [수정] 중간에 session.lastTime을 갱신하던 로직 삭제 (타이머 충돌 원인 제거)
            if (room === Config.AdminRoom) { session.screen = "ADMIN_MAIN"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (isLogged) { session.screen = "MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); } 
            else { session.screen = "GUEST_MAIN"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
        }

        if (realMsg === "취소") { 
            var backupId = session.tempId; SessionManager.reset(room, sender); 
            var newSession = SessionManager.get(room, sender);
            if (backupId) { newSession.tempId = backupId; SessionManager.save(); }
            return replier.reply(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.cancel, false, ContentManager.footer.reStart));
        }

        if (realMsg === "이전") {
            if (PrevScreenMap[session.screen]) {
                session.screen = PrevScreenMap[session.screen];
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
        return AuthController.handle(realMsg, session, sender, replier, room);

    } catch (e) {
        try { Api.replyRoom(Config.AdminRoom, ContentManager.msg.sysErrorLog(e)); } catch(err) {} 
        return SystemAction.go(replier, ContentManager.title.sysError, ContentManager.msg.sysErrorLog(e), function() { SessionManager.reset(room, sender); });
    } finally {
        // [핵심] 명령 처리가 완전히 끝난 가장 마지막 순간! 타이머를 단 한 번만 작동시킵니다.
        SessionManager.startAutoTimer(room, sender);
    }
}
