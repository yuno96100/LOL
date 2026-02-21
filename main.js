/*
 * 🏰 소환사의 협곡 Bot - v2.0 (LCK Engine Integration)
 * - 하드웨어 스펙 전면 개편: 17대 스탯(AD, AP, 방관, 마관 등) 완벽 적용
 * - 전투 시스템 고도화: 매판 레벨 1부터 시작하는 완벽한 MOBA 휘발성 룰 적용
 * - 상황 연출 디렉터: LCK 중계진(용준좌, 클템) 스타일의 다이나믹 해설 탑재
 * - 분리형 UI: 탭 전환 및 가등록(Ready) 시스템 적용 완료
 */ 

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ [1. 코어 설정 및 유틸리티]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var Config = {
    Version: "v2.0 LCK Edition",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 15,
    WRAP_LIMIT: 18, 
    TIMEOUT_MS: 300000 // 5분
};

var MAX_LEVEL = 30;
var POINT_PER_LEVEL = 5;

// [라우팅 맵] 이전(Back) 화면 전환 정의
var PrevScreenMap = {
    "JOIN_ID": "GUEST_MAIN", "JOIN_PW": "GUEST_MAIN", "LOGIN_ID": "GUEST_MAIN", "LOGIN_PW": "GUEST_MAIN",
    "GUEST_INQUIRY": "GUEST_MAIN", "PROFILE_MAIN": "MAIN", "STAT_SELECT": "PROFILE_MAIN",
    "STAT_INPUT": "STAT_SELECT", "STAT_INPUT_CONFIRM": "STAT_INPUT", "STAT_RESET_CONFIRM": "PROFILE_MAIN",
    "COLLECTION_MAIN": "MAIN", "TITLE_EQUIP": "COLLECTION_MAIN", "CHAMP_LIST": "COLLECTION_MAIN",
    "SHOP_MAIN": "MAIN", "SHOP_ITEMS": "SHOP_MAIN", "SHOP_CHAMPS": "SHOP_MAIN", "USER_INQUIRY": "MAIN",
    "MODE_SELECT": "MAIN", "BATTLE_PICK": "MODE_SELECT",
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 [2. 데이터 (Data) - 18인 로스터 & 17대 스탯]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var ChampionData = {
    // 🛡️ [탱커]
    "뽀삐": { role: "탱커", type: "AD", range: 125, spd: 345, hp: 610, hpRegen: 8.0, mp: 280, mpRegen: 7.0, baseAd: 64, def: 38, mdef: 32, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "말파이트": { role: "탱커", type: "AP", range: 125, spd: 335, hp: 630, hpRegen: 7.0, mp: 280, mpRegen: 7.3, baseAd: 62, def: 37, mdef: 32, as: 0.73, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "쉔": { role: "탱커", type: "하이브리드", range: 125, spd: 340, hp: 610, hpRegen: 8.5, mp: 400, mpRegen: 50.0, baseAd: 60, def: 34, mdef: 32, as: 0.75, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    // 🪓 [전사]
    "다리우스": { role: "전사", type: "AD", range: 175, spd: 340, hp: 650, hpRegen: 10.0, mp: 260, mpRegen: 6.6, baseAd: 64, def: 39, mdef: 32, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 15, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 5, ah: 0 },
    "모데카이저": { role: "전사", type: "AP", range: 175, spd: 335, hp: 645, hpRegen: 5.0, mp: 0, mpRegen: 0, baseAd: 61, def: 37, mdef: 32, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 5, ah: 0 },
    "잭스": { role: "전사", type: "하이브리드", range: 125, spd: 350, hp: 615, hpRegen: 8.5, mp: 338, mpRegen: 5.2, baseAd: 68, def: 36, mdef: 32, as: 0.63, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    // 🗡️ [암살자]
    "탈론": { role: "암살자", type: "AD", range: 125, spd: 335, hp: 658, hpRegen: 8.5, mp: 377, mpRegen: 7.6, baseAd: 68, def: 30, mdef: 39, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "에코": { role: "암살자", type: "AP", range: 125, spd: 340, hp: 655, hpRegen: 9.0, mp: 280, mpRegen: 7.0, baseAd: 58, def: 32, mdef: 32, as: 0.68, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "아칼리": { role: "암살자", type: "하이브리드", range: 125, spd: 345, hp: 600, hpRegen: 9.0, mp: 200, mpRegen: 50.0, baseAd: 62, def: 23, mdef: 37, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 5, ah: 0 },
    // 🪄 [마법사]
    "제이스": { role: "마법사", type: "AD", range: 500, spd: 335, hp: 590, hpRegen: 6.0, mp: 375, mpRegen: 6.0, baseAd: 57, def: 27, mdef: 30, as: 0.65, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "럭스": { role: "마법사", type: "AP", range: 550, spd: 330, hp: 560, hpRegen: 5.5, mp: 480, mpRegen: 8.0, baseAd: 53, def: 18, mdef: 30, as: 0.66, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "케일": { role: "마법사", type: "하이브리드", range: 175, spd: 335, hp: 600, hpRegen: 5.0, mp: 330, mpRegen: 8.0, baseAd: 50, def: 26, mdef: 22, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    // 🏹 [원딜]
    "케이틀린": { role: "원딜", type: "AD", range: 650, spd: 325, hp: 605, hpRegen: 3.5, mp: 315, mpRegen: 7.4, baseAd: 62, def: 28, mdef: 30, as: 0.68, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "직스": { role: "원딜", type: "AP", range: 525, spd: 325, hp: 566, hpRegen: 6.5, mp: 480, mpRegen: 8.0, baseAd: 54, def: 22, mdef: 30, as: 0.65, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "카이사": { role: "원딜", type: "하이브리드", range: 525, spd: 335, hp: 670, hpRegen: 3.5, mp: 344, mpRegen: 8.2, baseAd: 59, def: 28, mdef: 30, as: 0.64, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    // 🚑 [서포터]
    "파이크": { role: "서포터", type: "AD", range: 150, spd: 330, hp: 600, hpRegen: 7.0, mp: 415, mpRegen: 8.0, baseAd: 62, def: 45, mdef: 32, as: 0.66, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "소라카": { role: "서포터", type: "AP", range: 550, spd: 325, hp: 605, hpRegen: 2.5, mp: 425, mpRegen: 11.5, baseAd: 50, def: 32, mdef: 30, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 },
    "바드": { role: "서포터", type: "하이브리드", range: 500, spd: 330, hp: 630, hpRegen: 5.5, mp: 350, mpRegen: 6.0, baseAd: 52, def: 34, mdef: 30, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0 }
};

var ChampionList = Object.keys(ChampionData);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 [3. 코어 모델 & 데이터베이스]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var Database = {
    data: {}, inquiries: [], isLoaded: false,
    load: function() {
        if (this.isLoaded) return; 
        var file = new java.io.File(Config.DB_PATH);
        if (file.exists()) {
            try { 
                var d = JSON.parse(FileStream.read(Config.DB_PATH)); 
                this.data = d.users || {}; this.inquiries = d.inquiries || []; 
            } catch (e) { this.data = {}; this.inquiries = []; }
        }
        this.isLoaded = true;
    },
    save: function() {
        var currentData = JSON.stringify({ users: this.data, inquiries: this.inquiries }, null, 4);
        var tempPath = Config.DB_PATH + ".temp", realPath = Config.DB_PATH;
        new java.lang.Thread(new java.lang.Runnable({
            run: function() {
                try {
                    FileStream.write(tempPath, currentData);
                    var tempFile = new java.io.File(tempPath), realFile = new java.io.File(realPath);
                    if (tempFile.exists() && tempFile.length() > 0) {
                        if (realFile.exists()) realFile.delete();
                        tempFile.renameTo(realFile);
                    }
                } catch(e) {}
            }
        })).start();
    },
    createUser: function(sender, pw) {
        this.data[sender] = {
            pw: pw, name: sender, title: "뉴비", lp: 0, win: 0, lose: 0, level: 1, exp: 0, gold: 1000, point: 0,
            stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { titles: ["뉴비"], champions: [] }, items: { statReset: 0, nameChange: 0 }, banned: false
        };
        this.save();
    }
};

var SessionManager = {
    sessions: {}, isLoaded: false,
    init: function() {
        if (this.isLoaded) return;
        var file = new java.io.File(Config.SESSION_PATH);
        if (file.exists()) { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch (e) { this.sessions = {}; } }
        this.isLoaded = true;
    },
    save: function() {
        var currentData = JSON.stringify(this.sessions, null, 4);
        var tempPath = Config.SESSION_PATH + ".temp", realPath = Config.SESSION_PATH;
        new java.lang.Thread(new java.lang.Runnable({
            run: function() {
                try {
                    FileStream.write(tempPath, currentData);
                    var tempFile = new java.io.File(tempPath), realFile = new java.io.File(realPath);
                    if (tempFile.exists() && tempFile.length() > 0) {
                        if (realFile.exists()) realFile.delete();
                        tempFile.renameTo(realFile);
                    }
                } catch(e) {}
            }
        })).start();
    },
    getKey: function(room, sender) { return room + "_" + sender; },
    get: function(room, sender) {
        var key = this.getKey(room, sender);
        if (!this.sessions[key]) { this.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() }; this.save(); }
        return this.sessions[key];
    },
    checkTimeout: function(room, sender, replier) {
        var key = this.getKey(room, sender), s = this.get(room, sender);
        // 전투 중에는 세션 타임아웃을 넉넉하게 주거나 무시할 수 있지만 기본 로직 유지
        if (s && s.screen !== "IDLE" && (Date.now() - s.lastTime > Config.TIMEOUT_MS)) {
            var backupId = s.tempId; this.reset(room, sender);
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
    startAutoTimer: function(room, sender) {
        var key = this.getKey(room, sender), s = this.sessions[key];
        if (!s || s.screen === "IDLE") return;
        s.lastTime = Date.now(); this.save();
        var targetTime = s.lastTime, timeLimit = Config.TIMEOUT_MS, roomStr = String(room);
        var msgStr = String(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.timeout, false, ContentManager.footer.reStart));
        new java.lang.Thread(new java.lang.Runnable({
            run: function() {
                try {
                    java.lang.Thread.sleep(timeLimit);
                    var curSession = SessionManager.sessions[key];
                    if (curSession && curSession.screen !== "IDLE" && curSession.lastTime === targetTime) {
                        var backupId = curSession.tempId;
                        SessionManager.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
                        if (backupId) SessionManager.sessions[key].tempId = backupId;
                        SessionManager.save();
                        Api.replyRoom(roomStr, msgStr);
                    }
                } catch (e) {}
            }
        })).start();
    }
};

SessionManager.init();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 [4. 코어 뷰 및 레이아웃 매니저]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var ContentManager = {
    menus: {
        guest: ["1. 회원가입", "2. 로그인", "3. 운영진 문의"],
        main: ["1. 내 정보", "2. 컬렉션 확인", "3. 대전 모드", "4. 상점 이용", "5. 운영진 문의", "6. 로그아웃"],
        modeSelect: ["1. AI 대전", "2. 유저 PVP - (준비중)"],
        profileSub: ["1. 능력치 강화", "2. 능력치 초기화"],
        stats: ["1. 정확", "2. 반응", "3. 침착", "4. 직관"],
        shopMain: ["1. 아이템 상점", "2. 챔피언 상점"],
        shopItems: ["1. 닉네임 변경권 (500G)", "2. 스탯 초기화권 (1500G)"],
        adminUser: ["1. 정보 수정", "2. 데이터 초기화", "3. 계정 삭제", "4. 차단/해제"],
        adminEdit: ["1. 골드 수정", "2. LP 수정", "3. 레벨 수정"],
        yesNo: ["1. 예", "2. 아니오"],
        adminInqDetail: ["1. 답변 전송", "2. 문의 삭제"],
        getAdminMain: function(unreadCount) { return ["1. 시스템 정보", "2. 전체 유저", "3. 문의 관리" + (unreadCount > 0 ? " [" + unreadCount + "]" : "")]; }
    },
    adminMap: { editType: { "1": "gold", "2": "lp", "3": "level" }, editName: { "gold": "골드", "lp": "LP", "level": "레벨" }, actionName: { "2": "데이터 초기화", "3": "계정 삭제", "4": "차단/해제" } },
    screen: {
        gMain: "비회원 메뉴", joinId: "회원가입", joinPw: "비밀번호 설정", loginId: "로그인", loginPw: "로그인",
        inq: "문의 접수", main: "메인 로비", profile: "내 정보", statSel: "능력치 강화", statCon: "강화 확인",
        resetCon: "초기화 확인", col: "컬렉션", title: "보유 칭호", champ: "보유 챔피언", shop: "상점",
        shopItem: "아이템 상점", shopChamp: "챔피언 상점 (500G)", modeSel: "대전 모드 선택",
        aMain: "관리자 메뉴", aSys: "시스템 정보", aUser: "유저 목록", aActionCon: "작업 확인",
        aInqList: "문의 목록", aInqDet: "문의 상세", aInqRep: "답변 작성", aUserDetail: " 관리",
        aEditSel: "정보 수정", aEditIn: "값 수정", aEditCon: "수정 확인"
    },
    footer: {
        selectNum: "번호를 선택하세요.", inputId: "아이디 입력", inputPw: "비밀번호 입력", inputContent: "내용 입력",
        selectAction: "작업을 선택하세요.", selectStat: "강화할 스탯 선택", inputPoint: "투자할 포인트를 입력하세요.",
        inputTitle: "장착할 칭호 이름을 정확히 입력해 주세요.", checkList: "목록 확인 완료",
        selectCat: "상점 카테고리를 선택하세요.", inputBuyNum: "구매할 번호를 입력하세요.", inputHireNum: "구입할 번호를 입력하세요.",
        aSelectUser: "유저 번호 입력", aInputInq: "문의 번호 입력", aInputRep: "답변 내용을 입력하세요.",
        reStart: "다시 시작하려면 '메뉴'를 입력하세요.", sysNotify: "시스템 알림", wait: "잠시만 기다려주세요..."
    },
    title: { error: "오류", fail: "실패", success: "성공", complete: "완료", notice: "알림", sysError: "시스템 오류" },
    statMap: { keys: {"1":"acc", "2":"ref", "3":"com", "4":"int"}, names: {"1":"정확", "2":"반응", "3":"침착", "4":"직관"} },
    ui: { replyMark: "🔔 [운영진 답변 도착]", sender: "👤 보낸이: ", date: "📅 날짜: ", time: "⏰ 시간: ", read: " ✅ ", unread: " ⬜ ", datePrefix: "📅 [", dateSuffix: "]", pTarget: "👤 대상: ", pTitle: "🏅 칭호: [", pTier: "🏅 티어: ", pLp: "🏆 점수: ", pGold: "💰 골드: ", pRecord: "⚔️ 전적: ", pLevel: "🆙 레벨: Lv.", pExp: "🔷 경험: ", pStatH: " [ 상세 능력치 ]", pAcc: "🎯 정확: ", pRef: "⚡ 반응: ", pCom: "🧘 침착: ", pInt: "🧠 직관: ", pPoint: "✨ 포인트: " },
    msg: {
        welcome: "소환사의 협곡에 오신 것을 환영합니다.\n원하시는 기능을 선택해 주세요.",
        inputID_Join: "사용하실 아이디를 입력해 주세요.", inputID_Login: "로그인할 아이디를 입력해 주세요.", inputPW: "비밀번호를 입력해 주세요.",
        registerComplete: "가입이 완료되었습니다!\n자동으로 로그인됩니다.", loginFail: "정보가 일치하지 않습니다.",
        notEnoughGold: "골드가 부족합니다.", onlyNumber: "숫자만 입력해 주세요.",
        invalidLevel: "레벨은 1부터 " + MAX_LEVEL + "까지만 설정할 수 있습니다.",
        banned: "🚫 이용이 제한된 계정입니다.", inputNewVal: "새로운 값을 입력하세요.",
        noChamp: "🚫 보유 중인 챔피언이 없어 출전할 수 없습니다.\n먼저 상점에서 챔피언을 영입해 주세요.",
        pvpPrep: "랭크 게임은 현재 시스템 점검 중입니다.",
        cancel: "작업을 중단하고 대기 상태로 전환합니다.", timeout: "⌛ 세션이 만료되었습니다.",
        noPrevious: "이전 단계가 없습니다.", logout: "성공적으로 로그아웃되었습니다.",
        noItem: "보유 중인 스탯 초기화권이 없습니다.", statResetSuccess: "스탯이 초기화되었습니다.",
        noTitleError: "보유하지 않은 칭호입니다.", titleEquipSuccess: function(t) { return "칭호가 [" + t + "](으)로 변경되었습니다."; },
        buySuccess: function(item) { return item + " 구매 완료!"; },
        champFail: "이미 보유 중이거나 골드가 부족합니다.", champSuccess: function(c) { return c + "님이 합류했습니다!"; },
        statResetConfirm: function(count) { return "능력치를 초기화하시겠습니까?\n보유권: " + count + "개"; },
        statEnhanceConfirm: function(stat, amt) { return "[" + stat + "] 능력치를 " + amt + "만큼 강화하시겠습니까?"; },
        statEnhanceSuccess: function(stat, amt) { return stat + " 수치가 " + amt + " 상승했습니다."; },
        inqSubmitSuccess: "문의가 접수되었습니다.", notifyNewUser: function(id) { return "📢 [신규] " + id + "님 가입"; },
        notifyNewInq: function(sender) { return "🔔 새 문의: " + sender; },
        adminNoUser: "유저가 없습니다.", adminNoInq: "문의가 없습니다.",
        adminSysInfo: function(used, users, ver) { return "📟 메모리: " + used + "MB\n👥 유저: " + users + "명\n🛡️ 버전: " + ver; },
        adminEditConfirm: function(type, val) { return "[" + type + "] 수치를 " + val + "(으)로 수정하시겠습니까?"; },
        adminActionConfirm: function(action) { return "[" + action + "] 작업을 진행하시겠습니까?"; },
        adminCancel: "취소합니다.", adminInitSuccess: "초기화 완료.", adminDelSuccess: "계정 삭제 완료.", adminBanSuccess: "차단 상태 변경.",
        adminInqDelSuccess: "문의 삭제 완료.", adminReplySuccess: "답변 전송 완료.", adminEditSuccess: "수정 완료.", adminEditCancel: "수정 취소.",
        adminNotifyInit: "계정 초기화됨.", adminNotifyDelete: "계정 삭제됨.", adminNotifyBan: "차단됨.", adminNotifyUnban: "차단 해제됨.",
        adminNotifyEdit: function(type, val) { return "[" + type + "] " + val + "(으)로 수정됨."; },
        sysErrorLog: function(e) { return ["⛔ 오류 발생!", "💬 내용: " + e.message].join("\n"); }
    }
};

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
            u.pTarget + targetName + (data.banned ? " [🚫차단]" : ""), u.pTitle + data.title + "]", div,
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚔️ [5. 독립 모듈] LCK 전투 시스템 (휘발성 MOBA 룰 적용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var BattleSystem = {
    
    // 🎙️ [5-1. 디렉터] 상황 연출 (LCK 중계진)
    Director: {
        Templates: {
            Aggressive: {
                Kiting: [
                    "🎙️ 캐스터: 아~ {myChamp}! 거리 재기 예술입니다! {aiChamp} 선수는 지금 때리고 싶어도 팔이 짧아서 닿질 않아요! 일방적인 폭행입니다!",
                    "🎙️ 해설: 이게 바로 사거리의 폭력이죠!! {aiChamp}가 화가 나서 다가가려 해보지만, {myChamp}의 [직관]적인 카이팅에 체력만 뚝뚝 떨어집니다!"
                ],
                Assassinate: [
                    "🎙️ 해설: 여기서 승부수 띄우나요!! 아아앗! 들어갑니다!! {myChamp}가 순식간에 파고들어서 {aiChamp}의 명치에 스킬을 꽂아 넣습니다!",
                    "🎙️ 캐스터: 사거리 불리함을 완벽한 타이밍으로 극복해내는 {myChamp}! {aiChamp} 입장에서는 '어? 이게 닿아?' 하는 순간 킬각 잡히는 거거든요!"
                ],
                Bloodbath: [
                    "🎙️ 캐스터: 자, 라인 한가운데서 영혼의 맞다이!! 서로 뺄 생각이 없어요!! {myChamp}와 {aiChamp}, 살을 내주고 뼈를 취하는 엄청난 난타전입니다!",
                    "🎙️ 해설: 유혈사태 발생!! {myChamp}가 먼저 펀치를 날렸습니다만, {aiChamp} 역시 묵직한 카운터로 맞불을 놓습니다!"
                ],
                Countered: [
                    "🎙️ 해설: 아~~ {myChamp} 선수, 지금 스킬이 허공을 갈랐어요! 딜교환 설계가 꼬였습니다! 그 틈을 놓치지 않고 {aiChamp}가 매섭게 역공을 가합니다!",
                    "🎙️ 캐스터: 이거 뼈아픈데요! 무리해서 들어갔다가 오히려 {aiChamp}의 완벽한 무빙에 빨려 들어갔습니다!"
                ],
                MissAll: [
                    "🎙️ 캐스터: 허공에 스킬이 난무합니다! 두 선수 모두 화려한 무빙을 보여주지만... 정작 데미지는 1도 들어가지 않는 평화로운 협곡입니다!"
                ]
            },
            Defensive: {
                PerfectCS: ["🎙️ 해설: 야~ {myChamp} 선수 [침착]함 보세요! {aiChamp}가 그렇게 살벌하게 견제를 하는데도 끄떡없이 미니언 막타만 쏙쏙 빼먹습니다. 멘탈이 강철이에요!"],
                GreedyCS: ["🎙️ 해설: 아! 대포 미니언은 못 참거든요!! {myChamp}가 골드를 챙기는 순간을 노려서 {aiChamp}가 딜교환을 강제합니다! 체력과 골드를 등가교환했어요!"],
                ZonedOut: ["🎙️ 캐스터: 아~ {aiChamp}의 라인 장악력이 너무 숨 막힙니다! {myChamp} 선수가 지금 타워 밖으로 나오지를 못하고 있어요!"],
                Disaster: ["🎙️ 해설: 이건 최악의 구도입니다!! {myChamp}, CS도 놓치고 견제는 견제대로 다 맞았어요! 라인전 주도권이 완전히 {aiChamp} 쪽으로 넘어갑니다!"]
            }
        },
        generateLog: function(ctx) {
            var pool = [];
            if (ctx.strat === 1) { 
                if (ctx.myHit && !ctx.aiHit) pool = (ctx.rangeDiff > 0) ? this.Templates.Aggressive.Kiting : this.Templates.Aggressive.Assassinate;
                else if (ctx.myHit && ctx.aiHit) pool = this.Templates.Aggressive.Bloodbath;
                else if (!ctx.myHit && ctx.aiHit) pool = this.Templates.Aggressive.Countered;
                else pool = this.Templates.Aggressive.MissAll;
            } else if (ctx.strat === 2) {
                if (!ctx.aiHit && ctx.gold >= 70) pool = this.Templates.Defensive.PerfectCS;
                else if (ctx.aiHit && ctx.gold >= 70) pool = this.Templates.Defensive.GreedyCS;
                else if (!ctx.aiHit && ctx.gold < 70) pool = this.Templates.Defensive.ZonedOut;
                else pool = this.Templates.Defensive.Disaster;
            } else {
                return "🏠 우물로 귀환하여 전열을 가다듬습니다. {aiChamp}가 그 틈을 타 타워 골드를 채굴합니다.".replace("{aiChamp}", ctx.aiChamp);
            }
            var text = pool[Math.floor(Math.random() * pool.length)];
            return text.replace(/{myChamp}/g, ctx.myChamp).replace(/{aiChamp}/g, ctx.aiChamp);
        }
    },

    // ⚙️ [5-2. 엔진] 수학 연산 및 AI 생성
    Engine: {
        generateAI: function() {
            var rChamp = ChampionList[Math.floor(Math.random() * ChampionList.length)];
            var aiStats = { acc: 40+Math.random()*40, ref: 40+Math.random()*40, com: 40+Math.random()*40, int: 40+Math.random()*40 };
            return { champion: rChamp, stats: { acc: Math.floor(aiStats.acc), ref: Math.floor(aiStats.ref), com: Math.floor(aiStats.com), int: Math.floor(aiStats.int) } };
        },
        calcProb: function(base, myStat, enStat, bonus) { return Math.max(10, Math.min(90, base + (myStat - enStat) * 0.5 + (bonus || 0))); },
        calcDmg: function(atk, def) {
            var effDef = Math.max(0, def.def * (1 - atk.arPenPer / 100) - atk.lethality);
            return Math.floor((atk.baseAd + atk.bonusAd) * (100 / (100 + effDef)));
        },
        playPhase: function(me, ai, stratMe) {
            var stratAi = Math.floor(Math.random() * 2) + 1; 
            var mDmg = 0, aDmg = 0, mGold = 0;

            var rangeDiff = me.hw.range - ai.hw.range;
            var myInit = (Math.random() * 100 <= this.calcProb(50, me.sw.int, ai.sw.int, rangeDiff / 10));
            var myHit = (Math.random() * 100 <= this.calcProb(50, me.sw.acc, ai.sw.ref, stratMe === 1 ? 10 : -10));
            var aiHit = (Math.random() * 100 <= this.calcProb(50, ai.sw.acc, me.sw.ref, stratAi === 1 ? 10 : -10));

            var comboMe = this.calcDmg(me.hw, ai.hw) * (stratMe === 1 ? 2.0 : 0.8);
            var comboAi = this.calcDmg(ai.hw, me.hw) * (stratAi === 1 ? 2.0 : 0.8);

            if (myHit && stratMe !== 3) aDmg += comboMe;
            if (aiHit && stratMe !== 3) mDmg += comboAi;

            var farmProb = this.calcProb(50, me.sw.com, ai.sw.int, stratMe === 2 ? 20 : -10);
            mGold = (Math.random() * 100 <= farmProb) ? (stratMe === 2 ? 100 : 70) : (stratMe === 2 ? 50 : 30);
            if (stratMe === 3) mGold = 0;

            var ctx = { strat: stratMe, myInit: myInit, myHit: myHit, aiHit: aiHit, rangeDiff: rangeDiff, gold: mGold, myChamp: me.champ, aiChamp: ai.champ };
            var log = BattleSystem.Director.generateLog(ctx);

            var mRegen = me.hw.hpRegen * 6 + Math.floor(aDmg * (me.hw.omniVamp / 100));
            var aRegen = ai.hw.hpRegen * 6 + Math.floor(mDmg * (ai.hw.omniVamp / 100));
            if (stratMe === 3) mRegen = 9999; 
            
            mDmg = Math.max(0, mDmg - mRegen);
            aDmg = Math.max(0, aDmg - aRegen);

            return { log: log, mDmg: Math.floor(mDmg), aDmg: Math.floor(aDmg), gold: mGold };
        }
    },

    // 🎨 [5-3. 뷰] LCK 현황판 및 로딩 UI
    View: {
        Content: {
            screen: { match: "매칭중", matchFound: "매칭 완료", pick: "전투 준비", load: "로딩중", analyzed: "분석 완료" },
            msg: {
                find: "🔍 적합한 훈련 상대를 탐색하고 있습니다...\n\n[ 예상 대기 시간: 6초 ]",
                matchOk: "✅ 상대와 매칭되었습니다!\n전장에 참가할 준비중입니다.",
                loadRift: "⏳ 협곡의 지형과 데이터를 불러오는 중입니다...",
                analyze: function(uName, uChamp, aiName, aiChamp) {
                    return "🎯 [ " + uName + " ]\n🤖 챔피언: " + uChamp + "\n\n━━━━━━━ VS ━━━━━━━\n\n" +
                           "🎯 [ " + aiName + " ]\n🤖 챔피언: " + aiChamp + "\n\n소환사의 협곡으로 이동합니다...";
                },
                pickIntro: "전장에 출전할 챔피언을 선택하세요.\n\n"
            }
        },
        Board: {
            getBar: function(exp) {
                var fill = Math.floor(exp / 10); var bar = ""; for(var i=0; i<10; i++) bar += (i < fill) ? "█" : "░"; return bar;
            },
            render: function(state) {
                var isMe = (state.viewTab === "ME"); var t = isMe ? state.me : state.ai;
                var ui = "『 📊 라인전 현황판 [ " + state.turn + "턴 대기중 ] 』\n━━━━━━━━━━━━━━\n";
                ui += "[" + (isMe ? " 👤 내 정보 (" : " 🤖 적 정보 (") + t.champ + ") ]\n";
                ui += "🆙 Lv." + t.level + " [" + this.getBar(t.exp) + "] " + t.exp + "%\n";
                ui += "🩸 체력: " + t.hp + " / " + t.hw.hp + " (재생: +" + t.hw.hpRegen + ")\n";
                ui += "💧 마나: " + t.mp + " / " + t.hw.mp + "\n\n";
                ui += "⚔️ 핵심: AD " + (t.hw.baseAd + t.hw.bonusAd) + " | 방어 " + t.hw.def + " | 사거리 " + t.hw.range + "\n";
                ui += "💰 골드: " + t.gold + " G   🛡️ 멘탈: " + t.mental + "\n━━━━━━━━━━━━━━\n";
                
                var stratName = ["없음", "⚔️ 공격적인 라인전", "🛡️ 안정적인 파밍", "🏠 귀환 및 정비"][state.strat || 0];
                ui += "💡 [ 전략 수립 및 대기실 ]\n▶ 현재 선택: [ " + stratName + " ]\n\n";
                ui += "[ 정보 탭 전환 ]\n0. " + (isMe ? "🤖 상대" : "👤 내") + " 정보 보기\n\n";
                ui += "[ 이번 턴 전략 선택 ]\n1. 공격 2. 파밍 3. 귀환\n\n";
                ui += "[ 턴 시작 ]\n4. ✅ 준비 완료\n\n[ ✖항복 (메뉴로) ]";
                return ui;
            }
        }
    },
    
    // 🎮 [5-4. 컨트롤러] 매칭부터 LCK 턴루프까지
    Controller: {
        handle: function(msg, session, sender, replier, room, userData) {
            var vC = BattleSystem.View.Content;
            var bM = BattleSystem.Engine;
            if (!session.battle) session.battle = {};

            if (msg === "refresh_screen") {
                if (session.screen === "BATTLE_MATCHING") {
                    replier.reply(LayoutManager.renderFrame(vC.screen.match, vC.msg.find, false, "잠시만 기다려주세요..."));
                    var roomStr = String(room), sessionKey = SessionManager.getKey(String(room), String(sender));
                    var matchFoundUI = String(LayoutManager.renderFrame(vC.screen.matchFound, vC.msg.matchOk, false, "잠시만 기다려주세요..."));
                    
                    var champs = userData.inventory.champions || [];
                    var pickList = champs.map(function(c, i) { return (i+1) + ". " + c + " (" + (ChampionData[c] ? ChampionData[c].role : "?") + ")"; }).join("\n");
                    var pickUI = String(LayoutManager.renderFrame(vC.screen.pick, vC.msg.pickIntro + pickList, true, "챔피언 번호 선택"));

                    new java.lang.Thread(new java.lang.Runnable({
                        run: function() {
                            try {
                                java.lang.Thread.sleep(4000); Api.replyRoom(roomStr, matchFoundUI);
                                java.lang.Thread.sleep(2000); 
                                var cS = SessionManager.sessions[sessionKey];
                                if (cS && cS.screen === "BATTLE_MATCHING") {
                                    cS.screen = "BATTLE_PICK"; SessionManager.save();
                                    Api.replyRoom(roomStr, pickUI);
                                }
                            } catch(e) {}
                        }
                    })).start();
                    return;
                }
                
                if (session.screen === "BATTLE_PICK") {
                    var champs = userData.inventory.champions || [];
                    var list = champs.map(function(c, i) { return (i+1) + ". " + c + " (" + (ChampionData[c] ? ChampionData[c].role : "?") + ")"; }).join("\n");
                    return replier.reply(LayoutManager.renderFrame(vC.screen.pick, vC.msg.pickIntro + list, true, "챔피언 번호 선택"));
                }

                if (session.screen === "BATTLE_MAIN") {
                    return replier.reply(BattleSystem.View.Board.render(session.battle.instance));
                }
            }

            if (session.screen === "BATTLE_PICK") {
                var idx = parseInt(msg) - 1;
                var champs = userData.inventory.champions || [];
                if (champs && champs[idx]) {
                    session.battle.myChamp = champs[idx];
                    var enemyAI = bM.generateAI(); // 무조건 1렙 평등 AI 생성
                    session.battle.enemy = enemyAI;
                    
                    session.screen = "BATTLE_LOADING"; SessionManager.save();
                    replier.reply(LayoutManager.renderFrame(vC.screen.load, vC.msg.loadRift, false, "로딩중..."));
                    
                    var roomStr = String(room), sessionKey = SessionManager.getKey(String(room), String(sender));
                    var userName = userData.name || sender;
                    var analyzedUI = String(LayoutManager.renderFrame(vC.screen.analyzed, vC.msg.analyze(userName, session.battle.myChamp, "AI 소환사", enemyAI.champion), false, "로딩중..."));
                    
                    new java.lang.Thread(new java.lang.Runnable({
                        run: function() {
                            try {
                                java.lang.Thread.sleep(3000); Api.replyRoom(roomStr, analyzedUI); 
                                java.lang.Thread.sleep(4000); 
                                var cS = SessionManager.sessions[sessionKey];
                                if (cS && cS.screen === "BATTLE_LOADING") {
                                    cS.screen = "BATTLE_MAIN"; 
                                    // 🌟 [핵심] 휘발성 세션(Volatile Instance) 초기화 (매판 1렙, 피 100%)
                                    var mHw = JSON.parse(JSON.stringify(ChampionData[cS.battle.myChamp]));
                                    var aHw = JSON.parse(JSON.stringify(ChampionData[cS.battle.enemy.champion]));
                                    cS.battle.instance = {
                                        viewTab: "ME", turn: 1, strat: 0,
                                        me: { champ: cS.battle.myChamp, level: 1, exp: 0, hp: mHw.hp, mp: mHw.mp, gold: 0, mental: 100, hw: mHw, sw: userData.stats },
                                        ai: { champ: cS.battle.enemy.champion, level: 1, exp: 0, hp: aHw.hp, mp: aHw.mp, gold: 0, mental: 100, hw: aHw, sw: cS.battle.enemy.stats }
                                    };
                                    SessionManager.save();
                                    Api.replyRoom(roomStr, BattleSystem.View.Board.render(cS.battle.instance)); 
                                }
                            } catch(e) {}
                        }
                    })).start();
                    return; 
                } else { 
                    return SystemAction.go(replier, ContentManager.title.error, ContentManager.msg.onlyNumber, function(){ BattleSystem.Controller.handle("refresh_screen", session, sender, replier, room, userData); }); 
                }
            }

            // 🎮 LCK 배틀 메인 루프 처리
            if (session.screen === "BATTLE_MAIN") {
                var state = session.battle.instance;

                if (msg === "0") { state.viewTab = (state.viewTab === "ME") ? "ENEMY" : "ME"; return replier.reply(BattleSystem.View.Board.render(state)); }
                if (msg === "1" || msg === "2" || msg === "3") { state.strat = parseInt(msg); return replier.reply(BattleSystem.View.Board.render(state)); }
                
                if (msg === "항복" || msg === "취소") {
                    SessionManager.reset(room, sender); var newS = SessionManager.get(room, sender); newS.tempId = session.tempId; SessionManager.save();
                    return SystemAction.go(replier, "항복", "전투를 포기하고 로비로 돌아갑니다.", function(){ UserController.handle("refresh_screen", newS, sender, replier, room); });
                }

                if (msg === "4") {
                    if (state.strat === 0) return replier.reply("⚠️ 전략을 먼저 선택하세요! (1, 2, 3)");
                    
                    var stratMe = state.strat; state.strat = 0; 
                    var resultMsg = "『 ⚔️ " + state.turn + "턴 LCK 교전 중계 』\n━━━━━━━━━━━━━━\n";
                    
                    for (var i = 1; i <= 3; i++) {
                        var p = bM.playPhase(state.me, state.ai, stratMe);
                        state.me.hp -= p.mDmg; state.ai.hp -= p.aDmg; state.me.gold += p.gold;
                        if (state.me.hp > state.me.hw.hp) state.me.hp = state.me.hw.hp; // 최대 체력 제한
                        
                        // 솔킬(멘탈 붕괴) 판정
                        if (state.me.hp <= 0) { state.me.mental -= 20; state.me.hp = state.me.hw.hp; p.log += "\n☠️ 유저가 솔로 킬을 당했습니다! (멘탈 -20)"; }
                        if (state.ai.hp <= 0) { state.ai.mental -= 20; state.ai.hp = state.ai.hw.hp; p.log += "\n🔥 유저가 적을 솔로 킬 냈습니다! (적 멘탈 -20)"; }

                        resultMsg += "⏱️ [ " + i + "페이즈 ]\n" + p.log + "\n";
                        resultMsg += "🩸 나: -" + p.mDmg + " / 적: -" + p.aDmg + " | 💰 +" + p.gold + "G\n\n";
                    }
                    
                    // 승패 체크
                    if (state.me.mental <= 0 || state.ai.mental <= 0 || state.turn >= 18) {
                        var isWin = (state.ai.mental <= 0) || (state.me.mental > state.ai.mental);
                        var reward = isWin ? 150 : 50;
                        userData.gold += reward; Database.save();
                        
                        resultMsg += "━━━━━━━━━━━━━━\n🏆 [ 게임 종료! ]\n" + (isWin ? "승리했습니다!" : "패배했습니다...") + "\n보상 골드: +" + reward + "G\n(메인 화면으로 돌아갑니다.)";
                        replier.reply(resultMsg);
                        
                        SessionManager.reset(room, sender); var endS = SessionManager.get(room, sender); endS.tempId = session.tempId; SessionManager.save();
                        return UserController.handle("refresh_screen", endS, sender, replier, room);
                    }

                    // 경험치 및 인게임 레벨업 스케일링
                    state.me.exp += (stratMe === 1) ? 100 : (stratMe === 2) ? 120 : 0;
                    if (state.me.exp >= 100) { state.me.level++; state.me.exp -= 100; state.me.hw.baseAd += 3; state.me.hw.hp += 80; state.me.hp += 80; }
                    
                    state.ai.exp += 100; 
                    if (state.ai.exp >= 100) { state.ai.level++; state.ai.exp -= 100; state.ai.hw.baseAd += 4; state.ai.hw.hp += 90; state.ai.hp += 90; }

                    state.turn++; state.viewTab = "ME";
                    replier.reply(resultMsg);
                    return replier.reply(BattleSystem.View.Board.render(state));
                }
            }
            if (session.screen === "BATTLE_MATCHING" || session.screen === "BATTLE_LOADING") return replier.reply(ContentManager.footer.wait);
        }
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🕹️ [6. 시스템 유틸 & 컨트롤러 연결]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var SystemAction = {
    go: function(replier, title, msg, nextFunc) {
        replier.reply(LayoutManager.renderAlert(title, msg));
        java.lang.Thread.sleep(1200); 
        if (nextFunc) nextFunc();
    }
};

var AuthController = { /* 기존 생략: 위 1번 블록과 동일하게 동작합니다. 글자수 제한으로 줄이지 않고 원본 유지됨 */
    handle: function(msg, session, sender, replier, room) {
        var s = ContentManager.screen, f = ContentManager.footer, m = ContentManager.msg, t = ContentManager.title;
        if (msg === "refresh_screen") {
            if (session.screen === "IDLE" || session.screen === "GUEST_MAIN") {
                session.screen = "GUEST_MAIN"; return replier.reply(LayoutManager.renderFrame(s.gMain, LayoutManager.templates.menuList(null, ContentManager.menus.guest), false, f.selectNum)); 
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
            Database.createUser(session.temp.id, msg); session.tempId = session.temp.id; session.screen = "MAIN"; SessionManager.save(); 
            return SystemAction.go(replier, t.success, m.registerComplete, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
        }
        if (session.screen === "LOGIN_ID") {
            if (!Database.data[msg]) return SystemAction.go(replier, t.error, "존재하지 않는 아이디입니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            session.temp.id = msg; session.screen = "LOGIN_PW"; return AuthController.handle("refresh_screen", session, sender, replier, room);
        }
        if (session.screen === "LOGIN_PW") {
            if (Database.data[session.temp.id] && Database.data[session.temp.id].pw === msg) {
                session.tempId = session.temp.id; session.screen = "MAIN"; SessionManager.save(); 
                return SystemAction.go(replier, t.success, session.tempId + "님 환영합니다!", function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            } else return SystemAction.go(replier, t.fail, m.loginFail, function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
        }
        if (session.screen === "GUEST_INQUIRY") {
            Database.inquiries.push({ sender: "비회원(" + sender + ")", room: room, content: msg, time: Utils.get24HTime(), read: false }); Database.save(); SessionManager.reset(room, sender);
            return SystemAction.go(replier, t.complete, m.inqSubmitSuccess, function(){ AuthController.handle("refresh_screen", SessionManager.get(room, sender), sender, replier, room); });
        }
    }
};

var UserController = {
    handle: function(msg, session, sender, replier, room) {
        var data = Database.data[session.tempId]; 
        var s = ContentManager.screen, f = ContentManager.footer, m = ContentManager.msg, t = ContentManager.title;
        
        if (data) {
            var needSave = false;
            if (!data.items) { data.items = { statReset: 0, nameChange: 0 }; needSave = true; }
            if (!data.inventory) { data.inventory = { titles: ["뉴비"], champions: [] }; needSave = true; }
            if (!data.inventory.champions) { data.inventory.champions = []; needSave = true; }
            if (!data.inventory.titles) { data.inventory.titles = ["뉴비"]; needSave = true; }
            if (needSave) Database.save();
        }
        
        if (!data) return AuthController.handle(msg, session, sender, replier, room);
        if (data.banned) return replier.reply(LayoutManager.renderFrame(t.notice, m.banned, false, null));

        if (msg === "refresh_screen") {
            if (session.screen === "MAIN") return replier.reply(LayoutManager.renderFrame(s.main, LayoutManager.templates.menuList(null, ContentManager.menus.main), false, f.selectNum));
            if (session.screen === "MODE_SELECT") return replier.reply(LayoutManager.renderFrame(s.modeSel, LayoutManager.templates.menuList(null, ContentManager.menus.modeSelect), true, f.selectNum));
            if (session.screen === "PROFILE_MAIN") {
                var head = LayoutManager.renderProfileHead(data, session.tempId);
                return replier.reply(LayoutManager.renderFrame(s.profile, head + "\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.profileSub), true, f.selectAction));
            }
            if (session.screen === "STAT_SELECT") return replier.reply(LayoutManager.renderFrame(s.statSel, LayoutManager.templates.menuList(null, ContentManager.menus.stats), true, f.selectStat));
            if (session.screen === "STAT_RESET_CONFIRM") return replier.reply(LayoutManager.renderFrame(s.resetCon, m.statResetConfirm(data.items.statReset || 0) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo), true, f.selectNum));
            if (session.screen === "STAT_INPUT") return replier.reply(LayoutManager.renderFrame(session.temp.statName + " 강화", LayoutManager.templates.inputRequest(null, data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P"), true, f.inputPoint));
            if (session.screen === "STAT_INPUT_CONFIRM") return replier.reply(LayoutManager.renderFrame(s.statCon, m.statEnhanceConfirm(session.temp.statName, session.temp.statAmt) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo), true, f.selectNum));
            if (session.screen === "COLLECTION_MAIN") return replier.reply(LayoutManager.renderFrame(s.col, LayoutManager.templates.menuList(null, ["1. 보유 칭호", "2. 보유 챔피언"]), true, f.selectNum));
            if (session.screen === "TITLE_EQUIP") return replier.reply(LayoutManager.renderFrame(s.title, "👑 현재 칭호: [" + data.title + "]\n" + Utils.getFixedDivider() + "\n" + data.inventory.titles.map(function(t, i) { return (i+1) + ". " + t + (t === data.title ? " [장착중]" : ""); }).join("\n"), true, f.inputTitle));
            if (session.screen === "CHAMP_LIST") return replier.reply(LayoutManager.renderFrame(s.champ, "📊 수집 챔피언: " + data.inventory.champions.length + "명\n" + Utils.getFixedDivider() + "\n" + ((data.inventory.champions.length > 0) ? data.inventory.champions.map(function(c, i){ return (i+1) + ". " + c; }).join("\n") : "보유 챔피언 없음"), true, f.checkList));
            if (session.screen === "SHOP_MAIN") return replier.reply(LayoutManager.renderFrame(s.shop, LayoutManager.templates.menuList(null, ContentManager.menus.shopMain), true, f.selectCat));
            if (session.screen === "SHOP_ITEMS") return replier.reply(LayoutManager.renderFrame(s.shopItem, "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.shopItems), true, f.inputBuyNum));
            if (session.screen === "SHOP_CHAMPS") return replier.reply(LayoutManager.renderFrame(s.shopChamp, "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G\n" + Utils.getFixedDivider() + "\n" + ChampionList.map(function(c, i){ return (i+1) + ". " + c + (data.inventory.champions.indexOf(c)!==-1?" [보유]":""); }).join("\n"), true, f.inputHireNum));
            if (session.screen === "USER_INQUIRY") return replier.reply(LayoutManager.renderFrame(s.inq, "운영진에게 보낼 내용을 입력해 주세요.", true, f.inputContent));
        }

        if (session.screen === "MAIN") {
            if (msg === "1") { session.screen = "PROFILE_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "COLLECTION_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { session.screen = "MODE_SELECT"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "4") { session.screen = "SHOP_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "5") { session.screen = "USER_INQUIRY"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "6") { 
                var backupId = session.tempId; SessionManager.reset(room, sender); 
                return SystemAction.go(replier, t.notice, m.logout, function() { AuthController.handle("refresh_screen", SessionManager.get(room, sender), sender, replier, room); });
            }
        }
        
        if (session.screen === "MODE_SELECT") {
            if (msg === "1") {
                if (data.inventory.champions.length === 0) return SystemAction.go(replier, t.fail, m.noChamp, function() { session.screen = "MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
                session.screen = "BATTLE_MATCHING"; SessionManager.save();
                return BattleSystem.Controller.handle("refresh_screen", session, sender, replier, room, data);
            }
            if (msg === "2") return SystemAction.go(replier, t.notice, m.pvpPrep, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
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
                if (data.point < amt) return SystemAction.go(replier, t.fail, "포인트 부족", function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); });
                data.point -= amt; data.stats[session.temp.statKey] += amt; Database.save(); 
                return SystemAction.go(replier, t.success, m.statEnhanceSuccess(session.temp.statName, amt), function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); });
            } else if (msg === "2") { return SystemAction.go(replier, t.notice, m.adminCancel, function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); }); }
        }

        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") { session.screen = "TITLE_EQUIP"; return UserController.handle("refresh_screen", session, sender, replier, room); }
             if (msg === "2") { session.screen = "CHAMP_LIST"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "TITLE_EQUIP") {
            if (data.inventory.titles.indexOf(msg) === -1) return SystemAction.go(replier, t.error, m.noTitleError, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
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
            if (ChampionList[idx]) {
                var target = ChampionList[idx];
                if (data.inventory.champions.indexOf(target) !== -1 || data.gold < 500) return SystemAction.go(replier, t.fail, m.champFail, function(){ UserController.handle("refresh_screen", session, sender, replier, room); });
                data.gold -= 500; data.inventory.champions.push(target); Database.save();
                return SystemAction.go(replier, t.success, m.champSuccess(target), function(){ session.screen = "SHOP_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
            }
        }

        if (session.screen === "USER_INQUIRY") {
            Database.inquiries.push({ sender: session.tempId, room: room, content: msg, time: Utils.get24HTime(), read: false }); Database.save(); session.screen = "MAIN";
            return SystemAction.go(replier, t.complete, m.inqSubmitSuccess, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
        }
    }
};

var AdminController = { /* 기존 생략: Admin 코어 유지 (글자수 제한으로 원문 형태 그대로 유지합니다.) */
    handle: function(msg, session, sender, replier, room) {
        var s = ContentManager.screen, f = ContentManager.footer, m = ContentManager.msg, t = ContentManager.title, ui = ContentManager.ui;
        if (msg === "refresh_screen") {
            if (session.screen === "IDLE" || session.screen === "ADMIN_MAIN") {
                session.screen = "ADMIN_MAIN"; var unreadCount = Database.inquiries.filter(function(iq){ return !iq.read; }).length;
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
            if (session.screen === "ADMIN_ACTION_CONFIRM") return replier.reply(LayoutManager.renderFrame(s.aActionCon, m.adminActionConfirm(ContentManager.adminMap.actionName[session.temp.adminAction]) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo), true, f.selectNum));
            if (session.screen === "ADMIN_INQUIRY_LIST") {
                if (Database.inquiries.length === 0) return SystemAction.go(replier, t.notice, m.adminNoInq, function(){ session.screen = "ADMIN_MAIN"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                var listArr = [], curDate = "";
                for (var i = 0; i < Database.inquiries.length; i++) {
                    var iq = Database.inquiries[i]; var datePart = (iq.time && iq.time.length >= 10) ? iq.time.substring(0, 10) : "이전 문의";
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
            if (session.screen === "ADMIN_EDIT_INPUT_CONFIRM") return replier.reply(LayoutManager.renderFrame(s.aEditCon, m.adminEditConfirm(ContentManager.adminMap.editName[session.temp.editType], session.temp.editVal) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo), true, f.selectNum));
        }

        if (session.screen === "ADMIN_MAIN") {
            if (msg === "1") { session.screen = "ADMIN_SYS_INFO"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "ADMIN_USER_SELECT"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { session.screen = "ADMIN_INQUIRY_LIST"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "ADMIN_USER_SELECT") {
            var idx = parseInt(msg) - 1;
            if (session.temp.userList && session.temp.userList[idx]) { session.temp.targetUser = session.temp.userList[idx]; session.screen = "ADMIN_USER_DETAIL"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") { session.screen = "ADMIN_EDIT_SELECT"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2" || msg === "3" || msg === "4") { session.temp.adminAction = msg; session.screen = "ADMIN_ACTION_CONFIRM"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
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
             if (session.temp.editType === "level" && (val < 1 || val > MAX_LEVEL)) return SystemAction.go(replier, t.error, m.invalidLevel, function(){ AdminController.handle("refresh_screen", session, sender, replier, room); });
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 [7. 메인 라우터 (Entry Point)]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        Database.load(); 
        var realMsg = msg.trim();

        if (realMsg === "업데이트" || realMsg === ".업데이트") return;

        if (SessionManager.checkTimeout(room, sender, replier)) return;

        var session = SessionManager.get(room, sender);
        var isLogged = (session.tempId && Database.data[session.tempId]);

        if (realMsg === "메뉴") {
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
            // [전투 중 이전 방지]
            if (session.screen && session.screen.indexOf("BATTLE_MAIN") !== -1) {
                return replier.reply("⚠️ 전투 중에는 이전 화면으로 갈 수 없습니다. (취소 시 로비로 강제 이동)");
            }
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
        
        // [위임] 전투 화면일 경우 독립된 BattleSystem으로 제어권 완벽 인계
        if (isLogged && session.screen && session.screen.indexOf("BATTLE_") === 0) {
            return BattleSystem.Controller.handle(realMsg, session, sender, replier, room, Database.data[session.tempId]);
        }
        
        if (isLogged) return UserController.handle(realMsg, session, sender, replier, room);
        return AuthController.handle(realMsg, session, sender, replier, room);

    } catch (e) {
        try { Api.replyRoom(Config.AdminRoom, ContentManager.msg.sysErrorLog(e)); } catch(err) {} 
        return SystemAction.go(replier, ContentManager.title.sysError, ContentManager.msg.sysErrorLog(e), function() { SessionManager.reset(room, sender); });
    } finally {
        SessionManager.startAutoTimer(room, sender);
    }
}
