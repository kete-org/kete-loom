# .NET integration tests

Read this when testing an ASP.NET Core app end to end in memory, or against a real database in a container.

## WebApplicationFactory

Package: `Microsoft.AspNetCore.Mvc.Testing`. The test project uses the Web SDK or references the app project.

With top-level statements, the generated `Program` class may not be visible to the test project. If `WebApplicationFactory<Program>` doesn't compile, add this to the end of `Program.cs`:

```csharp
public partial class Program;
```

Custom factory that swaps services:

```csharp
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender, FakeEmailSender>();
        });
    }
}

public sealed class OrdersApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Get_unknown_order_returns_404()
    {
        var client = factory.CreateClient();
        var response = await client.GetAsync("/orders/999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

- `RemoveAll<T>()` is in `Microsoft.Extensions.DependencyInjection.Extensions`.
- Auth: register a test authentication handler in `ConfigureTestServices` (`services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { })`) rather than disabling authorization.
- `CreateClient()` follows redirects by default; pass `new WebApplicationFactoryClientOptions { AllowAutoRedirect = false }` to assert on a 302.

## Testcontainers

Packages: `Testcontainers.PostgreSql` (or `Testcontainers.MsSql`, `Testcontainers.MySql`, `Testcontainers.Redis`). Needs Docker or a compatible engine.

```csharp
public sealed class PostgresFixture : IAsyncLifetime
{
    // If your Testcontainers version marks this constructor obsolete, pass the image to it instead.
    public PostgreSqlContainer Db { get; } = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    // xUnit v2 signatures; in xUnit v3 both methods return ValueTask.
    public Task InitializeAsync() => Db.StartAsync();
    public Task DisposeAsync() => Db.DisposeAsync().AsTask();
}
```

- Pin the image tag to the version production uses; never `latest`.
- Share one container per collection: `[CollectionDefinition("db")] public class DbCollection : ICollectionFixture<PostgresFixture>;` and mark test classes `[Collection("db")]`.
- Apply schema once per container: run EF Core migrations (`await db.Database.MigrateAsync()`) in the fixture, not `EnsureCreated` if production uses migrations.
- Isolate tests: wrap each in a transaction you roll back, or reset data between tests (the Respawn library is a common choice). Don't depend on test order.
- Combine with WebApplicationFactory by overriding the connection string in `ConfigureWebHost` with `builder.UseSetting("ConnectionStrings:Default", fixture.Db.GetConnectionString())`.

## NUnit and MSTest equivalents

| xUnit | NUnit | MSTest |
|---|---|---|
| `IClassFixture<T>` | `[OneTimeSetUp]` / `[OneTimeTearDown]` | `[ClassInitialize]` / `[ClassCleanup]` |
| constructor / `IDisposable` | `[SetUp]` / `[TearDown]` | `[TestInitialize]` / `[TestCleanup]` |
| `ICollectionFixture<T>` | `[SetUpFixture]` | `[AssemblyInitialize]` |
