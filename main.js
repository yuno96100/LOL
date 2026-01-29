const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {}; 
if (!global.adminAction) global.adminAction = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!global.sessions[sender]) global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null };
        let session = global.sessions[sender];
        let isLoggedIn = !!session.data;
        let isPrefix = msg.startsWith(libConst.Prefix);
        let isAdminRoom = (room.trim() === libConst.ErrorLogRoom.trim());
        let isMainRoom = (room.trim() === libConst.MainRoomName.trim());

        // [1] 관리자 최종 승인
        if (isAdminRoom && global.adminAction[sender]) {
            if (msg === "확인") {
                let action = global.adminAction[sender];
                if (action.type === "삭제") DB.deleteUser(action.target);
                else if (action.type === "초기화") {
                    let u = DB.readUser(action.target);
                    if (u) DB.writeUser(action.target, Obj.getNewUser(u.info.id, u.info.pw, u.info.name));
                }
                replier.reply("✅ [" + action.target + "] 처리 완료.");
                delete global.adminAction[sender];
                session.isMenuOpen = false; // 완료 후 닫음
            } else if (msg === "취소") {
                delete global.adminAction[sender];
                replier.reply("❌ 취소되었습니다.");
                session.isMenuOpen = false;
            }
            return;
        }

        // [2] 명령어 및 번호 처리
        let command = "";
        if (isPrefix) {
            let cmd = msg.slice(libConst.Prefix.length).split(" ")[0];
            if (cmd === "메뉴") command = "메뉴";
            else return replier.reply("⚠️ 모든 기능은 '" + libConst.Prefix + "메뉴' 입력 후 번호로 이용해주세요.");
        } else if (!isNaN(msg)) {
            // 모든 방에서 메뉴가 열려있을 때만 번호 작동
            if (session.isMenuOpen) {
                let mapped = Helper.getRootCmdByNum(room, isAdminRoom, isMainRoom, isLoggedIn, msg.trim());
                if (mapped) command = mapped;
                else return; 
            } else {
                return replier.reply("⚠️ 현재 메뉴가 닫혀있습니다. '" + libConst.Prefix + "메뉴'를 먼저 입력해주세요.");
            }
        } else if (session.waitAction) {
            handleWaitAction(sender, msg, replier);
            return;
        } else return;

        // [3] 실행 로직
        switch (command) {
            case "메뉴":
                session.isMenuOpen = true;
                session.waitAction = null;
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, null, session.data, DB));
                break;

            case "가입":
                if (isGroupChat) {
                    session.isMenuOpen = false; 
                    return replier.reply("📢 [가입 안내]\n가입은 보안을 위해 '1:1 개인 채팅'에서만 가능합니다.");
                }
                replier.reply("📝 [닉네임] [비밀번호]를 입력해주세요.\n(메뉴를 닫으려면 '취소' 입력)");
                session.waitAction = "가입";
                break;

            case "로그인":
                if (isGroupChat) {
                    session.isMenuOpen = false;
                    return replier.reply("📢 로그인은 '1:1 개인 채팅'에서만 가능합니다.");
                }
                replier.reply("🔓 비밀번호를 입력해주세요.\n(메뉴를 닫으려면 '취소' 입력)");
                session.waitAction = "로그인";
                break;

            case "정보":
                let userCount = DB.getUserList().length;
                replier.reply("🖥️ [ 시스템 정보 ]\n• 버전: v" + libConst.Version + "\n• 유저: " + userCount + "명");
                session.isMenuOpen = false; // 정보 출력 후 닫음
                break;

            case "내정보":
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "내정보", session.data, DB));
                session.isMenuOpen = false; // 내정보 출력 후 닫음
                break;

            case "로그아웃":
                session.data = null;
                session.isMenuOpen = false;
                replier.reply("🚪 로그아웃 되었습니다.");
                break;

            case "유저조회":
            case "삭제":
            case "초기화":
            case "복구":
                if (!isAdminRoom) return;
                replier.reply("🛠️ " + command + "할 대상의 ID를 입력해주세요.");
                session.waitAction = (command === "유저조회") ? "상세조회" : command;
                break;

            case "도움말":
            case "인벤토리":
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, command, session.data, DB));
                // 이런 메뉴들은 추가 조작이 필요할 수 있으므로 열어둠 (필요시 false로 변경 가능)
                break;
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}

function handleWaitAction(sender, msg, replier) {
    let session = global.sessions[sender];
    let action = session.waitAction;
    let input = msg.trim();

    if (input === "취소") {
        delete session.waitAction;
        session.isMenuOpen = false;
        return replier.reply("❌ 취소되었습니다. 메뉴가 닫힙니다.");
    }

    switch (action) {
        case "가입":
            let p = input.split(" ");
            if (p.length < 2) return replier.reply("❌ [닉네임] [비번] 순으로 다시 입력해주세요.");
            replier.reply(Login.tryRegister(sender, p[1], p[0], DB, Obj).msg);
            break;
        case "로그인":
            let res = Login.tryLogin(sender, input, DB);
            if (res.success) session.data = res.data;
            replier.reply(res.msg);
            break;
        case "상세조회":
            let ud = DB.readUser(input);
            if (!ud) return replier.reply("❌ 유저를 찾을 수 없습니다.");
            replier.reply("👤 [ " + ud.info.name + " ] 상세 정보 출력 완료.");
            break;
        case "삭제":
        case "초기화":
            if (!DB.isExisted(input)) return replier.reply("❌ 대상이 없습니다.");
            global.adminAction[sender] = { type: action, target: input };
            replier.reply("⚠️ [" + input + "] " + action + " 하시겠습니까? (확인/취소)");
            return; // adminAction에서 처리하므로 여기서 종료하지 않음
        case "복구":
            if (DB.restoreUser(input)) replier.reply("✅ 복구 완료.");
            else replier.reply("❌ 복구 실패.");
            break;
    }
    delete session.waitAction;
    session.isMenuOpen = false; // 모든 작업 완료 후 메뉴 닫기
}
