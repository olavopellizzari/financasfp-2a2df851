# AI Development Rules - Finanças FP

## Tech Stack
- **Framework**: React 18 with Vite as the build tool.
- **Language**: TypeScript for type safety and better developer experience.
- **Styling**: Tailwind CSS for utility-first styling and responsive design.
- **UI Components**: shadcn/ui (built on Radix UI) for accessible, unstyled components.
- **Backend/Database**: Supabase (PostgreSQL + Auth + RLS).
- **Data Fetching**: TanStack Query (React Query) for server state management.
- **Routing**: React Router DOM (v6) for client-side navigation.
- **Icons**: Lucide React for consistent iconography.
- **Forms**: React Hook Form combined with Zod for schema validation.

## Library Usage Rules

### 1. UI & Styling
- **Always** use Tailwind CSS classes for layout and spacing.
- **Always** use shadcn/ui components located in `src/components/ui/`.
- **Never** write custom CSS files unless absolutely necessary (use `index.css` for global variables).
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging.

### 2. State Management & Data
- Use **TanStack Query** for all API interactions with Supabase to handle caching and loading states.
- Use **React Context** only for global application state that rarely changes (e.g., Authentication).
- Keep local component state with `useState` for UI-only logic.

### 3. Database & Backend
- All database interactions must go through the Supabase client in `src/integrations/supabase/client.ts`.
- Leverage PostgreSQL functions and RPCs for complex logic (e.g., `get_monthly_summary`).
- Respect Row Level Security (RLS) by ensuring `household_id` is always used in filters.

### 4. Project Structure
- **Pages**: Place in `src/pages/`. Each page should be a clean entry point.
- **Components**: Place reusable UI logic in `src/components/`.
- **Hooks**: Custom logic and data fetching should be abstracted into `src/hooks/`.
- **Utilities**: Formatting and helper functions go in `src/lib/`.

### 5. Icons & Feedback
- Use **Lucide React** for all icons.
- Use **Sonner** (via `toast`) for user notifications and feedback.
- Use **Skeleton** components for loading states to prevent layout shift.

### 6. Code Style
- Use functional components and hooks.
- Maintain strict TypeScript types; avoid `any`.
- Keep components small and focused (ideally under 100 lines).