# NexusAI Landing Page

A stunning, modern landing page built with React, TypeScript, Tailwind CSS, and Framer Motion.

## ✨ Features

- **Modern Design** - Glassmorphism, gradients, and smooth animations
- **Responsive** - Looks great on all devices
- **Performant** - Optimized bundle splitting and lazy loading
- **Accessible** - Semantic HTML and keyboard navigation
- **Type-Safe** - Full TypeScript support

## 🛠️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Installation

```bash
# From the workspace root
pnpm install
```

### Development

```bash
cd apps/landing-page
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## 🎨 Sections

1. **Hero** - Eye-catching hero section with animated elements and stats
2. **Features** - Six feature cards with hover effects and gradients
3. **How It Works** - Step-by-step workflow visualization
4. **Testimonials** - Customer testimonials in a grid layout
5. **Pricing** - Three-tier pricing with popular plan highlight
6. **CTA** - Animated call-to-action section
7. **Footer** - Comprehensive footer with newsletter signup

## 🎯 Design Highlights

- **Floating Orbs** - Animated background orbs with blur effects
- **Glassmorphism** - Frosted glass card effects
- **Gradient Text** - Animated gradient text effects
- **Scroll Animations** - Smooth reveal animations on scroll
- **Interactive Elements** - Hover effects and micro-interactions
- **Dark Theme** - Modern dark theme with accent colors

## 📁 Project Structure

```
landing-page/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Navbar.tsx
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Pricing.tsx
│   │   ├── CTA.tsx
│   │   └── Footer.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🚀 Performance

The landing page is optimized for performance:

- **Code Splitting** - React and Framer Motion are in separate chunks
- **Tree Shaking** - Only used Tailwind classes are included
- **Lazy Loading** - Components animate on scroll (not all at once)
- **Optimized Images** - SVG favicon, no raster images

## 🎨 Customization

### Colors

Edit `tailwind.config.js` to change the color scheme:

```js
colors: {
  primary: { /* your primary colors */ },
  accent: { /* your accent colors */ },
}
```

### Content

Update the content in each section file under `src/sections/`.

### Animations

Customize animations in `tailwind.config.js` or use Framer Motion directly in components.

## 📄 License

MIT
