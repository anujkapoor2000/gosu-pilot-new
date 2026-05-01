import { useState, useRef, useEffect } from "react";
/* eslint-disable no-useless-escape */

// ── NTT DATA Design System ─────────────────────────────────────────────────────
var NAVY       = "#003087";   // NTT DATA primary navy
var NAVY_DARK  = "#002060";   // hover / pressed
var NAVY_LIGHT = "#EEF2F9";   // navy tint backgrounds
var NAVY_MID   = "#1B4BA0";   // mid-range navy
var RED        = "#E4002B";   // NTT DATA accent red
var RED_LIGHT  = "#FEF2F4";   // red tint
var WHITE      = "#FFFFFF";
var GRAY_50    = "#F9FAFB";
var GRAY_100   = "#F3F4F6";
var GRAY_200   = "#E5E7EB";
var GRAY_300   = "#D1D5DB";
var GRAY_400   = "#9CA3AF";
var GRAY_500   = "#6B7280";
var GRAY_700   = "#374151";
var GRAY_900   = "#111827";
var SUCCESS    = "#16A34A";

// Syntax highlight palette (used on dark code block backgrounds)
var SYN_GREEN  = "#3FB950";
var SYN_YELLOW = "#E3B341";
var SYN_PURPLE = "#C792EA";
var SYN_ORANGE = "#F0883E";
var SYN_TEAL   = "#00D4AA";
var SYN_CMT    = "#8B949E";
var CODE_BG    = "#0D1117";
var CODE_FG    = "#E6EDF3";

var MONO = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";
var SANS = "'Inter', 'Segoe UI', system-ui, sans-serif";

// ── Gosu system prompt ────────────────────────────────────────────────────────
var SYSTEM_PROMPT = `You are Gosu Copilot, an elite AI coding assistant built by NTT DATA, fine-tuned exclusively on Guidewire InsuranceSuite Gosu code, patterns, and idioms.

EXPERTISE:
- Gosu language syntax (classes, interfaces, enhancements, blocks, generics)
- Guidewire PolicyCenter, ClaimCenter, BillingCenter configuration and extension
- PCF (Page Configuration Framework) screen development
- Gosu rules: validation rules, workflow rules, pre-update rules, assignment rules
- Guidewire data model: entities, typelists, arrays, foreign keys, auto-generated methods
- Integration patterns: SOAP plugins, REST endpoints, messaging plugins, batch processes
- Gosu best practices: null safety, transaction handling, bundle usage, query API
- Cloud migration: deprecated API identification, cloud-safe patterns, upgrade idioms
- Testing: GUnit test frameworks, mock data setup, assertion patterns

RESPONSE RULES:
1. Always respond with valid, idiomatic Gosu code when writing code
2. Use proper Gosu syntax: uses declarations, var keyword, type inference where appropriate
3. Reference actual GW entities (Policy, Claim, PolicyPeriod, Account, etc.)
4. Include null checks using ?. operator and null-safe patterns
5. Use GW query API (Query.make, from, where, select) not raw SQL
6. For PCF, generate well-formed PCF XML with correct widget types
7. Flag deprecated APIs with // DEPRECATED: use X instead comments
8. Keep responses focused and practical — include runnable code examples
9. Format code blocks clearly. Explain the "why" behind GW-specific patterns
10. When asked about cloud migration, proactively flag cloud-unsafe patterns

TONE: Expert peer, concise, no fluff. You speak Gosu natively.`;

