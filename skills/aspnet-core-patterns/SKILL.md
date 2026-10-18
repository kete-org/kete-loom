---
name: aspnet-core-patterns
description: ASP.NET Core web API and app hosting decisions - choosing minimal APIs or controllers, ordering the middleware pipeline, picking singleton, scoped or transient lifetimes without captive dependencies, binding and validating settings with the options pattern, request validation, JWT or cookie authentication with policy-based authorization, RFC 7807 problem details for errors, and liveness and readiness health checks. Use when building or reviewing an ASP.NET Core service, wiring Program.cs, debugging a 401, 500 or middleware-order bug, or adding auth, validation or health endpoints to a .NET web app.
license: MIT
compatibility: Any Agent Skills host. Needs the .NET SDK (dotnet CLI). Written for .NET 8 and later; .NET 10-only features are marked.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "dotnet"
  kete-loom/owner: "Kete-org"
---

# ASP.NET Core patterns

Wire the host so requests flow through the right middleware, services live as long as they should, and every error comes back in one shape. For C# language style follow `csharp-patterns`; for xUnit and `WebApplicationFactory` tests follow `csharp-testing`; for the data layer follow `ef-core-patterns`.

## 0. Before you change anything

1. Read the `.csproj` `TargetFramework` and `Program.cs`. Match the project's style (minimal APIs or controllers, `TypedResults` or `IActionResult`).
2. Run `dotnet build` and `dotnet test`. If either fails before you start, **stop and tell the user**.

## 1. Minimal APIs or controllers

| Choose | When |
|---|---|
| Minimal APIs | New services, small to medium APIs, you want `TypedResults` and route groups |
| Controllers | The project already uses them, or you need filters, model binding conventions or OData-style features built around `ControllerBase` |

Don't mix both in one feature area. For minimal APIs:

- Group routes: `var orders = app.MapGroup("/orders").RequireAuthorization();`
- Keep handlers short; move them into static methods or a class per feature (`OrderEndpoints.Map(app)`), not one giant `Program.cs`.
- Return `TypedResults` with a `Results<Ok<OrderDto>, NotFound>` return type so OpenAPI and tests see every outcome.
- Accept `CancellationToken` in handlers and pass it to every async call.

## 2. Middleware order

Order matters; the request passes top to bottom and the response bottom to top. The usual order:

```csharp
app.UseExceptionHandler();           // first, so it catches everything below
if (!app.Environment.IsDevelopment()) app.UseHsts();
app.UseHttpsRedirection();
app.UseStaticFiles();                // or app.MapStaticAssets() on .NET 9+
app.UseRouting();                    // implicit if omitted; explicit when order matters
app.UseCors();                       // after routing, before auth
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();                // after routing when using endpoint-specific policies
// custom middleware that needs the user goes here
app.MapControllers();                // or Map... endpoints
```

Symptoms of a wrong order: CORS preflight failing with 401 (auth before CORS), `[Authorize]` ignored or `User` empty (auth after endpoints, or authentication missing), errors returning HTML or empty 500s (exception handler not first).

## 3. DI lifetimes

| Lifetime | Use for | Never |
|---|---|---|
| Singleton | Stateless, thread-safe services, caches, `HttpClient` handlers via factory | Inject a scoped service (captive dependency) |
| Scoped | One per request: `DbContext`, unit of work, current-user accessors | Resolve from the root provider or a singleton |
| Transient | Lightweight, stateless helpers | Hold expensive resources |

- Keep `ValidateScopes` and `ValidateOnBuild` on (default in Development) so captive dependencies fail at startup.
- `BackgroundService` and other singletons that need scoped services create a scope: `using var scope = scopeFactory.CreateScope();`.
- HTTP clients: `builder.Services.AddHttpClient<PaymentsClient>(c => c.BaseAddress = ...)`. Never `new HttpClient()` per call.
- Prefer constructor injection. Don't inject `IServiceProvider` to resolve things manually.

