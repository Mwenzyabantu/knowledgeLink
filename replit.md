# Overview

Learnlink is an AI-powered educational platform that helps students connect academic concepts to real-world problems and applications. The platform uses a question-driven learning approach (What, How, Why, Where, Who, When) to break down concepts and generate practical implementations through simulations, code, and projects.

Core features include:
- **Knowledge Input System**: Students enter what they learned, and AI generates a comprehensive 5W+H breakdown
- **AI Companion Chat**: Contextual chat for clarifying concepts and exploring applications
- **Implementation Generation**: AI creates simulation code, pseudocode, and projects in domain-appropriate tools (MATLAB, Python, etc.)
- **Smart Prerequisite Learning**: Tracks prerequisites mastered from completed projects; AI filters out known skills for future projects
- **Learning Analytics**: Tracks patterns, suggests opportunity projects, and identifies knowledge gaps
- **Trends Section**: Displays AI-generated and internet-sourced content showing latest developments in learned topics
- **Data Management**: Users can selectively delete chat history, projects, concepts, or all data from Settings

# Recent Updates (Latest Session)

## Smart Prerequisite Learning System
- **Implementation Completion Dialog**: When users click "Mark as Completed," they select which prerequisites they've mastered
- **Database Persistence**: Mastered prerequisites saved to `userMasteredPrerequisites` table per implementation
- **Groq-Powered Filtering**: `filterOutMasteredPrerequisites()` compares new prerequisites against learned skills, removing redundant suggestions
- **Storage Layer**: Added methods to save/retrieve mastered prerequisites by implementation

## Data Deletion & Privacy Controls (Settings Page)
Four risk-tiered deletion options with confirmation dialogs:
1. **Clear Chat History** (Low Risk) - Deletes conversations, keeps concepts/projects
2. **Clear All Projects** (Medium Risk) - Removes implementations, keeps concepts
3. **Delete Concepts & Projects** (Medium-High Risk) - Removes concepts and implementations
4. **Delete All Data & Reset** (High Risk) - Nuclear option requiring "DELETE ALL DATA" confirmation text

Backend endpoints: `/api/data/clear-chat-history`, `/api/data/clear-all-projects`, `/api/data/delete-concepts-projects`, `/api/data/delete-all`

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**Routing**: Wouter for client-side navigation with the following main routes:
- Dashboard (`/`) - Main learning hub
- AI Companion (`/ai-companion`) - Dedicated chat interface
- Knowledge Base (`/knowledge`) - Browse all learned concepts
- Insights (`/insights`) - Learning pattern analysis & opportunity projects
- History (`/history`) - Timeline of learning journey
- Trends (`/trends`, `/trends/:id`) - Educational content discovery
- Settings (`/settings`) - User preferences and data management

**UI Component System**: shadcn/ui (Radix UI primitives) with custom styling via Tailwind CSS
- Design follows ultra-minimalist principles with generous whitespace
- Avoids over-use of cards/containers for open, natural content flow
- Typography: Inter (UI/body), JetBrains Mono (code/technical content)
- Spacing system: Tailwind units of 2, 4, 6, 8 for consistent rhythm
- Fixed left sidebar (240px) with flex-based main content area
- Professional syntax highlighting for code blocks (Atom One Dark theme)

**State Management**: 
- TanStack Query (React Query) for server state and caching
- Local component state with React hooks for UI interactions
- No global state management library (Redux/Zustand) - relies on React Query's cache

**Key UI Patterns**:
- **Inline AI Prompts**: 3-second debounced prompts appear in greyed italic text
- **Collapsible Chat Interface**: Chat expands inline after 5W+H breakdown, collapses with chevron
- **Rotating Headlines**: Trends section uses 5-second rotating headlines with CSS transitions
- **Typing Animations**: Streaming AI responses character-by-character
- **Project Completion Dialog**: Users select mastered prerequisites when marking projects complete
- **Data Deletion Dialogs**: Progressive disclosure with clear warnings for each deletion type

**Project Status Workflow**:
- When user navigates to `/implementation/:id`, status auto-sets to "in progress"
- User completes instructions and clicks "Mark as Completed Project"
- Dialog appears to select mastered prerequisites
- Prerequisites saved to database for future AI filtering
- Project status updates to "completed"

## Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful JSON API with the following endpoint groups:
- `/api/concepts` - CRUD operations for learned concepts
- `/api/implementations` - Project implementations with status tracking
- `/api/chat-sessions` - Manage chat conversations
- `/api/chat-sessions/:id/messages` - Chat message history
- `/api/ai/*` - AI service endpoints (5W+H generation, inline prompts, chat responses, tags, template selection)
- `/api/data/*` - Data deletion endpoints (clear-chat-history, clear-all-projects, delete-concepts-projects, delete-all)

**Development vs Production**:
- Development: Vite dev server with HMR, middleware mode for Express
- Production: Static build served from Express with esbuild-bundled server

**Error Handling**: Centralized error responses with HTTP status codes, JSON error messages

**Authentication**: Supabase Auth issues and validates user sessions. The Express API forwards the signed-in user's access token to Supabase for row-level security.

## Data Storage

