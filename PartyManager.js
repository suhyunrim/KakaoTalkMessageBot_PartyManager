importPackage(org.json);

const scriptName="PartyManager.js";

// KakaoNameSplitCharacters의 문자로 split 함.
// ex1. ZeroBoom/28/성남 -> ZeroBoom으로 파싱
// ex2. ZeroBoom 28 성남 -> ZeroBoom으로 파싱
const KakaoNameSplitCharacters = ['/', ' '];

// GameTypes에 있는 것들만 파티 생성 가능. 숫자는 전체 인원.
const GameTypes = [["일반", 5], ["칼바람", 5], ["자랭", 5], ["내전", 10], ["스크림", 5]];

// 매일 AlarmTime에 들어있는 값의 정시에 알람. (파티가 있을 경우)
const AlarmTime = [16, 19];

var isInitialized = false;
var rooms = [];

// js JSON에서 serialize 후 deserialize 과정에서 date는 string으로 취급되어 제대로 파싱되지 않아서 넣은 코드.
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

// Class를 범용성 있게 사용하기 위한 함수.
function ApplyAndNew(constructor, args)
{
    function partial () {
        return constructor.apply(this, args);
    };
    if (typeof constructor.prototype === "object") {
        partial.prototype = Object.create(constructor.prototype);
    }
    return partial;
}

// Room Class
function Room()
{
    this.parties = [];
    this.noticedDay = 0;
}

Room.prototype.FindPartyByName = function(name)
{
    return this.parties.find(function(elem) {
        return elem["name"] == name;
    });
}

Room.prototype.AddParty = function(party)
{
    this.parties.push(party);
}

Room.prototype.GetPartyListMsg = function()
{
    var msg = "";
    if (this.parties.length > 0)
    {
        for (var i = 0; i < this.parties.length; i++)
            msg += ConvertPartyToMsg(this.parties[i]) + "\n\n";
    }
    else
    {
        msg = "만들어진 파티가 없어요 ㅠ_ㅠ";
    }

    return msg;
}

Room.prototype.ClearEndedParty = function()
{
    var current = new Date();
    for (var i = this.parties.length - 1; i >= 0; i--)
    {
        var party = this.parties[i];
        if (current > party["time"])
            this.parties.splice(i, 1);
    }
}

Room.prototype.RegisterNotice = function(replier)
{
    if (this.parties.length == 0)
        return;

    var date = new Date();
    if (this.noticedDay == date.getDate())
        return;

    this.noticedDay = date.getDate();

    var targetDate = new Date();
    targetDate.setMinutes(0);
    AlarmTime.forEach(elem => {
        targetDate.setHours(elem);
        this.NoticePartyList(targetDate, replier);
    });
}

Room.prototype.NoticePartyList = function(targetDate, replier)
{
    var now = new Date();
    var diffTime = targetDate - now;
    if (diffTime < 0)
        return;

    Sleep(diffTime);

    this.ClearEndedParty();

    if (this.parties.length == 0)
        return;

    var noticeMsg = "☆★ 오늘의 파티 ★☆\n";
    noticeMsg += this.GetPartyListMsg();
    replier.reply(noticeMsg);
}

// CommandBase Class
function CommandBase()
{
    this.isSucceed = false;
    this.targetRoom = "";
}

CommandBase.prototype.isRequireSender = true;
CommandBase.prototype.Execute = function()
{
    throw new Error("Execute is abstract method.");
}
CommandBase.prototype.SetTargetRoom = function(targetRoom)
{
    this.targetRoom = targetRoom;
}

// HelpCommand Class
function HelpCommand()
{
    CommandBase.call(this);
    this.isSucceed = true;
}

HelpCommand.prototype = Object.create(CommandBase.prototype);
HelpCommand.prototype.constructor = HelpCommand;
HelpCommand.prototype.Execute = function()
{
    var msg = "시간 양식 : 0000 ~ 2359\n";
    msg += "사용 가능 명령어\n";

    for (var key in CommandList)
        msg += key + "\n";

    return msg;
}

//CreateParty Class
function CreatePartyCommand(partyName, customTime)
{
    CommandBase.call(this);

    this.partyName = partyName;
    this.customTime = customTime;
}

