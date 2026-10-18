# Foundation Models patterns (iOS 26 SDK)

Signatures shown are the iOS 26 forms; newer SDKs add overloads (metadata, context options, dynamic profiles) and a separate error type. Re-check each symbol page for the SDK you build with.

## Availability

```swift
import FoundationModels

enum SummaryAvailability { case ready, hidden, needsAppleIntelligence, tryLater }

func summaryAvailability() -> SummaryAvailability {
    switch SystemLanguageModel.default.availability {
    case .available: return .ready
    case .unavailable(.deviceNotEligible): return .hidden
    case .unavailable(.appleIntelligenceNotEnabled): return .needsAppleIntelligence
    case .unavailable(.modelNotReady): return .tryLater
    case .unavailable: return .hidden // future reasons: fail closed
    }
}
```

Re-check availability when the app returns to the foreground; it can change.

## Session

```swift
let session = LanguageModelSession(instructions: """
    You summarise the user's notes in two sentences. Use only the text given.
    """)
let response = try await session.respond(to: noteText)
let summary = response.content
```

- A session keeps a transcript; reuse it for a multi-turn conversation, create a new one for unrelated requests.
- One request at a time per session; check `session.isResponding` before sending another.
- Call `session.prewarm(promptPrefix:)` when you know a request is coming (for example, when the sheet opens).
- Stream into the UI with `for try await partial in session.streamResponse(to: prompt) { ... }`.

## Guided generation

```swift
@Generable
struct ExtractedEvent {
    @Guide(description: "Short event title")
    var title: String
    @Guide(description: "Attendee first names", .count(0...10))
    var attendees: [String]
}

let result = try await session.respond(to: emailText, generating: ExtractedEvent.self)
let event = result.content
```

- The framework constrains decoding to the type, so you do not parse JSON yourself.
- Keep types small and flat; each property and guide adds to the prompt.
- Enums marked `@Generable` give you classification.

## Tool calling

```swift
struct FindContacts: Tool {
    let name = "findContacts"
    let description = "Finds contacts whose name matches a query"

    @Generable
    struct Arguments {
        @Guide(description: "Part of the contact's name")
        let query: String
    }

    func call(arguments: Arguments) async throws -> [String] {
        try await contactStore.names(matching: arguments.query) // your code, with its own permission checks
    }
}

let session = LanguageModelSession(tools: [FindContacts()], instructions: "Help the user find contacts.")
```

- `Tool` requires `name`, `description`, an `Arguments` type (usually `@Generable`) and `call(arguments:) async throws -> Output`, where `Output` conforms to `PromptRepresentable` (a `String` or a `@Generable` type).
- Tool definitions count against the context window; register only the tools a session needs.
- A tool runs with the app's permissions. Check authorisation inside `call` and never let a tool perform a destructive action without the user confirming in the UI.

## Errors (iOS 26 SDK)

`LanguageModelSession.GenerationError` cases include `exceededContextWindowSize`, `guardrailViolation`, `unsupportedLanguageOrLocale`, `concurrentRequests`, `decodingFailure`, `assetsUnavailable`, `rateLimited`, `refusal` and `unsupportedGuide`. On context overflow, start a new session with a shorter summary of the conversation. On a guardrail violation or refusal, show a neutral message and let the user edit the input. The iOS 27 SDK adds `LanguageModelError` (model errors), `SystemLanguageModel.Error` (on-device model errors) and `LanguageModelSession.Error` (session errors); read their symbol pages for the case names before catching them.

## Testing

Put the model behind a small protocol (`protocol Summariser { func summarise(_: String) async throws -> String }`) so unit tests use a fake and UI tests can force each availability state. Evaluate real output on a device with a fixed set of sample inputs before shipping.
