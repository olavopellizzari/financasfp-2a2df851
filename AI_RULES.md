# AI Rules & Project Standards

## Tech Stack
- **Framework**: React 18 with Vite and TypeScript.
- **Styling**: Tailwind CSS for all styling, following a dark-themed "Finanças" design system.
- **UI Components**: shadcn/ui (built on Radix UI) for accessible and consistent components.
- **Backend & Auth**: Supabase (PostgreSQL, Auth, Edge Functions, RPC).
- **State Management**: React Context for global state (Auth, Finance) and TanStack Query for server state.
- **Routing**: React Router DOM (v6) with protected routes.
- **Icons**: Lucide React for all UI iconography.
- **Forms**: React Hook Form with Zod for schema validation.
- **Charts**: Recharts for financial data visualization.
- **Date Handling**: date-fns for all date manipulation and formatting (pt-BR locale).

## Library Usage Rules

### UI & Styling
- **shadcn/ui**: Always check `src/components/ui/` before creating a new component. Use these as the base for all UI elements.
- **Tailwind CSS**: Use utility classes for layout and spacing. Avoid custom CSS files unless absolutely necessary.
- **Icons**: Use `lucide-react`. Keep icons consistent (e.g., `Wallet` for accounts, `CreditCard` for cards).

### Data & Backend
- **Supabase**: Use the generated client in `src/integrations/supabase/client.ts`. Prefer RPC calls for complex logic (like family management).
- **Database**: Follow the schema defined in `src/integrations/supabase/types.ts`.
- **Local Storage**: Use the IndexedDB wrapper in `src/lib/db.ts` only for local caching or offline-first features if requested; otherwise, prioritize Supabase.

### Logic & Utilities
- **Dates**: Always use `date-fns`. Use `ptBR` locale for formatting. Handle "Competência" logic (Income vs Expense months) carefully as per `FinanceContext`.
- **Currency**: Use the `formatCurrency` utility from `src/lib/db.ts` for all monetary displays.
- **Toasts**: Use `sonner` (via `toast` hook) for user feedback on actions.

### Architecture
- **Pages**: Place in `src/pages/`.
- **Components**: Place in `src/components/`. Small, reusable components only.
- **Contexts**: Use `src/contexts/` for global providers.
- **Hooks**: Custom logic should reside in `src/hooks/`.