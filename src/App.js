import { useState, useRef, useEffect } from "react";
/* eslint-disable no-useless-escape */

// ── Design tokens – dark IDE theme ───────────────────────────────────────────
var BG0      = "#0D1117";   // deepest background
var BG1      = "#161B22";   // panel background
var BG2      = "#21262D";   // card / input background
var BG3      = "#30363D";   // border / hover
var TEAL     = "#00D4AA";   // primary accent
var BLUE     = "#003087";   // NTT blue
var RED      = "#E4002B";   // NTT red
var YELLOW   = "#E3B341";   // warning / keyword
var PURPLE   = "#C792EA";   // type tokens
var GREEN    = "#3FB950";   // success / strings
var ORANGE   = "#F0883E";   // numbers
var COMMENT  = "#8B949E";   // comments / muted
var FG0      = "#E6EDF3";   // primary text
var FG1      = "#B1BAC4";   // secondary text
var FG2      = "#8B949E";   // muted text
var MONO     = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";
var SANS     = "'Syne', 'Segoe UI', system-ui, sans-serif";

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
    if (isComment) return '<span style="color:' + COMMENT + ';font-style:italic">' + escHtml(line) + '</span>';

    var escaped = escHtml(line);

    // strings
    escaped = escaped.replace(/(&quot;[^&]*&quot;)/g, '<span style="color:' + GREEN + '">$1</span>');

    // numbers
    escaped = escaped.replace(/\b(\d+(?:\.\d+)?(?:bd|d|f|l)?)\b/g, '<span style="color:' + ORANGE + '">$1</span>');

    // keywords
    keywords.forEach(function(kw) {
      var re = new RegExp("\\b(" + kw + ")\\b", "g");
      escaped = escaped.replace(re, '<span style="color:' + YELLOW + ';font-weight:600">$1</span>');
    });

    // types / GW entities
    types.forEach(function(t) {
      var re = new RegExp("\\b(" + t + ")\\b", "g");
      escaped = escaped.replace(re, '<span style="color:' + PURPLE + '">$1</span>');
    });

    // annotations
    escaped = escaped.replace(/(@\w+)/g, '<span style="color:' + TEAL + '">$1</span>');

    // lambdas / closures
    escaped = escaped.replace(/(\\[^)]*-&gt;)/g, '<span style="color:' + TEAL + '">$1</span>');

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
    <div style={{ borderRadius:8, overflow:"hidden", border:"1px solid "+BG3, marginTop:8, marginBottom:8 }}>
      <div style={{ background:BG3, padding:"6px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, color:FG2, fontFamily:MONO }}>
          {isPcf ? "pcf / xml" : isGosu ? "gosu" : props.lang}
        </span>
        <button onClick={copy}
          style={{ background:"transparent", border:"1px solid "+BG3, borderRadius:5,
            padding:"2px 10px", cursor:"pointer", fontSize:11,
            color: copied ? TEAL : FG2, transition:"color 0.2s" }}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <div style={{ background:"#0A0E14", padding:"16px", overflowX:"auto" }}>
        <pre style={{ margin:0, fontFamily:MONO, fontSize:13, lineHeight:1.65, color:FG0 }}
          dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    </div>
  );
}