CreatePartyCommand.prototype = Object.create(CommandBase.prototype);
CreatePartyCommand.prototype.constructor = CreatePartyCommand;
CreatePartyCommand.prototype.Execute = function()
{
    var partyName = this.partyName;

    var msg = "";
    if (!IsValidGameType(partyName))
    {
        msg = "파티는 ";
        GameTypes.forEach(elem => {
            msg += elem[0];
            msg += ", ";
        });
        msg.substring(0, msg.length - 2);
        msg += "만 생성 할 수 있어요!";
        return msg;
    }

    var cur = new Date();
    var isValidTime = CheckCustomTimeFormat(this.customTime);
    if (!isValidTime)
        return "시간 양식을 확인해주세요.";

    var time = ConvertCustomTimeToDate(this.customTime);
    if (cur > time)
        return "미래 시간을 입력해주세요.";

    var party = this.targetRoom.FindPartyByName(partyName);
    if (party)
        return "[" + partyName + "]는 이미 존재하는 파티에요!";

    party = {name:partyName, members:[], time:time};

    this.targetRoom.AddParty(party);
    this.isSucceed = true;

    return ConvertDateToStr(party["time"]) + "에 [" + partyName +"]가 생성되었어요~";
}

// JoinPartyCommand Class
function JoinPartyCommand(partyName)
{
    CommandBase.call(this);

    this.partyName = partyName;
}

JoinPartyCommand.prototype = Object.create(CommandBase.prototype);
JoinPartyCommand.prototype.constructor = JoinPartyCommand;
JoinPartyCommand.prototype.isRequireSender = true;
JoinPartyCommand.prototype.Execute = function()
{
    var partyName = this.partyName;
    if (!partyName)
        return "파티 이름을 입력해주세요!";

    var party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return "[" + partyName + "]는 존재하지 않아요!";

    for (var i = 0; i < GameTypes.length; i++)
    {
        var typeName = GameTypes[i][0];
        var typeLimitation = GameTypes[i][1];
        if (partyName.includes(typeName) && party["members"].length >= typeLimitation)
            return "인원이 꽉 찼어요!";
    }
    
    if (party["members"].indexOf(this.sender) >= 0)
        return "이미 참가 중이에요!";

    party["members"].push(this.sender);

    this.isSucceed = true;
    return ConvertPartyToMsg(party) + "\n\n" + GetNameFromKakaoName(this.sender) + "님이 [" + partyName + "]에 참가하였습니다!";
}

// PartyListCommand Class
function PartyListCommand()
{
    CommandBase.call(this);
    this.isSucceed = true;
}

PartyListCommand.prototype = Object.create(CommandBase.prototype);
PartyListCommand.prototype.constructor = PartyListCommand;
PartyListCommand.prototype.Execute = function()
{
    return this.targetRoom.GetPartyListMsg();
}

// WithdrawPartyCommand Class
function WithdrawPartyCommand(partyName)
{
    CommandBase.call(this);

    this.partyName = partyName;
}

WithdrawPartyCommand.prototype = Object.create(CommandBase.prototype);
WithdrawPartyCommand.prototype.constructor = WithdrawPartyCommand;
WithdrawPartyCommand.prototype.isRequireSender = true;
WithdrawPartyCommand.prototype.Execute = function()
{
    var partyName = this.partyName;
    var party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return "[" + partyName + "]는 존재하지 않아요!";

    var idx = party["members"].indexOf(this.sender);
    if (idx < 0)
        return "[" + party["name"] + "]에 " + GetNameFromKakaoName(this.sender) + "는 참가 중이지 않아요.";

    party["members"].splice(idx, 1);

    this.isSucceed = true;
    return GetNameFromKakaoName(this.sender) + "님이 [" + partyName + "]를 떠나셨어요.";
}

// ModifyPartyTimeCommand Class
function ModifyPartyTimeCommand(partyName, customTime)
{
    CommandBase.call(this);

    this.partyName = partyName;
    this.customTime = customTime;
}

ModifyPartyTimeCommand.prototype = Object.create(CommandBase.prototype);
ModifyPartyTimeCommand.prototype.constructor = ModifyPartyTimeCommand;
ModifyPartyTimeCommand.prototype.Execute = function()
{
    var partyName = this.partyName;
    var party = this.targetRoom.FindPartyByName(partyName);
    var isValidTime = CheckCustomTimeFormat(this.customTime);
    if (!isValidTime)
        return "시간 양식을 확인해주세요.";

    var cur = new Date();
    var time = ConvertCustomTimeToDate(this.customTime);
    if (cur > time)
        return "미래 시간을 입력해주세요.";

    party["time"] = time;

    this.isSucceed = true;
    return "[" + partyName + "] 파티 시간이 변경되었습니다.";
}