// ── Snippet library ───────────────────────────────────────────────────────────
var SNIPPETS = [
  {
    id: "null-safe",
    category: "Patterns",
    title: "Null-safe policy access",
    desc: "Safe navigation through PolicyPeriod to coverage",
    code: `// Null-safe navigation in Gosu
var policy = claim.Policy
var premium = policy?.LatestBoundPeriod?.TotalPremiumRPT
if (premium != null) {
  // safe to use premium
  print("Premium: " + premium.toPlainString())
}`
  },
  {
    id: "query-api",
    category: "Query API",
    title: "GW Query API pattern",
    desc: "Find open claims for a policy using Query.make",
    code: `// Guidewire Query API - preferred over GORM queries
uses gw.api.database.Query

var openClaims = Query.make(Claim)
    .compare("Policy", Equals, policy)
    .compare("State", Equals, typekey.ClaimState.TC_OPEN)
    .select()
    .toList()

openClaims.each(\ c -> {
  print(c.ClaimNumber + " - " + c.LossDate)
})`
  },
  {
    id: "enhancement",
    category: "Enhancement",
    title: "Entity enhancement",
    desc: "Add computed properties to Policy via Gosu enhancement",
    code: `// PolicyEnhancement.gsx
package extensions

enhancement PolicyEnhancement : entity.Policy {

  property get IsHighValueAccount() : boolean {
    return this.Account?.TotalExposureValue > 1000000bd
  }

  property get ActiveEndorsements() : Endorsement[] {
    return this.LatestBoundPeriod
        ?.PolicyLines
        ?.flatMap(\ l -> l.Endorsements)
        ?.where(\ e -> e.Status == TC_ACTIVE)
        ?.toTypedArray()
  }
}`
  },
  {
    id: "validation-rule",
    category: "Rules",
    title: "Validation rule",
    desc: "PolicyPeriod validation with context-aware error",
    code: `// Gosu validation rule - PolicyPeriod
@Validation
function validateCoverageLimit(period : PolicyPeriod) {
  period.Lines.each(\ line -> {
    line.Coverages.each(\ cov -> {
      if (cov.Limit != null and cov.Limit < 0bd) {
        throw new gw.api.util.DisplayableException(
            displaykey.Validation.Coverage.NegativeLimit(cov.DisplayName)
        )
      }
    })
  })
}`
  },
  {
    id: "batch-process",
    category: "Integration",
    title: "Batch process plugin",
    desc: "Scheduled batch for renewal processing",
    code: `// Renewal batch process - implements IBatchProcessPlugin
package extensions.batch

uses gw.plugin.batch.IBatchProcessPlugin
uses gw.transaction.Transaction

class RenewalBatchProcess implements IBatchProcessPlugin {

  override function runBatch() {
    var renewalDue = Query.make(PolicyPeriod)
        .compare("ExpirationDate", LessThan, Date.Today.addDays(60))
        .compare("Status", Equals, TC_BOUND)
        .select()

    renewalDue.each(\ period -> {
      Transaction.runWithNewBundle(\ bundle -> {
        var p = bundle.add(period)
        // trigger renewal workflow
        p.Policy.startRenewal()
      })
    })
  }
}`
  },
  {
    id: "pcf-widget",
    category: "PCF",
    title: "PCF InputSet widget",
    desc: "Reusable PCF InputSet for coverage details",
    code: `<?xml version="1.0"?>
<PCF xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:noNamespaceSchemaLocation="../../pcf.xsd">
  <InputSet id="CoverageInputSet">
    <Require name="coverage" type="Coverage"/>
    <Input id="CoverageLimit"
           label="displaykey.Web.Coverage.Limit"
           value="coverage.Limit"
           editable="true"
           dataType="currencyamount"/>
    <Input id="CoverageDeductible"
           label="displaykey.Web.Coverage.Deductible"
           value="coverage.Deductible"
           editable="perm.Coverage.edit(coverage)"
           dataType="currencyamount"/>
    <InputSetRef def="PolicyLinksInputSet()"/>
  </InputSet>
</PCF>`
  },
  {
    id: "cloud-safe",
    category: "Cloud",
    title: "Cloud-safe migration pattern",
    desc: "Replace deprecated direct DB access with API",
    code: `// BEFORE (on-premise — direct DB, cloud-unsafe):
// var conn = Database.getConnection()  // DEPRECATED in cloud
// var rs = conn.executeQuery("SELECT...")

// AFTER (cloud-safe — use Query API):
uses gw.api.database.Query
uses gw.api.database.Relop

var results = Query.make(entity.Policy)
    .join("Account")
    .compare("Account.AccountNumber", Equals, accountNum)
    .withDistinct(true)
    .select()
    .toList()

// Also replace: gw.transaction.Transaction.runWithNewBundle
// is cloud-safe and preferred over manual bundle management`
  },
  {
    id: "messaging",
    category: "Integration",
    title: "Messaging plugin",
    desc: "Outbound message plugin for claims notification",
    code: `// Outbound messaging plugin
package extensions.messaging

uses gw.plugin.messaging.IMessageTransport
uses gw.plugin.messaging.Message

class ClaimNotificationPlugin implements IMessageTransport {

  override function send(message : Message, transformedPayload : String) {
    var endpoint = gw.api.system.PLConfigParameters
        .getPluginConfig("ClaimNotificationEndpoint")

    var http = new gw.plugin.util.HTTPSender()
    http.URL = endpoint
    http.addHeader("Content-Type", "application/json")
    http.addHeader("X-NTT-Source", "GuidewireCC")
    http.sendPost(transformedPayload)
  }
}`
  }
];

var CATEGORIES = ["All", "Patterns", "Query API", "Enhancement", "Rules", "PCF", "Integration", "Cloud"];

var STARTER_PROMPTS = [
  { icon: "⚡", label: "Write a Gosu validation rule for minimum coverage limit on a HomeownersLine" },
  { icon: "🔍", label: "Show me how to query all open claims for an account using the GW Query API" },
  { icon: "🔄", label: "How do I write a pre-update rule to recalculate premium when a coverage changes?" },
  { icon: "☁️", label: "What Gosu patterns are deprecated in Guidewire Cloud and what should I use instead?" },
  { icon: "🧩", label: "Write a Gosu enhancement that adds computed risk score properties to a PolicyPeriod" },
  { icon: "📋", label: "Generate a PCF InputSet for endorsement details with editable fields" },
];

