/*
 * 🏰 소환사의 협곡 Bot - v12.3 (Syntax Error Fix & Auto-Battler)
 * - [M] Model: 메신저봇R Rhino 엔진 호환성 100% 패치 (ES6 Spread 문법 제거)
 * - [V] View: UI 카테고리화 및 미니맵 렌더링
 * - [C] Controller: 스레드 내부 에러 강제 출력(Catch) 시스템 적용
 */    

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ [0. 전역 설정 및 유틸리티 (Config & Utils)]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var Config = {
    Version: "v12.3 Stable Edition",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━", FIXED_LINE: 19, WRAP_LIMIT: 25, 
    TIMEOUT_MS: 300000, 
    
    Timers: {
        matchSearch: 2000,  
        matchFound: 1500,   
        loading: 2000,      
        vsScreen: 3500,     
        battleStart: 2500,  
        phaseDelay: 8000,   
        gameOver: 3000,     
        systemAction: 1200  
    },
    SpellCD: {
        "점멸": 5, "점화": 4, "회복": 4, "방어막": 4, "정화": 4, "탈진": 4
    }
};

var MAX_LEVEL = 30;
var POINT_PER_LEVEL = 5;
var RoleList = ["탱커", "전사", "암살자", "마법사", "원딜", "서포터"];
var SpellList = ["점멸", "점화", "회복", "방어막", "정화", "탈진"];

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
        if (lp >= 1400) return { name: "에메랄드", icon: "💚" };
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

function getRoleMenuText(data) {
    var roleTextArr = [];
    var emojis = ["🛡️", "🪓", "🗡️", "🪄", "🏹", "🚑"];
    for (var i = 0; i < RoleList.length; i++) {
        var r = RoleList[i];
        var allInRole = ChampionList.filter(function(c) { return ChampionData[c].role === r; }).length;
        var myInRole = data.inventory.champions.filter(function(c) { return ChampionData[c].role === r; }).length;
        roleTextArr.push((i+1) + ". " + emojis[i] + " " + r + " (" + myInRole + "/" + allInRole + ")");
    }
    return roleTextArr.join("\n");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 [1. VIEW] 텍스트 콘텐츠 관리 (ContentManager & Layout)
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
        roles: ["1. 🛡️ 탱커", "2. 🪓 전사", "3. 🗡️ 암살자", "4. 🪄 마법사", "5. 🏹 원딜", "6. 🚑 서포터"], 
        spells: ["1. 🏃 점멸 (돌진/회피)", "2. 🔥 점화 (처형/치감)", "3. 💚 회복 (치유/이속)", "4. 🛡️ 방어막 (피해흡수)", "5. ✨ 정화 (CC해제)", "6. 📉 탈진 (무력화)"],
        getAdminMain: function(unreadCount) { return ["1. 시스템 정보", "2. 전체 유저", "3. 문의 관리" + (unreadCount > 0 ? " [" + unreadCount + "]" : "")]; }
    },
    adminMap: { editType: { "1": "gold", "2": "lp", "3": "level" }, editName: { "gold": "골드", "lp": "LP", "level": "레벨" }, actionName: { "2": "데이터 초기화", "3": "계정 삭제", "4": "차단/해제" } },
