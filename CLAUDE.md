# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **宠爱时光** (Pet Memory Workbench) — a React-based interactive story editor for creating and sharing pet memories. The app allows users to create branching interactive stories with media (images/videos), export them as self-contained HTML files, or share them directly.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Core Data Model (`src/types.ts`)

- **StoryDocument**: The main story entity with scenes, metadata, and template info
- **StoryScene**: Individual scenes with text, media, choices, and layout modes
- **StoryChoice**: Branching options that connect scenes (max 2 per scene)
- **StoryMedia**: Either image or video with embedded/external src
- **StoryMode**: `"template"` (linear wizard) or `"graph"` (advanced graph editing)

### Key Libraries

**`src/lib/story.ts`**: Story templates and factory functions
- `getTemplates()`: Returns 5 predefined Chinese templates (morning, afternoon, welcome home, walk/window, goodnight)
- `createStoryFromTemplate()`: Initializes a story from a template
- `createBlankStory()`: Creates an empty story
- `normalizeStory()`: Validates and repairs story data (removes invalid choices, ensures start scene exists)

**`src/lib/player.ts`**: Story traversal logic
- `getVisibleSceneIds()`: Computes which scenes are visible based on user decisions
- `getLastBranchScene()`: Finds the most recent branching point for "retry" functionality
- Stories progress linearly until a choice is encountered, then follow that choice's `nextSceneId`

**`src/lib/idb.ts`**: IndexedDB wrapper for local persistence
- All stories are stored locally in the browser (DB name: "pet-memory-workbench")
- CRUD operations: `listStories()`, `getStory()`, `saveStory()`, `deleteStory()`

**`src/lib/export.ts`**: Export functionality
- `exportStoryAsJson()`: Exports story data as JSON
- `exportStoryAsHtml()`: Creates a self-contained HTML file with embedded player logic
- Exported HTML files are fully standalone with all styles and player logic included

### Application Structure (`src/App.tsx`)

**Hash-based routing** for a single-page app:
- `/` — Home/workbench (story editor)
- `/preview?id=<storyId>` — Preview mode
- `/share/<storyId>` — Share mode (cleaner UI)

**StoryEditor Component**:
- 5-step wizard: template → story info → scenes → branches → preview
- Uses `WizardTabs` for step navigation
- Draft changes are auto-saved to IndexedDB on every modification
- Scenes can be reordered, added, or removed with automatic repairs to choices

**StoryPlayer Component**:
- Renders stories with interactive choices
- Maintains `decisions` state (map of sceneId → choiceId)
- Shows "retry branch" button to revisit the last branching point

### Component Organization

**UI Components** (`src/components/ui/`):
- Reusable components: `Button`, `PanelCard`, `MediaFrame`, `Dialog`, `WizardTabs`, `SelectField`, etc.
- Uses Radix UI primitives for accessibility

**Workbench Components** (`src/components/workbench/`):
- `AppShell`: Main layout with sidebar
- `SidebarPanel`: Sidebar sections
- `TemplatePicker`: Template selection grid
- `RecentStoriesList`: Story list with import/export
- `StoryInfoStep`: Step 2 — metadata and cover
- `ScenesStep`: Step 3 — scene management (add/edit/reorder)
- `BranchesStep`: Step 4 — choice configuration with optional graph view
- `PreviewStep`: Step 5 — export options
- `StoryPlayer`: Interactive story viewer
- `GraphView`: Advanced graph-based story editor (when `mode: "graph"`)

### Important Patterns

1. **Auto-save**: All story edits immediately persist to IndexedDB via `saveStory()`
2. **Normalization**: `normalizeStory()` is called after every import/creation to ensure data integrity
3. **Scene Repairs**: When removing scenes, choices pointing to that scene are automatically cleaned up
4. **Choice Limits**: Each scene can have max 2 choices (enforced in normalizeStory)
5. **Layout Modes**: Scenes with choices get `layout: "choice-gate"`, otherwise `"moment"`

### Chinese Localization

All user-facing text is in Chinese. The UI uses a gentle, emotional tone appropriate for memory-keeping (e.g., "温柔回看", "慢慢开始的一天").

### Styling

- Uses CSS custom properties for theming (warm, pet-friendly color palette)
- Responsive design with mobile-first approach
- Backdrop blur and soft shadows for card-like components
- Accent colors: gold, rose, orange, teal, violet (matching template moods)
