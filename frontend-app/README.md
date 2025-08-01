# Thunder Portal Frontend

A modern React application built with Vite and shadcn/ui.

## Features

- ⚡ **Vite** - Fast build tool and dev server
- ⚛️ **React 19** - Latest React with TypeScript
- 🎨 **shadcn/ui** - Beautiful and accessible UI components
- 🎯 **Tailwind CSS** - Utility-first CSS framework
- 📱 **Responsive Design** - Mobile-first approach

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   └── ui/          # shadcn/ui components
├── lib/
│   └── utils.ts     # Utility functions
├── App.tsx          # Main application component
└── index.css        # Global styles with Tailwind
```

## Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
pnpm dlx shadcn@latest add [component-name]
```

For example:
```bash
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
```

## Customization

- Edit `tailwind.config.js` to customize Tailwind CSS
- Modify `src/index.css` for global styles
- Update `components.json` for shadcn/ui configuration
