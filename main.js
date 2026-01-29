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
        let isMainRoom = (room.trim() === libConst.MainRoomName.trim());

        // [1] 안내 문구 정의
        const NickWarning = "\n\n⚠️ 주의: 개인톡과 단체톡의 카카오톡 닉네임이 같아야 같은 유저로 인식합니다.";
        const NameUsage = "\n💡 가입 시 닉네임은 내 정보에 출력되는 닉네임 입니다.";

        // [2] 관리자 2차 확인 로직 (확인/취소 응답 처리)
        if (isAdminRoom && global.adminAction[sender]) {
            let action = global.adminAction[sender];
            if (msg === "확인") {
                if (action.type === "삭제") {
                    DB.deleteUser(action.target);
                } else if (action.type === "초기화") {
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

        // [3] 명령어 분석
        let command = "";
        let params = [];
        if (isPrefix) {
            let args = msg.split(" ");
            command = args[0].slice(libConst.Prefix.length);
            params = args.slice(1);
        } else if (!isNaN(msg) && global.sessions[sender].isMenuOpen) {
            command = msg.trim();
        } else { return; }

        // [4] 번호 -> 명령어 변환 (Helper 연동)
        if (!isNaN(command)) {
            let mapped = Helper.getRootCmdByNum(room, isMainRoom, isLoggedIn, command);
            if (mapped) command = mapped;
        }

        // [5] 실행 로직
        switch (command) {
            case "메뉴":
                global.sessions[sender].isMenuOpen = true;
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, null, userSession, DB));
                break;

            case "가입":
                if (isMainRoom) return replier.reply("❌ 가입은 개인톡에서만 가능합니다.");
                if (params.length < 2) return replier.reply("📝 [가입 안내]\n" + libConst.Prefix + "가입 [닉네임] [비번]\n예: " + libConst.Prefix + "가입 야스오 1234" + NickWarning + NameUsage);
                
                let inputNick = params[0].trim();
                let inputPw = params[1].trim();

                if (DB.isExisted(sender)) return replier.reply("⚠️ 이미 가입된 계정입니다.");

                var regResult = Login.tryRegister(sender, inputPw, inputNick, DB, Obj);
                replier.reply(regResult.msg + NickWarning + NameUsage);
                if (regResult.success) global.sessions[sender].isMenuOpen = false;
                break;

            case "로그인":
                if (isMainRoom) return;
                if (params.length < 1) return replier.reply("🔓 " + libConst.Prefix + "로그인 [비번]" + NickWarning);
                var res = Login.tryLogin(sender, params[0], DB);
                if (res.success) global.sessions[sender].data = res.data;
                replier.reply(res.msg);
                break;

            case "정보":
                let userCount = DB.getUserList().length;
                let activeSessions = Object.keys(global.sessions).filter(k => global.sessions[k].data).length;
                let infoMsg = "🖥️ [ 봇 시스템 정보 ]\n━━━━━━━━━━━━━━━\n";
                infoMsg += "• 버전: v" + libConst.Version + "\n• 그룹톡: " + libConst.MainRoomName + "\n• 관리방: " + libConst.ErrorLogRoom + "\n";
                infoMsg += "• 유저: " + userCount + "명 / 세션: " + activeSessions + "개\n━━━━━━━━━━━━━━━";
                replier.reply(infoMsg);
                break;

            case "유저조회":
                if (!isAdminRoom) return;
                if (params.length > 0) {
                    let targetId = params[0].trim();
                    let ud = DB.readUser(targetId);
                    if (!ud) return replier.reply("❌ [" + targetId + "] 유저가 없습니다.");
                    let detail = "👤 [ " + ud.info.name + " 상세 ]\n━━━━━━━━━━━━━━━\n• ID: " + ud.info.id + "\n• 가입일: " + ud.info.joinDate + "\n• 돈: " + ud.status.money + "G\n━━━━━━━━━━━━━━━";
                    replier.reply(detail);
                } else {
                    replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "유저조회", userSession, DB));
                }
                break;

            case "삭제":
                if (!isAdminRoom) return;
                if (params.length < 1) return replier.reply("📝 " + libConst.Prefix + "삭제 [ID] 형식으로 입력해주세요.");
                let targetDelete = params[0].trim();
                if (!DB.isExisted(targetDelete)) return replier.reply("❌ [" + targetDelete + "] 유저를 찾을 수 없습니다.");
                
                global.adminAction[sender] = { type: "삭제", target: targetDelete };
                replier.reply("⚠️ [" + targetDelete + "] 유저를 정말로 삭제하시겠습니까?\n'확인' 또는 '취소'를 입력해 주세요.");
                break;

            case "초기화":
                if (!isAdminRoom) return;
                if (params.length < 1) return replier.reply("📝 " + libConst.Prefix + "초기화 [ID] 형식으로 입력해주세요.");
                let targetReset = params[0].trim();
                if (!DB.isExisted(targetReset)) return replier.reply("❌ [" + targetReset + "] 유저를 찾을 수 없습니다.");
                
                global.adminAction[sender] = { type: "초기화", target: targetReset };
                replier.reply("⚠️ [" + targetReset + "] 유저를 초기화하시겠습니까?\n'확인' 또는 '취소'를 입력해 주세요.");
                break;

            case "복구":
                if (!isAdminRoom) return;
                if (params.length < 1) return replier.reply("📝 " + libConst.Prefix + "복구 [ID] 형식으로 입력해주세요.");
                let targetRestore = params[0].trim();
                if (DB.restoreUser(targetRestore)) replier.reply("✅ [" + targetRestore + "] 복구 완료.");
                else replier.reply("❌ 복구 실패 (파일 없음).");
                break;

            case "로그아웃":
                global.sessions[sender].data = null;
                global.sessions[sender].isMenuOpen = false;
                replier.reply("🚪 로그아웃 완료.");
                break;

            case "내정보":
            case "도움말":
            case "유저제어":
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, command, userSession, DB));
                break;
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}
