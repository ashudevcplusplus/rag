# Case Study: ShopEase - E-commerce Platform

This case study demonstrates the RAG-powered chatbot for an e-commerce platform.

## Overview

- **Product**: ShopEase (fictional e-commerce platform)
- **Use Case**: Merchant support, shipping help, sales inquiries
- **Test Date**: December 27, 2025
- **Project ID**: `6950645532dd341b25d9b879`

## Knowledge Base Files

| File | Description | Chunks |
|------|-------------|--------|
| `kb-product-overview.txt` | Features, integrations, platform capabilities | 3 |
| `kb-pricing.txt` | Plans, transaction fees, add-ons | 4 |
| `kb-shipping.txt` | Shipping setup, carriers, fulfillment | 6 |
| `kb-faq.txt` | Frequently asked questions | 6 |
| **Total** | | **19 chunks** |

## Test Results

### Test 1: Product Inquiry (`ecommerce_assistant`)
**Query**: "What can I sell on ShopEase? Does it support digital products?"

**Result**: ✅ Pass
- Confirmed physical and digital products supported
- Listed specific digital product types
- Offered further assistance

---

### Test 2: Shipping Setup (`customer_support`)
**Query**: "How do I set up free shipping for orders over $50?"

**Result**: ✅ Pass
- Step-by-step instructions
- Mentioned price-based shipping option
- Included business benefit (encourages higher cart value)

---

### Test 3: Transaction Fees (`faq_concise`)
**Query**: "What are the transaction fees for Professional plan?"

**Result**: ✅ Pass
- Response: "1.0% plus payment processor fee of 2.6% plus $0.30"
- Brief and accurate

## Key Use Cases

1. **Merchant Onboarding**: Setting up stores, products, payments
2. **Shipping Help**: Carrier setup, rates, labels, returns
3. **Pricing Questions**: Plans, fees, discounts
4. **Technical Support**: Integration issues, troubleshooting

## Recommended Templates by Page

| Page | Template |
|------|----------|
| Pricing page | `sales_assistant` |
| Shipping help | `technical_support` |
| General support | `customer_support` |
| FAQ widget | `faq_concise` |
| Product catalog | `ecommerce_assistant` |

