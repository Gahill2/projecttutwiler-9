# Testing Guide

## ✅ Pre-Test Checklist

1. All services are running: `docker compose ps` (all should show "Up")
2. Frontend accessible: http://localhost:3000
3. Portal accessible: http://localhost:3000/portal

## 🧪 Test Scenarios

### Test 1: Verified User - CISO

**Steps:**
1. Go to http://localhost:3000/portal
2. When asked about API key, type: **no**
3. When asked for name, type: **Dr. Sarah Chen**
4. When asked for role, type: **Chief Information Security Officer at Genomic Research Labs**
5. When asked for problem, paste:
   ```
   We've detected unusual network traffic patterns from our lab equipment that's connected to our research data servers. The equipment is running outdated firmware and we're concerned about potential vulnerabilities that could expose sensitive genomic research data. We need guidance on how to assess and remediate these risks without disrupting ongoing critical research.
   ```

**Expected Result:**
- ✅ User is verified
- ✅ Redirected to `/dashboard/verified`
- ✅ Dashboard shows "✓ Verified Security Dashboard"
- ✅ Recent CVEs section visible (if CVE data available)

---

### Test 2: Verified User - Security Analyst

**Steps:**
1. Go to http://localhost:3000/portal
2. When asked about API key, type: **no**
3. When asked for name, type: **Michael Rodriguez**
4. When asked for role, type: **Security Analyst at BioPharm Industries**
5. When asked for problem, paste:
   ```
   Our incident response team has identified indicators of compromise on systems that handle clinical trial data. We suspect a potential data breach and need immediate threat intelligence on known attack vectors targeting biotech infrastructure. We've seen suspicious login attempts and unusual data access patterns over the past 48 hours.
   ```

**Expected Result:**
- ✅ User is verified
- ✅ Redirected to `/dashboard/verified`
- ✅ Dashboard displays correctly

---

### Test 3: Verified User - Lab Manager

**Steps:**
1. Go to http://localhost:3000/portal
2. When asked about API key, type: **no**
3. When asked for name, type: **Dr. Jennifer Park**
4. When asked for role, type: **Lab Manager at University Research Facility**
5. When asked for problem, paste:
   ```
   We've received phishing emails targeting our staff that appear to be related to grant funding, but the links look suspicious. Given that we handle sensitive biological research data, we're concerned this could be a targeted attack. We need guidance on how to verify the legitimacy of these communications and protect our research infrastructure.
   ```

**Expected Result:**
- ✅ User is verified
- ✅ Redirected to `/dashboard/verified`

---

### Test 4: Non-Verified User - Generic

**Steps:**
1. Go to http://localhost:3000/portal
2. When asked about API key, type: **no**
3. When asked for name, type: **John Smith**
4. When asked for role, type: **Student**
5. When asked for problem, type: **I think my computer might have a virus. Can you help me?**

**Expected Result:**
- ✅ User is NOT verified
- ✅ Redirected to `/dashboard/non-verified`
- ✅ Dashboard shows "Security Resources Dashboard"
- ✅ Message about request being processed

---

### Test 5: Non-Verified User - Vague Concern

**Steps:**
1. Go to http://localhost:3000/portal
2. When asked about API key, type: **no**
3. When asked for name, type: **Jane Doe**
4. When asked for role, type: **User**
5. When asked for problem, type: **Something is wrong with my system. It's not working properly.**

**Expected Result:**
- ✅ User is NOT verified
- ✅ Redirected to `/dashboard/non-verified`

---

### Test 6: Non-Verified User - Non-Technical

**Steps:**
1. Go to http://localhost:3000/portal
2. When asked about API key, type: **no**
3. When asked for name, type: **Bob Johnson**
4. When asked for role, type: **Employee**
5. When asked for problem, type: **I got an email that says I won a prize. Is this real?**

**Expected Result:**
- ✅ User is NOT verified
- ✅ Redirected to `/dashboard/non-verified`

---

### Test 7: API Key Authentication (If Configured)

**Steps:**
1. Go to http://localhost:3000/portal
2. When asked about API key, type: **yes**
3. Enter a valid API key (if you have `VERIFIED_API_KEYS` set in `.env`)
4. Continue with any name/role/problem

**Expected Result:**
- ✅ Immediate verified access
- ✅ Message: "✓ API Key Authentication: You've been granted verified access"
- ✅ Redirected to `/dashboard/verified`

---

## 🔍 Verification Checklist

After each test, verify:

- [ ] Portal chatbot conversation flows correctly
- [ ] Submission completes without errors
- [ ] Correct dashboard is displayed
- [ ] Dashboard navigation works
- [ ] "New Security Concern" button returns to portal
- [ ] No console errors in browser (F12 → Console)

## 🐛 Troubleshooting

**If verification fails:**
- Check browser console for errors
- Check orchestrator logs: `docker compose logs orchestrator`
- Check AI-RAG logs: `docker compose logs ai-rag`

**If routing doesn't work:**
- Verify frontend is running: `docker compose ps frontend`
- Check browser URL matches expected route
- Clear browser cache and try again

**If AI analysis is slow:**
- Check Ollama is running: `docker compose ps ollama`
- Verify models are pulled: `docker exec -it projecttutwiler-9-ollama-1 ollama list`
- Check AI-RAG logs for timeout errors

## 📊 Expected Behavior Summary

| User Type | Role Credibility | Problem Quality | Expected Status |
|-----------|-----------------|-----------------|-----------------|
| CISO | High | Detailed, Technical | ✅ Verified |
| Security Analyst | High | Detailed, Urgent | ✅ Verified |
| Lab Manager | Medium-High | Detailed, Relevant | ✅ Verified |
| Student | Low | Generic, Vague | ❌ Non-Verified |
| Generic User | Low | Vague | ❌ Non-Verified |
| Employee | Low | Non-Technical | ❌ Non-Verified |

