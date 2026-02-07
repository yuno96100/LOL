/**
 * [main.js] v8.9.39
 * 개인톡(인증) / 단체방(활동) / 관리자방(관제) 무생략 통합본
 * 각 기능 및 로직 단계별 상세 구분 주석 적용 완료
 */

// ============================================================
// [SECTION 01] 환경 설정 및 상수 정의 (Global Config)
// ============================================================
var Config = {
    // --- [기본] 봇 및 보안 설정 ---
    Prefix: ".",
    AdminHash: "2056407147",        // 관리자 고유 해시 (보안용)
    AdminRoom: "소환사의협곡관리",     // 관리자 전용 관제실
    GroupRoom: "소환사의협곡",       // 메인 단체 활동방
    BotName: "소환사의 협곡",

    // --- [파일] 시스템 저장 경로 ---
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",

    // --- [UI] 디자인 규격 설정 ---
    LINE_CHAR: "━", 
    FIXED_LINE: 17, 
    NAV_LEFT: "     ", 
    NAV_RIGHT: " ",
    NAV_ITEMS: ["⬅️ 이전", "❌ 취소", "🏠 메뉴"]
};

// ============================================================
// [SECTION 02] UI 자동화 엔진 (UI Engine)
// ============================================================
var UI = {
    // --- [기능] 표준 레이아웃 생성 ---
    make: function(title, content, help) {
        var div = Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR);
        var res = "『 " + title + " 』\n" + div + "\n" + content + "\n" + div + "\n";
        if (help) res += "💡 " + help + "\n" + div + "\n";
        return res + Config.NAV_LEFT + Config.NAV_ITEMS.join("      ") + Config.NAV_RIGHT;
    },

    // --- [기능] 화면 이동 및 히스토리 스택 관리 ---
    go: function(session, screen, title, content, help) {
        // [Step 1] 현재 화면 위치를 히스토리에 저장 (이전 가기용)
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
        // [Step 2] 세션 정보 업데이트
        session.screen = screen;
        session.lastTitle = title;
        return this.make(title, content, help);
    },

    // --- [기능] 환경 및 상태별 메인 메뉴 결정 ---
    renderMenu: function(session) {
        session.history = []; // 메뉴 이동 시 기록 초기화
        
        // [분기 1] 관리자 모드
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호를 선택하세요.");
        
        // [분기 2] 단체방 모드
        if (session.type === "GROUP") {
            if (!session.data) return this.make("알림", "개인톡에서 먼저\n로그인을 완료해주세요.", "보안상 절차입니다.");
            return this.go(session, "GROUP_MAIN", "단체방 메뉴", "1. 내 전적 확인\n2. 랭킹 보기", "번호 선택");
        }
        
        // [분기 3] 개인톡 모드 (미인증/인증)
        if (!session.data) return this.go(session, "GUEST_MAIN", "협곡 입구", "1. 회원가입\n2. 로그인", "인증이 필요합니다.");
        return this.go(session, "USER_MAIN", "개인 메뉴", "1. 프로필\n2. 상점\n3. 로그아웃", "작업 선택");
    }
};

// ============================================================
// [SECTION 03] 관리자 로직 핸들러 (Admin Room Logic)
// ============================================================
var AdminManager = {
    handle: function(msg, session, replier, startTime) {
        // --- [공통] 관리자 이전 가기 처리 ---
        if (msg === "이전" && session.history.length > 0) {
            var prev = session.history.pop();
            return replier.reply(UI.go(session, prev.screen, prev.title, "이전 단계입니다.", "수행할 번호 입력"));
        }

        // --- [분기] 관리자 화면별 상세 로직 ---
        switch(session.screen) {
            case "ADMIN_MAIN":
                if (msg === "1") { // 시스템 상태 모니터링
                    var rt = java.lang.Runtime.getRuntime();
                    var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                    replier.reply(UI.make("서버 모니터링", "⚡ 응답속도: " + (new Date().getTime() - startTime) + "ms\n📟 메모리: " + used + "MB", "정상 가동 중"));
                } else if (msg === "2") { // 유저 데이터 리스트업
                    session.cache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_LIST", "유저 목록", session.cache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "상세 관리 번호 입력"));
                }
                break;
        }
    }
};

// ============================================================
// [SECTION 04] 단체방 로직 핸들러 (Group Room Logic)
// ============================================================
var GroupManager = {
    handle: function(msg, session, replier) {
        // --- [로직] 단체방 활동 분기 ---
        switch(session.screen) {
            case "GROUP_MAIN":
                if (msg === "1") { // 단체방 내 개인 정보 뷰
                    var d = session.data;
                    var info = "🏆 점수: " + d.lp + " LP\n💰 보유: " + d.gold + " G";
                    replier.reply(UI.make(session.tempId + "님의 정보", info, "단체방 전용 뷰"));
                }
                break;
        }
    }
};

