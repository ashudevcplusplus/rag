# Oprag.ai Landing Page Screenshots

This directory contains screenshots of the Oprag.ai landing page design.

## Screenshots Overview

### 1. Hero Section (`01-hero-section.png`)
The main hero section featuring:
- Oprag.ai logo with gradient icon design
- Main headline: "Build AI Chatbots Your Way"
- Feature highlights (Build AI Chatbots, Choose Any LLM, Custom RAG Config)
- CTA buttons with hover animations
- Animated stats counter showing LLM models, embedding providers, uptime, and setup time

### 2. Product Demo (`02-product-demo.png`)
Interactive dashboard preview showing:
- Oprag.ai branded sidebar with chatbots, knowledge, and settings
- Chatbot list with status indicators
- Configuration panel with LLM model, embeddings, chunk size, and overlap settings

### 3. Features Section (`03-features.png`)
Six feature cards with hover animations:
- Multiple LLM Providers
- Flexible Embeddings
- Custom Chunk Config
- Simple File Upload
- Instant Chatbots
- Enterprise Security

### 4. Providers Showcase (`04-providers.png`)
Grid of supported AI providers:
- OpenAI, Anthropic, Google AI, Cohere, Mistral, Voyage AI

### 5. How It Works (`05-how-it-works.png`)
4-step process flow:
1. Upload Knowledge
2. Configure Your Stack
3. Train Your Chatbot
4. Deploy & Share

Includes YAML configuration example with `oprag.yaml` format.

### 6. Testimonials (`06-testimonials.png`)
Customer testimonials featuring:
- 6 testimonial cards with ratings
- Quotes about LLM flexibility, chunking optimization, and quick deployment

### 7. Pricing (`07-pricing.png`)
Three pricing tiers:
- Starter ($29/mo) - For individuals
- Professional ($99/mo) - Most Popular with animated badge
- Enterprise (Custom) - For organizations

Features monthly/yearly toggle with 20% discount indicator.

### 8. Contact (`08-contact.png`)
Contact section with:
- Email and location information
- Contact form with name, email, company, and message fields
- Quick navigation links

### 9. Mobile View (`09-mobile-hero.png`)
Mobile-responsive design showing hero section on iPhone viewport.

## Design Highlights

- **Branding**: Oprag.ai with gradient logo icon
- **Color Palette**: Primary indigo/violet with accent purple
- **Typography**: DM Sans and Sora fonts
- **Animations**: Framer Motion powered micro-interactions
- **Accessibility**: Skip to content link, proper focus states
- **Scroll Progress**: Gradient progress bar at top

## Capturing New Screenshots

```bash
# Start the dev server
npm run dev

# Run the screenshot script
node scripts/capture-screenshots.mjs

# Or with custom port
BASE_URL=http://localhost:3456 node scripts/capture-screenshots.mjs
```
