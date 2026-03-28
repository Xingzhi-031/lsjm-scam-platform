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
