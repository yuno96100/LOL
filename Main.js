// Main.js 상단
var libConst, helper, login_Manager;

function init() {
    try {
        libConst = Bridge.getScopeOf("Const.js");
        helper = Bridge.getScopeOf("Helper.js");
        // LoginManager를 가져올 때 에러 방지를 위해 초기화 함수 호출
        var loginScope = Bridge.getScopeOf("LoginManager.js");
        if(loginScope && loginScope.LoginManager) {
            login_Manager = loginScope.LoginManager();
        }
    } catch(e) {
        Log.e("초기화 실패: " + e);
    }
}

// 봇이 켜질 때 실행
init();

function response(room, msg, sender, isGroupChat, replier) {
    // 0. 혹시 모르니 다시 한번 체크
    if(!libConst) init();

    // 1. 접두사 확인 (현재 설정한 '.')
    if (!msg.startsWith(".")) return;

    // 2. 테스트 명령어 (이게 안 오면 설정 문제)
    if (msg === ".테스트") return replier.reply("✅ 봇 응답 가능");

    // 3. Helper 실행
    // 여기서 주의! Helper.js 내부의 "!명령어"를 ".명령어"로 고쳤는지 확인하세요.
    if (helper.Directions(room, msg, replier)) return;

    // 4. 방 분기
        if (room === libConst.MainRoomNmae) {
            if (cmd === "ID확인") {
                let id = args[1];
                if (!id) return replier.reply("💡 사용법: .ID확인 [ID]");
                if (login_Manager.isExist(id)) replier.reply("❌ 이미 사용 중인 ID입니다.");
                else replier.reply("✅ [" + id + "]는 사용 가능합니다.");
            }
        } else {
            if (cmd === "등록") {
                if (args.length < 3) return replier.reply("💡 사용법: .등록 [ID] [PW]");
                replier.reply(login_Manager.register(room, args[1], args[2]));
            } else if (cmd === "로그인") {
                if (args.length < 3) return replier.reply("💡 사용법: .로그인 [ID] [PW]");
                replier.reply(login_Manager.login(room, args[1], args[2]));
            }
        }
    } catch (e) {
        replier.reply("⚠️ 에러: " + e.message + "\n라인: " + e.lineNumber);
    }
}