screen: {
        gMain: "비회원 메뉴", joinId: "회원가입", joinPw: "비밀번호 설정", loginId: "로그인", loginPw: "로그인",
        inq: "문의 접수", main: "메인 로비", profile: "내 정보", statSel: "능력치 강화", statCon: "강화 확인",
        resetCon: "초기화 확인", col: "컬렉션", title: "보유 칭호", champ: "보유 챔피언", shop: "상점",
        shopItem: "아이템 상점", shopChamp: "챔피언 상점", 
        modeSel: "대전 모드 선택", lobby: "전투 준비 로비", roleSelect: "역할군 선택", spellPick: "스펠 장착",
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
        sysErrorLog: function(e) { return ["⛔ 오류 발생!", "💬 내용: " + e].join("\n"); }
    },
    
    battle: {
        director: {
            Aggressive: { MildTrade: "🎙️ 캐스터: 가벼운 딜교환이 오갑니다. 서로 간만 보네요.", Kiting: "🎙️ 해설: 사거리를 이용한 완벽한 카이팅! 상대는 닿지도 못합니다!", Assassinate: "🎙️ 캐스터: 거리를 좁히며 순식간에 파고들어 콤보를 꽂아 넣습니다!", Bloodbath: "🎙️ 해설: 사거리 안에서 서로 엄청난 스킬 난타전!! 피가 쭉쭉 빠집니다!", Countered: "🎙️ 캐스터: 무리한 진입! 오히려 뼈아픈 역공을 맞습니다!", MissAll: "🎙️ 해설: 닿지 않는 거리! 서로 무빙만 치며 견제합니다." },
            Defensive: { NormalFarm: "🎙️ 해설: 안전한 거리를 유지하며 안정적으로 라인을 당겨 먹습니다.", PerfectCS: "🎙️ 캐스터: 엄청난 침착함! 견제 속에서도 막타를 다 챙깁니다!", CannonMissed: "🎙️ 해설: 아아아!! 거리가 안닿아요!! 대포 미니언을 놓쳤어요!!", GreedyCS: "🎙️ 캐스터: CS를 먹으려 앞으로 나갔다가 딜교환을 강제당합니다!", ZonedOut: "🎙️ 해설: 라인 장악력이 숨 막힙니다! 디나이 당하며 파밍도 못하고 있어요!", Disaster: "🎙️ 캐스터: 최악의 구도입니다!! 파밍도 놓치고 일방적으로 맞았어요!" },
            baseRecall: "🏠 거리를 완전히 벌리고 우물로 귀환하여 전열을 가다듬습니다."
        },
        effectMap: {
            "shield_on_hit": "적중 시 보호막 획득", "slow_field": "광역 둔화 지대 생성", "block_dash_ms": "돌진 차단 및 이동속도 증가", "wall_stun": "지형(벽) 충돌 시 대상 기절", "knockup_away": "적을 멀리 날려버림 (에어본)",
            "shield_regen": "비전투 시 바위 보호막 재생", "steal_ms": "대상 이동속도 강탈", "armor_up_aoe": "방어력 증가 및 주위 마법 피해", "atkSpdDown": "적중 대상 공격속도 둔화", "aoe_stun": "광역 에어본 및 기절",
            "shield_on_skill": "스킬 사용 시 보호막 획득", "empower_auto": "다음 기본 공격 강화", "aoe_dodge": "광역 기본 공격 회피 존 생성", "taunt": "주변 적 도발", "global_shield_tp": "아군 글로벌 보호막 및 순간이동",
            "bleed_stack": "출혈 스택 부여", "heal_missing_hp": "적중 시 잃은 체력 비례 회복", "heavy_slow": "강력한 둔화 부여", "pull_arPen": "적 끌어당김 및 방어구 관통", "true_execute": "고정 피해 및 HP 판정 처형",
            "aoe_aura_on_3_hit": "3회 적중 시 광역 마법피해 오라", "iso_dmg": "단일 대상 고립 추가 피해", "shield_to_heal": "받은 피해 쉴드 전환 및 회복", "pull_magic_pen": "끌어당김 및 마법 관통", "stat_steal": "적 주요 능력치 강탈 (1:1 세계)",
            "atk_spd_stack": "기본 공격 시 공격속도 증가", "gap_close": "대상에게 도약 (돌진)", "auto_reset_bonus": "기본 공격 캔슬 및 추가 피해", "dodge_stun": "기본 공격 회피 후 광역 기절", "bonus_resist": "방어력 및 마법 저항력 증가",
            "bleed_on_3_hit": "3회 적중 후 평타 시 출혈", "melee_crit_heal": "근접 치명타 및 처치 시 회복", "return_slow": "돌아오는 투사체 둔화", "jump_wall": "지형(벽) 뛰어넘기", "invis_ms_aoe": "은신, 이속 증가 및 광역 투사체",
            "bonus_dmg_ms_on_3_hit": "3회 적중 시 마법피해 및 이속 증가", "out_in_slow": "투사체 왕복 및 둔화", "delayed_stun_shield": "지연 폭발 광역 기절 및 보호막", "dash_blink_bonus": "돌진 후 다음 평타 시 순간이동", "time_rewind": "과거 위치로 귀환 및 체력 회복/광역 피해",
            "bonus_range_dmg": "스킬 적중 후 다음 평타 사거리 증가", "tip_slow": "끝거리 적중 시 둔화", "invis_energy": "기력 회복 및 은신 장막 생성", "mark_dash_back": "표식 부여 및 뒤로 덤블링", "execute_dash": "잃은 체력 비례 마법 피해 및 돌진",
            "ms_up_on_transform": "무기 폼 변환 시 이동속도 증가", "shock_blast": "전격 폭발 (관문 통과 시 피해량 증폭)", "hyper_charge": "공격속도 최대치 증가", "accel_gate_knockback": "가속 관문 생성 / 적 밀쳐내기", "form_change": "원거리/근거리 무기 폼 변환",
            "bonus_dmg_on_marked": "스킬 적중 대상 평타 시 추가 피해", "root_two": "최대 2명 관통 속박", "return_shield": "왕복 투사체 아군 보호막 부여", "aoe_slow_pop": "광역 둔화 및 지연 폭발 피해", "ignite_mark_laser": "표식 폭발 초장거리 광선",
            "scale_by_level": "레벨 비례 사거리 및 공격속도 진화", "shred_res_slow": "방어력/마법 저항력 감소 및 둔화", "heal_ms": "아군 체력 회복 및 이속 증가", "missing_hp_ranged": "잃은 체력 비례 마법 피해", "invincible_aoe": "대상 무적 부여 및 광역 딜링",
            "headshot_stack": "기본 공격 누적 시 확정 치명타", "pierce_dmg": "관통형 투사체 피해", "root_headshot": "덫 적중 시 속박 및 사거리 무시 헤드샷", "slow_headshot_back": "둔화, 헤드샷 장전 및 자신 뒤로 밀려남", "snipe_execute": "초장거리 지정 타겟 저격 처형",
            "bonus_ap_dmg_on_auto": "주기적으로 평타에 강력한 마법 피해", "bounce_bomb": "지면을 튀며 날아가는 폭탄", "knockback_self_enemy": "폭발 시 적과 자신을 넉백", "minefield_slow": "지뢰밭 생성 및 밟으면 둔화", "mega_inferno_bomb": "초장거리 거대 폭발 마법 피해",
            "plasma_stack_eMisHp": "5스택 누적 시 잃은 체력 비례 폭발", "iso_missiles": "다중 미사일 발사 (고립 대상 타격)", "plasma_stack_reveal": "플라즈마 중첩 및 대상 시야 공유", "invis_ms_atkSpd": "은신, 이속 및 공격속도 증가", "shield_dash_far": "초장거리 표식 대상에게 돌진 및 보호막",
            "grey_health_regen": "적 시야 밖에서 입은 피해량 일부 회복", "pull_slow_90": "끌어당김 및 90% 둔화", "invis_ms_regen": "위장(은신), 이동속도 증가 및 체력 회복", "phantom_stun": "유령 돌진 경로 적 광역 기절", "blink_execute_reset": "순간이동 X자 범위 처형 (처치 시 쿨타임 초기화)",
            "ms_up_towards_low_hp": "체력이 낮은 아군 방향 이속 대폭 증가", "rejuvenation_slow": "적중 시 둔화 및 자신 도트 회복", "heal_ally_cost_hp": "자신의 체력을 소모하여 아군 치유", "silence_root": "장판 내 적 침묵, 지속 시 속박", "global_heal_low_hp_bonus": "글로벌 아군 치유 (체력 낮을 시 치유량 증가)",
            "meep_bonus_dmg": "정령 수집 누적 시 평타 광역 둔화 및 추가 피해", "stun_if_wall": "2명 적중 또는 지형과 적중 시 기절", "heal_ms_shrine": "회복 성소 생성 (시간 지날시 치유량 증가)", "magical_journey": "지형을 통과하는 일방통행 차원문 생성", "stasis_aoe": "범위 내 모든 유닛 경직(존야)"
        },
        screen: {
            match: "매칭 대기열", lobby: "전투 준비 로비", load: "로딩중",
            start: "전투 진입중", detail: "상세 스탯 정보", skillInfo: "스킬 정보", skillUp: "스킬 강화",
            phasePrefix: "⏱️ ", phaseSuffix: "페이즈 현장 중계", end: "🏆 라인전 종료!"
        },
        ui: {
            findMsg: "🔍 상대를 탐색합니다...", searching: "상대를 탐색하는 중입니다...",
            matchOk: "✅ 매칭 완료!", matchFoundInfo: "잠시 후 전투준비 로비로 이동합니다.",
            loadRift: "⏳ 소환사의 협곡으로 진입합니다...", 
            vsTitle: "⚔️ 전투 대진표",
            vsFormat: "🎯 [ {uName} ]\n🤖 {uChamp}\n✨ 스펠: [{uD}, {uF}]\n\n━━━━━━━ VS ━━━━━━━\n\n🎯 [ AI Bot ]\n🤖 {aChamp}\n✨ 스펠: [{aD}, {aF}]",
            battleStart: "🔥 소환사의 협곡에 오신 것을 환영합니다.\n\n[ 🏆 1v1 공식 룰 적용 ]\n- 3킬 선취\n- CS 100개 우선 달성\n- 1차 포탑 파괴",
            boardTitle: "📊 라인전 현황판 [ {turn}턴 ]", detailTitle: "🔍 상세 스탯 및 장비 창", skillUpTitle: "🆙 스킬 레벨업",
            watchNext: "다음 상황을 지켜봅니다...", endWait: "결과가 기록되었으며 로비로 돌아갑니다.",
            win: "🎉 라인전 승리!", lose: "☠️ 라인전 패배..."
        },
        logs: {
            baseHeal: "🏠 우물에 도착하여 체력을 회복합니다.",
            hitMe: "⏱️[{sec}초] [거리:{dist}] 🔹 내 [{skill}] 적중! {fxLog}",
            missMe: "⏱️[{sec}초] [거리:{dist}] 💨 내 [{skill}] 빗나감!",
            hitAi: "⏱️[{sec}초] [거리:{dist}] 🔸 적 [{skill}] 적중! {fxLog}",
            missAi: "⏱️[{sec}초] [거리:{dist}] 💨 적 [{skill}] 허공을 가릅니다!",
            outOfRangeMe: "⏱️[{sec}초] 👣 거리가 닿지 않아 공격하지 못했습니다. (거리: {dist})",
            outOfRangeAi: "⏱️[{sec}초] 👣 적이 공격하려다 사거리 부족으로 멈칫합니다. (거리: {dist})",
            noMana: "💧 [마나 부족] 마나가 부족하여 스킬을 사용할 수 없습니다!",
            spellFlashMe: "🏃 [스펠] 치명상을 감지하고 빛의 속도로 [점멸]을 사용해 회피합니다!!",
            spellFlashAi: "🏃 [스펠] 적이 아슬아슬하게 [점멸]을 사용하여 살아나갑니다!!",
            spellIgniteMe: "🔥 [스펠] 킬각을 확인하고 [점화]를 걸어 불태웁니다!!",
            spellIgniteAi: "🔥 [스펠] 적이 내게 [점화]를 시전했습니다!!",
            spellHealMe: "💚 [스펠] 위험한 순간 [회복]을 사용하여 체력을 채웁니다!!",
            spellHealAi: "💚 [스펠] 적이 [회복]을 사용하여 체력을 회복합니다!!",
            spellBarrierMe: "🛡️ [스펠] [방어막]을 펼쳐 치명적인 피해를 방어합니다!!",
            spellBarrierAi: "🛡️ [스펠] 적이 [방어막]을 생성하여 피해를 흡수합니다!!",
            spellCleanseMe: "✨ [스펠] [정화]를 사용하여 모든 상태이상을 해제합니다!",
            spellCleanseAi: "✨ [스펠] 적이 [정화]로 군중 제어기(CC)를 무력화시킵니다!",
            spellExhaustMe: "📉 [스펠] 적에게 [탈진]을 걸어 화력과 무빙을 봉쇄합니다!",
            spellExhaustAi: "📉 [스펠] 적이 내게 [탈진]을 걸어 무력화시킵니다!",
            punish: "⚡ [빈틈 노리기] 상대의 스킬이 빠진 틈을 타 맹렬하게 반격합니다!",
            minionAggro: "🛡️ [미니언 어그로] 무리한 딜교환으로 적 미니언들에게 두들겨 맞습니다. (-{dmg} HP)",
            towerAggro: "🚨 [포탑 어그로] 상대 포탑 사거리 내에서 적을 공격하여 포탑에 맞습니다! (-{dmg} HP)",
            towerHitMe: "⏱️[{sec}초] 🔨 무방비 상태로 적 포탑을 거침없이 타격합니다! (포탑 피해 -{dmg})",
            towerHitAi: "⏱️[{sec}초] 🔨 적이 우리 포탑을 무자비하게 철거하고 있습니다! (포탑 피해 -{dmg})",
            towerPlate: "💰 [포탑 방패 파괴!] 타워를 채굴하여 150G를 획득했습니다!",
            noAction: "💤 서로 사거리를 내주지 않으며 눈치싸움만 벌입니다.",
            skipMiddle: "... (중략) 치열한 라인전 포지셔닝이 이어집니다!",
            farm: "🌾 [ 파밍 결과 ]\n👤 나: {mCs}개 획득 (+{mGold}G)\n🤖 적: {aCs}개 획득 (+{aGold}G)",
            farmMissed: "❌ 라인을 비운 사이 포탑에 미니언이 타버립니다.",
            killMe: "\n\n☠️ 치명적인 타격을 입고 전사했습니다! (적 킬 스코어 +1)\n잠시 후 부활하여 라인에 복귀합니다.",
            killAi: "\n\n🔥 완벽한 각! 적을 처치했습니다! (내 킬 스코어 +1)\n적이 부활할 때까지 라인을 장악합니다."
        },
        alerts: {
            noSp: { title: "스킬 강화 불가", msg: "⚠️ 스킬 포인트(SP)가 부족합니다." },
            reqLvl6: { title: "스킬 강화 불가", msg: "⚠️ 궁극기(R)는 6레벨 이상부터 배울 수 있습니다." },
            maxLvl: { title: "스킬 강화 불가", msg: "⚠️ 이미 최대 레벨입니다." },
            skillUpOk: { title: "스킬 강화 완료", msg: "✨ [{skill}] 스킬이 Lv.{lvl}(으)로 강화되었습니다!" },
            noStrat: { title: "전투 시작 불가", msg: "⚠️ 전략을 먼저 선택하세요! (4~8번 중 하나)" },
            noSkill: { title: "전투 시작 불가", msg: "⚠️ 전투 시작 전 [9. 스킬 레벨업]에서 스킬을 먼저 배워주세요!" },
            noPrev: { title: "이전 불가", msg: "⚠️ 전투 중에는 이전 화면으로 갈 수 없습니다. (취소 시 로비로 강제 이동)" },
            noTowerRange: { title: "명령 수행 불가", msg: "⚠️ 포탑 사거리에 도달하지 못했습니다. (적 포탑 앞까지 라인을 밀어야 합니다)" }
        }
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
    renderAlert: function(title, content, footer) { 
        return this.renderFrame(title, content, false, footer || ContentManager.footer.wait); 
    },
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

// 🌟 [V12.5] 가독성 극대화 수직 배열 대시보드 (BattleView)
var BattleView = { 
    Board: {
        render: function(state) {
            var cU = ContentManager.battle.ui;
            var t = state.me;
            var div = Utils.getFixedDivider();
            
            var laneVisual = "";
            if (state.lanePos <= -2) laneVisual = "🏰 ⚔️ 🟥 🟥 🟥 🟥 🗼 (위험!)";
            else if (state.lanePos === -1) laneVisual = "🏰 🟩 ⚔️ 🟥 🟥 🟥 🗼 (당겨짐)";
            else if (state.lanePos === 0) laneVisual  = "🏰 🟩 🟩 ⚔️ 🟥 🟥 🗼 (중앙)";
            else if (state.lanePos === 1) laneVisual  = "🏰 🟩 🟩 🟩 ⚔️ 🟥 🗼 (미는중)";
            else if (state.lanePos >= 2) laneVisual   = "🏰 🟩 🟩 🟩 🟩 ⚔️ 🗼 (공성가능)";
            
            var content = "[ 🏆 1v1 스코어보드 ]\n";
            content += "⚔️ 킬: " + state.me.kills + " vs " + state.ai.kills + "\n";
            content += "🌾 CS: " + state.me.cs + " vs " + state.ai.cs + "\n\n";
            
            content += "[ 🗺️ 라인 상황 ]\n";
            content += laneVisual + "\n";
            content += "🏰 내 포탑: (" + state.me.towerHp + "/3000)\n";
            content += "🗼 적 포탑: (" + state.ai.towerHp + "/3000)\n";
            content += div + "\n";
            
            content += "[ 👤 내 챔피언 ]\n";
            content += "- " + state.me.champ + " (Lv."+state.me.level+")\n";
            content += "- 체력: " + state.me.hp + " / " + state.me.hw.hp + "\n";
            content += "- 마나: " + state.me.mp + " / " + state.me.hw.mp + "\n\n";
            
            var dStatus = (state.me.spells.dCd<=0?"완료":state.me.spells.dCd+"턴 대기");
            var fStatus = (state.me.spells.fCd<=0?"완료":state.me.spells.fCd+"턴 대기");
            
            content += "[ ✨ 스펠 ]\n";
            content += "🌟 D ["+state.me.spells.d+"]: " + dStatus + "\n";
            content += "   F ["+state.me.spells.f+"]: " + fStatus + "\n";
            content += div + "\n";
            
            content += "[ 🔍 1. 정보 카테고리 ]\n";
            content += "1. 적 정보\n2. 상세 스탯\n3. 스킬 정보\n\n";
            
            var stratName = ["미선택", "공격", "푸시", "프리징", "귀환", "", "", "", "포탑 철거"][state.strat || 0];
            content += "[ ⚔️ 2. 전략 카테고리 ]\n▶ 현재작전: " + stratName + "\n";
            content += "4. 공격\n5. 푸시\n6. 프리징\n7. 귀환\n";
            if (state.lanePos >= 2) content += "8. 포탑 철거\n";
            content += "\n";

            content += "[ 🆙 3. 성장 및 진행 ]\n";
            content += "9. 스킬 레벨업" + (state.me.sp > 0 ? " (SP: " + state.me.sp + ")" : "") + "\n";
            content += "0. 턴 시작 (준비 완료)"; 
            
            var title = cU.boardTitle.replace("{turn}", state.turn);
            return LayoutManager.renderFrame(title, content, false, "번호를 입력하여 행동을 선택하세요.\n게임을 포기하려면 '항복'을 입력하세요.");
        },
        renderEnemyInfo: function(state) {
            var t = state.ai;
            var content = "[ 🤖 적 챔피언: "+t.champ+" (Lv."+t.level+") ]\n\n";
            content += "🩸 체력: " + t.hp + " / " + t.hw.hp + "\n";
            content += "💧 마나: " + t.mp + " / " + t.hw.mp + "\n";
            content += "🌾 CS: " + t.cs + " 개\n\n";
            content += "⚔️ 공격력: "+(t.hw.baseAd+t.hw.bonusAd)+" | 주문력: "+t.hw.ap+"\n";
            content += "🛡️ 방어력: "+t.hw.def+" | 마저: "+t.hw.mdef+"\n\n";
            var dStatus = (t.spells.dCd<=0?"ON":t.spells.dCd+"턴");
            var fStatus = (t.spells.fCd<=0?"ON":t.spells.fCd+"턴");
            content += "[ ✨ 스펠 상태 ]\n";
            content += "🌟 D["+t.spells.d+"]: " + dStatus + " | F["+t.spells.f+"]: " + fStatus + "\n";
            return LayoutManager.renderFrame("🔍 적 정보 확인", content, ["0. 🔙 이전 화면"], "돌아가려면 0을 입력하세요.");
        },
        renderDetail: function(t) {
            var cU = ContentManager.battle.ui;
            var content = "[ 👤 챔피언: "+t.champ+" (Lv."+t.level+") ]\n\n";
            content += "💰 보유 골드: " + t.gold + " G\n\n";
            content += "⚔️ [ 공격 능력치 ]\n- 공격력: "+(t.hw.baseAd+t.hw.bonusAd)+" | 주문력: "+t.hw.ap+"\n- 물관: "+t.hw.lethality+" ("+t.hw.arPenPer+"%) | 마관: "+t.hw.mPenFlat+" ("+t.hw.mPenPer+"%)\n- 공속: "+t.hw.as+" | 치명타: "+t.hw.crit+"%\n\n";
            content += "🛡️ [ 방어/유틸 능력치 ]\n- 방어력: "+t.hw.def+" | 마저: "+t.hw.mdef+"\n- 체젠: "+t.hw.hpRegen+" | 마젠: "+t.hw.mpRegen+"\n- 모든피해흡혈: "+t.hw.omniVamp+"%\n- 사거리: "+t.hw.range+" | 이속: "+t.hw.spd+"\n\n";
            content += "🧠 [ 소프트웨어 (피지컬) ]\n- 정확: "+t.sw.acc+" | 반응: "+t.sw.ref+"\n- 침착: "+t.sw.com+" | 직관: "+t.sw.int+"\n\n";
            content += "🎒 [ 보유 아이템 ]\n(상점 업데이트 예정)";
            return LayoutManager.renderFrame(cU.detailTitle, content, ["0. 🔙 이전 화면"], "돌아가려면 0을 입력하세요.");
        },
        renderSkillInfo: function(t) {
            var hw = t.hw;
            var eMap = ContentManager.battle.effectMap;
            var content = "[ 👤 챔피언: "+t.champ+" ]\n\n";
            content += "✨ [패시브] " + hw.p.n + "\n";
            content += "└ " + hw.p.d + "\n\n";
            var getTargetType = function(ttKey) {
                if(ttKey === "NT") return "논타겟팅";
                if(ttKey === "T") return "타겟팅";
                if(ttKey === "S") return "즉발/버프";
                return "패시브";
            };
            var getDesc = function(key, sk) {
                var res = "🔹 [" + key.toUpperCase() + "] " + sk.n + " (Lv."+t.skLv[key]+")\n";
                var tStr = (sk.t==="AD"?"물리":(sk.t==="AP"?"마법":(sk.t==="TRUE"?"고정":"유틸")));
                var coefs = [];
                if(sk.ad) coefs.push("AD " + Math.floor(sk.ad*100) + "%");
                if(sk.ap) coefs.push("AP " + Math.floor(sk.ap*100) + "%");
                if(sk.mhp) coefs.push("최대체력 " + Math.floor(sk.mhp*100) + "%");
                res += " ├ " + tStr + " / 사거리 " + sk.rng + " / 마나 " + (key==='r'?100:30+(t.skLv[key]*10)) + "\n";
                res += " ├ " + getTargetType(sk.tt) + (coefs.length>0 ? " (" + coefs.join("+") + ")" : "") + "\n";
                var effectDesc = (sk.e !== "none" && eMap[sk.e]) ? eMap[sk.e] : "특수 효과 없음";
                res += " └ " + effectDesc + "\n";
                return res + "\n";
            };
            content += getDesc("q", hw.skills.q);
            content += getDesc("w", hw.skills.w);
            content += getDesc("e", hw.skills.e);
            content += getDesc("r", hw.skills.r);
            return LayoutManager.renderFrame(ContentManager.battle.screen.skillInfo, content.trim(), ["0. 🔙 이전 화면"], "돌아가려면 0을 입력하세요.");
        },
        renderSkillUp: function(t) {
            var cU = ContentManager.battle.ui;
            var content = "보유 포인트: " + t.sp + " SP\n\n[ 강화할 스킬 선택 ]\n";
            var s = t.hw.skills;
            var getInfo = function(idx, key, name, curLv, maxLv, bArr, cdArr) {
                var str = idx + ". " + key.toUpperCase() + " - " + name + "\n";
                if (curLv < maxLv) {
                    var curB = curLv > 0 ? bArr[curLv-1] : 0;
                    var curCd = curLv > 0 ? cdArr[curLv-1] : "-";
                    str += "   ├ 레벨: " + curLv + " ➔ " + (curLv + 1) + "\n";
                    str += "   ├ 피해: " + curB + " ➔ " + bArr[curLv] + "\n";
                    str += "   └ 쿨탐: " + curCd + "s ➔ " + cdArr[curLv] + "s\n\n";
                } else {
                    str += "   ├ 레벨: " + curLv + " (MAX)\n   └ 더 이상 강화할 수 없습니다.\n\n";
                }
                return str;
            };
            content += getInfo(1, "q", s.q.n, t.skLv.q, s.q.max, s.q.b, s.q.cd);
            content += getInfo(2, "w", s.w.n, t.skLv.w, s.w.max, s.w.b, s.w.cd);
            content += getInfo(3, "e", s.e.n, t.skLv.e, s.e.max, s.e.b, s.e.cd);
            
            var rCurLv = t.skLv.r;
            var rCurB = rCurLv > 0 ? s.r.b[rCurLv-1] : 0;
            var rCurCd = rCurLv > 0 ? s.r.cd[rCurLv-1] : "-";
            content += "4. R - " + s.r.n + "\n";
            if (t.level < 6) { content += "   └ (6레벨 이상 습득 가능)\n"; }
            else if (rCurLv < s.r.max) {
                content += "   ├ 레벨: " + rCurLv + " ➔ " + (rCurLv + 1) + "\n";
                content += "   ├ 피해: " + rCurB + " ➔ " + s.r.b[rCurLv] + "\n";
                content += "   └ 쿨탐: " + rCurCd + "s ➔ " + s.r.cd[rCurLv] + "s\n";
            } else { content += "   ├ 레벨: " + rCurLv + " (MAX)\n"; }
            return LayoutManager.renderFrame(cU.skillUpTitle, content, ["0. 🔙 이전 화면"], "강화할 번호를 입력하세요.");
        }
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 [2. MODEL] 데이터, 상태 관리, 게임 핵심 로직
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var ChampionData = {
    "뽀삐": { role: "탱커", type: "AD", range: 125, spd: 345, hp: 610, hpRegen: 8.0, mp: 280, mpRegen: 7.0, baseAd: 64, def: 38, mdef: 32, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"강철의 외교관", e:"shield_on_hit", d:"전투 시작 시 적중하면 쉴드를 얻는 방패를 던집니다." }, skills: { q: { n:"방패 강타", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[60, 90, 120, 150, 180], ad:0.9, eMhp:0.08, t:"AD", e:"slow_field", rng:430, tt:"NT" }, w: { n:"굳건한 태세", max:5, cd:[20, 18, 16, 14, 12], b:[0,0,0,0,0], t:"UT", e:"block_dash_ms", rng:400, tt:"S" }, e: { n:"용감한 돌진", max:5, cd:[14, 13, 12, 11, 10], b:[60, 80, 100, 120, 140], ad:0.5, t:"AD", e:"wall_stun", rng:475, tt:"T" }, r: { n:"수호자의 심판", max:3, req:[6, 11, 16], cd:[120, 100, 80], b:[200, 300, 400], ad:1.0, t:"AD", e:"knockup_away", rng:500, tt:"NT" } } },
    "말파이트": { role: "탱커", type: "AP", range: 125, spd: 335, hp: 630, hpRegen: 7.0, mp: 280, mpRegen: 7.3, baseAd: 62, def: 37, mdef: 32, as: 0.73, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"화강암 방패", e:"shield_regen", d:"피격되지 않으면 최대 체력 10% 쉴드 생성" }, skills: { q: { n:"지진의 파편", max:5, cd:[8,8,8,8,8], b:[70, 120, 170, 220, 270], ap:0.6, t:"AP", e:"steal_ms", rng:625, tt:"T" }, w: { n:"천둥소리", max:5, cd:[12, 11.5, 11, 10.5, 10], b:[30, 45, 60, 75, 90], ap:0.3, def:0.15, t:"AP", e:"armor_up_aoe", rng:0, tt:"S" }, e: { n:"지면 강타", max:5, cd:[7, 6.5, 6, 5.5, 5], b:[60, 95, 130, 165, 200], ap:0.4, def:0.3, t:"AP", e:"atkSpdDown", rng:400, tt:"S" }, r: { n:"멈출 수 없는 힘", max:3, req:[6, 11, 16], cd:[130, 105, 80], b:[200, 300, 400], ap:0.9, t:"AP", e:"aoe_stun", rng:1000, tt:"NT" } } },
    "쉔": { role: "탱커", type: "하이브리드", range: 125, spd: 340, hp: 610, hpRegen: 8.5, mp: 400, mpRegen: 50.0, baseAd: 60, def: 34, mdef: 32, as: 0.75, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"기 염동력", e:"shield_on_skill", d:"스킬 사용 시 보호막 생성" }, skills: { q: { n:"황혼 강습", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[60, 90, 120, 150, 180], ap:0.3, eMhp:0.05, t:"AP", e:"empower_auto", rng:200, tt:"S" }, w: { n:"의지의 결계", max:5, cd:[18, 16.5, 15, 13.5, 12], b:[0,0,0,0,0], t:"UT", e:"aoe_dodge", rng:400, tt:"S" }, e: { n:"그림자 돌진", max:5, cd:[18, 16, 14, 12, 10], b:[60, 80, 100, 120, 140], mhp:0.15, t:"AD", e:"taunt", rng:600, tt:"NT" }, r: { n:"단결된 의지", max:3, req:[6, 11, 16], cd:[200, 180, 160], b:[0,0,0], ap:1.3, t:"UT", e:"global_shield_tp", rng:9999, tt:"T" } } },
    "다리우스": { role: "전사", type: "AD", range: 175, spd: 340, hp: 650, hpRegen: 10.0, mp: 260, mpRegen: 6.6, baseAd: 64, def: 39, mdef: 32, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 15, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 5, ah: 0, p: { n:"과다출혈", e:"bleed_stack", d:"5스택 시 녹서스의 힘(AD폭발) 발동" }, skills: { q: { n:"학살", max:5, cd:[9, 8, 7, 6, 5], b:[50, 80, 110, 140, 170], ad:1.4, t:"AD", e:"heal_missing_hp", rng:425, tt:"S" }, w: { n:"마비 일격", max:5, cd:[5, 4.5, 4, 3.5, 3], b:[20, 40, 60, 80, 100], ad:1.6, t:"AD", e:"heavy_slow", rng:200, tt:"T" }, e: { n:"포획", max:5, cd:[24, 21, 18, 15, 12], b:[0,0,0,0,0], t:"UT", e:"pull_arPen", rng:535, tt:"NT" }, r: { n:"녹서스의 단두대", max:3, req:[6, 11, 16], cd:[120, 100, 80], b:[150, 250, 350], ad:1.5, t:"TRUE", e:"true_execute", rng:460, tt:"T" } } },
    "모데카이저": { role: "전사", type: "AP", range: 175, spd: 335, hp: 645, hpRegen: 5.0, mp: 0, mpRegen: 0, baseAd: 61, def: 37, mdef: 32, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 5, ah: 0, p: { n:"암흑 탄생", e:"aoe_aura_on_3_hit", d:"3회 적중 시 광역 마법 피해 오라 생성" }, skills: { q: { n:"말살", max:5, cd:[9, 8, 7, 6, 5], b:[75, 95, 115, 135, 155], ap:0.6, t:"AP", e:"iso_dmg", rng:675, tt:"NT" }, w: { n:"불멸", max:5, cd:[12, 11, 10, 9, 8], b:[0,0,0,0,0], t:"UT", e:"shield_to_heal", rng:0, tt:"S" }, e: { n:"죽음의 손아귀", max:5, cd:[18, 16, 14, 12, 10], b:[70, 85, 100, 115, 130], ap:0.6, t:"AP", e:"pull_magic_pen", rng:700, tt:"NT" }, r: { n:"죽음의 세계", max:3, req:[6, 11, 16], cd:[140, 120, 100], b:[0,0,0], t:"UT", e:"stat_steal", rng:650, tt:"T" } } },
    "잭스": { role: "전사", type: "하이브리드", range: 125, spd: 350, hp: 615, hpRegen: 8.5, mp: 338, mpRegen: 5.2, baseAd: 68, def: 36, mdef: 32, as: 0.63, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"가차없는 맹공", e:"atk_spd_stack", d:"평타 시 공격 속도 중첩 증가" }, skills: { q: { n:"도약 공격", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[65, 105, 145, 185, 225], ad:1.0, ap:0.6, t:"AD", e:"gap_close", rng:700, tt:"T" }, w: { n:"무기 강화", max:5, cd:[3, 3, 3, 3, 3], b:[50, 85, 120, 155, 190], ap:0.6, t:"AP", e:"auto_reset_bonus", rng:0, tt:"S" }, e: { n:"반격", max:5, cd:[14, 12.5, 11, 9.5, 8], b:[55, 90, 125, 160, 195], ad:0.5, t:"AD", e:"dodge_stun", rng:300, tt:"S" }, r: { n:"무기의 달인", max:3, req:[6, 11, 16], cd:[100, 90, 80], b:[150, 250, 350], ap:0.7, t:"AP", e:"bonus_resist", rng:0, tt:"S" } } },
    "탈론": { role: "암살자", type: "AD", range: 125, spd: 335, hp: 658, hpRegen: 8.5, mp: 377, mpRegen: 7.6, baseAd: 68, def: 30, mdef: 39, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"검의 최후", e:"bleed_on_3_hit", d:"스킬 3회 적중 후 평타 시 출혈 고정피해 발생" }, skills: { q: { n:"녹서스식 외교", max:5, cd:[6, 5.5, 5, 4.5, 4], b:[65, 90, 115, 140, 165], ad:1.1, t:"AD", e:"melee_crit_heal", rng:400, tt:"T" }, w: { n:"갈퀴손", max:5, cd:[9, 8.5, 8, 7.5, 7], b:[90, 120, 150, 180, 210], ad:1.2, t:"AD", e:"return_slow", rng:900, tt:"NT" }, e: { n:"암살자의 길", max:5, cd:[2, 2, 2, 2, 2], b:[0,0,0,0,0], t:"UT", e:"jump_wall", rng:725, tt:"NT" }, r: { n:"그림자 강습", max:3, req:[6, 11, 16], cd:[100, 80, 60], b:[180, 270, 360], ad:2.0, t:"AD", e:"invis_ms_aoe", rng:550, tt:"S" } } },
    "에코": { role: "암살자", type: "AP", range: 125, spd: 340, hp: 655, hpRegen: 9.0, mp: 280, mpRegen: 7.0, baseAd: 58, def: 32, mdef: 32, as: 0.68, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"Z 드라이브 공진", e:"bonus_dmg_ms_on_3_hit", d:"3회 적중 시 마법피해와 이속 증가" }, skills: { q: { n:"시간의 톱니바퀴", max:5, cd:[9, 8.5, 8, 7.5, 7], b:[60, 75, 90, 105, 120], ap:0.3, t:"AP", e:"out_in_slow", rng:1075, tt:"NT" }, w: { n:"평행 시간 교차", max:5, cd:[22, 20, 18, 16, 14], b:[0,0,0,0,0], t:"UT", e:"delayed_stun_shield", rng:1600, tt:"NT" }, e: { n:"시간 도약", max:5, cd:[9, 8.5, 8, 7.5, 7], b:[50, 75, 100, 125, 150], ap:0.4, t:"AP", e:"dash_blink_bonus", rng:300, tt:"NT" }, r: { n:"시공간 붕괴", max:3, req:[6, 11, 16], cd:[110, 90, 70], b:[150, 300, 450], ap:1.5, t:"AP", e:"time_rewind", rng:0, tt:"S" } } },
    "아칼리": { role: "암살자", type: "하이브리드", range: 125, spd: 345, hp: 600, hpRegen: 9.0, mp: 200, mpRegen: 50.0, baseAd: 62, def: 23, mdef: 37, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 5, ah: 0, p: { n:"암살자의 표식", e:"bonus_range_dmg", d:"스킬 적중 후 다음 평타 사거리 및 피해량 대폭 증가" }, skills: { q: { n:"오연투척검", max:5, cd:[4, 3.5, 3, 2.5, 2], b:[45, 70, 95, 120, 145], ad:0.6, ap:0.6, t:"AP", e:"tip_slow", rng:500, tt:"NT" }, w: { n:"황혼의 장막", max:5, cd:[20, 19, 18, 17, 16], b:[0,0,0,0,0], t:"UT", e:"invis_energy", rng:250, tt:"S" }, e: { n:"표창 곡예", max:5, cd:[16, 14.5, 13, 11.5, 10], b:[50, 75, 100, 125, 150], ad:0.7, ap:0.5, t:"AP", e:"mark_dash_back", rng:825, tt:"NT" }, r: { n:"무결처형", max:3, req:[6, 11, 16], cd:[100, 80, 60], b:[150, 225, 300], ad:0.5, ap:0.8, eMisHp:0.1, t:"AP", e:"execute_dash", rng:675, tt:"T" } } },
    "제이스": { role: "마법사", type: "AD", range: 500, spd: 335, hp: 590, hpRegen: 6.0, mp: 375, mpRegen: 6.0, baseAd: 57, def: 27, mdef: 30, as: 0.65, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"마법공학 축전기", e:"ms_up_on_transform", d:"무기 변환 시 이동속도 증가" }, skills: { q: { n:"전격 폭발/하늘로!", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[55, 110, 165, 220, 275], ad:1.2, t:"AD", e:"shock_blast", rng:1050, tt:"NT" }, w: { n:"전류 역장/초전하", max:5, cd:[10, 9, 8, 7, 6], b:[0,0,0,0,0], t:"UT", e:"hyper_charge", rng:0, tt:"S" }, e: { n:"가속 관문/천둥 강타", max:5, cd:[16, 15, 14, 13, 12], b:[40, 70, 100, 130, 160], eMhp:0.08, t:"AP", e:"accel_gate_knockback", rng:650, tt:"S" }, r: { n:"머큐리 해머 변환", max:3, req:[6, 11, 16], cd:[6, 6, 6], b:[0,0,0], t:"UT", e:"form_change", rng:0, tt:"S" } } },
    "럭스": { role: "마법사", type: "AP", range: 550, spd: 330, hp: 560, hpRegen: 5.5, mp: 480, mpRegen: 8.0, baseAd: 53, def: 18, mdef: 30, as: 0.66, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"일루미네이션", e:"bonus_dmg_on_marked", d:"스킬 적중 대상에게 표식을 남기며 평타 시 마법피해" }, skills: { q: { n:"빛의 속박", max:5, cd:[11, 10.5, 10, 9.5, 9], b:[80, 120, 160, 200, 240], ap:0.6, t:"AP", e:"root_two", rng:1300, tt:"NT" }, w: { n:"프리즘 보호막", max:5, cd:[14, 13, 12, 11, 10], b:[40, 65, 90, 115, 140], ap:0.35, t:"UT", e:"return_shield", rng:1075, tt:"NT" }, e: { n:"광휘의 특이점", max:5, cd:[10, 9.5, 9, 8.5, 8], b:[70, 120, 170, 220, 270], ap:0.8, t:"AP", e:"aoe_slow_pop", rng:1100, tt:"NT" }, r: { n:"최후의 섬광", max:3, req:[6, 11, 16], cd:[80, 60, 40], b:[300, 400, 500], ap:1.2, t:"AP", e:"ignite_mark_laser", rng:3400, tt:"NT" } } },
    "케일": { role: "마법사", type: "하이브리드", range: 175, spd: 335, hp: 600, hpRegen: 5.0, mp: 330, mpRegen: 8.0, baseAd: 50, def: 26, mdef: 22, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"거룩한 승천", e:"scale_by_level", d:"레벨업에 따라 공격 속도, 사거리(원거리 변환) 진화" }, skills: { q: { n:"광휘의 일격", max:5, cd:[12, 11, 10, 9, 8], b:[60, 100, 140, 180, 220], ad:0.6, ap:0.5, t:"AP", e:"shred_res_slow", rng:900, tt:"NT" }, w: { n:"천상의 축복", max:5, cd:[15, 14, 13, 12, 11], b:[0,0,0,0,0], ap:0.25, t:"UT", e:"heal_ms", rng:900, tt:"S" }, e: { n:"화염 주문검", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[0,0,0,0,0], ap:0.2, eMisHp:0.08, t:"AP", e:"missing_hp_ranged", rng:0, tt:"S" }, r: { n:"신성한 심판", max:3, req:[6, 11, 16], cd:[160, 120, 80], b:[200, 350, 500], ad:1.0, ap:0.8, t:"AP", e:"invincible_aoe", rng:900, tt:"S" } } },
    "케이틀린": { role: "원딜", type: "AD", range: 650, spd: 325, hp: 605, hpRegen: 3.5, mp: 315, mpRegen: 7.4, baseAd: 62, def: 28, mdef: 30, as: 0.68, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"헤드샷", e:"headshot_stack", d:"평타 누적 시 확정 치명타 피해" }, skills: { q: { n:"필트오버 피스메이커", max:5, cd:[10, 9, 8, 7, 6], b:[50, 90, 130, 170, 210], ad:1.3, t:"AD", e:"pierce_dmg", rng:1300, tt:"NT" }, w: { n:"요들잡이 덫", max:5, cd:[15, 13.5, 12, 10.5, 9], b:[0,0,0,0,0], t:"UT", e:"root_headshot", rng:800, tt:"NT" }, e: { n:"90구경 투망", max:5, cd:[16, 14.5, 13, 11.5, 10], b:[70, 110, 150, 190, 230], ap:0.8, t:"AP", e:"slow_headshot_back", rng:750, tt:"NT" }, r: { n:"비장의 한 발", max:3, req:[6, 11, 16], cd:[90, 75, 60], b:[300, 525, 750], ad:2.0, t:"AD", e:"snipe_execute", rng:3500, tt:"T" } } },
    "직스": { role: "원딜", type: "AP", range: 525, spd: 325, hp: 566, hpRegen: 6.5, mp: 480, mpRegen: 8.0, baseAd: 54, def: 22, mdef: 30, as: 0.65, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"반동 초소형 폭탄", e:"bonus_ap_dmg_on_auto", d:"일정 시간마다 평타에 강력한 마법 피해 추가" }, skills: { q: { n:"반동 폭탄", max:5, cd:[6, 5.5, 5, 4.5, 4], b:[85, 135, 185, 235, 285], ap:0.65, t:"AP", e:"bounce_bomb", rng:850, tt:"NT" }, w: { n:"휴대용 폭약", max:5, cd:[20, 18, 16, 14, 12], b:[70, 120, 170, 220, 270], ap:0.5, t:"AP", e:"knockback_self_enemy", rng:1000, tt:"NT" }, e: { n:"마법공학 지뢰밭", max:5, cd:[16, 15, 14, 13, 12], b:[40, 70, 100, 130, 160], ap:0.3, t:"AP", e:"minefield_slow", rng:900, tt:"NT" }, r: { n:"지옥 화염 폭탄", max:3, req:[6, 11, 16], cd:[120, 100, 80], b:[300, 400, 500], ap:1.1, t:"AP", e:"mega_inferno_bomb", rng:5300, tt:"NT" } } },
    "카이사": { role: "원딜", type: "하이브리드", range: 525, spd: 335, hp: 670, hpRegen: 3.5, mp: 344, mpRegen: 8.2, baseAd: 59, def: 28, mdef: 30, as: 0.64, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"두 번째 피부", e:"plasma_stack_eMisHp", d:"5스택 시 적 잃은 체력 비례 폭발 마법 피해" }, skills: { q: { n:"이카시아 폭우", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[40, 55, 70, 85, 100], ad:0.5, ap:0.25, t:"AD", e:"iso_missiles", rng:600, tt:"NT" }, w: { n:"공허의 추적자", max:5, cd:[22, 20, 18, 16, 14], b:[30, 55, 80, 105, 130], ad:1.3, ap:0.45, t:"AP", e:"plasma_stack_reveal", rng:3000, tt:"NT" }, e: { n:"고속 충전", max:5, cd:[16, 15, 14, 13, 12], b:[0,0,0,0,0], t:"UT", e:"invis_ms_atkSpd", rng:0, tt:"S" }, r: { n:"사냥본능", max:3, req:[6, 11, 16], cd:[130, 110, 90], b:[0,0,0], t:"UT", e:"shield_dash_far", rng:3000, tt:"T" } } },
    "파이크": { role: "서포터", type: "AD", range: 150, spd: 330, hp: 600, hpRegen: 7.0, mp: 415, mpRegen: 8.0, baseAd: 62, def: 45, mdef: 32, as: 0.66, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"가라앉은 자들의 축복", e:"grey_health_regen", d:"적의 시야 밖에서 입은 피해 빠르게 회복" }, skills: { q: { n:"뼈 작살", max:5, cd:[10, 9.5, 9, 8.5, 8], b:[80, 130, 180, 230, 280], ad:1.2, t:"AD", e:"pull_slow_90", rng:400, tt:"NT" }, w: { n:"유령 잠수", max:5, cd:[14, 13, 12, 11, 10], b:[0,0,0,0,0], t:"UT", e:"invis_ms_regen", rng:0, tt:"S" }, e: { n:"망자의 물살", max:5, cd:[15, 14, 13, 12, 11], b:[90, 120, 150, 180, 210], ad:1.0, t:"AD", e:"phantom_stun", rng:400, tt:"NT" }, r: { n:"깊은 바다의 처형", max:3, req:[6, 11, 16], cd:[120, 100, 80], b:[250, 400, 550], ad:0.8, t:"TRUE", e:"blink_execute_reset", rng:750, tt:"NT" } } },
    "소라카": { role: "서포터", type: "AP", range: 550, spd: 325, hp: 605, hpRegen: 2.5, mp: 425, mpRegen: 11.5, baseAd: 50, def: 32, mdef: 30, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"구원", e:"ms_up_towards_low_hp", d:"체력이 낮은 아군을 향할 때 이속 증가" }, skills: { q: { n:"별부름", max:5, cd:[8, 7, 6, 5, 4], b:[85, 130, 175, 220, 265], ap:0.35, t:"AP", e:"rejuvenation_slow", rng:800, tt:"NT" }, w: { n:"은하의 마력", max:5, cd:[4, 3.5, 3, 2.5, 2], b:[0,0,0,0,0], ap:0.6, t:"UT", e:"heal_ally_cost_hp", rng:550, tt:"T" }, e: { n:"별의 균형", max:5, cd:[20, 19, 18, 17, 16], b:[70, 110, 150, 190, 230], ap:0.4, t:"AP", e:"silence_root", rng:925, tt:"NT" }, r: { n:"기원", max:3, req:[6, 11, 16], cd:[130, 115, 100], b:[0,0,0], ap:0.5, t:"UT", e:"global_heal_low_hp_bonus", rng:9999, tt:"S" } } },
    "바드": { role: "서포터", type: "하이브리드", range: 500, spd: 330, hp: 630, hpRegen: 5.5, mp: 350, mpRegen: 6.0, baseAd: 52, def: 34, mdef: 30, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0, p: { n:"방랑자의 부름", e:"meep_bonus_dmg", d:"종을 모아 평타에 광역 둔화 마법피해 추가" }, skills: { q: { n:"우주의 결속", max:5, cd:[11, 10, 9, 8, 7], b:[80, 125, 170, 215, 260], ap:0.65, t:"AP", e:"stun_if_wall", rng:950, tt:"NT" }, w: { n:"수호자의 성소", max:5, cd:[14, 14, 14, 14, 14], b:[0,0,0,0,0], ap:0.3, t:"UT", e:"heal_ms_shrine", rng:800, tt:"NT" }, e: { n:"신비한 차원문", max:5, cd:[18, 17, 16, 15, 14], b:[0,0,0,0,0], t:"UT", e:"magical_journey", rng:900, tt:"NT" }, r: { n:"운명의 소용돌이", max:3, req:[6, 11, 16], cd:[110, 90, 70], b:[0,0,0], t:"UT", e:"stasis_aoe", rng:3300, tt:"NT" } } }
};
var ChampionList = Object.keys(ChampionData);

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
        if (s && s.screen !== "IDLE" && (Date.now() - s.lastTime > Config.TIMEOUT_MS)) {
            var backupId = s.tempId; this.reset(room, sender);
            if(backupId) { this.sessions[key].tempId = backupId; this.save(); } 
            replier.reply(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.timeout, false, ContentManager.footer.reStart));
            return true; 
        }
        s.lastTime = Date.now(); this.save(); 
        return false;
    },
    reset: function(room, sender) {
        var key = this.getKey(room, sender);
        this.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        this.save();
    }
};

