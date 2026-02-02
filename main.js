/**
 * [main.js] v3.3.6
 * 모듈별 상태 정밀 진단 버전
 */

var C = null, D = null, O = null, LoginM = null, LoginL = null;
var loadStatus = {
    Const: "Wait",
    Database: "Wait",
    Object: "Wait",
    LoginMenu: "Wait",
    LoginLogic: "Wait"
};
var debugMsg = "";

// [초기화 영역] 모든 모듈을 하나씩 정밀하게 로드합니다.
try {
    // 1. Const 로드
    var scC = Bridge.getScopeOf("modules/Const.js");
    if (scC) { C = scC.bridge(); loadStatus.Const = "✅ OK"; } 
    else { loadStatus.Const = "❌ File Not Found"; }

    // 2. Database 로드
    var scD = Bridge.getScopeOf("modules/common/database.js");
    if (scD) { D = scD.bridge(); loadStatus.Database = "✅ OK"; } 
    else { loadStatus.Database = "❌ File Not Found"; }

    // 3. Object 로드
    var scO = Bridge.getScopeOf("modules/common/object.js");
    if (scO) { O = scO.bridge(); loadStatus.Object = "✅ OK"; } 
    else { loadStatus.Object = "❌ File Not Found"; }

    // 4. Login Menu 로드
    var scLM = Bridge.getScopeOf("modules/common/login/menu.js");
    if (scLM) { LoginM = scLM.bridge(); loadStatus.LoginMenu = "✅ OK"; } 
    else { loadStatus.LoginMenu = "❌ File Not Found"; }

    // 5. Login Logic 로드 (현재 에러 지점)
    var scLL = Bridge.getScopeOf("modules/common/login/logic.js");
    if (!scLL) {
        loadStatus.LoginLogic = "❌ File Not Found";
    } else {
        try {
            LoginL = scLL.bridge();
            if (LoginL) loadStatus.LoginLogic = "✅ OK";
            else loadStatus.LoginLogic = "❌ Bridge Return Null";
        } catch (innerE) {
            loadStatus.LoginLogic = "❌ Syntax Error: " + innerE.message;
        }
    }
} catch (e) {
    debugMsg = "🚨 치명적 초기화 오류: " + e.message + " (Line: " + e.lineNumber + ")";
}

// 전역 세션 관리
if (!global.sessions)
