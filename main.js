/* ==========================================
   1. 라이브러리 안전 로드 섹션
   ========================================== */
var Const = Bridge.getScopeOf("Const.js").bridge();
var DB = Bridge.getScopeOf("DataBase.js").bridge();
var Obj = Bridge.getScopeOf("Object.js").bridge();
var Login = Bridge.getScopeOf("LoginManager.js").bridge();
var Helper = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {};
if (!global.adminAction) global.adminAction = {};

/* ==========================================
   2. 메인 응답 엔진
   ========================================== */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // 세션 초기화 및 방어
    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.sessions[sender];

    // [Line 32 에러 방어] Const.Prefix가 유효한지 먼저 확인
    var prefix = (Const && Const.Prefix) ? Const.Prefix : ".";

    // 필터링: 관련 없는 메시지는 즉시 무시
    if (!input.startsWith(prefix) && isNaN(input) && !session.waitAction && input !== "취소") return;

    try {
        // [취소 로직]
        if (input === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            global.adminAction[sender] = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        var isAdminRoom = (room === Const.ErrorLogRoom);
        var isMainRoom = (room === Const.MainRoomName);

        // 1. 관리자 승인 대기
        if (isAdminRoom && global.adminAction[sender]) {
            handleAdmin(sender, input, replier);
            return;
        }

        // 2. 입력값 대기 (가입/로그인 등)
        if (session.waitAction) {
            handleWait(sender, input, replier, session, isAdminRoom);
            return;
        }

        // 3. 명령어 처리
        if (input === prefix + "메뉴") {
            session.isMenuOpen = true;
            session.currentView = "메인";
            replier.reply(Helper.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, DB));
            return;
        }

        // 4. 번호 선택
        if (session.isMenuOpen && !isNaN(input)) {
            handleSelect(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        // 에러 발생 시 상세 정보 출력
        var errInfo = "[!] " + e.message + " (Line: " + e.lineNumber + ")";
        Api.replyRoom(Const.ErrorLogRoom, "🚨 시스템 에러 발생\n" + errInfo);
    }
}

/* ==========================================
   3. 기능 분할 섹션
   ========================================== */

function handleSelect(num, sender, session, replier, room, isMain, isAdmin) {
    if (session.currentView === "유저조회") {
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            return showDetail(global.tempUserList[idx], replier);
        }
    }
    
    var cmd = Helper.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (cmd) {
        session.currentView = cmd;
        execCmd(cmd, sender, session, replier, room, isMain, isAdmin);
    }
}

function execCmd(cmd, sender, session, replier, room, isMain, isAdmin) {
    var m = { "가입": "📝 닉네임", "로그인": "🔑 닉네임", "삭제": "🛠️ 삭제대상", "초기화": "🛠️ 초기화대상", "복구": "🛠️ 복구대상" };
    
    if (m[cmd]) {
        replier.reply(m[cmd] + " 입력 ('취소'로 중단)");
        session.waitAction = cmd;
    } else if (cmd === "로그아웃") {
        session.data = null; session.isMenuOpen = false;
        replier.reply("🚪 로그아웃 완료.");
    } else {
        var res = Helper.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, DB);
        if (res) replier.reply(res);
        if (cmd !== "유저조회" && cmd !== "상점" && cmd !== "내정보") session.isMenuOpen = false;
    }
}

function handleWait(sender, msg, replier, session, isAdmin) {
    var act = session.waitAction;
    if (act === "가입") replier.reply(Login.tryRegister(sender, msg, DB, Obj).msg);
    else if (act === "로그인") {
        var res = Login.tryLogin(msg, DB);
        if (res.success) {
            session.data = res.data;
            replier.reply("✅ [" + res.data.info.name + "]님 로그인.");
        } else replier.reply("🚫 " + res.msg);
    } else if (isAdmin && (act === "삭제" || act === "초기화")) {
        global.adminAction[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] " + act + " 진행? (확인/취소)");
    } else if (isAdmin && act === "복구") {
        replier.reply(DB.restoreUser(msg) ? "✅ 복구 성공" : "❌ 복구 실패");
    }
    session.waitAction = null;
}

function handleAdmin(sender, msg, replier) {
    var a = global.adminAction[sender];
    if (msg === "확인") {
        if (a.type === "삭제") DB.deleteUser(a.target);
        else if (a.type === "초기화") {
            var u = DB.readUser(a.target);
            if (u) DB.writeUser(a.target, Obj.getNewUser(u.info.id, "0", u.info.name));
        }
        replier.reply("✅ 완료되었습니다.");
    } else replier.reply("❌ 취소되었습니다.");
    delete global.adminAction[sender];
}

function showDetail(id, replier) {
    var u = DB.readUser(id);
    if (!u) return;
    replier.reply("👤 [" + u.info.name + "]\n• LV: " + u.status.level + "\n• GOLD: " + u.status.money + "G");
}