SessionManager.init();

function decideAIStrategy(ai, me, lanePos) {
    var isSmart = (Math.random() * 100 <= ai.sw.int); 
    if (!isSmart) return Math.random() > 0.5 ? 1 : 2; 

    var myHp = ai.hp / ai.hw.hp;
    var enHp = me.hp / me.hw.hp;
    
    if (lanePos <= -2 && enHp < 0.4) return 8; 
    if (myHp < 0.25) return 4; 
    if (myHp > enHp + 0.3 || enHp < 0.3) return 1; 
    if (lanePos >= 2) return 3; 
    if (ai.cs < me.cs - 2) return 1; 
    return 2; 
}

function applySpells(actor, target, isAi, logs, sec, bLogs, distance) {
    var didSpell = false;
    var slots = ['d', 'f'];
    var intRoll = (Math.random() * 100 <= actor.sw.int); 
    
    for (var i = 0; i < 2; i++) {
        var slot = slots[i];
        var spell = actor.spells[slot];
        if (actor.spells[slot+'Cd'] <= 0) {
            if (spell === "점멸") continue; 

            var reactChance = intRoll ? 100 : 70; 

            if (Math.random() * 100 <= reactChance) {
                if (spell === "회복" && actor.hp/actor.hw.hp <= 0.3) {
                    actor.hp = Math.min(actor.hw.hp, actor.hp + 100 + (actor.level*20));
                    actor.spells[slot+'Cd'] = Config.SpellCD[spell];
                    logs.push(isAi ? bLogs.spellHealAi : bLogs.spellHealMe);
                    didSpell = true;
                }
                else if (spell === "방어막" && actor.hp/actor.hw.hp <= 0.35) {
                    actor.status.shield = (actor.status.shield || 0) + 150 + (actor.level*30);
                    actor.spells[slot+'Cd'] = Config.SpellCD[spell];
                    logs.push(isAi ? bLogs.spellBarrierAi : bLogs.spellBarrierMe);
                    didSpell = true;
                }
                else if (spell === "점화" && target.hp/target.hw.hp <= 0.35 && actor.status.isAggressive) {
                    target.hp -= 100 + (actor.level*10); 
                    actor.spells[slot+'Cd'] = Config.SpellCD[spell];
                    logs.push(isAi ? bLogs.spellIgniteAi : bLogs.spellIgniteMe);
                    didSpell = true;
                }
                else if (spell === "정화" && (actor.status.stunDur > 0 || actor.status.rootDur > 0 || actor.status.silenceDur > 0 || actor.status.slowDur > 0)) {
                    actor.status.stunDur = 0; actor.status.rootDur = 0; actor.status.silenceDur = 0; actor.status.slowDur = 0;
                    actor.spells[slot+'Cd'] = Config.SpellCD[spell];
                    logs.push(isAi ? bLogs.spellCleanseAi : bLogs.spellCleanseMe);
                    didSpell = true;
                }
                else if (spell === "탈진" && target.status.isAggressive && distance <= 500 && !target.status.exhaustDur) {
                    target.status.exhaustDur = 3;
                    actor.spells[slot+'Cd'] = Config.SpellCD[spell];
                    logs.push(isAi ? bLogs.spellExhaustAi : bLogs.spellExhaustMe);
                    didSpell = true;
                }
            }
        }
    }
    return didSpell;
}