**Database**: Supabase PostgreSQL. Server-side data access uses the Supabase client and user-scoped RLS policies.

**Shared Types**: Drizzle schema definitions and drizzle-zod provide shared TypeScript and validation types; they are not used to connect to a separate database.

**Schema Design**:

1. **Concepts Table** - Core knowledge entries
   - 5W+H breakdown (what, why, how, where, who, when)
   - JSONB arrays for `where` (applications), `tags`
   - Optional `pseudocode` field for technical concepts
   - Boolean `isFavorite` flag
   - Timestamps for tracking

2. **Implementations Table** - Project implementations
   - Status: "preview", "in progress", "completed"
   - Project details: name, type, tool, language, problem addressed
   - Instructions, code, pseudocode, flow diagram
   - Foreign key to concepts (related learning)
   - Timestamps and access tracking

3. **Chat Sessions Table** - Conversation containers
   - Type: "concept_clarification" or "project_support"
   - Foreign keys to conceptId or projectId
   - JSONB tags array (user-editable)
   - `isCollapsed` boolean for UI state
   - `lastMessageAt` timestamp for sorting

4. **Chat Messages Table** - Individual messages
   - Links to sessionId
   - Role: "user" or "assistant"
   - Content text field
   - Timestamps for ordering

5. **User Mastered Prerequisites Table** - Smart learning profile
   - implementationId reference
   - prerequisite name (text)
   - Tracks skills learned from completed projects

6. **User Settings Table** - User preferences
   - Opportunity project generation triggers (concept count, frequency)
   - Notification and learning preferences

**Migrations**: Supabase SQL migrations live in `supabase/migrations`; Edge Functions and their JWT settings live in `supabase/`.

## AI Integration

**AI execution**: The Express API invokes authenticated Supabase Edge Functions. Gemini provider credentials are stored in Supabase Secrets; provider calls do not run from the Replit server.

**AI Service Functions**:

1. **5W+H Generation** (`generate5WH`)
   - Analyzes user input to extract concept details
   - Returns structured JSON with title, category, problem statement, and 5W+H fields
   - Includes optional pseudocode for technical concepts

2. **Inline Prompt Generation** (`generateInlinePrompt`)
   - Context-aware follow-up questions for clarity
   - Tracks dismissed prompts to avoid repetition
   - Triggered after 3-second typing pause

3. **Chat Response Generation** (`generateChatResponse`)
   - Conversational AI for concept clarification
   - Context includes concept details and chat history
   - Streaming responses with typing animation

4. **Implementation Preview** (`generateImplementationPreview`)
   - Generates project previews with real-world context
   - Personalizes based on learner profile and completed work
   - Returns problem addressed, why suggested, industry context

5. **Template Selection** (`selectBestProjectTemplate`)
   - Uses a Supabase Edge Function to semantically match new projects to completed implementations
   - Finds best structural template based on type, tool, language matching
   - Reduces generation time through template reuse

6. **Prerequisite Filtering** (`filterOutMasteredPrerequisites`)
   - Supabase Edge Function compares new vs. mastered prerequisites
   - Removes redundant or covered concepts
   - Ensures smart prerequisite learning prevents repetition

7. **Tag Generation** (`generateTags`)
   - Auto-generates relevant tags for chat sessions
   - Based on conversation content and related concepts

8. **Opportunity Project Generation** (`generateOpportunityProjects`)
   - Creates real-world project suggestions based on learned concepts
   - Considers user's knowledge gaps and learning patterns
   - Triggered by concept count or time-based frequency settings

**Implementation Generation**: Supabase Edge Functions generate the preview and code using credentials held by Supabase. Resource fetching remains a separate server feature.

**Real-Time Status Streaming**: SSE (Server-Sent Events) for live generation progress updates with full-page overlay

## External Dependencies

**Third-Party Services**:
- **Supabase Auth, PostgreSQL, and Edge Functions** - Authentication, persisted data, and AI request handling
- **Gemini API** - Model provider called from Supabase Edge Functions using Supabase Secrets

**Key NPM Packages**:
- **UI Framework**: React 18 with TypeScript
- **Build Tool**: Vite with React plugin
- **Backend**: Express.js, tsx for development execution
- **Database**: Supabase JS client, Drizzle schema types, drizzle-zod
- **AI**: Supabase Edge Functions
- **UI Components**: Radix UI primitives (@radix-ui/*), shadcn/ui patterns
- **Styling**: Tailwind CSS with PostCSS
- **Data Fetching**: @tanstack/react-query
- **Form Validation**: zod, @hookform/resolvers
- **Date Handling**: date-fns
- **Routing**: wouter
- **Code Highlighting**: react-syntax-highlighter
- **Utilities**: clsx, class-variance-authority, nanoid

**Browser APIs Used**:
- **Web Speech API** - Voice input transcription
- Custom `SpeechRecognizer` wrapper class for continuous voice recognition

**Development Tools**:
- **Replit Integrations**: Vite plugins for dev banner, runtime error overlay, cartographer
- **Type Checking**: TypeScript with strict mode enabled
- **Code Quality**: ESM module system, path aliases for clean imports
