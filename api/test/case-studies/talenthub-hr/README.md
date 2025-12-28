# Case Study: TalentHub - HR & Recruiting Platform

This case study demonstrates the RAG-powered chatbot for an HR/Recruiting SaaS platform.

## Overview

- **Product**: TalentHub (fictional HR & recruiting platform)
- **Use Case**: Customer support, sales, and onboarding for HR teams
- **Test Date**: December 27, 2025
- **Project ID**: `695061f9c35590bffe6ee709`

## Knowledge Base Files

| File | Description | Chunks |
|------|-------------|--------|
| `kb-product-overview.txt` | Features, integrations, getting started | 3 |
| `kb-pricing.txt` | Plans, add-ons, billing, discounts | 4 |
| `kb-hiring-guide.txt` | Best practices, metrics, pipelines | 6 |
| `kb-troubleshooting.txt` | Common issues and solutions | 7 |
| `kb-faq.txt` | Frequently asked questions | 8 |
| **Total** | | **28 chunks** |

## Test Results

### Test 1: Product Overview (`customer_support`)
**Query**: "What is TalentHub and what can it do for our HR team?"

**Result**: ✅ Pass
- Listed key features (ATS, AI matching, video interviews)
- Professional formatting with headers
- Offered further assistance

---

### Test 2: Pricing for Sales (`sales_assistant`)
**Query**: "How much does TalentHub cost for a company with 20 recruiters?"

**Result**: ✅ Pass
- Recommended Professional plan ($599/month)
- Explained it supports up to 50 team members
- Offered to connect with sales team

---

### Test 3: AI Features (`technical_support`)
**Query**: "How does the AI candidate matching work? Is it biased?"

**Result**: ✅ Pass
- Followed Identify → Solve → Explain → Alternatives structure
- Explained match score algorithm (0-100%)
- Confirmed bias-free design
- Mentioned settings to disable AI features

---

### Test 4: Pipeline Setup (`onboarding_assistant`)
**Query**: "How should I structure my hiring pipeline?"

**Result**: ✅ Pass
- Recommended 7 standard stages
- Encouraging tone
- Mentioned customization options

---

### Test 5: Calendar Troubleshooting (`technical_support`)
**Query**: "My calendar is not syncing with TalentHub"

**Result**: ✅ Pass
- 5-step resolution guide
- Explained root cause
- Offered alternatives

---

### Test 6: GDPR Compliance (`faq_concise`)
**Query**: "Is TalentHub GDPR compliant?"

**Result**: ✅ Pass
- Response: "Yes, TalentHub is fully GDPR compliant. Candidates can request their data, and you can configure automatic data retention policies."
- Brief and accurate

---

### Test 7: Support Times (`faq_concise`)
**Query**: "What is the support response time for Growth plan?"

**Result**: ✅ Pass
- Response: "The response time for the Growth plan is 8 hours."
- One sentence, direct

## Template Performance

| Template | Questions | Pass Rate | Notes |
|----------|-----------|-----------|-------|
| `customer_support` | 1 | 100% | Balanced overview |
| `sales_assistant` | 1 | 100% | Plan recommendation + sales offer |
| `technical_support` | 2 | 100% | Detailed troubleshooting |
| `onboarding_assistant` | 1 | 100% | Welcoming guidance |
| `faq_concise` | 2 | 100% | Brief, factual answers |

## Usage

### Create Similar Project
```bash
curl -X POST "http://localhost:8000/v1/companies/YOUR_COMPANY_ID/projects" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"name": "TalentHub HR Platform", "slug": "talenthub-hr"}'
```

### Upload Knowledge Base
```bash
for file in api/test/case-studies/talenthub-hr/kb-*.txt; do
  curl -X POST "http://localhost:8000/v1/companies/YOUR_COMPANY_ID/uploads" \
    -H "X-API-Key: YOUR_API_KEY" \
    -F "files=@${file}" \
    -F "projectId=YOUR_PROJECT_ID"
done
```

### Test Chat
```bash
curl -X POST "http://localhost:8000/v1/companies/YOUR_COMPANY_ID/chat" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "query": "How does AI candidate matching work?",
    "promptTemplate": "customer_support",
    "filter": {"projectId": "YOUR_PROJECT_ID"}
  }'
```

## Key Observations

1. **Domain Adaptation**: The chatbot correctly understood HR terminology (ATS, pipeline stages, GDPR)
2. **Context Accuracy**: Answers pulled correct pricing, features, and troubleshooting steps
3. **Template Behavior**: Each template produced appropriate responses for its intended use case
4. **No Hallucination**: All facts came from the knowledge base

## Conclusion

The TalentHub case study demonstrates the chatbot's ability to:
- Handle domain-specific HR/recruiting questions
- Switch between sales, support, and onboarding personas
- Provide accurate, context-based answers
- Scale to different industries and use cases