var BattleEngine = {
    generateAI: function() {
        var rChamp = ChampionList[Math.floor(Math.random() * ChampionList.length)];
        // 🌟 문법 에러 픽스: ES6 Spread 대신 slice() 사용
        var shuffledSpells = SpellList.slice().sort(function() { return 0.5 - Math.random(); }); 
        return { 
            champion: rChamp, 
            stats: { acc: 40+Math.random()*40, ref: 40+Math.random()*40, com: 40+Math.random()*40, int: 40+Math.random()*40 },
            spells: { d: shuffledSpells[0], f: shuffledSpells[1] } 
        };
    },
    getSk: function(hw, key, skLv) {
        if (key === '평타' || skLv === 0) return null;
        var origin = hw.skills[key]; var idx = skLv - 1; 
        return { key: key, n: origin.n, cd: origin.cd[idx], b: origin.b[idx], ad: origin.ad, ap: origin.ap, mhp: origin.mhp, def: origin.def, eMhp: origin.eMhp, eCurHp: origin.eCurHp, eMisHp: origin.eMisHp, t: origin.t, e: origin.e, rng: origin.rng, tt: origin.tt, mv: origin.mv, cost: (key==='r'?100:30+(skLv*10)) }; 
    },
    calcHit: function(sk, atkSw, defSw, atkHw, defHw, defStatus, bonus) { 
        if (defStatus.dodgeDur > 0 && (sk == null || sk.t === "AD")) return false; 
        if (defStatus.rootDur > 0 || defStatus.stunDur > 0) return true; 
        if (defStatus.isDemolishing) return true; 
        if (sk != null && (sk.tt === "T" || sk.tt === "S")) return true; 

        var finalDefSpd = (defStatus.slowDur > 0) ? defHw.spd * 0.7 : defHw.spd;
        var swDiff = (atkSw.acc - defSw.ref) * 0.4; 
        var spdDiff = (atkHw.spd - finalDefSpd) * 0.1; 
        var baseChance = (sk == null) ? 95 : 75; 
        var chance = baseChance + swDiff + spdDiff + bonus;
        
        return (Math.random() * 100 <= Math.max(20, Math.min(100, chance))); 
    },
    calcProb: function(base, mySwStat, enSwStat, myHw, enHw, bonus) { return Math.max(10, Math.min(90, base + (mySwStat - enSwStat) * 0.5 + (bonus || 0))); },
    calcDmg: function(sk, atkHw, defHw, defHp, defStatus, atkStatus) {
        var raw = (sk.b || 0) + (atkHw.baseAd + atkHw.bonusAd) * (sk.ad || 0) + (atkHw.ap * (sk.ap || 0)) + (atkHw.hp * (sk.mhp || 0)) + (atkHw.def * (sk.def || 0));
        raw += (defHw.hp * (sk.eMhp || 0)) + (defHp * (sk.eCurHp || 0)) + (Math.max(0, defHw.hp - defHp) * (sk.eMisHp || 0));
        
        if (atkStatus.exhaustDur > 0) raw *= 0.7; 
        
        if (sk.t === "TRUE" || sk.t === "UT") return raw;
        var def = (sk.t === "AP") ? defHw.mdef : defHw.def;
        if (defStatus.defShredDur > 0) def *= 0.75; 
        var penPer = (sk.t === "AP") ? atkHw.mPenPer : atkHw.arPenPer; var penFlat = (sk.t === "AP") ? atkHw.mPenFlat : atkHw.lethality;
        var effDef = Math.max(0, def * (1 - penPer / 100) - penFlat);
        return raw * (100 / (100 + effDef));
    },
    evaluateAI: function(sk, me, enemy, isAggress) {
        if (me.status.silenceDur > 0 || me.status.stunDur > 0) return false;
        var goodJudgment = (Math.random() * 100 <= me.sw.int); 
        if (sk.e.indexOf("shield") !== -1 || sk.e.indexOf("dodge") !== -1) return goodJudgment ? enemy.status.isAggressive : true; 
        if (sk.e.indexOf("execute") !== -1) return goodJudgment ? (enemy.hp / enemy.hw.hp < 0.35) : true; 
        return true; 
    },
playPhase: function(st, stratMe, stratAi, phaseIdx) {
        var me = st.me, ai = st.ai, lanePos = st.lanePos;
        var mRawDmg = 0, aRawDmg = 0, mHitCount = 0, aHitCount = 0; 
        var combatLogs = []; var bLogs = ContentManager.battle.logs; 
        
        me.status = me.status || {}; ai.status = ai.status || {}; 
        me.status.isAggressive = (stratMe === 1); ai.status.isAggressive = (stratAi === 1);
        me.status.isDemolishing = (stratMe === 8); ai.status.isDemolishing = (stratAi === 8);

        if (stratMe === 4) combatLogs.push(bLogs.baseHeal);
        if (phaseIdx === 1) st.distance = 600;

        var meVulnerable = 0; var aiVulnerable = 0;

        for (var sec = 1; sec <= 30; sec++) {
            if (stratMe !== 4) applySpells(me, ai, false, combatLogs, sec, bLogs, st.distance);
            if (stratAi !== 4) applySpells(ai, me, true, combatLogs, sec, bLogs, st.distance);

            if(me.status.stunDur > 0) me.status.stunDur--; if(ai.status.stunDur > 0) ai.status.stunDur--;
            if(me.status.rootDur > 0) me.status.rootDur--; if(ai.status.rootDur > 0) ai.status.rootDur--;
            if(me.status.exhaustDur > 0) me.status.exhaustDur--; if(ai.status.exhaustDur > 0) ai.status.exhaustDur--;
            if(meVulnerable > 0) meVulnerable--; if(aiVulnerable > 0) aiVulnerable--;
            for(var k in me.cd) if(me.cd[k]>0) me.cd[k]--;
            for(var k in ai.cd) if(ai.cd[k]>0) ai.cd[k]--;

            me.aaTimer = (me.aaTimer || 0) + me.hw.as; ai.aaTimer = (ai.aaTimer || 0) + ai.hw.as;
            me.mp = Math.min(me.hw.mp, me.mp + me.hw.mpRegen); ai.mp = Math.min(ai.hw.mp, ai.mp + ai.hw.mpRegen);

            var meRealAggro = me.status.isAggressive || (ai.hp/ai.hw.hp < 0.2);
            var aiRealAggro = ai.status.isAggressive || (me.hp/me.hw.hp < 0.2);

            var meSpd = me.status.exhaustDur > 0 ? me.hw.spd * 0.7 : me.hw.spd;
            var aiSpd = ai.status.exhaustDur > 0 ? ai.hw.spd * 0.7 : ai.hw.spd;

            var meMove = (meRealAggro && me.status.rootDur <= 0 && me.status.stunDur <= 0) ? -(meSpd * 0.15) : (stratMe === 2 ? -20 : (stratMe === 3 ? 50 : 100));
            var aiMove = (aiRealAggro && ai.status.rootDur <= 0 && ai.status.stunDur <= 0) ? -(aiSpd * 0.15) : (stratAi === 2 ? -20 : (stratAi === 3 ? 50 : 100));
            st.distance = Math.max(100, Math.min(1000, st.distance + meMove + aiMove));

            if (me.status.stunDur <= 0 && stratMe !== 4 && stratMe !== 8) {
                var usedSkill = false; var keys = ["q", "w", "e", "r"];
                for (var i=0; i<keys.length; i++) {
                    var k = keys[i]; var skLv = me.skLv[k];
                    if (skLv > 0 && me.cd[k] <= 0) {
                        var skObj = this.getSk(me.hw, k, skLv);
                        var effRng = (skObj.rng === 0) ? me.hw.range : skObj.rng;
                        if (this.evaluateAI(skObj, me, ai, meRealAggro)) {
                            if (me.mp >= skObj.cost) {
                                if (effRng >= st.distance) { 
                                    me.mp -= skObj.cost; me.cd[k] = skObj.cd; usedSkill = true;
                                    var hit = this.calcHit(skObj, me.sw, ai.sw, me.hw, ai.hw, ai.status, (aiVulnerable > 0 ? 30 : 0));
                                    if (hit) {
                                        mHitCount++; var dmg = this.calcDmg(skObj, me.hw, ai.hw, ai.hp, ai.status, me.status);
                                        var flashSlot = (ai.spells.d === "점멸" && ai.spells.dCd <= 0) ? 'd' : ((ai.spells.f === "점멸" && ai.spells.fCd <= 0) ? 'f' : null);
                                        var aiCanReact = (Math.random() * 100 <= ai.sw.ref); 
                                        if (dmg >= ai.hp && flashSlot && aiCanReact) {
                                            dmg = 0; ai.spells[flashSlot+'Cd'] = Config.SpellCD["점멸"]; combatLogs.push(bLogs.spellFlashAi);
                                        } else {
                                            if(ai.status.invincibleDur > 0) dmg = 0; aRawDmg += dmg;
                                            var fxLog = SkillMechanics.apply(skObj.e, me, ai, dmg);
                                            if (skObj.mv > 0) st.distance = Math.max(100, st.distance - skObj.mv); 
                                            combatLogs.push(bLogs.hitMe.replace("{sec}", sec).replace("{dist}", Math.floor(st.distance)).replace("{skill}", skObj.n).replace("{fxLog}", fxLog));
                                            if (aiVulnerable > 0) { combatLogs.push(bLogs.punish); aiVulnerable = 0; }
                                        }
                                    } else { 
                                        combatLogs.push(bLogs.missMe.replace("{sec}", sec).replace("{dist}", Math.floor(st.distance)).replace("{skill}", skObj.n)); 
                                        meVulnerable = 2; 
                                    }
                                    break; 
                                } else if (meRealAggro && Math.random() < 0.1) {
                                    combatLogs.push(bLogs.outOfRangeMe.replace("{sec}", sec).replace("{skill}", skObj.n).replace("{dist}", Math.floor(st.distance)));
                                    break;
                                }
                            } else if (Math.random() < 0.05) {
                                combatLogs.push(bLogs.noMana);
                            }
                        }
                    }
                }
                if (!usedSkill && me.aaTimer >= 1.0 && me.hw.range >= st.distance) {
                    me.aaTimer -= 1.0; 
                    if (this.calcHit(null, me.sw, ai.sw, me.hw, ai.hw, ai.status, (aiVulnerable > 0 ? 30 : 0))) {
                        mHitCount++; var dmg = this.calcDmg({b:0, ad:1.0, t:"AD"}, me.hw, ai.hw, ai.hp, ai.status, me.status);
                        var flashSlot = (ai.spells.d === "점멸" && ai.spells.dCd <= 0) ? 'd' : ((ai.spells.f === "점멸" && ai.spells.fCd <= 0) ? 'f' : null);
                        var aiCanReact = (Math.random() * 100 <= ai.sw.ref); 
                        if (dmg >= ai.hp && flashSlot && aiCanReact) {
                            dmg = 0; ai.spells[flashSlot+'Cd'] = Config.SpellCD["점멸"]; combatLogs.push(bLogs.spellFlashAi);
                        } else {
                            if(ai.status.invincibleDur > 0) dmg = 0; aRawDmg += dmg;
                            if (stratAi === 3 && st.distance > 300) {
                                var minionDmg = 15 + (phaseIdx * 5); mRawDmg += minionDmg;
                                if(Math.random() < 0.2) combatLogs.push(bLogs.minionAggro.replace("{dmg}", minionDmg));
                            }
                        }
                    }
                }
            }

            if (ai.status.stunDur <= 0 && stratAi !== 4 && stratAi !== 8) {
                var usedSkill = false; var keys = ["q", "w", "e", "r"];
                for (var i=0; i<keys.length; i++) {
                    var k = keys[i]; var skLv = ai.skLv[k];
                    if (skLv > 0 && ai.cd[k] <= 0) {
                        var skObj = this.getSk(ai.hw, k, skLv);
                        var effRng = (skObj.rng === 0) ? ai.hw.range : skObj.rng;
                        if (this.evaluateAI(skObj, ai, me, aiRealAggro)) {
                            if (ai.mp >= skObj.cost) {
                                if (effRng >= st.distance) {
                                    ai.mp -= skObj.cost; ai.cd[k] = skObj.cd; usedSkill = true;
                                    var hit = this.calcHit(skObj, ai.sw, me.sw, ai.hw, me.hw, me.status, (meVulnerable > 0 ? 30 : 0));
                                    if (hit) {
                                        aHitCount++; var dmg = this.calcDmg(skObj, ai.hw, me.hw, me.hp, me.status, ai.status);
                                        var flashSlot = (me.spells.d === "점멸" && me.spells.dCd <= 0) ? 'd' : ((me.spells.f === "점멸" && me.spells.fCd <= 0) ? 'f' : null);
                                        var meCanReact = (Math.random() * 100 <= me.sw.ref);
                                        if (dmg >= me.hp && flashSlot && meCanReact) {
                                            dmg = 0; me.spells[flashSlot+'Cd'] = Config.SpellCD["점멸"]; combatLogs.push(bLogs.spellFlashMe);
                                        } else {
                                            if(me.status.invincibleDur > 0) dmg = 0; mRawDmg += dmg;
                                            var fxLog = SkillMechanics.apply(skObj.e, ai, me, dmg);
                                            if (skObj.mv > 0) st.distance = Math.max(100, st.distance - skObj.mv);
                                            combatLogs.push(bLogs.hitAi.replace("{sec}", sec).replace("{dist}", Math.floor(st.distance)).replace("{skill}", skObj.n).replace("{fxLog}", fxLog));
                                            if (meVulnerable > 0) meVulnerable = 0;
                                        }
                                    } else { 
                                        combatLogs.push(bLogs.missAi.replace("{sec}", sec).replace("{dist}", Math.floor(st.distance)).replace("{skill}", skObj.n)); 
                                        aiVulnerable = 2;
                                    }
                                    break;
                                } else if (aiRealAggro && Math.random() < 0.1) {
                                    combatLogs.push(bLogs.outOfRangeAi.replace("{sec}", sec).replace("{skill}", skObj.n).replace("{dist}", Math.floor(st.distance)));
                                    break;
                                }
                            }
                        }
                    }
                }
                if (!usedSkill && ai.aaTimer >= 1.0 && ai.hw.range >= st.distance) {
                    ai.aaTimer -= 1.0; 
                    if (this.calcHit(null, ai.sw, me.sw, ai.hw, me.hw, me.status, (meVulnerable > 0 ? 30 : 0))) {
                        aHitCount++; var dmg = this.calcDmg({b:0, ad:1.0, t:"AD"}, ai.hw, me.hw, me.hp, me.status, ai.status);
                        var flashSlot = (me.spells.d === "점멸" && me.spells.dCd <= 0) ? 'd' : ((me.spells.f === "점멸" && me.spells.fCd <= 0) ? 'f' : null);
                        var meCanReact = (Math.random() * 100 <= me.sw.ref);
                        if (dmg >= me.hp && flashSlot && meCanReact) {
                            dmg = 0; me.spells[flashSlot+'Cd'] = Config.SpellCD["점멸"]; combatLogs.push(bLogs.spellFlashMe);
                        } else {
                            if(me.status.invincibleDur > 0) dmg = 0; mRawDmg += dmg;
                        }
                    }
                }
            }
        } 

        if (stratMe === 8) {
            var dmgToTower = Math.floor((me.hw.baseAd + me.hw.bonusAd + (me.hw.ap * 0.6)) * 1.5);
            ai.towerHp -= dmgToTower;
            combatLogs.push(bLogs.towerHitMe.replace("{sec}", 15).replace("{dmg}", dmgToTower));
            if (ai.towerHp <= 2000 && me.plates === 0) { me.plates = 1; me.gold += 150; combatLogs.push(bLogs.towerPlate); }
            if (ai.towerHp <= 1000 && me.plates === 1) { me.plates = 2; me.gold += 150; combatLogs.push(bLogs.towerPlate); }
        } else if (st.lanePos >= 2 && mHitCount > 0) {
            var towerDmg = 200 + (phaseIdx * 50); mRawDmg += towerDmg;
            combatLogs.push(bLogs.towerAggro.replace("{dmg}", towerDmg));
        }
        
        if (stratAi === 8) {
            var aiDmgToTower = Math.floor((ai.hw.baseAd + ai.hw.bonusAd + (ai.hw.ap * 0.6)) * 1.5);
            me.towerHp -= aiDmgToTower;
            combatLogs.push(bLogs.towerHitAi.replace("{sec}", 15).replace("{dmg}", aiDmgToTower));
            if (me.towerHp <= 2000 && ai.plates === 0) { ai.plates = 1; ai.gold += 150; }
            if (me.towerHp <= 1000 && ai.plates === 1) { ai.plates = 2; ai.gold += 150; }
        } else if (st.lanePos <= -2 && aHitCount > 0) {
            var towerDmg = 200 + (phaseIdx * 50); aRawDmg += towerDmg;
            combatLogs.push(bLogs.towerAggro.replace("{dmg}", towerDmg));
        }

        if(me.status.shield > 0) { mRawDmg -= me.status.shield; me.status.shield = Math.max(0, -mRawDmg); mRawDmg = Math.max(0, mRawDmg); }
        if(ai.status.shield > 0) { aRawDmg -= ai.status.shield; ai.status.shield = Math.max(0, -aRawDmg); aRawDmg = Math.max(0, aRawDmg); }
        
        var mRegen = me.hw.hpRegen * 6 + Math.floor(aRawDmg * (me.hw.omniVamp / 100));
        var aRegen = ai.hw.hpRegen * 6 + Math.floor(mRawDmg * (ai.hw.omniVamp / 100));
        if (stratMe === 4) mRegen = 9999; 
        if (stratAi === 4) aRegen = 9999;
        
        var finalMDmg = Math.max(0, mRawDmg - mRegen); var finalADmg = Math.max(0, aRawDmg - aRegen);
        var isCannonPhase = (phaseIdx === 2); var wave = { melee: 3, caster: 3, siege: isCannonPhase ? 1 : 0 };
        
        var myBaseCs = (stratMe === 2) ? 65 : (stratMe === 3 ? 35 : 50); 
        var aiBaseCs = (stratAi === 2) ? 65 : (stratAi === 3 ? 35 : 50);
        if (st.lanePos <= -2) myBaseCs -= 30; 
        if (st.lanePos >= 2) aiBaseCs -= 30; 

        var mGold = 0, mCs = 0;
        var csChance = this.calcProb(myBaseCs, me.sw.com, ai.sw.int, me.hw, ai.hw, (aHitCount>0 ? -15 : 10));
        var aGold = 0, aCs = 0;
        var aiCsChance = this.calcProb(aiBaseCs, ai.sw.com, me.sw.int, ai.hw, me.hw, (mHitCount > 0 ? -10 : 10));

        var farmLogs = [];
        var myGotCannon = false; // 🌟 887줄 에러(kSiege) 픽스 완료!
        if (stratMe !== 4 && stratMe !== 8) {
            for(var m=0; m<wave.melee; m++) {
                if(Math.random()*100 <= csChance) { mCs++; mGold += 21; }
                if(stratAi !== 4 && stratAi !== 8 && Math.random()*100 <= aiCsChance) { aCs++; aGold += 21; }
            }
            for(var c=0; c<wave.caster; c++) {
                if(Math.random()*100 <= csChance) { mCs++; mGold += 14; }
                if(stratAi !== 4 && stratAi !== 8 && Math.random()*100 <= aiCsChance) { aCs++; aGold += 14; }
            }
            if(wave.siege > 0) {
                if(Math.random()*100 <= (csChance - 10)) { mCs++; mGold += 60; myGotCannon = true; }
                if(stratAi !== 4 && stratAi !== 8 && Math.random()*100 <= (aiCsChance - 10)) { aCs++; aGold += 60; }
            }
            farmLogs.push(bLogs.farm.replace("{mCs}", mCs).replace("{mGold}", mGold).replace("{aCs}", aCs).replace("{aGold}", aGold));
        } else {
            farmLogs.push(bLogs.farmMissed);
            for(var m=0; m<wave.melee; m++) { aCs++; aGold += 21; }
            for(var c=0; c<wave.caster; c++) { aCs++; aGold += 14; }
            if(wave.siege > 0) { aCs++; aGold += 60; }
        }

        var csPercent = ((mCs)/(wave.melee+wave.caster+wave.siege)) * 100;
        var ctx = { strat: stratMe, mHits: mHitCount, aHits: aHitCount, csPercent: csPercent, isCannonPhase: isCannonPhase, gotCannon: myGotCannon, mDmg: finalMDmg, aDmg: finalADmg, myChamp: me.champ, aiChamp: ai.champ };

        if(combatLogs.length === 0) combatLogs.push(bLogs.noAction);
        if(combatLogs.length > 8) {
            var summary = combatLogs.slice(0, 3); summary.push(bLogs.skipMiddle); summary.push(combatLogs[combatLogs.length-1]); combatLogs = summary;
        }

        return { lckLog: BattleDirector.generateLog(ctx), combatLogs: combatLogs.join("\n"), farmLogs: farmLogs.join("\n"), mDmg: Math.floor(finalMDmg), aDmg: Math.floor(finalADmg), mGold: mGold, mCs: mCs, aGold: aGold, aCs: aCs };
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 [3. CONTROLLER] 라우팅 및 유저 입력 핸들러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var PrevScreenMap = {
    "JOIN_ID": "GUEST_MAIN", "JOIN_PW": "GUEST_MAIN", "LOGIN_ID": "GUEST_MAIN", "LOGIN_PW": "GUEST_MAIN",
    "GUEST_INQUIRY": "GUEST_MAIN", "PROFILE_MAIN": "MAIN", "STAT_SELECT": "PROFILE_MAIN",
    "STAT_INPUT": "STAT_SELECT", "STAT_INPUT_CONFIRM": "STAT_INPUT", "STAT_RESET_CONFIRM": "PROFILE_MAIN",
    "COLLECTION_MAIN": "MAIN", "TITLE_EQUIP": "COLLECTION_MAIN", "CHAMP_LIST_ROLE": "COLLECTION_MAIN", "CHAMP_LIST": "CHAMP_LIST_ROLE",
    "SHOP_MAIN": "MAIN", "SHOP_ITEMS": "SHOP_MAIN", "SHOP_CHAMPS_ROLE": "SHOP_MAIN", "SHOP_CHAMPS": "SHOP_CHAMPS_ROLE",
    "USER_INQUIRY": "MAIN", "MODE_SELECT": "MAIN", "BATTLE_LOBBY": "MODE_SELECT", "BATTLE_PICK_ROLE": "BATTLE_LOBBY", "BATTLE_PICK": "BATTLE_PICK_ROLE",
    "BATTLE_SPELL_PICK": "BATTLE_LOBBY", 
    "ADMIN_SYS_INFO": "ADMIN_MAIN", "ADMIN_INQUIRY_LIST": "ADMIN_MAIN", "ADMIN_USER_SELECT": "ADMIN_MAIN",
    "ADMIN_USER_DETAIL": "ADMIN_USER_SELECT", "ADMIN_ACTION_CONFIRM": "ADMIN_USER_DETAIL", 
    "ADMIN_EDIT_SELECT": "ADMIN_USER_DETAIL", "ADMIN_EDIT_INPUT": "ADMIN_EDIT_SELECT", 
    "ADMIN_EDIT_INPUT_CONFIRM": "ADMIN_EDIT_INPUT", "ADMIN_INQUIRY_DETAIL": "ADMIN_INQUIRY_LIST", 
    "ADMIN_INQUIRY_REPLY": "ADMIN_INQUIRY_DETAIL"
};

var SystemAction = {
    go: function(replier, title, msg, nextFunc) {
        replier.reply(LayoutManager.renderAlert(title, msg));
        java.lang.Thread.sleep(Config.Timers.systemAction); 
        if (nextFunc) nextFunc();
    }
};

var AuthController = { 
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
            
            if (session.screen === "CHAMP_LIST_ROLE") return replier.reply(LayoutManager.renderFrame(s.roleSelect, getRoleMenuText(data), true, f.selectNum));
            if (session.screen === "CHAMP_LIST") {
                var myChamps = data.inventory.champions.filter(function(c) { return ChampionData[c] && ChampionData[c].role === session.temp.role; });
                var text = "📊 [" + session.temp.role + "] 보유 챔피언\n" + Utils.getFixedDivider() + "\n\n";
                text += (myChamps.length > 0) ? myChamps.map(function(c, i){ return (i+1) + ". " + c; }).join("\n") : "보유 챔피언 없음";
                return replier.reply(LayoutManager.renderFrame(s.champ, text, true, f.checkList));
            }
            
            if (session.screen === "SHOP_MAIN") return replier.reply(LayoutManager.renderFrame(s.shop, LayoutManager.templates.menuList(null, ContentManager.menus.shopMain), true, f.selectCat));
            if (session.screen === "SHOP_ITEMS") return replier.reply(LayoutManager.renderFrame(s.shopItem, "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.shopItems), true, f.inputBuyNum));
            
            if (session.screen === "SHOP_CHAMPS_ROLE") return replier.reply(LayoutManager.renderFrame(s.roleSelect, getRoleMenuText(data), true, f.selectNum));
            if (session.screen === "SHOP_CHAMPS") {
                var shopChamps = ChampionList.filter(function(c) { return ChampionData[c].role === session.temp.role; });
                var text = "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G\n" + Utils.getFixedDivider() + "\n[ " + session.temp.role + " 상점 ]\n\n";
                text += shopChamps.map(function(c, i){ return (i+1) + ". " + c + (data.inventory.champions.indexOf(c)!==-1?" [보유]":" [500G]"); }).join("\n");
                return replier.reply(LayoutManager.renderFrame(s.shopChamp, text, true, f.inputHireNum));
            }
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
                
                var cU = ContentManager.battle.ui;
                session.screen = "BATTLE_MATCHING"; SessionManager.save();
                replier.reply(LayoutManager.renderAlert(ContentManager.battle.screen.match, cU.findMsg, cU.searching));
                
                var roomStr = room + ""; var senderStr = sender + ""; 
                new java.lang.Thread(new java.lang.Runnable({
                    run: function() {
                        try {
                            java.lang.Thread.sleep(Config.Timers.matchSearch);
                            var s = SessionManager.get(roomStr, senderStr);
                            if (s && s.screen === "BATTLE_MATCHING") {
                                Api.replyRoom(roomStr, LayoutManager.renderAlert("✅ " + ContentManager.battle.screen.match, cU.matchOk, cU.matchFoundInfo));
                                java.lang.Thread.sleep(Config.Timers.matchFound); 
                                
                                s = SessionManager.get(roomStr, senderStr); 
                                s.screen = "BATTLE_LOBBY"; SessionManager.save(); 
                                var currentData = Database.data[s.tempId];
                                BattleController.handle("refresh_screen", s, senderStr, {reply: function(msg){ Api.replyRoom(roomStr, msg); }}, roomStr, currentData);
                            }
                        } catch(e) {}
                    }
                })).start();
                return;
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
             if (msg === "2") { session.screen = "CHAMP_LIST_ROLE"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "TITLE_EQUIP") {
            if (data.inventory.titles.indexOf(msg) === -1) return SystemAction.go(replier, t.error, m.noTitleError, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            data.title = msg; Database.save();
            return SystemAction.go(replier, t.complete, m.titleEquipSuccess(msg), function() { session.screen = "COLLECTION_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
        }
        
        if (session.screen === "CHAMP_LIST_ROLE") {
            var rIdx = parseInt(msg) - 1;
            if (RoleList[rIdx]) {
                session.temp.role = RoleList[rIdx]; session.screen = "CHAMP_LIST"; return UserController.handle("refresh_screen", session, sender, replier, room);
            }
        }

        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") { session.screen = "SHOP_ITEMS"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "SHOP_CHAMPS_ROLE"; return UserController.handle("refresh_screen", session, sender, replier, room); }
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
        
        if (session.screen === "SHOP_CHAMPS_ROLE") {
            var rIdx = parseInt(msg) - 1;
            if (RoleList[rIdx]) {
                session.temp.role = RoleList[rIdx]; session.screen = "SHOP_CHAMPS"; return UserController.handle("refresh_screen", session, sender, replier, room);
            }
        }
        if (session.screen === "SHOP_CHAMPS") {
            var shopChamps = ChampionList.filter(function(c) { return ChampionData[c].role === session.temp.role; });
            var target = shopChamps[parseInt(msg) - 1];
            if (target) {
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

var AdminController = { 
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

// 🌟 [V12.4] 전투 조작 컨트롤러 (BattleController)
var BattleController = {
    handle: function(msg, session, sender, replier, room, userData) {
        var cB = ContentManager.battle; var vB = BattleView.Board; var bM = BattleEngine;
        if (!session.battle) session.battle = {};
        if (!session.battle.spells) session.battle.spells = { d: "점멸", f: "점화" }; 

        // [자가 치유] 구버전 세션 데이터 보정
        if (session.screen === "BATTLE_MAIN" || session.screen === "BATTLE_SKILLUP" || session.screen === "BATTLE_SKILLINFO" || session.screen === "BATTLE_DETAIL" || session.screen === "BATTLE_ENEMY_INFO") {
            var st = session.battle.instance;
            if (st) {
                st.lanePos = st.lanePos || 0;
                st.distance = st.distance || 600;
                if (!st.me.spells) st.me.spells = { d: "점멸", f: "점화", dCd: 0, fCd: 0 };
                if (!st.ai.spells) st.ai.spells = { d: "점멸", f: "점화", dCd: 0, fCd: 0 };
                st.me.cs = st.me.cs || 0; st.ai.cs = st.ai.cs || 0;
                st.me.kills = st.me.kills || 0; st.ai.kills = st.ai.kills || 0;
                st.me.towerHp = st.me.towerHp || 3000; st.ai.towerHp = st.ai.towerHp || 3000;
            }
        }

        if (msg === "refresh_screen") {
            if (session.screen === "BATTLE_MATCHING" || session.screen === "BATTLE_LOADING") return; 
            
            // 로비 및 픽창 렌더링
            if (session.screen === "BATTLE_LOBBY") {
                var mC = session.battle.myChamp || "미선택";
                var mRole = session.battle.myChamp ? ChampionData[mC].role : "";
                var content = "⚔️ 라인전 출전 준비\n\n👤 챔피언: " + mC + " [" + mRole + "]\nRUN: D[" + session.battle.spells.d + "] F[" + session.battle.spells.f + "]\n\n[ 준비 메뉴 ]\n1. 👤 챔피언 선택/변경\n2. 🏃 스펠 D 변경\n3. 🔥 스펠 F 변경\n\n0. ✅ 준비완료 (전투 진입)";
                return replier.reply(LayoutManager.renderFrame(ContentManager.screen.lobby, content, false, "번호를 입력하세요. (취소: 로비로)"));
            }
            if (session.screen === "BATTLE_PICK_ROLE") return replier.reply(LayoutManager.renderFrame(ContentManager.screen.roleSelect, getRoleMenuText(userData), true, "번호 선택"));
            if (session.screen === "BATTLE_PICK") {
                var pickChamps = userData.inventory.champions.filter(function(c) { return ChampionData[c] && ChampionData[c].role === session.temp.role; });
                var text = "🎯 [" + session.temp.role + "] 출전 챔피언 선택:\n\n" + (pickChamps.length > 0 ? pickChamps.map(function(c, i) { return (i+1) + ". " + c; }).join("\n") : "해당 역할군 챔피언 없음");
                return replier.reply(LayoutManager.renderFrame(cB.screen.pick, text, true, "번호 선택"));
            }
            if (session.screen === "BATTLE_SPELL_PICK") return replier.reply(LayoutManager.renderFrame(ContentManager.screen.spellPick, LayoutManager.templates.menuList(null, ContentManager.menus.spells), true, "장착할 스펠 번호를 선택하세요."));

            // 전투 화면 렌더링
            if (session.screen === "BATTLE_MAIN") return replier.reply(vB.render(session.battle.instance));
            if (session.screen === "BATTLE_ENEMY_INFO") return replier.reply(vB.renderEnemyInfo(session.battle.instance));
            if (session.screen === "BATTLE_DETAIL") return replier.reply(vB.renderDetail(session.battle.instance.me));
            if (session.screen === "BATTLE_SKILLINFO") return replier.reply(vB.renderSkillInfo(session.battle.instance.me));
            if (session.screen === "BATTLE_SKILLUP") return replier.reply(vB.renderSkillUp(session.battle.instance.me));
        }

        // 로비 로직
        if (session.screen === "BATTLE_LOBBY") {
            if (msg === "1") { session.screen = "BATTLE_PICK_ROLE"; SessionManager.save(); return BattleController.handle("refresh_screen", session, sender, replier, room, userData); }
            if (msg === "2") { session.temp.spellSlot = "d"; session.screen = "BATTLE_SPELL_PICK"; SessionManager.save(); return BattleController.handle("refresh_screen", session, sender, replier, room, userData); }
            if (msg === "3") { session.temp.spellSlot = "f"; session.screen = "BATTLE_SPELL_PICK"; SessionManager.save(); return BattleController.handle("refresh_screen", session, sender, replier, room, userData); }
            if (msg === "0") {
                if (!session.battle.myChamp) return replier.reply(LayoutManager.renderAlert("준비 불가", "⚠️ 챔피언을 먼저 선택해주세요."));
                if (session.battle.spells.d === session.battle.spells.f) return replier.reply(LayoutManager.renderAlert("준비 불가", "⚠️ 두 스펠을 다르게 선택해주세요."));
                
                session.battle.enemy = bM.generateAI(); 
                session.screen = "BATTLE_LOADING"; SessionManager.save();
                replier.reply(LayoutManager.renderAlert(cB.screen.load, cB.ui.loadRift));
                
                var roomStr = room + ""; var senderStr = sender + ""; var uStats = JSON.parse(JSON.stringify(userData.stats)); 
                new java.lang.Thread(new java.lang.Runnable({
                    run: function() {
                        try {
                            java.lang.Thread.sleep(Config.Timers.loading); 
                            var cS = SessionManager.get(roomStr, senderStr);
                            if (cS && cS.screen === "BATTLE_LOADING") {
                                cS.screen = "BATTLE_MAIN"; 
                                var mHw = JSON.parse(JSON.stringify(ChampionData[cS.battle.myChamp]));
                                var aHw = JSON.parse(JSON.stringify(ChampionData[cS.battle.enemy.champion]));
                                cS.battle.instance = {
                                    turn: 1, strat: 0, lanePos: 0, distance: 600,
                                    me: { champ: cS.battle.myChamp, level: 1, exp: 0, hp: mHw.hp, mp: mHw.mp, gold: 0, cs: 0, kills: 0, towerHp: 3000, plates: 0, hw: mHw, sw: uStats, cd: {q:0, w:0, e:0, r:0}, skLv: {q:0, w:0, e:0, r:0}, sp: 1, spells: {d: cS.battle.spells.d, f: cS.battle.spells.f, dCd: 0, fCd: 0} },
                                    ai: { champ: cS.battle.enemy.champion, level: 1, exp: 0, hp: aHw.hp, mp: aHw.mp, gold: 0, cs: 0, kills: 0, towerHp: 3000, plates: 0, hw: aHw, sw: cS.battle.enemy.stats, cd: {q:0, w:0, e:0, r:0}, skLv: {q:1, w:0, e:0, r:0}, sp: 0, spells: {d: cS.battle.enemy.spells.d, f: cS.battle.enemy.spells.f, dCd: 0, fCd: 0} }
                                };
                                SessionManager.save(); 
                                var vsText = cB.ui.vsFormat.replace("{uName}", senderStr).replace("{uChamp}", cS.battle.myChamp).replace("{uD}", cS.battle.spells.d).replace("{uF}", cS.battle.spells.f)
                                                           .replace("{aChamp}", cS.battle.enemy.champion).replace("{aD}", cS.battle.enemy.spells.d).replace("{aF}", cS.battle.enemy.spells.f);
                                Api.replyRoom(roomStr, LayoutManager.renderFrame(cB.ui.vsTitle, vsText + "\n\n" + Utils.getFixedDivider() + "\n" + cB.ui.battleStart, false, "잠시 후 전투 현황판이 출력됩니다."));
                                java.lang.Thread.sleep(Config.Timers.vsScreen + 1000); 
                                Api.replyRoom(roomStr, vB.render(cS.battle.instance)); 
                            }
                        } catch(e) { Api.replyRoom(roomStr, "⚠️ 로딩 오류: " + e.message); }
                    }
                })).start();
                return;
            }
        }

        // 픽창 및 스펠 선택 로직
        if (session.screen === "BATTLE_PICK_ROLE") {
            var rIdx = parseInt(msg) - 1;
            if (RoleList[rIdx]) { session.temp.role = RoleList[rIdx]; session.screen = "BATTLE_PICK"; return BattleController.handle("refresh_screen", session, sender, replier, room, userData); }
        }
        if (session.screen === "BATTLE_PICK") {
            var idx = parseInt(msg) - 1; 
            var pickChamps = userData.inventory.champions.filter(function(c) { return ChampionData[c] && ChampionData[c].role === session.temp.role; });
            var targetChamp = pickChamps[idx];
            if (targetChamp) { session.battle.myChamp = targetChamp; session.screen = "BATTLE_LOBBY"; SessionManager.save(); return BattleController.handle("refresh_screen", session, sender, replier, room, userData); } 
        }
        if (session.screen === "BATTLE_SPELL_PICK") {
            var sIdx = parseInt(msg) - 1; var pickedSpell = SpellList[sIdx];
            if (pickedSpell) {
                var otherSlot = session.temp.spellSlot === 'd' ? 'f' : 'd';
                if (session.battle.spells[otherSlot] === pickedSpell) return replier.reply(LayoutManager.renderAlert("스펠 중복", "⚠️ 이미 선택된 스펠입니다."));
                session.battle.spells[session.temp.spellSlot] = pickedSpell; session.screen = "BATTLE_LOBBY"; SessionManager.save();
                return BattleController.handle("refresh_screen", session, sender, replier, room, userData);
            }
        }

        // 🌟 정보 메뉴 이동 및 스킬 강화
        if (session.screen === "BATTLE_ENEMY_INFO" || session.screen === "BATTLE_DETAIL" || session.screen === "BATTLE_SKILLINFO") {
            if (msg === "0") { session.screen = "BATTLE_MAIN"; SessionManager.save(); return replier.reply(vB.render(session.battle.instance)); } return;
        }
        if (session.screen === "BATTLE_SKILLUP") {
            var me = session.battle.instance.me;
            if (msg === "0") { session.screen = "BATTLE_MAIN"; SessionManager.save(); return replier.reply(vB.render(session.battle.instance)); }
            var keyMap = {"1":"q", "2":"w", "3":"e", "4":"r"}; var key = msg.toLowerCase(); if (keyMap[key]) key = keyMap[key];
            if (["q", "w", "e", "r"].indexOf(key) !== -1) {
                if (me.sp <= 0) return replier.reply(LayoutManager.renderAlert(cB.alerts.noSp.title, cB.alerts.noSp.msg));
                if (key === 'r' && me.level < 6) return replier.reply(LayoutManager.renderAlert(cB.alerts.reqLvl6.title, cB.alerts.reqLvl6.msg));
                if (me.skLv[key] >= me.hw.skills[key].max) return replier.reply(LayoutManager.renderAlert(cB.alerts.maxLvl.title, cB.alerts.maxLvl.msg));
                me.skLv[key]++; me.sp--; SessionManager.save();
                var notiText = LayoutManager.renderAlert(cB.alerts.skillUpOk.title, cB.alerts.skillUpOk.msg.replace("{skill}", me.hw.skills[key].n).replace("{lvl}", me.skLv[key]));
                if (me.sp <= 0) { session.screen = "BATTLE_MAIN"; SessionManager.save(); replier.reply(notiText); return replier.reply(vB.render(session.battle.instance)); }
                else { replier.reply(notiText); return replier.reply(vB.renderSkillUp(me)); }
            }
            return;
        }

        // 🌟 메인 전투 화면 로직
        if (session.screen === "BATTLE_MAIN") {
            var state = session.battle.instance;
            var cleanMsg = msg.replace(/\s+/g, "").toLowerCase();

            if (msg === "1") { session.screen = "BATTLE_ENEMY_INFO"; SessionManager.save(); return replier.reply(vB.renderEnemyInfo(state)); }
            if (msg === "2") { session.screen = "BATTLE_DETAIL"; SessionManager.save(); return replier.reply(vB.renderDetail(state.me)); }
            if (msg === "3") { session.screen = "BATTLE_SKILLINFO"; SessionManager.save(); return replier.reply(vB.renderSkillInfo(state.me)); }
            
            if (msg === "4") { state.strat = 1; SessionManager.save(); return replier.reply(vB.render(state)); }
            if (msg === "5") { state.strat = 2; SessionManager.save(); return replier.reply(vB.render(state)); }
            if (msg === "6") { state.strat = 3; SessionManager.save(); return replier.reply(vB.render(state)); }
            if (msg === "7") { state.strat = 4; SessionManager.save(); return replier.reply(vB.render(state)); }
            if (msg === "8") { 
                if (state.lanePos < 2) return replier.reply(LayoutManager.renderAlert(cB.alerts.noTowerRange.title, cB.alerts.noTowerRange.msg));
                state.strat = 8; SessionManager.save(); return replier.reply(vB.render(state)); 
            }
            if (msg === "9" && state.me.sp > 0) { session.screen = "BATTLE_SKILLUP"; SessionManager.save(); return replier.reply(vB.renderSkillUp(state.me)); }
            
            if (msg === "항복" || msg === "취소") { SessionManager.reset(room, sender); var newS = SessionManager.get(room, sender); newS.tempId = session.tempId; SessionManager.save(); return SystemAction.go(replier, "항복", "로비로 돌아갑니다.", function(){ UserController.handle("refresh_screen", newS, sender, replier, room); }); }

            if (msg === "0" || cleanMsg === "준비완료") {
                if (state.strat === 0) return replier.reply(LayoutManager.renderAlert(cB.alerts.noStrat.title, cB.alerts.noStrat.msg));
                if (state.me.skLv.q === 0 && state.me.skLv.w === 0 && state.me.skLv.e === 0) return replier.reply(LayoutManager.renderAlert(cB.alerts.noSkill.title, cB.alerts.noSkill.msg));

                var stratMe = state.strat; state.strat = 0; 
                var roomStr = room + ""; var senderStr = sender + ""; var sessionKey = SessionManager.getKey(roomStr, senderStr);

                new java.lang.Thread(new java.lang.Runnable({
                    run: function() {
                        try {
                            var cS = SessionManager.sessions[sessionKey]; var st = cS.battle.instance;
                            var stratAi = decideAIStrategy(st.ai, st.me, st.lanePos);
                            
                            // 🌟 3단계 페이즈 실행
                            for (var i = 1; i <= 3; i++) {
                                var p = bM.playPhase(st, stratMe, stratAi, i, st.lanePos);
                                // ... (전투 로그 및 데미지 처리는 BattleEngine에서 계산된 값을 View에서 렌더링) ...
                                var mentalLog = "";
                                var isPhaseDeath = false;
                                if (st.me.hp <= 0) { 
                                    st.ai.kills++; st.me.hp = st.me.hw.hp; st.me.mp = st.me.hw.mp; st.lanePos = 0; st.distance = 600;
                                    mentalLog = cB.logs.killMe; isPhaseDeath = true; 
                                } else if (st.ai.hp <= 0) { 
                                    st.me.kills++; st.ai.hp = st.ai.hw.hp; st.ai.mp = st.ai.hw.mp; st.lanePos = 0; st.distance = 600;
                                    mentalLog = cB.logs.killAi; isPhaseDeath = true; 
                                }

                                var phaseTitle = cB.screen.phasePrefix + i + cB.screen.phaseSuffix;
                                var phaseContent = p.lckLog + mentalLog + "\n\n" + Utils.getFixedDivider() + "\n[ ⚔️ 타임라인 기록 ]\n" + p.combatLogs + "\n\n" + Utils.getFixedDivider() + "\n" + p.farmLogs + "\n\n" + Utils.getFixedDivider() + "\n[ 📊 수치 변화 ]\n🩸 나: -" + p.aDmg + " HP / 🤖 적: -" + p.mDmg + " HP";
                                Api.replyRoom(roomStr, LayoutManager.renderFrame(phaseTitle, phaseContent, false, cB.ui.watchNext));

                                if (isPhaseDeath) break; 
                                java.lang.Thread.sleep(Config.Timers.phaseDelay); 
                            }
                            
                            // 🌟 턴 종료 처리 (라인 이동 및 스펠 쿨타임)
                            var laneMove = 0;
                            if (stratMe === 2) laneMove += 1; else if (stratMe === 3) laneMove -= 1;
                            if (stratAi === 2) laneMove -= 1; else if (stratAi === 3) laneMove += 1;
                            st.lanePos = Math.max(-2, Math.min(2, st.lanePos + laneMove));

                            if (st.me.spells.dCd > 0) st.me.spells.dCd--; if (st.me.spells.fCd > 0) st.me.spells.fCd--;
                            if (st.ai.spells.dCd > 0) st.ai.spells.dCd--; if (st.ai.spells.fCd > 0) st.ai.spells.fCd--;

                            java.lang.Thread.sleep(2000); 

                            // 🌟 승리 조건 달성 체크
                            if (st.me.kills >= 3 || st.me.cs >= 100 || st.ai.towerHp <= 0 || st.ai.kills >= 3 || st.ai.cs >= 100 || st.me.towerHp <= 0 || st.turn >= 30) {
                                var isWin = (st.me.kills >= 3 || st.me.cs >= 100 || st.ai.towerHp <= 0); 
                                var reward = isWin ? 300 : 100; 
                                Database.data[cS.tempId].gold += reward; Database.save();
                                var endContent = (isWin ? cB.ui.win : cB.ui.lose) + "\n\n보상 골드: +" + reward + " G";
                                Api.replyRoom(roomStr, LayoutManager.renderFrame(cB.screen.end, endContent, false, cB.ui.endWait));
                                SessionManager.reset(roomStr, senderStr); var endS = SessionManager.get(roomStr, senderStr); endS.tempId = cS.tempId; SessionManager.save();
                                java.lang.Thread.sleep(Config.Timers.systemAction); 
                                return UserController.handle("refresh_screen", endS, senderStr, {reply: function(msg){ Api.replyRoom(roomStr, msg); }}, roomStr);
                            }

                            // 🌟 경험치 획득 및 레벨업
                            var expGain = (stratMe === 4) ? 0 : (stratMe === 3 ? 60 : 100); 
                            st.me.exp += expGain;
                            if (st.me.exp >= 100) { st.me.level++; st.me.exp -= 100; st.me.sp++; st.me.hw.baseAd += 3; st.me.hw.hp += 80; st.me.hp += 80; }
                            st.ai.exp += 100;
                            if (st.ai.exp >= 100) { 
                                st.ai.level++; st.ai.exp -= 100; st.ai.hw.baseAd += 4; st.ai.hw.hp += 90; st.ai.hp += 90; 
                                if(st.ai.level >= 6 && st.ai.skLv.r === 0) st.ai.skLv.r = 1;
                                else if(st.ai.skLv.q < 5) st.ai.skLv.q++; else if(st.ai.skLv.w < 5) st.ai.skLv.w++; else if(st.ai.skLv.e < 5) st.ai.skLv.e++;
                            }

                            st.turn++; SessionManager.save();
                            Api.replyRoom(roomStr, vB.render(st));
                        } catch(e) { 
                            var errLog = "⚠️ 전투 연산 에러!\n" + e.toString();
                            if (e.lineNumber) errLog += "\n(코드 " + e.lineNumber + "줄)";
                            Api.replyRoom(roomStr, errLog); 
                        }
                    }
                })).start();
                return;
            }
        }
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 [4. 메인 진입점 (Entry Point / Front Controller)]
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
            if (session.screen && session.screen.indexOf("BATTLE_MAIN") !== -1) {
                return replier.reply(LayoutManager.renderAlert(ContentManager.battle.alerts.noPrev.title, ContentManager.battle.alerts.noPrev.msg));
            }
            if (PrevScreenMap[session.screen]) {
                session.screen = PrevScreenMap[session.screen];
                if (room === Config.AdminRoom) return AdminController.handle("refresh_screen", session, sender, replier, room);
                if (isLogged && session.screen.indexOf("BATTLE_") === 0) return BattleController.handle("refresh_screen", session, sender, replier, room, Database.data[session.tempId]);
                if (isLogged) return UserController.handle("refresh_screen", session, sender, replier, room);
                return AuthController.handle("refresh_screen", session, sender, replier, room);
            }
            return SystemAction.go(replier, ContentManager.title.notice, ContentManager.msg.noPrevious, function() {
                if (room === Config.AdminRoom) return AdminController.handle("refresh_screen", session, sender, replier, room);
                if (isLogged && session.screen.indexOf("BATTLE_") === 0) return BattleController.handle("refresh_screen", session, sender, replier, room, Database.data[session.tempId]);
                if (isLogged) return UserController.handle("refresh_screen", session, sender, replier, room);
                return AuthController.handle("refresh_screen", session, sender, replier, room);
            });
        }

        if (room === Config.AdminRoom) return AdminController.handle(realMsg, session, sender, replier, room);
        if (isLogged && session.screen && session.screen.indexOf("BATTLE_") === 0) return BattleController.handle(realMsg, session, sender, replier, room, Database.data[session.tempId]);
        if (isLogged) return UserController.handle(realMsg, session, sender, replier, room);
        return AuthController.handle(realMsg, session, sender, replier, room);

    } catch (e) {
        var errLog = "❌ 시스템 에러 발생!\n" + e.toString();
        if (e.lineNumber) errLog += "\n(코드 " + e.lineNumber + "줄)";
        try { Api.replyRoom(Config.AdminRoom, errLog); } catch(err) {} 
        replier.reply(errLog);
        SessionManager.reset(room, sender);
    }
}