// ============================================================
// [SECTION 05] 개인톡 로직 핸들러 (Direct DM Logic)
// ============================================================
var UserManager = {
    handle: function(msg, session, replier) {
        var d = session.data;

        // --- [로직 A] 미인증/로그인 전 상태 ---
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "가입", "ID를 입력하세요.", "중복체크 진행"));
                    else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "로그인", "ID를 입력하세요.", "인증 대기"));
                    break;
                case "JOIN_ID":
                    if (Database.data[msg]) return replier.reply(UI.make("중복", "이미 있는 ID입니다.", "다른 ID 입력"));
                    session.tempId = msg;
                    replier.reply(UI.go(session, "JOIN_PW", "가입", "비밀번호를 입력하세요.", "보안 주의"));
                    break;
                case "JOIN_PW":
                    // [Step 1] DB에 유저 생성
                    Database.data[session.tempId] = { pw: msg, gold: 1000, lp: 0, collection: [] };
                    Database.save(Database.data);
                    session.data = Database.data[session.tempId];
                    // [Step 2] 관리자방 실시간 자동 알림 (UI 적용)
                    Api.replyRoom(Config.AdminRoom, UI.make("신규가입 알림", "유저 [" + session.tempId + "] 님 가입!", "시스템 관제 보고"));
                    replier.reply(UI.renderMenu(session));
                    break;
                case "LOGIN_ID":
                    session.tempId = msg;
                    replier.reply(UI.go(session, "LOGIN_PW", "로그인", "비밀번호를 입력하세요.", "대소문자 구분"));
                    break;
                case "LOGIN_PW":
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId];
                        replier.reply(UI.renderMenu(session));
                    } else {
                        replier.reply(UI.make("실패", "계정 정보가 틀립니다.", "다시 시도"));
                    }
                    break;
            }
        } 
        // --- [로직 B] 인증 완료/활동 중 상태 ---
        else {
            if (msg === "이전") return replier.reply(UI.renderMenu(session));
            switch(session.screen) {
                case "USER_MAIN":
                    if (msg === "1") replier.reply(UI.make("프로필", "상세 정보를 조회합니다.", "상세 보기"));
                    break;
            }
        }
    }
};

// ============================================================
// [SECTION 06] 데이터 및 세션 코어 시스템 (Persistence)
// ============================================================
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(room, hash, sender) {
        // [Step 1] 세션 존재 확인 및 초기 생성
        if (!this.sessions[hash]) {
            this.sessions[hash] = { data: null, screen: "IDLE", history: [], lastTitle: "", tempId: null, cache: [] };
        }
        var s = this.sessions[hash];
        
        // [Step 2] 현재 접속 환경 식별
        if (room === Config.AdminRoom) s.type = "ADMIN";
        else if (room === Config.GroupRoom) s.type = "GROUP";
        else s.type = "DIRECT";

        // [Step 3] 단체방 세션 동기화 (개인톡의 로그인 정보를 단체방 세션에 주입)
        if (s.type === "GROUP") {
            for (var k in this.sessions) {
                if (this.sessions[k].type === "DIRECT" && this.sessions[k].tempId === sender) {
                    s.data = this.sessions[k].data;
                    s.tempId = this.sessions[k].tempId;
                }
            }
        }
        return s;
    },
    reset: function(session) {
        session.screen = "IDLE";
        session.history = [];
        session.cache = [];
    }
};

// ============================================================
// [SECTION 07] 메인 응답 처리부 (Main Response Entry)
// ============================================================
Database.data = Database.load(); SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var startTime = new Date().getTime(); // 응답 속도 측정 시작
    try {
        if (!msg) return;

        // --- [Step 1] 식별 및 기본 세션 로드 ---
        var hash = String(imageDB.getProfileHash());
        var session = SessionManager.get(room, hash, sender);
        msg = msg.trim();

        // --- [Step 2] 전역 시스템 탈출 로직 ---
        if (msg === "취소" || msg === "메뉴") { 
            SessionManager.reset(session); 
            return replier.reply(UI.renderMenu(session)); 
        }
        
        // --- [Step 3] 접속 환경에 따른 로직 핸들러 실행 ---
        // 1. 관리자 보안 인증 핸들러
        if (session.type === "ADMIN" && hash === Config.AdminHash) {
            AdminManager.handle(msg, session, replier, startTime);
        } 
        // 2. 단체방 전용 핸들러
        else if (session.type === "GROUP") {
            GroupManager.handle(msg, session, replier);
        } 
        // 3. 개인톡 가입/활동 핸들러
        else {
            UserManager.handle(msg, session, replier);
        }

        // --- [Step 4] 세션 변경사항 영구 저장 ---
        SessionManager.save();

    } catch (e) {
        // --- [예외 처리] 에러 발생 시 관리자 방으로 자동 보고 ---
        Api.replyRoom(Config.AdminRoom, UI.make("⚠️ 스크립트 에러", "내용: " + e.message, "라인: " + e.lineNumber));
    }
}
