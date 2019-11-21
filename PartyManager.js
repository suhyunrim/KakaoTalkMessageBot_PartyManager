importPackage(org.json);

const scriptName="PartyManager.js";

const KakaoNameSplitCharacters = ['/', ' '];
const GameTypes = [["일반", 5], ["칼바람", 5], ["자랭", 5], ["내전", 10]];
const AlarmTime = [16, 19];

var isInitialized = false;
var shouldNotice = true;
var parties = [];
var noticedDay = 0;

if (this.JSON && !this.JSON.dateParser)
{
    var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    var reMsAjax = /^\/Date\((d|-|.*)\)[\/|\\]$/;
   
    JSON.dateParser = function (key, value) {
        if (typeof value === 'string') {
            var a = reISO.exec(value);
            if (a)
                return new Date(value);
            a = reMsAjax.exec(value);
            if (a) {
                var b = a[1].split(/[-+,.]/);
                return new Date(b[0] ? +b[0] : 0 - +b[1]);
            }
        }
        return value;
    };
}

function response(room, msg, sender, isGroupChat, replier, ImageDB, packageName, threadId){
    if (isInitialized == false)
        Initialize();

    try
    {
        var split = msg.split(' ');
        if (split[0].startsWith('/') == false)
        {
            RegisterNotice(replier);
            return;
        }

        ClearEndedParty();

        var command = split[0];
        var msg = "";
        if (command == "/사용법")
        {
            msg += "시간 양식 : 0000 ~ 2359\n";
            msg += "사용 가능 명령어\n";
            msg += "/파티리스트\n";
            msg += "/파티생성 파티이름 시간\n";
            msg += "/파티참가 파티이름\n";
            msg += "/파티탈퇴 파티이름\n";
            msg += "/파티시간변경 파티이름 시간\n";
            msg += "/파티강퇴 파티이름 파티원번호\n";
        }
        else if (command == "/파티생성")
        {
            var partyName = split[1];
            if (!IsValidGameType(partyName))
            {
                msg = "Error! 파티는 ";
                GameTypes.forEach(elem => {
                    msg += elem[0];
                    msg += ", ";
                });
                msg.substring(0, msg.length - 2);
                msg += "만 생성 할 수 있어요!";
            }
            else
            {
                var cur = new Date();
                var isValidTime = CheckCustomTimeFormat(split[2]);
                if (isValidTime)
                {
                    var time = ConvertCustomTimeToDate(split[2]);
                    if (cur > time)
                    {
                        msg = "Error! 미래 시간을 입력해주세요.";
                    }
                    else
                    {
                        var party = CreateParty(partyName, time);
                        if (party)
                        {
                            parties.push(party);
                            msg = ConvertDateToStr(party["time"]) + "에 [" + partyName +"]가 생성되었어요~";
                        }
                        else
                        {
                            msg = "Error! [" + partyName + "]는 이미 존재하는 파티에요!";
                        }
                    }
                }
                else
                {
                    msg = "Error! 시간 양식을 확인해주세요.";
                }
            }
        }
        else if (command == "/파티참가")
        {
            var partyName = split[1];
            var party = FindPartyByName(partyName);
            if (party)
            {
                var errorMsg = JoinParty(party, sender);
                msg = ConvertPartyToMsg(party);
                if (!errorMsg)
                {
                    msg += "\n\n" + GetNameFromKakaoName(sender) + "님이 [" + partyName + "]에 참가하였습니다!";
                }
                else
                {
                    msg += "\n\n" + errorMsg;
                }
            }
            else
            {
                msg = "Error! [" + partyName + "]는 존재하지 않아요!";
            }
        }
        else if (command == "/파티리스트")
        {
            msg = GetPartyListMsg();
        }
        else if (command == "/파티탈퇴")
        {
            var partyName = split[1];
            var party = FindPartyByName(partyName);
            if (party)
            {
                var errorMsg = LeaveParty(party, sender);
                if (!errorMsg)
                {
                    msg = GetNameFromKakaoName(sender) + "님이 [" + partyName + "]를 떠나셨어요.";
                }
                else
                {
                    msg = "Erorr! " + errorMsg;
                }
            }
            else
            {
                msg = "Error! [" + partyName + "]는 존재하지 않아요!";
            }
        }
        else if (command == "/파티시간변경")
        {
            var partyName = split[1];
            var party = FindPartyByName(partyName);
            var isValidTime = CheckCustomTimeFormat(split[2]);
            if (isValidTime)
            {
                var errorMsg = ModifyPartyTime(party, ConvertCustomTimeToDate(split[2]));
                if (!errorMsg)
                    msg = "[" + partyName + "] 파티 시간이 변경되었습니다.";
                else
                    msg = "Error! " + errorMsg;
            }
            else
            {
                msg = "Error! 시간 양식을 확인해주세요.";
            }
        }
        else if (command == "/파티강퇴")
        {
            var partyName = split[1];
            var purgeeNumber = split[2];
            if (purgeeNumber.match(/[0-9]/))
            {
                var party = FindPartyByName(partyName);
                if (party)
                {
                    var purgeeName = "";
                    if (purgeeNumber <= party["members"].length)
                        purgeeName = party["members"][purgeeNumber - 1];
                    
                    var errorMsg = KickParty(party, purgeeNumber);
                    if (!errorMsg)
                    {
                        msg = purgeeName + "님이 [" + partyName + "]에서 강퇴되셨어요.";
                    }
                    else
                    {
                        msg = "Erorr! " + errorMsg;
                    }
                }
                else
                {
                    msg = "Error! [" + partyName + "]는 존재하지 않아요!";
                }
            }
            else
            {
                msg = "Error! 강퇴할 번호를 입력해주세요.";
            }
        }
        else if (command == "/파티알림켜기")
        {
            shouldNotice = true;
        }
        else if (command == "/파티알림끄기")
        {
            shouldNotice = false;
        }
        else if (command.includes == "하이")
        {
            msg = GetNameFromKakaoName(sender) + "님 하이요!!";
        }

        if (msg.length > 0)
            replier.reply(msg);

        DataBase.setDataBase("parties", JSON.stringify(parties));
    }
    catch (error)
    {
        replier.reply("Unknown Error!");
    }
}

