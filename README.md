# Inkstream

A developer-focused, extensible WYSIWYG/Rich Text Editor built on top of **ProseMirror** with a modular plugin system, React wrapper, and freemium model support.

---

## 🌟 Project Overview

**Inkstream** is designed to compete with editors like Tiptap and CKEditor by providing:
- A customizable editor core (`editor-core`)
- React integration (`react-editor`)
- A demo playground (`demo`)
- A developer-focused architecture
- Support for monetization of pro features

---

## 🏗️ Tech Stack

| Layer                 | Technology                  |
|-----------------------|-----------------------------|
| Editor Engine         | ProseMirror                 |
| UI Framework          | React (Next.js)             |
| Styling               | Tailwind CSS                |
| Build System          | Turborepo + pnpm            |
| Local Dev Environment | Docker + docker-compose     |
| Deployment (Optional) | Vercel (Frontend-only)      |
| Production Hosting    | Docker-based infrastructure |

---

## 📁 Project Structure

```
Inkstream/
├── apps/
│   ├── demo/               # Next.js app for demo/playground
│   └── docs/               # Documentation site (optional)
├── packages/
│   ├── editor-core/        # ProseMirror schema, plugins, utilities
│   └── react-editor/       # React wrapper with toolbar, formatting, etc.
├── docker/
│   ├── Dockerfile          # Docker container config
│   └── docker-compose.yml  # Multi-service orchestration
├── .gitignore
├── .npmrc
├── turbo.json              # Turborepo config
├── package.json            # Workspace root config
└── README.md               # Project description and setup guide
```

---

## 🛠️ Phased Development Plan

### Phase 1: MVP (Free Core Editor)
- [x] Set up `editor-core` with ProseMirror schema + formatting
- [x] Build `react-editor` with formatting toolbar
- [x] Create Next.js demo with Tailwind
- [ ] Plugin system base

### Phase 2: Plugin Architecture
- [ ] Dynamic loading & enabling of plugins
- [ ] Example plugins: images, tables, markdown

### Phase 3: Monetization System
- [ ] Role-based feature flags
- [ ] Stripe integration
- [ ] License key handling

### Phase 4: Collaboration & AI Features (Paid Tier)
- [ ] Real-time collaboration via WebSocket
- [ ] AI assistant (e.g. content suggestion, grammar check)
- [ ] Export to PDF/Word

### Phase 5: Documentation & SDK
- [ ] API documentation (developer site)
- [ ] Publish to npm

---

## 🐳 Local Development with Docker

To run the editor in a containerized environment:

```bash
docker-compose up --build
```

This spins up:
- React-based demo app using the editor
- Hot reload enabled for development
- Linked core editor packages

Accessible at: `http://localhost:3000`

---

## 📦 Installation (Standalone React Package)

```bash
npm install @inkstream/react-editor
```

```tsx
import {{ RichTextEditor }} from '@inkstream/react-editor';

<RichTextEditor initialContent="<p>Hello world</p>" />
```

---

## 📃 License

MIT License — fully open for commercial and personal use.

---

## ✨ Credits

Built with ❤️ using ProseMirror and inspired by modern editors like Tiptap, CKEditor, and Notion.
