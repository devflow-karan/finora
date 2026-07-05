# Coding Standards & Conventions

## NestJS Backend Standards

1. **Architecture & Modularization**:
   - Organize by features/modules (e.g., `auth`, `transactions`, `budgets`, `loans`, `investments`, `insurance`, `goals`, `insights`).
   - Every module should contain its own module definition, controller, service, and DTOs.
2. **DTO & Validation**:
   - Use `class-validator` and `class-transformer` for all incoming payloads.
   - Every request DTO must have explicit validation decorators.
   - Enable `validationPipe` globally with `{ whitelist: true, transform: true }`.
3. **Database & Prisma**:
   - Do not query the database directly in controllers; always route through services.
   - Use Prisma client injection. Keep schema clean, normalized, and document relationships clearly.
4. **Error Handling**:
   - Return semantic HTTP exceptions (e.g., `NotFoundException`, `BadRequestException`, `UnauthorizedException`).
   - Avoid revealing raw database error messages to clients.
5. **Security**:
   - Use JWT for authentication. Include an Access Token (short duration) and a Refresh Token (longer duration, stored/hashed or validated securely).
   - Use standard Bcrypt for password hashing.
   - Keep environment secrets in `.env`.

## Frontend Standards

1. **Components**:
   - Keep components modular, small, and descriptive.
   - Use TypeScript interface/types for all component props.
2. **Styling**:
   - Use Tailwind CSS. Apply custom colors and smooth styling matching modern dark/light mode standards.
   - Use ShadCN UI components (built on Radix UI and Tailwind).
3. **State Management & Data Fetching**:
   - Use React Hooks (e.g., `useState`, `useEffect`, `useContext`) and standard fetch wrapper.
4. **Data Visualization**:
   - Use Recharts for all dashboard and module diagrams.

## Git Commit Rules

- Use conventional commits format:
  - `feat: ...` for new features
  - `fix: ...` for bug fixes
  - `docs: ...` for documentation changes
  - `refactor: ...` for code refactoring
  - `chore: ...` for dependency updates, project setups, etc.
- Keep commits focused and atomic.
