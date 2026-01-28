/**
 * LOL실험실 메인 컨트롤러
 * 역할: 메시지 수신, 단톡/개톡 분기, 명령어 파싱 및 모듈 연결
 */

// 1. 모듈 로드
const libConst = Bridge.getScopeOf("Const.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    // [공통] 접두사 확인: 설정한 접두사(.)로 시작하지 않으면 반응하지 않음
    if (!msg.startsWith(libConst.Prefix)) return;

    // [공통] 명령어 파싱
    // 예: ".가입 test 1234" -> command: "가입", params: ["test", "1234"]
    const args = msg.split(" ");
    const command = args[0].slice(libConst.Prefix.length);
    const params = args.slice(1);

    /**
     * 분기 1: 단체톡방 (LOL실험실)
     * 역할: 게임 홍보 및 개인톡 가입 안내
     */
    if (room === libConst.MainRoomName) {
        switch (command) {
            case "도움말":
            case "명령어":
                replier.reply(Helper.getMainHelp());
                break;

            case "등록":
                var regGuide = "━━━━━━━━━━━━━━━\n" +
                               "🧪 LOL실험실 유저 등록 안내\n" +
                               "━━━━━━━━━━━━━━━\n" +
                               sender + "님, 가입을 환영합니다!\n\n" +
                               "정식 가입을 위해 아래 절차를 진행해주세요.\n" +
                               "1. 방장(" + libConst.AdminName + ")에게 1:1 대화 걸기\n" +
                               "2. 개인톡에서 '.가입 [아이디] [비번]' 입력\n" +
                               "━━━━━━━━━━━━━━━";
                replier.reply(regGuide);
                break;

            case "정보":
                replier.reply("실험실 버전: " + libConst.Version + "\n현재 화폐: " + libConst.Currency);
                break;

            default:
                // 단톡방에서는 알 수 없는 명령어에 대답하지 않음 (도배 방지)
                break;
        }
        return; // 단톡방 로직 종료
    }

    /**
     * 분기 2: 개인톡방 (1:1 채팅)
     * 역할: 실제 게임 플레이 (가입, 로그인, 내정보 등)
     */
    if (!isGroupChat) {
        // [참고] 현재는 로그인 세션 기능 구현 전이므로 false로 설정
        // 이후 SessionManager를 통해 실제 로그인 여부를 판단하게 됩니다.
        let isLoggedIn = false; 

        switch (command) {
            case "도움말":
            case "명령어":
                replier.reply(Helper.getPrivateHelp(isLoggedIn));
                break;

            case "가입":
                // 파라미터 체크: 아이디와 비번이 모두 있어야 함
                if (params.length < 2) {
                    replier.reply("⚠️ 가입 실패\n사용법: " + libConst.Prefix + "가입 [ID] [비밀번호]");
                    return;
                }
                // 가입 로직 호출 (아이디, 비밀번호, 카톡닉네임 전달)
                var regResult = Login.tryRegister(params[0], params[1], sender);
                replier.reply(regResult.msg);
                break;

            case "로그인":
                if (params.length < 2) {
                    replier.reply("⚠️ 로그인 실패\n사용법: " + libConst.Prefix + "로그인 [ID] [비밀번호]");
                    return;
                }
                var logResult = Login.tryLogin(params[0], params[1]);
                replier.reply(logResult.msg);
                
                // 로그인 성공 시 이후 로직 처리를 위한 세션 처리가 여기서 진행될 예정
                break;

            case "내정보":
                if (!isLoggedIn) {
                    replier.reply("❌ 로그인이 필요한 기능입니다.");
                } else {
                    replier.reply("📊 정보 조회 기능은 현재 준비 중입니다.");
                }
                break;

            default:
                replier.reply("❓ 알 수 없는 명령어입니다.\n'" + libConst.Prefix + "도움말'을 입력하여 사용 가능한 명령어를 확인하세요.");
                break;
        }
        return; // 개인톡 로직 종료
    }
}