function MessageBubble(props) {
  var msg = props.msg;
  var isUser = msg.role === "user";
  var parts = renderMessageContent(msg.content);

  return (
    <div style={{ display:"flex", gap:12, marginBottom:20,
      flexDirection: isUser ? "row-reverse" : "row", alignItems:"flex-start" }}>
      <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: isUser ? BG3 : TEAL+"22", border:"1px solid "+(isUser?BG3:TEAL+"50"),
        fontSize:14 }}>
        {isUser ? "👤" : "⚡"}
      </div>
      <div style={{ maxWidth:"78%", minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:700, color:FG2, marginBottom:5, fontFamily:MONO,
          textAlign: isUser ? "right" : "left" }}>
          {isUser ? "YOU" : "GOSU COPILOT"}
        </div>
        <div style={{ background: isUser ? BG2 : BG1,
          border:"1px solid "+(isUser?BG3:BG3),
          borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
          padding:"12px 16px" }}>
          {parts.map(function(part, i) {
            if (part.type === "code") {
              return <CodeBlock key={i} code={part.content} lang={part.lang} />;
            }
            return (
              <div key={i} style={{ fontSize:13, color:FG0, lineHeight:1.7,
                whiteSpace:"pre-wrap", fontFamily: part.content.includes("```") ? MONO : "inherit" }}>
                {part.content}
              </div>
            );
          })}
        </div>
        {msg.tokens && (
          <div style={{ fontSize:10, color:FG2, marginTop:4, fontFamily:MONO,
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
  var catColors = {
    Patterns: TEAL, "Query API": BLUE+"cc", Enhancement: PURPLE,
    Rules: YELLOW, PCF: ORANGE, Integration: GREEN, Cloud: RED
  };
  return (
    <div style={{ background:BG2, borderRadius:10, border:"1px solid "+BG3,
      marginBottom:10, overflow:"hidden", cursor:"pointer" }}
      onClick={function(){ setExpanded(!expanded); }}>
      <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:3,
              background:(catColors[s.category]||TEAL)+"22",
              color:catColors[s.category]||TEAL, fontFamily:MONO }}>{s.category}</span>
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:FG0, marginBottom:2 }}>{s.title}</div>
          <div style={{ fontSize:11, color:FG2 }}>{s.desc}</div>
        </div>
        <div style={{ color:FG2, fontSize:12, marginTop:2, flexShrink:0, marginLeft:8 }}>{expanded?"▲":"▼"}</div>
      </div>
      {expanded && (
        <div style={{ borderTop:"1px solid "+BG3 }} onClick={function(e){e.stopPropagation();}}>
          <CodeBlock code={s.code} lang="gosu" />
          <div style={{ padding:"8px 14px", display:"flex", gap:8 }}>
            <button onClick={function(){ props.onInsert(s.code); }}
              style={{ padding:"5px 14px", borderRadius:6, border:"none",
                background:TEAL+"22", color:TEAL, fontSize:11, fontWeight:700, cursor:"pointer" }}>
              Insert into editor
            </button>
            <button onClick={function(){ props.onAsk("Explain this Gosu pattern:\n\n```gosu\n"+s.code+"\n```"); }}
              style={{ padding:"5px 14px", borderRadius:6, border:"1px solid "+BG3,
                background:"transparent", color:FG2, fontSize:11, cursor:"pointer" }}>
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
  var [messages, setMessages]       = useState([]);
  var [input, setInput]             = useState("");
  var [loading, setLoading]         = useState(false);
  var [activePanel, setActivePanel] = useState("chat");
  var [editorCode, setEditorCode]   = useState("// Gosu Copilot — paste or write your Gosu code here\n// Ask the copilot to review, refactor, or extend it\n\npackage extensions\n\nclass MyPolicyExtension {\n\n  function calculateRiskScore(period : PolicyPeriod) : Integer {\n    // TODO: implement risk scoring logic\n    return 0\n  }\n\n}");
  var [snippetFilter, setSnippetFilter] = useState("All");
  var [sidebarOpen, setSidebarOpen] = useState(true);
  var chatEndRef = useRef(null);
  var textareaRef = useRef(null);

  useEffect(function() {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    var userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    var userMsg = { role:"user", content:userText, id:Date.now() };
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
  throw new Error(
    data?.error?.message ||
    data?.error ||
    "Request failed"
  );
}

var replyText =
  data?.content?.find(function(block) {
    return block.type === "text";
  })?.text || "No response received.";

var tokens = data.usage
  ? (data.usage.input_tokens + data.usage.output_tokens)
  : null;

setMessages(newMessages.concat({
  role: "assistant",
  content: replyText,
  id: Date.now() + 1,
  tokens: tokens
}));

      var data = await res.json();
      var replyText = (data.content && data.content[0] && data.content[0].text) || "No response received.";
      var tokens = data.usage ? (data.usage.input_tokens + data.usage.output_tokens) : null;

      setMessages(newMessages.concat({
        role:"assistant", content:replyText, id:Date.now()+1,
        tokens:tokens
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
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      sendMessage();
    }
  }

  var filteredSnippets = SNIPPETS.filter(function(s) {
    return snippetFilter === "All" || s.category === snippetFilter;
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:BG0, color:FG0, fontFamily:SANS }}>

      {/* ── Top bar ── */}
      <div style={{ height:52, background:BG1, borderBottom:"1px solid "+BG3,
        display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={function(){setSidebarOpen(!sidebarOpen);}}
            style={{ background:"transparent", border:"none", color:FG2, cursor:"pointer", fontSize:18, lineHeight:1 }}>
            ☰
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:TEAL,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⚡</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:FG0, fontFamily:SANS, letterSpacing:-0.3 }}>
                Gosu <span style={{ color:TEAL }}>Copilot</span>
              </div>
              <div style={{ fontSize:9, color:FG2, fontFamily:MONO, letterSpacing:1 }}>NTT DATA · GUIDEWIRE AI</div>
            </div>
          </div>
          <div style={{ width:1, height:24, background:BG3 }} />
          <div style={{ display:"flex", gap:4 }}>
            {["chat","editor","snippets"].map(function(p) {
              var labels = { chat:"Chat", editor:"Code Editor", snippets:"Snippet Library" };
              var icons  = { chat:"💬", editor:"📝", snippets:"📚" };
              var active = activePanel === p;
              return (
                <button key={p} onClick={function(){setActivePanel(p);}}
                  style={{ padding:"4px 12px", borderRadius:6,
                    border:"1px solid "+(active?TEAL:BG3),
                    background:active?TEAL+"18":BG2,
                    color:active?TEAL:FG2, fontSize:11, fontWeight:active?700:400,
                    cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                  <span>{icons[p]}</span>{labels[p]}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:TEAL,
            boxShadow:"0 0 6px "+TEAL }} />
          <span style={{ fontSize:11, color:FG2, fontFamily:MONO }}>claude-sonnet-4 · Gosu-tuned</span>
          <div style={{ display:"flex", alignItems:"center", gap:3 }}>
            <span style={{ fontFamily:"Arial Black, Arial", fontWeight:900, fontSize:12, color:"#003087" }}>NTT</span>
            <span style={{ fontFamily:"Arial, sans-serif", fontWeight:700, fontSize:10, color:"#003087", letterSpacing:1 }}>DATA</span>
            <div style={{ width:16, height:2, background:RED, borderRadius:1 }} />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <div style={{ width:220, background:BG1, borderRight:"1px solid "+BG3, display:"flex",
            flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
            <div style={{ padding:"14px 14px 8px", fontSize:10, fontWeight:700,
              color:FG2, fontFamily:MONO, letterSpacing:1 }}>GW MODULES</div>
            {[
              { label:"PolicyCenter", icon:"🏛", color:BLUE },
              { label:"ClaimCenter",  icon:"⚖", color:TEAL },
              { label:"BillingCenter",icon:"💳", color:GREEN },
              { label:"PCF / UI",     icon:"🖥", color:ORANGE },
              { label:"Integration",  icon:"🔗", color:PURPLE },
              { label:"Cloud Migrate",icon:"☁", color:YELLOW }
            ].map(function(item) {
              return (
                <button key={item.label}
                  onClick={function(){
                    sendMessage("Give me Gosu examples and best practices for Guidewire "+item.label);
                    setActivePanel("chat");
                  }}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px",
                    background:"transparent", border:"none", cursor:"pointer",
                    textAlign:"left", color:FG1, fontSize:12, width:"100%",
                    borderLeft:"2px solid transparent",
                    transition:"all 0.15s" }}
                  onMouseEnter={function(e){ e.target.style.background=BG2; e.target.style.borderLeftColor=item.color; }}
                  onMouseLeave={function(e){ e.target.style.background="transparent"; e.target.style.borderLeftColor="transparent"; }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div style={{ margin:"12px 14px 8px", borderTop:"1px solid "+BG3 }} />
            <div style={{ padding:"8px 14px", fontSize:10, fontWeight:700, color:FG2, fontFamily:MONO, letterSpacing:1 }}>QUICK ACTIONS</div>
            {[
              { label:"Review my code", icon:"🔍" },
              { label:"Cloud migration check", icon:"☁" },
              { label:"Generate unit tests", icon:"🧪" },
              { label:"Fix null pointer risk", icon:"🛡" },
              { label:"Explain GW entity", icon:"📖" },
            ].map(function(a) {
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
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 14px",
                    background:"transparent", border:"none", cursor:"pointer",
                    textAlign:"left", color:FG2, fontSize:11, width:"100%" }}
                  onMouseEnter={function(e){ e.currentTarget.style.background=BG2; e.currentTarget.style.color=FG0; }}
                  onMouseLeave={function(e){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=FG2; }}>
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              );
            })}

            <div style={{ flex:1 }} />
            <div style={{ padding:"12px 14px", borderTop:"1px solid "+BG3 }}>
              <button onClick={function(){ setMessages([]); }}
                style={{ width:"100%", padding:"7px", borderRadius:6, border:"1px solid "+BG3,
                  background:"transparent", color:FG2, fontSize:11, cursor:"pointer" }}>
                Clear chat
              </button>
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* CHAT PANEL */}
          {activePanel==="chat" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
                {messages.length === 0 && (
                  <div style={{ maxWidth:700, margin:"0 auto", paddingTop:40 }}>
                    <div style={{ textAlign:"center", marginBottom:40 }}>
                      <div style={{ fontSize:48, marginBottom:12 }}>⚡</div>
                      <div style={{ fontSize:28, fontWeight:800, fontFamily:SANS, color:FG0, marginBottom:8 }}>
                        Gosu <span style={{ color:TEAL }}>Copilot</span>
                      </div>
                      <div style={{ fontSize:14, color:FG2, lineHeight:1.6 }}>
                        AI coding assistant fine-tuned on Guidewire Gosu patterns and idioms.<br/>
                        Ask anything — rules, entities, PCF, integrations, cloud migration.
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      {STARTER_PROMPTS.map(function(p, i) {
                        return (
                          <button key={i} onClick={function(){ sendMessage(p.label); }}
                            style={{ padding:"14px 16px", borderRadius:10, border:"1px solid "+BG3,
                              background:BG2, cursor:"pointer", textAlign:"left",
                              display:"flex", alignItems:"flex-start", gap:10, transition:"border-color 0.2s" }}
                            onMouseEnter={function(e){ e.currentTarget.style.borderColor=TEAL; }}
                            onMouseLeave={function(e){ e.currentTarget.style.borderColor=BG3; }}>
                            <span style={{ fontSize:18, flexShrink:0 }}>{p.icon}</span>
                            <span style={{ fontSize:12, color:FG1, lineHeight:1.5 }}>{p.label}</span>
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
                  <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"flex-start" }}>
                    <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background:TEAL+"22", border:"1px solid "+TEAL+"50", fontSize:14 }}>⚡</div>
                    <div style={{ background:BG1, border:"1px solid "+BG3, borderRadius:"4px 12px 12px 12px",
                      padding:"14px 18px", display:"flex", gap:6, alignItems:"center" }}>
                      {[0,1,2].map(function(i) {
                        return (
                          <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:TEAL,
                            animation:"pulse 1.2s ease-in-out infinite",
                            animationDelay: i*0.2+"s", opacity:0.7 }} />
                        );
                      })}
                      <style>{`@keyframes pulse{0%,80%,100%{transform:scale(0.8);opacity:0.4}40%{transform:scale(1.2);opacity:1}}`}</style>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              <div style={{ padding:"16px 28px", borderTop:"1px solid "+BG3, background:BG1 }}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-end", maxWidth:900, margin:"0 auto" }}>
                  <div style={{ flex:1, position:"relative" }}>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={function(e){ setInput(e.target.value); }}
                      onKeyDown={handleKey}
                      placeholder="Ask Gosu Copilot anything... (Ctrl+Enter to send)"
                      rows={3}
                      style={{ width:"100%", background:BG2, border:"1px solid "+BG3,
                        borderRadius:10, padding:"12px 16px", color:FG0,
                        fontSize:13, fontFamily:SANS, resize:"none", outline:"none",
                        lineHeight:1.5, transition:"border-color 0.2s" }}
                      onFocus={function(e){ e.target.style.borderColor=TEAL; }}
                      onBlur={function(e){ e.target.style.borderColor=BG3; }}
                    />
                  </div>
                  <button onClick={function(){ sendMessage(); }}
                    disabled={!input.trim() || loading}
                    style={{ padding:"12px 22px", borderRadius:10, border:"none",
                      background: input.trim()&&!loading ? TEAL : BG3,
                      color: input.trim()&&!loading ? BG0 : FG2,
                      fontSize:13, fontWeight:700, cursor: input.trim()&&!loading ? "pointer" : "not-allowed",
                      transition:"all 0.2s", height:72, fontFamily:SANS }}>
                    {loading ? "..." : "Send ⚡"}
                  </button>
                </div>
                <div style={{ textAlign:"center", marginTop:8, fontSize:10, color:FG2, fontFamily:MONO }}>
                  Ctrl+Enter to send · Fine-tuned on GW InsuranceSuite Gosu · Context-aware for PC · CC · BC
                </div>
              </div>
            </div>
          )}

          {/* CODE EDITOR PANEL */}
          {activePanel==="editor" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", padding:"20px 28px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:FG0, marginBottom:3 }}>Gosu Code Editor</div>
                  <div style={{ fontSize:12, color:FG2 }}>Paste your Gosu code — ask Copilot to review, refactor, or extend it</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={reviewCode}
                    style={{ padding:"8px 18px", borderRadius:8, border:"1px solid "+BG3,
                      background:BG2, color:FG1, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    🔍 Review
                  </button>
                  <button onClick={refactorCode}
                    style={{ padding:"8px 18px", borderRadius:8, border:"none",
                      background:TEAL, color:BG0, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    ⚡ Refactor
                  </button>
                </div>
              </div>
              <div style={{ flex:1, borderRadius:10, border:"1px solid "+BG3, overflow:"hidden", display:"flex", flexDirection:"column" }}>
                <div style={{ background:BG3, padding:"7px 16px", display:"flex", gap:6, alignItems:"center" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#FF5F57" }} />
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#FEBC2E" }} />
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#28C840" }} />
                  <span style={{ marginLeft:10, fontSize:11, color:FG2, fontFamily:MONO }}>MyExtension.gs · Gosu</span>
                </div>
                <textarea
                  value={editorCode}
                  onChange={function(e){ setEditorCode(e.target.value); }}
                  style={{ flex:1, background:"#0A0E14", border:"none", color:FG0,
                    fontFamily:MONO, fontSize:13, lineHeight:1.7, padding:"16px",
                    resize:"none", outline:"none", tabSize:2 }}
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* SNIPPETS PANEL */}
          {activePanel==="snippets" && (
            <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", padding:"20px 28px" }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:800, color:FG0, marginBottom:3 }}>Gosu Snippet Library</div>
                <div style={{ fontSize:12, color:FG2, marginBottom:14 }}>Production-ready Gosu patterns for Guidewire InsuranceSuite</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {CATEGORIES.map(function(cat) {
                    var active = snippetFilter === cat;
                    return (
                      <button key={cat} onClick={function(){ setSnippetFilter(cat); }}
                        style={{ padding:"4px 14px", borderRadius:20,
                          border:"1px solid "+(active?TEAL:BG3),
                          background:active?TEAL+"18":BG2,
                          color:active?TEAL:FG2, fontSize:11,
                          fontWeight:active?700:400, cursor:"pointer", fontFamily:MONO }}>
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