## 4. Options pattern

```csharp
builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection("Smtp"))
    .ValidateDataAnnotations()
    .ValidateOnStart();
```

- `IOptions<T>`: read once, singleton-safe. `IOptionsSnapshot<T>`: re-read per request (scoped). `IOptionsMonitor<T>`: change notifications, singleton-safe.
- `ValidateOnStart()` makes a missing setting fail at boot, not on the first request.
- Secrets: user-secrets (`dotnet user-secrets set "Smtp:Password" ...`) in development, environment variables or a vault provider in production. Never in `appsettings.json` committed to git.
- Environment variable form of `Smtp:Password` is `Smtp__Password`.

## 5. Validation

- Controllers with `[ApiController]` return a 400 `ValidationProblemDetails` automatically when DataAnnotations fail.
- Minimal APIs on .NET 10: `builder.Services.AddValidation();` validates DataAnnotations on query, header and body parameters and returns 400 problem details; opt out per endpoint with `.DisableValidation()`.
- Minimal APIs before .NET 10: validate in an endpoint filter or with the FluentValidation library the project already uses, and return `TypedResults.ValidationProblem(errors)`.
- Validate business rules (stock, ownership, state transitions) in the domain or handler, not only with attributes.

## 6. Authentication and authorization

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => { o.Authority = ...; o.Audience = ...; });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("orders:write", p => p.RequireClaim("scope", "orders:write"))
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
```

- A fallback policy makes endpoints secure by default; mark public ones with `.AllowAnonymous()` / `[AllowAnonymous]`.
- Use named policies (`.RequireAuthorization("orders:write")`), not role strings scattered across handlers.
- Resource checks (does this user own order 42?) use `IAuthorizationService.AuthorizeAsync(User, order, "OwnerPolicy")` or a query scoped to the user. Return 404 when revealing existence would leak data.
- Cookie auth for browser apps needs antiforgery on form posts; JWT APIs don't use cookies.
- Never disable `ValidateIssuer`, `ValidateAudience` or `ValidateLifetime` to "make it work".

## 7. Problem details for every error

```csharp
builder.Services.AddProblemDetails();
app.UseExceptionHandler();
app.UseStatusCodePages();
```

- `UseExceptionHandler()` with no arguments throws at startup unless `AddProblemDetails()` or an `IExceptionHandler` is registered.
- Unhandled exceptions become `application/problem+json` 500s without stack traces outside Development.
- Expected failures return `TypedResults.Problem(...)` / `ValidationProblem(...)` or `Problem()` in controllers with a stable `type` and `title`.
- For custom mapping (domain exception to 409), implement `IExceptionHandler` and register with `AddExceptionHandler<T>()`.
- Log the exception once, in the handler, with the trace id; return the trace id, not the message, to the client.

## 8. Health checks

```csharp
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddDbContextCheck<AppDbContext>(tags: ["ready"]);   // Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore
app.MapHealthChecks("/health/live",  new() { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new() { Predicate = r => r.Tags.Contains("ready") });
```

- Liveness checks only the process; readiness checks dependencies. A database outage must not make the orchestrator restart every pod.
- A fallback authorization policy also applies to `MapHealthChecks`, so probes start getting 401. Add `.AllowAnonymous()` to the health endpoints (or restrict them by host/port with `RequireHost`), and keep them cheap and free of secrets.

## Stop and ask the user

- Before changing the authentication scheme, token validation parameters or the fallback policy.
- Before changing CORS to allow any origin with credentials.
- Before moving between minimal APIs and controllers for existing endpoints.

## Never

- Never put secrets in `appsettings*.json` in source control.
- Never `.Result` or `.Wait()` on tasks in request code.
- Never return exception messages or stack traces to clients in production.
- Never register `DbContext` as a singleton.

## Finish

Run `dotnet build` with warnings visible and `dotnet test`. Report: files changed, pipeline order changes, new services and their lifetimes, and endpoints whose auth changed.