// ── Syntax highlighting (Gosu-aware) ─────────────────────────────────────────
/* eslint-disable no-useless-escape */
function highlightGosu(code) {
  if (!code) return "";
  var keywords = ["uses","class","interface","enhancement","extends","implements",
    "var","function","property","get","set","return","if","else","while","for",
    "foreach","in","as","new","null","true","false","this","super","override",
    "abstract","static","private","public","protected","internal","readonly",
    "delegate","construct","try","catch","finally","throw","typeof","typeis",
    "where","select","from","and","or","not","void","block","lambda","enum"];
  var types = ["String","Boolean","Integer","Long","Double","BigDecimal","Date",
    "List","Map","Set","Array","Iterable","Policy","Claim","Account","PolicyPeriod",
    "ClaimContact","Coverage","Endorsement","PolicyLine","Exposure","Note","Document",
    "Query","Transaction","typekey","entity","displaykey","gw","TC_"];

  var lines = code.split("\n");
  return lines.map(function(line) {
    var isComment = line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*");
    if (isComment) return '<span style="color:' + SYN_CMT + ';font-style:italic">' + escHtml(line) + '</span>';

    var escaped = escHtml(line);

    escaped = escaped.replace(/(&quot;[^&]*&quot;)/g, '<span style="color:' + SYN_GREEN + '">$1</span>');
    escaped = escaped.replace(/\b(\d+(?:\.\d+)?(?:bd|d|f|l)?)\b/g, '<span style="color:' + SYN_ORANGE + '">$1</span>');

    keywords.forEach(function(kw) {
      var re = new RegExp("\\b(" + kw + ")\\b", "g");
      escaped = escaped.replace(re, '<span style="color:' + SYN_YELLOW + ';font-weight:600">$1</span>');
    });

    types.forEach(function(t) {
      var re = new RegExp("\\b(" + t + ")\\b", "g");
      escaped = escaped.replace(re, '<span style="color:' + SYN_PURPLE + '">$1</span>');
    });

    escaped = escaped.replace(/(@\w+)/g, '<span style="color:' + SYN_TEAL + '">$1</span>');
    escaped = escaped.replace(/(\\[^)]*-&gt;)/g, '<span style="color:' + SYN_TEAL + '">$1</span>');

    return escaped;
  }).join("\n");
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Message renderer ──────────────────────────────────────────────────────────
function renderMessageContent(text) {
  var parts = [];
  var regex = /```(\w*)\n?([\s\S]*?)```/g;
  var lastIndex = 0;
  var match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "gosu", content: match[2].trim() });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }
  return parts;
}

