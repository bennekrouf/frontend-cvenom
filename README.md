# MyApp

A modern, responsive web application built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🌍 **i18n Support**: English and French localization
- 🌙 **Dark Mode**: Built-in theme switching
- 📱 **Responsive**: Mobile-first design
- ⚡ **Performance**: Next.js 15 with App Router
- 🎨 **Design System**: Complete CSS variables and Tailwind config
- 🔒 **Type Safe**: Full TypeScript support
- 📦 **Production Ready**: ESLint, error handling, SEO optimized

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui design system
- **Internationalization**: next-intl
- **Theme**: next-themes with CSS variables
- **Animations**: Framer Motion
- **Forms**: React Hook Form
- **Icons**: React Icons (Feather)
- **Linting**: ESLint with Next.js config

## Getting Started

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Type check
yarn type-check

# Lint code
yarn lint
```

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── [locale]/        # Internationalized routes
│   │   ├── api/             # API routes
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   │   ├── layout/          # Layout components
│   │   └── ui/              # UI components
│   ├── lib/                 # Utility functions
│   └── types/               # TypeScript types
├── messages/                # i18n translations
├── config/                  # Configuration files
├── public/                  # Static assets
└── content/                 # Content files (if using)
```

## Configuration

### Environment Variables

Copy `.env.template` to `.env.local` and fill in your values:

```bash
cp .env.template .env.local
```

### Site Configuration

Edit `config/site.yaml` for your app-specific settings.

### Internationalization

- Edit `messages/en.json` and `messages/fr.json` for translations
- Add new locales in `i18n.ts`

### Styling

- Primary brand color: Edit CSS variable `--primary` in `globals.css`
- Dark/light mode: Automatically handled by `next-themes`
- Design system: Full Tailwind config with CSS variables

### Navigation

- Edit `navItems` array in `src/components/layout/Navbar.tsx`
- Add footer links in `src/components/layout/Footer.tsx`

## Customization

1. **Brand Colors**: Update `--primary` in `src/app/globals.css`
2. **Logo**: Replace "MyApp" in navbar and footer
3. **Navigation**: Add your menu items to the navbar
4. **Content**: Build your pages in `src/app/[locale]/`
5. **API**: Add your endpoints in `src/app/api/`

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

### Traditional Hosting

```bash
yarn build
# Upload the .next folder and package.json
# Run: yarn start
```

## Development Notes

This scaffold follows your preferences:
- ✅ Modern responsive design
- ✅ Dark mode support  
- ✅ Empty menu structure (ready for your content)
- ✅ YAML configuration files
- ✅ Trace logging support
- ✅ Complete TypeScript setup
- ✅ Production-ready build process

## Next Steps

1. Customize the brand colors and logo
2. Add your navigation menu items
3. Build out your pages and components  
4. Set up your API endpoints
5. Configure environment variables
6. Deploy to your preferred platform

Built with ❤️ following modern best practices.