// KickMemberCommand Class
function KickMemberCommand(partyName, purgeeNumber)
{
    CommandBase.call(this);

    this.partyName = partyName;
    this.purgeeNumber = purgeeNumber;
}

KickMemberCommand.prototype = Object.create(CommandBase.prototype);
KickMemberCommand.prototype.constructor = KickMemberCommand;
KickMemberCommand.prototype.Execute = function()
{
    var partyName = this.partyName;
    var purgeeNumber = this.purgeeNumber;
    if (!purgeeNumber.match(/[0-9]/))
        return "강퇴할 번호를 입력해주세요.";

    var party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return "[" + partyName + "]는 존재하지 않아요!";

    if (purgeeNumber > party["members"].length)
        return "없는 번호에요.";

    var purgeeName = "";
    if (purgeeNumber <= party["members"].length)
        purgeeName = party["members"][purgeeNumber - 1];

    party["members"].splice(purgeeNumber - 1, 1);

    this.isSucceed = true;
    return purgeeName + "님이 [" + partyName + "]에서 강퇴되셨어요.";
}

var CommandList =
{
    "/사용법" : HelpCommand,
    "/파티리스트" : PartyListCommand,
    "/파티생성 파티이름 시간(0000~2399)" : CreatePartyCommand,
    "/파티참가 파티이름" : JoinPartyCommand,
    "/파티탈퇴 파티이름" : WithdrawPartyCommand,
    "/파티시간변경 파티이름 시간(0000~2399)" : ModifyPartyTimeCommand,
    "/파티강퇴 파티이름 파티원번호" : KickMemberCommand,
}

function response(roomName, msg, sender, isGroupChat, replier, ImageDB, packageName, threadId){
    if (isInitialized == false)
        Initialize();

    let responseMsg = "";
    let commandUsage = '';
    try
    {
        var split = msg.split(' ');
        var room = FindRoom(roomName);
        if (!room)
        {
            room = new Room();
            rooms[roomName] = room;
        }

        if (split[0].startsWith('/') == false)
        {
            room.RegisterNotice(replier);
            return;
        }

        room.ClearEndedParty();

        var commandStr = split[0];
        split.splice(0, 1);

        let commandClass;
        for (var key in CommandList)
        {
            var command = CommandList[key];
            if (key.includes(commandStr))
            {
                commandUsage = key;

                var constructorWithArguments = ApplyAndNew(command, split);
                commandClass = new constructorWithArguments();
                commandClass.SetTargetRoom(room);
                if (commandClass.isRequireSender)
                    commandClass.sender = sender;
                break;
            }
        }

        if (!commandClass)
            return;

        var commandMsg = commandClass.Execute();
        if (!commandClass.isSucceed)
        {
            responseMsg += "Error! ";
            responseMsg += commandMsg;
            responseMsg += "\n사용법: ";
            responseMsg += commandUsage;
        }
        else
        {
            responseMsg += commandMsg;
        }

        if (responseMsg.length > 0)
            replier.reply(responseMsg);

        DataBase.setDataBase("rooms", JSON.stringify(rooms));
    }
    catch (error)
    {
        if (commandUsage !== '')
        {
            responseMsg = "잘못된 사용입니다!\n사용법: " + commandUsage;
            responseMsg += "\nUnknown Error - " + error;
        }
        else
        {
            responseMsg = "Unknown Error - " + error;
        }
        replier.reply(responseMsg);
    }
}

function Initialize()
{
    var roomsRaw = DataBase.getDataBase("rooms");
    if (roomsRaw && roomsRaw != "")
    {
        rooms = JSON.parse(roomsRaw, JSON.dateParser);
    }

    isInitialized = true;
}

function GetNameFromKakaoName(kakaoName)
{
    for (var i = 0; i < KakaoNameSplitCharacters.length; i++)
    {
        var splitChar = KakaoNameSplitCharacters[i];
        var split = kakaoName.split(splitChar);
        if (split.length > 1)
            return split[0];
    }

    return kakaoName;
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

function FindRoom(roomName)
{
    return this.rooms[roomName];
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

function Sleep(time)
{
    java.lang.Thread.sleep(time);
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