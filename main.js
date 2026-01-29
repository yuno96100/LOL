const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {}; 
if (!global.adminAction) global.adminAction = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!global.sessions[sender]) global.sessions[sender] = { isMenuOpen: false, data: null };
        let userSession = global.sessions[sender].data;
        let isLoggedIn = !!userSession;
        let isPrefix = msg.startsWith(libConst.Prefix);
        let isAdminRoom = (room.trim() === libConst.ErrorLogRoom.trim());

        // [필독 공지 문구]
        const NickWarning = "\n\n⚠️ **주의**: 개인톡/그룹톡 닉네임이 다르면 로그인이 차단됩니다.";

        // [1] 관리자 2차 확인 처리
        if (isAdminRoom && global.adminAction[sender]) {
            let action = global.adminAction[sender];
            if (msg === "확인") {
                if (action.type === "삭제") DB.deleteUser(action.target);
                else if (action.type === "초기화") {
                    let u = DB.readUser(action.target);
                    DB.writeUser(action.target, Obj.getNewUser(u.info.id, u.info.pw, u.info.name));
                }
                replier.reply("✅ [" + action.target + "] " + action.type + " 작업 완료.");
                delete global.adminAction[sender];
            } else if (msg === "취소") {
                delete global.adminAction[sender];
                replier.reply("❌ 취소되었습니다.");
            }
            return;
        }

        // [2] 로그인 권한 체크
        if (!isLoggedIn && !isAdminRoom) {
            const isAuth = msg === libConst.Prefix + "메뉴" || msg.startsWith(libConst.Prefix + "가입") || 
                           msg.startsWith(libConst.Prefix + "로그인") || (global.sessions[sender].isMenuOpen && (msg === "1" || msg === "2"));
            if (!isAuth) {
                if (isGroupChat) {
                    if (isPrefix || !isNaN(msg)) return replier.reply("⚠️ [" + sender + "]님, 로그인이 필요합니다." + NickWarning);
                    return;
                } else {
                    global.sessions[sender].isMenuOpen = true;
                    return replier.reply("👋 로그인 후 이용 가능합니다!\n" + Helper.getMenu(room, isGroupChat, false, null, null, DB) + NickWarning);
                }
            }
        }

        // [3] 명령어 분석
        let command = "";
        let params = [];
        if (isPrefix) {
            let args = msg.split(" ");
            command = args[0].slice(libConst.Prefix.length);
            params = args.slice(1);
        } else if (!isNaN(msg) && global.sessions[sender].isMenuOpen) {
            command = msg.trim();
        } else {
            return;
        }

        // [4] 메뉴 활성화 체크
        if (command !== "메뉴" && !global.sessions[sender].isMenuOpen) {
            return replier.reply("⚠️ 먼저 '" + libConst.Prefix + "메뉴'를 입력해 주세요.");
        }

        // [5] 번호 -> 명령어 변환
        if (!isNaN(command)) {
            let mapped = Helper.getRootCmdByNum(room, isGroupChat, isLoggedIn, command);
            if (mapped) command = mapped;
        }

        // [6] 실행 로직
        switch (command) {
            case "메뉴":
                global.sessions[sender].isMenuOpen = true;
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, null, userSession, DB));
                break;
            case "가입":
                if (isGroupChat) return replier.reply("❌ 개인톡에서 진행하세요.");
                if (params.length < 1) return replier.reply("📝 " + libConst.Prefix + "가입 [비번]" + NickWarning);
                replier.reply(Login.tryRegister(sender, params[0], sender, DB, Obj).msg);
                global.sessions[sender].isMenuOpen = false;
                break;
            case "로그인":
                if (isGroupChat) return replier.reply("❌ 개인톡에서 진행하세요.");
                if (params.length < 1) return replier.reply("🔓 " + libConst.Prefix + "로그인 [비번]" + NickWarning);
                var res = Login.tryLogin(sender, params[0], DB);
                if (res.success) global.sessions[sender].data = res.data;
                replier.reply(res.msg);
                global.sessions[sender].isMenuOpen = false;
                break;
            case "데이터":
            case "유저제어":
                if (!isAdminRoom) return;
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, command, userSession, DB));
                break;
            case "삭제":
                if (!isAdminRoom || params.length < 1) return;
                global.adminAction[sender] = { type: "삭제", target: params[0] };
                replier.reply("⚠️ [" + params[0] + "] 삭제하시겠습니까? (삭제 직전 상태로 복구가능)\n'확인' 또는 '취소' 입력.");
                break;
            case "복구":
                if (!isAdminRoom || params.length < 1) return;
                DB.restoreUser(params[0]); // DataBase.js에 파일이동 로직 필요
                replier.reply("✅ [" + params[0] + "] 삭제 직전 상태로 복구 완료.");
                break;
            case "내정보":
            case "도움말":
            case "정보":
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, command, userSession, DB));
                break;
            case "로그아웃":
                global.sessions[sender].data = null;
                global.sessions[sender].isMenuOpen = false;
                replier.reply("🚪 로그아웃 완료.");
                break;
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
