# Auth Flows

## Local And Google Sign-In

```mermaid
sequenceDiagram
    actor User
    participant Next as Next.js + Auth.js
    participant Google as Google OAuth
    participant Nest as NestJS API
    participant DB as Postgres + Prisma

    rect rgb(239, 248, 255)
        Note over User,DB: Local registration and login
        User->>Next: Submit email, password, display name, optional avatar
        Next->>Nest: POST /auth/register
        Nest->>DB: Create User + USER role
        DB-->>Nest: User record
        Nest-->>Next: User + Nest access token
        Next-->>User: Signed in

        User->>Next: Submit email + password
        Next->>Nest: POST /auth/login
        Nest->>DB: Validate local credentials
        DB-->>Nest: User record
        Nest-->>Next: User + Nest access token
        Next-->>User: Authenticated session
    end

    rect rgb(240, 253, 244)
        Note over User,DB: Google sign-in with Auth.js bridge
        User->>Next: Click Continue with Google
        Next->>Google: Start OAuth flow
        Google-->>Next: Verified Google identity
        Next->>DB: Resolve account by provider + providerAccountId
        alt Existing linked Google account
            DB-->>Next: Existing user
        else Existing verified email match
            Next->>DB: Link Google account to existing user
            DB-->>Next: Linked user
        else First-time Google user
            Next->>DB: Create user + provider account
            DB-->>Next: New user
        end
        Next->>Nest: POST /auth/exchange
        Nest->>DB: Load user roles and profile
        DB-->>Nest: User record
        Nest-->>Next: Nest access token
        Next-->>User: Auth.js session + Nest API access
    end
```

## Notes

- Auth.js owns the browser session and provider redirects.
- NestJS owns API authorization and role-based access.
- Google linking only auto-links when the provider email is verified.
- Provider identities live in `Account`; the canonical person record stays in `User`.