// ── Code block ────────────────────────────────────────────────────────────────
function CodeBlock(props) {
  var [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(props.code).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    });
  }
  var isGosu = !props.lang || props.lang === "gosu" || props.lang === "gs" || props.lang === "";
  var isPcf  = props.lang === "xml" || props.lang === "pcf";
  var highlighted = isGosu || isPcf ? highlightGosu(props.code) : escHtml(props.code);

  return (
    <div style={{ borderRadius:6, overflow:"hidden", border:"1px solid "+GRAY_200, marginTop:12, marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,0.10)" }}>
      <div style={{ background:"#161B22", padding:"8px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #30363D" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:RED, opacity:0.9 }} />
          <span style={{ fontSize:11, color:SYN_CMT, fontFamily:MONO }}>
            {isPcf ? "pcf / xml" : isGosu ? "gosu" : props.lang}
          </span>
        </div>
        <button onClick={copy}
          style={{ background:"transparent", border:"1px solid #30363D", borderRadius:4,
            padding:"3px 10px", cursor:"pointer", fontSize:11,
            color: copied ? SYN_TEAL : SYN_CMT, transition:"color 0.2s", fontFamily:MONO }}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <div style={{ background:CODE_BG, padding:"16px", overflowX:"auto" }}>
        <pre style={{ margin:0, fontFamily:MONO, fontSize:13, lineHeight:1.65, color:CODE_FG }}
          dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble(props) {
  var msg = props.msg;
  var isUser = msg.role === "user";
  var parts = renderMessageContent(msg.content);

  return (
    <div style={{ display:"flex", gap:14, marginBottom:24,
      flexDirection: isUser ? "row-reverse" : "row", alignItems:"flex-start" }}>
      <div style={{ width:36, height:36, borderRadius:8, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: isUser ? GRAY_200 : NAVY,
        color: isUser ? GRAY_700 : WHITE,
        fontSize:11, fontWeight:700, fontFamily:SANS, letterSpacing:0.3 }}>
        {isUser ? "YOU" : "GC"}
      </div>
      <div style={{ maxWidth:"78%", minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:600,
          color: isUser ? GRAY_400 : NAVY,
          marginBottom:6, fontFamily:SANS, letterSpacing:0.5, textTransform:"uppercase",
          textAlign: isUser ? "right" : "left" }}>
          {isUser ? "You" : "Gosu Copilot"}
        </div>
        <div style={{
          background: isUser ? NAVY_LIGHT : WHITE,
          border:"1px solid "+(isUser ? "#C7D5EC" : GRAY_200),
          borderLeft: isUser ? "1px solid #C7D5EC" : "3px solid "+RED,
          borderRadius: isUser ? "8px 0 8px 8px" : "0 8px 8px 8px",
          padding:"14px 18px",
          boxShadow: isUser ? "none" : "0 2px 8px rgba(0,48,135,0.07)" }}>
          {parts.map(function(part, i) {
            if (part.type === "code") {
              return <CodeBlock key={i} code={part.content} lang={part.lang} />;
            }
            return (
              <div key={i} style={{ fontSize:14, color:GRAY_900, lineHeight:1.75,
                whiteSpace:"pre-wrap", fontFamily:SANS }}>
                {part.content}
              </div>
            );
          })}
        </div>
        {msg.tokens && (
          <div style={{ fontSize:10, color:GRAY_400, marginTop:4, fontFamily:MONO,
            textAlign: isUser ? "right" : "left" }}>
            {msg.tokens} tokens
          </div>
        )}
      </div>
    </div>
  );
}

// ── Snippet card ──────────────────────────────────────────────────────────────
function SnippetCard(props) {
  var s = props.snippet;
  var [expanded, setExpanded] = useState(false);
  var catColor = {
    Patterns: NAVY, "Query API": "#0891B2", Enhancement: "#7C3AED",
    Rules: "#D97706", PCF: "#EA580C", Integration: SUCCESS, Cloud: RED
  };
  var catBg = {
    Patterns: NAVY_LIGHT, "Query API": "#E0F2FE", Enhancement: "#EDE9FE",
    Rules: "#FFFBEB", PCF: "#FFF7ED", Integration: "#F0FDF4", Cloud: RED_LIGHT
  };
  return (
    <div style={{ background:WHITE, borderRadius:8, border:"1px solid "+GRAY_200,
      marginBottom:12, overflow:"hidden", cursor:"pointer",
      boxShadow:"0 1px 4px rgba(0,0,0,0.06)", transition:"box-shadow 0.2s" }}
      onMouseEnter={function(e){ e.currentTarget.style.boxShadow="0 4px 16px rgba(0,48,135,0.10)"; }}
      onMouseLeave={function(e){ e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)"; }}
      onClick={function(){ setExpanded(!expanded); }}>
      <div style={{ padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4,
              background: catBg[s.category] || NAVY_LIGHT,
              color: catColor[s.category] || NAVY,
              fontFamily:MONO, textTransform:"uppercase", letterSpacing:0.5 }}>
              {s.category}
            </span>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:GRAY_900, marginBottom:3 }}>{s.title}</div>
          <div style={{ fontSize:12, color:GRAY_500 }}>{s.desc}</div>
        </div>
        <div style={{ color:GRAY_400, fontSize:12, marginTop:2, flexShrink:0, marginLeft:12 }}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop:"1px solid "+GRAY_200 }} onClick={function(e){e.stopPropagation();}}>
          <div style={{ padding:"0 18px" }}>
            <CodeBlock code={s.code} lang="gosu" />
          </div>
          <div style={{ padding:"10px 18px 14px", display:"flex", gap:8, background:GRAY_50, borderTop:"1px solid "+GRAY_200 }}>
            <button onClick={function(){ props.onInsert(s.code); }}
              style={{ padding:"7px 16px", borderRadius:4, border:"none",
                background:NAVY, color:WHITE, fontSize:12, fontWeight:600, cursor:"pointer",
                transition:"background 0.15s" }}
              onMouseEnter={function(e){ e.currentTarget.style.background=NAVY_DARK; }}
              onMouseLeave={function(e){ e.currentTarget.style.background=NAVY; }}>
              Insert into editor
            </button>
            <button onClick={function(){ props.onAsk("Explain this Gosu pattern:\n\n```gosu\n"+s.code+"\n```"); }}
              style={{ padding:"7px 16px", borderRadius:4, border:"1px solid "+GRAY_300,
                background:WHITE, color:GRAY_700, fontSize:12, cursor:"pointer" }}
              onMouseEnter={function(e){ e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
              onMouseLeave={function(e){ e.currentTarget.style.borderColor=GRAY_300; e.currentTarget.style.color=GRAY_700; }}>
              Ask Copilot to explain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  var [messages, setMessages]           = useState([]);
  var [input, setInput]                 = useState("");
  var [loading, setLoading]             = useState(false);
  var [activePanel, setActivePanel]     = useState("chat");
  var [editorCode, setEditorCode]       = useState("// Gosu Copilot — paste or write your Gosu code here\n// Ask the copilot to review, refactor, or extend it\n\npackage extensions\n\nclass MyPolicyExtension {\n\n  function calculateRiskScore(period : PolicyPeriod) : Integer {\n    // TODO: implement risk scoring logic\n    return 0\n  }\n\n}");
  var [snippetFilter, setSnippetFilter] = useState("All");
  var [sidebarOpen, setSidebarOpen]     = useState(true);
  var chatEndRef  = useRef(null);
  var textareaRef = useRef(null);

  useEffect(function() {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    var userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    var userMsg    = { role:"user", content:userText, id:Date.now() };
    var newMessages = messages.concat(userMsg);
    setMessages(newMessages);
    setLoading(true);
    setActivePanel("chat");

    try {
      var apiMessages = newMessages.map(function(m) {
        return { role:m.role, content:m.content };
      });

      var res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: apiMessages
        })
      });

      var data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || "Request failed");
      }

      var replyText = data?.content?.find(function(block) {
        return block.type === "text";
      })?.text || "No response received.";

      var tokens = data.usage
        ? (data.usage.input_tokens + data.usage.output_tokens)
        : null;

      setMessages(newMessages.concat({
        role:"assistant", content:replyText, id:Date.now()+1, tokens:tokens
      }));
    } catch (err) {
      setMessages(newMessages.concat({
        role:"assistant",
        content:"**API Error** — " + err.message + "\n\nCheck that `ANTHROPIC_API_KEY` is set in your Vercel project:\n**Vercel Dashboard → Project → Settings → Environment Variables**\n\nThen redeploy.",
        id:Date.now()+1
      }));
    }
    setLoading(false);
  }

  async function reviewCode() {
    if (!editorCode.trim()) return;
    var prompt = "Please review the following Gosu code. Identify:\n1. Any bugs or anti-patterns\n2. Cloud-unsafe patterns that need updating\n3. Null-safety issues\n4. Performance concerns\n5. Suggested refactoring\n\n```gosu\n" + editorCode + "\n```";
    setActivePanel("chat");
    await sendMessage(prompt);
  }

  async function refactorCode() {
    if (!editorCode.trim()) return;
    var prompt = "Refactor the following Gosu code to follow GW best practices. Make it null-safe, use proper GW Query API, and ensure cloud compatibility:\n\n```gosu\n" + editorCode + "\n```";
    setActivePanel("chat");
    await sendMessage(prompt);
  }

  function handleKey(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { sendMessage(); }
  }

  var filteredSnippets = SNIPPETS.filter(function(s) {
    return snippetFilter === "All" || s.category === snippetFilter;
  });

  var gwModules = [
    { label:"PolicyCenter",  icon:"🏛", color:NAVY },
    { label:"ClaimCenter",   icon:"⚖",  color:"#0891B2" },
    { label:"BillingCenter", icon:"💳", color:SUCCESS },
    { label:"PCF / UI",      icon:"🖥",  color:"#EA580C" },
    { label:"Integration",   icon:"🔗", color:"#7C3AED" },
    { label:"Cloud Migrate", icon:"☁",  color:RED }
  ];

  var quickActions = [
    { label:"Review my code",         icon:"🔍" },
    { label:"Cloud migration check",  icon:"☁" },
    { label:"Generate unit tests",    icon:"🧪" },
    { label:"Fix null pointer risk",  icon:"🛡" },
    { label:"Explain GW entity",      icon:"📖" },
  ];

  var panelTabs = [
    { key:"chat",     label:"Chat",           icon:"💬" },
    { key:"editor",   label:"Code Editor",    icon:"📝" },
    { key:"snippets", label:"Snippet Library",icon:"📚" }
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:GRAY_100, color:GRAY_900, fontFamily:SANS }}>

      {/* ── Top bar ── */}
      <div style={{ height:64, background:NAVY, display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"0 24px", flexShrink:0,
        boxShadow:"0 3px 0 0 "+RED }}>

        {/* Left: hamburger + logo + divider + app name + panel tabs */}
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <button onClick={function(){ setSidebarOpen(!sidebarOpen); }}
            style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.65)",
              cursor:"pointer", fontSize:20, lineHeight:1, padding:4,
              borderRadius:4, transition:"color 0.15s" }}
            onMouseEnter={function(e){ e.currentTarget.style.color=WHITE; }}
            onMouseLeave={function(e){ e.currentTarget.style.color="rgba(255,255,255,0.65)"; }}>
            ☰
          </button>

          <div style={{ width:1, height:28, background:"rgba(255,255,255,0.18)" }} />

          <div>
            <div style={{ fontSize:15, fontWeight:700, color:WHITE, letterSpacing:-0.3 }}>
              Gosu Copilot
            </div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.45)", fontFamily:MONO, letterSpacing:1.5, textTransform:"uppercase" }}>
              Guidewire AI Assistant
            </div>
          </div>

          <div style={{ width:1, height:28, background:"rgba(255,255,255,0.18)" }} />

          <div style={{ display:"flex", gap:2 }}>
            {panelTabs.map(function(tab) {
              var active = activePanel === tab.key;
              return (
                <button key={tab.key} onClick={function(){ setActivePanel(tab.key); }}
                  style={{ padding:"7px 16px", borderRadius:5,
                    border: active ? "none" : "1px solid rgba(255,255,255,0.15)",
                    background: active ? WHITE : "transparent",
                    color: active ? NAVY : "rgba(255,255,255,0.75)",
                    fontSize:12, fontWeight: active ? 700 : 500,
                    cursor:"pointer", fontFamily:SANS, transition:"all 0.15s",
                    display:"flex", alignItems:"center", gap:6 }}
                  onMouseEnter={function(e){
                    if (!active) { e.currentTarget.style.background="rgba(255,255,255,0.12)"; e.currentTarget.style.color=WHITE; }
                  }}
                  onMouseLeave={function(e){
                    if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.75)"; }
                  }}>
                  <span style={{ fontSize:13 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: status + model */}
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:SUCCESS,
              boxShadow:"0 0 6px "+SUCCESS }} />
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.55)", fontFamily:MONO }}>
              claude-sonnet-4 · Gosu-tuned
            </span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <div style={{ width:240, background:WHITE, borderRight:"1px solid "+GRAY_200,
            display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>

            <div style={{ padding:"20px 16px 10px", fontSize:11, fontWeight:700,
              color:NAVY, fontFamily:MONO, letterSpacing:1.5, textTransform:"uppercase" }}>
              GW Modules
            </div>

            {gwModules.map(function(item) {
              return (
                <button key={item.label}
                  onClick={function(){
                    sendMessage("Give me Gosu examples and best practices for Guidewire "+item.label);
                    setActivePanel("chat");
                  }}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
                    background:"transparent", border:"none", borderLeft:"3px solid transparent",
                    cursor:"pointer", textAlign:"left", color:GRAY_700, fontSize:13,
                    width:"100%", fontFamily:SANS, fontWeight:500, transition:"all 0.15s" }}
                  onMouseEnter={function(e){
                    e.currentTarget.style.background=NAVY_LIGHT;
                    e.currentTarget.style.borderLeftColor=item.color;
                    e.currentTarget.style.color=NAVY;
                  }}
                  onMouseLeave={function(e){
                    e.currentTarget.style.background="transparent";
                    e.currentTarget.style.borderLeftColor="transparent";
                    e.currentTarget.style.color=GRAY_700;
                  }}>
                  <span style={{ fontSize:16 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div style={{ margin:"12px 16px", height:1, background:GRAY_200 }} />

            <div style={{ padding:"8px 16px 10px", fontSize:11, fontWeight:700,
              color:GRAY_400, fontFamily:MONO, letterSpacing:1.5, textTransform:"uppercase" }}>
              Quick Actions
            </div>

            {quickActions.map(function(a) {
              return (
                <button key={a.label}
                  onClick={function(){
                    var prompts = {
                      "Review my code": "Review my code in the editor:\n\n```gosu\n"+editorCode+"\n```",
                      "Cloud migration check": "Check the following code for cloud-unsafe patterns and suggest fixes:\n\n```gosu\n"+editorCode+"\n```",
                      "Generate unit tests": "Write GUnit tests for this Gosu code:\n\n```gosu\n"+editorCode+"\n```",
                      "Fix null pointer risk": "Identify and fix any null pointer risks in this Gosu code:\n\n```gosu\n"+editorCode+"\n```",
                      "Explain GW entity": "Explain the key GW entities and their relationships in this code:\n\n```gosu\n"+editorCode+"\n```",
                    };
                    sendMessage(prompts[a.label] || a.label);
                    setActivePanel("chat");
                  }}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 16px",
                    background:"transparent", border:"none", borderLeft:"3px solid transparent",
                    cursor:"pointer", textAlign:"left", color:GRAY_500,
                    fontSize:12, width:"100%", fontFamily:SANS, transition:"all 0.15s" }}
                  onMouseEnter={function(e){
                    e.currentTarget.style.background=GRAY_50;
                    e.currentTarget.style.borderLeftColor=RED;
                    e.currentTarget.style.color=GRAY_700;
                  }}
                  onMouseLeave={function(e){
                    e.currentTarget.style.background="transparent";
                    e.currentTarget.style.borderLeftColor="transparent";
                    e.currentTarget.style.color=GRAY_500;
                  }}>
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              );
            })}

            <div style={{ flex:1 }} />

            <div style={{ padding:"16px", borderTop:"1px solid "+GRAY_200 }}>
              <button onClick={function(){ setMessages([]); }}
                style={{ width:"100%", padding:"9px", borderRadius:4,
                  border:"1px solid "+GRAY_300, background:WHITE, color:GRAY_500,
                  fontSize:12, cursor:"pointer", fontFamily:SANS, transition:"all 0.15s" }}
                onMouseEnter={function(e){ e.currentTarget.style.borderColor=RED; e.currentTarget.style.color=RED; }}
                onMouseLeave={function(e){ e.currentTarget.style.borderColor=GRAY_300; e.currentTarget.style.color=GRAY_500; }}>
                Clear Conversation
              </button>
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* CHAT PANEL */}
          {activePanel === "chat" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:GRAY_50 }}>
              <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>

                {messages.length === 0 && (
                  <div style={{ maxWidth:700, margin:"0 auto", paddingTop:48 }}>
                    <div style={{ textAlign:"center", marginBottom:48 }}>
                      <div style={{ width:72, height:72, borderRadius:16,
                        background:"linear-gradient(135deg, "+NAVY+" 0%, "+NAVY_MID+" 100%)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        margin:"0 auto 20px", boxShadow:"0 8px 24px rgba(0,48,135,0.25)" }}>
                        <span style={{ fontSize:30, color:WHITE }}>⚡</span>
                      </div>
                      <div style={{ fontSize:32, fontWeight:800, color:GRAY_900, marginBottom:12, fontFamily:SANS }}>
                        Gosu <span style={{ color:NAVY }}>Copilot</span>
                      </div>
                      <div style={{ width:48, height:3, background:RED, margin:"0 auto 18px", borderRadius:2 }} />
                      <div style={{ fontSize:15, color:GRAY_500, lineHeight:1.75, maxWidth:460, margin:"0 auto" }}>
                        AI coding assistant fine-tuned on Guidewire Gosu patterns and idioms.
                        Ask anything — rules, entities, PCF, integrations, cloud migration.
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {STARTER_PROMPTS.map(function(p, i) {
                        return (
                          <button key={i} onClick={function(){ sendMessage(p.label); }}
                            style={{ padding:"18px 20px", borderRadius:8,
                              border:"1px solid "+GRAY_200, background:WHITE,
                              cursor:"pointer", textAlign:"left",
                              display:"flex", alignItems:"flex-start", gap:12,
                              boxShadow:"0 1px 3px rgba(0,0,0,0.06)", transition:"all 0.2s" }}
                            onMouseEnter={function(e){
                              e.currentTarget.style.borderColor=NAVY;
                              e.currentTarget.style.boxShadow="0 4px 16px rgba(0,48,135,0.12)";
                            }}
                            onMouseLeave={function(e){
                              e.currentTarget.style.borderColor=GRAY_200;
                              e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.06)";
                            }}>
                            <span style={{ fontSize:20, flexShrink:0 }}>{p.icon}</span>
                            <span style={{ fontSize:13, color:GRAY_700, lineHeight:1.55, fontWeight:500 }}>{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {messages.map(function(msg) {
                  return <MessageBubble key={msg.id} msg={msg} />;
                })}

                {loading && (
                  <div style={{ display:"flex", gap:14, marginBottom:24, alignItems:"flex-start" }}>
                    <div style={{ width:36, height:36, borderRadius:8, flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background:NAVY, color:WHITE, fontSize:11, fontWeight:700, fontFamily:SANS }}>
                      GC
                    </div>
                    <div style={{ background:WHITE, border:"1px solid "+GRAY_200,
                      borderLeft:"3px solid "+RED, borderRadius:"0 8px 8px 8px",
                      padding:"16px 20px", display:"flex", gap:6, alignItems:"center",
                      boxShadow:"0 2px 8px rgba(0,48,135,0.07)" }}>
                      {[0,1,2].map(function(i) {
                        return (
                          <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:NAVY,
                            animation:"ntt-pulse 1.2s ease-in-out infinite",
                            animationDelay: i*0.2+"s", opacity:0.6 }} />
                        );
                      })}
                      <style>{`@keyframes ntt-pulse{0%,80%,100%{transform:scale(0.75);opacity:0.35}40%{transform:scale(1.15);opacity:1}}`}</style>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              <div style={{ padding:"20px 32px", borderTop:"1px solid "+GRAY_200, background:WHITE }}>
                <div style={{ display:"flex", gap:12, alignItems:"flex-end", maxWidth:900, margin:"0 auto" }}>
                  <div style={{ flex:1, position:"relative" }}>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={function(e){ setInput(e.target.value); }}
                      onKeyDown={handleKey}
                      placeholder="Ask Gosu Copilot anything... (Ctrl+Enter to send)"
                      rows={3}
                      style={{ width:"100%", background:WHITE, border:"1.5px solid "+GRAY_300,
                        borderRadius:6, padding:"12px 16px", color:GRAY_900,
                        fontSize:14, fontFamily:SANS, resize:"none", outline:"none",
                        lineHeight:1.6, transition:"border-color 0.2s" }}
                      onFocus={function(e){ e.target.style.borderColor=NAVY; }}
                      onBlur={function(e){ e.target.style.borderColor=GRAY_300; }}
                    />
                  </div>
                  <button onClick={function(){ sendMessage(); }}
                    disabled={!input.trim() || loading}
                    style={{ padding:"12px 24px", borderRadius:6, border:"none",
                      background: input.trim()&&!loading ? NAVY : GRAY_200,
                      color: input.trim()&&!loading ? WHITE : GRAY_400,
                      fontSize:14, fontWeight:600,
                      cursor: input.trim()&&!loading ? "pointer" : "not-allowed",
                      transition:"all 0.2s", height:78, minWidth:100, fontFamily:SANS }}
                    onMouseEnter={function(e){
                      if (input.trim()&&!loading) e.currentTarget.style.background=NAVY_DARK;
                    }}
                    onMouseLeave={function(e){
                      if (input.trim()&&!loading) e.currentTarget.style.background=NAVY;
                    }}>
                    {loading ? "···" : "Send →"}
                  </button>
                </div>
                <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:GRAY_400, fontFamily:MONO }}>
                  Ctrl+Enter to send · Fine-tuned on GW InsuranceSuite Gosu · PC · CC · BC
                </div>
              </div>
            </div>
          )}

          {/* CODE EDITOR PANEL */}
          {activePanel === "editor" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", padding:"24px 32px", background:GRAY_50 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, color:GRAY_900, marginBottom:4 }}>Gosu Code Editor</div>
                  <div style={{ fontSize:13, color:GRAY_500 }}>Paste your Gosu code — ask Copilot to review, refactor, or extend it</div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={reviewCode}
                    style={{ padding:"9px 20px", borderRadius:5, border:"1.5px solid "+GRAY_300,
                      background:WHITE, color:GRAY_700, fontSize:13, fontWeight:600,
                      cursor:"pointer", fontFamily:SANS, transition:"all 0.15s" }}
                    onMouseEnter={function(e){ e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
                    onMouseLeave={function(e){ e.currentTarget.style.borderColor=GRAY_300; e.currentTarget.style.color=GRAY_700; }}>
                    🔍 Review
                  </button>
                  <button onClick={refactorCode}
                    style={{ padding:"9px 20px", borderRadius:5, border:"none",
                      background:NAVY, color:WHITE, fontSize:13, fontWeight:700,
                      cursor:"pointer", fontFamily:SANS, transition:"background 0.15s" }}
                    onMouseEnter={function(e){ e.currentTarget.style.background=NAVY_DARK; }}
                    onMouseLeave={function(e){ e.currentTarget.style.background=NAVY; }}>
                    ⚡ Refactor
                  </button>
                </div>
              </div>

              <div style={{ flex:1, borderRadius:8, border:"1px solid "+GRAY_200, overflow:"hidden",
                display:"flex", flexDirection:"column", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
                <div style={{ background:"#21262D", padding:"8px 16px", display:"flex", gap:6, alignItems:"center",
                  borderBottom:"1px solid #30363D" }}>
                  <div style={{ width:11, height:11, borderRadius:"50%", background:"#FF5F57" }} />
                  <div style={{ width:11, height:11, borderRadius:"50%", background:"#FEBC2E" }} />
                  <div style={{ width:11, height:11, borderRadius:"50%", background:"#28C840" }} />
                  <span style={{ marginLeft:10, fontSize:11, color:SYN_CMT, fontFamily:MONO }}>
                    MyExtension.gs · Gosu
                  </span>
                </div>
                <textarea
                  value={editorCode}
                  onChange={function(e){ setEditorCode(e.target.value); }}
                  style={{ flex:1, background:CODE_BG, border:"none", color:CODE_FG,
                    fontFamily:MONO, fontSize:13, lineHeight:1.7, padding:"16px",
                    resize:"none", outline:"none", tabSize:2 }}
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* SNIPPETS PANEL */}
          {activePanel === "snippets" && (
            <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", padding:"24px 32px", background:GRAY_50 }}>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:18, fontWeight:700, color:GRAY_900, marginBottom:4 }}>Gosu Snippet Library</div>
                <div style={{ fontSize:13, color:GRAY_500, marginBottom:16 }}>
                  Production-ready Gosu patterns for Guidewire InsuranceSuite
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {CATEGORIES.map(function(cat) {
                    var active = snippetFilter === cat;
                    return (
                      <button key={cat} onClick={function(){ setSnippetFilter(cat); }}
                        style={{ padding:"5px 16px", borderRadius:20,
                          border:"1.5px solid "+(active ? NAVY : GRAY_300),
                          background: active ? NAVY : WHITE,
                          color: active ? WHITE : GRAY_500,
                          fontSize:12, fontWeight: active ? 700 : 500,
                          cursor:"pointer", fontFamily:SANS, transition:"all 0.15s" }}
                        onMouseEnter={function(e){
                          if (!active) { e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }
                        }}
                        onMouseLeave={function(e){
                          if (!active) { e.currentTarget.style.borderColor=GRAY_300; e.currentTarget.style.color=GRAY_500; }
                        }}>
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ flex:1, overflowY:"auto" }}>
                {filteredSnippets.map(function(s) {
                  return (
                    <SnippetCard key={s.id} snippet={s}
                      onInsert={function(code){
                        setEditorCode(code);
                        setActivePanel("editor");
                      }}
                      onAsk={function(prompt){
                        sendMessage(prompt);
                        setActivePanel("chat");
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
