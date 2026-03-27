# LSJM Demo — Example Inputs & Script

## Model thresholds (reference)

| Condition | Action |
|-----------|--------|
| Text score ≥ 67 | Redirect to warning page |
| URL score > 25 | Redirect to warning page |
| Text + URL total > 75 (i.e. ≥ 76) | Redirect to warning page |

Risk levels: **low** (green), **medium** (yellow), **high** / **critical** (red).  
Shieldy states: calm → suspicious → alert → danger.

---

## Example 1: Low risk (safe)

**Use case:** Show that normal content gets a clear pass.

**Text:**
```
The meeting is scheduled for next Tuesday at 3pm. Please bring your notes.
We can discuss the project timeline and assign tasks.
```

**URL:** `https://en.wikipedia.org/wiki/Web_browser`

**Expected:** Text score low, URL score low, overall **LOW**. Shieldy **calm**. No redirect.

---

## Example 2: High text risk (phishing-style)

**Use case:** Show that scam-like text is detected (rule + LLM).

**Text:**
```
URGENT: Your bank account has been suspended. Verify your identity immediately.
Click here to confirm your password and security code: [link]
Act now or your account will be locked. Do not delay.
```

**URL:** (leave empty or use a normal URL like `https://example.com`)

**Expected:** Text score high (likely ≥ 67). Signals: urgency, authority impersonation, credential request, suspicious link. Shieldy **alert** or **danger**. May trigger redirect if text ≥ 67.

---

## Example 3: Suspicious URL

**Use case:** Show that dodgy URL structure is flagged.

**Text:** (leave empty or short normal text)

**URL (pick one):**
- Long URL (score from length):  
  `https://example.com/path/to/very/long/url/that/exceeds/typical/length/and/triggers/suspicion`
- Or IP in URL:  
  `http://192.168.1.100/login`
- Or hyphen in hostname:  
  `https://secure-login-bank.com/signin`

**Expected:** URL score can exceed 25 (e.g. long URL, IP, or hyphen). Shieldy may be **suspicious** or **alert**. Redirect if URL score > 25.

---

## Example 4: Combined risk (total > 75)

**Use case:** Neither text nor URL alone hits the single threshold, but together they do.

**Text:**
```
Please verify your account. Limited time offer. Transfer the fee to confirm.
```

**URL:**  
`https://some-new-site-with-hyphens.com/page`

**Expected:** Text score moderate (e.g. 40–60), URL score moderate (e.g. 20–40). Total ≥ 76 → redirect. Shieldy reflects the worse of the two (e.g. **suspicious** or **alert**).

---

## Demo script (你要说的话)

### 开场 (30 sec)

- “We’re showing **LSJM** — Let Scams Just Miss: a scam detection platform for messages and URLs.”
- “It gives you a **risk score**, **risk level**, and **explanations** so you can decide whether to trust the content.”

### 功能概览 (30 sec)

- “You can paste **text** — for example a message or email — and/or a **URL**. Then click **Analyze together**.”
- “The system uses **rules** and an **LLM** for text, and **URL structure rules** for links. Results show **two scores**: one for content, one for the link, plus **Shieldy** — our risk indicator — and **signals, reasons, and advice**.”

### 演示 1 — 安全内容 (1 min)

- “First, a normal message and a normal URL.”
- [Paste Example 1 text and URL, click Analyze together.]
- “We get **low risk** and Shieldy is **calm**. The system explains there’s nothing suspicious. So for everyday content, we’re in the clear.”

### 演示 2 — 高风险文本 (1 min)

- “Now, a message that looks like a typical phishing email: urgent, bank, verify, password, click here.”
- [Paste Example 2 text, Analyze together.]
- “The **text score** goes high; we see signals like urgency, impersonation, credential request. Shieldy moves to **alert** or **danger**. If the score is above our threshold, the extension can redirect the user to a **warning page**.”

### 演示 3 — 可疑链接 (1 min)

- “For the URL part: long links, IP addresses, or hyphens in the domain often get a higher **URL score**.”
- [Paste Example 3 URL (and optional short text), Analyze together.]
- “Here the **URL score** is high enough to be flagged. We show why — for example ‘long URL’ or ‘hyphen in hostname’ — and suggest not clicking.”

### 演示 4 — 综合风险与跳转 (optional, 1 min)

- “We can also trigger a warning when **text and URL together** cross a total threshold — for example text 40 plus URL 40 gives total 80, which is above 75.”
- [Use Example 4.]
- “So even if neither the text nor the URL alone is extreme, the **combined risk** can still trigger a redirect to our warning page.”

### 结尾 (30 sec)

- “So with LSJM you get **explainable** risk: scores, levels, Shieldy, and clear reasons and advice. That helps users **understand** why something might be risky and what to do — for example go back or use official channels.”
- “We also have a **Chrome extension** that can analyze the current page and redirect when risk is too high. Any questions?”

---

## Quick copy-paste (for demo)

**Low risk text:**
```
The meeting is scheduled for next Tuesday at 3pm. Please bring your notes.
We can discuss the project timeline and assign tasks.
```

**Low risk URL:**  
`https://en.wikipedia.org/wiki/Web_browser`

**High risk text (phishing):**
```
URGENT: Your bank account has been suspended. Verify your identity immediately.
Click here to confirm your password and security code: [link]
Act now or your account will be locked. Do not delay.
```

**Suspicious URL (long):**  
`https://example.com/path/to/very/long/url/that/exceeds/typical/length/and/triggers/suspicion`

**Suspicious URL (hyphen):**  
`https://secure-login-bank.com/signin`

**Combined (moderate text + suspicious URL):**  
Text: `Please verify your account. Limited time offer. Transfer the fee to confirm.`  
URL: `https://some-new-site-with-hyphens.com/page`
