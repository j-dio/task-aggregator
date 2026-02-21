---
applyTo: "**/*.{ts,tsx,js,jsx}"
---

# Code Patterns

## API Response Format

Use a consistent response shape across all API endpoints:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
```

## Repository Pattern

Abstract data access behind a consistent interface:

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: CreateDto): Promise<T>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
}
```

## Custom Hooks Pattern

Encapsulate reusable stateful logic in custom hooks:

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

## React Component Patterns

### Container/Presenter

Separate data logic from presentation:

```tsx
// Container: handles data fetching
function UserListContainer() {
  const { data, isLoading } = useUsers();
  if (isLoading) return <Skeleton />;
  return <UserList users={data} />;
}

// Presenter: pure rendering
function UserList({ users }: { users: User[] }) {
  return users.map((user) => <UserCard key={user.id} user={user} />);
}
```

### Composition over Props

Build complex UI from simple, composable components instead of mega-components with many props.

## Backend Patterns

### Service Layer

Separate business logic from route handlers:

```typescript
// route handler — thin, delegates to service
app.post("/users", async (req, res) => {
  const validated = UserSchema.parse(req.body);
  const user = await userService.create(validated);
  res.json({ success: true, data: user });
});

// service — contains business logic
class UserService {
  async create(data: CreateUserDto): Promise<User> {
    // validation, business rules, persistence
  }
}
```

### Middleware Pattern

Use middleware for cross-cutting concerns (auth, logging, rate limiting, error handling).

### Event-Driven Architecture

Use events for async operations that don't need immediate response.
