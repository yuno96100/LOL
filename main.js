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
        let userSession = global.sessions[sender].data;
        let isLoggedIn = !!userSession;
        let isPrefix = msg.startsWith(libConst.Prefix);
        let isAdminRoom = (room.trim() === libConst.ErrorLogRoom.trim());
        let isMainRoom = (room.trim() === libConst.MainRoomName.trim());

        // [1] 관리자 최종 승인 단계 (확인/취소)
        if (isAdminRoom && global.adminAction[sender]) {
            if (msg === "확인") {
                let action = global.adminAction[sender];
                if (action.type === "삭제") DB.deleteUser(action.target);
                else if (action.type === "초기화") {
                    let u = DB.readUser(action.target);
                    if (u) DB.writeUser(action.target, Obj.getNewUser(u.info.id, u.info.pw, u.info.name));
                }
                replier.reply("✅ [" + action.target + "] " + action.type + " 처리가 완료되었습니다.");
                delete global.adminAction[sender];
            } else if (msg === "취소") {
                delete global.adminAction[sender];
                replier.reply("❌ 취소되었습니다.");
            }
            return;
        }

        // [2] 명령어 입력 필터링
        let command = "";
        if (isPrefix) {
            let cmd = msg.slice(libConst.Prefix.length).split(" ")[0];
            if (cmd === "메뉴") command = "메뉴";
            else return replier.reply("⚠️ 모든 기능은 '" + libConst.Prefix + "메뉴' 후 번호로 입력해주세요.");
        } else if (!isNaN(msg)) {
            if (global.sessions[sender].isMenuOpen) {
                let mapped = Helper.getRootCmdByNum(room, isAdminRoom, isMainRoom, isLoggedIn, msg.trim());
                if (mapped) command = mapped;
            } else return replier.reply("⚠️ 먼저 '" + libConst.Prefix + "메뉴'를 입력해주세요.");
        } else if (global.sessions[sender].waitAction) {
            // [입력 대기 처리] 번호를 누른 후 데이터를 입력하는 단계
            handleWaitAction(sender, msg, replier);
            return;
        } else return;

        // [3] 실행 로직
        switch (command) {
            case "메뉴":
                global.sessions[sender].isMenuOpen = true;
                global.sessions[sender].waitAction = null;
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, null, userSession, DB));
                break;

            case "가입":
                replier.reply("📝 가입을 위해 [닉네임] [비밀번호]를 입력해주세요.\n(예: 야스오 1234)");
                global.sessions[sender].waitAction = "가입";
                break;

            case "로그인":
                replier.reply("🔓 비밀번호를 입력해주세요.");
                global.sessions[sender].waitAction = "로그인";
                break;

            case "유저조회":
                if (!isAdminRoom) return;
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "유저조회", userSession, DB) + "\n\n🔍 상세조회할 ID를 입력해주세요.");
                global.sessions[sender].waitAction = "상세조회";
                break;

            case "삭제":
            case "초기화":
            case "복구":
                if (!isAdminRoom) return;
                replier.reply("🛠️ " + command + "할 유저의 ID를 입력해주세요.");
                global.sessions[sender].waitAction = command;
                break;

            case "정보":
                let userCount = DB.getUserList().length;
                replier.reply("🖥️ [ 시스템 정보 ]\n━━━━━━━━━━━━━━━\n• 버전: v" + libConst.Version + "\n• 유저: " + userCount + "명\n━━━━━━━━━━━━━━━");
                break;

            case "로그아웃":
                global.sessions[sender].data = null;
                global.sessions[sender].isMenuOpen = false;
                replier.reply("🚪 로그아웃 되었습니다.");
                break;

            case "내정보":
            case "도움말":
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, command, userSession, DB));
                break;
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}

// [4] 대화형 입력 처리 함수
function handleWaitAction(sender, msg, replier) {
    let action = global.sessions[sender].waitAction;
    let input = msg.trim();

    switch (action) {
        case "가입":
            let p = input.split(" ");
            if (p.length < 2) return replier.reply("❌ [닉네임] [비번] 순으로 입력해주세요.");
            replier.reply(Login.tryRegister(sender, p[1], p[0], DB, Obj).msg);
            break;
        case "로그인":
            let res = Login.tryLogin(sender, input, DB);
            if (res.success) global.sessions[sender].data = res.data;
            replier.reply(res.msg);
            break;
        case "상세조회":
            let ud = DB.readUser(input);
            if (!ud) return replier.reply("❌ 유저를 찾을 수 없습니다.");
            replier.reply("👤 [ " + ud.info.name + " ]\n• ID: " + ud.info.id + "\n• 가금: " + ud.status.money + "G\n• 레벨: " + ud.status.level);
            break;
        case "삭제":
        case "초기화":
            if (!DB.isExisted(input)) return replier.reply("❌ 유저가 없습니다.");
            global.adminAction[sender] = { type: action, target: input };
            replier.reply("⚠️ [" + input + "] " + action + " 하시겠습니까? (확인/취소)");
            break;
        case "복구":
            if (DB.restoreUser(input)) replier.reply("✅ [" + input + "] 복구 완료.");
            else replier.reply("❌ 복구할 파일이 없습니다.");
            break;
    }
    global.sessions[sender].waitAction = null; // 처리 후 대기상태 해제
}
