# Case Study: CloudSync Pro - Customer Support Chatbot

This case study demonstrates the RAG-powered chatbot using the `customer_support` prompt template with a fictional SaaS product knowledge base.

## Overview

- **Product**: CloudSync Pro (fictional cloud storage platform)
- **Use Case**: Customer support chatbot for website visitors
- **Prompt Template**: `customer_support`
- **LLM Model**: gpt-4o-mini
- **Test Date**: December 27, 2025

## Knowledge Base Files

| File | Description | Chunks |
|------|-------------|--------|
| `kb-product-overview.txt` | Product features and getting started guide | 2 |
| `kb-pricing.txt` | Pricing plans, billing, refunds, discounts | 3 |
| `kb-troubleshooting.txt` | Common issues and solutions | 5 |
| `kb-security.txt` | Security measures and compliance | 5 |
| `kb-faq.txt` | Frequently asked questions | 8 |
| **Total** | | **23 chunks** |

## Test Results

### Question 1: Product Overview
**Query**: "What is CloudSync Pro and what are its main features?"

**Response**: ✅ Accurate, well-structured with markdown formatting
- Listed all 4 key feature categories
- Included specific details (50 simultaneous users, AES-256, etc.)
- Professional tone

### Question 2: Pricing
**Query**: "How much does CloudSync Pro cost? What are the pricing plans?"

**Response**: ✅ Complete and accurate
- All 4 plans listed with correct pricing
- Storage limits and features included
- Mentioned 14-day trial and annual discount

### Question 3: Troubleshooting
**Query**: "My files are not syncing. What should I do?"

**Response**: ✅ Helpful step-by-step solution
- 5 troubleshooting steps provided
- Practical and actionable advice
- Offered further assistance

### Question 4: Security
**Query**: "Is my data secure? What encryption do you use?"

**Response**: ✅ Detailed security information
- Mentioned AES-256 and TLS 1.3
- Explained zero-knowledge option for Enterprise
- Reassuring and professional

### Question 5: Refund Policy
**Query**: "Can I get a refund if I am not satisfied?"

**Response**: ✅ Concise and accurate
- 30-day guarantee mentioned
- 14 business days processing time
- Contact email provided

### Question 6: Support Contact
**Query**: "How do I contact support? What are the response times?"

**Response**: ✅ Complete support information
- Email and live chat options
- Response times by plan tier
- Offered further help

### Question 7: Integration
**Query**: "Does CloudSync Pro integrate with Slack? How do I set it up?"

**Response**: ✅ Step-by-step setup guide
- 5 clear steps provided
- Mentioned notification options
- Friendly and helpful

### Question 8: Mobile App
**Query**: "Is there a mobile app? How can I backup my photos automatically?"

**Response**: ✅ Clear instructions
- Confirmed iOS and Android availability
- 4-step photo backup guide
- WiFi-only option mentioned

### Question 9: Compliance
**Query**: "We are a healthcare company. Is CloudSync Pro HIPAA compliant?"

**Response**: ✅ Appropriate for enterprise inquiry
- Confirmed HIPAA compliance
- Mentioned security documentation
- Invited follow-up questions

### Question 10: Out of Scope (Edge Case)
**Query**: "Can you help me book a flight to New York?"

**Response**: ✅ **Correctly handled off-topic request**
- Politely declined
- Explained scope limitation
- Redirected to relevant topics
- Suggested travel resources

## Key Observations

### Strengths
1. **Accuracy**: All responses based strictly on knowledge base content
2. **Formatting**: Proper use of markdown (headers, lists, bold)
3. **Tone**: Professional yet friendly, matching customer support expectations
4. **Completeness**: Comprehensive answers with actionable details
5. **Edge Cases**: Out-of-scope questions handled gracefully

### Prompt Template Effectiveness
The `customer_support` template demonstrated:
- ✅ Knowledge-based responses only (no hallucination)
- ✅ Transparency about limitations
- ✅ Professional and friendly tone
- ✅ Proper source attribution
- ✅ Multilingual support capability
- ✅ Appropriate escalation awareness

## How to Reproduce

### 1. Start Services
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Create Project
```bash
curl -X POST "http://localhost:8000/v1/companies/507f1f77bcf86cd799439011/projects" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-123" \
  -d '{"name": "CloudSync Pro KB", "slug": "cloudsync-kb"}'
```

### 3. Upload Files
```bash
for file in api/test/case-studies/cloudsync-pro/kb-*.txt; do
  curl -X POST "http://localhost:8000/v1/companies/507f1f77bcf86cd799439011/uploads" \
    -H "X-API-Key: dev-key-123" \
    -F "files=@${file}" \
    -F "projectId=YOUR_PROJECT_ID"
done
```

### 4. Test Chat
```bash
curl -X POST "http://localhost:8000/v1/companies/507f1f77bcf86cd799439011/chat" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-123" \
  -d '{
    "query": "What are your pricing plans?",
    "promptTemplate": "customer_support",
    "filter": {"projectId": "YOUR_PROJECT_ID"},
    "limit": 5
  }'
```

## Available Prompt Templates

| Template | Best For |
|----------|----------|
| `customer_support` | General customer service (this case study) |
| `sales_assistant` | Lead generation and sales inquiries |
| `technical_support` | Technical documentation and troubleshooting |
| `onboarding_assistant` | New user onboarding |
| `faq_concise` | Brief FAQ-style responses |
| `ecommerce_assistant` | E-commerce product inquiries |

## Conclusion

The `customer_support` prompt template successfully handled all test scenarios, demonstrating its effectiveness for general customer service chatbot deployments. The RAG architecture ensured accurate, context-based responses while the prompt template guided the tone and behavior appropriately.