function Initialize()
{
    var partiesRaw = DataBase.getDataBase("parties");
    if (partiesRaw && partiesRaw != "")
    {
        parties = JSON.parse(partiesRaw, JSON.dateParser);
    }

    isInitialized = true;
}

function RegisterNotice(replier)
{
    if (!shouldNotice || parties.length == 0)
        return;

    var date = new Date();
    if (noticedDay == date.getDate())
        return;

    noticedDay = date.getDate();

    var targetDate = new Date();
    targetDate.setMinutes(0);
    AlarmTime.forEach(elem => {
        targetDate.setHours(elem);
        NoticePartyList(targetDate, replier);
    });
}

function NoticePartyList(targetDate, replier)
{
    var now = new Date();
    var diffTime = targetDate - now;
    if (diffTime < 0)
        return;

    java.lang.Thread.sleep(diffTime);

    ClearEndedParty();

    if (parties.length == 0)
        return;

    var noticeMsg = "☆★ 오늘의 파티 ★☆\n";
    noticeMsg += GetPartyListMsg();
    replier.reply(noticeMsg);
}

function GetNameFromKakaoName(kakaoName)
{
    for (var i = 0; i < KakaoNameSplitCharacters.length; i++)
    {
        var splitChar = KakaoNameSplitCharacters[i];
        var split = kakaoName.split(splitChar);
        Log.info("splitChar: " + splitChar + "  split: " + split.length);
        if (split.length > 1)
            return split[0];
    }

    return kakaoName;
}

function GetPartyListMsg()
{
    var msg = "";
    if (parties.length > 0)
    {
        for (var i = 0; i < parties.length; i++)
            msg += ConvertPartyToMsg(parties[i]) + "\n\n";
    }
    else
    {
        msg = "만들어진 파티가 없어요 ㅠ_ㅠ";
    }

    return msg;
}

function IsValidGameType(partyName)
{
    for (var i = 0; i < GameTypes.length; i++)
    {
        isValidGameType = partyName.includes(GameTypes[i][0]);
        if (isValidGameType)
            return true;
    }

    return false;
}

function ModifyPartyTime(party, time)
{
    var cur = new Date();
    if (cur > time)
        return "미래 시간을 입력해주세요.";

    party["time"] = time;
}

function CheckCustomTimeFormat(customIime)
{
    return customIime.match(/[0-9][0-9][0-9][0-9]/);
}

function ConvertCustomTimeToDate(time)
{
    var date = new Date();
    date.setHours(Number(time.substring(0, 2)));
    date.setMinutes(Number(time.substring(2, 4)));
    return date;
}

function CreateParty(name, time)
{
    var found = FindPartyByName(name);
    if (found)
        return;

    return {name:name, members:[], time:time};
}

function JoinParty(party, userName)
{
    var partyName = party["name"];
    for (var i = 0; i < GameTypes.length; i++)
    {
        var typeName = GameTypes[i][0];
        var typeLimitation = GameTypes[i][1];
        if (partyName.includes(typeName) && party["members"].length >= typeLimitation)
            return "인원이 꽉 찼어요!";
    }
    
    if (party["members"].indexOf(userName) >= 0)
        return "이미 참가 중이에요!";

    party["members"].push(userName);
}

function LeaveParty(party, userName)
{
    var idx = party["members"].indexOf(userName);
    if (idx < 0)
        return "[" + party["name"] + "]에 " + GetNameFromKakaoName(userName) + "는 참가 중이지 않아요.";

    party["members"].splice(idx, 1);
}

function KickParty(party, number)
{
    if (number > party["members"].length)
        return "Error! 없는 번호에요.";

    party["members"].splice(number - 1, 1);
}

function ClearEndedParty()
{
    var current = new Date();
    for (var i = parties.length - 1; i >= 0; i--)
    {
        var party = parties[i];
        if (current > party["time"])
            parties.splice(i, 1);
    }
}

function FindPartyByName(name)
{
    return parties.find(function(elem) {
        return elem["name"] == name;
    });
}

function ConvertPartyToMsg(party)
{
    var time = party["time"];
    var msg = party["name"] + " - " + ConvertDateToStr(time);
    var members = party["members"];
    for (var i = 0; i < members.length; i++)
    {
        var memberName = members[i];
        msg += "\n" + (i + 1) + ". " + GetNameFromKakaoName(memberName);
    }
    return msg;
}

function ConvertDateToStr(date)
{
    var msg = "";
    msg += date.getHours() + "시 ";
    if (date.getMinutes() > 0)
        msg += date.getMinutes() + "분";

    return msg;
}

function onStartCompile(){
    /*컴파일 또는 Api.reload호출시, 컴파일 되기 이전에 호출되는 함수입니다.
     *제안하는 용도: 리로드시 자동 백업*/
    
}

//아래 4개의 메소드는 액티비티 화면을 수정할때 사용됩니다.
function onCreate(savedInstanceState,activity) {
    var layout=new android.widget.LinearLayout(activity);
    layout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    var txt=new android.widget.TextView(activity);
    txt.setText("액티비티 사용 예시입니다.");
    layout.addView(txt);
    activity.setContentView(layout);
}
function onResume(activity) {}
function onPause(activity) {}
function onStop(activity) {}